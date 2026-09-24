const DEVICE_ID_KEY = 'fotografia_unalmed_device_id_v1';

/**
 * Retorna un identificador único y persistente para este dispositivo/navegador.
 * Si no existe, genera uno y lo almacena en localStorage.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'dev_server_runtime';
  }
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      const rand = Math.random().toString(36).substring(2, 10);
      const time = Date.now().toString(36);
      id = `dev_${rand}_${time}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev_anon_' + Math.random().toString(36).substring(2, 8);
  }
}
