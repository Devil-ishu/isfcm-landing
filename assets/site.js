/* Shared behaviour for the main site: menu, call-to-action tracking,
   voice player and enquiry forms. Page-specific code lives on the page. */
(function () {
  function track(name, params, custom) {
    try { fbq(custom ? 'trackCustom' : 'track', name, params || {}); } catch (e) {}
  }
  function ga(name, params) { try { gtag('event', name, params || {}); } catch (e) {} }
  window.siteTrack = { fb: track, ga: ga };

  // Mobile menu
  var nav = document.querySelector('.nav');
  if (nav) {
    var btn = nav.querySelector('.menu');
    var close = function () { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu'; };
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      btn.textContent = open ? 'Close' : 'Menu';
    });
    nav.querySelectorAll('ul a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  // Every "Request a diagnosis" link reports where it was clicked
  document.querySelectorAll('[data-cta]').forEach(function (a) {
    a.addEventListener('click', function () {
      track('DiagnosisCTA', { location: a.dataset.cta, page: location.pathname }, true);
      ga('diagnosis_cta', { location: a.dataset.cta });
    });
  });

  // Before / after voice player
  var current = null;
  document.querySelectorAll('.player').forEach(function (p) {
    var audio = null;
    p.addEventListener('click', function () {
      if (!audio) {
        audio = new Audio(p.dataset.src);
        audio.addEventListener('ended', function () { p.classList.remove('on'); });
        audio.addEventListener('error', function () {
          p.classList.remove('on');
          if (!p.querySelector('.missing')) {
            var s = document.createElement('span');
            s.className = 'missing'; s.textContent = 'Clip coming soon';
            p.querySelector('b').after(s);
          }
        });
      }
      if (current && current !== audio) {
        current.pause();
        document.querySelectorAll('.player.on').forEach(function (x) { x.classList.remove('on'); });
      }
      if (audio.paused) {
        audio.play().catch(function () {}); p.classList.add('on'); current = audio;
        ga('voice_play', { clip: p.dataset.src });
      } else { audio.pause(); p.classList.remove('on'); }
    });
  });

  // Enquiry forms → /api/enquiry → Google Sheet
  var utm = {};
  new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_/.test(k)) utm[k] = v; });

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var submit = form.querySelector('button[type=submit]');
    var label = submit.textContent;

    form.addEventListener('input', function (e) {
      var f = e.target.closest('.field');
      if (f) f.classList.remove('invalid');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      form.querySelectorAll('[required]').forEach(function (el) {
        var ok = el.type === 'radio'
          ? form.querySelector('input[name="' + el.name + '"]:checked')
          : el.value.trim() && el.checkValidity();
        var field = el.closest('.field');
        if (!ok) { field.classList.add('invalid'); bad = bad || el; }
      });
      if (bad) { bad.focus(); status.textContent = 'Check the highlighted fields.'; status.className = 'form-status error'; return; }

      var data = { form: form.dataset.form, page: location.pathname };
      new FormData(form).forEach(function (v, k) {
        if (data[k]) data[k] = [].concat(data[k], v); else data[k] = v;
      });
      Object.keys(utm).forEach(function (k) { data[k] = utm[k]; });

      submit.disabled = true; submit.textContent = 'Sending…';
      status.textContent = ''; status.className = 'form-status';

      fetch('/api/enquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw j; return j; }); })
        .then(function () {
          form.reset();
          form.classList.add('sent');
          status.textContent = form.dataset.thanks || 'Received. We will reply within one working day.';
          status.className = 'form-status ok';
          submit.textContent = 'Sent';
          track('Lead', { content_name: form.dataset.form });
          ga('generate_lead', { form: form.dataset.form });
        })
        .catch(function () {
          submit.disabled = false; submit.textContent = label;
          status.innerHTML = 'That didn’t go through. Try again, or WhatsApp <a href="https://wa.me/919464151610">+91 94641 51610</a>.';
          status.className = 'form-status error';
        });
    });
  });
})();
