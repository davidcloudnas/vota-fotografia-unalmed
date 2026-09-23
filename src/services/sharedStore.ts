import { Photo, DynamicSession, CommentItem } from '../types';
import { APP_CONFIG } from '../config';

export interface SharedAppState {
  version: number;
  updatedAt: number;
  totalVotesCount: number;
  photos: Photo[];
  activeDynamic: DynamicSession | null;
  dynamics: DynamicSession[];
  deletedPhotoIds?: string[];
}

/**
 * Safe fetch with hard timeout to prevent UI from freezing in "Comprobando..."
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Returns true if there is a configured remote storage for real-time votes
 */
export function isSharedStoreConfigured(): boolean {
  return Boolean(APP_CONFIG.syncApiUrl);
}

/**
 * Test connectivity with a given Google Apps Script or Webhook URL
 */
export async function testSyncUrlConnection(url: string): Promise<{ success: boolean; message: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, message: 'La URL no es válida. Debe comenzar con https://' };
  }
  try {
    const res = await fetchWithTimeout(url.trim(), { method: 'GET', redirect: 'follow' }, 6000);
    if (res.ok) {
      return {
        success: true,
        message: '¡Conexión exitosa! El script de Google respondió y la base de datos está vinculada.',
      };
    } else {
      return {
        success: false,
        message: `El servidor respondió con código HTTP ${res.status}. Verifica que el despliegue esté como "Aplicación web" y acceso "Cualquier usuario".`,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `No se pudo conectar (${msg}). Revisa si diste los permisos de Google Drive al implementar.`,
    };
  }
}

/**
 * Get name of active sync provider for display in Admin panel
 */
export function getActiveSyncProviderName(): string {
  const custom = APP_CONFIG.getCustomSyncUrl();
  if (custom) return 'Google Apps Script (URL Personalizada en Drive)';
  if (APP_CONFIG.syncApiUrl) return 'Google Apps Script (Google Drive / Vercel)';
  return 'Google Drive (Pendiente configurar Webhook)';
}

/**
 * Check diagnostics from /api/sync on Vercel (environment variables status)
 */
export interface VercelDiagnostics {
  vercelEnvDetected: {
    hasSyncApiUrl: boolean;
    hasGoogleScriptUrl: boolean;
    hasDriveFolderId: boolean;
    hasGoogleApiKey: boolean;
    activeProvider: string;
  };
  scriptUrlConfigured: boolean;
  timestamp: number;
}

export async function fetchVercelDiagnostics(): Promise<VercelDiagnostics | null> {
  try {
    const res = await fetchWithTimeout('/api/sync?diagnostic=1', {}, 4000);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await res.json()) as VercelDiagnostics;
      }
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
 * Fetch latest shared votes & app state from remote store with strict 4.5s timeout
 */
export async function fetchRemoteSharedState(): Promise<SharedAppState | null> {
  const syncUrl = APP_CONFIG.syncApiUrl;

  // Option 1: Custom Webhook / Google Apps Script (Direct client fetch)
  if (syncUrl) {
    try {
      const res = await fetchWithTimeout(
        syncUrl,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          redirect: 'follow',
        },
        4500
      );
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
    const res = await fetchWithTimeout(
      '/api/sync',
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      3500
    );
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const parsed = parseSharedStateData(json);
        if (parsed) return parsed;
      }
    }
  } catch {
    // Expected in purely static dev or if not provisioned
  }

  return null;
}

/**
 * Push updated votes & app state to remote store with strict timeout
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
      const res = await fetchWithTimeout(
        syncUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: bodyStr,
          redirect: 'follow',
        },
        5000
      );
      if (res.ok) {
        pushedSuccessfully = true;
      }
    } catch {
      // If CORS redirect throws in browser, try mode: 'no-cors' so doPost is executed by Google
      try {
        await fetchWithTimeout(
          syncUrl,
          {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: bodyStr,
          },
          5000
        );
        pushedSuccessfully = true;
      } catch (noCorsErr) {
        console.warn('Error enviando a Google Apps Script:', noCorsErr);
      }
    }
  }

  // Option 2: Built-in Vercel Serverless Function `/api/sync` (bypasses browser CORS to Apps Script)
  try {
    const res = await fetchWithTimeout(
      '/api/sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      },
      4000
    );
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        pushedSuccessfully = true;
      }
    }
  } catch {
    // Ignore in purely static dev
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
 * Intelligent merger for photos, votes, comments, dynamics and deleted tombstones
 */
