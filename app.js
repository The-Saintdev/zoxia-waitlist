/**
 * ZOXIA Waitlist — Client Application & Interactive Engine
 * Domain: https://zoxia.site
 * Parent Company: Cresco Ai LTD
 */

(function () {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const STORAGE_KEY = 'zoxia_waitlist_registered_email';
  const ROLE_STORAGE_KEY = 'zoxia_waitlist_registered_role';

  /* ==========================================================================
     1. Form Controller & Real-Time Validation
     ========================================================================== */
  function initWaitlistForm(formId, inputId, feedbackId, successId, footnoteId, source) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const feedback = document.getElementById(feedbackId);
    const successBox = document.getElementById(successId);
    const footnote = footnoteId ? document.getElementById(footnoteId) : null;
    const submitBtn = form?.querySelector('.btn-primary');

    if (!form || !input || !submitBtn) return;

    input.addEventListener('input', () => {
      if (feedback) {
        feedback.textContent = '';
        feedback.className = 'form-feedback';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawEmail = input.value.trim();

      if (!rawEmail) {
        showError('Please enter your email address.');
        input.focus();
        return;
      }

      if (!EMAIL_REGEX.test(rawEmail)) {
        showError('Please enter a valid email address.');
        input.focus();
        return;
      }

      // Check if already registered
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && cached.toLowerCase() === rawEmail.toLowerCase()) {
        showSuccessView();
        return;
      }

      // Set Loading State
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      input.disabled = true;
      if (feedback) feedback.textContent = '';

      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email: rawEmail.toLowerCase(),
            source: source,
            submittedAt: new Date().toISOString(),
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          console.log('[Zoxia Waitlist] Submission success:', data);
          if (data.mailjetDebug) {
            console.log('[Zoxia Email Status]:', data.mailjetDebug);
          }
          localStorage.setItem(STORAGE_KEY, rawEmail);
          showSuccessView();
        } else {
          console.error('[Zoxia Waitlist Error]:', data);
          showError(data.error || 'Submission failed. Please try again.');
        }
      } catch (err) {
        console.warn('[Zoxia Waitlist] Network fallback:', err.message);
        // Persist locally if network was blocked
        localStorage.setItem(STORAGE_KEY, rawEmail);
        showSuccessView();
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        input.disabled = false;
      }
    });

    function showError(msg) {
      if (feedback) {
        feedback.textContent = msg;
        feedback.className = 'form-feedback error';
      }
    }

    function showSuccessView() {
      form.style.display = 'none';
      if (footnote) footnote.style.display = 'none';
      if (successBox) successBox.style.display = 'block';
      initSurveyListeners();
    }
  }

  /* ==========================================================================
     2. Optional Secondary Survey
     ========================================================================== */
  function initSurveyListeners() {
    const tagButtons = document.querySelectorAll('.tag-btn');
    const statusText = document.querySelector('.survey-status');

    tagButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const role = btn.getAttribute('data-role');
        tagButtons.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');

        localStorage.setItem(ROLE_STORAGE_KEY, role);
        if (statusText) statusText.style.display = 'block';

        const userEmail = localStorage.getItem(STORAGE_KEY);
        if (userEmail) {
          fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, role: role, source: 'survey' }),
          }).catch(() => {});
        }
      });
    });
  }

  /* ==========================================================================
     3. Interactive Hero Queue Simulator
     ========================================================================== */
  function initQueueSimulator() {
    const queueEntries = document.querySelectorAll('.queue-entry');
    queueEntries.forEach((entry) => {
      entry.addEventListener('click', () => {
        queueEntries.forEach((e) => e.classList.remove('selected'));
        entry.classList.add('selected');
      });
    });
  }

  /* ==========================================================================
     4. Showcase Tabs Switcher
     ========================================================================== */
  function initShowcaseTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const panels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-tab');

        tabButtons.forEach((btn) => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');

        panels.forEach((p) => p.classList.remove('active'));
        const targetPanel = document.getElementById(`tab-${targetId}`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });
  }

  /* ==========================================================================
     5. Accessible Modals (Privacy & Terms)
     ========================================================================== */
  function initLegalModals() {
    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-heading');
    const modalBody = document.getElementById('modal-body-content');
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
            <p style="margin-bottom:12px;">We collect your email address solely to notify you when your early-access invitation is ready and provide platform updates.</p>
            <p>We do not sell, rent, or distribute your email address to third parties. You can request deletion of your entry at any time by emailing contact@cresco.ai.</p>
          `;
        } else if (type === 'terms') {
          modalTitle.textContent = 'Terms of Service';
          modalBody.innerHTML = `
            <p style="margin-bottom:12px;"><strong>Zoxia Early Access Terms</strong></p>
            <p style="margin-bottom:12px;">By joining the waitlist, you acknowledge that Zoxia is in active pre-launch development by Cresco Ai LTD.</p>
            <p>Early access is granted on a rolling cohort basis.</p>
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
    initWaitlistForm(
      'hero-waitlist-form',
      'hero-email',
      'hero-form-feedback',
      'hero-success-state',
      'hero-footnote',
      'hero'
    );

    initWaitlistForm(
      'bottom-waitlist-form',
      'bottom-email',
      'bottom-form-feedback',
      'bottom-success-state',
      null,
      'bottom'
    );

    initQueueSimulator();
    initShowcaseTabs();
    initLegalModals();

    // Check if user was already registered
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      const heroForm = document.getElementById('hero-waitlist-form');
      const heroSuccess = document.getElementById('hero-success-state');
      const heroFootnote = document.getElementById('hero-footnote');
      if (heroForm && heroSuccess) {
        heroForm.style.display = 'none';
        if (heroFootnote) heroFootnote.style.display = 'none';
        heroSuccess.style.display = 'block';
        initSurveyListeners();
      }
    }
  });

})();
