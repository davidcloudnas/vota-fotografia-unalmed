import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Photo,
  CommentItem,
  AdminVoteModeSetting,
  DynamicSession,
  PhotoSnapshot,
  DriveFolderInfo,
  GoogleAdminUser,
} from '../types';
import { INITIAL_PHOTOS } from '../data/initialPhotos';
import {
  requestGoogleDriveToken,
  getAccessToken,
  getStoredGoogleUser,
  setManualAccessToken,
  clearGoogleAuth,
} from '../services/googleAuth';
import {
  getOrCreatePublicDriveFolder,
  uploadPhotoToDrive,
  fetchPublicFolderFiles,
  fetchDriveFolderDetails,
  FOLDER_NAME_DEFAULT,
} from '../services/driveService';
import { APP_CONFIG } from '../config';
import {
  fetchRemoteSharedState,
  pushRemoteSharedState,
  sendBeaconSharedState,
  mergeAppState,
  isSharedStoreConfigured,
  getActiveSyncProviderName,
} from '../services/sharedStore';

interface PhotoContextType {
  photos: Photo[];
  activeDuel: [Photo, Photo] | null;
  selectedPhoto: Photo | null;
  totalVotesCount: number;
  voteDuel: (winnerId: string, loserId: string) => void;
  voteSwipe: (photoId: string, liked: boolean) => void;
  nextDuel: () => void;
  toggleFavorite: (photoId: string) => void;
  addComment: (photoId: string, author: string, text: string) => void;
  likeComment: (photoId: string, commentId: string) => void;
  uploadPhoto: (newPhoto: {
    title: string;
    author: string;
    location: string;
    imageUrl: string;
    description: string;
    driveFileId?: string;
    driveWebViewLink?: string;
  }) => void;
  openPhotoModal: (photo: Photo) => void;
  closePhotoModal: () => void;
  resetAllData: () => void;
  clearLocalCache: () => Promise<void>;
  deletePhoto: (photoId: string) => void;

  // Voter integrity (anti-fraud & single vote per photo/duel per user)
  hasUserVotedPhoto: (photoId: string) => boolean;
  hasUserVotedDuelPair: (idA: string, idB: string) => boolean;
  userVotedPhotoIds: string[];

  // Realtime Global Synchronization (Multi-user)
  isSyncConfigured: boolean;
  syncProviderName: string;
  isSyncingGlobalVotes: boolean;
  lastGlobalSyncTime: number | null;
  syncGlobalVotes: () => Promise<boolean>;
  publishCurrentStateToGlobal: () => Promise<boolean>;
  refreshFromCloud: () => Promise<void>;
  userNotice: string | null;
  setUserNotice: (msg: string | null) => void;

  // Admin configuration
  isAdmin: boolean;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  adminVoteMode: AdminVoteModeSetting;
  setAdminVoteMode: (mode: AdminVoteModeSetting) => void;

  // Dynamic Sessions & Voting Timers
  dynamics: DynamicSession[];
  activeDynamic: DynamicSession | null;
  isVotingOpen: boolean;
  timeRemainingSeconds: number | null; // null if infinite or closed
  startNewDynamic: (title: string, durationHours: number, description?: string) => void;
  finishCurrentDynamic: () => void;
  deleteDynamic: (dynamicId: string) => void;

  // Google Drive Integration (Admin account)
  googleUser: GoogleAdminUser | null;
  driveFolder: DriveFolderInfo | null;
  isConnectingDrive: boolean;
  isUploadingToDrive: boolean;
  connectGoogleDrive: () => Promise<DriveFolderInfo | null>;
  disconnectGoogleDrive: () => void;
  setManualDriveFolder: (folderIdOrUrl: string) => void;
  setManualToken: (token: string) => void;
  syncPhotosToDrive: () => Promise<{ success: number; failed: number }>;
  loadPhotosFromDrive: (folderId?: string) => Promise<number>;
  refreshDriveFolderMetadata: (folderId?: string) => Promise<void>;
  importPhotosFromJson: (jsonData: string) => boolean;
  uploadFileToDriveFolder: (file: File | Blob, fileName: string) => Promise<{
    fileId: string;
    directImageUrl: string;
    webViewLink?: string;
  } | null>;
}

const STORAGE_KEY = 'fotografia_unalmed_photos_v2';
const VOTES_COUNTER_KEY = 'fotografia_unalmed_votes_counter_v2';
const ADMIN_MODE_KEY = 'fotografia_unalmed_admin_vote_mode';
const ADMIN_AUTH_KEY = 'fotografia_unalmed_admin_auth';
const DYNAMICS_KEY = 'fotografia_unalmed_dynamics_v1';
const ACTIVE_DYNAMIC_KEY = 'fotografia_unalmed_active_dynamic_v1';
const DRIVE_FOLDER_KEY = 'fotografia_unalmed_drive_folder_v1';

// Contraseña de administrador
const ADMIN_PASSWORD_DEFAULT = 'unalmed2026';

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

function getRandomPair(photos: Photo[]): [Photo, Photo] | null {
  if (photos.length < 2) return null;
  const firstIndex = Math.floor(Math.random() * photos.length);
  let secondIndex = Math.floor(Math.random() * photos.length);
  while (secondIndex === firstIndex) {
    secondIndex = Math.floor(Math.random() * photos.length);
  }
  return [photos[firstIndex], photos[secondIndex]];
}

