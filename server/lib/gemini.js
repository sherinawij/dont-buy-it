// Thin wrapper around the Gemini API (@google/genai). The key is read from the server's env only.
import { GoogleGenAI, Type } from '@google/genai';
import { CATEGORIES, ALT_TYPES } from './enums.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// Tried in order only when the main model is overloaded or rate-limited.
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.6-flash,gemini-3.5-flash-lite')
  .split(',').map((m) => m.trim()).filter((m) => m && m !== MODEL);
// Lower thinking = faster replies, which matters more than depth for a chatty plant.
const THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'LOW';

let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// ---------- Structured output schemas (Gemini must answer in exactly this JSON shape) ----------
const replies = {
  suggestedReplies: { type: Type.ARRAY, items: { type: Type.STRING } },
  surrenderReply: { type: Type.STRING },
};

export const ANALYZE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    category: { type: Type.STRING, enum: CATEGORIES },
    estimatedPrice: { type: Type.NUMBER },
    essential: { type: Type.BOOLEAN },
    openingLine: { type: Type.STRING },
    ...replies,
  },
  required: ['name', 'category', 'estimatedPrice', 'essential', 'openingLine', 'suggestedReplies', 'surrenderReply'],
};

export const CHAT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    criteriaHit: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { id: { type: Type.STRING }, quote: { type: Type.STRING } },
        required: ['id', 'quote'],
      },
    },
    alternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { type: { type: Type.STRING, enum: ALT_TYPES }, reason: { type: Type.STRING } },
        required: ['type', 'reason'],
      },
    },
    ...replies,
  },
  required: ['reply', 'criteriaHit', 'suggestedReplies', 'surrenderReply'],
};

// timeoutMs: abort this one call if Gemini is too slow, so we can move on to the next model.
async function callModel(model, { system, parts, schema }, timeoutMs) {
  const response = await getClient().models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 1,
      thinkingConfig: { thinkingLevel: THINKING_LEVEL },
      abortSignal: AbortSignal.timeout(timeoutMs),
    },
  });
  return JSON.parse(response.text);
}

// Too slow (our own timeout), overloaded (503), rate-limited (429) or flaky (500) — try another option.
const isTimeout = (e) => e?.name === 'TimeoutError' || e?.name === 'AbortError';
const isTemporary = (e) => isTimeout(e) || [429, 500, 503].includes(e?.status);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Time limits. The app gives up after 20 s and Vercel kills us at 30 s,
// so the whole request must finish in 18 s, and one slow model can't use more than 9 s of it.
const TOTAL_BUDGET_MS = 18_000;
const ATTEMPT_LIMIT_MS = 9_000;

// After a 429 (rate limit) we skip that model for a bit instead of hammering it.
const COOLDOWN_MS = 30_000;
const cooldownUntil = {};

// parts: Gemini content parts (text and optional inline image). Returns the parsed JSON object.
// Busy models are common at peak times, so: main model → one retry if it failed fast → fallback models.
// If everything fails the app shows canned Sprout lines, so the demo never breaks.
export async function generateJson(request) {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const models = [MODEL, ...FALLBACK_MODELS];
  const ready = models.filter((m) => !(cooldownUntil[m] > Date.now()));
  const queue = ready.length ? ready : models; // if all are cooling down, try anyway
  let lastError = new Error('Gemini did not answer in time');
  for (let i = 0; i < queue.length; i++) {
    const model = queue[i];
    for (let attempt = 1; attempt <= 2; attempt++) {
      const timeLeft = deadline - Date.now();
      if (timeLeft < 1500) throw lastError; // not enough time for another try
      const started = Date.now();
      try {
        const result = await callModel(model, request, Math.min(ATTEMPT_LIMIT_MS, timeLeft));
        console.log(`${model} answered in ${Date.now() - started}ms`);
        return result;
      } catch (e) {
        lastError = e;
        if (!isTemporary(e)) throw e; // a real bug (bad request, bad key) — don't hide it
        const reason = isTimeout(e) ? 'timed out' : e.status;
        console.warn(`${model} unavailable (${reason}) after ${Date.now() - started}ms; trying the next option`);
        if (e.status === 429) cooldownUntil[model] = Date.now() + COOLDOWN_MS;
        // Only the main model gets one quick retry, and only if it was briefly overloaded (503).
        if (i > 0 || attempt === 2 || e.status !== 503) break;
        await wait(700);
      }
    }
  }
  throw lastError;
}
