export interface CommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  likes: number;
}

export interface DriveFolderInfo {
  folderId: string;
  folderName: string;
  webViewLink?: string;
  isPublic: boolean;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  viewUrl: string;
  directImageUrl: string;
  webViewLink?: string;
}

export interface Photo {
  id: string;
  title: string;
  author: string;
  location: string;
  imageUrl: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  syncedToDrive?: boolean;
  description: string;
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  swipeLikes: number;
  swipePasses: number;
  comments: CommentItem[];
  isFavorite: boolean;
  createdAt: string;
}

export interface PhotoSnapshot {
  id: string;
  title: string;
  author: string;
  location: string;
  imageUrl: string;
  description: string;
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  swipeLikes: number;
}

export interface DynamicSession {
  id: string;
  title: string;
  description?: string;
  startedAt: number; // timestamp in ms
  durationHours: number; // 0 means infinite / until manual close
  closedAt: number | null; // null if active, timestamp when closed
  isClosed: boolean;
  totalVotesAtClose: number;
  top3: PhotoSnapshot[];
  allRankedPhotos: PhotoSnapshot[];
}

export type VoteMode = '1v1' | 'swipe';
export type AdminVoteModeSetting = '1v1' | 'swipe' | 'both';
export type ActiveTab = 'vote' | 'leaderboard' | 'gallery' | 'upload' | 'dynamics' | 'admin';
export type LeaderboardSort = 'points' | 'votes' | 'winrate' | 'favorites';
