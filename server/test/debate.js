// Plays whole debates against the backend, using the same rules the app uses:
// union of criteria, concede at 3 (a separate call with conceded:true), final plea on turn 7.
// Handy for tuning Sprout and rehearsing the demo.
//   node test/debate.js                          → local server
//   node test/debate.js https://your-app.vercel.app
const BASE = process.argv[2] || 'http://localhost:3001';
const CONCEDE_AT = 3;
const FINAL_PLEA_TURN = 7;

const SCENARIOS = [
  {
    title: 'Hoodie — vague excuses (Sprout should win)',
    item: { name: 'Grey pullover hoodie', category: 'clothing', price: 60, essential: false },
    opening: 'NO. Absolutely not. Put the phone down.',
    extra: { hoursOfWork: 3, savingsGoal: 'Trip to Montreal', goalAmount: 500 },
    lines: [
      "I'll use it a lot, I need it",
      "But it's on sale!",
      'I deserve a treat, it was a rough week',
      "It's worth it, trust me",
      'Everyone has one',
      'Come on, it is really cozy',
      "I just want it, okay?",
    ],
  },
  {
    title: 'Laptop charger — specific reasons (user should win)',
    item: { name: 'Replacement laptop charger', category: 'electronics', price: 45, essential: false },
    opening: 'A CHARGER? Absolutely not. What happened to the one you have?!',
    extra: {},
    lines: [
      "My charger's cable split near the plug and it won't charge anymore",
      'I use my laptop for every lecture and for my job, six days a week',
      'I checked refurbished ones online but none fit my model, and my roommate uses a different brand',
    ],
  },
];

async function chat(body) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.error}`);
  return json;
}

for (const s of SCENARIOS) {
  console.log(`\n=== ${s.title} ===\nSPROUT: ${s.opening}`);
  const messages = [{ role: 'sprout', text: s.opening }];
  const met = new Set();
  const base = { item: s.item, totalSaved: 0, history: [], resumed: false, ...s.extra };

  for (let turn = 1; turn <= s.lines.length; turn++) {
    messages.push({ role: 'user', text: s.lines[turn - 1] });
    const finalPlea = turn === FINAL_PLEA_TURN;
    const t = Date.now();
    const r = await chat({ ...base, messages, criteriaMet: [...met], turn, conceded: false, finalPlea });
    r.criteriaHit.forEach((h) => met.add(h.id));
    messages.push({ role: 'sprout', text: r.reply });
    console.log(`\nUSER (turn ${turn}): ${s.lines[turn - 1]}`);
    console.log(`SPROUT: ${r.reply}   [${((Date.now() - t) / 1000).toFixed(1)}s]`);
    console.log(`  hits: ${JSON.stringify(r.criteriaHit)}  → met so far: ${met.size}`);
    console.log(`  chips: ${r.suggestedReplies.join(' | ')}`);

    // The CODE decides: crossing the threshold triggers one concession call.
    if (met.size >= CONCEDE_AT) {
      const c = await chat({ ...base, messages, criteriaMet: [...met], turn, conceded: true, finalPlea: false });
      console.log(`\nSPROUT CONCEDES: ${c.reply}`);
      console.log(`  alternatives: ${JSON.stringify(c.alternatives)}`);
      break;
    }
    if (finalPlea) {
      console.log('\n(final plea delivered — the app now disables the input)');
      break;
    }
  }
}

// Resuming a debate the user walked away from.
const resumed = await chat({
  item: SCENARIOS[0].item,
  messages: [
    { role: 'sprout', text: SCENARIOS[0].opening },
    { role: 'user', text: "I'll use it a lot, I need it" },
    { role: 'sprout', text: "'A lot'? Define 'a lot'." },
  ],
  criteriaMet: [], turn: 1, totalSaved: 0, history: [], conceded: false, finalPlea: false, resumed: true,
});
console.log(`\n=== Resumed hoodie debate ===\nSPROUT: ${resumed.reply}\n  hits: ${JSON.stringify(resumed.criteriaHit)}`);
