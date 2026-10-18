// Client for our backend (which holds the Gemini key). Owner: P1.
// Both functions are safe to call: on any failure the app falls back so the demo never breaks.
import { CANNED_LINES, stageForTurn } from './config';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TIMEOUT_MS = 20000;

async function post(path, body) {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL not set');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const pick = (lines, n) => lines[n % lines.length];

// body: { imageBase64, name?, price?, link?, history[] }
// → { ok: true, data: { name, category, estimatedPrice, essential, openingLine, suggestedReplies } } | { ok: false }
// On { ok: false } the Add screen asks for name/price manually.
export async function analyzeItem(body) {
  try {
    return { ok: true, data: await post('/api/analyze', body) };
  } catch (e) {
    return { ok: false };
  }
}

// body: see the /api/chat contract. ALWAYS resolves to
// { reply, criteriaHit: [{id, quote}], suggestedReplies: [], alternatives?: [{type, reason}], fallback: boolean }
let cannedCounter = 0;
export async function chatWithSprout(body) {
  try {
    // Respect the server's guards: only the item fields it needs, last 20 messages, ≤500 chars each.
    const { name, category, price, estimatedPrice, essential } = body.item;
    const data = await post('/api/chat', {
      ...body,
      item: { name, category, price, estimatedPrice, essential },
      messages: body.messages.slice(-20).map((m) => ({ role: m.role, text: m.text.slice(0, 500) })),
    });
    return { criteriaHit: [], suggestedReplies: [], ...data, fallback: false };
  } catch (e) {
    // Offline/timeout: a canned line for the current escalation stage, and no criteria hits.
    const group = body.item?.essential
      ? 'essential'
      : body.conceded ? 'concede'
      : body.finalPlea ? 'final_plea'
      : body.resumed ? 'resumed'
      : stageForTurn(body.turn);
    return {
      reply: pick(CANNED_LINES[group], cannedCounter++),
      criteriaHit: [],
      suggestedReplies: ['Okay, okay. You win.', 'Hear me out…'],
      alternatives: body.conceded ? [{ type: 'used', reason: 'Same thing, less waste, lower price.' }] : undefined,
      fallback: true,
    };
  }
}
