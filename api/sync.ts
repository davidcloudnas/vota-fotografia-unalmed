import type { IncomingMessage, ServerResponse } from 'http';

// In-memory fallback for current container runtime
let globalStateCache: unknown = null;

export default async function handler(req: IncomingMessage & { body?: unknown; url?: string }, res: ServerResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-sync-url');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Prioritize URL passed from app client header, or Vercel environment variables
  const customHeaderUrl = (req.headers['x-sync-url'] as string) || '';
  const scriptUrl =
    (customHeaderUrl && customHeaderUrl.trim()) ||
    process.env.VITE_SYNC_API_URL ||
    process.env.SYNC_API_URL ||
    '';

  const reqUrl = req.url || '';

  // Diagnostic Endpoint: Check what variables are loaded and test script connection
  if (reqUrl.includes('env_check') || reqUrl.includes('diagnostic') || reqUrl.includes('test_url')) {
    let scriptAccessible = false;
    let scriptStatus: number | null = null;
    let scriptError: string | null = null;
    let totalPhotos = 0;
    let totalVotes = 0;
    let dbFileExists = false;

    if (scriptUrl) {
      try {
        const pingUrl = scriptUrl.includes('?') ? `${scriptUrl}&ping=1` : `${scriptUrl}?ping=1`;
        const testRes = await fetch(pingUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          redirect: 'follow',
        });
        scriptStatus = testRes.status;
        if (testRes.ok) {
          scriptAccessible = true;
          const txt = await testRes.text();
          try {
            const parsed = JSON.parse(txt);
            if (parsed && typeof parsed === 'object') {
              const root = parsed.state || parsed.data || parsed;
              const photosArr = Array.isArray(root.photos) ? root.photos : [];
              totalPhotos = root.totalPhotos ?? photosArr.length;
              totalVotes = root.totalVotes ?? root.totalVotesCount ?? 0;
              dbFileExists = Boolean(root.dbFileExists || photosArr.length > 0 || parsed.version);
            }
          } catch {
            // raw text response
          }
        }
      } catch (err: unknown) {
        scriptError = err instanceof Error ? err.message : String(err);
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        vercelEnvDetected: {
          hasSyncApiUrl: !!(process.env.VITE_SYNC_API_URL || process.env.SYNC_API_URL),
          hasDriveFolderId: !!(process.env.VITE_DRIVE_FOLDER_ID || process.env.DRIVE_FOLDER_ID),
          activeProvider: scriptUrl
            ? 'Google Apps Script (Google Drive / Vercel)'
            : 'Memoria Local (Pendiente VITE_SYNC_API_URL)',
        },
        scriptUrlConfigured: !!scriptUrl,
        scriptAccessible,
        scriptStatus,
        scriptError,
        totalPhotos,
        totalVotes,
        dbFileExists,
        timestamp: Date.now(),
      })
    );
    return;
  }

  // GET: Retrieve current global shared state from Google Apps Script
  if (req.method === 'GET') {
    if (scriptUrl) {
      try {
        const isForceRefresh = reqUrl.includes('refresh') || reqUrl.includes('nocache');
        const targetFetchUrl = isForceRefresh
          ? (scriptUrl.includes('?') ? `${scriptUrl}&refresh=1&nocache=1` : `${scriptUrl}?refresh=1&nocache=1`)
          : scriptUrl;

        const response = await fetch(targetFetchUrl, {
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
            globalStateCache = state;
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

    // In-memory fallback
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(globalStateCache || { empty: true }));
    return;
  }

  // POST: Forward state to Google Apps Script
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

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          success: true,
          forwardedToScript,
          updatedAt: Date.now(),
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 500;
      res.end(JSON.stringify({ error: msg }));
    }
  }
}
