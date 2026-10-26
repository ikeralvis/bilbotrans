'use client';

import useSWR, { mutate, useSWRConfig } from 'swr';
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
    return (await res.json()) as T;
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

export function useMetroStation(code: string | null) {
    return useSWR<StationLive>(code ? `/api/metro/station/${code}` : null, fetcher, LIVE);
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
