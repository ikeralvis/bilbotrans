import { getBbLine, getBbStop, towardsFor } from './catalog';
import type { BbArrival, BbLineWaiting, BbStopWaiting } from './types';

/*
 * Servidor. Tiempos de espera de Bilbobus: el AJAX interno que usa la página de línea de bilbao.eus (ver API.md §4b).
 * Devuelve los minutos hasta el próximo bus en TODAS las paradas de una línea; no está documentado ni tiene licencia, así que:
 * caché corta en memoria y una sola petición en vuelo por línea.
 *
 * OJO: el cortafuegos de bilbao.eus responde 200 con una página "Request Rejected" si la petición lleva un `User-Agent` propio
 * (probado con "BilboTrans/1.0" y "BilboTrans"); con las cabeceras por defecto de Node funciona. No poner `User-Agent`.
 */

const AJAX_URL = 'https://www.bilbao.eus/cs/Satellite?pagename=Bilbaonet%2FComunes%2FPresentacion%2FBBUS_pintarRecorrido_Ajax';
const TIMEOUT_MS = 6000;
/** Los valores se refrescan por lotes cada pocos minutos: más caché no cambia nada y menos solo carga el servicio. */
const TTL_MS = 20_000;
/** Si el servicio falla, un dato de hasta 5 min se sigue sirviendo (marcado por su `fetchedAt`). */
const STALE_OK_MS = 5 * 60_000;
const RETRY_DELAY_MS = 300;
/** El servicio no cambia el resultado según esta temporada, pero la web siempre la manda. */
const SEASON = '24';
const NO_INFO = 9999;

interface RawEntry {
    codParada?: string | number;
    tiempo?: number | string;
}

/** `[{codParada, tiempo}]` → `{codParada: minutos | null}`. 9999 = sin información; menos de 1 = llegando (0). */
export function parseWaiting(raw: unknown): Record<string, number | null> {
    const out: Record<string, number | null> = {};
    if (!Array.isArray(raw)) return out;
    for (const e of raw as RawEntry[]) {
        if (e?.codParada === undefined || e.tiempo === undefined) continue;
        const t = Number(e.tiempo);
        if (!Number.isFinite(t)) continue;
        out[String(e.codParada)] = t >= NO_INFO ? null : Math.max(0, Math.floor(t));
    }
    return out;
}

const cache = new Map<string, { at: number; data: BbLineWaiting }>();
const inflight = new Map<string, Promise<BbLineWaiting>>();

async function request(line: string): Promise<BbLineWaiting> {
    const res = await fetch(AJAX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ codLinea: line, temporada: SEASON, language: 'es' }).toString(),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Bilbobus AJAX ${res.status} (línea ${line})`);
    // El servicio responde JSON como texto (la web lo pasa por `parseJSON`).
    const text = (await res.text()).trim();
    // Una respuesta que no es JSON es la página del cortafuegos ("Request Rejected") o un error del sitio, no "sin datos".
    if (text !== '' && !text.startsWith('[')) throw new Error(`Bilbobus AJAX: respuesta inesperada (${text.slice(0, 40)})`);
    return { line, minutes: parseWaiting(JSON.parse(text || '[]')), fetchedAt: Date.now() };
}

/** Una repetición si falla por red o tiempo (el servicio se pone lento con ráfagas); la página "Request Rejected" no se reintenta. */
async function requestWithRetry(line: string): Promise<BbLineWaiting> {
    try {
        return await request(line);
    } catch (e) {
        if (e instanceof Error && e.message.includes('respuesta inesperada')) throw e;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return request(line);
    }
}

/**
 * Tiempos de toda una línea. `fresh` salta la caché (botón de actualizar).
 * Si el servicio falla y hay un dato de hace menos de `STALE_OK_MS`, se devuelve ese (con su `fetchedAt` original, así la
 * interfaz muestra su antigüedad): los valores solo cambian por lotes cada pocos minutos, así que sigue siendo útil.
 */
export async function fetchLineWaiting(line: string, fresh = false): Promise<BbLineWaiting> {
    const hit = cache.get(line);
    if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.data;
    const pending = inflight.get(line);
    if (pending) return pending;
    const p = requestWithRetry(line)
        .then((data) => {
            cache.set(line, { at: Date.now(), data });
            return data;
        })
        .catch((e) => {
            if (hit && Date.now() - hit.at < STALE_OK_MS) return hit.data;
            throw e;
        })
        .finally(() => inflight.delete(line));
    inflight.set(line, p);
    return p;
}

/** Próximos buses de una parada: una consulta por línea que pasa por ella (compartidas entre paradas gracias a la caché). */
export async function fetchStopWaiting(code: string, fresh = false): Promise<BbStopWaiting> {
    const stop = getBbStop(code);
    if (!stop) throw new Error(`Parada desconocida ${code}`);

    const results = await Promise.allSettled(stop.lines.map((l) => fetchLineWaiting(l, fresh)));
    if (stop.lines.length > 0 && results.every((r) => r.status === 'rejected')) throw new Error('Bilbobus: ninguna línea respondió');

    const arrivals: BbArrival[] = [];
    const inactive: string[] = [];
    const unavailable: string[] = [];
    results.forEach((r, i) => {
        const line = stop.lines[i];
        if (r.status === 'rejected') return void unavailable.push(line);
        if (!(code in r.value.minutes)) return void inactive.push(line);
        arrivals.push({ line, towards: towardsFor(line, code), minutes: r.value.minutes[code] });
    });
    arrivals.sort((a, b) => (a.minutes ?? Infinity) - (b.minutes ?? Infinity) || a.line.localeCompare(b.line, 'es', { numeric: true }));

    const fetchedAt = results.reduce((oldest, r) => (r.status === 'fulfilled' ? Math.min(oldest, r.value.fetchedAt) : oldest), Date.now());
    return { code, name: stop.name, arrivals, inactive, unavailable, fetchedAt };
}

export const isBbLine = (code: string) => Boolean(getBbLine(code));
export const isBbStop = (code: string) => Boolean(getBbStop(code));
/** Para tests: vaciar la caché en memoria. */
export const _resetWaitingCache = () => {
    cache.clear();
    inflight.clear();
};
