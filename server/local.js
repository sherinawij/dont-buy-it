// Local dev server: `npm run dev`. Runs the exact same functions Vercel runs.
import 'dotenv/config';
import express from 'express';
import analyze from './api/analyze.js';
import chat from './api/chat.js';
import leaderboard from './api/leaderboard.js';

const app = express();
app.use(express.json({ limit: '4mb' })); // the handlers enforce the real ~1.5 MB image limit

app.all('/api/analyze', analyze);
app.all('/api/chat', chat);
app.all('/api/leaderboard', leaderboard);
app.get('/', (req, res) => res.json({ ok: true, service: "Don't Buy It! backend" }));

// Malformed JSON → a clear 400 instead of Express's HTML error page.
app.use((err, req, res, next) => {
  res.status(err.status || 400).json({ error: err.type === 'entity.too.large' ? 'Body too large' : 'Body must be valid JSON' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Sprout's brain is listening on http://localhost:${port}`));
