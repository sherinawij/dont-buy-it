// Vercel serverless function: POST /api/leaderboard (needs Authorization: Bearer <Firebase ID token>)
import { endpoint } from '../lib/http.js';
import { leaderboard } from '../lib/leaderboard.js';

export default endpoint(leaderboard);
