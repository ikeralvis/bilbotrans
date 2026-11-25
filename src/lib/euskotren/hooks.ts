'use client';

import useSWR, { mutate } from 'swr';
import { saveLastGood } from '@/lib/metro/lastGood';
import type { EtStationLive } from './types';

/** Tras un refresco manual, durante unos segundos las peticiones saltan toda caché. */
let forceFreshAt = 0;
const FRESH_WINDOW_MS = 4_000;

const isLiveKey = (key: unknown) => typeof key === 'string' && key.startsWith('/api/euskotren/station/');

const fetcher = async <T,>(url: string): Promise<T> => {
    const fresh = Date.now() - forceFreshAt < FRESH_WINDOW_MS;
    const res = fresh ? await fetch(`${url}?fresh=${Date.now()}`, { cache: 'no-store' }) : await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as T;
    saveLastGood(url, json);
    return json;
};

/** El GTFS-RT se refresca cada ~15 s: al montar, al volver a la pestaña y con el botón. Sin polling (como en Bilbobus). */
const LIVE = {
    dedupingInterval: 10_000,
    focusThrottleInterval: 20_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    errorRetryInterval: 8_000,
} as const;

export function refreshEuskotrenLive() {
    forceFreshAt = Date.now();
    return mutate(isLiveKey);
}

export function useEtStation(id: string | null) {
    return useSWR<EtStationLive>(id ? `/api/euskotren/station/${id}` : null, fetcher, LIVE);
}
