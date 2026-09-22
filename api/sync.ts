import type { IncomingMessage, ServerResponse } from 'http';

// In-memory fallback for current container runtime
let globalStateCache: unknown = null;

const REDIS_KEY = 'unalmed_global_state_v1';

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const kvUrl =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.VITE_KV_REST_API_URL ||
    '';
  const kvToken =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.VITE_KV_REST_API_TOKEN ||
    '';

  // GET: Retrieve current global shared state
  if (req.method === 'GET') {
    if (kvUrl && kvToken) {
      try {
        const fetchUrl = `${kvUrl.replace(/\/$/, '')}/get/${REDIS_KEY}`;
        const response = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        if (response.ok) {
          const json = await response.json();
          if (json.result) {
            const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(parsed));
            return;
          }
        }
      } catch (err) {
        console.error('Error en /api/sync GET:', err);
      }
    }

    // In-memory fallback
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(globalStateCache || { empty: true }));
    return;
  }

  // POST: Save or merge updated state
  if (req.method === 'POST') {
    try {
      // Read body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      const payload = JSON.parse(rawBody);

      globalStateCache = payload;

      if (kvUrl && kvToken) {
        const fetchUrl = `${kvUrl.replace(/\/$/, '')}/set/${REDIS_KEY}`;
        await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
    return;
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
}
