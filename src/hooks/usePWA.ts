'use client';

import { useEffect } from 'react';

export function usePWA() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration);

                    // Escuchar actualizaciones disponibles
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker?.addEventListener('statechange', () => {
                            if (newWorker.state === 'activated') {
                                // Nueva versión disponible - notificar al usuario
                                console.log('Nueva versión de la app disponible');
                                window.location.reload();
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });

            // Periodicamente checkear actualizaciones
            setInterval(() => {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        registration.update();
                    });
                });
            }, 60000); // Cada minuto
        }
    }, []);
}
