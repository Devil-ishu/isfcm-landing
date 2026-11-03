/* Influence Profile: question bank and result content.
   Each option scores the six types (t), moves the five dimensions (d),
   and leans on two axes: hx (+1 head / -1 heart) and px (+1 push / -1 pull).
   Q2 and Q11 are a consistency pair: same pressure, asked two ways (key k).
   Type codes: C Commander, M Magnet, S Strategist, R Mirror, P Provocateur, Q Quiet Weight. */
window.PROFILE_DATA = {
  dims: [
    { id: 'read', name: 'Read' },
    { id: 'frame', name: 'Frame' },
    { id: 'pull', name: 'Pull' },
    { id: 'presence', name: 'Presence' },
    { id: 'voice', name: 'Voice' }
  ],

  questions: [
    { area: 'First impressions', text: "You walk into a room full of people you don't know. What do you do in the first five minutes?", opts: [
      { l: 'Find the most important person and introduce myself', t: { C: 2, P: 1 }, d: { presence: 2, frame: 1 }, hx: 1, px: 1 },
      { l: 'Get a drink and watch who talks to whom', t: { S: 2, Q: 1 }, d: { read: 2, presence: -1 }, hx: 1, px: -1 },
      { l: 'Join the liveliest group and make them laugh', t: { M: 2, P: 1 }, d: { pull: 2, presence: 1, voice: 1 }, hx: -1, px: 1 },
      { l: 'Wait for someone to come to me', t: { Q: 2, R: 1 }, d: { presence: -2, read: 1 }, hx: 0, px: -1 }
    ]},
    { area: 'Influence under pressure', text: 'In a meeting, someone senior dismisses your idea in one sentence. The room goes quiet.', sub: 'What do you actually do? Not what you should do.', opts: [
      { l: 'Push back on the spot, calmly but firmly', k: 'hold', t: { C: 2, Q: 1 }, d: { frame: 2, presence: 1, voice: 1 }, hx: 1, px: 1 },
      { l: 'Let it go now, send a sharper version by email later', k: 'withdraw', t: { S: 2 }, d: { read: 1, presence: -2, voice: -1 }, hx: 1, px: -1 },
      { l: 'Ask them a question that makes them defend their view', k: 'counter', t: { P: 2, S: 1 }, d: { frame: 2, read: 1, pull: -1 }, hx: 1, px: 1 },
      { l: 'Laugh it off, win them over after the meeting', k: 'appease', t: { M: 2, R: 1 }, d: { pull: 2, frame: -1 }, hx: -1, px: -1 }
    ]},
    { area: 'Close relationships', text: "A friend tells you, in confidence, that they're about to make a big mistake. What do you say?", opts: [
      { l: '"Don\'t. Here\'s why." And I lay it out', t: { C: 2, S: 1 }, d: { frame: 1, voice: 1, pull: -1 }, hx: 1, px: 1 },
      { l: 'I ask questions until they see it themselves', t: { S: 2, R: 1 }, d: { read: 2, frame: 1 }, hx: 1, px: -1 },
      { l: "I tell them I'm with them, whatever they decide", t: { R: 2, M: 1 }, d: { pull: 2, frame: -2 }, hx: -1, px: -1 },
      { l: 'I tell them straight, even if they get angry', t: { P: 2, C: 1 }, d: { frame: 2, pull: -1, presence: 1 }, hx: -1, px: 1 }
    ]},
    { area: 'How you land', text: "When you're explaining something important, people usually…", opts: [
      { l: 'Go quiet and pay full attention', t: { Q: 2, C: 1 }, d: { presence: 2, voice: 1 }, hx: 1, px: 1 },
      { l: 'Nod, then ask me to send it in writing', t: { S: 2 }, d: { voice: -2, presence: -1 }, hx: 1, px: -1 },
      { l: 'Smile and get into it with me', t: { M: 2 }, d: { pull: 2, voice: 1 }, hx: -1, px: 1 },
      { l: 'Start debating me', t: { P: 2 }, d: { frame: 1, pull: -1, presence: 1 }, hx: 1, px: 1 }
    ]},
    { area: 'Your voice', text: 'You hear your own voice in a recording. Your honest reaction?', opts: [
      { l: 'It sounds like someone people should listen to', t: { C: 2, Q: 1 }, d: { voice: 3 }, hx: 1, px: 1 },
      { l: 'Faster and higher than I thought', t: { R: 2, S: 1 }, d: { voice: -2 }, hx: -1, px: -1 },
      { l: "Fine, but it doesn't sound like how I feel inside", t: { S: 2, Q: 1 }, d: { voice: -1, read: 1 }, hx: 1, px: -1 },
      { l: 'Energetic. Maybe too much', t: { P: 2, M: 1 }, d: { voice: 1, presence: 1, pull: 1 }, hx: -1, px: 1 }
    ]},
    { area: 'Negotiation', text: 'You\'re negotiating. They say: "That\'s our final number."', opts: [
      { l: 'I stay silent and let them fill the gap', t: { Q: 2, S: 1 }, d: { frame: 2, presence: 1 }, hx: 1, px: -1 },
      { l: 'I call it: "We both know it isn\'t."', t: { P: 2, C: 1 }, d: { frame: 2, voice: 1, pull: -1 }, hx: 1, px: 1 },
      { l: 'I find out what they actually need and trade for it', t: { S: 2, R: 1 }, d: { read: 2 }, hx: 1, px: -1 },
      { l: 'I accept, if the relationship matters more', t: { R: 2, M: 1 }, d: { pull: 1, frame: -2 }, hx: -1, px: -1 }
    ]},
    { area: 'How you are seen', text: 'People who meet you for the first time usually think you are…', opts: [
      { l: 'Intimidating', t: { C: 2, Q: 1 }, d: { presence: 2, pull: -1 }, hx: 1, px: 1 },
      { l: 'Approachable, easy to talk to', t: { R: 2, M: 1 }, d: { pull: 2, presence: -1 }, hx: -1, px: -1 },
      { l: 'Sharp, maybe a bit distant', t: { S: 2, Q: 1 }, d: { read: 1, pull: -1 }, hx: 1, px: -1 },
      { l: 'Charming and fun', t: { M: 2 }, d: { pull: 2, voice: 1 }, hx: -1, px: 1 }
    ]},
    { area: 'Group decisions', text: "A group decision is stuck. Everyone's talking in circles.", opts: [
      { l: 'I make the call and own it', t: { C: 2 }, d: { presence: 2, frame: 1 }, hx: 1, px: 1 },
      { l: 'I sum up where everyone stands and propose a middle path', t: { S: 2, R: 1 }, d: { read: 2, pull: 1 }, hx: 1, px: -1 },
      { l: "I say what nobody wants to say", t: { P: 2 }, d: { frame: 2, pull: -1, presence: 1 }, hx: -1, px: 1 },
      { l: 'I wait. Someone usually gets there', t: { Q: 2, R: 1 }, d: { presence: -2, read: 1 }, hx: 1, px: -1 }
    ]},
    { area: 'Attraction', text: 'Someone you want to impress is losing interest halfway through a conversation.', opts: [
      { l: "I switch to a topic I'm impressive in", t: { C: 2, M: 1 }, d: { presence: 1, frame: -1 }, hx: -1, px: 1 },
      { l: 'I notice it, and slow down instead of speeding up', t: { Q: 2, S: 1 }, d: { frame: 2, voice: 1, read: 1 }, hx: 1, px: -1 },
      { l: 'I ask about them and actually listen', t: { R: 2, M: 1 }, d: { pull: 2, read: 1 }, hx: -1, px: -1 },
      { l: 'I tease them a little', t: { M: 2, P: 1 }, d: { pull: 2, frame: 1 }, hx: -1, px: 1 }
    ]},
    { area: 'Losing', text: 'The last time you lost an argument you knew you were right about, what happened?', opts: [
      { l: 'The other person was louder', t: { S: 2, Q: 1 }, d: { voice: -2, presence: -1 }, hx: 1, px: -1 },
      { l: 'I got emotional and lost the thread', t: { M: 1, R: 2 }, d: { frame: -2, voice: -1 }, hx: -1, px: 1 },
      { l: 'I gave in to keep the peace', t: { R: 2 }, d: { frame: -2, pull: 1 }, hx: -1, px: -1 },
      { l: 'I rarely lose those', t: { P: 2, C: 1 }, d: { frame: 2, presence: 1, read: -1 }, hx: 1, px: 1 }
    ]},
    { area: 'Being interrupted', text: 'In a meeting, someone talks over you halfway through your sentence.', opts: [
      { l: 'Keep talking at the same volume until they stop', k: 'hold', t: { C: 2, Q: 1 }, d: { frame: 2, voice: 2 }, hx: 1, px: 1 },
      { l: 'Stop, and make my point later in writing', k: 'withdraw', t: { S: 2 }, d: { voice: -2, presence: -1 }, hx: 1, px: -1 },
      { l: '"Let me finish. Then I want your view."', k: 'counter', t: { P: 2, S: 1 }, d: { frame: 2, read: 1 }, hx: 1, px: 1 },
      { l: 'Let them go ahead, and smile', k: 'appease', t: { R: 2, M: 1 }, d: { pull: 1, frame: -2 }, hx: -1, px: -1 }
    ]},
    { area: 'Reading people', text: 'Someone you just met tells you their life story in ten minutes. Why?', opts: [
      { l: 'I asked the right questions', t: { S: 2, R: 1 }, d: { read: 2 }, hx: 1, px: -1 },
      { l: 'People just open up to me', t: { M: 2, R: 1 }, d: { pull: 3 }, hx: -1, px: -1 },
      { l: "That doesn't happen to me", t: { C: 2, P: 1 }, d: { pull: -2, presence: 1 }, hx: 1, px: 1 },
      { l: 'I stay quiet. Silence makes people talk', t: { Q: 2 }, d: { read: 1, frame: 1, presence: 1 }, hx: 1, px: -1 }
    ]},
    { area: 'Blind spots', text: 'What do people most often get wrong about you?', opts: [
      { l: "They think I'm cold. I'm not", t: { Q: 2, C: 1 }, d: { pull: -1, presence: 1 }, hx: 1, px: -1 },
      { l: "They think I'm soft. I'm not", t: { R: 2, M: 1 }, d: { frame: -1, pull: 1 }, hx: -1, px: -1 },
      { l: "They think I'm arrogant. I'm just sure", t: { P: 2, C: 1 }, d: { presence: 1, frame: 1, pull: -1 }, hx: 1, px: 1 },
      { l: "They don't take me seriously at first", t: { M: 2, S: 1 }, d: { voice: -1, presence: -1, pull: 1 }, hx: -1, px: 1 }
    ]},
    { area: 'What you want', text: 'If you could win one thing in the next 60 days, it would be…', opts: [
      { l: 'Rooms that go quiet when I speak', g: 'presence', t: { C: 1, Q: 1 }, d: {}, hx: 0, px: 0 },
      { l: 'People who say yes and actually follow through', g: 'frame', t: { S: 1, C: 1 }, d: {}, hx: 0, px: 0 },
      { l: 'Being someone people are drawn to', g: 'pull', t: { M: 1, R: 1 }, d: {}, hx: 0, px: 0 },
      { l: 'Never being read or played by anyone again', g: 'read', t: { P: 1, S: 1 }, d: {}, hx: 0, px: 0 }
    ]}
  ],

  // Shown after question 7, chosen by the two axes.
  pulse: {
    'head-pull': 'You read a room faster than most people in it. Then you wait too long to move.',
    'head-push': 'You decide fast and expect the room to follow your logic. It often doesn\'t.',
    'heart-pull': 'People open up to you easily. Getting them to act on what you say is harder.',
    'heart-push': 'You move people with energy. The question is whether it lasts after you leave.'
  },

  goals: {
    presence: { text: 'rooms that go quiet when you speak', dims: ['presence', 'voice'] },
    frame: { text: 'people who say yes and follow through', dims: ['frame'] },
    pull: { text: 'to be someone people are drawn to', dims: ['pull'] },
    read: { text: 'never to be read or played again', dims: ['read'] }
  },

  dimNotes: {
    read: ['You focus on your point more than on who is hearing it.', 'You catch the obvious signals and miss the quiet ones.', 'You see the room before anyone speaks.'],
    frame: ['Your position bends to whoever pushes last.', 'You hold your ground, until someone pushes hard.', 'Your position holds when it is tested.'],
    pull: ['Respected, but people keep their distance.', 'Liked, not yet sought out.', 'People are drawn to you without effort.'],
    presence: ['You enter quietly and stay quiet too long.', 'Noticed once you speak, not before.', 'You take space the moment you walk in.'],
    voice: ['Your weakest signal, and the fastest one to fix.', "Clear, but it doesn't command.", 'People listen to how you sound, not only what you say.']
  },

  types: {
    C: {
      name: 'The Commander',
      tag: 'People move when you speak. Not always because they agree.',
      hero: 'You take space and hold it. Rooms organise themselves around you. The cost: people comply in front of you and do their own thing once you leave.',
      leak: 'You win the room and lose the person.',
      leakBody: "You close the discussion before others feel heard. They agree to end the pressure, not because they're convinced, so the yes doesn't survive the meeting.",
      drill: 'The two-question close',
      steps: ['Before you give your decision, ask: "What would make this fail?"', 'Repeat their answer back in one sentence, in their words.', 'Then decide. Your call stays the same; their commitment comes with it.'],
      drillNote: 'Do it in every meeting where you would normally just decide. Seven days.',
      deeper: "What you trigger in people before you've said a word, and why some of them quietly resist you."
    },
    M: {
      name: 'The Magnet',
      tag: "People like you instantly. That's the problem.",
      hero: 'Warmth and energy are your currency. People want to be around you. The cost: they enjoy you, then take their serious decisions to someone else.',
      leak: 'Your likeability is doing the job your authority should.',
      leakBody: "You soften every hard point with a smile or a joke, so people hear it as optional. You're remembered as good company, not as the one who decided.",
      drill: 'The flat statement',
      steps: ['Once a day, say one important thing with no smile, no joke and no "just".', 'Say it at the bottom of your voice, slower than feels natural.', 'Hold eye contact for two seconds after you finish. Don\'t fill the silence.'],
      drillNote: 'It will feel cold to you. It will sound serious to them.',
      deeper: 'Why you need the room to like you first, and what that costs you in the moments that matter most.'
    },
    S: {
      name: 'The Strategist',
      tag: "You're usually right. Rooms rarely notice in time.",
      hero: 'You win on substance. You lose on timing. People respect your thinking and still follow the louder person in the room.',
      leak: "You give the conclusion before you've taken the room.",
      leakBody: 'Your first sentence arrives fast and rises at the end. To a listener that sounds like a suggestion, so your best idea gets weighed as an opinion.',
      drill: 'The three-second open',
      steps: ['Before your first sentence, hold eye contact and count three.', 'Say the point in one line. Drop your pitch on the last word.', 'Stop. Let the silence do the selling.'],
      drillNote: 'Do it in every meeting for seven days. Notice who looks at you differently.',
      deeper: 'Why you hesitate in the first place, and what your voice gives away when you do. That needs a person listening, not a questionnaire.'
    },
    R: {
      name: 'The Mirror',
      tag: 'You read everyone. Nobody reads you.',
      hero: 'You sense what people need before they say it, and you adjust. People feel understood around you. The cost: you adjust so well that your own position disappears.',
      leak: "You agree before you've decided whether you agree.",
      leakBody: "You match the other person's view and energy to keep things smooth. It works in the moment, and it teaches people that your yes is free and your opinion is negotiable.",
      drill: 'The one-breath delay',
      steps: ['When someone asks your view, take one full breath before you answer.', 'Start with "I think". Never "Maybe" or "I could be wrong, but".', 'Once a day, disagree with something small, out loud, and don\'t explain why.'],
      drillNote: 'Notice who respects you more for it.',
      deeper: 'Where the urge to keep everyone comfortable comes from, and how to keep your reading skill without losing yourself in it.'
    },
    P: {
      name: 'The Provocateur',
      tag: 'You win arguments. Sometimes you lose the room doing it.',
      hero: 'You say what others avoid, and you hold your ground under pressure. People remember you. The cost: they also brace when you speak, and people who are bracing don\'t get persuaded.',
      leak: 'You make people defend themselves instead of considering your point.',
      leakBody: "You lead with the challenge. The other person's ego goes up before their mind opens, so even when you're right, agreeing with you feels like losing.",
      drill: 'Agree first',
      steps: ["Before you challenge anyone, say what's right about their view, in one sentence.", 'Then ask instead of telling: "What happens if…?"', "Let them reach the conclusion. Don't take credit for it."],
      drillNote: 'Same point, half the resistance.',
      deeper: "What you're actually fighting when you push, and how to turn that force into pull."
    },
    Q: {
      name: 'The Quiet Weight',
      tag: "You don't compete for attention. Sometimes you need to.",
      hero: "You're calm, contained and hard to rattle. People who know you trust you completely. The cost: people who don't know you yet don't notice you until the decision is made.",
      leak: 'Your stillness reads as absence, not authority.',
      leakBody: 'Silence only works once people know you have something to say. Before that, your calm gets mistaken for agreement, or for not caring.',
      drill: 'Speak in the first five minutes',
      steps: ['In every meeting, say something in the first five minutes, even if it\'s a question.', 'Name one person and build on their point: "Riya\'s right, and here\'s what it means."', 'Then go back to your stillness. Now it carries weight.'],
      drillNote: 'Early words buy you the right to silence later.',
      deeper: 'What holds you back from taking space when you clearly have something to say.'
    }
  }
};
