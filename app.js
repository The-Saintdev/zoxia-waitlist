/**
 * ZOXIA Waitlist — Client Application
 * Domain: https://zoxia.site
 * Parent Company: Cresco Ai LTD
 */

(function () {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const STORAGE_KEY = 'zoxia_waitlist_email';
  const ROLE_STORAGE_KEY = 'zoxia_waitlist_role';

  /* ==========================================================================
     1. Form Controller
     ========================================================================== */
  function initForm(formId, inputId, feedbackId, successId, noteId, source) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const feedback = document.getElementById(feedbackId);
    const successBox = document.getElementById(successId);
    const note = noteId ? document.getElementById(noteId) : null;
    const submitBtn = form?.querySelector('.btn-submit');

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

      // Check if already registered
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.toLowerCase() === email.toLowerCase()) {
        showSuccess();
        return;
      }

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      input.disabled = true;
      if (feedback) feedback.textContent = '';

      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.toLowerCase(),
            source: source,
            submittedAt: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          localStorage.setItem(STORAGE_KEY, email);
          showSuccess();
        } else {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Unable to submit. Please try again.');
        }
      } catch (err) {
        // Local fallback if edge function is offline
        localStorage.setItem(STORAGE_KEY, email);
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
      if (note) note.style.display = 'none';
      if (successBox) successBox.style.display = 'block';
      initSurvey();
    }
  }

  /* ==========================================================================
     2. Optional Secondary Survey
     ========================================================================== */
  function initSurvey() {
    const btns = document.querySelectorAll('.survey-btn');
    const confirmed = document.querySelector('.survey-confirmed');

    btns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const role = btn.getAttribute('data-role');
        btns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');

        localStorage.setItem(ROLE_STORAGE_KEY, role);
        if (confirmed) confirmed.style.display = 'block';

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
     3. Showcase Tabs
     ========================================================================== */
  function initTabs() {
    const tabs = document.querySelectorAll('.tab-trigger');
    const panels = document.querySelectorAll('.showcase-panel');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-target');

        tabs.forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        panels.forEach((p) => p.classList.remove('active'));
        const activePanel = document.getElementById(`tab-${target}`);
        if (activePanel) activePanel.classList.add('active');
      });
    });
  }

  /* ==========================================================================
     4. Legal Modals
     ========================================================================== */
  function initModals() {
    const modal = document.getElementById('legal-modal');
    const title = document.getElementById('modal-title');
    const text = document.getElementById('modal-text');
    const triggers = document.querySelectorAll('[data-modal]');
    const closeBtns = document.querySelectorAll('[data-close]');

    if (!modal) return;

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const type = trigger.getAttribute('data-modal');

        if (type === 'privacy') {
          title.textContent = 'Privacy Policy';
          text.innerHTML = `
            <p style="margin-bottom:12px;"><strong>Zoxia by Cresco Ai LTD</strong></p>
            <p style="margin-bottom:12px;">We only collect your email address for early-access notifications and product updates. We do not sell or distribute your data.</p>
            <p>You can request removal from our waitlist at any time by emailing contact@cresco.ai.</p>
          `;
        } else if (type === 'terms') {
          title.textContent = 'Terms of Service';
          text.innerHTML = `
            <p style="margin-bottom:12px;"><strong>Zoxia Early Access Terms</strong></p>
            <p>Zoxia is in active pre-launch testing. Early access is granted on a rolling cohort basis.</p>
          `;
        }

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      });
    });

    closeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      });
    });
  }

  /* ==========================================================================
     5. Initialization
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initForm('hero-form', 'hero-email', 'hero-feedback', 'hero-success', 'hero-note', 'hero');
    initForm('bottom-form', 'bottom-email', 'bottom-feedback', 'bottom-success', null, 'bottom');
    initTabs();
    initModals();

    // Check existing email
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const heroForm = document.getElementById('hero-form');
      const heroSuccess = document.getElementById('hero-success');
      const heroNote = document.getElementById('hero-note');
      if (heroForm && heroSuccess) {
        heroForm.style.display = 'none';
        if (heroNote) heroNote.style.display = 'none';
        heroSuccess.style.display = 'block';
        initSurvey();
      }
    }
  });

})();
