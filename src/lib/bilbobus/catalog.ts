import stopsJson from '@/data/bilbobus/catalog/stops.json';
import linesJson from '@/data/bilbobus/catalog/lines.json';
import detailJson from '@/data/bilbobus/catalog/lines-detail.json';
import metaJson from '@/data/bilbobus/catalog/meta.json';
import { distanceMeters, normalize } from '@/lib/shared/textGeo';
import type { BbDirection, BbLine, BbLineDetail, BbStop } from './types';

export const BB_STOPS = stopsJson as BbStop[];
export const BB_LINES = linesJson as BbLine[];
export const BB_DETAILS = detailJson as unknown as Record<string, BbLineDetail>;
/** Vigencia del GTFS del que sale el catálogo. */
export const BB_META = metaJson as { feedStart: string | null; feedEnd: string | null; feedVersion: string | null; generatedAt: string };

const STOP_BY_CODE = new Map(BB_STOPS.map((s) => [s.code, s]));
const LINE_BY_CODE = new Map(BB_LINES.map((l) => [l.code.toUpperCase(), l]));

export const getBbStop = (code: string) => STOP_BY_CODE.get(code);
export const getBbLine = (code: string) => LINE_BY_CODE.get(code.toUpperCase());
/** Color de la línea, o `null` si no tiene uno oficial (entonces se usa el de la red). */
export const lineColor = (code: string) => LINE_BY_CODE.get(code.toUpperCase())?.color ?? null;

const STOP_INDEX = BB_STOPS.map((s) => ({ s, text: normalize(`${s.name} ${s.code}`), name: normalize(s.name) }));
const LINE_INDEX = BB_LINES.map((l) => ({ l, text: normalize(`${l.code} ${l.name}`), code: normalize(l.code) }));

/** Todas las palabras deben aparecer; primero las que empiezan por lo escrito. Un código de parada exacto va directo. */
export function searchBbStops(query: string, limit = 8): BbStop[] {
    const q = normalize(query);
    if (!q) return [];
    const exact = STOP_BY_CODE.get(q);
    if (exact) return [exact];
    const words = q.split(' ');
    return STOP_INDEX.filter((x) => words.every((w) => x.text.includes(w)))
        .map((x) => ({ s: x.s, rank: x.name.startsWith(q) ? 0 : x.name.split(' ').some((w) => w.startsWith(words[0])) ? 1 : 2 }))
        .sort((a, b) => a.rank - b.rank || a.s.name.length - b.s.name.length)
        .slice(0, limit)
        .map((x) => x.s);
}

export function searchBbLines(query: string, limit = 60): BbLine[] {
    const q = normalize(query);
    if (!q) return BB_LINES.slice(0, limit);
    const words = q.split(' ');
    return LINE_INDEX.filter((x) => words.every((w) => x.text.includes(w)))
        .sort((a, b) => Number(b.code === q) - Number(a.code === q) || Number(b.code.startsWith(q)) - Number(a.code.startsWith(q)))
        .slice(0, limit)
        .map((x) => x.l);
}

export function nearestBbStops(lat: number, lon: number, limit = 4, maxMeters = 600): Array<BbStop & { meters: number }> {
    return BB_STOPS.map((s) => ({ ...s, meters: distanceMeters(lat, lon, s.lat, s.lon) }))
        .filter((s) => s.meters <= maxMeters)
        .sort((a, b) => a.meters - b.meters)
        .slice(0, limit);
}

/**
 * Destino final del sentido en el que esta línea pasa por esta parada ("hacia Jesusen Bihotza"): el rótulo del bus, no la última
 * parada del recorrido más habitual. Si el GTFS no trae rótulo, se usa el nombre de esa última parada.
 * En una cabecera (última parada de un sentido) se toma el otro sentido, en el que sí sale de ella.
 */
export function towardsFor(line: string, stopCode: string): string {
    const detail = BB_DETAILS[line];
    if (!detail) return '';
    let fallback = '';
    for (const dir of ['0', '1'] as BbDirection[]) {
        const seq = detail.directions[dir] ?? [];
        const i = seq.findIndex((s) => s.code === stopCode);
        if (i === -1) continue;
        const end = detail.terminals?.[dir] ?? seq[seq.length - 1].name;
        if (i < seq.length - 1) return end;
        fallback = end;
    }
    return fallback;
}
