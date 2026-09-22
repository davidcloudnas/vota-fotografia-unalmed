// Configuración global para despliegues públicos (como Vercel)
export const APP_CONFIG = {
  // ID de la carpeta pública de Google Drive configurada por el administrador.
  // Puedes definirla aquí o mediante la variable de entorno VITE_DRIVE_FOLDER_ID en Vercel.
  defaultDriveFolderId: (import.meta.env.VITE_DRIVE_FOLDER_ID as string) || '',

  // Clave de API de Google (opcional, para permitir que visitantes sin login listen fotos públicas de Drive)
  // Puedes definirla aquí o en Vercel con VITE_GOOGLE_API_KEY
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

  // URL de Webhook / API personalizada (por ejemplo, Google Apps Script o endpoint REST)
  syncApiUrl: (import.meta.env.VITE_SYNC_API_URL as string) || '',
};
