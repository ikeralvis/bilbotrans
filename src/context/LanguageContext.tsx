'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export type Language = 'es' | 'eu' | 'en';

export const translations = {
    es: {
        // Header
        appName: 'BilboTrans',
        realtimeSchedules: 'Horarios en tiempo real',
        
        // Navigation
        favorites: 'Favoritos',
        nearby: 'Cercanas',
        map: 'Mapa',
        route: 'Trayecto',
        
        // Route page
        planRoute: 'Planificar trayecto',
        origin: 'Origen',
        whereFrom: '¿De dónde vienes?',
        destination: 'Destino',
        whereTo: '¿A dónde vas?',
        searchRoute: 'Buscar trayecto',
        swapOriginDest: 'Intercambiar origen y destino',
        
        // Results
        noRouteFound: 'No se encontró ruta disponible',
        noTrainsAvailable: 'No hay trenes disponibles en este momento',
        duration: 'Duración',
        availableLine: 'Línea disponible',
        availableTrains: 'Trenes disponibles',
        wagons: 'vag',
        nextTrains: 'Próximos trenes',
        
        // Errors
        selectOriginAndDest: 'Selecciona origen y destino',
        originDestCannotBeEqual: 'El origen y destino no pueden ser iguales',
        errorSearchingRoute: 'Error buscando ruta. Intenta de nuevo.',
        
        // Station
        stationDetails: 'Detalles de la parada',
        platform1: 'Andén 1',
        platform2: 'Andén 2',
        exits: 'Salidas y Accesos',
        noTrainsAvailable2: 'Sin trenes disponibles',
        metroClosedOrNoService: 'Metro cerrado o sin servicio',
        elevator: 'Elevator',
        nocturnalAccess: 'Nocturnal',
        addToFavorites: 'Añadir a favoritos',
        removeFromFavorites: 'Quitar de favoritos',
        
        // General
        loading: 'Cargando...',
        error: 'Error',
        retry: 'Reintentar',
        back: 'Volver',
        search: 'Buscar',
        close: 'Cerrar',
    },
    eu: {
        // Header
        appName: 'BilboTrans',
        realtimeSchedules: 'Errealeko ordutegiak',
        
        // Navigation
        favorites: 'Gogokoak',
        nearby: 'Gertuak',
        map: 'Mapa',
        route: 'Ibilbidea',
        
        // Route page
        planRoute: 'Ibilbidea planifikatu',
        origin: 'Jatorria',
        whereFrom: 'Nondik datorren?',
        destination: 'Helburua',
        whereTo: 'Nora noa?',
        searchRoute: 'Ibilbidea bilatu',
        swapOriginDest: 'Jatorria eta helburua aldatu',
        
        // Results
        noRouteFound: 'Ez da ibilbiderik aurkitu',
        noTrainsAvailable: 'Ez dago trenik unean',
        duration: 'Iraupena',
        availableLine: 'Eskuragarri dagoen lerroa',
        availableTrains: 'Eskuragarri dauden trenoak',
        wagons: 'bag',
        nextTrains: 'Hurrengo trenoak',
        
        // Errors
        selectOriginAndDest: 'Hautatu jatorria eta helburua',
        originDestCannotBeEqual: 'Jatorria eta helburua ezin dira berdinak izan',
        errorSearchingRoute: 'Errorea ibilbidea bilatzerakoan. Saiatu berriro.',
        
        // Station
        stationDetails: 'Geraldiaren xehetasunak',
        platform1: 'Andena 1',
        platform2: 'Andena 2',
        exits: 'Irteerak eta Sarrerak',
        noTrainsAvailable2: 'Trenik ez eskuragarri',
        metroClosedOrNoService: 'Metroa itxita edo zerbitzurik gabe',
        elevator: 'Asansore',
        nocturnalAccess: 'Gaua',
        addToFavorites: 'Gogokoen gehitu',
        removeFromFavorites: 'Gogokoetatik kendu',
        
        // General
        loading: 'Kargatzen...',
        error: 'Errorea',
        retry: 'Saiatu berriro',
        back: 'Atzera',
        search: 'Bilatu',
        close: 'Itxi',
    },
    en: {
        // Header
        appName: 'BilboTrans',
        realtimeSchedules: 'Real-time schedules',
        
        // Navigation
        favorites: 'Favorites',
        nearby: 'Nearby',
        map: 'Map',
        route: 'Route',
        
        // Route page
        planRoute: 'Plan a route',
        origin: 'Origin',
        whereFrom: 'Where from?',
        destination: 'Destination',
        whereTo: 'Where to?',
        searchRoute: 'Search route',
        swapOriginDest: 'Swap origin and destination',
        
        // Results
        noRouteFound: 'No route found',
        noTrainsAvailable: 'No trains available at this time',
        duration: 'Duration',
        availableLine: 'Available line',
        availableTrains: 'Available trains',
        wagons: 'w',
        nextTrains: 'Next trains',
        
        // Errors
        selectOriginAndDest: 'Select origin and destination',
        originDestCannotBeEqual: 'Origin and destination cannot be the same',
        errorSearchingRoute: 'Error searching route. Try again.',
        
        // Station
        stationDetails: 'Station details',
        platform1: 'Platform 1',
        platform2: 'Platform 2',
        exits: 'Exits & Accesses',
        noTrainsAvailable2: 'No trains available',
        metroClosedOrNoService: 'Metro closed or no service',
        elevator: 'Elevator',
        nocturnalAccess: 'Night',
        addToFavorites: 'Add to favorites',
        removeFromFavorites: 'Remove from favorites',
        
        // General
        loading: 'Loading...',
        error: 'Error',
        retry: 'Retry',
        back: 'Back',
        search: 'Search',
        close: 'Close',
    }
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations.es) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
    const [language, setLanguageState] = useState<Language>('es');

    useEffect(() => {
        // Load language from localStorage on mount
        const savedLanguage = localStorage.getItem('language') as Language | null;
        if (savedLanguage && ['es', 'eu', 'en'].includes(savedLanguage)) {
            setLanguageState(savedLanguage);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
            localStorage.setItem('language', lang);
        }
    };

    const t = (key: keyof typeof translations.es): string => {
        return translations[language]?.[key] || translations.es[key] || key;
    };

    const value = useMemo(
        () => ({ language, setLanguage, t }),
        [language]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}
