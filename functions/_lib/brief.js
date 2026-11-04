// Call brief for a booked diagnosis, built from the Influence Profile answers.
// Pure function, no network: buildBrief(body) → { subject, html, text, columns }.
// Everything here is a reading for Gaurang, written as hypotheses to test on the call.

const TYPES = {
  C: {
    name: 'The Commander',
    problem: 'Uses control to avoid being questioned. Mistakes compliance for buy-in.',
    register: 'Direct, peer to peer. No deference.',
    pace: 'Fast, then hard stops.',
    pressure: 'Challenge their certainty early. They respect strength and test for it.',
    use: 'results, control, leverage, "decide", what it costs them in people',
    avoid: 'over-explaining, asking permission, softening your read',
    open: "You're used to rooms bending to you. I want to find out why some people don't, and what that's costing you.",
    watch: 'Will test you in the first two minutes. Don\'t flinch and don\'t over-answer.',
  },
  M: {
    name: 'The Magnet',
    problem: 'Trades authority for approval. Needs to be liked before being taken seriously.',
    register: 'Warm for two minutes, then serious.',
    pace: 'Match their energy, then deliberately slow it down.',
    pressure: 'Enjoy the charm, then refuse to be charmed by it.',
    use: 'being taken seriously, respect, impact, "the room decided without you"',
    avoid: 'trading jokes for long, flattery, a fun call (fun calls don\'t convert)',
    open: "Everyone likes you. Let's talk about the people who don't take you seriously.",
    watch: 'Will make the call pleasant. Steer to the cost early and keep it there.',
  },
  S: {
    name: 'The Strategist',
    problem: 'Over-prepares content, under-prepares delivery. Hesitation reads as uncertainty.',
    register: 'Logic first, then one story.',
    pace: 'Slow and structured. Name the structure up front.',
    pressure: 'Challenge them early, with precision rather than volume.',
    use: 'frameworks, their own numbers, "precise", the rooms where they were right and ignored',
    avoid: 'hype, "transformation", feelings talk before minute 15',
    open: "Your answers say you're usually the smartest person in the room and rarely the one who decides. Let's find out why in the next ten minutes.",
    watch: 'Will want to discuss the method. Keep them in their own experience, not in theory.',
  },
  R: {
    name: 'The Mirror',
    problem: 'Self-erases to keep the peace. No stable position under pressure.',
    register: 'Calm and safe first, then direct.',
    pace: 'Slow. Leave silences for them to fill.',
    pressure: 'Gentle at first, then ask for their opinion and hold the silence until they give one.',
    use: 'their own view, being seen, standing their ground',
    avoid: 'leading questions (they will agree with anything), finishing their sentences',
    open: "You're very good at knowing what people want from you. Today I only want to know what you want.",
    watch: 'Will say yes to everything on the call. Get a concrete commitment, not agreement.',
  },
  P: {
    name: 'The Provocateur',
    problem: 'Leads with challenge to stay in control. Wins the point, loses the person.',
    register: 'Blunt, no cushioning.',
    pace: 'Fast. Interrupt them.',
    pressure: "Let them push. Don't defend. Agree with the true part, then turn it.",
    use: 'winning, impact, "being right and still getting the no"',
    avoid: 'arguing back, proving yourself, defending your price',
    open: 'You can win any argument. I want to talk about the ones you won and still lost.',
    watch: "Will challenge your method or your price. Don't defend; ask what they'd do instead.",
  },
  Q: {
    name: 'The Quiet Weight',
    problem: 'Withholds until certain. Silence reads as absence, not authority.',
    register: 'Measured. Few words.',
    pace: 'Slow, with real silences.',
    pressure: 'Low pressure, high precision.',
    use: 'visibility, timing, being noticed earlier',
    avoid: 'filling their silences, hype',
    open: "You don't need to be louder. You need to be noticed earlier. Let's find the exact moment you disappear.",
    watch: 'Short answers. Ask for specific moments, not opinions.',
  },
};

