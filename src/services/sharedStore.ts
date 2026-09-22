import { Photo, DynamicSession, CommentItem } from '../types';
import { APP_CONFIG } from '../config';

export interface SharedAppState {
  version: number;
  updatedAt: number;
  totalVotesCount: number;
  photos: Photo[];
  activeDynamic: DynamicSession | null;
  dynamics: DynamicSession[];
}

const REDIS_KEY = 'unalmed_global_state_v1';

/**
 * Returns true if there is a configured remote storage for real-time votes
 */
export function isSharedStoreConfigured(): boolean {
  if (APP_CONFIG.syncApiUrl) return true;
  if (APP_CONFIG.kvRestApiUrl && APP_CONFIG.kvRestApiToken) return true;
  return false;
}

/**
 * Get name of active sync provider for display in Admin panel
 */
export function getActiveSyncProviderName(): string {
  const custom = APP_CONFIG.getCustomSyncUrl();
  if (custom) return 'Google Apps Script (URL Personalizada)';
  if (APP_CONFIG.syncApiUrl) return 'Google Apps Script (Vercel)';
  if (APP_CONFIG.kvRestApiUrl) return 'Vercel KV / Upstash Redis';
  return 'Local / Pendiente de configuración';
}

/**
 * Check diagnostics from /api/sync on Vercel (environment variables status)
 */
export interface VercelDiagnostics {
  vercelEnvDetected: {
    hasSyncApiUrl: boolean;
    hasGoogleScriptUrl: boolean;
    hasKvUrl: boolean;
    hasDriveFolderId: boolean;
    hasGoogleApiKey: boolean;
    activeProvider: string;
  };
  scriptUrlConfigured: boolean;
  timestamp: number;
}

export async function fetchVercelDiagnostics(): Promise<VercelDiagnostics | null> {
  try {
    const res = await fetch('/api/sync?diagnostic=1');
    if (res.ok) {
      return (await res.json()) as VercelDiagnostics;
    }
  } catch {
    // offline or local dev without serverless api
  }
  return null;
}

function parseSharedStateData(data: unknown): SharedAppState | null {
  if (!data) return null;
  let parsed: unknown = data;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    let target = obj;
    if (obj.state && typeof obj.state === 'object') target = obj.state as Record<string, unknown>;
    else if (obj.data && typeof obj.data === 'object') target = obj.data as Record<string, unknown>;

    if (Array.isArray(target.photos)) {
      return target as unknown as SharedAppState;
    }
  }
  return null;
}

/**
 * Fetch latest shared votes & app state from remote store
 */
export async function fetchRemoteSharedState(): Promise<SharedAppState | null> {
  const syncUrl = APP_CONFIG.syncApiUrl;

  // Option 1: Custom Webhook / Google Apps Script (Direct client fetch)
  if (syncUrl) {
    try {
      const res = await fetch(syncUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'follow',
      });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseSharedStateData(text);
        if (parsed) return parsed;
      }
    } catch (err) {
      console.warn('Error obteniendo estado de Google Apps Script directo:', err);
    }
  }

  // Option 2: Built-in Vercel Serverless Function `/api/sync` (handles backend Google Apps Script and Redis)
  try {
    const res = await fetch('/api/sync', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      const parsed = parseSharedStateData(json);
      if (parsed) return parsed;
    }
  } catch {
    // Expected in purely static dev or if not provisioned
  }

  // Option 3: Direct Vercel KV / Upstash Redis REST
  if (APP_CONFIG.kvRestApiUrl && APP_CONFIG.kvRestApiToken) {
    try {
      const url = `${APP_CONFIG.kvRestApiUrl.replace(/\/$/, '')}/get/${REDIS_KEY}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${APP_CONFIG.kvRestApiToken}`,
        },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.result) {
          const parsed = parseSharedStateData(body.result);
          if (parsed) return parsed;
        }
      }
    } catch (err) {
      console.warn('Error obteniendo estado de Vercel KV / Upstash:', err);
    }
  }

  return null;
}

