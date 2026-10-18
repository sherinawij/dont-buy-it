// Thin wrapper around the Gemini API (@google/genai). The key is read from the server's env only.
import { GoogleGenAI, Type } from '@google/genai';
import { CATEGORIES, ALT_TYPES } from './enums.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
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

// parts: Gemini content parts (text and optional inline image). Returns the parsed JSON object.
export async function generateJson({ system, parts, schema }) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 1,
      thinkingConfig: { thinkingLevel: THINKING_LEVEL },
    },
  });
  return JSON.parse(response.text);
}
