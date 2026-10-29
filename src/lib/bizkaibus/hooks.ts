'use client';

import useSWR, { mutate } from 'swr';
import { saveLastGood } from '@/lib/metro/lastGood';
import type { BizkaibusAlert, Connection, LineSchedule, StopArrivals } from './types';

/** Tras un refresco manual, durante unos segundos las peticiones en vivo saltan toda caché. */
let forceFreshAt = 0;
const FRESH_WINDOW_MS = 4_000;

const isLiveKey = (key: unknown) => typeof key === 'string' && key.startsWith('/api/bizkaibus/stop/');

const fetcher = async <T,>(url: string): Promise<T> => {
    const fresh = Date.now() - forceFreshAt < FRESH_WINDOW_MS && isLiveKey(url);
    const res = fresh ? await fetch(`${url}?fresh=${Date.now()}`, { cache: 'no-store' }) : await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as T;
    // Guarda el último dato bueno de la parada para enseñarlo (marcado como antiguo) si luego se abre sin conexión.
    if (isLiveKey(url)) saveLastGood(url, json);
    return json;
};

/** Sin polling: al montar, al volver a la pestaña (máx. 1 vez/30 s) y con el botón de actualizar. */
const LIVE = {
    dedupingInterval: 10_000,
    focusThrottleInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    errorRetryInterval: 5_000,
} as const;

export function refreshBizkaibusLive() {
    forceFreshAt = Date.now();
    return mutate(isLiveKey);
}

export function useBizkaibusStop(code: string | null) {
    return useSWR<StopArrivals>(code ? `/api/bizkaibus/stop/${code}` : null, fetcher, LIVE);
}

/** Avisos de la red: cambian poco, se piden al abrir y al volver (máx. 1 vez cada 5 min). */
export function useBizkaibusAlerts() {
    return useSWR<{ alerts: BizkaibusAlert[]; fetchedAt: number }>('/api/bizkaibus/alerts', fetcher, {
        revalidateOnFocus: true,
        focusThrottleInterval: 300_000,
        keepPreviousData: true,
    });
}

export function useLineSchedule(code: string | null) {
    return useSWR<LineSchedule>(code ? `/api/bizkaibus/line/${code}` : null, fetcher, { revalidateOnFocus: false });
}

export function useConnections(from: string | null, to: string | null) {
    return useSWR<{ connections: Connection[] }>(from && to ? `/api/bizkaibus/connect?from=${from}&to=${to}` : null, fetcher, { revalidateOnFocus: false });
}

/** Avisos que afectan a alguna de estas líneas (los de toda la red, sin líneas, no se incluyen). */
export function alertsForLines(alerts: BizkaibusAlert[] | undefined, lines: string[]): BizkaibusAlert[] {
    if (!alerts || lines.length === 0) return [];
    const set = new Set(lines);
    return alerts.filter((a) => a.lines.some((l) => set.has(l)));
}
