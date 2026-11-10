/* Influence Profile app.
   Two modes on one page:
   - reel (default): intro → 14 situations → unlock (name + WhatsApp) → result → /diagnosis/
   - booked (?pid=… from the paid flow, or ?m=booked): contact → 14 situations → the diagnosis
     questions → "you and me" → how the call will go → result → /done/
   - ?r=… shows a saved result (the link people keep or share).
   Scoring for the person's own result happens here. The call brief (pursue score,
   how to talk to them) is built server-side in functions/api/profile.js and never reaches the browser. */
(function () {
  var D = window.PROFILE_DATA;
  var Q = D.questions;
  var TYPE_ORDER = ['S', 'C', 'M', 'R', 'P', 'Q'];
  var DIM_IDS = D.dims.map(function (d) { return d.id; });
  var params = new URLSearchParams(location.search);
  var F = window.Flow || { ctx: {}, url: function (p) { return p; }, go: function (p) { location.href = p; }, track: function () {}, custom: function () {}, ga: function () {}, payment: function () { return Promise.resolve(null); } };
  var BOOKED = !!(params.get('pid') || params.get('razorpay_payment_id') || params.get('m') === 'booked');
  var KEY = 'profile_v1_' + (BOOKED ? (F.ctx.pid || 'booked') : 'reel');
  var app = document.getElementById('app');

  // ---------- booked-mode forms ----------
  var CH = {
    age: ['Under 21', '21–25', '26–30', '31–40', '41–50', '50+'],
    occupation: [['founder', 'Founder / business owner'], ['senior', 'Senior executive / manager'], ['salaried', 'Salaried professional'], ['sales', 'Sales / business development'], ['coach', 'Coach / consultant / freelancer'], ['student', 'Student'], ['other', 'Other']],
    frequency: [['daily', 'Daily'], ['weekly', 'Weekly'], ['high_stakes', 'Only in high-stakes moments'], ['rare_costly', 'Rarely, but it costs me a lot']],
    patterns: ['People size me up wrong before I\'ve said much', 'I fold or soften when someone pushes back', 'People say "let me think about it" and disappear', 'I care too much what they think of me in the moment', 'I over-explain and over-justify my value', 'My mind goes blank exactly when it matters'],
    response: [['act', 'Listen and act on it'], ['listen', "Listen, but don't act"], ['interrupt', 'Interrupt or talk over me'], ['ignore', 'Forget or ignore what I said']],
    arenas: ['Sales and closing', 'Negotiations', 'Meetings and boardrooms', 'Leading a team', 'Relationships and dating', 'Family', 'Public speaking or on camera', 'Interviews and career growth'],
    tried: [['therapy', 'Therapy or counselling'], ['coaching', 'Coaching'], ['training', 'Sales or negotiation training'], ['content', 'Books, YouTube, podcasts'], ['course', 'A communication or public-speaking course'], ['nothing', 'Nothing yet']],
    readiness: [['ready', "Ready to start now if it's the right fit"], ['options', 'I want to understand my options first'], ['not_now', 'Not in a position to invest right now']],
    start: [['week', 'This week'], ['month', 'This month'], ['exploring', 'Just exploring']],
    found: [['reel', 'A reel or short video'], ['ad', 'An ad'], ['youtube', 'YouTube'], ['friend', 'Someone told me about you'], ['other', 'Somewhere else']],
    expect: [['techniques', 'Someone who will give me techniques'], ['analyst', 'Someone who will analyse me'], ['truth', 'Someone who will tell me the truth about myself'], ['curious', "I'm not sure yet. I'm curious"]],
    feedback: [['straight', 'Straight, even if it stings'], ['context', 'Straight, with the reasoning'], ['gentle', 'Gently, please']],
    decide: [['alone_fast', 'Alone, and quickly'], ['alone_think', 'Alone, after thinking it over'], ['with_someone', 'With someone else (partner, family, a mentor)'], ['proof', 'Only once I\'ve seen proof']]
  };
  function opts(list) { return list.map(function (o) { return Array.isArray(o) ? { v: o[0], l: o[1] } : { v: o, l: o }; }); }

  var FORMS = {
    contact: { label: 'About you', title: 'So I know who I\'m talking to.', sub: 'Only I see these answers.', fields: [
      { k: 'name', type: 'text', label: 'Full name', req: 1, ac: 'name' },
      { k: 'whatsapp', type: 'tel', label: 'WhatsApp number', req: 1, ac: 'tel', ph: '+91' },
      { k: 'email', type: 'email', label: 'Email', req: 1, ac: 'email' },
      { k: 'city', type: 'text', label: 'City', req: 1, ac: 'address-level2' },
      { k: 'age', type: 'select', label: 'Age', req: 1, opts: opts(CH.age) },
      { k: 'occupation', type: 'select', label: 'What do you do?', req: 1, opts: opts(CH.occupation) },
      { k: 'role', type: 'text', label: 'Your role and industry, in one line' }
    ]},
    sit1: { label: 'The moment', title: 'One real moment. Short and honest beats long and careful.', fields: [
      { k: 'situation', type: 'textarea', label: 'Describe one situation you want diagnosed', hint: 'A deal you lost, a room that overlooked you, a conversation you still replay.', req: 1 },
      { k: 'moment', type: 'textarea', label: 'In that exact moment, what did you feel, and what did you do?', hint: 'For example: "I started over-explaining", "My mind went blank", "I agreed just to end it".', req: 1 }
    ]},
    sit2: { label: 'The pattern', title: 'Go with your first instinct.', fields: [
      { k: 'frequency', type: 'radio', label: 'How often does this show up?', req: 1, opts: opts(CH.frequency) },
      { k: 'patterns', type: 'check', label: 'Which of these feel familiar?', hint: 'Pick all that apply.', opts: opts(CH.patterns) },
      { k: 'response', type: 'radio', label: 'When you speak, people usually…', req: 1, opts: opts(CH.response) }
    ]},
    sit3: { label: 'Where it costs you', title: 'Be specific. This is where we\'ll aim.', fields: [
      { k: 'arenas', type: 'check', label: 'Where does it cost you the most?', hint: 'Pick all that apply.', req: 1, opts: opts(CH.arenas) },
      { k: 'cost', type: 'textarea', label: 'What is it costing you right now?', hint: 'Money, deals, promotions, relationships, respect. Put a number on it if you can.', req: 1 },
      { k: 'tried', type: 'check', label: 'What have you already tried?', opts: opts(CH.tried) }
    ]},
    sit4: { label: 'The outcome', title: 'What winning looks like.', fields: [
      { k: 'win', type: 'textarea', label: 'If this call goes perfectly, what\'s different afterwards?', req: 1 },
      { k: 'readiness', type: 'radio', label: 'If the diagnosis shows this needs structured work beyond one call, where are you?', req: 1, opts: opts(CH.readiness) },
      { k: 'start', type: 'seg', label: 'If we find the fix, how soon do you start?', req: 1, opts: opts(CH.start) }
    ]},
    me1: { label: 'You and me', title: 'Before we meet, let\'s be clear about each other.', fields: [
      { k: 'found', type: 'radio', label: 'How did you find me?', req: 1, opts: opts(CH.found) },
      { k: 'expect', type: 'radio', label: 'Right now, what do you expect me to be?', req: 1, opts: opts(CH.expect) },
      { k: 'feedback', type: 'radio', label: 'How do you want the truth?', req: 1, opts: opts(CH.feedback) },
      { k: 'decide', type: 'radio', label: 'When you make a big decision for yourself, you decide…', req: 1, opts: opts(CH.decide) }
    ]},
    me2: { label: 'You and me', title: 'Two honest answers.', fields: [
      { k: 'waste', type: 'textarea', label: 'What would make this call a waste of your time?', req: 1 },
      { k: 'doubt', type: 'textarea', label: 'Your honest doubt about me, or about this call', hint: 'Optional. I would rather hear it now than feel it on the call.' },
      { k: 'notes', type: 'textarea', label: 'Anything else I must know before we speak?', hint: 'Optional.' }
    ]}
  };

  // ---------- state ----------
  var S = { step: 0, ans: [], ms: [], changes: 0, f: {}, started: 0 };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.ans) S = saved; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var STEPS = [];
  STEPS.push(BOOKED ? 'intro_b' : 'intro_r');
  if (BOOKED) STEPS.push('contact');
  Q.forEach(function (_, i) { STEPS.push('q' + i); if (i === 6) STEPS.push('pulse'); });
  if (BOOKED) STEPS.push('sit1', 'sit2', 'sit3', 'sit4', 'me1', 'me2', 'callplan');
  else STEPS.push('gate');
  var shownAt = 0;

  // ---------- scoring ----------
  var RANGE = (function () {
    var min = {}, max = {};
    DIM_IDS.forEach(function (d) { min[d] = 0; max[d] = 0; });
    Q.forEach(function (q) {
      DIM_IDS.forEach(function (d) {
        var vals = q.opts.map(function (o) { return o.d[d] || 0; });
        min[d] += Math.min.apply(null, vals); max[d] += Math.max.apply(null, vals);
      });
    });
    return { min: min, max: max };
  })();

  function score(ans) {
    var t = {}, d = {}, hx = 0, px = 0, goal = null;
    TYPE_ORDER.forEach(function (k) { t[k] = 0; });
    DIM_IDS.forEach(function (k) { d[k] = 0; });
    ans.forEach(function (ai, qi) {
      if (ai == null) return;
      var o = Q[qi].opts[ai];
      Object.keys(o.t).forEach(function (k) { t[k] += o.t[k]; });
      Object.keys(o.d).forEach(function (k) { d[k] += o.d[k]; });
      hx += o.hx || 0; px += o.px || 0;
      if (o.g) goal = o.g;
    });
    var ranked = TYPE_ORDER.slice().sort(function (a, b) { return t[b] - t[a] || TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b); });
    var dims = {};
    DIM_IDS.forEach(function (k) {
      var span = RANGE.max[k] - RANGE.min[k] || 1;
      dims[k] = Math.round(12 + 84 * (d[k] - RANGE.min[k]) / span);
    });
    return { type: ranked[0], type2: ranked[1], tscores: t, dims: dims, hx: hx, px: px, goal: goal || 'presence' };
  }

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function first(n) { return String(n || '').trim().split(/\s+/)[0]; }
  function progress(label, right) {
    var qsteps = STEPS.length - 1, at = Math.max(0, S.step);
    return '<div class="prog"><div class="prog-top"><span>' + esc(label) + '</span><span>' + esc(right || '') + '</span></div><div class="bar"><i style="width:' + Math.round(100 * at / qsteps) + '%"></i></div></div>';
  }
  function setBody(mist) { document.body.classList.toggle('mist', !!mist); }
  function render(html, mist) { setBody(mist); app.innerHTML = html; window.scrollTo(0, 0); var h = app.querySelector('h1,h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  function go(step) { S.step = step; save(); show(); }
  function next() { go(S.step + 1); }
  function back() { if (S.step > 0) go(S.step - 1); }

  function show() {
    var id = STEPS[S.step];
    shownAt = Date.now();
    if (id === 'intro_r') return introReel();
    if (id === 'intro_b') return introBooked();
    if (id === 'pulse') return pulse();
    if (id === 'gate') return gate();
    if (id === 'callplan') return callplan();
    if (id[0] === 'q') return question(+id.slice(1));
    return form(id);
  }

  // ---------- screens ----------
  function introReel() {
    render('<div class="wrap"><div class="brandline">Gaurang Misra</div><div class="mid">' +
      '<h1>How do you actually move people?</h1>' +
      '<p class="lead">14 situations. 4 minutes. You get your influence type, the one habit that leaks your authority, and a fix you can use tomorrow.</p>' +
      '<div class="rows"><div><span>Your influence type</span><span class="v">1 of 6</span></div><div><span>Your influence map</span><span class="v">5 dimensions</span></div><div><span>The leak, and the fix</span><span class="v">7-day drill</span></div></div>' +
      '</div><div class="stack-s"><button class="btn" id="go">Start the profile</button><p class="small center">Free. Answer what you actually do, not what you should do.</p></div></div>');
    document.getElementById('go').onclick = start;
  }
  function introBooked() {
    render('<div class="wrap"><div class="brandline">Gaurang Misra</div><div class="mid">' +
      '<p class="soft">Last step before your call</p>' +
      '<h1>Let me meet you before we meet.</h1>' +
      '<p class="lead">About 10 minutes. You\'ll get your influence profile at the end, so you walk into the call already holding half the answer. I\'ll read every word before we speak.</p>' +
      '<div class="rows"><div><span>About you</span><span class="v">1 min</span></div><div><span>14 situations</span><span class="v">4 min</span></div><div><span>Your moment, and the cost</span><span class="v">3 min</span></div><div><span>You and me</span><span class="v">2 min</span></div></div>' +
      '</div><div class="stack-s"><button class="btn" id="go">Begin</button><p class="small center">Answers save on this device as you go.</p></div></div>');
    document.getElementById('go').onclick = start;
  }
  function start() {
    if (!S.started) { S.started = Date.now(); F.custom('ProfileStart', { mode: BOOKED ? 'booked' : 'reel' }); F.ga('profile_start', { mode: BOOKED ? 'booked' : 'reel' }); }
    next();
  }

  function question(i) {
    var q = Q[i], picked = S.ans[i];
    var html = '<div class="wrap">' + progress('Situation ' + (i + 1) + ' of ' + Q.length, q.area) +
      '<div class="stack"><div class="stack-s"><h2>' + esc(q.text) + '</h2>' + (q.sub ? '<p class="soft">' + esc(q.sub) + '</p>' : '') + '</div>' +
      '<div class="opts" role="group" aria-label="Choose one">' +
      q.opts.map(function (o, oi) { return '<button class="opt" data-i="' + oi + '" aria-pressed="' + (picked === oi) + '">' + esc(o.l) + '</button>'; }).join('') +
      '</div></div><div class="grow"></div><div class="nav"><button class="link" id="back">Back</button><button class="btn inline" id="nx"' + (picked == null ? ' disabled' : '') + '>Next</button></div></div>';
    render(html);
    var timer = null;
    app.querySelectorAll('.opt').forEach(function (b) {
      b.onclick = function () {
        var oi = +b.getAttribute('data-i');
        if (S.ans[i] != null && S.ans[i] !== oi) S.changes++;
        S.ans[i] = oi;
        if (S.ms[i] == null) S.ms[i] = Date.now() - shownAt;
        save();
        app.querySelectorAll('.opt').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        document.getElementById('nx').disabled = false;
        clearTimeout(timer); timer = setTimeout(nextQ, 320); // tap and move on
      };
    });
    function nextQ() { F.custom('ProfileStep', { step: i + 1 }); next(); }
    document.getElementById('nx').onclick = function () { clearTimeout(timer); nextQ(); };
    document.getElementById('back').onclick = function () { clearTimeout(timer); back(); };
  }

  function pulse() {
    var r = score(S.ans.slice(0, 7));
    var key = (r.hx >= 0 ? 'head' : 'heart') + '-' + (r.px >= 0 ? 'push' : 'pull');
    render('<div class="wrap">' + progress('Halfway', '7 of 14') + '<div class="mid">' +
      '<p class="soft">Early read</p><h2>' + esc(D.pulse[key]) + '</h2>' +
      '<p class="soft">That gap is usually where your influence goes. The next seven situations show whether it\'s your voice, your timing or your frame.</p>' +
      '<div class="split"><div><b>' + (r.hx >= 0 ? 'Head' : 'Heart') + '</b><span class="small">leads over ' + (r.hx >= 0 ? 'heart' : 'head') + '</span></div><div><b>' + (r.px >= 0 ? 'Push' : 'Pull') + '</b><span class="small">over ' + (r.px >= 0 ? 'pull' : 'push') + '</span></div></div>' +
      '</div><button class="btn" id="go">Find out which</button><div class="nav" style="margin-top:8px"><button class="link" id="back">Back</button><span></span></div></div>', true);
    document.getElementById('go').onclick = next;
    document.getElementById('back').onclick = back;
    F.custom('ProfileHalfway');
  }

  function fieldHtml(f) {
    var v = S.f[f.k], id = 'f_' + f.k, req = f.req ? '' : ' <span class="req">(optional)</span>';
    var hint = f.hint ? '<span class="hint" id="' + id + '_h">' + esc(f.hint) + '</span>' : '';
    var desc = f.hint ? ' aria-describedby="' + id + '_h"' : '';
    if (f.type === 'radio' || f.type === 'check' || f.type === 'seg') {
      var multi = f.type === 'check', arr = multi ? (v || []) : null;
      var inner = f.opts.map(function (o, oi) {
        var on = multi ? arr.indexOf(o.v) > -1 : v === o.v;
        return '<label' + (f.type === 'seg' ? '' : ' class="chip"') + '><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + f.k + '" value="' + esc(o.v) + '"' + (on ? ' checked' : '') + '>' + '<span>' + esc(o.l) + '</span></label>';
      }).join('');
      return '<fieldset class="field" data-k="' + f.k + '" style="border:0"><legend class="q" style="margin-bottom:6px">' + esc(f.label) + req + '</legend>' + hint + '<div class="' + (f.type === 'seg' ? 'seg' : 'chips') + '">' + inner + '</div></fieldset>';
    }
    var label = '<label for="' + id + '">' + esc(f.label) + req + '</label>';
    if (f.type === 'textarea') return '<div class="field" data-k="' + f.k + '">' + label + hint + '<textarea id="' + id + '" name="' + f.k + '"' + desc + '>' + esc(v || '') + '</textarea></div>';
    if (f.type === 'select') return '<div class="field" data-k="' + f.k + '">' + label + hint + '<select id="' + id + '" name="' + f.k + '"><option value="">Select</option>' + f.opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (v === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select></div>';
    return '<div class="field" data-k="' + f.k + '">' + label + hint + '<input id="' + id + '" name="' + f.k + '" type="' + f.type + '"' + (f.ac ? ' autocomplete="' + f.ac + '"' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + ' value="' + esc(v || '') + '"' + desc + '></div>';
  }
  function readForm(fields) {
    fields.forEach(function (f) {
      if (f.type === 'check') S.f[f.k] = [].map.call(app.querySelectorAll('input[name="' + f.k + '"]:checked'), function (x) { return x.value; });
      else if (f.type === 'radio' || f.type === 'seg') { var c = app.querySelector('input[name="' + f.k + '"]:checked'); S.f[f.k] = c ? c.value : ''; }
      else { var el = app.querySelector('[name="' + f.k + '"]'); S.f[f.k] = el ? el.value.trim() : ''; }
    });
    save();
  }
  function validate(fields) {
    var bad = [];
    fields.forEach(function (f) {
      var v = S.f[f.k], ok = true;
      if (f.req) ok = Array.isArray(v) ? v.length > 0 : !!v;
      if (ok && f.k === 'email' && v) ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (ok && (f.k === 'whatsapp') && v) ok = v.replace(/\D/g, '').length >= 10;
      var box = app.querySelector('[data-k="' + f.k + '"]');
      if (box) box.classList.toggle('invalid', !ok);
      if (!ok) bad.push(box);
    });
    return bad;
  }
  function form(id) {
    var fm = FORMS[id];
    var pos = ['sit1', 'sit2', 'sit3', 'sit4'].indexOf(id);
    var right = pos > -1 ? 'Part ' + (pos + 1) + ' of 4' : (id === 'contact' ? '1 minute' : '');
    render('<div class="wrap">' + progress(fm.label, right) + '<form class="stack" id="fm" novalidate>' +
      '<div class="stack-s"><h2>' + esc(fm.title) + '</h2>' + (fm.sub ? '<p class="soft">' + esc(fm.sub) + '</p>' : '') + '</div>' +
      fm.fields.map(fieldHtml).join('') +
      '<p class="ferr" id="err" role="alert"></p>' +
      '<div class="nav" style="margin-top:0"><button type="button" class="link" id="back">Back</button><button class="btn inline" type="submit">Next</button></div></form></div>');
    if (id === 'contact') prefill();
    document.getElementById('back').onclick = function () { readForm(fm.fields); back(); };
    document.getElementById('fm').onsubmit = function (e) {
      e.preventDefault(); readForm(fm.fields);
      var bad = validate(fm.fields);
      if (bad.length) { document.getElementById('err').textContent = 'Please complete the highlighted ' + (bad.length > 1 ? 'questions.' : 'question.'); var el = bad[0].querySelector('input,textarea,select'); if (el) el.focus(); return; }
      F.custom('ProfileStep', { step: id }); next();
    };
  }
  function prefill() {
    F.payment().then(function (p) {
      if (!p) return;
      S.amount = p.amount;
      var e = app.querySelector('[name="email"]'), w = app.querySelector('[name="whatsapp"]');
      if (e && !e.value && p.email) e.value = p.email;
      if (w && !w.value && p.contact) w.value = p.contact;
      save();
    });
  }

  function callplan() {
    render('<div class="wrap">' + progress('How the call will go', 'Last screen') + '<div class="stack">' +
      '<div class="stack-s"><h2>No surprises. Here\'s exactly what happens.</h2><p class="soft">45 minutes on Zoom. I\'ll have read everything you just wrote.</p></div>' +
      '<ol class="callplan">' +
      '<li><div><b>I ask, you answer.</b><span>I\'ll interrupt you. It\'s not rude, it\'s the method. Your pattern shows in how you answer, not what you prepared.</span></div></li>' +
      '<li><div><b>In the first ten minutes, I tell you what I see.</b><span>Straight. Including the parts you didn\'t write down.</span></div></li>' +
      '<li><div><b>Then we test it, live.</b><span>Your voice, your reactions, one real situation. You\'ll hear the difference yourself.</span></div></li>' +
      '<li><div><b>At the end, the truth about what it takes.</b><span>If one call is enough, I\'ll tell you and you\'re done. If it needs structured work, I\'ll tell you what working with me looks like and what it costs. The decision is yours, and there is no pressure on the call.</span></div></li>' +
      '<li><div><b>If I can\'t help you, I\'ll say so.</b><span>The call is recorded so I can review it. Only I see it.</span></div></li>' +
      '</ol>' +
      '<label class="consent"><input type="checkbox" id="ok"><span>Understood. My answers are honest, and I\'m sharing them only with Gaurang Misra to prepare my diagnosis.</span></label>' +
      '<p class="ferr" id="err" role="alert"></p>' +
      '<div class="hp" aria-hidden="true"><label>Website <input name="website" id="hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<button class="btn" id="go">Send, and show me my profile</button>' +
      '<div class="nav" style="margin-top:0"><button class="link" id="back">Back</button><span></span></div></div></div>');
    document.getElementById('back').onclick = back;
    document.getElementById('go').onclick = function () {
      if (!document.getElementById('ok').checked) { document.getElementById('err').textContent = 'Tick the box to confirm, then send.'; return; }
      submit(document.getElementById('hp').value);
    };
  }

  function gate() {
    var r = score(S.ans), T = D.types[r.type];
    render('<div class="wrap"><div class="brandline">Gaurang Misra</div><form class="stack" id="fm" novalidate style="margin-top:40px">' +
      '<div class="stack-s"><p class="soft">Your type is ready</p><h1>' + esc(T.name) + '</h1><p class="soft">' + esc(T.tag) + '</p></div>' +
      '<div class="rows"><div><span>Your influence map</span>' + lock() + '</div><div><span>The habit leaking your authority</span>' + lock() + '</div><div><span>Your 7-day fix</span>' + lock() + '</div></div>' +
      fieldHtml({ k: 'name', type: 'text', label: 'First name', req: 1, ac: 'given-name' }) +
      fieldHtml({ k: 'whatsapp', type: 'tel', label: 'WhatsApp number', req: 1, ac: 'tel', ph: '+91', hint: 'Your profile link comes here on WhatsApp too.' }) +
      '<div class="hp" aria-hidden="true"><label>Website <input name="website" id="hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<p class="ferr" id="err" role="alert"></p>' +
      '<div class="stack-s"><button class="btn" type="submit">Open my full profile</button><p class="small center">It opens here, with a link you can keep.</p></div>' +
      '<div class="nav" style="margin-top:0"><button type="button" class="link" id="back">Back</button><span></span></div></form></div>');
    var fields = [{ k: 'name', req: 1 }, { k: 'whatsapp', req: 1 }];
    document.getElementById('back').onclick = back;
    document.getElementById('fm').onsubmit = function (e) {
      e.preventDefault(); readForm(fields);
      if (validate(fields).length) { document.getElementById('err').textContent = 'Add your first name and a WhatsApp number with at least 10 digits.'; return; }
      submit(document.getElementById('hp').value);
    };
  }
  function lock() { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A9A9B8" stroke-width="1.5" aria-label="Locked" role="img"><rect x="5" y="11" width="14" height="9" rx="1"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>'; }

  // ---------- submit ----------
  var sending = false;
  function submit(honeypot) {
    if (sending) return; sending = true;
    var r = score(S.ans);
    var body = {
      form: 'profile', mode: BOOKED ? 'booked' : 'reel', website: honeypot || '',
      pid: F.ctx.pid || '', oid: F.ctx.oid || '', amount: S.amount || (F.ctx.pay && F.ctx.pay.amount) || '',
      src: params.get('src') || params.get('utm_content') || '',
      utm_source: params.get('utm_source') || '', utm_campaign: params.get('utm_campaign') || '', utm_content: params.get('utm_content') || '',
      type: D.types[r.type].name, type_code: r.type, type2: D.types[r.type2].name, type2_code: r.type2,
      hx: r.hx, px: r.px, goal: r.goal,
      consistent: (Q[1].opts[S.ans[1]] || {}).k === (Q[10].opts[S.ans[10]] || {}).k ? 'yes' : 'no',
      pair_a: (Q[1].opts[S.ans[1]] || {}).k || '', pair_b: (Q[10].opts[S.ans[10]] || {}).k || '',
      changes: S.changes || 0,
      avg_secs: Math.round(S.ms.reduce(function (a, b) { return a + (b || 0); }, 0) / Math.max(1, S.ms.filter(function (x) { return x != null; }).length) / 100) / 10,
      total_mins: S.started ? Math.round((Date.now() - S.started) / 6000) / 10 : ''
    };
    DIM_IDS.forEach(function (k) { body['dim_' + k] = r.dims[k]; });
    S.ans.forEach(function (ai, qi) { body['q' + (qi + 1)] = ai == null ? '' : Q[qi].opts[ai].l; body['q' + (qi + 1) + '_secs'] = S.ms[qi] == null ? '' : Math.round(S.ms[qi] / 100) / 10; });
    Object.keys(S.f).forEach(function (k) { body[k] = S.f[k]; });
    if (!BOOKED) { body.phone = S.f.whatsapp; body.result_code = code(r); } // the Apps Script WhatsApps the result link

    render('<div class="wrap"><div class="mid center"><div class="spin" aria-hidden="true"></div><p class="soft">Reading your answers…</p></div></div>');
    var tries = 0;
    (function attempt() {
      fetch('/api/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (!d.ok && tries++ < 1) return setTimeout(attempt, 1200);
          done(r, d.ok);
        })
        .catch(function () { if (tries++ < 1) return setTimeout(attempt, 1200); done(r, false); });
    })();
  }
  function done(r, ok) {
    sending = false;
    if (BOOKED) {
      if (ok) { F.track('CompleteRegistration', { content_name: 'Influence Profile' }); F.ga('questionnaire_submit'); if (F.set) { F.set('submitted', 1); F.set('first', first(S.f.name)); } }
    } else {
      F.track('Lead', { content_name: 'Influence Profile', content_category: r.type }); F.ga('generate_lead', { form: 'profile', type: r.type });
    }
    S.result = { code: code(r), name: first(S.f.name), sent: ok }; save();
    if (BOOKED && !ok) return failed(r);
    result(r, first(S.f.name));
  }
  function failed(r) {
    render('<div class="wrap"><div class="mid"><h2>Your answers didn\'t reach me.</h2><p class="soft">They\'re saved on this device. Check your connection and try again. If it keeps failing, WhatsApp me on <a href="https://wa.me/919464151610">+91 94641 51610</a> and I\'ll sort it before the call.</p></div><button class="btn" id="go">Try again</button><button class="link" id="see" style="margin-top:12px">Show my profile anyway</button></div>');
    document.getElementById('go').onclick = function () { submit(''); };
    document.getElementById('see').onclick = function () { result(r, first(S.f.name)); };
  }

  // A result travels in the URL: ?r=SQ.82.71.52.44.38.presence&n=Rohan
  function code(r) { return r.type + r.type2 + '.' + DIM_IDS.map(function (k) { return r.dims[k]; }).join('.') + '.' + r.goal; }
  function decode(s) {
    var p = String(s || '').split('.');
    if (p.length !== 7 || !/^[CMSRPQ]{2}$/.test(p[0]) || !D.goals[p[6]]) return null;
    var dims = {};
    for (var i = 0; i < 5; i++) { var n = +p[i + 1]; if (!(n >= 0 && n <= 100)) return null; dims[DIM_IDS[i]] = n; }
    return { type: p[0][0], type2: p[0][1], dims: dims, goal: p[6] };
  }

  // ---------- result ----------
  function result(r, name, viewing) {
    var T = D.types[r.type], T2 = D.types[r.type2];
    var link = location.origin + '/go/profile/?r=' + code(r) + (name ? '&n=' + encodeURIComponent(name) : '');
    try { history.replaceState(null, '', '/go/profile/?r=' + code(r) + (name ? '&n=' + encodeURIComponent(name) : '') + (BOOKED ? '&m=booked' : '')); } catch (e) {}
    var dimsSorted = D.dims.slice().sort(function (a, b) { return r.dims[b.id] - r.dims[a.id]; });
    var g = D.goals[r.goal], lever = g.dims.slice().sort(function (a, b) { return r.dims[a] - r.dims[b]; })[0];
    var leverName = D.dims.filter(function (d) { return d.id === lever; })[0].name;
    var map = dimsSorted.map(function (d) {
      var v = r.dims[d.id], lvl = v >= 70 ? 2 : v >= 45 ? 1 : 0;
      return '<div class="dim"><div class="dim-top"><b>' + d.name + '</b><span class="soft">' + v + '</span></div><div class="dim-bar"><i data-w="' + v + '"></i></div><p>' + esc(D.dimNotes[d.id][lvl]) + '</p></div>';
    }).join('');
    var end = BOOKED
      ? '<h3>Your profile is with me now.</h3><p class="soft">Bring this with you. On the call we go after the other half. Join two minutes early, from a quiet room, camera on.</p><a class="btn" href="' + F.url('/go/diagnosis/done/') + '">Finish</a>'
      : '<h3>I\'ll map the other half with you, live.</h3><a class="btn" id="book" href="/go/diagnosis/?utm_source=profile&utm_medium=result&utm_content=' + r.type + '">Book your diagnosis</a><p class="small">45 minutes on Zoom. Your profile comes with you.</p>';
    setBody(false);
    app.innerHTML = '<div class="res">' +
      '<section class="night"><div class="wrap"><div class="brandline">Gaurang Misra</div>' +
      '<p class="kick">' + (name ? esc(name) + ', your' : 'Your') + ' influence type</p><h1 tabindex="-1">' + esc(T.name) + '</h1>' +
      '<p class="lead">' + esc(T.hero) + '</p><p class="small">Second influence: ' + esc(T2.name) + '</p></div></section>' +
      '<div class="wrap stack" style="padding-top:40px">' +
      '<div class="stack-s"><h2>Your influence map</h2></div><div class="map">' + map + '</div>' +
      '<p class="goal">You said you want ' + esc(g.text) + '. The lever for that is <b>' + leverName + '</b>, and yours is at ' + r.dims[lever] + '.</p>' +
      '<div class="sec stack-s"><p class="soft">The leak</p><h3>' + esc(T.leak) + '</h3><p class="soft">' + esc(T.leakBody) + '</p></div>' +
      '<div class="fix"><p class="small">Half the problem, solved today</p><h3>' + esc(T.drill) + '</h3><ol>' + T.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol><p class="small">' + esc(T.drillNote) + '</p></div>' +
      '<div class="sec stack-s"><p class="soft">The half a test can\'t solve</p><p>' + esc(T.deeper) + (T.deeper.indexOf('questionnaire') > -1 ? '' : ' That needs a person listening, not a questionnaire.') + '</p></div>' +
      '<div class="end">' + end + '<button class="link" id="copy">Copy the link to my profile</button>' + (BOOKED ? '' : '<button class="link" id="again">' + (viewing ? 'Take the test yourself' : 'Take it again') + '</button>') + '</div>' +
      '</div></div>';
    window.scrollTo(0, 0);
    app.querySelector('h1').focus({ preventScroll: true });
    requestAnimationFrame(function () { setTimeout(function () { app.querySelectorAll('.dim-bar i').forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; }); }, 60); });
    document.getElementById('copy').onclick = function () {
      var b = this;
      var ok = function () { b.textContent = 'Link copied'; };
      if (navigator.share) { navigator.share({ title: 'My influence type: ' + T.name, url: link }).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(ok, function () { prompt('Copy this link', link); });
      else prompt('Copy this link', link);
    };
    var ag = document.getElementById('again');
    if (ag) ag.onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.href = '/go/profile/' + (params.get('src') ? '?src=' + encodeURIComponent(params.get('src')) : ''); };
    var bk = document.getElementById('book'); if (bk) bk.onclick = function () { F.custom('ProfileToDiagnosis', { type: r.type }); };
  }

  // ---------- boot ----------
  var shared = decode(params.get('r'));
  if (shared) { var mine = S.result && S.result.code === params.get('r'); result(shared, (params.get('n') || '').slice(0, 30), !mine); return; }
  if (S.result && S.result.code && (!BOOKED || S.result.sent)) { var again = decode(S.result.code); if (again) { result(again, S.result.name); return; } }
  if (S.step >= STEPS.length) S.step = 0;
  show();
})();
