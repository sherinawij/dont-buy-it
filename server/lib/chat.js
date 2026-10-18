// POST /api/chat — Sprout's next reply plus which rubric criteria the latest message supports.
// Stateless: the app sends the whole conversation every time.
import { chatPrompt } from './prompts.js';
import { generateJson, CHAT_SCHEMA } from './gemini.js';
import { validateChatBody, cleanChatOutput } from './validate.js';

export async function chat(body) {
  const input = validateChatBody(body); // throws BadRequest (400) on bad input
  const { system, userText } = chatPrompt(input);
  const raw = await generateJson({ system, parts: [{ text: userText }], schema: CHAT_SCHEMA });
  return cleanChatOutput(raw, input); // drops unknown ids and quotes the user never wrote
}
