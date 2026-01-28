'use client';

import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';
import { ONESIGNAL_CONFIG, isOneSignalConfigured } from '@/lib/onesignal/config';

export function useOneSignal() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initOneSignal = async () => {
      if (!isOneSignalConfigured()) {
        setError('OneSignal no está configurado');
        setIsLoading(false);
        return;
      }

      try {
        // Inicializar OneSignal
        await OneSignal.init({
          appId: ONESIGNAL_CONFIG.appId,
          allowLocalhostAsSecureOrigin: true,
        });
        
        setIsInitialized(true);

        // Verificar estado de suscripción
        const isPushSupported = OneSignal.Notifications.isPushSupported();
        if (isPushSupported) {
          const permission = await OneSignal.Notifications.permissionNative;
          const isSubscribed = permission === 'granted';
          setIsSubscribed(isSubscribed);
        }

        // Escuchar cambios de suscripción
        OneSignal.User.PushSubscription.addEventListener('change', (subscription) => {
          setIsSubscribed(subscription.current.optedIn);
        });
      } catch (err) {
        console.error('Error initializing OneSignal:', err);
        setError('Error al inicializar notificaciones');
      } finally {
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      initOneSignal();
    }
  }, []);

  const subscribe = async () => {
    try {
      setError(null);
      await OneSignal.Notifications.requestPermission();
      
      // Agregar tag para alertas de Metro Bilbao
      await OneSignal.User.addTag('metro_alerts', 'enabled');
      
      return true;
    } catch (err) {
      console.error('Error subscribing:', err);
      setError('Error al activar notificaciones');
      return false;
    }
  };

  const unsubscribe = async () => {
    try {
      setError(null);
      await OneSignal.User.PushSubscription.optOut();
      
      // Remover tag
      await OneSignal.User.removeTag('metro_alerts');
      
      return true;
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Error al desactivar notificaciones');
      return false;
    }
  };

  return {
    isInitialized,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
