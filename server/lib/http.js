// Turns a plain handler (body → result) into an HTTP endpoint with CORS and clean errors.
// The SAME wrapped function runs on Vercel (api/*.js) and in Express (local.js).
export function endpoint(handler) {
  return async (req, res) => {
    // CORS: the Expo app calls us from phones, so allow any origin. No cookies are used.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Body must be valid JSON' });
    }

    try {
      return res.status(200).json(await handler(body));
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ error: e.message });
      console.error(e); // details stay in the server logs
      return res.status(502).json({ error: 'Sprout is having trouble thinking right now.' });
    }
  };
}