export const PhotoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [photos, setPhotos] = useState<Photo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p) => ({
            ...p,
            points: typeof p.points === 'number' ? p.points : (typeof p.elo === 'number' ? p.elo : 1200),
          }));
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_PHOTOS;
  });

  const [totalVotesCount, setTotalVotesCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(VOTES_COUNTER_KEY);
      if (saved) return parseInt(saved, 10) || 0;
    } catch {
      // fallback
    }
    return 0;
  });

  const [adminVoteMode, setAdminVoteModeState] = useState<AdminVoteModeSetting>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_MODE_KEY) as AdminVoteModeSetting;
      if (saved === '1v1' || saved === 'swipe' || saved === 'both') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'both';
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Dynamics state
  const [dynamics, setDynamics] = useState<DynamicSession[]>(() => {
    try {
      const saved = localStorage.getItem(DYNAMICS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (d) =>
              d.title !== 'Dinámica de Apertura: Miradas de Unalmed' &&
              !d.id?.startsWith('dynamic-init-')
          );
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [activeDynamic, setActiveDynamic] = useState<DynamicSession | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_DYNAMIC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (
            parsed.title === 'Dinámica de Apertura: Miradas de Unalmed' ||
            parsed.id?.startsWith('dynamic-init-')
          ) {
            localStorage.removeItem(ACTIVE_DYNAMIC_KEY);
            return null;
          }
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [activeDuel, setActiveDuel] = useState<[Photo, Photo] | null>(() => {
    return getRandomPair(INITIAL_PHOTOS);
  });

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);

  // Google Drive state
  const [googleUser, setGoogleUser] = useState<GoogleAdminUser | null>(() => {
    return getStoredGoogleUser();
  });
  const [isConnectingDrive, setIsConnectingDrive] = useState<boolean>(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<boolean>(false);
  const [driveFolder, setDriveFolder] = useState<DriveFolderInfo | null>(() => {
    try {
      const saved = localStorage.getItem(DRIVE_FOLDER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    if (APP_CONFIG.defaultDriveFolderId) {
      return {
        folderId: APP_CONFIG.defaultDriveFolderId,
        folderName: 'Fotografia Unalmed',
        webViewLink: `https://drive.google.com/drive/folders/${APP_CONFIG.defaultDriveFolderId}`,
        isPublic: true,
      };
    }
    return null;
  });

  // Global multi-user sync state
  const DELETED_PHOTOS_KEY = 'fotografia_unalmed_deleted_ids_v1';
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(DELETED_PHOTOS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Voter integrity state (per-dynamic tracking to prevent double voting & infinite swipes)
  const [userVotedPhotoIds, setUserVotedPhotoIds] = useState<string[]>(() => {
    try {
      const dynKey = activeDynamic?.id || 'general';
      const stored = localStorage.getItem(`unalmed_user_voted_photos_${dynKey}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [userVotedDuelPairs, setUserVotedDuelPairs] = useState<string[]>(() => {
    try {
      const dynKey = activeDynamic?.id || 'general';
      const stored = localStorage.getItem(`unalmed_user_duel_pairs_${dynKey}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const dynKey = activeDynamic?.id || 'general';
      const storedPhotos = localStorage.getItem(`unalmed_user_voted_photos_${dynKey}`);
      setUserVotedPhotoIds(storedPhotos ? JSON.parse(storedPhotos) : []);
      const storedPairs = localStorage.getItem(`unalmed_user_duel_pairs_${dynKey}`);
      setUserVotedDuelPairs(storedPairs ? JSON.parse(storedPairs) : []);
    } catch {
      setUserVotedPhotoIds([]);
      setUserVotedDuelPairs([]);
    }
  }, [activeDynamic?.id]);

  const hasUserVotedPhoto = useCallback(
    (photoId: string): boolean => {
      return userVotedPhotoIds.includes(photoId);
    },
    [userVotedPhotoIds]
  );

  const hasUserVotedDuelPair = useCallback(
    (idA: string, idB: string): boolean => {
      const pairKey = [idA, idB].sort().join('__');
      return userVotedDuelPairs.includes(pairKey);
    },
    [userVotedDuelPairs]
  );

  const [isSyncingGlobalVotes, setIsSyncingGlobalVotes] = useState(false);
  const [lastGlobalSyncTime, setLastGlobalSyncTime] = useState<number | null>(null);
  const [userNotice, setUserNotice] = useState<string | null>(null);
  const isSyncConfigured = isSharedStoreConfigured();
  const syncProviderName = getActiveSyncProviderName();
  const syncTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserActionRef = React.useRef<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(DELETED_PHOTOS_KEY, JSON.stringify(deletedPhotoIds));
    } catch {
      // storage
    }
  }, [deletedPhotoIds]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    } catch {
      // storage quota
    }
  }, [photos]);

  useEffect(() => {
    try {
      localStorage.setItem(VOTES_COUNTER_KEY, totalVotesCount.toString());
    } catch {
      // storage quota
    }
  }, [totalVotesCount]);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_MODE_KEY, adminVoteMode);
    } catch {
      // storage
    }
  }, [adminVoteMode]);

  useEffect(() => {
    try {
      if (isAdmin) {
        localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      } else {
        localStorage.removeItem(ADMIN_AUTH_KEY);
      }
    } catch {
      // storage
    }
  }, [isAdmin]);

  useEffect(() => {
    try {
      localStorage.setItem(DYNAMICS_KEY, JSON.stringify(dynamics));
    } catch {
      // storage
    }
  }, [dynamics]);

  useEffect(() => {
    try {
      if (activeDynamic) {
        localStorage.setItem(ACTIVE_DYNAMIC_KEY, JSON.stringify(activeDynamic));
      } else {
        localStorage.removeItem(ACTIVE_DYNAMIC_KEY);
      }
    } catch {
      // storage
    }
  }, [activeDynamic]);

  useEffect(() => {
    try {
      if (driveFolder) {
        localStorage.setItem(DRIVE_FOLDER_KEY, JSON.stringify(driveFolder));
      } else {
        localStorage.removeItem(DRIVE_FOLDER_KEY);
      }
    } catch {
      // storage
    }
  }, [driveFolder]);

  // Connect Google Drive function (Admin)
  const connectGoogleDrive = async (): Promise<DriveFolderInfo | null> => {
    setIsConnectingDrive(true);
    try {
      const authResult = await requestGoogleDriveToken();
      if (!authResult?.accessToken) throw new Error('No se completó la autenticación con Google.');

      setGoogleUser(authResult.user || { email: 'Cuenta de Administrador Google' });
      // Create or locate the public folder in the admin's personal drive
      const folder = await getOrCreatePublicDriveFolder(
        authResult.accessToken,
        FOLDER_NAME_DEFAULT
      );
      setDriveFolder(folder);
      return folder;
    } catch (err) {
      console.error('Error conectando Google Drive:', err);
      throw err;
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const disconnectGoogleDrive = () => {
    clearGoogleAuth();
    setGoogleUser(null);
  };

  const setManualToken = (token: string) => {
    if (!token.trim()) return;
    setManualAccessToken(token.trim());
    setGoogleUser({ email: 'Token de Google configurado' });
  };

  const refreshDriveFolderMetadata = useCallback(
    async (folderIdToQuery?: string) => {
      const targetId = folderIdToQuery || driveFolder?.folderId || APP_CONFIG.defaultDriveFolderId;
      if (!targetId) return;

      try {
        const token = await getAccessToken();
        const details = await fetchDriveFolderDetails(
          targetId,
          undefined,
          token || undefined
        );
        if (details && details.name) {
          setDriveFolder((prev) => {
            if (!prev) {
              return {
                folderId: details.id,
                folderName: details.name,
                webViewLink:
                  details.webViewLink || `https://drive.google.com/drive/folders/${details.id}`,
                isPublic: true,
              };
            }
            if (
              prev.folderName !== details.name ||
              (details.webViewLink && prev.webViewLink !== details.webViewLink)
            ) {
              return {
                ...prev,
                folderName: details.name,
                webViewLink: details.webViewLink || prev.webViewLink,
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('No se pudo refrescar los metadatos de la carpeta de Drive:', err);
      }
    },
    [driveFolder?.folderId]
  );

  // Sync folder name metadata on startup
  useEffect(() => {
    refreshDriveFolderMetadata();
  }, [refreshDriveFolderMetadata]);

  const setManualDriveFolder = async (input: string) => {
    if (!input.trim()) return;
    let folderId = input.trim();
    const match = folderId.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (match) {
      folderId = match[1];
    }
    const token = await getAccessToken();
    const details = await fetchDriveFolderDetails(
      folderId,
      undefined,
      token || undefined
    );
    const folderInfo: DriveFolderInfo = {
      folderId,
      folderName: details?.name || 'Fotografia Unalmed',
      webViewLink: details?.webViewLink || `https://drive.google.com/drive/folders/${folderId}`,
      isPublic: true,
    };
    setDriveFolder(folderInfo);
  };

  const syncPhotosToDrive = async (): Promise<{ success: number; failed: number }> => {
    const token = await getAccessToken();
    if (!token || !driveFolder) {
      throw new Error('Debes iniciar sesión con Google Drive como administrador para sincronizar a la carpeta.');
    }

    const pendingPhotos = photos.filter((p) => !p.driveFileId);
    let successCount = 0;
    let failedCount = 0;

    for (const photo of pendingPhotos) {
      try {
        let blob: Blob;
        if (photo.imageUrl.startsWith('data:')) {
          const res = await fetch(photo.imageUrl);
          blob = await res.blob();
        } else {
          const res = await fetch(photo.imageUrl);
          blob = await res.blob();
        }

        const safeTitle = photo.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
        const fileName = `${safeTitle}_${photo.id}.jpg`;
        const resDrive = await uploadPhotoToDrive(token, driveFolder.folderId, blob, fileName);

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  driveFileId: resDrive.fileId,
                  driveWebViewLink: resDrive.webViewLink,
                  imageUrl: resDrive.directImageUrl,
                  syncedToDrive: true,
                }
              : p
          )
        );
        successCount++;
      } catch (err) {
        console.error('Error sincronizando foto individual a Drive:', photo.id, err);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  };

  // Load photos directly from the public Google Drive folder
  const loadPhotosFromDrive = async (folderId?: string): Promise<number> => {
    const targetFolderId = folderId || driveFolder?.folderId || APP_CONFIG.defaultDriveFolderId;
    if (!targetFolderId) {
      throw new Error('No hay carpeta de Google Drive configurada.');
    }

    // Refresh folder name and metadata dynamically from Drive
    refreshDriveFolderMetadata(targetFolderId);

    const token = await getAccessToken();
    if (!token) {
      throw new Error(
        'Debes vincular tu cuenta con Google Drive para leer o recargar las fotos de la carpeta. Presiona "Vincular mi Google Drive" en la parte superior.'
      );
    }

    const driveFiles = await fetchPublicFolderFiles(
      targetFolderId,
      undefined,
      token || undefined
    );

    if (!driveFiles || driveFiles.length === 0) {
      return 0;
    }

    let addedCount = 0;
    setPhotos((prev) => {
      const existingIds = new Set(prev.map((p) => p.driveFileId).filter(Boolean));
      const newItems: Photo[] = [];

      driveFiles.forEach((df, idx) => {
        if (!existingIds.has(df.fileId)) {
          newItems.push({
            id: 'drive-' + df.fileId,
            title: df.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            author: 'Comunidad Unalmed',
            location: 'Campus El Volador',
            imageUrl: df.directImageUrl,
            driveFileId: df.fileId,
            driveWebViewLink: df.webViewLink,
            syncedToDrive: true,
            description: 'Fotografía sincronizada desde la carpeta pública de Google Drive.',
            points: 1200 + (driveFiles.length - idx) * 3,
            matchesPlayed: 0,
            matchesWon: 0,
            swipeLikes: 0,
            swipePasses: 0,
            comments: [],
            isFavorite: false,
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      });

      if (newItems.length === 0) return prev;
      isUserActionRef.current = true;
      return [...prev, ...newItems];
    });

    return addedCount;
  };

  // Import photos from JSON string
  const importPhotosFromJson = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPhotos(parsed);
        return true;
      }
    } catch (err) {
      console.error('Error importando catálogo JSON:', err);
    }
    return false;
  };

  // Upload file to Drive folder: ONLY uploads if token is present; does NOT prompt popup for students!
  const uploadFileToDriveFolder = async (
    file: File | Blob,
    fileName: string
  ): Promise<{ fileId: string; directImageUrl: string; webViewLink?: string } | null> => {
    const token = await getAccessToken();
    const currentFolder = driveFolder;

    // If no token or folder is available, return null without bothering the visitor
    if (!token || !currentFolder) {
      return null;
    }

    setIsUploadingToDrive(true);
    try {
      const res = await uploadPhotoToDrive(token, currentFolder.folderId, file, fileName);
      return {
        fileId: res.fileId,
        directImageUrl: res.directImageUrl,
        webViewLink: res.webViewLink,
      };
    } catch (err) {
      console.warn('No se pudo subir a Drive en segundo plano:', err);
      return null;
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const syncGlobalVotes = useCallback(async (): Promise<boolean> => {
    setIsSyncingGlobalVotes(true);
    try {
      const fetchPromise = fetchRemoteSharedState();
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const remote = await Promise.race([fetchPromise, timeoutPromise]);

      if (remote) {
        setPhotos((prev) => {
          const currentLocal = latestStateRef.current;
          const merged = mergeAppState(
            {
              photos: prev,
              totalVotesCount: currentLocal.totalVotesCount,
              activeDynamic: currentLocal.activeDynamic,
              dynamics: currentLocal.dynamics,
              deletedPhotoIds: currentLocal.deletedPhotoIds,
            },
            remote
          );
          if (merged.hasChanges) {
            setTotalVotesCount(merged.totalVotesCount);
            setActiveDynamic(merged.activeDynamic);
            setDynamics(merged.dynamics || []);
            setDeletedPhotoIds(merged.deletedPhotoIds || []);
            setActiveDuel((prevDuel) => {
              if (
                !prevDuel ||
                !merged.photos.some((p) => p.id === prevDuel[0].id) ||
                !merged.photos.some((p) => p.id === prevDuel[1].id)
              ) {
                return getRandomPair(merged.photos);
              }
              return prevDuel;
            });
            return merged.photos;
          }
          return prev;
        });
        setLastGlobalSyncTime(Date.now());
        return true;
      }
    } catch (err) {
      console.warn('Error sincronizando votos globales:', err);
    } finally {
      setIsSyncingGlobalVotes(false);
    }
    return false;
  }, []);

  const publishCurrentStateToGlobal = useCallback(async (): Promise<boolean> => {
    setIsSyncingGlobalVotes(true);
    try {
      const pushPromise = pushRemoteSharedState({
        version: 1,
        updatedAt: Date.now(),
        totalVotesCount,
        photos,
        activeDynamic,
        dynamics,
        deletedPhotoIds,
      });
      const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5500));
      const ok = await Promise.race([pushPromise, timeoutPromise]);
      if (ok) {
        setLastGlobalSyncTime(Date.now());
      }
      return ok;
    } catch (err) {
      console.error('Error publicando estado global:', err);
      return false;
    } finally {
      setIsSyncingGlobalVotes(false);
    }
  }, [totalVotesCount, photos, activeDynamic, dynamics, deletedPhotoIds]);

  // Keep ref to latest state for unload/refresh protection
  const latestStateRef = React.useRef({
    photos,
    totalVotesCount,
    activeDynamic,
    dynamics,
    deletedPhotoIds,
  });
  latestStateRef.current = { photos, totalVotesCount, activeDynamic, dynamics, deletedPhotoIds };
  const hasPendingPushRef = React.useRef(false);

  // Initial pull on enter and periodic background polling (every 8 seconds)
  // Allows new votes and photos from other students to appear without page reload
  useEffect(() => {
    syncGlobalVotes();
    const interval = setInterval(() => {
      syncGlobalVotes();
    }, 8000);
    return () => clearInterval(interval);
  }, [syncGlobalVotes]);

  // Push to remote store when user votes, with fast 350ms debounce
  useEffect(() => {
    if (!isUserActionRef.current) return;
    isUserActionRef.current = false;
    hasPendingPushRef.current = true;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await pushRemoteSharedState({
          version: 1,
          updatedAt: Date.now(),
          totalVotesCount: latestStateRef.current.totalVotesCount,
          photos: latestStateRef.current.photos,
          activeDynamic: latestStateRef.current.activeDynamic,
          dynamics: latestStateRef.current.dynamics,
        });
        hasPendingPushRef.current = false;
        setLastGlobalSyncTime(Date.now());
      } catch (err) {
        console.warn('Error guardando votos compartidos:', err);
      }
    }, 350);
  }, [photos, totalVotesCount, activeDynamic, dynamics]);

  // Prevent losing votes if user refreshes or closes the page immediately after voting
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasPendingPushRef.current) {
        sendBeaconSharedState({
          version: 1,
          updatedAt: Date.now(),
          totalVotesCount: latestStateRef.current.totalVotesCount,
          photos: latestStateRef.current.photos,
          activeDynamic: latestStateRef.current.activeDynamic,
          dynamics: latestStateRef.current.dynamics,
        });
        hasPendingPushRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasPendingPushRef.current) {
        sendBeaconSharedState({
          version: 1,
          updatedAt: Date.now(),
          totalVotesCount: latestStateRef.current.totalVotesCount,
          photos: latestStateRef.current.photos,
          activeDynamic: latestStateRef.current.activeDynamic,
          dynamics: latestStateRef.current.dynamics,
        });
        hasPendingPushRef.current = false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Keep active duel updated if photos change, without interrupting an ongoing duel
  useEffect(() => {
    if (!activeDuel && photos.length >= 2) {
      setActiveDuel(getRandomPair(photos));
    } else if (activeDuel) {
      const p0 = photos.find((p) => p.id === activeDuel[0]?.id);
      const p1 = photos.find((p) => p.id === activeDuel[1]?.id);
      if (!p0 || !p1) {
        setActiveDuel(photos.length >= 2 ? getRandomPair(photos) : null);
      } else if (p0 !== activeDuel[0] || p1 !== activeDuel[1]) {
        // Update photo stats seamlessly in place
        setActiveDuel([p0, p1]);
      }
    }
  }, [photos]);

  // Timer countdown and auto-closure of active dynamic
  useEffect(() => {
    if (!activeDynamic || activeDynamic.isClosed) {
      setTimeRemainingSeconds(null);
      return;
    }

    if (activeDynamic.durationHours <= 0) {
      setTimeRemainingSeconds(null);
      return;
    }

    const durationMs = activeDynamic.durationHours * 3600 * 1000;
    const expirationTimestamp = activeDynamic.startedAt + durationMs;

    const updateTimer = () => {
      const now = Date.now();
      const remainingMs = expirationTimestamp - now;
      if (remainingMs <= 0) {
        setTimeRemainingSeconds(0);
        finishCurrentDynamic();
      } else {
        setTimeRemainingSeconds(Math.ceil(remainingMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeDynamic?.id, activeDynamic?.durationHours, activeDynamic?.startedAt, activeDynamic?.isClosed, photos, totalVotesCount]);

  const setAdminVoteMode = (mode: AdminVoteModeSetting) => {
    setAdminVoteModeState(mode);
  };

  const loginAdmin = (password: string): boolean => {
    if (password.trim() === ADMIN_PASSWORD_DEFAULT) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
  };

  const nextDuel = () => {
    if (photos.length < 2) {
      setActiveDuel(null);
      return;
    }
    // Prioritize an unvoted matchup for this user
    for (let attempts = 0; attempts < 15; attempts++) {
      const candidate = getRandomPair(photos);
      if (candidate) {
        const pairKey = [candidate[0].id, candidate[1].id].sort().join('__');
        if (!userVotedDuelPairs.includes(pairKey)) {
          setActiveDuel(candidate);
          return;
        }
      }
    }
    setActiveDuel(getRandomPair(photos));
  };

  const isVotingOpen = Boolean(activeDynamic && !activeDynamic.isClosed);

  const voteDuel = (winnerId: string, loserId: string) => {
    if (!isVotingOpen) return;
    const dynKey = activeDynamic?.id || 'general';
    const pairKey = [winnerId, loserId].sort().join('__');

    if (userVotedDuelPairs.includes(pairKey)) {
      setUserNotice('Ya has votado en este enfrentamiento. Mostrando el siguiente duelo...');
      setTimeout(() => setUserNotice(null), 3000);
      nextDuel();
      return;
    }

    isUserActionRef.current = true;

    setUserVotedDuelPairs((prev) => {
      if (prev.includes(pairKey)) return prev;
      const next = [...prev, pairKey];
      try {
        localStorage.setItem(`unalmed_user_duel_pairs_${dynKey}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    setPhotos((prev) => {
      const winner = prev.find((p) => p.id === winnerId);
      const loser = prev.find((p) => p.id === loserId);
      if (!winner || !loser) return prev;

      const K = 32;
      const expectedWinner = 1 / (1 + Math.pow(10, (loser.points - winner.points) / 400));
      const expectedLoser = 1 / (1 + Math.pow(10, (winner.points - loser.points) / 400));

      const newWinnerPoints = Math.round(winner.points + K * (1 - expectedWinner));
      const newLoserPoints = Math.max(800, Math.round(loser.points + K * (0 - expectedLoser)));

      return prev.map((p) => {
        if (p.id === winnerId) {
          return {
            ...p,
            points: newWinnerPoints,
            matchesPlayed: p.matchesPlayed + 1,
            matchesWon: p.matchesWon + 1,
          };
        }
        if (p.id === loserId) {
          return {
            ...p,
            points: newLoserPoints,
            matchesPlayed: p.matchesPlayed + 1,
          };
        }
        return p;
      });
    });

    setTotalVotesCount((c) => c + 1);
    nextDuel();
  };

  const voteSwipe = (photoId: string, liked: boolean) => {
    if (!isVotingOpen) return;
    const dynKey = activeDynamic?.id || 'general';

    // Anti-fraud: cannot vote twice for the same photo in this dynamic
    if (userVotedPhotoIds.includes(photoId)) {
      setUserNotice('Esta fotografía ya fue calificada en esta sesión. No se puede votar dos veces.');
      setTimeout(() => setUserNotice(null), 3500);
      return;
    }

    isUserActionRef.current = true;

    // Register user vote in this dynamic
    setUserVotedPhotoIds((prev) => {
      if (prev.includes(photoId)) return prev;
      const next = [...prev, photoId];
      try {
        localStorage.setItem(`unalmed_user_voted_photos_${dynKey}`, JSON.stringify(next));
      } catch {}
      return next;
    });

    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        if (liked) {
          return {
            ...p,
            swipeLikes: p.swipeLikes + 1,
            points: p.points + 10,
          };
        } else {
          return {
            ...p,
            swipePasses: p.swipePasses + 1,
            points: Math.max(800, p.points - 4),
          };
        }
      })
    );
    setTotalVotesCount((c) => c + 1);
  };

  const toggleFavorite = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  const addComment = (photoId: string, author: string, text: string) => {
    if (!text.trim()) return;
    isUserActionRef.current = true;
    const newComment: CommentItem = {
      id: 'c-' + Date.now(),
      author: author.trim() || 'Estudiante Unal',
      text: text.trim(),
      createdAt: 'Hace un momento',
      likes: 0,
    };

    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        return {
          ...p,
          comments: [newComment, ...p.comments],
        };
      })
    );
  };

  const likeComment = (photoId: string, commentId: string) => {
    isUserActionRef.current = true;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, likes: c.likes + 1 } : c
          ),
        };
      })
    );
  };

  const uploadPhoto = (newPhotoData: {
    title: string;
    author: string;
    location: string;
    imageUrl: string;
    description: string;
    driveFileId?: string;
    driveWebViewLink?: string;
  }) => {
    isUserActionRef.current = true;
    const newPhoto: Photo = {
      id: 'unal-user-' + Date.now(),
      title: newPhotoData.title.trim() || 'Fotografía Sin Título',
      author: newPhotoData.author.trim() || 'Comunidad Unalmed',
      location: newPhotoData.location.trim() || 'Medellín',
      imageUrl: newPhotoData.imageUrl,
      driveFileId: newPhotoData.driveFileId,
      driveWebViewLink: newPhotoData.driveWebViewLink,
      description: newPhotoData.description.trim(),
      points: 1200,
      matchesPlayed: 0,
      matchesWon: 0,
      swipeLikes: 0,
      swipePasses: 0,
      comments: [],
      isFavorite: false,
      createdAt: 'Hoy',
    };

    setPhotos((prev) => {
      const updated = [newPhoto, ...prev];
      latestStateRef.current.photos = updated;
      // Immediate push to Google Apps Script / Vercel cloud
      pushRemoteSharedState({
        version: 1,
        updatedAt: Date.now(),
        totalVotesCount: latestStateRef.current.totalVotesCount,
        photos: updated,
        activeDynamic: latestStateRef.current.activeDynamic,
        dynamics: latestStateRef.current.dynamics,
        deletedPhotoIds: latestStateRef.current.deletedPhotoIds,
      }).catch((e) => console.warn('Error sincronizando foto nueva:', e));
      return updated;
    });
  };

  const deletePhoto = (photoId: string) => {
    isUserActionRef.current = true;
    const nextDeletedIds = Array.from(new Set([...(latestStateRef.current.deletedPhotoIds || []), photoId]));
    setDeletedPhotoIds(nextDeletedIds);

    setPhotos((prev) => {
      const updatedPhotos = prev.filter((p) => p.id !== photoId);
      latestStateRef.current.photos = updatedPhotos;
      latestStateRef.current.deletedPhotoIds = nextDeletedIds;

      // Immediate remote push with tombstone so other devices delete it instantly!
      pushRemoteSharedState({
        version: 1,
        updatedAt: Date.now(),
        totalVotesCount: latestStateRef.current.totalVotesCount,
        photos: updatedPhotos,
        activeDynamic: latestStateRef.current.activeDynamic,
        dynamics: latestStateRef.current.dynamics,
        deletedPhotoIds: nextDeletedIds,
      }).catch((e) => console.warn('Error sincronizando eliminación de foto:', e));

      return updatedPhotos;
    });

    setUserNotice('Foto eliminada. Recuerda refrescar la página en tu teléfono u otros dispositivos para ver los cambios de inmediato.');
    setTimeout(() => setUserNotice(null), 8000);

    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(null);
    }

    setActiveDuel((prevDuel) => {
      if (prevDuel && (prevDuel[0].id === photoId || prevDuel[1].id === photoId)) {
        const remaining = photos.filter((p) => p.id !== photoId);
        return getRandomPair(remaining);
      }
      return prevDuel;
    });
  };

  const openPhotoModal = (photo: Photo) => {
    setSelectedPhotoId(photo.id);
  };

  const closePhotoModal = () => {
    setSelectedPhotoId(null);
  };

  // Close current dynamic and save final results & Top 3 snapshot
  const finishCurrentDynamic = useCallback(() => {
    if (!activeDynamic || activeDynamic.isClosed) return;
    isUserActionRef.current = true;

    const rankedSnapshots: PhotoSnapshot[] = [...photos]
      .sort((a, b) => b.points - a.points)
      .map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author,
        location: p.location,
        imageUrl: p.imageUrl,
        description: p.description,
        points: p.points,
        matchesPlayed: p.matchesPlayed,
        matchesWon: p.matchesWon,
        swipeLikes: p.swipeLikes,
      }));

    const top3 = rankedSnapshots.slice(0, 3);

    const closedDynamic: DynamicSession = {
      ...activeDynamic,
      isClosed: true,
      closedAt: Date.now(),
      totalVotesAtClose: totalVotesCount,
      allRankedPhotos: rankedSnapshots,
      top3,
    };

    setActiveDynamic(closedDynamic);
    setDynamics((prev) => {
      const exists = prev.some((d) => d.id === closedDynamic.id);
      const nextDynamics = exists
        ? prev.map((d) => (d.id === closedDynamic.id ? closedDynamic : d))
        : [closedDynamic, ...prev];

      latestStateRef.current.activeDynamic = closedDynamic;
      latestStateRef.current.dynamics = nextDynamics;

      pushRemoteSharedState({
        version: 1,
        updatedAt: Date.now(),
        totalVotesCount,
        photos,
        activeDynamic: closedDynamic,
        dynamics: nextDynamics,
        deletedPhotoIds: latestStateRef.current.deletedPhotoIds,
      }).catch((e) => console.warn('Error sincronizando cierre de dinámica:', e));

      return nextDynamics;
    });
  }, [activeDynamic, photos, totalVotesCount]);

  const startNewDynamic = (title: string, durationHours: number, description?: string) => {
    if (activeDynamic && !activeDynamic.isClosed) {
      finishCurrentDynamic();
    }
    isUserActionRef.current = true;

    const resetPhotos = photos.map((p) => ({
      ...p,
      points: 1200,
      matchesPlayed: 0,
      matchesWon: 0,
      swipeLikes: 0,
      swipePasses: 0,
    }));

    setPhotos(resetPhotos);
    setTotalVotesCount(0);

    const newDynamic: DynamicSession = {
      id: 'dynamic-' + Date.now(),
      title: title.trim() || 'Nueva Dinámica de Votación',
      description: description?.trim() || 'Participa votando en duelos o swipe por las mejores fotos de Unalmed.',
      startedAt: Date.now(),
      durationHours: durationHours >= 0 ? durationHours : 0,
      closedAt: null,
      isClosed: false,
      totalVotesAtClose: 0,
      top3: [],
      allRankedPhotos: [],
    };

    setActiveDynamic(newDynamic);
    setActiveDuel(getRandomPair(resetPhotos));

    latestStateRef.current.photos = resetPhotos;
    latestStateRef.current.totalVotesCount = 0;
    latestStateRef.current.activeDynamic = newDynamic;

    pushRemoteSharedState({
      version: 1,
      updatedAt: Date.now(),
      totalVotesCount: 0,
      photos: resetPhotos,
      activeDynamic: newDynamic,
      dynamics: latestStateRef.current.dynamics,
      deletedPhotoIds: latestStateRef.current.deletedPhotoIds,
    }).catch((e) => console.warn('Error sincronizando inicio de dinámica:', e));
  };

  const deleteDynamic = (dynamicId: string) => {
    isUserActionRef.current = true;
    const nextActive = activeDynamic?.id === dynamicId ? null : activeDynamic;
    if (activeDynamic?.id === dynamicId) {
      setActiveDynamic(null);
    }
    setDynamics((prev) => {
      const nextDynamics = prev.filter((d) => d.id !== dynamicId);
      latestStateRef.current.dynamics = nextDynamics;
      latestStateRef.current.activeDynamic = nextActive;

      pushRemoteSharedState({
        version: 1,
        updatedAt: Date.now(),
        totalVotesCount: latestStateRef.current.totalVotesCount,
        photos: latestStateRef.current.photos,
        activeDynamic: nextActive,
        dynamics: nextDynamics,
        deletedPhotoIds: latestStateRef.current.deletedPhotoIds,
      }).catch((e) => console.warn('Error sincronizando eliminación de dinámica:', e));

      return nextDynamics;
    });
  };

  const resetAllData = () => {
    isUserActionRef.current = true;
    setPhotos([]);
    setTotalVotesCount(0);
    setActiveDuel(null);
    setDynamics([]);
    setActiveDynamic(null);
    setDriveFolder(null);
    setDeletedPhotoIds([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VOTES_COUNTER_KEY);
    localStorage.removeItem(DYNAMICS_KEY);
    localStorage.removeItem(ACTIVE_DYNAMIC_KEY);
    localStorage.removeItem(DRIVE_FOLDER_KEY);
    localStorage.removeItem(DELETED_PHOTOS_KEY);

    latestStateRef.current = {
      photos: [],
      totalVotesCount: 0,
      activeDynamic: null,
      dynamics: [],
      deletedPhotoIds: [],
    };

    // Push empty state to remote store so cloud is cleared too
    pushRemoteSharedState({
      version: 1,
      updatedAt: Date.now(),
      totalVotesCount: 0,
      photos: [],
      activeDynamic: null,
      dynamics: [],
      deletedPhotoIds: [],
    }).catch((e) => console.warn('Error al vaciar datos remotos:', e));
  };

  const clearLocalCache = async () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VOTES_COUNTER_KEY);
    localStorage.removeItem(DYNAMICS_KEY);
    localStorage.removeItem(ACTIVE_DYNAMIC_KEY);
    localStorage.removeItem(DELETED_PHOTOS_KEY);
    await syncGlobalVotes();
  };

  const refreshFromCloud = useCallback(async () => {
    setIsSyncingGlobalVotes(true);
    try {
      const remote = await fetchRemoteSharedState();
      if (remote && Array.isArray(remote.photos)) {
        const deletedSet = new Set(remote.deletedPhotoIds || []);
        const cleanPhotos = remote.photos.filter((p) => !deletedSet.has(p.id));

        setPhotos(cleanPhotos);
        setTotalVotesCount(typeof remote.totalVotesCount === 'number' ? remote.totalVotesCount : 0);
        setActiveDynamic(remote.activeDynamic || null);
        setDynamics(remote.dynamics || []);
        setDeletedPhotoIds(remote.deletedPhotoIds || []);
        setActiveDuel(cleanPhotos.length >= 2 ? getRandomPair(cleanPhotos) : null);

        latestStateRef.current = {
          photos: cleanPhotos,
          totalVotesCount: remote.totalVotesCount,
          activeDynamic: remote.activeDynamic || null,
          dynamics: remote.dynamics || [],
          deletedPhotoIds: remote.deletedPhotoIds || [],
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanPhotos));
          localStorage.setItem(VOTES_COUNTER_KEY, String(remote.totalVotesCount));
          if (remote.activeDynamic) {
            localStorage.setItem(ACTIVE_DYNAMIC_KEY, JSON.stringify(remote.activeDynamic));
          } else {
            localStorage.removeItem(ACTIVE_DYNAMIC_KEY);
          }
          localStorage.setItem(DYNAMICS_KEY, JSON.stringify(remote.dynamics || []));
          localStorage.setItem(DELETED_PHOTOS_KEY, JSON.stringify(remote.deletedPhotoIds || []));
        } catch {}

        if (driveFolder?.folderId) {
          loadPhotosFromDrive().catch(() => {});
        }

        setUserNotice('✓ ¡Todo actualizado: fotos, puntajes, dinámicas y tiempos desde Google Drive!');
      } else {
        await syncGlobalVotes();
        if (driveFolder?.folderId) {
          await loadPhotosFromDrive();
        }
        setUserNotice('✓ Catálogo y fotos sincronizados con Google Drive.');
      }
      setLastGlobalSyncTime(Date.now());
      setTimeout(() => setUserNotice(null), 5000);
    } catch {
      setUserNotice('No se pudo completar la actualización desde la nube.');
      setTimeout(() => setUserNotice(null), 3500);
    } finally {
      setIsSyncingGlobalVotes(false);
    }
  }, [driveFolder?.folderId, syncGlobalVotes, loadPhotosFromDrive]);

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId) || null;

  return (
    <PhotoContext.Provider
      value={{
        photos,
        activeDuel,
        selectedPhoto,
        totalVotesCount,
        voteDuel,
        voteSwipe,
        nextDuel,
        toggleFavorite,
        addComment,
        likeComment,
        uploadPhoto,
        openPhotoModal,
        closePhotoModal,
        resetAllData,
        clearLocalCache,
        deletePhoto,
        hasUserVotedPhoto,
        hasUserVotedDuelPair,
        userVotedPhotoIds,
        isSyncConfigured,
        syncProviderName,
        isSyncingGlobalVotes,
        lastGlobalSyncTime,
        syncGlobalVotes,
        publishCurrentStateToGlobal,
        refreshFromCloud,
        userNotice,
        setUserNotice,
        isAdmin,
        loginAdmin,
        logoutAdmin,
        adminVoteMode,
        setAdminVoteMode,
        dynamics,
        activeDynamic,
        isVotingOpen,
        timeRemainingSeconds,
        startNewDynamic,
        finishCurrentDynamic,
        deleteDynamic,
        googleUser,
        driveFolder,
        isConnectingDrive,
        isUploadingToDrive,
        connectGoogleDrive,
        disconnectGoogleDrive,
        setManualDriveFolder,
        setManualToken,
        syncPhotosToDrive,
        loadPhotosFromDrive,
        refreshDriveFolderMetadata,
        importPhotosFromJson,
        uploadFileToDriveFolder,
      }}
    >
      {children}
    </PhotoContext.Provider>
  );
};

export const usePhotos = () => {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhotos debe utilizarse dentro de un PhotoProvider');
  }
  return context;
};