/**
 * Push updated votes & app state to remote store
 */
export async function pushRemoteSharedState(state: SharedAppState): Promise<boolean> {
  const payload = {
    ...state,
    updatedAt: Date.now(),
  };
  const bodyStr = JSON.stringify(payload);
  const syncUrl = APP_CONFIG.syncApiUrl;
  let pushedSuccessfully = false;

  // Option 1: Custom Webhook / Google Apps Script
  if (syncUrl) {
    try {
      const res = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: bodyStr,
        redirect: 'follow',
        // Note: Browsers throw if keepalive flag is used on bodies > 64KB!
        ...(bodyStr.length < 60000 ? { keepalive: true } : {}),
      });
      if (res.ok) {
        pushedSuccessfully = true;
      }
    } catch {
      // If CORS redirect throws in browser, try mode: 'no-cors' so doPost is executed by Google
      try {
        await fetch(syncUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: bodyStr,
        });
        pushedSuccessfully = true;
      } catch (noCorsErr) {
        console.warn('Error enviando a Google Apps Script:', noCorsErr);
      }
    }
  }

  // Option 2: Built-in Vercel Serverless Function `/api/sync` (bypasses browser CORS to Apps Script / Redis)
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      ...(bodyStr.length < 60000 ? { keepalive: true } : {}),
    });
    if (res.ok) {
      pushedSuccessfully = true;
    }
  } catch {
    // Ignore in purely static dev
  }

  // Option 3: Direct Vercel KV / Upstash Redis REST
  if (!pushedSuccessfully && APP_CONFIG.kvRestApiUrl && APP_CONFIG.kvRestApiToken) {
    try {
      const url = `${APP_CONFIG.kvRestApiUrl.replace(/\/$/, '')}/set/${REDIS_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${APP_CONFIG.kvRestApiToken}`,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });
      if (res.ok) pushedSuccessfully = true;
    } catch (err) {
      console.warn('Error enviando estado a Vercel KV / Upstash:', err);
    }
  }

  return pushedSuccessfully;
}

/**
 * Sends a beacon request during beforeunload/pagehide to guarantee votes are not lost on refresh
 */
