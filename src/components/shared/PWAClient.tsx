'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Solo evitar mostrar el popup si ya se descartó o actualizó en esta sesión
const UPDATE_DISMISSED_KEY = 'pwa_update_dismissed'; // sessionStorage - se limpia al cerrar

export function PWAClient() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Solo verificar si ya se gestionó en esta sesión (cerrar o actualizar)
            const dismissedInSession = sessionStorage.getItem(UPDATE_DISMISSED_KEY);
            if (dismissedInSession) {
                console.log('PWA: Update already handled in this session');
                return;
            }

            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((reg) => {
                    setRegistration(reg);
                    console.log('Service Worker registered');

                    // Si ya hay un worker esperando, verificar que sea diferente
                    if (reg.waiting && navigator.serviceWorker.controller) {
                        // Solo mostrar si el waiting es realmente nuevo
                        console.log('SW waiting found on load');
                        setUpdateAvailable(true);
                        return;
                    }

                    // Escuchar actualizaciones
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            console.log('New SW installing...');
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('New version available');
                                    setUpdateAvailable(true);
                                }
                            });
                        }
                    });

                    // Chequear actualizaciones cada 10 minutos
                    const interval = setInterval(() => {
                        reg.update().catch((error) => {
                            console.error('Error checking for updates:', error);
                        });
                    }, 600000);  // 10 minutos

                    return () => clearInterval(interval);
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }, []);

    const handleUpdate = () => {
        console.log('PWA Update: Starting update process');
        
        // Marcar que ya se actualizó en esta sesión (se limpia al cerrar la pestaña)
        sessionStorage.setItem(UPDATE_DISMISSED_KEY, 'updated');
        setUpdateAvailable(false);

        if (registration?.waiting) {
            console.log('PWA Update: Posting SKIP_WAITING message');
            
            // Configurar listener antes de enviar mensaje
            const handleControllerChange = () => {
                console.log('PWA Update: Controller changed, reloading...');
                window.location.reload();
            };
            
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true });
            
            // Enviar mensaje al service worker
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Fallback: recargar después de 2 segundos
            setTimeout(() => {
                console.log('PWA Update: Fallback reload triggered');
                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
                window.location.reload();
            }, 2000);
        } else {
            console.log('PWA Update: No waiting worker, direct reload');
            window.location.reload();
        }
    };

    const handleDismiss = () => {
        console.log('PWA Update: Dismissed by user');
        // Marcar como descartado solo para esta sesión
        sessionStorage.setItem(UPDATE_DISMISSED_KEY, 'true');
        setUpdateAvailable(false);
    };

    if (!updateAvailable) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 bg-blue-600 text-white rounded-2xl p-4 shadow-2xl z-50 animate-slideUp">
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                    <p className="font-semibold text-sm">Nueva versión disponible</p>
                    <p className="text-xs opacity-90">Toca "Actualizar" para instalar los cambios</p>
                </div>
                <button
                    onClick={handleUpdate}
                    className="px-4 py-2 bg-white text-blue-600 font-semibold text-sm rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                    Actualizar
                </button>
                <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    aria-label="Cerrar"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
