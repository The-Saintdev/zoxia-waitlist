/**
 * ZOXIA Waitlist — Client Application
 * Domain: https://zoxia.site
 * Parent Company: Cresco Ai LTD
 */

(function () {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ==========================================================================
     1. Form Controller (Name + Email)
     ========================================================================== */
  function setupForm(formId, nameId, emailId, feedbackId, successId, source) {
    const form = document.getElementById(formId);
    const nameInput = document.getElementById(nameId);
    const emailInput = document.getElementById(emailId);
    const feedback = document.getElementById(feedbackId);
    const successBox = document.getElementById(successId);
    const submitBtn = form?.querySelector('.btn-primary');

    if (!form || !emailInput || !submitBtn) return;

    // Clear feedback on input
    [nameInput, emailInput].forEach((input) => {
      if (input) {
        input.addEventListener('input', () => {
          if (feedback) {
            feedback.textContent = '';
            feedback.className = 'form-feedback';
          }
        });
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawName = nameInput ? nameInput.value.trim() : '';
      const rawEmail = emailInput.value.trim();

      if (!rawEmail) {
        showError('Please enter your email address.');
        emailInput.focus();
        return;
      }

      if (!EMAIL_REGEX.test(rawEmail)) {
        showError('Please enter a valid email address.');
        emailInput.focus();
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      if (nameInput) nameInput.disabled = true;
      emailInput.disabled = true;
      if (feedback) feedback.textContent = '';

      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            name: rawName,
            email: rawEmail.toLowerCase(),
            source: source,
            submittedAt: new Date().toISOString(),
          }),
        });

        const data = await response.json().catch(() => ({}));

        /**
         * A failure is told, not hidden.
         *
         * Both of these branches used to call showSuccess(), so a rejected
         * submission and a network error both told the person they were on
         * the list when they were not. They would never know, and they would
         * never get the email.
         *
         * For a product whose entire pitch is that we tell you the truth
         * about whether something went through, the waitlist saying "you're
         * on the list" when nothing saved is the worst possible place for
         * that bug to live.
         */
        if (response.ok && data.success) {
          showSuccess(rawEmail);
        } else {
          showError(data.error || 'That did not save. Try again in a moment.');
        }
      } catch (err) {
        console.warn('[Zoxia Waitlist] Network error:', err.message);
        showError('We could not reach the server. Check your connection and try again.');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        if (nameInput) nameInput.disabled = false;
        emailInput.disabled = false;
      }
    });

    function showError(msg) {
      if (feedback) {
        feedback.textContent = msg;
        feedback.className = 'form-feedback error';
      }
    }

    function showSuccess(email) {
      form.style.display = 'none';
      if (successBox) successBox.style.display = 'block';
      // Remembered so the follow-up steps in the success panel know who they
      // belong to. They live in the hero panel but either form can open it.
      if (email) window.__zoxiaEmail = email.toLowerCase();
    }
  }

  /* ==========================================================================
     2. Optional Secondary Survey
     ========================================================================== */
  function setupSurvey() {
    const tagButtons = document.querySelectorAll('.role-btn');
    const statusText = document.querySelector('.survey-status');

    tagButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const role = btn.getAttribute('data-role');
        tagButtons.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');

        if (statusText) statusText.style.display = 'block';

        const heroEmail = document.getElementById('hero-email');
        const heroName = document.getElementById('hero-name');
        const email = heroEmail ? heroEmail.value.trim() : '';
        const name = heroName ? heroName.value.trim() : '';

        if (email) {
          fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name,
              email: email.toLowerCase(),
              role: role,
              source: 'survey',
            }),
          }).catch(() => {});
        }
      });
    });
  }

  /* ==========================================================================
     2b. The two research questions, and the founding member card
     ========================================================================== */

  /** Whoever just joined. Set by showSuccess, with the inputs as a fallback. */
  function currentEmail() {
    if (window.__zoxiaEmail) return window.__zoxiaEmail;
    var hero = document.getElementById('hero-email');
    var bottom = document.getElementById('bottom-email');
    var value = (hero && hero.value.trim()) || (bottom && bottom.value.trim()) || '';
    return value.toLowerCase();
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    button.classList.toggle('loading', busy);
  }

  function say(el, message, isError) {
    if (!el) return;
    el.textContent = message;
    el.className = 'form-feedback' + (isError ? ' error' : '');
  }

  /**
   * The answers, sent after the email is already safe.
   *
   * These are the reason the waitlist exists. The first question is the
   * riskiest assumption in the product: if creators have never had a
   * scheduled post fail, then "your posts actually go out" solves a pain
   * nobody has, and that is worth knowing before the content plan runs.
   */
  function setupDeepSurvey() {
    var button = document.getElementById('answers-btn');
    var feedback = document.getElementById('answers-feedback');
    var lost = document.getElementById('q-lost');
    var proof = document.getElementById('q-proof');
    if (!button || !lost || !proof) return;

    button.addEventListener('click', function () {
      var email = currentEmail();
      if (!email) {
        say(feedback, 'We lost track of your email. Refresh and join again.', true);
        return;
      }

      var everLostAPost = lost.value.trim();
      var proofForBrands = proof.value.trim();
      if (!everLostAPost && !proofForBrands) {
        say(feedback, 'Either box is fine, both is better.', true);
        return;
      }

      setBusy(button, true);
      say(feedback, '');

      fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          everLostAPost: everLostAPost || undefined,
          proofForBrands: proofForBrands || undefined,
          source: 'answers',
        }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.success) {
            say(feedback, 'Got it. That genuinely helps.');
            lost.disabled = true;
            proof.disabled = true;
            button.style.display = 'none';
          } else {
            say(feedback, (data && data.error) || 'That did not save. Try again.', true);
            setBusy(button, false);
          }
        })
        .catch(function () {
          say(feedback, 'We could not reach the server. Try again.', true);
          setBusy(button, false);
        });
    });
  }

  /**
   * The card, which is the measurement.
   *
   * Offered beside the email path rather than instead of it, because a
   * mandatory card measures nothing: the gap between the two is the finding.
   */
  function setupFounding() {
    var button = document.getElementById('founding-btn');
    var feedback = document.getElementById('founding-feedback');
    if (!button) return;

    button.addEventListener('click', function () {
      var email = currentEmail();
      if (!email) {
        say(feedback, 'We lost track of your email. Refresh and join again.', true);
        return;
      }

      setBusy(button, true);
      say(feedback, '');

      fetch('/api/card-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.authorizationUrl) {
            window.location.href = data.authorizationUrl;
            return;
          }
          if (data && data.unavailable) {
            // Not an error. Their place is already held either way, and
            // saying "failed" about something that did not fail is the habit
            // this whole product is against.
            say(feedback, 'Founding spots are not open yet. You are on the list regardless.');
            button.style.display = 'none';
            return;
          }
          say(feedback, (data && data.error) || 'Could not start that. Nothing was charged.', true);
          setBusy(button, false);
        })
        .catch(function () {
          say(feedback, 'We could not reach the server. Nothing was charged.', true);
          setBusy(button, false);
        });
    });
  }

  /**
   * Coming back from Paystack.
   *
   * Reports, never grants. Their place was taken before they left, so the
   * worst case is a page that cannot confirm the card, and it says that
   * rather than implying the signup failed.
   */
  function handleCardReturn() {
    var params = new URLSearchParams(window.location.search);
    if (!params.get('card')) return;

    var reference = params.get('reference') || params.get('trxref') || '';
    var success = document.getElementById('hero-success');
    var form = document.getElementById('hero-form');
    if (!success) return;

    form && (form.style.display = 'none');
    success.style.display = 'block';
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });

    var title = success.querySelector('.success-title');
    var text = success.querySelector('.success-text');

    fetch('/api/card-check/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: reference }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (data) {
        if (data && data.verified) {
          if (title) title.textContent = 'You are a founding member.';
          if (text) {
            text.textContent = data.last4
              ? 'Card ending ' + data.last4 + ' checked. Nothing else will be charged, and your ₦100 becomes credit at launch.'
              : 'Card checked. Nothing else will be charged, and your ₦100 becomes credit at launch.';
          }
          var founding = document.querySelector('.founding');
          if (founding) founding.style.display = 'none';
          return;
        }
        throw new Error('unconfirmed');
      })
      .catch(function () {
        if (title) title.textContent = 'You are on the list.';
        if (text) {
          text.textContent =
            'We could not confirm the card from this page, which does not mean it failed. Your place is held, and we will sort the rest out before anything is charged.';
        }
      });
  }

  /* ==========================================================================
     3. Interactive Hero Queue Selector
     ========================================================================== */
  function setupQueuePreview() {
    const queueRows = document.querySelectorAll('.preview-row');
    queueRows.forEach((row) => {
      row.addEventListener('click', () => {
        queueRows.forEach((r) => r.classList.remove('active'));
        row.classList.add('active');
      });
    });
  }

  /* ==========================================================================
     4. Showcase Tabs Switcher
     ========================================================================== */
  function setupShowcaseTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.showcase-card');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        tabButtons.forEach((btn) => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');

        panels.forEach((p) => p.classList.remove('active'));
        const activePanel = document.getElementById(`panel-${targetTab}`);
        if (activePanel) {
          activePanel.classList.add('active');
        }
      });
    });
  }

  /* ==========================================================================
     5. Accessible Modals (Privacy & Terms)
     ========================================================================== */
  function setupModals() {
    const modal = document.getElementById('legal-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const openTriggers = document.querySelectorAll('[data-modal]');
    const closeTriggers = document.querySelectorAll('[data-close-modal]');

    if (!modal) return;

    openTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const type = trigger.getAttribute('data-modal');

        if (type === 'privacy') {
          modalTitle.textContent = 'Privacy Policy';
          modalBody.innerHTML = `
            <p style="margin-bottom:12px;"><strong>Zoxia by Cresco Ai LTD</strong></p>
            <p style="margin-bottom:12px;">We collect your name and email address solely for early-access invitations and product updates. We never sell, rent, or distribute your data.</p>
            <p>You may request deletion of your entry at any time by contacting contact@cresco.ai.</p>
          `;
        } else if (type === 'terms') {
          modalTitle.textContent = 'Terms of Service';
          modalBody.innerHTML = `
            <p style="margin-bottom:12px;"><strong>Zoxia Pre-Launch Terms</strong></p>
            <p>Zoxia is in active pre-launch testing. Early-access invitations are granted on a rolling cohort basis.</p>
          `;
        }

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      });
    });

    closeTriggers.forEach((closeBtn) => {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  /* ==========================================================================
     6. DOM Ready Initialization
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    setupForm('hero-form', 'hero-name', 'hero-email', 'hero-feedback', 'hero-success', 'hero');
    setupForm('bottom-form', 'bottom-name', 'bottom-email', 'bottom-feedback', 'bottom-success', 'bottom');
    setupSurvey();
    setupDeepSurvey();
    setupFounding();
    handleCardReturn();
    setupQueuePreview();
    setupShowcaseTabs();
    setupModals();
  });

})();
