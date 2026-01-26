'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function PWAClient() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((reg) => {
                    setRegistration(reg);
                    console.log('Service Worker registered');

                    // Escuchar actualizaciones
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // Nueva versión disponible - mostrar notificación
                                    console.log('New version available');
                                    setUpdateAvailable(true);
                                }
                            });
                        }
                    });

                    // Chequear actualizaciones cada 30 segundos
                    const interval = setInterval(() => {
                        reg.update().catch((error) => {
                            console.error('Error checking for updates:', error);
                        });
                    }, 30000);

                    return () => clearInterval(interval);
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }, []);

    const handleUpdate = () => {
        if (registration?.waiting) {
            // Enviar mensaje al service worker nuevo para que tome el control
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Recargar la página cuando el nuevo SW tome el control
            let updateActivated = false;
            const onControllerChange = () => {
                if (!updateActivated) {
                    updateActivated = true;
                    window.location.reload();
                }
            };
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
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
