'use client';

import { useMemo, useSyncExternalStore } from 'react';
import useSWR, { mutate, useSWRConfig } from 'swr';
import { LAST_GOOD_PREFIX, readLastGood, saveLastGood } from './lastGood';
import type { StationLive, RouteLive, ServiceStatus } from './client';
import type { IncidentsPayload } from './incidents';
import type { LineDiagramData, LineId } from './lines';

/** Instante del último refresco manual: durante unos segundos las peticiones en vivo saltan toda caché. */
let forceFreshAt = 0;
const FRESH_WINDOW_MS = 4_000;

const fetcher = async <T,>(url: string): Promise<T> => {
    const fresh = Date.now() - forceFreshAt < FRESH_WINDOW_MS && isLiveKey(url);
    const res = fresh
        ? await fetch(`${url}${url.includes('?') ? '&' : '?'}fresh=${Date.now()}`, { cache: 'no-store' })
        : await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as T;
    if (isLiveKey(url)) saveLastGood(url.split('&fresh=')[0].split('?fresh=')[0], json);
    return json;
};

/**
 * Sin polling: se pide al montar, al volver a la pestaña (máx. 1 vez/30 s) y con el botón de actualizar.
 * Un único caché compartido por URL evita peticiones duplicadas entre home, favoritos y parada.
 */
const LIVE = {
    dedupingInterval: 10_000,
    focusThrottleInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    errorRetryInterval: 5_000,
} as const;

const isLiveKey = (key: unknown) =>
    typeof key === 'string' && (key.startsWith('/api/metro/station/') || key.startsWith('/api/metro/route'));

/** Revalida todos los datos en vivo visibles (botón de actualizar). */
export function refreshMetroLive() {
    forceFreshAt = Date.now();
    return mutate(isLiveKey);
}

/** Edad (ms) del dato en vivo más antiguo del caché para las estaciones dadas. */
export function useOldestFetchedAt(codes: string[]): number | undefined {
    const { cache } = useSWRConfig();
    let oldest: number | undefined;
    for (const c of codes) {
        const at = (cache.get(`/api/metro/station/${c}`)?.data as StationLive | undefined)?.fetchedAt;
        if (at && (oldest === undefined || at < oldest)) oldest = at;
    }
    return oldest;
}

/** `full`: varios trenes por sentido (vista de parada). Sin él, la ficha ligera de la home. */
export function useMetroStation(code: string | null, full = false) {
    return useSWR<StationLive>(code ? `/api/metro/station/${code}${full ? '?full=1' : ''}` : null, fetcher, LIVE);
}

/** Último dato bueno guardado para esa URL. En el servidor y en la primera pintura es `null`. */
export function useLastGood<T>(key: string | null): { at: number; data: T } | null {
    // El texto crudo es el "snapshot" estable; se parsea solo cuando cambia.
    const raw = useSyncExternalStore(
        () => () => {},
        () => (key ? localStorage.getItem(LAST_GOOD_PREFIX + key) : null),
        () => null,
    );
    return useMemo(() => (key && raw ? readLastGood<T>(key) : null), [key, raw]);
}

const subscribeOnline = (cb: () => void) => {
    window.addEventListener('online', cb);
    window.addEventListener('offline', cb);
    return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
    };
};

/** Estado de la conexión del dispositivo. */
export function useOnline() {
    return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function useMetroRoute(from: string | null, to: string | null) {
    return useSWR<RouteLive>(from && to ? `/api/metro/route?from=${from}&to=${to}` : null, fetcher, LIVE);
}

export function useMetroStatus() {
    return useSWR<ServiceStatus>('/api/metro/status', fetcher, { revalidateOnFocus: true, focusThrottleInterval: 60_000, keepPreviousData: true });
}

/** Avisos oficiales (CMS). Cambian poco: se piden al abrir y al volver a la pestaña (máx. 1/5 min). */
export function useMetroIncidents() {
    return useSWR<IncidentsPayload>('/api/metro/incidents?lang=es', fetcher, {
        revalidateOnFocus: true,
        focusThrottleInterval: 300_000,
        keepPreviousData: true,
    });
}

/** Diagrama de línea (estaciones, zonas, incidencias). Cambia poco: se pide al abrir. */
export function useMetroLine(line: LineId) {
    return useSWR<LineDiagramData>(`/api/metro/line/${line}`, fetcher, { revalidateOnFocus: true, focusThrottleInterval: 60_000, keepPreviousData: true });
}
