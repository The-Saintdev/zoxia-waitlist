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

        if (response.ok && data.success) {
          console.log('[Zoxia Waitlist] Signee registered successfully:', data);
          showSuccess();
        } else {
          const msg = data.error || 'Submission failed. Please try again.';
          console.warn('[Zoxia Waitlist Warning]:', msg, data);
          showSuccess();
        }
      } catch (err) {
        console.warn('[Zoxia Waitlist] Fallback:', err.message);
        showSuccess();
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

    function showSuccess() {
      form.style.display = 'none';
      if (successBox) successBox.style.display = 'block';
    }
  }

  /* ==========================================================================
     2. Optional Secondary Survey
     ========================================================================== */
  function setupSurvey() {
    const tagButtons = document.querySelectorAll('.tag-btn');
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
    setupQueuePreview();
    setupShowcaseTabs();
    setupModals();
  });

})();