export function mergeAppState(
  local: {
    photos: Photo[];
    totalVotesCount: number;
    activeDynamic: DynamicSession | null;
    dynamics: DynamicSession[];
    deletedPhotoIds?: string[];
  },
  remote: SharedAppState
): {
  photos: Photo[];
  totalVotesCount: number;
  activeDynamic: DynamicSession | null;
  dynamics: DynamicSession[];
  deletedPhotoIds: string[];
  hasChanges: boolean;
} {
  let hasChanges = false;

  // 1. Combine deleted photo IDs (tombstones) so deleted photos NEVER reappear
  const allDeletedIds = new Set<string>([
    ...(local.deletedPhotoIds || []),
    ...(remote.deletedPhotoIds || []),
  ]);

  if (allDeletedIds.size > (local.deletedPhotoIds?.length || 0)) {
    hasChanges = true;
  }

  // Filter out any locally existing photo that was deleted
  const filteredLocalPhotos = local.photos.filter((p) => {
    if (allDeletedIds.has(p.id)) {
      hasChanges = true;
      return false;
    }
    return true;
  });

  // 2. Total votes: keep highest cumulative count
  const newTotalVotes = Math.max(local.totalVotesCount, remote.totalVotesCount || 0);
  if (newTotalVotes !== local.totalVotesCount) {
    hasChanges = true;
  }

  // 3. Merge photos:
  // If remote has an explicit photos array, remote is authoritative for the catalogue.
  // Any photo deleted on another device will no longer be in remote.photos and will be cleanly removed locally.
  const remotePhotosList = remote.photos || [];
  const mergedPhotos: Photo[] = [];

  remotePhotosList.forEach((remotePhoto) => {
    if (allDeletedIds.has(remotePhoto.id)) return;
    const localPhoto = filteredLocalPhotos.find((lp) => lp.id === remotePhoto.id);
    if (!localPhoto) {
      mergedPhotos.push(remotePhoto);
      hasChanges = true;
      return;
    }

    // Photo exists in both: merge votes and comments taking the highest
    const commentMap = new Map<string, CommentItem>();
    (localPhoto.comments || []).forEach((c) => commentMap.set(c.id, c));
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
      higherSwipeLikes !== localPhoto.swipeLikes ||
      localPhoto.imageUrl !== remotePhoto.imageUrl
    ) {
      hasChanges = true;
    }

    mergedPhotos.push({
      ...remotePhoto,
      imageUrl: remotePhoto.imageUrl || localPhoto.imageUrl,
      points: higherPoints,
      matchesPlayed: higherMatches,
      matchesWon: higherWins,
      swipeLikes: higherSwipeLikes,
      swipePasses: higherSwipePasses,
      comments: Array.from(commentMap.values()),
      driveFileId: remotePhoto.driveFileId || localPhoto.driveFileId,
      driveWebViewLink: remotePhoto.driveWebViewLink || localPhoto.driveWebViewLink,
      syncedToDrive: remotePhoto.syncedToDrive || localPhoto.syncedToDrive,
    });
  });

  // If remote is pristine/brand new (never had any sync), allow keeping local photos
  if (!remote.updatedAt && mergedPhotos.length === 0 && filteredLocalPhotos.length > 0) {
    mergedPhotos.push(...filteredLocalPhotos);
  } else if (filteredLocalPhotos.length !== mergedPhotos.length) {
    hasChanges = true;
  }

  // 4. Dynamic session
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

  // 5. Merge closed / historical dynamics list
  const dynamicsMap = new Map<string, DynamicSession>();
  (local.dynamics || []).forEach((d) => {
    if (!isOpeningDynamic(d)) {
      dynamicsMap.set(d.id, d);
    }
  });
  (remote.dynamics || []).forEach((rd) => {
    if (isOpeningDynamic(rd)) return;
    const existing = dynamicsMap.get(rd.id);
    if (!existing) {
      dynamicsMap.set(rd.id, rd);
      hasChanges = true;
    } else {
      if (rd.isClosed && !existing.isClosed) {
        dynamicsMap.set(rd.id, rd);
        hasChanges = true;
      }
    }
  });

  const mergedDynamics = Array.from(dynamicsMap.values()).sort(
    (a, b) => (b.startedAt || 0) - (a.startedAt || 0)
  );
  if (mergedDynamics.length !== (local.dynamics || []).length) {
    hasChanges = true;
  }

  return {
    photos: mergedPhotos,
    totalVotesCount: newTotalVotes,
    activeDynamic: mergedActiveDynamic,
    dynamics: mergedDynamics,
    deletedPhotoIds: Array.from(allDeletedIds),
    hasChanges,
  };
}
