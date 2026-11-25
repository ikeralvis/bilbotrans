import detailJson from '@/data/bizkaibus/catalog/lines-detail.json';
import { distanceMeters, getStop, STOPS } from './catalog';
import type { Connection, DirectionId, LineDetail } from './types';

/* Servidor: el recorrido de las 105 líneas pesa ~220 KB y no hace falta en el navegador. */

export const LINE_DETAILS = detailJson as unknown as Record<string, LineDetail>;

/** Paradas "equivalentes": la misma parada de la acera de enfrente o a pocos pasos (dos códigos distintos). */
const EQUIVALENT_METERS = 120;
const MAX_EQUIVALENTS = 6;

function equivalents(code: string): string[] {
    const base = getStop(code);
    if (!base) return [code];
    const near = STOPS.filter((s) => s.code !== code && distanceMeters(base.lat, base.lon, s.lat, s.lon) <= EQUIVALENT_METERS)
        .sort((a, b) => distanceMeters(base.lat, base.lon, a.lat, a.lon) - distanceMeters(base.lat, base.lon, b.lat, b.lon))
        .slice(0, MAX_EQUIVALENTS)
        .map((s) => s.code);
    return [code, ...near];
}

/**
 * Líneas que te llevan directo de una parada a otra: la línea tiene que pasar por el origen *antes* que por el destino en
 * un mismo sentido. Sin transbordos. Se tienen en cuenta paradas equivalentes (≤ 120 m) a ambos lados.
 */
export function findDirect(fromCode: string, toCode: string): Connection[] {
    const origins = new Set(equivalents(fromCode));
    const targets = new Set(equivalents(toCode));
    const found = new Map<string, Connection>();

    for (const line of Object.values(LINE_DETAILS)) {
        for (const direction of ['I', 'V'] as DirectionId[]) {
            const seq = line.directions[direction] ?? [];
            let best: Connection | null = null;
            seq.forEach((from, i) => {
                if (!origins.has(from.code)) return;
                for (let j = i + 1; j < seq.length; j++) {
                    if (!targets.has(seq[j].code)) continue;
                    if (!best || j - i < best.stops) best = { line: line.code, lineName: line.name, direction, from, to: seq[j], stops: j - i };
                    break;
                }
            });
            const prev = found.get(line.code);
            if (best && (!prev || (best as Connection).stops < prev.stops)) found.set(line.code, best);
        }
    }
    return [...found.values()].sort((a, b) => a.stops - b.stops || a.line.localeCompare(b.line));
}

/** Nombre del sentido: hacia la última parada. */
export function directionTowards(line: LineDetail, direction: DirectionId): string {
    const seq = line.directions[direction] ?? [];
    return seq.length ? seq[seq.length - 1].name : '';
}
