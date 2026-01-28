'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Clave para marcar que ya se actualizó en esta sesión
const UPDATE_APPLIED_KEY = 'pwa_update_applied';

export function PWAClient() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Si acabamos de actualizar, no mostrar el popup
            const justUpdated = sessionStorage.getItem(UPDATE_APPLIED_KEY);
            if (justUpdated) {
                sessionStorage.removeItem(UPDATE_APPLIED_KEY);
                return; // No registrar listeners, ya actualizamos
            }

            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((reg) => {
                    setRegistration(reg);
                    console.log('Service Worker registered');

                    // Si ya hay un worker esperando, mostrar el popup
                    if (reg.waiting) {
                        console.log('SW waiting found on load');
                        setUpdateAvailable(true);
                        return;
                    }

                    // Escuchar actualizaciones
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
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
        // Marcar que vamos a actualizar para no mostrar popup después del reload
        sessionStorage.setItem(UPDATE_APPLIED_KEY, 'true');
        setUpdateAvailable(false);

        if (registration?.waiting) {
            // Enviar mensaje al service worker nuevo para que tome el control
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Recargar cuando el nuevo SW tome el control
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            }, { once: true });
            
            // Fallback: recargar después de 1 segundo si no hay cambio
            setTimeout(() => window.location.reload(), 1000);
        } else {
            // Si no hay waiting worker, simplemente recargar
            window.location.reload();
        }
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
                    onClick={() => setUpdateAvailable(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
