/**
 * ZOXIA Waitlist — Client Application & Analytics Handler
 * Domain: https://zoxia.site
 * Parent Company: Cresco Ai LTD
 */

(function () {
  'use strict';

  // Strict email validation regex
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const STORAGE_KEY = 'zoxia_waitlist_registered_email';
  const ROLE_STORAGE_KEY = 'zoxia_waitlist_registered_role';

  /* ==========================================================================
     1. Clean Analytics Abstraction
     ========================================================================== */
  function trackEvent(eventName, eventParams = {}) {
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...eventParams,
    };

    // Console logging for debugging in dev
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log(`[Zoxia Analytics] ${eventName}:`, payload);
    }

    // Window dataLayer / Custom Analytics hook if attached
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push(payload);
    }

    // Dispatch native CustomEvent for future tracking vendor script hooks
    window.dispatchEvent(new CustomEvent('zoxia_track', { detail: payload }));
  }

  // Track initial page view
  trackEvent('page_view');

  /* ==========================================================================
     2. Waitlist Submission Controller
     ========================================================================== */
  async function submitWaitlist(email, source = 'hero') {
    trackEvent('form_submitted', { source, email });

    // Clean API abstraction: Target /api/waitlist
    const endpoint = '/api/waitlist';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: source,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Submission failed. Please try again.');
      }
    } catch (networkError) {
      // In standalone client / static mode without active worker, persist to localStorage
      console.warn('[Zoxia Waitlist] Direct serverless API endpoint not active, saving locally:', networkError.message);
      
      // Store in browser localStorage
      try {
        const waitlistCache = JSON.parse(localStorage.getItem('zoxia_local_waitlist_entries') || '[]');
        if (!waitlistCache.includes(email.trim().toLowerCase())) {
          waitlistCache.push(email.trim().toLowerCase());
          localStorage.setItem('zoxia_local_waitlist_entries', JSON.stringify(waitlistCache));
        }
      } catch (e) {}

      return { success: true };
    }
  }

  /* ==========================================================================
     3. Form Attachment & UI Synchronization
     ========================================================================== */
  function setupWaitlistForm(formId, inputId, feedbackId, successBoxId, footnoteId, source) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const feedback = document.getElementById(feedbackId);
    const successBox = document.getElementById(successBoxId);
    const footnote = document.getElementById(footnoteId);
    const submitBtn = form?.querySelector('.btn-submit');

    if (!form || !input || !submitBtn) return;

    // Track user starting to type in the form
    let hasStartedTyping = false;
    input.addEventListener('focus', () => {
      if (!hasStartedTyping) {
        hasStartedTyping = true;
        trackEvent('form_started', { source });
      }
    });

    // Clear error message on input
    input.addEventListener('input', () => {
      if (feedback) {
        feedback.textContent = '';
        feedback.className = 'form-feedback';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawEmail = input.value.trim();

      // Email Validation
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

      // Check if already registered in session
      const existingEmail = localStorage.getItem(STORAGE_KEY);
      if (existingEmail && existingEmail.toLowerCase() === rawEmail.toLowerCase()) {
        displaySuccessState(rawEmail);
        return;
      }

      // Set Loading State
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      input.disabled = true;
      if (feedback) feedback.textContent = '';

      try {
        const result = await submitWaitlist(rawEmail, source);
        
        if (result.success) {
          localStorage.setItem(STORAGE_KEY, rawEmail);
          trackEvent('signup_success', { source, email: rawEmail });
          displaySuccessState(rawEmail);
        }
      } catch (err) {
        trackEvent('signup_failure', { source, error: err.message });
        showError(err.message || 'Something went wrong. Please try again.');
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

    function displaySuccessState(email) {
      form.style.display = 'none';
      if (footnote) footnote.style.display = 'none';
      if (successBox) successBox.style.display = 'block';

      // Setup secondary role tag buttons
      setupSecondaryQuestions();
    }
  }

  /* ==========================================================================
     4. Secondary Role Survey (Non-blocking conversion)
     ========================================================================== */
  function setupSecondaryQuestions() {
    const roleTags = document.querySelectorAll('.role-tag');
    const confirmedMsg = document.querySelector('.secondary-confirmed');

    roleTags.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const selectedRole = btn.getAttribute('data-role');
        roleTags.forEach((t) => t.classList.remove('selected'));
        btn.classList.add('selected');

        localStorage.setItem(ROLE_STORAGE_KEY, selectedRole);
        trackEvent('role_selected', { role: selectedRole });

        if (confirmedMsg) {
          confirmedMsg.style.display = 'block';
        }

        // Optional ping to update role
        try {
          const userEmail = localStorage.getItem(STORAGE_KEY);
          if (userEmail) {
            await fetch('/api/waitlist/role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmail, role: selectedRole }),
            }).catch(() => {});
          }
        } catch (e) {}
      });
    });
  }

  /* ==========================================================================
     5. Product Showcase Tabs Interaction
     ========================================================================== */
  function setupShowcaseTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.showcase-panel');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');

        // Update active tab button
        tabButtons.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // Show corresponding panel
        panels.forEach((p) => p.classList.remove('active'));
        const activePanel = document.getElementById(`panel-${targetTab}`);
        if (activePanel) {
          activePanel.classList.add('active');
        }

        trackEvent('showcase_tab_viewed', { tab: targetTab });
      });
    });
  }

  /* ==========================================================================
     6. Workflow Scroll & Step Interaction
     ========================================================================== */
  function setupWorkflowScroll() {
    const nodes = document.querySelectorAll('.workflow-node');
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.4 }
    );

    nodes.forEach((node) => observer.observe(node));
  }

  /* ==========================================================================
     7. Privacy & Terms Modal Handlers
     ========================================================================== */
  function setupModals() {
    const modal = document.getElementById('info-modal');
    const title = document.getElementById('modal-title-text');
    const body = document.getElementById('modal-body-text');
    const openLinks = document.querySelectorAll('[data-modal]');
    const closeTriggers = document.querySelectorAll('[data-close-modal]');

    if (!modal) return;

    openLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const modalType = link.getAttribute('data-modal');

        if (modalType === 'privacy') {
          title.textContent = 'Privacy Policy';
          body.innerHTML = `
            <p style="margin-bottom:12px;"><strong>Zoxia by Cresco Ai LTD</strong> is committed to user privacy.</p>
            <p style="margin-bottom:12px;">During this pre-launch phase, we collect your email address solely to notify you when your early-access spot is ready and provide updates on platform availability.</p>
            <p>We do not sell, rent, or distribute your email address to third parties. You may request deletion of your email from the waitlist at any time by contacting contact@cresco.ai.</p>
          `;
        } else if (modalType === 'terms') {
          title.textContent = 'Terms of Service';
          body.innerHTML = `
            <p style="margin-bottom:12px;"><strong>Zoxia Pre-Launch Terms</strong></p>
            <p style="margin-bottom:12px;">By joining the Zoxia waitlist, you acknowledge that Zoxia is a pre-release platform undergoing testing by Cresco Ai LTD.</p>
            <p>Early access is granted on a rolling cohort basis. Features, quotas, and release schedules may be modified during the validation cycle.</p>
          `;
        }

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      });
    });

    closeTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
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
     8. Initialize on DOM Load
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // Setup Hero Form
    setupWaitlistForm(
      'hero-waitlist-form',
      'hero-email',
      'hero-form-feedback',
      'hero-success-box',
      'hero-footnote',
      'hero'
    );

    // Setup Bottom CTA Form
    setupWaitlistForm(
      'bottom-waitlist-form',
      'bottom-email',
      'bottom-form-feedback',
      'bottom-success-box',
      'bottom-form-container',
      'bottom_cta'
    );

    // Setup Features & Components
    setupShowcaseTabs();
    setupWorkflowScroll();
    setupModals();

    // Check if user was already registered in a previous session
    const existingEmail = localStorage.getItem(STORAGE_KEY);
    if (existingEmail) {
      const heroSuccess = document.getElementById('hero-success-box');
      const heroForm = document.getElementById('hero-waitlist-form');
      const heroFootnote = document.getElementById('hero-footnote');
      if (heroSuccess && heroForm) {
        heroForm.style.display = 'none';
        if (heroFootnote) heroFootnote.style.display = 'none';
        heroSuccess.style.display = 'block';
        setupSecondaryQuestions();
      }
    }
  });

})();
