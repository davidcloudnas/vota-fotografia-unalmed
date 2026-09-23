// Configuración para la sincronización global mediante Google Drive y Google Apps Script
const CUSTOM_SYNC_URL_KEY = 'fotografia_unalmed_custom_sync_url';

export const APP_CONFIG = {
  // 1. ID de la carpeta pública de Google Drive configurada por el administrador.
  defaultDriveFolderId: (import.meta.env.VITE_DRIVE_FOLDER_ID as string) || '',

  // 2. URL del Webhook / Google Apps Script desplegado como Web App (Google Drive)
  get syncApiUrl(): string {
    try {
      const custom = localStorage.getItem(CUSTOM_SYNC_URL_KEY);
      if (custom && custom.trim()) return custom.trim();
    } catch {
      // storage unavailable
    }
    return (import.meta.env.VITE_SYNC_API_URL as string) || '';
  },

  setCustomSyncUrl(url: string) {
    try {
      if (url && url.trim()) {
        localStorage.setItem(CUSTOM_SYNC_URL_KEY, url.trim());
      } else {
        localStorage.removeItem(CUSTOM_SYNC_URL_KEY);
      }
    } catch {
      // storage unavailable
    }
  },

  getCustomSyncUrl(): string {
    try {
      return localStorage.getItem(CUSTOM_SYNC_URL_KEY) || '';
    } catch {
      return '';
    }
  },
};
