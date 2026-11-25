'use client';

import { useCallback, useEffect, useState } from 'react';

export interface MetroHomePrefs {
    showNearby: boolean;
    showFavorites: boolean;
    rememberSearch: boolean;
}

export interface LastMetroSearch {
    origin: string;
    dest: string | null;
}

const PREFS_KEY = 'bt_metro_home_prefs';
const LAST_KEY = 'bt_metro_last_search';
const DEFAULTS: MetroHomePrefs = { showNearby: false, showFavorites: true, rememberSearch: true };

function read<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}

function write(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* modo privado o storage bloqueado: la preferencia solo dura la sesión */
    }
}

/** Preferencias de la home de Metro y última búsqueda (solo en este dispositivo). */
export function useMetroHomePrefs() {
    const [prefs, setPrefs] = useState<MetroHomePrefs>(DEFAULTS);
    const [last, setLast] = useState<LastMetroSearch | null>(null);
    const [ready, setReady] = useState(false);

    // Se lee tras montar (no en el useState inicial) para no romper la hidratación SSR.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const stored = read<Partial<MetroHomePrefs>>(PREFS_KEY);
        if (stored) setPrefs({ ...DEFAULTS, ...stored });
        setLast(read<LastMetroSearch>(LAST_KEY));
        setReady(true);
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    const updatePrefs = useCallback((patch: Partial<MetroHomePrefs>) => {
        setPrefs((p) => {
            const next = { ...p, ...patch };
            write(PREFS_KEY, next);
            return next;
        });
        if (patch.rememberSearch === false) {
            try {
                localStorage.removeItem(LAST_KEY);
            } catch {
                /* noop */
            }
            setLast(null);
        }
    }, []);

    const saveLast = useCallback(
        (search: LastMetroSearch) => {
            if (!prefs.rememberSearch) return;
            setLast(search);
            write(LAST_KEY, search);
        },
        [prefs.rememberSearch],
    );

    return { prefs, updatePrefs, last, saveLast, ready };
}
