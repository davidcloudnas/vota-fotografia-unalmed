// Pure Google OAuth 2.0 & Identity Services integration
export interface GoogleAdminUser {
  email?: string;
  name?: string;
  picture?: string;
}

const GOOGLE_CLIENT_ID = '751256592070-6iu1rpesoejsbn44nrlgn0o298cim3g6.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let cachedAccessToken: string | null = null;
let cachedUser: GoogleAdminUser | null = null;

// Initialize or retrieve token from memory
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setManualAccessToken = (token: string) => {
  cachedAccessToken = token.trim();
};

export const clearGoogleAuth = () => {
  cachedAccessToken = null;
  cachedUser = null;
};

// Request OAuth token using Google Identity Services (GIS)
export const requestGoogleDriveToken = async (): Promise<{
  accessToken: string;
  user: GoogleAdminUser | null;
}> => {
  return new Promise((resolve, reject) => {
    // Check if GIS script is loaded
    const google = (window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient: (config: unknown) => { requestAccessToken: (opts?: unknown) => void } } } } }).google;

    if (!google?.accounts?.oauth2) {
      // If script is not ready, dynamically load it or reject with instructions
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const loadedGoogle = (window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient: (config: unknown) => { requestAccessToken: (opts?: unknown) => void } } } } }).google;
        if (!loadedGoogle?.accounts?.oauth2) {
          reject(new Error('No se pudo inicializar los servicios de Google Identity.'));
          return;
        }
        initAndRequestToken(loadedGoogle, resolve, reject);
      };
      script.onerror = () => {
        reject(new Error('No se pudo cargar el script de Google Identity Services.'));
      };
      document.head.appendChild(script);
      return;
    }

    initAndRequestToken(google, resolve, reject);
  });
};

function initAndRequestToken(
  google: { accounts?: { oauth2?: { initTokenClient: (config: unknown) => { requestAccessToken: (opts?: unknown) => void } } } },
  resolve: (val: { accessToken: string; user: GoogleAdminUser | null }) => void,
  reject: (err: Error) => void
) {
  try {
    const tokenClient = google.accounts!.oauth2!.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: async (response: { access_token?: string; error?: string }) => {
        if (response.error) {
          reject(new Error(`Error de autenticación con Google: ${response.error}`));
          return;
        }

        if (!response.access_token) {
          reject(new Error('No se recibió el token de acceso de Google.'));
          return;
        }

        const accessToken = response.access_token;
        cachedAccessToken = accessToken;

        // Fetch user profile info directly from Google OAuth2 userinfo endpoint
        let user: GoogleAdminUser | null = null;
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userRes.ok) {
            const data = await userRes.json();
            user = {
              email: data.email,
              name: data.name,
              picture: data.picture,
            };
            cachedUser = user;
          }
        } catch (err) {
          console.warn('No se pudo obtener información del perfil:', err);
        }

        resolve({ accessToken, user });
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch (err) {
    reject(err instanceof Error ? err : new Error(String(err)));
  }
}
