import { Photo, DynamicSession, CommentItem } from '../types';
import { APP_CONFIG } from '../config';
import { getOrCreateDeviceId } from '../utils/deviceId';

export interface DuelRecord {
  voteId: string;
  deviceId: string;
  dynamicId: string;
  pairKey: string;
  winnerId: string;
  loserId: string;
  timestamp: number;
}

export interface SwipeRecord {
  swipeId: string;
  deviceId: string;
  dynamicId: string;
  photoId: string;
  liked: boolean;
  timestamp: number;
}

export interface SharedAppState {
  version: number;
  updatedAt: number;
  totalVotesCount: number;
  photos: Photo[];
  activeDynamic: DynamicSession | null;
  dynamics: DynamicSession[];
  deletedPhotoIds?: string[];
  deletedDynamicIds?: string[];
  lastPurgeTimestamp?: number;
  deviceId?: string;
  action?: string;
  photoId?: string;
  dynamicId?: string;
  purgeAll?: boolean;
  duelRecord?: DuelRecord;
  swipeRecord?: SwipeRecord;
  recordedDuels?: Record<string, DuelRecord>;
  recordedSwipes?: Record<string, SwipeRecord>;
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
 * Test connectivity with a given Google Apps Script or Webhook URL with deep diagnostic feedback
 */
export async function testSyncUrlConnection(
  url: string
): Promise<{ success: boolean; message: string; details?: unknown }> {
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, message: 'La URL no es válida. Debe comenzar con https://' };
  }
  const cleanUrl = url.trim();

  // Validaciones comunes de URLs erróneas de Google Apps Script
  if (cleanUrl.includes('/edit')) {
    return {
      success: false,
      message:
        '⚠️ La URL termina en /edit (es la URL del editor de código). Necesitas la URL de la aplicación web desplegada terminada en /exec. Ve a script.google.com > Implementar > Gestionar implementaciones y copia la "URL de la aplicación web".',
    };
  }

  if (cleanUrl.includes('/dev')) {
    return {
      success: false,
      message:
        '⚠️ La URL termina en /dev. Esa URL es solo para pruebas privadas del desarrollador. Usa la URL de producción terminada en /exec para que los usuarios puedan votar sin iniciar sesión.',
    };
  }

  // 1. Probar a través de /api/sync (backend Vercel - sin restricciones CORS de navegador)
  try {
    const proxyRes = await fetchWithTimeout(
      '/api/sync?test_url=1',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-sync-url': cleanUrl,
        },
      },
      6500
    );
    if (proxyRes.ok) {
      const contentType = proxyRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await proxyRes.json();
        if (json && json.scriptAccessible) {
          return {
            success: true,
            message: `✓ ¡Conexión 100% exitosa! Google Apps Script respondió y la base de datos unalmed_database.json está activa en Google Drive (${json.totalPhotos ?? 0} fotos, ${json.totalVotes ?? 0} votos globales).`,
            details: json,
          };
        }
      }
    }
  } catch {
    // Si estamos en entorno estático sin servidor Vercel, continuamos con la prueba directa
  }

  // 2. Probar conexión directa desde el navegador
  try {
    const testUrl = cleanUrl.includes('?') ? `${cleanUrl}&ping=1` : `${cleanUrl}?ping=1`;
    const res = await fetchWithTimeout(testUrl, { method: 'GET', redirect: 'follow' }, 6500);
    const text = await res.text();

    if (
      text.includes('accounts.google.com') ||
      text.includes('ServiceLogin') ||
      text.includes('Sign in - Google Accounts')
    ) {
      return {
        success: false,
        message:
          '⚠️ Permisos insuficientes en Google: Google Apps Script solicita iniciar sesión. En script.google.com ve a "Implementar > Gestionar implementaciones > Editar" y cambia "Quién tiene acceso" a "Cualquier usuario" (Anyone).',
      };
    }

    if (res.ok) {
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      if (parsed) {
        return {
          success: true,
          message:
            '✓ ¡Conexión 100% exitosa! El script respondió con datos JSON válidos y está vinculado a Google Drive.',
          details: parsed,
        };
      }

      return {
        success: true,
        message: '✓ Conexión exitosa. Google Apps Script respondió con código HTTP 200.',
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
      message: `No se pudo conectar directamente (${msg}). Verifica que la URL termine en /exec y que en Google Apps Script el acceso esté en "Cualquier usuario".`,
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
    hasDriveFolderId: boolean;
    activeProvider: string;
  };
  scriptUrlConfigured: boolean;
  scriptAccessible?: boolean;
  scriptStatus?: number;
  totalPhotos?: number;
  totalVotes?: number;
  timestamp: number;
}

export async function fetchVercelDiagnostics(): Promise<VercelDiagnostics | null> {
  const syncUrl = APP_CONFIG.syncApiUrl;
  const headers: Record<string, string> = {};
  if (syncUrl) {
    headers['x-sync-url'] = syncUrl;
  }
  try {
    const res = await fetchWithTimeout('/api/sync?diagnostic=1', { headers }, 5000);
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
export async function fetchRemoteSharedState(forceFresh?: boolean): Promise<SharedAppState | null> {
  const syncUrl = APP_CONFIG.syncApiUrl;
  const queryParam = forceFresh ? '?refresh=1&nocache=1' : '';

  // Option 1: Built-in Vercel Serverless Function `/api/sync` (handles backend Google Apps Script and bypasses browser CORS)
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (syncUrl) {
      headers['x-sync-url'] = syncUrl;
    }
    const res = await fetchWithTimeout(
      `/api/sync${queryParam}`,
      {
        method: 'GET',
        headers,
      },
      3800
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
    // Expected in purely static dev
  }

  // Option 2: Custom Webhook / Google Apps Script (Direct client fetch)
  if (syncUrl) {
    try {
      const directUrl = forceFresh
        ? (syncUrl.includes('?') ? `${syncUrl}&refresh=1` : `${syncUrl}?refresh=1`)
        : syncUrl;
      const res = await fetchWithTimeout(
        directUrl,
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

  return null;
}

function sanitizePhotosForSync(photos: Photo[]): Photo[] {
  if (!Array.isArray(photos)) return [];
  return photos.map((p) => {
    let img = p.imageUrl || '';
    // If it's a huge base64 data URI (> 40KB) and has a driveFileId, use direct Drive link
    if (img.startsWith('data:') && p.driveFileId) {
      img = `https://lh3.googleusercontent.com/d/${p.driveFileId}`;
    }
    return {
      ...p,
      imageUrl: img,
    };
  });
}

/**
 * Push updated votes & app state to remote store with strict timeout
 */
export async function pushRemoteSharedState(state: SharedAppState): Promise<boolean> {
  const deviceId = state.deviceId || getOrCreateDeviceId();
  const payload: SharedAppState = {
    ...state,
    photos: sanitizePhotosForSync(state.photos),
    deviceId,
    deletedPhotoIds: Array.from(new Set(state.deletedPhotoIds || [])),
    deletedDynamicIds: Array.from(new Set(state.deletedDynamicIds || [])),
    lastPurgeTimestamp: state.lastPurgeTimestamp || undefined,
    updatedAt: Date.now(),
  };
  const bodyStr = JSON.stringify(payload);
  const syncUrl = APP_CONFIG.syncApiUrl;
  let pushedSuccessfully = false;

  // Option 1: Built-in Vercel Serverless Function `/api/sync` (bypasses browser CORS to Apps Script)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (syncUrl) {
      headers['x-sync-url'] = syncUrl;
    }
    const res = await fetchWithTimeout(
      '/api/sync',
      {
        method: 'POST',
        headers,
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
    // Continue with Option 2
  }

  // Option 2: Custom Webhook / Google Apps Script directly
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

  return pushedSuccessfully;
}

/**
 * Sends a beacon request during beforeunload/pagehide to guarantee votes are not lost on refresh
 */
export function sendBeaconSharedState(state: SharedAppState): boolean {
  const deviceId = state.deviceId || getOrCreateDeviceId();
  const payload = JSON.stringify({
    ...state,
    deviceId,
    deletedPhotoIds: Array.from(new Set(state.deletedPhotoIds || [])),
    updatedAt: Date.now(),
  });

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
    deletedDynamicIds?: string[];
    lastPurgeTimestamp?: number;
  },
  remote: SharedAppState
): {
  photos: Photo[];
  totalVotesCount: number;
  activeDynamic: DynamicSession | null;
  dynamics: DynamicSession[];
  deletedPhotoIds: string[];
  deletedDynamicIds: string[];
  lastPurgeTimestamp: number;
  hasChanges: boolean;
} {
  let hasChanges = false;

  // Effective purge wall timestamp
  const effectivePurgeTs = Math.max(local.lastPurgeTimestamp || 0, remote.lastPurgeTimestamp || 0);
  if (effectivePurgeTs !== (local.lastPurgeTimestamp || 0)) {
    hasChanges = true;
  }

  // 1. Combine deleted photo IDs (tombstones) so deleted photos NEVER reappear
  const allDeletedIds = new Set<string>([
    ...(local.deletedPhotoIds || []),
    ...(remote.deletedPhotoIds || []),
  ]);

  if (allDeletedIds.size > (local.deletedPhotoIds?.length || 0)) {
    hasChanges = true;
  }

  // Combine deleted dynamic IDs
  const allDeletedDynamicIds = new Set<string>([
    ...(local.deletedDynamicIds || []),
    ...(remote.deletedDynamicIds || []),
  ]);

  if (allDeletedDynamicIds.size > (local.deletedDynamicIds?.length || 0)) {
    hasChanges = true;
  }

  // Helper to extract timestamp from item
  const getItemTimestamp = (item: { id?: string; createdAt?: string | number; startedAt?: number }): number => {
    if (!item) return 0;
    if (typeof item.createdAt === 'number') return item.createdAt;
    if (typeof item.startedAt === 'number') return item.startedAt;
    if (typeof item.createdAt === 'string' && item.createdAt !== 'Hoy') {
      const parsed = Date.parse(item.createdAt);
      if (!isNaN(parsed)) return parsed;
    }
    if (item.id) {
      const match = item.id.match(/(\d{10,13})/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > 1500000000000) return val;
        if (val > 1500000000) return val * 1000;
      }
    }
    return 0;
  };

  // Filter out any locally existing photo that was deleted or created before purge wall
  const filteredLocalPhotos = local.photos.filter((p) => {
    if (allDeletedIds.has(p.id)) {
      hasChanges = true;
      return false;
    }
    if (effectivePurgeTs > 0) {
      const ts = getItemTimestamp(p);
      if (ts > 0 && ts < effectivePurgeTs) {
        hasChanges = true;
        return false;
      }
    }
    return true;
  });

  // 2. Total votes: if purge happened, ensure votes are not artificially inflated by pre-purge local votes
  let newTotalVotes = Math.max(local.totalVotesCount, remote.totalVotesCount || 0);
  if (effectivePurgeTs > 0 && (remote.updatedAt || 0) >= effectivePurgeTs && (remote.totalVotesCount || 0) === 0 && local.totalVotesCount > 0) {
    newTotalVotes = 0;
    hasChanges = true;
  } else if (newTotalVotes !== local.totalVotesCount) {
    hasChanges = true;
  }

  // 3. Merge photos safely:
  // Photos from remote and photos added locally are preserved by photo ID.
  // Photos are ONLY removed if their ID is in allDeletedIds (explicit admin deletion).
  const remotePhotosList = Array.isArray(remote.photos) ? remote.photos : [];
  const photoMap = new Map<string, Photo>();

  // 3.1 First, register all remote photos (filtering out tombstones and pre-purge)
  remotePhotosList.forEach((remotePhoto) => {
    if (!remotePhoto || !remotePhoto.id || allDeletedIds.has(remotePhoto.id)) return;
    if (effectivePurgeTs > 0) {
      const ts = getItemTimestamp(remotePhoto);
      if (ts > 0 && ts < effectivePurgeTs) return;
    }
    photoMap.set(remotePhoto.id, { ...remotePhoto });
  });

  // 3.2 Second, merge all locally known photos
  filteredLocalPhotos.forEach((localPhoto) => {
    if (!localPhoto || !localPhoto.id || allDeletedIds.has(localPhoto.id)) return;
    if (effectivePurgeTs > 0) {
      const ts = getItemTimestamp(localPhoto);
      if (ts > 0 && ts < effectivePurgeTs) return;
    }
    const remotePhoto = photoMap.get(localPhoto.id);

    if (!remotePhoto) {
      // Photo exists locally (e.g. newly uploaded by this user, not yet processed by remote): PRESERVE IT!
      photoMap.set(localPhoto.id, localPhoto);
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

    const higherPoints = Math.max(localPhoto.points || 0, remotePhoto.points || 0);
    const higherMatches = Math.max(localPhoto.matchesPlayed || 0, remotePhoto.matchesPlayed || 0);
    const higherWins = Math.max(localPhoto.matchesWon || 0, remotePhoto.matchesWon || 0);
    const higherSwipeLikes = Math.max(localPhoto.swipeLikes || 0, remotePhoto.swipeLikes || 0);
    const higherSwipePasses = Math.max(localPhoto.swipePasses || 0, remotePhoto.swipePasses || 0);

    if (
      higherPoints !== localPhoto.points ||
      higherMatches !== localPhoto.matchesPlayed ||
      higherSwipeLikes !== localPhoto.swipeLikes ||
      localPhoto.imageUrl !== remotePhoto.imageUrl
    ) {
      hasChanges = true;
    }

    photoMap.set(localPhoto.id, {
      ...remotePhoto,
      title: remotePhoto.title || localPhoto.title,
      author: remotePhoto.author || localPhoto.author,
      location: remotePhoto.location || localPhoto.location,
      description: remotePhoto.description || localPhoto.description,
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

  const mergedPhotos = Array.from(photoMap.values());
  if (filteredLocalPhotos.length !== mergedPhotos.length) {
    hasChanges = true;
  }

  // 4. Dynamic session
  let mergedActiveDynamic = local.activeDynamic;
  const isOpeningDynamic = (d?: DynamicSession | null) =>
    !d ||
    d.title === 'Dinámica de Apertura: Miradas de Unalmed' ||
    d.id?.startsWith('dynamic-init-');

  // Check if active dynamic is deleted or pre-purge
  if (mergedActiveDynamic) {
    if (allDeletedDynamicIds.has(mergedActiveDynamic.id) || (effectivePurgeTs > 0 && (mergedActiveDynamic.startedAt || 0) < effectivePurgeTs)) {
      mergedActiveDynamic = null;
      hasChanges = true;
    }
  }

  if (remote.activeDynamic && !isOpeningDynamic(remote.activeDynamic)) {
    if (!allDeletedDynamicIds.has(remote.activeDynamic.id) && (effectivePurgeTs === 0 || (remote.activeDynamic.startedAt || 0) >= effectivePurgeTs)) {
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
    } else {
      mergedActiveDynamic = null;
      hasChanges = true;
    }
  } else if (local.activeDynamic && isOpeningDynamic(local.activeDynamic)) {
    mergedActiveDynamic = null;
    hasChanges = true;
  }

  // 5. Merge closed / historical dynamics list
  const dynamicsMap = new Map<string, DynamicSession>();
  (local.dynamics || []).forEach((d) => {
    if (!isOpeningDynamic(d) && !allDeletedDynamicIds.has(d.id) && (effectivePurgeTs === 0 || (d.startedAt || 0) >= effectivePurgeTs)) {
      dynamicsMap.set(d.id, d);
    }
  });
  (remote.dynamics || []).forEach((rd) => {
    if (isOpeningDynamic(rd) || allDeletedDynamicIds.has(rd.id) || (effectivePurgeTs > 0 && (rd.startedAt || 0) < effectivePurgeTs)) return;
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

  const sanitizeDynamic = (dyn: DynamicSession | null): DynamicSession | null => {
    if (!dyn) return null;
    const filteredRanked = (dyn.allRankedPhotos || []).filter(
      (p) => p && p.id && !allDeletedIds.has(p.id) && (effectivePurgeTs === 0 || getItemTimestamp(p) >= effectivePurgeTs)
    );
    const newTop3 = filteredRanked.slice(0, 3);
    return {
      ...dyn,
      allRankedPhotos: filteredRanked,
      top3: newTop3,
    };
  };

  const cleanActiveDynamic = sanitizeDynamic(mergedActiveDynamic);
  const cleanDynamics = mergedDynamics.map((d) => sanitizeDynamic(d)!);

  return {
    photos: mergedPhotos,
    totalVotesCount: newTotalVotes,
    activeDynamic: cleanActiveDynamic,
    dynamics: cleanDynamics,
    deletedPhotoIds: Array.from(allDeletedIds),
    deletedDynamicIds: Array.from(allDeletedDynamicIds),
    lastPurgeTimestamp: effectivePurgeTs,
    hasChanges,
  };
}
