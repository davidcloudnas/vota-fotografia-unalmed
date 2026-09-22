import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Photo,
  CommentItem,
  AdminVoteModeSetting,
  DynamicSession,
  PhotoSnapshot,
  DriveFolderInfo,
} from '../types';
import { INITIAL_PHOTOS } from '../data/initialPhotos';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/auth';
import {
  getOrCreatePublicDriveFolder,
  uploadPhotoToDrive,
  FOLDER_NAME_DEFAULT,
} from '../services/driveService';

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
  deletePhoto: (photoId: string) => void;

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

  // Google Drive Personal Integration
  googleUser: User | null;
  driveFolder: DriveFolderInfo | null;
  isConnectingDrive: boolean;
  isUploadingToDrive: boolean;
  connectGoogleDrive: () => Promise<DriveFolderInfo | null>;
  disconnectGoogleDrive: () => Promise<void>;
  uploadFileToDriveFolder: (file: File | Blob, fileName: string) => Promise<{
    fileId: string;
    directImageUrl: string;
    webViewLink?: string;
  }>;
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
        if (Array.isArray(parsed)) return parsed;
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
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // fallback
    }
    const defaultDynamic: DynamicSession = {
      id: 'dynamic-init-' + Date.now(),
      title: 'Dinámica de Apertura: Miradas de Unalmed',
      description: 'Primera dinámica fotográfica para elegir las fotos más icónicas del campus.',
      startedAt: Date.now(),
      durationHours: 0,
      closedAt: null,
      isClosed: false,
      totalVotesAtClose: 0,
      top3: [],
      allRankedPhotos: [],
    };
    return defaultDynamic;
  });

  const [activeDuel, setActiveDuel] = useState<[Photo, Photo] | null>(() => {
    return getRandomPair(INITIAL_PHOTOS);
  });

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);

  // Google Drive state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState<boolean>(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<boolean>(false);
  const [driveFolder, setDriveFolder] = useState<DriveFolderInfo | null>(() => {
    try {
      const saved = localStorage.getItem(DRIVE_FOLDER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return null;
  });

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

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, _token) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Connect Google Drive function
  const connectGoogleDrive = async (): Promise<DriveFolderInfo | null> => {
    setIsConnectingDrive(true);
    try {
      const authResult = await googleSignIn();
      if (!authResult) throw new Error('No se completó la autenticación con Google.');

      setGoogleUser(authResult.user);
      // Create or locate the public folder in their personal drive
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

  const disconnectGoogleDrive = async () => {
    await logoutGoogle();
    setGoogleUser(null);
  };

  const uploadFileToDriveFolder = async (
    file: File | Blob,
    fileName: string
  ): Promise<{ fileId: string; directImageUrl: string; webViewLink?: string }> => {
    let token = await getAccessToken();
    let currentFolder = driveFolder;

    // If no active token, prompt sign-in popup
    if (!token) {
      const authResult = await googleSignIn();
      if (!authResult) throw new Error('Se requiere autenticación para subir a Google Drive.');
      setGoogleUser(authResult.user);
      token = authResult.accessToken;
      if (!currentFolder) {
        currentFolder = await getOrCreatePublicDriveFolder(token, FOLDER_NAME_DEFAULT);
        setDriveFolder(currentFolder);
      }
    } else if (!currentFolder) {
      currentFolder = await getOrCreatePublicDriveFolder(token, FOLDER_NAME_DEFAULT);
      setDriveFolder(currentFolder);
    }

    setIsUploadingToDrive(true);
    try {
      const res = await uploadPhotoToDrive(token, currentFolder.folderId, file, fileName);
      return {
        fileId: res.fileId,
        directImageUrl: res.directImageUrl,
        webViewLink: res.webViewLink,
      };
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Keep active duel updated if photos change
  useEffect(() => {
    if ((!activeDuel || !photos.find(p => p.id === activeDuel[0]?.id) || !photos.find(p => p.id === activeDuel[1]?.id)) && photos.length >= 2) {
      setActiveDuel(getRandomPair(photos));
    } else if (photos.length < 2) {
      setActiveDuel(null);
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
    if (password.trim() === ADMIN_PASSWORD_DEFAULT || password.trim() === 'admin' || password.trim() === '1234') {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
  };

  const nextDuel = () => {
    setActiveDuel(getRandomPair(photos));
  };

  const isVotingOpen = Boolean(activeDynamic && !activeDynamic.isClosed);

  const voteDuel = (winnerId: string, loserId: string) => {
    if (!isVotingOpen) return;

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
    const newPhoto: Photo = {
      id: 'unal-user-' + Date.now(),
      title: newPhotoData.title.trim() || 'Fotografía Sin Título',
      author: newPhotoData.author.trim() || 'Comunidad Unalmed',
      location: newPhotoData.location.trim() || 'Campus El Volador',
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

    setPhotos((prev) => [newPhoto, ...prev]);
  };

  const deletePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(null);
    }
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
      if (exists) {
        return prev.map((d) => (d.id === closedDynamic.id ? closedDynamic : d));
      }
      return [closedDynamic, ...prev];
    });
  }, [activeDynamic, photos, totalVotesCount]);

  const startNewDynamic = (title: string, durationHours: number, description?: string) => {
    if (activeDynamic && !activeDynamic.isClosed) {
      finishCurrentDynamic();
    }

    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        points: 1200,
        matchesPlayed: 0,
        matchesWon: 0,
        swipeLikes: 0,
        swipePasses: 0,
      }))
    );
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
    setActiveDuel(getRandomPair(photos));
  };

  const deleteDynamic = (dynamicId: string) => {
    setDynamics((prev) => prev.filter((d) => d.id !== dynamicId));
    if (activeDynamic?.id === dynamicId) {
      setActiveDynamic(null);
    }
  };

  const resetAllData = () => {
    setPhotos([]);
    setTotalVotesCount(0);
    setActiveDuel(null);
    setDynamics([]);
    setActiveDynamic(null);
    setDriveFolder(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VOTES_COUNTER_KEY);
    localStorage.removeItem(DYNAMICS_KEY);
    localStorage.removeItem(ACTIVE_DYNAMIC_KEY);
    localStorage.removeItem(DRIVE_FOLDER_KEY);
  };

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
        deletePhoto,
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
