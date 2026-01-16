'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLastSearch<T>(key: string) {
    const [lastSearch, setLastSearch] = useState<T | null>(null);

    // Initial load
    useEffect(() => {
        const stored = localStorage.getItem(`last_search_${key}`);
        if (stored) {
            try {
                setLastSearch(JSON.parse(stored));
            } catch (e) {
                console.error(`Failed to parse last search for ${key}`, e);
            }
        }
    }, [key]);

    // Save search data
    const saveSearch = useCallback((data: T) => {
        setLastSearch(data);
        localStorage.setItem(`last_search_${key}`, JSON.stringify(data));
    }, [key]);

    // Clear search data
    const clearSearch = useCallback(() => {
        setLastSearch(null);
        localStorage.removeItem(`last_search_${key}`);
    }, [key]);

    return { lastSearch, saveSearch, clearSearch };
}
