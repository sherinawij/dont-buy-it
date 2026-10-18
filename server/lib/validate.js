// Input guards (clear 400 errors) and a second check of everything Gemini returns.
// We never trust the AI's JSON blindly: unknown ids, made-up quotes and bad enums are dropped here.
import { RUBRIC_IDS } from './rubric.js';
import { CATEGORIES, ALT_TYPES } from './enums.js';

export const LIMITS = {
  maxMessages: 20,
  maxMessageChars: 500,
  maxImageBytes: 1.5 * 1024 * 1024,
  maxHistory: 20,
};

export class BadRequest extends Error {
  status = 400;
}

const fail = (msg) => {
  throw new BadRequest(msg);
};
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Accepts a number or numeric string ≥ 0; returns null when missing.
function optNumber(v, field) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) fail(`${field} must be a non-negative number`);
  return n;
}

function cleanHistory(history) {
  if (history === undefined) return [];
  if (!Array.isArray(history)) fail('history must be an array');
  return history.slice(0, LIMITS.maxHistory).filter(isObj).map((h) => ({
    name: str(h.name, 80) || 'item',
    category: str(h.category, 30) || 'other',
    status: str(h.status, 20),
    outcome: str(h.outcome, 20),
  }));
}

// ---------- /analyze input ----------
export function validateAnalyzeBody(body) {
  if (!isObj(body)) fail('Body must be a JSON object');
  let imageBase64 = null;
  let mimeType = 'image/jpeg';
  if (body.imageBase64 != null) {
    if (typeof body.imageBase64 !== 'string') fail('imageBase64 must be a string');
    // Allow a "data:image/jpeg;base64,..." prefix and strip it.
    const match = body.imageBase64.match(/^data:(image\/[a-z]+);base64,(.*)$/s);
    imageBase64 = match ? match[2] : body.imageBase64;
    if (match) mimeType = match[1];
    if (imageBase64.length * 0.75 > LIMITS.maxImageBytes) fail('Image is too large (max ~1.5 MB). Resize it first.');
    if (!/^[A-Za-z0-9+/=\s]+$/.test(imageBase64.slice(0, 1000))) fail('imageBase64 is not valid base64');
  }
  const name = str(body.name, 100);
  if (!imageBase64 && !name) fail('Send a photo (imageBase64) or a name');
  return {
    imageBase64,
    mimeType,
    name,
    price: optNumber(body.price, 'price'),
    link: str(body.link, 500),
    history: cleanHistory(body.history),
  };
}

// ---------- /chat input ----------
export function validateChatBody(body) {
  if (!isObj(body)) fail('Body must be a JSON object');
  if (!isObj(body.item)) fail('item is required');
  const item = {
    name: str(body.item.name, 100) || fail('item.name is required'),
    category: CATEGORIES.includes(body.item.category) ? body.item.category : 'other',
    price: optNumber(body.item.price, 'item.price'),
    estimatedPrice: optNumber(body.item.estimatedPrice, 'item.estimatedPrice'),
    essential: body.item.essential === true,
  };

  if (!Array.isArray(body.messages) || body.messages.length === 0) fail('messages must be a non-empty array');
  if (body.messages.length > LIMITS.maxMessages) fail(`Too many messages (max ${LIMITS.maxMessages})`);
  const messages = body.messages.map((m, i) => {
    if (!isObj(m) || !['user', 'sprout'].includes(m.role)) fail(`messages[${i}].role must be "user" or "sprout"`);
    if (typeof m.text !== 'string' || !m.text.trim()) fail(`messages[${i}].text must be a non-empty string`);
    if (m.text.length > LIMITS.maxMessageChars) fail(`messages[${i}] is too long (max ${LIMITS.maxMessageChars} characters)`);
    return { role: m.role, text: m.text.trim() };
  });

  const turn = Number(body.turn ?? messages.filter((m) => m.role === 'user').length);
  if (!Number.isInteger(turn) || turn < 0 || turn > 100) fail('turn must be a whole number');

  return {
    item,
    messages,
    turn,
    criteriaMet: Array.isArray(body.criteriaMet) ? body.criteriaMet.filter((id) => RUBRIC_IDS.includes(id)) : [],
    hoursOfWork: optNumber(body.hoursOfWork, 'hoursOfWork'),
    savingsGoal: str(body.savingsGoal, 60),
    goalAmount: optNumber(body.goalAmount, 'goalAmount'),
    totalSaved: optNumber(body.totalSaved, 'totalSaved') ?? 0,
    // The budget estimate may legitimately be negative (over budget), so don't use optNumber.
    remainingDiscretionaryBudget: Number.isFinite(Number(body.remainingDiscretionaryBudget)) && body.remainingDiscretionaryBudget !== null && body.remainingDiscretionaryBudget !== ''
      ? Number(body.remainingDiscretionaryBudget) : null,
    history: cleanHistory(body.history),
    conceded: body.conceded === true,
    finalPlea: body.finalPlea === true,
    resumed: body.resumed === true,
  };
}

