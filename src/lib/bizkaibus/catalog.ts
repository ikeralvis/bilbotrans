import stopsJson from '@/data/bizkaibus/catalog/stops.json';
import linesJson from '@/data/bizkaibus/catalog/lines.json';
import { distanceMeters, normalize } from '@/lib/shared/textGeo';
import type { CatalogLine, CatalogStop } from './types';

export { distanceMeters, normalize };

export const STOPS = stopsJson as CatalogStop[];
export const LINES = linesJson as CatalogLine[];

const STOP_BY_CODE = new Map(STOPS.map((s) => [s.code, s]));
const LINE_BY_CODE = new Map(LINES.map((l) => [l.code, l]));

export const getStop = (code: string) => STOP_BY_CODE.get(code);
export const getLine = (code: string) => LINE_BY_CODE.get(code);

/** Los nombres vienen bilingües ("Abando (geltokia/estación)"): se indexan una sola vez. */
const STOP_INDEX = STOPS.map((s) => ({ s, text: normalize(`${s.name} ${s.municipality}`), name: normalize(s.name) }));
const LINE_INDEX = LINES.map((l) => ({ l, text: normalize(`${l.code} ${l.name}`), code: normalize(l.code) }));

/** Todas las palabras de la búsqueda deben aparecer; gana el que empieza por lo escrito. */
export function searchStops(query: string, limit = 8): CatalogStop[] {
    const q = normalize(query);
    if (!q) return [];
    if (/^\d+$/.test(q)) {
        const exact = STOP_BY_CODE.get(q.padStart(4, '0')) ?? STOP_BY_CODE.get(q);
        if (exact) return [exact];
    }
    const words = q.split(' ');
    return STOP_INDEX.filter((x) => words.every((w) => x.text.includes(w)))
        .map((x) => ({ s: x.s, rank: x.name.startsWith(q) ? 0 : x.name.split(' ').some((w) => w.startsWith(words[0])) ? 1 : 2 }))
        .sort((a, b) => a.rank - b.rank || a.s.name.length - b.s.name.length)
        .slice(0, limit)
        .map((x) => x.s);
}

export function searchLines(query: string, limit = 30): CatalogLine[] {
    const q = normalize(query);
    if (!q) return LINES.slice(0, limit);
    const words = q.split(' ');
    return LINE_INDEX.filter((x) => words.every((w) => x.text.includes(w)))
        .sort((a, b) => Number(b.code.startsWith(q)) - Number(a.code.startsWith(q)) || a.l.code.localeCompare(b.l.code))
        .slice(0, limit)
        .map((x) => x.l);
}

export function nearestStops(lat: number, lon: number, limit = 4, maxMeters = 800): Array<CatalogStop & { meters: number }> {
    return STOPS.map((s) => ({ ...s, meters: distanceMeters(lat, lon, s.lat, s.lon) }))
        .filter((s) => s.meters <= maxMeters)
        .sort((a, b) => a.meters - b.meters)
        .slice(0, limit);
}

/** "A3527" → "3527": como aparece en el cartel del bus. */
export const shortLine = (code: string) => code.replace(/^A/, '');
