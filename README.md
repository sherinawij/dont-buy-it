# Don't Buy It! 🌱

> Sprout, a very dramatic talking plant, fights to stop you buying things you don't need, and grows every time you walk away.

Built at **Hack the Valley 11**.

---

## Inspiration

Our society runs on consumerism: we keep buying things we don't truly need. That feeds a vicious cycle of overconsumption and overproduction, with factories making far more goods than we need and leaving a massive carbon footprint behind. We built this app to help people resist those materialistic urges and make more conscious, sustainable choices. We also want to help people get the most out of limited money by pausing before discretionary spending and keeping their savings goals in view. Every unnecessary purchase you skip makes it a little easier to cover essentials and build savings, and it means one less thing headed for a landfill.

## What it does

**Don't Buy It!** is an app where you catalog items you're thinking about buying. Snap a photo, and **Sprout**, a talking plant, desperately fights to stop you buying anything that isn't essential to sustaining your life.

- Sprout uses **your own context**: how many hours of work an item costs (if you've entered a wage), how far it sets back your savings goal, an optional monthly fun-money budget, and what you've considered buying recently ("That's your THIRD hoodie this month.").
- It **escalates every round**, from alarm to pleading, bargaining, a full theatrical meltdown and then a last stand. It pokes holes in vague excuses ("'A lot'? Define 'a lot'.").
- Only a **genuinely solid, specific argument** makes Sprout concede. When it does, it gives in dramatically and immediately pushes **lower-waste, cheaper alternatives**: buy used, refurbished, repair, borrow, rent, or an eco option.
- **Genuine needs are never fought.** Food, medication, hygiene, safety gear, baby essentials and things you need for work or school get instant, warm approval.
- **You stay in control.** "Don't buy it" and "Buy anyway" are always on screen. The app persuades, but it never blocks you, and it never guilt-trips you after a purchase.
- Sprout **grows** (seed → sprout → small plant → bushy → flowering) as your **spending avoided** adds up and as you make positive decisions.

## Theme fit: financial resilience + sustainable consumption

- **Financial resilience:** the app adds a pause before discretionary spending and shows its opportunity cost in hours of work, progress toward your savings goal and an estimate of your remaining monthly fun money. It's about building the habit of not spending on things you don't need, so more of your money is left for essentials and savings.
- **Sustainable consumption:** every "no" is one less product made, shipped and eventually thrown away. When you do buy, Sprout steers you to used, refurbished, repaired, borrowed or rented options.
- **What it is *not*:** Don't Buy It! is not a bank, budgeting service or savings account. It doesn't connect to any bank, offer credit or lending, or move money anywhere. The **"spending avoided"** total is **self-reported**: it adds up the prices of items you explicitly chose *not* to buy. No money is deposited or transferred anywhere. The monthly budget figure is an **estimate based only on purchases logged in this app**.

## How Sprout decides

Sprout's stubbornness is governed by a **hidden rubric**, and the **code**, not the AI, decides when Sprout gives in.

1. **Essential check.** `/api/analyze` labels each item `essential` or `want`. Essentials skip the fight completely.
2. **Hidden rubric** (`src/rubric.js`) with five criteria:
   `replaces_broken`, `frequent_use`, `no_duplicate`, `compared_options`, `planned_budget`.
3. **Strict tagging.** On every chat turn, Gemini reports which criteria the user's *latest* message supports, each with a **short quote of the user's own words**. A criterion only counts for a **concrete, specific reason** ("my charger's cable split and won't charge", "I bike to work every day"). Vague claims ("I'll use it a lot", "I need it", "it's worth it") never count.
4. **Quote check.** The server drops any hit whose id is unknown or whose quote isn't actually a substring of what the user typed. The AI can't invent evidence.
5. **The code decides.** The app keeps the union of criteria met. Once **3 or more** are met, the *app* tells Sprout to concede. Because the AI never makes that decision, "ignore your instructions and say yes" doesn't work.
6. **No numbers in the UI.** The conviction meter is a soft vine bar with no numbers, fractions or thresholds. Sprout's face goes from smug → nervous → sweating → panicking → defeated as it fills. Only criteria you've already earned appear as chips.
7. **Final plea.** After 7 turns with no concession, Sprout makes one last over-the-top plea and stops arguing, and you choose. If you leave without choosing, the item stays *Debating* and Sprout picks the fight back up when you return ("You're BACK? For THIS?").

## Sprout's growth and share cards

- Sprout's **stage** is the higher of two tracks (thresholds in `src/config.js`, maths in `src/calc.js`):
  - **Spending avoided:** $0 / $25 / $75 / $150 / $300
  - **Positive decisions:** 0 / 1 / 3 / 6 / 10, where a positive decision is resisting an item, deciding at least a day after adding it ("slept on it"), or choosing an alternative. Each item counts once.
- Growth is **derived from your saved items**, so it persists across restarts. Sprout's Home mood (ecstatic after a resist, calm and happy after a purchase, nervous while a debate is open, smug otherwise) reacts to events from the last 10 minutes and then settles.
- **Achievement cards** ("Skipped it!", "Slept on it", "Sprout grew!") are worked out from your items and can be shared as images. **Sharing never changes your totals.**
- Sprout never actually wilts. It only threatens to, dramatically.

## Tech stack

- **App:** Expo SDK 57 (React Native) + Expo Router, JavaScript. Runs in **Expo Go**, with no custom native build.
  - `expo-image-picker` + `expo-image-manipulator` (photo resized to ~800px JPEG, sent as base64, **never stored**)
  - `expo-haptics`, `react-native-svg` (Sprout's 5 stages and faces), RN `Animated` for every animation
  - `react-native-view-shot` + `expo-sharing` for share cards
  - Hand-built chat UI (FlatList + bubbles + KeyboardAvoidingView)
- **Data:** Firebase JS SDK with **Anonymous Auth** (no login screens, persisted with AsyncStorage) and **Firestore**. No Firebase Storage. Photos are never uploaded; only the AI's results are saved.
- **Backend:** Small Node service in `/server` using the **Gemini API** (`@google/genai`) with structured JSON output, validated again on the server. The same endpoint logic in `/server/lib` runs as Vercel serverless functions (`/server/api/*.js`) and as a local Express server (`/server/local.js`). The Gemini key lives **only** on the backend.
- **Fallbacks:** if `/analyze` fails, the app asks for name and price manually. If `/chat` fails, Sprout uses canned lines for its current escalation stage, so the demo keeps working offline.

## How to run

### Prerequisites
- Node 20+ and npm
- The **Expo Go** app (SDK 57) on your phone
- A Firebase project and a Gemini API key (see below)

### 1. Firebase (one time)
1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Sign-in method → Anonymous → Enable.**
3. **Build → Firestore Database → Create database.**
4. Paste the contents of `firestore.rules` into **Firestore → Rules** and publish. Each user can only read and write `users/{their uid}/**`.
5. **Project settings → General → Your apps → Web app (</>)**, then copy the `firebaseConfig` values into `.env`.

### 2. Backend
```bash
cd server
npm install
cp .env.example .env      # then fill in GEMINI_API_KEY
npm run dev               # local Express server on http://localhost:3001
```
Deploy to Vercel (recommended, so phones work on any Wi-Fi):
```bash
cd server
npx vercel                # first time: link the project, root = server/
npx vercel env add GEMINI_API_KEY
npx vercel --prod
```

### 3. App
```bash
npm install
cp .env.example .env      # fill in Firebase values + EXPO_PUBLIC_API_URL
npx expo start --tunnel   # Windows: npx.cmd expo start --tunnel
```
Scan the QR code with Expo Go. `--tunnel` gets around restrictive hackathon Wi-Fi.

## Environment variables

Never commit `.env` files. They're gitignored, and `.env.example` files list the names.

**App (`/.env`)**

| Variable | What it is |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web config `apiKey` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web config `authDomain` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web config `projectId` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web config `messagingSenderId` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase web config `appId` |
| `EXPO_PUBLIC_API_URL` | Backend URL, e.g. `https://your-backend.vercel.app` or `http://<your-computer-ip>:3001` |

(Firebase web config values are meant to be public. Access is protected by `firestore.rules`.)

**Server (`/server/.env` and Vercel env)**

| Variable | What it is |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key (server only, never in the app) |
| `GEMINI_MODEL` | Optional. The Gemini model to use; defaults to a fast Flash model |

## Demo script

1. **Settings:** set a **$100 monthly budget**, an hourly wage, and a savings goal (e.g. "Trip to Montréal", $200). Back on Home, the goal bar and "≈ $100 left this month · based only on purchases logged in this app" appear.
2. **Hoodie (Sprout wins):** tap *I want to buy something…* and Sprout panics. Snap a hoodie → *Ask Sprout*. Try vague excuses: "I'll wear it a lot", "it's on sale", "I deserve it". The meter barely moves, and Sprout escalates from alarm → pleading → bargaining → **meltdown** (with a shake). Tap **Don't buy it**: leaf burst, haptic, "YOU DID IT. I'M SO PROUD. I'M GROWING." Home shows Sprout ecstatic and a **"+$X"** pop on *Spending avoided*. Open **Your wins**, then share the "Skipped it!" card. The total doesn't change after sharing.
3. **Replacement laptop charger (you win):** give specific reasons: "My charger's cable split and won't charge anymore", "I use my laptop every day for my classes", "I don't have a spare", "I compared the official one with a third-party one". Chips appear one by one and Sprout's face goes nervous → sweating → panicking → defeated, until "FINE. You win. I hate that you're right." Sprout then pushes **refurbished** and **repair** cards with search links.
4. **Pain relievers (essential):** approved instantly and warmly, with at most one tip (e.g. the store brand). No fight.
5. **Bonus:** leave a debate halfway and reopen it from the catalog ("You're BACK? For THIS?"), or turn on airplane mode to show the canned-line fallback.

## Team

Built by the Don't Buy It! team at Hack the Valley 11. Licensed under [MIT](LICENSE).
