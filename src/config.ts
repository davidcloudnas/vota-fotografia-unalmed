// Configuración global para despliegues públicos (como Vercel)
const CUSTOM_SYNC_URL_KEY = 'fotografia_unalmed_custom_sync_url';

export const APP_CONFIG = {
  // ID de la carpeta pública de Google Drive configurada por el administrador.
  defaultDriveFolderId:
    (import.meta.env.VITE_DRIVE_FOLDER_ID as string) ||
    (import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID as string) ||
    '',

  // Clave de API de Google (opcional, para permitir que visitantes sin login listen fotos públicas de Drive)
  googleApiKey: (import.meta.env.VITE_GOOGLE_API_KEY as string) || '',

  // URL y Token de Vercel KV / Upstash Redis para sincronización de votos multi-usuario en tiempo real
  kvRestApiUrl:
    (import.meta.env.VITE_KV_REST_API_URL as string) ||
    (import.meta.env.VITE_UPSTASH_REDIS_REST_URL as string) ||
    '',
  kvRestApiToken:
    (import.meta.env.VITE_KV_REST_API_TOKEN as string) ||
    (import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN as string) ||
    '',

  // URL de Webhook / API personalizada (por ejemplo, Google Apps Script Web App o endpoint REST)
  get syncApiUrl(): string {
    try {
      const custom = localStorage.getItem(CUSTOM_SYNC_URL_KEY);
      if (custom && custom.trim()) return custom.trim();
    } catch {
      // storage unavailable
    }
    return (
      (import.meta.env.VITE_SYNC_API_URL as string) ||
      (import.meta.env.VITE_GOOGLE_SCRIPT_URL as string) ||
      (import.meta.env.VITE_APPS_SCRIPT_URL as string) ||
      ''
    );
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

