/**
 * ZOXIA WAITLIST
 * https://zoxia.site, by Cresco Ai LTD
 *
 * Three jobs, in the order they matter:
 *   1. Take an email and say honestly whether it saved.
 *   2. Ask for the name, the role and the two research questions, all of it
 *      afterwards, where saying no costs the signup nothing.
 *   3. Resolve the record, and reveal sections on scroll.
 *
 * No scroll listeners anywhere. IntersectionObserver only.
 */
(function () {
  'use strict';

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* Lets CSS hide things it will animate in. With no JS everything stays
     visible, which is the correct fallback. */
  document.documentElement.classList.add('js');

  /** Whoever just joined. Set on a successful submit. */
  var joinedEmail = '';

  function setBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('loading', busy);
  }

  function say(el, message, isError) {
    if (!el) return;
    el.textContent = message || '';
    el.className = 'feedback' + (isError ? ' error' : '');
  }

  function post(body) {
    return fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        return { ok: r.ok, data: data };
      });
    });
  }

  /** The name is optional and asked for late, so it is sent when we have it. */
  function currentName() {
    var el = document.getElementById('name-after');
    return el && el.value.trim() ? el.value.trim() : undefined;
  }

  /* ==========================================================================
     1. The email
     ========================================================================== */
  function setupForm(formId, emailId, feedbackId, source) {
    var form = document.getElementById(formId);
    var emailInput = document.getElementById(emailId);
    var feedback = document.getElementById(feedbackId);
    if (!form || !emailInput) return;

    var button = form.querySelector('button[type="submit"]');

    emailInput.addEventListener('input', function () { say(feedback, ''); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = emailInput.value.trim();
      if (!email) {
        say(feedback, 'Please enter your email address.', true);
        emailInput.focus();
        return;
      }
      if (!EMAIL.test(email)) {
        say(feedback, 'That does not look like an email address.', true);
        emailInput.focus();
        return;
      }

      setBusy(button, true);
      emailInput.disabled = true;
      say(feedback, '');

      post({
        email: email.toLowerCase(),
        source: source,
        submittedAt: new Date().toISOString(),
      })
        .then(function (res) {
          /**
           * A failure is told, not hidden.
           *
           * Both branches here used to report success, so a rejected save and
           * a dead network both told someone they were on the list when they
           * were not. For a product whose entire pitch is that it tells you
           * the truth about whether something went through, that is the worst
           * possible place for that bug to live.
           */
          if (res.ok && res.data && res.data.success) {
            joinedEmail = email.toLowerCase();
            reveal();
          } else {
            say(feedback, (res.data && res.data.error) || 'That did not save. Try again in a moment.', true);
            restore();
          }
        })
        .catch(function () {
          say(feedback, 'We could not reach the server, so nothing was saved. Check your connection and try again.', true);
          restore();
        });

      function restore() {
        setBusy(button, false);
        emailInput.disabled = false;
      }
    });
  }

  /**
   * One panel, shared by both forms. Whichever one they used, the follow-up
   * questions live in a single place, so there is no second copy to keep in
   * step and no way to answer them twice.
   */
  function reveal() {
    var panel = document.getElementById('joined');
    if (!panel) return;

    Array.prototype.forEach.call(document.querySelectorAll('.signup'), function (el) {
      el.style.display = 'none';
    });
    panel.setAttribute('data-open', 'true');

    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
  }

  /* ==========================================================================
     2. Name, role, and the two questions
     ========================================================================== */
  function setupRoles() {
    var buttons = document.querySelectorAll('.role');
    var feedback = document.getElementById('role-feedback');
    if (!buttons.length) return;

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        if (!joinedEmail) {
          say(feedback, 'We lost track of your email. Refresh and join again.', true);
          return;
        }

        Array.prototype.forEach.call(buttons, function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });

        post({
          email: joinedEmail,
          name: currentName(),
          role: btn.getAttribute('data-role'),
          source: 'survey',
        })
          .then(function (res) {
            var ok = res.ok && res.data && res.data.success;
            say(feedback, ok ? 'Saved, thank you.' : 'That did not save.', !ok);
          })
          .catch(function () { say(feedback, 'That did not save.', true); });
      });
    });
  }

  /**
   * The answers, sent after the email is already safe.
   *
   * These are the reason the waitlist exists. The first question is the
   * riskiest assumption in the product: if creators have never had a
   * scheduled post fail, then "your posts actually go out" solves a pain
   * nobody has, and that is worth knowing before the marketing runs.
   */
  function setupAnswers() {
    var button = document.getElementById('answers-btn');
    var feedback = document.getElementById('answers-feedback');
    var lost = document.getElementById('q-lost');
    var proof = document.getElementById('q-proof');
    if (!button || !lost || !proof) return;

    button.addEventListener('click', function () {
      if (!joinedEmail) {
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

      post({
        email: joinedEmail,
        name: currentName(),
        everLostAPost: everLostAPost || undefined,
        proofForBrands: proofForBrands || undefined,
        source: 'answers',
      })
        .then(function (res) {
          if (res.ok && res.data && res.data.success) {
            say(feedback, 'Got it. That genuinely helps.');
            lost.disabled = true;
            proof.disabled = true;
            button.style.display = 'none';
          } else {
            say(feedback, (res.data && res.data.error) || 'That did not save. Try again.', true);
            setBusy(button, false);
          }
        })
        .catch(function () {
          say(feedback, 'We could not reach the server. Try again.', true);
          setBusy(button, false);
        });
    });
  }

  /* ==========================================================================
     3. Motion, of which there is deliberately little
     ========================================================================== */

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function once(el, cls, threshold) {
    if (!el) return;
    if (still || !('IntersectionObserver' in window)) { el.classList.add(cls); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(cls);
        io.unobserve(entry.target);
      });
    }, { threshold: threshold, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
  }

  /**
   * The record resolves one row at a time because that is what actually
   * happens: each platform answers at its own pace.
   */
  function setupRecord() { once(document.getElementById('record'), 'resolved', 0.3); }

  function setupReveal() {
    var items = document.querySelectorAll('.reveal');
    if (still || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('seen'); });
      return;
    }
    Array.prototype.forEach.call(items, function (el) { once(el, 'seen', 0.12); });
  }

  /* ========================================================================== */
  function init() {
    setupForm('form-top', 'email-top', 'feedback-top', 'hero');
    setupForm('form-bottom', 'email-bottom', 'feedback-bottom', 'footer');
    setupRoles();
    setupAnswers();
    setupRecord();
    setupReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
