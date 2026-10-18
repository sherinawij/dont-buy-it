// Vercel serverless function: POST /api/analyze
import { endpoint } from '../lib/http.js';
import { analyze } from '../lib/analyze.js';

export default endpoint(analyze);
