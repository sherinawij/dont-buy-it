// POST /api/analyze — what is this item, is it essential, and Sprout's first reaction.
import { analyzePrompt } from './prompts.js';
import { generateJson, ANALYZE_SCHEMA } from './gemini.js';
import { validateAnalyzeBody, cleanAnalyzeOutput } from './validate.js';

export async function analyze(body) {
  const input = validateAnalyzeBody(body); // throws BadRequest (400) on bad input
  const { system, userText } = analyzePrompt(input);
  const parts = [{ text: userText }];
  if (input.imageBase64) {
    // The photo is sent to Gemini for this one request only; it is never stored.
    parts.unshift({ inlineData: { mimeType: input.mimeType, data: input.imageBase64 } });
  }
  const raw = await generateJson({ system, parts, schema: ANALYZE_SCHEMA });
  return cleanAnalyzeOutput(raw, input);
}