const DIMS = { read: 'Read', frame: 'Frame', pull: 'Pull', presence: 'Presence', voice: 'Voice' };
const AREAS = ['First impressions', 'Being dismissed by someone senior', 'Close relationships', 'How they land', 'Their own voice', 'Negotiation', 'How they are seen', 'Group decisions', 'Attraction', 'Losing an argument', 'Being interrupted', 'Reading people', 'Blind spots', 'What they want'];
const GOALS = { presence: 'rooms that go quiet when they speak', frame: 'people who say yes and follow through', pull: 'to be someone people are drawn to', read: 'never to be read or played again' };

const ASK = {
  read: 'When did you last misjudge someone completely? What did you miss?',
  frame: 'Who in your life can change your mind just by pushing harder? Why them?',
  pull: 'Who do people go to instead of you? What do they have that you don\'t?',
  presence: 'Walk me through the first 60 seconds of that moment. Where were you, and what did you say first?',
  voice: 'Say the first line you said in that moment, out loud, exactly how you said it. (Live voice test.)',
};

const EXPECT = {
  techniques: ['Someone who gives techniques', 'Expects tactics. Give one quick win early, then show it runs deeper than technique.'],
  analyst: ['Someone who analyses them', "Expects to be analysed and will wait passively. Make them do the work; don't do all the talking."],
  truth: ['Someone who tells them the truth', 'Came for hard truths. Softening will cost you authority with them.'],
  curious: ['Not sure, curious', 'Low commitment. Establish the stakes in the first five minutes or it stays a pleasant chat.'],
};
const FOUND = {
  reel: 'Found you through a reel. Has seen the on-screen persona; check whether they expect that version of you.',
  youtube: 'Found you on YouTube. Has likely watched longer content; some trust is already built.',
  ad: 'Came from an ad. Colder. Establish authority in minute one.',
  friend: 'Referral. Trust is borrowed: ask who sent them and what they were told.',
  other: 'Found you elsewhere. Ask where, it tells you what they expect.',
};
const FEEDBACK = {
  straight: 'Asked for the truth straight, even if it stings. Give it to them that way.',
  context: 'Wants it straight, with the reasoning. Show your working.',
  gentle: 'Asked for gentleness, but accepted "straight, including the parts you didn\'t write" on the call plan. Start warm, then hold them to that.',
};
const OBJECTION = {
  alone_fast: ['None expected. Decides alone and quickly.', 'Make the offer clearly, then stop talking.'],
  alone_think: ['"Let me think about it."', 'Ask what exactly they need to think about, answer it on the call, then give a clear decision date.'],
  with_someone: ['"I need to discuss it with someone."', 'Before the offer, ask who else decides and what they will ask. Give them the answer to take home.'],
  proof: ['"How do I know this works?"', 'Show the before and after live, on their own voice or pattern. Proof beats promises.'],
};
const PATTERN_NOTES = [
  [/size me up wrong/i, 'Says people size them up wrong early: a presence and voice problem before it is a content problem.'],
  [/fold or soften/i, 'Folds under pushback, by their own account. Push back once on the call and watch what happens.'],
  [/let me think about it/i, "Can't close others. Expect them to use the same line on you."],
  [/care too much what they think/i, 'Approval-seeking in the moment. They will try to win your approval too; don\'t reward it.'],
  [/over-explain/i, 'Over-justifies their value. They will over-explain on the call: name it live when it happens.'],
  [/mind goes blank/i, 'Freezes under stakes. Raise the stakes slightly on the call and watch for it.'],
];

const LABELS = {
  frequency: { daily: 'Daily', weekly: 'Weekly', high_stakes: 'Only in high-stakes moments', rare_costly: 'Rarely, but it costs a lot' },
  response: { act: 'Listen and act on it', listen: "Listen, but don't act", interrupt: 'Interrupt or talk over them', ignore: 'Forget or ignore what they said' },
  readiness: { ready: "Ready to start now if it's the right fit", options: 'Wants to understand options first', not_now: 'Not in a position to invest right now' },
  start: { week: 'This week', month: 'This month', exploring: 'Just exploring' },
  tried: { therapy: 'Therapy or counselling', coaching: 'Coaching', training: 'Sales or negotiation training', content: 'Books, YouTube, podcasts', course: 'Communication or speaking course', nothing: 'Nothing yet' },
};
const lab = (k, v) => (LABELS[k] && LABELS[k][v]) || v;

