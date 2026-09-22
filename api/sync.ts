import type { IncomingMessage, ServerResponse } from 'http';

// In-memory fallback for current container runtime
let globalStateCache: unknown = null;

const REDIS_KEY = 'unalmed_global_state_v1';

export default async function handler(req: IncomingMessage & { body?: unknown; url?: string }, res: ServerResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const scriptUrl =
    process.env.VITE_SYNC_API_URL ||
    process.env.SYNC_API_URL ||
    process.env.VITE_GOOGLE_SCRIPT_URL ||
    process.env.GOOGLE_SCRIPT_URL ||
    process.env.VITE_APPS_SCRIPT_URL ||
    process.env.APPS_SCRIPT_URL ||
    '';

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

  const reqUrl = req.url || '';

  // Diagnostic Endpoint: Check what variables are loaded in Vercel
  if (reqUrl.includes('env_check') || reqUrl.includes('diagnostic')) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        vercelEnvDetected: {
          hasSyncApiUrl: !!(process.env.VITE_SYNC_API_URL || process.env.SYNC_API_URL),
          hasGoogleScriptUrl: !!(process.env.VITE_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL),
          hasKvUrl: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
          hasDriveFolderId: !!(process.env.VITE_DRIVE_FOLDER_ID || process.env.DRIVE_FOLDER_ID),
          hasGoogleApiKey: !!(process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY),
          activeProvider: scriptUrl
            ? 'Google Apps Script (Vercel Backend)'
            : kvUrl
            ? 'Vercel KV / Upstash Redis'
            : 'Memoria Local / Fallback',
        },
        scriptUrlConfigured: !!scriptUrl,
        timestamp: Date.now(),
      })
    );
    return;
  }

  // GET: Retrieve current global shared state
  if (req.method === 'GET') {
    // 1. Try Google Apps Script from server side (no browser CORS blocks)
    if (scriptUrl) {
      try {
        const response = await fetch(scriptUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          redirect: 'follow',
        });
        if (response.ok) {
          const text = await response.text();
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          let state = json;
          if (json && typeof json === 'object') {
            if ('state' in json && json.state) state = json.state;
            else if ('data' in json && json.data) state = json.data;
          }
          if (state && typeof state === 'object' && Array.isArray((state as Record<string, unknown>).photos)) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(state));
            return;
          }
        }
      } catch (err) {
        console.error('Error consultando Google Apps Script en /api/sync:', err);
      }
    }

    // 2. Try Upstash / Vercel KV
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
        console.error('Error en /api/sync GET Redis:', err);
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

      let forwardedToScript = false;
      let forwardedToKv = false;

      // 1. Forward to Google Apps Script from server side
      if (scriptUrl) {
        try {
          const scriptRes = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: rawBody,
            redirect: 'follow',
          });
          if (scriptRes.ok) {
            forwardedToScript = true;
          }
        } catch (scriptErr) {
          console.error('Error reenviando a Google Apps Script en /api/sync:', scriptErr);
        }
      }

      // 2. Forward to Upstash / Vercel KV
      if (kvUrl && kvToken) {
        try {
          const fetchUrl = `${kvUrl.replace(/\/$/, '')}/set/${REDIS_KEY}`;
          const kvRes = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${kvToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (kvRes.ok) {
            forwardedToKv = true;
          }
        } catch (kvErr) {
          console.error('Error reenviando a KV en /api/sync:', kvErr);
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          success: true,
          forwardedToScript,
          forwardedToKv,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
    return;
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
}
