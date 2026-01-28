// Configuración de OneSignal
export const ONESIGNAL_CONFIG = {
  appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
  allowLocalhostAsSecureOrigin: true,
  serviceWorkerParam: { scope: '/' },
  serviceWorkerPath: 'OneSignalSDKWorker.js',
};

// Verificar si OneSignal está configurado
export const isOneSignalConfigured = () => {
  return !!ONESIGNAL_CONFIG.appId;
};