const clamp = (n, a = 0, b = 10) => Math.max(a, Math.min(b, n));
const r1 = (n) => Math.round(n * 10) / 10;
const arr = (v) => (Array.isArray(v) ? v : v ? String(v).split(/,\s*/) : []);
const str = (v) => (v == null ? '' : String(v)).trim();
const esc = (s) => str(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const count = (text, re) => (text.match(re) || []).length;
const words = (t) => (str(t).match(/\S+/g) || []).length;
const snip = (t, n = 160) => { t = str(t).replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };

export function buildBrief(b) {
  const T = TYPES[b.type_code] || TYPES.S;
  const T2 = TYPES[b.type2_code] || null;
  const name = str(b.name) || 'Unknown';
  const firstName = name.split(/\s+/)[0];
  const dims = {};
  for (const k of Object.keys(DIMS)) dims[k] = +b['dim_' + k] || 0;
  const byDim = Object.keys(DIMS).sort((x, y) => dims[y] - dims[x]);
  const strong = byDim[0], weak = byDim[byDim.length - 1];

  // ---- language signals in what they wrote ----
  const free = ['situation', 'moment', 'cost', 'win', 'waste', 'doubt', 'notes'].map((k) => str(b[k])).join(' \n ');
  const low = free.toLowerCase();
  const self = count(low, /\b(i|i'm|im|i've|me|my|myself|mine)\b/g);
  const others = count(low, /\b(they|them|their|he|she|him|her|people|others|everyone|boss|manager|clients?|partner)\b/g);
  const hedges = count(low, /\b(maybe|kind of|sort of|i guess|probably|not sure|somehow|a bit|i don't know|idk)\b/g);
  const absolutes = count(low, /\b(always|never|everyone|nobody|no one|every time|nothing works)\b/g);
  const emotion = count(low, /\b(feel|felt|fear|scared|afraid|anxious|nervous|embarrass\w*|ashamed|angry|frustrat\w*|hurt|insecure|small|stupid|humiliat\w*|helpless)\b/g);
  const selfCrit = /(my fault|i'm not good|i am not good|i'm weak|i am weak|i'm stupid|i'm useless|not good enough)/.test(low);
  const blameOut = others >= 3 && others > self;
  const costHasNumber = /\d/.test(str(b.cost));
  const totalWords = words(free);

  // ---- scores ----
  const freq = { daily: 4, weekly: 3.5, high_stakes: 3, rare_costly: 3.5 }[b.frequency] || 2;
  const arenas = arr(b.arenas), patterns = arr(b.patterns), tried = arr(b.tried);
  const costWords = words(b.cost);
  const pain = clamp(freq + Math.min(arenas.length, 4) * 0.6 + Math.min(patterns.length, 4) * 0.5 + (costWords >= 12 ? 2 : costWords >= 5 ? 1 : 0) + (costHasNumber ? 0.5 : 0) + (emotion ? 0.5 : 0));
  const readiness = clamp(({ ready: 6, options: 3.5, not_now: 1 }[b.readiness] || 3) + ({ week: 4, month: 2.5, exploring: 0.5 }[b.start] || 1));
  const amount = +b.amount || 0;
  const paidBefore = tried.some((t) => /coaching|training|course/.test(t));
  const capacity = clamp((amount >= 1499 ? 4 : amount >= 999 ? 3 : 2) + ({ founder: 4, senior: 3.5, sales: 3, coach: 3, salaried: 2.5, other: 2, student: 0.5 }[b.occupation] ?? 2) + (paidBefore ? 2 : 0));
  const consistent = b.consistent === 'yes';
  const changes = +b.changes || 0;
  const coach = clamp(5 + ({ straight: 2, context: 1, gentle: -1 }[b.feedback] || 0) + (blameOut ? -2 : 0) + (selfCrit ? 0.5 : 0) + (consistent ? 1 : -1.5) + ({ truth: 1, analyst: 0.5, techniques: 0, curious: -1 }[b.expect] || 0) + (hedges >= 3 ? -1 : 0) + (changes >= 3 ? -0.5 : 0));
  let pursue = 0.35 * pain + 0.3 * readiness + 0.2 * capacity + 0.15 * coach;
  const caps = [];
  if (b.readiness === 'not_now' && capacity < 5) { pursue = Math.min(pursue, 4.4); caps.push('Says not in a position to invest, and capacity signals agree.'); }
  if (b.occupation === 'student' || b.age === 'Under 21') { pursue = Math.min(pursue, 5.5); caps.push('Student or under 21: capped at nurture.'); }
  pursue = r1(pursue);
  const score10 = Math.round(pursue);
  const verdict = pursue >= 7 ? 'Pursue' : pursue >= 4.5 ? 'Nurture' : 'Pass';
  const vColor = { Pursue: '#1F7A4D', Nurture: '#9A6400', Pass: '#B3261E' }[verdict];

  const why = [
    pain >= 7 ? 'High pain' : pain >= 4 ? 'Real but moderate pain' : 'Low pain',
    capacity >= 7 ? 'money to act' : capacity >= 4.5 ? 'can probably afford it' : 'money is the likely block',
    { week: 'wants to start this week', month: 'wants to start this month', exploring: 'only exploring' }[b.start] || '',
  ].filter(Boolean).join(', ') + '.';

  // ---- the read ----
  const problem = [T.name + ' with weak ' + DIMS[weak] + ' (' + dims[weak] + ').', T.problem];
  for (const [re, note] of PATTERN_NOTES) if (patterns.some((p) => re.test(p))) problem.push(note);
  if (b.response === 'listen') problem.push('Says people listen but don\'t act: authority gap, not a clarity gap.');
  if (b.response === 'interrupt') problem.push('Gets talked over: low vocal and positional weight.');
  if (b.response === 'ignore') problem.push('Gets forgotten: presence problem, not a content problem.');

  const talk = [
    ['Register', T.register], ['Pace', T.pace], ['Pressure', T.pressure],
  ];
  const frameLines = [
    ['Type', T.name + (T2 ? ' · second: ' + T2.name : '')],
    ['Map', byDim.map((k) => DIMS[k] + ' ' + dims[k]).join(' · ')],
    ['Wants in 60 days', GOALS[b.goal] || '—'],
    ['Expects you to be', (EXPECT[b.expect] || ['—'])[0]],
    ['Arrives via', ({ reel: 'Reel', youtube: 'YouTube', ad: 'Ad', friend: 'Referral', other: 'Other' })[b.found] || '—'],
  ];
  const perception = [(EXPECT[b.expect] || [, ''])[1], FOUND[b.found] || '', FEEDBACK[b.feedback] || ''].filter(Boolean);

  const ask = [ASK[weak]];
  if (str(b.moment)) ask.push('You wrote: "' + snip(b.moment, 90) + '" What happened in you right before that?');
  if (b.decide === 'with_someone') ask.push('Who else will have a say in this, and what will they ask you?');
  else if (b.goal && ASK[b.goal] && b.goal !== weak) ask.push(ASK[b.goal]);

  let objection = OBJECTION[b.decide] || OBJECTION.alone_think;
  if (b.readiness === 'not_now') objection = ['Money. Said they are not in a position to invest.', 'Don\'t discount. Ask what this is costing them now' + (str(b.cost) ? ' (they wrote: "' + snip(b.cost, 80) + '")' : '') + ', then let the numbers sit.'];

  const signals = [];
  if (blameOut) signals.push('Locates the problem in other people (' + others + ' references to others, ' + self + ' to self). Expect resistance to owning the pattern.');
  else if (self >= 3) signals.push('Owns the problem in their own words (' + self + ' self-references).');
  if (selfCrit) signals.push('Self-critical language. Firm, not harsh.');
  if (hedges >= 3) signals.push('Hedges a lot (' + hedges + ' hedging words). Ask for specifics every time.');
  if (absolutes >= 2) signals.push('Absolute language ("always", "never"). The pattern feels permanent to them; show it isn\'t.');
  if (emotion) signals.push('Names feelings openly (' + emotion + ' emotion words). Emotional access is available.');
  else signals.push('No feeling words anywhere. They describe events, not experience.');
  if (totalWords < 40) signals.push('Wrote very little (' + totalWords + ' words in total). Guarded, or low investment.');
  else if (totalWords > 250) signals.push('Wrote a lot (' + totalWords + ' words). Invested, and wants to be understood.');
  signals.push(consistent
    ? 'Consistent: answered both pressure questions the same way.'
    : 'Inconsistent under pressure: "' + str(b.q2) + '" vs "' + str(b.q11) + '". Self-image and behaviour differ. Probe with a real example.');
  const avg = +b.avg_secs || 0;
  if (avg && avg < 1.5) signals.push('Answered faster than anyone can read the situations (about ' + avg + 's each). Treat the profile as unreliable; trust the written answers.');
  else if (avg && avg < 4) signals.push('Answered on instinct (about ' + avg + 's per situation). The profile is probably honest.');
  else if (avg > 12) signals.push('Deliberated (about ' + avg + 's per situation). The profile may describe who they want to be; trust the written answers more.');
  if (changes >= 2) signals.push('Changed answers ' + changes + ' times. Managing how they come across.');
  let slow = -1, slowS = 0;
  for (let i = 1; i <= 14; i++) { const s = +b['q' + i + '_secs'] || 0; if (s > slowS) { slowS = s; slow = i; } }
  if (slow > 0 && slowS >= 8) signals.push('Hesitated longest on "' + AREAS[slow - 1] + '" (' + r1(slowS) + 's, chose: "' + str(b['q' + slow]) + '"). Often the sore spot.');

  const scores = [['Pain', pain], ['Readiness', readiness], ['Capacity', capacity], ['Coachability', coach]];
  const meta = [str(b.role) || ({ founder: 'Founder', senior: 'Senior executive', salaried: 'Salaried', sales: 'Sales', coach: 'Coach / consultant', student: 'Student', other: 'Other' }[b.occupation] || ''), str(b.age), str(b.city), amount ? 'paid ₹' + amount : '', b.total_mins ? 'profile in ' + b.total_mins + ' min' : ''].filter(Boolean).join(' · ');
  const subject = '[Brief] ' + name + ' · ' + verdict + ' ' + score10 + '/10 · ' + T.name;

  // ---- all answers, for reference ----
  const label = (k, v) => [k, Array.isArray(v) ? v.join(', ') : str(v)];
  const answers = [
    label('WhatsApp', b.whatsapp), label('Email', b.email),
    label('Situation', b.situation), label('In the moment', b.moment), label('How often', lab('frequency', b.frequency)), label('Familiar patterns', patterns),
    label('People usually', lab('response', b.response)), label('Costs them in', arenas), label('What it costs', b.cost), label('Already tried', tried.map((t) => lab('tried', t))),
    label('Perfect outcome', b.win), label('If it needs structured work', lab('readiness', b.readiness)), label('Starts', lab('start', b.start)),
    label('Would waste their time', b.waste), label('Doubt', b.doubt), label('Notes', b.notes),
  ].concat(Array.from({ length: 14 }, (_, i) => ['S' + (i + 1) + ' ' + AREAS[i], str(b['q' + (i + 1)])])).filter((x) => x[1]);

  // ---- HTML email (inline styles for Gmail) ----
  const F = "font-family:Helvetica,Arial,sans-serif;";
  const H = (t) => `<div style="${F}font-size:13px;color:#4B4B57;margin:0 0 6px">${esc(t)}</div>`;
  const sec = (title, inner) => `<div style="border-top:1px solid #DCDDE1;padding:18px 0 4px"><div style="font-family:Georgia,serif;font-size:19px;color:#14141F;margin:0 0 10px">${esc(title)}</div>${inner}</div>`;
  const p = (t, extra = '') => `<p style="${F}font-size:15px;line-height:1.55;color:#14141F;margin:0 0 8px;${extra}">${t}</p>`;
  const list = (items) => `<ul style="${F}font-size:15px;line-height:1.55;color:#14141F;margin:0 0 8px;padding-left:20px">${items.map((i) => `<li style="margin:0 0 6px">${esc(i)}</li>`).join('')}</ul>`;
  const kv = (rows) => `<table role="presentation" style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="${F}font-size:13px;color:#4B4B57;padding:4px 12px 4px 0;vertical-align:top;width:150px">${esc(k)}</td><td style="${F}font-size:15px;color:#14141F;padding:4px 0;vertical-align:top">${esc(v)}</td></tr>`).join('')}</table>`;
  const bar = (n) => `<span style="display:inline-block;width:120px;height:6px;background:#EEF0F2;vertical-align:middle"><span style="display:block;height:6px;width:${Math.round(n * 10)}%;background:#010066"></span></span>`;

  const html = `<div style="background:#EEF0F2;padding:20px 0"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #DCDDE1;padding:28px">
<div style="${F}font-size:20px;font-weight:bold;color:#14141F;margin:0 0 4px">${esc(name)}</div>
<div style="${F}font-size:13px;color:#4B4B57;margin:0 0 18px">${esc(meta)}</div>
<table role="presentation" style="border-collapse:collapse;width:100%;margin:0 0 14px"><tr>
<td style="vertical-align:top;width:45%">${H('Verdict')}<div style="font-family:Georgia,serif;font-size:32px;color:${vColor};line-height:1.1">${verdict} · ${pursue}</div><div style="${F}font-size:14px;color:#4B4B57;margin-top:6px">${esc(why)}</div></td>
<td style="vertical-align:top">${scores.map(([k, v]) => `<div style="${F}font-size:14px;color:#14141F;margin:0 0 6px"><span style="display:inline-block;width:100px">${k}</span>${bar(v)} <b>${r1(v)}</b></div>`).join('')}</td>
</tr></table>
${caps.length ? p(esc(caps.join(' ')), 'color:#9A6400') : ''}
${sec('In their words', p('"' + esc(snip(b.situation, 400)) + '"') + (str(b.moment) ? p('In the moment: "' + esc(snip(b.moment, 260)) + '"', 'color:#4B4B57') : ''))}
${sec('The real problem (to test)', list(problem))}
${sec('Their frame, and how they see you', kv(frameLines) + list(perception))}
${sec('How to talk to ' + firstName, kv(talk) + kv([['Use', T.use], ['Avoid', T.avoid], ['Watch for', T.watch]]))}
${sec('Open with', `<div style="${F}font-size:16px;line-height:1.55;color:#14141F;background:#EEF0F2;padding:14px 16px">"${esc(T.open)}"</div>`)}
${sec('Ask these', list(ask))}
${sec('Likely objection', p('<b>' + esc(objection[0]) + '</b> ' + esc(objection[1])) + (str(b.doubt) ? p('Their doubt about you: "' + esc(snip(b.doubt, 240)) + '" Address it in the first ten minutes, before they raise it.') : ''))}
${str(b.waste) ? sec('This would waste their time', p('"' + esc(snip(b.waste, 260)) + '"')) : ''}
${sec('Signals', list(signals))}
${sec('All answers', kv(answers))}
<div style="${F}font-size:12px;color:#4B4B57;border-top:1px solid #DCDDE1;padding-top:12px;margin-top:12px">Influence Profile · go.isfcm.com/go/profile · scores are a reading to test on the call, not a verdict on the person.</div>
</div></div>`;

  const text = [
    subject, meta, '',
    'VERDICT: ' + verdict + ' ' + pursue + ' — ' + why,
    scores.map(([k, v]) => k + ' ' + r1(v)).join(' · '), caps.join(' '), '',
    'IN THEIR WORDS: ' + snip(b.situation, 400), '',
    'REAL PROBLEM: ' + problem.join(' '), '',
    'FRAME: ' + frameLines.map(([k, v]) => k + ': ' + v).join(' | '), perception.join(' '), '',
    'HOW TO TALK: ' + talk.map(([k, v]) => k + ': ' + v).join(' | '), 'Use: ' + T.use, 'Avoid: ' + T.avoid, 'Watch for: ' + T.watch, '',
    'OPEN WITH: "' + T.open + '"', '',
    'ASK: ' + ask.join(' / '), '',
    'OBJECTION: ' + objection.join(' '), str(b.doubt) ? 'DOUBT: ' + b.doubt : '', str(b.waste) ? 'WASTE: ' + b.waste : '', '',
    'SIGNALS: ' + signals.join(' '),
  ].filter((x) => x !== undefined).join('\n');

  return {
    subject, html, text,
    columns: { verdict, pursue, pain: r1(pain), readiness_score: r1(readiness), capacity: r1(capacity), coachability: r1(coach) },
  };
}
