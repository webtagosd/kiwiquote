// Page behaviour: FAQ accordion, survey steps, lead form submit. External so the CSP needs no 'unsafe-inline'.
// ---- FAQ accordion (single open at a time) ----
document.querySelectorAll('#faq .faq-q').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var row = btn.closest('.faq-row');
    var isOpen = row.classList.contains('open');
    document.querySelectorAll('#faq .faq-row.open').forEach(function (r) {
      r.classList.remove('open');
      r.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      row.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ---- Submit ----
var LEAD_ENDPOINT = "https://webtag-live.vercel.app/api/forms/submit"; // WebTag dashboard intake

var form = document.getElementById('leadForm');
var thanks = document.getElementById('thanks');
var submitBtn = form.querySelector('button[type="submit"]');

// Cloudflare Turnstile: a token lasts 300s and works once, so it is read at send time and
// renewed if missing or stale. Never blocks: no token within ~5s and the enquiry goes without.
function turnstileToken() {
  var ts = window.turnstile, w = form.querySelector('.cf-turnstile');
  var get = function () { try { return ts.getResponse(w) || ''; } catch (_) { return ''; } };
  return new Promise(function (res) {
    if (!ts || !w) return res('');
    try { if (!get() || ts.isExpired(w)) ts.reset(w); } catch (_) {}
    var n = 0; (function poll() { var t = get(); if (t || ++n > 25) return res(t); setTimeout(poll, 200); })();
  });
}
// After every send, so a second enquiry gets a fresh token.
function resetTurnstile() { try { window.turnstile.reset(form.querySelector('.cf-turnstile')); } catch (_) {} }
form.addEventListener('submit', function (e) {
  e.preventDefault();
  // simple required check
  var required = ['name', 'phone', 'email'];
  var ok = true;
  required.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el.value.trim()) { el.style.borderColor = '#b4532e'; ok = false; }
  });
  var interest = form.querySelector('input[name="interest"]:checked');
  var has = form.querySelector('input[name="hasInsurance"]:checked');
  if (!interest || !has) { ok = false; }

  if (!ok) {
    if (!interest || !has) {
      alert('Just a couple more taps: please pick what you\'re interested in and whether you currently have insurance.');
    }
    return;
  }

  function pick(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  var data = {
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    interest: pick('interest'),
    hasInsurance: pick('hasInsurance'),
    age: pick('age'),
    callTime: pick('callTime'),
    notes: document.getElementById('notes').value.trim(),
    source: 'kiwiquote.co.nz'
  };

  function showThanks() {
    form.style.display = 'none';
    thanks.classList.add('show');
    thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Send the lead to the WebTag dashboard.
  var idleLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
  turnstileToken().then(function (turnstile) { return fetch(LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: '1186e02b-cd2e-45e8-b214-d37510d79379', form_name: 'quote check', data: data, source_url: location.href, turnstile_token: turnstile || undefined })
  }); }).then(function (r) {
    if (!r.ok) throw new Error();
    showThanks();
  }).catch(function () {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = idleLabel; }
    alert('Sorry, that did not send. Please try again, or email us at admin@kiwiquote.co.nz.');
  }).then(resetTurnstile);
});

// ---- Survey step navigation ----
(function () {
  var steps = Array.prototype.slice.call(form.querySelectorAll('.survey-step'));
  var total = steps.length;
  var bar = document.getElementById('surveyBar');
  var countEl = document.getElementById('surveyCount');
  var backBtn = document.getElementById('backBtn');
  var nextBtn = document.getElementById('nextBtn');
  var skipBtn = document.getElementById('skipBtn');
  var finePrint = document.getElementById('finePrint');
  var current = 0;

  function render() {
    steps.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
    bar.style.width = ((current + 1) / total * 100) + '%';
    countEl.textContent = 'Question ' + (current + 1) + ' of ' + total;

    var isLast = current === total - 1;
    var optional = !steps[current].hasAttribute('data-required');

    backBtn.hidden = current === 0;
    nextBtn.hidden = isLast;
    submitBtn.hidden = !isLast;
    finePrint.hidden = !isLast;
    skipBtn.hidden = isLast || !optional;
  }

  function stepValid() {
    var step = steps[current];
    if (step.hasAttribute('data-required')) {
      var name = step.getAttribute('data-name');
      if (!form.querySelector('input[name="' + name + '"]:checked')) {
        step.querySelectorAll('.choice label').forEach(function (l) {
          l.style.borderColor = '#b4532e';
        });
        return false;
      }
    }
    return true;
  }

  function go(dir) {
    var target = current + dir;
    if (target < 0 || target >= total) { return; }
    current = target;
    render();
    var firstInput = steps[current].querySelector('input, textarea');
    if (firstInput && current === total - 1) { firstInput.focus(); }
  }

  nextBtn.addEventListener('click', function () { if (stepValid()) { go(1); } });
  backBtn.addEventListener('click', function () { go(-1); });
  skipBtn.addEventListener('click', function () { go(1); });

  // Auto-advance the multiple-choice steps when an option is picked.
  steps.forEach(function (step, i) {
    if (i === total - 1) { return; } // contact step is not a choice step
    step.addEventListener('change', function (e) {
      if (e.target && e.target.type === 'radio') {
        step.querySelectorAll('.choice label').forEach(function (l) { l.style.borderColor = ''; });
        setTimeout(function () { if (current === i) { go(1); } }, 280);
      }
    });
  });

  render();
})();
