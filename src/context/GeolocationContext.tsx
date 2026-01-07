'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export interface UserLocation {
    lat: number;
    lon: number;
    accuracy?: number;
    timestamp: number;
}

interface GeolocationContextType {
    location: UserLocation | null;
    isLoading: boolean;
    error: string | null;
    requestLocation: () => Promise<void>;
    calculateDistance: (lat: number, lon: number) => number; // Returns distance in km
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined);

export const useGeolocation = () => {
    const context = useContext(GeolocationContext);
    if (!context) {
        throw new Error('useGeolocation must be used within GeolocationProvider');
    }
    return context;
};

interface GeolocationProviderProps {
    children: ReactNode;
}

// Haversine formula para calcular distancia entre dos puntos
const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const GeolocationProvider: React.FC<GeolocationProviderProps> = ({ children }) => {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar última ubicación conocida del localStorage
    useEffect(() => {
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
            try {
                const stored = localStorage.getItem('bilbotrans_location');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Solo usar si tiene menos de 1 hora
                    if (Date.now() - parsed.timestamp < 3600000) {
                        setLocation(parsed);
                    }
                }
            } catch (error) {
                console.error('Error loading location:', error);
            }
        }
    }, []);

    const requestLocation = async () => {
        if (!('geolocation' in navigator)) {
            setError('Geolocalización no disponible en este navegador');
            return;
        }

        setIsLoading(true);
        setError(null);

        return new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLocation: UserLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: Date.now(),
                    };
                    setLocation(newLocation);
                    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
                        localStorage.setItem('bilbotrans_location', JSON.stringify(newLocation));
                    }
                    setIsLoading(false);
                    resolve();
                },
                (err) => {
                    let errorMsg = 'No se pudo obtener la ubicación';
                    if (err.code === 1) errorMsg = 'Permiso denegado';
                    else if (err.code === 2) errorMsg = 'Ubicación no disponible';
                    else if (err.code === 3) errorMsg = 'Tiempo agotado';

                    setError(errorMsg);
                    setIsLoading(false);
                    resolve();
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000, // Usar ubicación en caché de 5 minutos
                }
            );
        });
    };

    const calculateDistance = (lat: number, lon: number): number => {
        if (!location) return Infinity;
        return calculateHaversineDistance(location.lat, location.lon, lat, lon);
    };

    const value = useMemo(
        () => ({ location, isLoading, error, requestLocation, calculateDistance }),
        [location, isLoading, error]
    );

    return (
        <GeolocationContext.Provider value={value}>
            {children}
        </GeolocationContext.Provider>
    );
};
