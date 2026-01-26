'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export interface Favorite {
    id: string;
    stopId: string;
    name?: string;
    stopName?: string;
    agency: 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';
    lat?: number;
    lon?: number;
    // Optional metadata
    lineId?: string;
    destination?: string;
    metadata?: {
        selectedLines?: string[];
        [key: string]: any;
    };
    createdAt: number;
}

interface FavoritesContextType {
    favorites: Favorite[];
    addFavorite: (stop: Omit<Favorite, 'id' | 'createdAt'>) => Promise<void>;
    removeFavorite: (id: string) => Promise<void>;
    isFavorite: (stopId: string, agency: string) => boolean;
    isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within FavoritesProvider');
    }
    return context;
};

interface FavoritesProviderProps {
    children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cargar favoritos del localStorage al iniciar
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const stored = localStorage.getItem('bilbotrans_favorites');
                if (stored) {
                    setFavorites(JSON.parse(stored));
                }
            } catch (error) {
                console.error('Error loading favorites:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
            loadFavorites();
        }
    }, []);

    // Guardar favoritos en localStorage cuando cambien
    useEffect(() => {
        if (!isLoading && typeof globalThis !== 'undefined' && globalThis.localStorage) {
            localStorage.setItem('bilbotrans_favorites', JSON.stringify(favorites));
        }
    }, [favorites, isLoading]);

    const addFavorite = async (stop: Omit<Favorite, 'id' | 'createdAt'>) => {
        const newFavorite: Favorite = {
            ...stop,
            id: `${stop.stopId}_${stop.agency}_${Date.now()}`,
            createdAt: Date.now(),
        };
        setFavorites(prev => [...prev, newFavorite]);
    };

    const removeFavorite = async (id: string) => {
        setFavorites(prev => prev.filter(fav => fav.id !== id));
    };

    const isFavorite = (stopId: string, agency: string) => {
        return favorites.some(fav => fav.stopId === stopId && fav.agency === agency);
    };

    const value = useMemo(
        () => ({ favorites, addFavorite, removeFavorite, isFavorite, isLoading }),
        [favorites, isLoading]
    );

    return (
        <FavoritesContext.Provider value={value}>
            {children}
        </FavoritesContext.Provider>
    );
};
