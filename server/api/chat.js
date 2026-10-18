// Vercel serverless function: POST /api/chat
import { endpoint } from '../lib/http.js';
import { chat } from '../lib/chat.js';

export default endpoint(chat);
