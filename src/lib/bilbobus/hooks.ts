'use client';

import useSWR, { mutate } from 'swr';
import { saveLastGood } from '@/lib/metro/lastGood';
import type { BbLineWaiting, BbStopWaiting } from './types';

/** Tras un refresco manual, durante unos segundos las peticiones saltan toda caché. */
let forceFreshAt = 0;
const FRESH_WINDOW_MS = 4_000;

const isLiveKey = (key: unknown) => typeof key === 'string' && (key.startsWith('/api/bilbobus/stop/') || key.startsWith('/api/bilbobus/line/'));

const fetcher = async <T,>(url: string): Promise<T> => {
    const fresh = Date.now() - forceFreshAt < FRESH_WINDOW_MS;
    const res = fresh ? await fetch(`${url}?fresh=${Date.now()}`, { cache: 'no-store' }) : await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as T;
    saveLastGood(url, json);
    return json;
};

/**
 * Sin polling: al montar, al volver a la pestaña (máx. 1 vez/30 s) y con el botón de actualizar.
 * El servicio de Bilbobus se refresca por lotes cada pocos minutos: pedir más a menudo no da datos nuevos.
 */
const LIVE = {
    dedupingInterval: 15_000,
    focusThrottleInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    errorRetryInterval: 8_000,
} as const;

export function refreshBilbobusLive() {
    forceFreshAt = Date.now();
    return mutate(isLiveKey);
}

export function useBbStop(code: string | null) {
    return useSWR<BbStopWaiting>(code ? `/api/bilbobus/stop/${code}` : null, fetcher, LIVE);
}

export function useBbLine(code: string | null) {
    return useSWR<BbLineWaiting>(code ? `/api/bilbobus/line/${code}` : null, fetcher, LIVE);
}
