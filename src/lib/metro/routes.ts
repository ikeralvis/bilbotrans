'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Trayecto origen→destino guardado o visitado. Solo vive en este dispositivo. */
export interface SavedRoute {
    from: string;
    to: string;
}

interface Visit extends SavedRoute {
    count: number;
    last: number;
}

interface RoutesState {
    favorites: Array<SavedRoute & { createdAt: number }>;
    history: Visit[];
}

const KEY = 'bt_metro_routes';
const EMPTY: RoutesState = { favorites: [], history: [] };
const MAX_HISTORY = 30;
/** Una nueva visita al mismo trayecto no cuenta si ocurre antes de este tiempo (recargas, vuelta atrás). */
const VISIT_GAP_MS = 30 * 60_000;

const same = (a: SavedRoute, b: SavedRoute) => a.from === b.from && a.to === b.to;

let raw: string | null = null;
let cached: RoutesState = EMPTY;
const listeners = new Set<() => void>();

function readStorage(): string | null {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

function snapshot(): RoutesState {
    const next = readStorage();
    if (next !== raw) {
        raw = next;
        try {
            const parsed = next ? (JSON.parse(next) as Partial<RoutesState>) : null;
            cached = parsed ? { favorites: parsed.favorites ?? [], history: parsed.history ?? [] } : EMPTY;
        } catch {
            cached = EMPTY;
        }
    }
    return cached;
}

function commit(state: RoutesState) {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        /* storage bloqueado: el cambio dura solo hasta recargar */
    }
    raw = null; // fuerza releer; si el storage falló, vuelve al último valor guardado
    cached = state;
    listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => e.key === KEY && cb();
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(cb);
        window.removeEventListener('storage', onStorage);
    };
}

/** Frecuencia ponderada por recencia: un trayecto de hace semanas pesa la mitad. */
function score(v: Visit, now: number) {
    const days = (now - v.last) / 86_400_000;
    return v.count * Math.pow(0.5, days / 14);
}

export function useMetroRoutes() {
    const state = useSyncExternalStore(subscribe, snapshot, () => EMPTY);

    const isFavorite = useCallback((r: SavedRoute) => state.favorites.some((f) => same(f, r)), [state]);

    const toggleFavorite = useCallback((r: SavedRoute) => {
        const cur = snapshot();
        commit({
            ...cur,
            favorites: cur.favorites.some((f) => same(f, r))
                ? cur.favorites.filter((f) => !same(f, r))
                : [...cur.favorites, { ...r, createdAt: Date.now() }],
        });
    }, []);

    const recordVisit = useCallback((r: SavedRoute) => {
        const cur = snapshot();
        const now = Date.now();
        const prev = cur.history.find((h) => same(h, r));
        if (prev && now - prev.last < VISIT_GAP_MS) return;
        const rest = cur.history.filter((h) => !same(h, r));
        commit({ ...cur, history: [{ ...r, count: (prev?.count ?? 0) + 1, last: now }, ...rest].slice(0, MAX_HISTORY) });
    }, []);

    /** Sugeridos: los más usados primero; los de una sola visita cuentan como "recientes". */
    const suggestions = useCallback(
        (limit = 3) => {
            const now = Date.now();
            return state.history
                .filter((h) => !state.favorites.some((f) => same(f, h)))
                .map((h) => ({ ...h, frequent: h.count >= 3 }))
                .sort((a, b) => score(b, now) - score(a, now))
                .slice(0, limit);
        },
        [state],
    );

    return { favorites: state.favorites, isFavorite, toggleFavorite, recordVisit, suggestions };
}