// ---------- Checking Gemini's output ----------

// Lowercase, straighten curly quotes, collapse spaces — so a quote check isn't fooled by formatting.
export const normalize = (s) =>
  String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// Always 2–3 replies, and the last one is always a surrender.
function cleanReplies(raw) {
  const surrender = str(raw.surrenderReply, 60) || 'Ugh, fine, you’re right.';
  const others = (Array.isArray(raw.suggestedReplies) ? raw.suggestedReplies : [])
    .map((r) => str(r, 60))
    .filter((r) => r && normalize(r) !== normalize(surrender));
  const unique = [...new Set(others)].slice(0, 2);
  if (unique.length === 0) unique.push('Hear me out…');
  return [...unique, surrender];
}

export function cleanAnalyzeOutput(raw, input) {
  const openingLine = str(raw.openingLine, 400);
  if (!openingLine) throw new Error('Gemini returned no openingLine');
  const est = Number(raw.estimatedPrice);
  return {
    name: input.name || str(raw.name, 100) || 'Mystery item',
    category: CATEGORIES.includes(raw.category) ? raw.category : 'other',
    estimatedPrice: Number.isFinite(est) && est >= 0 ? Math.round(est * 100) / 100 : null,
    essential: raw.essential === true,
    openingLine,
    suggestedReplies: cleanReplies(raw),
  };
}

export function cleanChatOutput(raw, body) {
  const reply = str(raw.reply, 500);
  if (!reply) throw new Error('Gemini returned an empty reply');

  // THE QUOTE CHECK: a hit only survives if its id is known AND its quote really appears
  // in something the user typed. This blocks hallucinated or injected "hits".
  const userText = normalize(body.messages.filter((m) => m.role === 'user').map((m) => m.text).join('\n'));
  const noTagging = body.item.essential || body.conceded || body.resumed;
  const seen = new Set();
  const criteriaHit = noTagging ? [] : (Array.isArray(raw.criteriaHit) ? raw.criteriaHit : [])
    .filter((h) => {
      if (!isObj(h) || !RUBRIC_IDS.includes(h.id) || seen.has(h.id)) return false; // unknown or duplicate id
      const quote = normalize(h.quote ?? '');
      const ok = quote.length >= 3 && userText.includes(quote); // the user really wrote this
      if (ok) seen.add(h.id);
      return ok;
    })
    .map((h) => ({ id: h.id, quote: str(h.quote, 200) }));

  const result = { reply, criteriaHit, suggestedReplies: cleanReplies(raw) };

  // Alternatives only on concession, only from the fixed enum, max 3.
  if (body.conceded) {
    const types = new Set();
    result.alternatives = (Array.isArray(raw.alternatives) ? raw.alternatives : [])
      .filter((a) => isObj(a) && ALT_TYPES.includes(a.type) && !types.has(a.type) && types.add(a.type))
      .slice(0, 3)
      .map((a) => ({ type: a.type, reason: str(a.reason, 160) || 'Cheaper and less waste.' }));
    if (result.alternatives.length === 0) {
      result.alternatives = [{ type: 'used', reason: 'Same thing, lower price, less waste.' }];
    }
  }
  return result;
}
