import { useCallback } from 'react';

/**
 * Hook para manejar el onboarding con Driver.js
 * Muestra un tour guiado la primera vez que el usuario abre la app
 */
export function useOnboarding() {
    const ONBOARDING_SHOWN_KEY = 'onboarding_tour_shown';

    const startTour = useCallback(async () => {
        // Verificar si ya se mostró el onboarding
        if (globalThis.window) {
            const alreadyShown = globalThis.window.localStorage.getItem(ONBOARDING_SHOWN_KEY);
            if (alreadyShown) {
                return;
            }

            try {
                // Importar dinámicamente Driver.js
                const { driver } = await import('driver.js');
                
                // Esperar a que el DOM esté completamente renderizado
                await new Promise(resolve => globalThis.window.setTimeout(resolve, 800));
                
                const driverInstance = driver({
                    showProgress: true,
                    progressText: 'Paso {{current}} de {{total}}',
                    allowClose: true,
                    popoverClass: 'driver-popover-custom',
                    steps: [
                        {
                            element: '.transport-logo-button',
                            popover: {
                                title: '🚇 Cambia de transporte',
                                description: 'Haz clic en el logo para cambiar entre Metro, Bilbobus, Bizkaibus y Renfe.',
                                side: 'bottom',
                                align: 'center',
                            },
                        },
                        {
                            element: '.origin-input',
                            popover: {
                                title: '🔍 Tu origen',
                                description: 'Escribe el nombre de la parada de inicio. Los resultados se actualizan en tiempo real.',
                                side: 'bottom',
                                align: 'start',
                            },
                        },
                        {
                            element: '.destination-input',
                            popover: {
                                title: '📍 Tu destino',
                                description: 'Ahora indica dónde quieres llegar. Verás los trenes disponibles al instante.',
                                side: 'bottom',
                                align: 'start',
                            },
                        },
                        {
                            element: '.favorites-section',
                            popover: {
                                title: '❤️ Tus favoritos',
                                description: 'Guarda tus estaciones favoritas aquí para acceder a ellas al instante.',
                                side: 'top',
                                align: 'center',
                            },
                        },
                    ],
                    onDestroyStarted: () => {
                        // Marcar que el onboarding fue completado
                        globalThis.window.localStorage.setItem(ONBOARDING_SHOWN_KEY, 'true');
                        driverInstance.destroy();
                    },
                });

                driverInstance.drive();
            } catch (error) {
                console.warn('Error loading Driver.js:', error);
            }
        }
    }, []);

    return { startTour };
}