export function sendBeaconSharedState(state: SharedAppState): boolean {
  const payload = JSON.stringify({ ...state, updatedAt: Date.now() });

  if (APP_CONFIG.syncApiUrl && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
      return navigator.sendBeacon(APP_CONFIG.syncApiUrl, blob);
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Intelligent merger for photos, votes, comments, and dynamics
 */
export function mergeAppState(
  local: {
    photos: Photo[];
    totalVotesCount: number;
    activeDynamic: DynamicSession | null;
    dynamics: DynamicSession[];
  },
  remote: SharedAppState
): {
  photos: Photo[];
  totalVotesCount: number;
  activeDynamic: DynamicSession | null;
  dynamics: DynamicSession[];
  hasChanges: boolean;
} {
  let hasChanges = false;

  // 1. Total votes: keep highest cumulative count
  const newTotalVotes = Math.max(local.totalVotesCount, remote.totalVotesCount || 0);
  if (newTotalVotes !== local.totalVotesCount) {
    hasChanges = true;
  }

  // 2. Merge photos and their cumulative votes
  const remoteMap = new Map<string, Photo>();
  remote.photos.forEach((rp) => remoteMap.set(rp.id, rp));

  const localIds = new Set(local.photos.map((p) => p.id));
  const mergedPhotos: Photo[] = local.photos.map((localPhoto) => {
    const remotePhoto = remoteMap.get(localPhoto.id);
    if (!remotePhoto) return localPhoto;

    // Merge comments
    const commentMap = new Map<string, CommentItem>();
    localPhoto.comments.forEach((c) => commentMap.set(c.id, c));
    (remotePhoto.comments || []).forEach((rc) => {
      const existing = commentMap.get(rc.id);
      if (!existing) {
        commentMap.set(rc.id, rc);
        hasChanges = true;
      } else {
        const higherLikes = Math.max(existing.likes, rc.likes);
        if (higherLikes !== existing.likes) {
          commentMap.set(rc.id, { ...existing, likes: higherLikes });
          hasChanges = true;
        }
      }
    });

    const higherPoints = Math.max(localPhoto.points, remotePhoto.points);
    const higherMatches = Math.max(localPhoto.matchesPlayed, remotePhoto.matchesPlayed);
    const higherWins = Math.max(localPhoto.matchesWon, remotePhoto.matchesWon);
    const higherSwipeLikes = Math.max(localPhoto.swipeLikes, remotePhoto.swipeLikes);
    const higherSwipePasses = Math.max(localPhoto.swipePasses, remotePhoto.swipePasses);

    if (
      higherPoints !== localPhoto.points ||
      higherMatches !== localPhoto.matchesPlayed ||
      higherSwipeLikes !== localPhoto.swipeLikes
    ) {
      hasChanges = true;
    }

    return {
      ...localPhoto,
      title: remotePhoto.title || localPhoto.title,
      author: remotePhoto.author || localPhoto.author,
      imageUrl: remotePhoto.imageUrl || localPhoto.imageUrl,
      description: remotePhoto.description || localPhoto.description,
      points: higherPoints,
      matchesPlayed: higherMatches,
      matchesWon: higherWins,
      swipeLikes: higherSwipeLikes,
      swipePasses: higherSwipePasses,
      comments: Array.from(commentMap.values()),
      driveFileId: localPhoto.driveFileId || remotePhoto.driveFileId,
      driveWebViewLink: localPhoto.driveWebViewLink || remotePhoto.driveWebViewLink,
      syncedToDrive: localPhoto.syncedToDrive || remotePhoto.syncedToDrive,
    };
  });

  // Include any new photos from remote that were not local
  remote.photos.forEach((remotePhoto) => {
    if (!localIds.has(remotePhoto.id)) {
      mergedPhotos.push(remotePhoto);
      hasChanges = true;
    }
  });

  // 3. Dynamic session
  let mergedActiveDynamic = local.activeDynamic;
  const isOpeningDynamic = (d?: DynamicSession | null) =>
    !d ||
    d.title === 'Dinámica de Apertura: Miradas de Unalmed' ||
    d.id?.startsWith('dynamic-init-');

  if (remote.activeDynamic && !isOpeningDynamic(remote.activeDynamic)) {
    if (!local.activeDynamic || isOpeningDynamic(local.activeDynamic)) {
      mergedActiveDynamic = remote.activeDynamic;
      hasChanges = true;
    } else if (remote.activeDynamic.id === local.activeDynamic.id) {
      if (remote.activeDynamic.isClosed && !local.activeDynamic.isClosed) {
        mergedActiveDynamic = remote.activeDynamic;
        hasChanges = true;
      }
    } else if ((remote.activeDynamic.startedAt || 0) > (local.activeDynamic.startedAt || 0)) {
      mergedActiveDynamic = remote.activeDynamic;
      hasChanges = true;
    }
  } else if (local.activeDynamic && isOpeningDynamic(local.activeDynamic)) {
    mergedActiveDynamic = null;
    hasChanges = true;
  }

  // 4. Dynamics history
  const historyMap = new Map<string, DynamicSession>();
  local.dynamics.filter((d) => !isOpeningDynamic(d)).forEach((d) => historyMap.set(d.id, d));
  (remote.dynamics || [])
    .filter((rd) => !isOpeningDynamic(rd))
    .forEach((rd) => {
      if (!historyMap.has(rd.id)) {
        historyMap.set(rd.id, rd);
        hasChanges = true;
      }
    });

  return {
    photos: mergedPhotos,
    totalVotesCount: newTotalVotes,
    activeDynamic: mergedActiveDynamic,
    dynamics: Array.from(historyMap.values()),
    hasChanges,
  };
}
