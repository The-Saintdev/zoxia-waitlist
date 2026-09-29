/**
 * ZOXIA WAITLIST
 * https://zoxia.site, by Cresco Ai LTD
 *
 * Three jobs, in the order they matter:
 *   1. Take an email and say honestly whether it saved.
 *   2. Ask the two research questions, but only after the email is safe.
 *   3. Resolve the record in the hero, and reveal sections on scroll.
 *
 * No scroll listeners anywhere. IntersectionObserver only.
 */
(function () {
  'use strict';

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* Lets CSS know it may hide things it will later animate in. Without JS
     every element stays visible, which is the correct fallback. */
  document.documentElement.classList.add('js');

  /** Whoever just joined, set on a successful submit. */
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

  /* ==========================================================================
     1. The email
     ========================================================================== */
  function setupForm(formId, nameId, emailId, feedbackId, joinedId, source) {
    var form = document.getElementById(formId);
    var nameInput = document.getElementById(nameId);
    var emailInput = document.getElementById(emailId);
    var feedback = document.getElementById(feedbackId);
    var joined = document.getElementById(joinedId);
    if (!form || !emailInput) return;

    var button = form.querySelector('button[type="submit"]');

    [nameInput, emailInput].forEach(function (input) {
      if (input) input.addEventListener('input', function () { say(feedback, ''); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = nameInput ? nameInput.value.trim() : '';
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
      if (nameInput) nameInput.disabled = true;
      emailInput.disabled = true;
      say(feedback, '');

      fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email.toLowerCase(),
          source: source,
          submittedAt: new Date().toISOString(),
        }),
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) {
            return { ok: r.ok, data: data };
          });
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
            form.style.display = 'none';
            if (joined) joined.setAttribute('data-open', 'true');
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
        if (nameInput) nameInput.disabled = false;
        emailInput.disabled = false;
      }
    });
  }

  /* ==========================================================================
     2. The two questions, and the role
     ========================================================================== */

  /**
   * Either form can open the panel, so the email is whichever one was used.
   * Reading a single hard-coded input here meant a signup from the bottom
   * form silently dropped its role and answers.
   */
  function currentEmail() {
    if (joinedEmail) return joinedEmail;
    var ids = ['email-top', 'email-bottom'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.value.trim()) return el.value.trim().toLowerCase();
    }
    return '';
  }

  function setupRoles() {
    var buttons = document.querySelectorAll('.role');
    var feedback = document.getElementById('role-feedback');
    if (!buttons.length) return;

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var email = currentEmail();
        if (!email) {
          say(feedback, 'We lost track of your email. Refresh and join again.', true);
          return;
        }

        Array.prototype.forEach.call(buttons, function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });

        fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            role: btn.getAttribute('data-role'),
            source: 'survey',
          }),
        })
          .then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (data) {
            say(feedback, data && data.success ? 'Saved, thank you.' : 'That did not save.', !(data && data.success));
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

  /* ==========================================================================
     3. Motion, of which there is deliberately little
     ========================================================================== */

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * The record resolves one row at a time because that is what actually
   * happens: confirmations come back from each platform at different times.
   * It runs once, when it first comes into view, and then stops.
   */
  function setupRecord() {
    var record = document.getElementById('record');
    if (!record) return;
    if (still || !('IntersectionObserver' in window)) {
      record.classList.add('resolved');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        record.classList.add('resolved');
        io.disconnect();
      });
    }, { threshold: 0.35 });

    io.observe(record);
  }

  function setupReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (still || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('seen'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('seen');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* ========================================================================== */
  function init() {
    setupForm('form-top', 'name-top', 'email-top', 'feedback-top', 'joined-top', 'hero');
    setupForm('form-bottom', 'name-bottom', 'email-bottom', 'feedback-bottom', 'joined-bottom', 'footer');
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
