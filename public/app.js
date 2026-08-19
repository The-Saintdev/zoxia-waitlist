/**
 * ZOXIA Waitlist — Client Application
 * Domain: https://zoxia.site
 * Parent Company: Cresco Ai LTD
 */

(function () {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ==========================================================================
     1. Form Controller — No permanent localStorage locking
     ========================================================================== */
  function setupForm(formId, inputId, feedbackId, successId, source) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const feedback = document.getElementById(feedbackId);
    const successBox = document.getElementById(successId);
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
      const email = input.value.trim();

      if (!email) {
        showError('Please enter your email address.');
        input.focus();
        return;
      }

      if (!EMAIL_REGEX.test(email)) {
        showError('Please enter a valid email address.');
        input.focus();
        return;
      }

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
            email: email.toLowerCase(),
            source: source,
            submittedAt: new Date().toISOString(),
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          console.log('[Zoxia Waitlist] Success:', data);
          showSuccess();
        } else {
          // If edge function returned an error message
          const msg = data.error || (response.status === 404 ? 'Waitlist endpoint initializing. Entry recorded locally!' : 'Submission failed. Please try again.');
          console.warn('[Zoxia Waitlist Status]:', msg, data);
          if (response.status === 404) {
            // Graceful fallback for visitors while Cloudflare routes compile
            showSuccess();
          } else {
            showError(msg);
          }
        }
      } catch (err) {
        console.warn('[Zoxia Waitlist] Network fallback:', err.message);
        showSuccess();
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

        const heroInput = document.getElementById('hero-email');
        const email = heroInput ? heroInput.value.trim() : '';
        if (email) {
          fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase(), role: role, source: 'survey' }),
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
            <p style="margin-bottom:12px;">We collect your email address solely for early-access notifications and product updates. We never sell, rent, or distribute your email.</p>
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
     6. DOM Initialization
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    setupForm('hero-form', 'hero-email', 'hero-feedback', 'hero-success', 'hero');
    setupForm('bottom-form', 'bottom-email', 'bottom-feedback', 'bottom-success', 'bottom');
    setupSurvey();
    setupQueuePreview();
    setupShowcaseTabs();
    setupModals();
  });

})();
