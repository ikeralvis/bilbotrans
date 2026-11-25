import stationsJson from '@/data/euskotren/catalog/stations.json';
import linesJson from '@/data/euskotren/catalog/lines.json';
import detailJson from '@/data/euskotren/catalog/lines-detail.json';
import metaJson from '@/data/euskotren/catalog/meta.json';
import { distanceMeters, normalize } from '@/lib/shared/textGeo';
import type { EtDirection, EtLine, EtLineDetail, EtStation } from './types';

export const ET_STATIONS = stationsJson as EtStation[];
export const ET_LINES = linesJson as EtLine[];
export const ET_DETAILS = detailJson as unknown as Record<string, EtLineDetail>;
/** Vigencia del GTFS del que sale el catálogo. */
export const ET_META = metaJson as { feedStart: string | null; feedEnd: string | null; feedVersion: string | null; generatedAt: string };

const STATION_BY_ID = new Map(ET_STATIONS.map((s) => [s.id, s]));
const LINE_BY_CODE = new Map(ET_LINES.map((l) => [l.code.toUpperCase(), l]));

export const getEtStation = (id: string) => STATION_BY_ID.get(id);
export const getEtLine = (code: string) => LINE_BY_CODE.get(code.toUpperCase());

const STATION_INDEX = ET_STATIONS.map((s) => ({ s, text: normalize(`${s.name} ${s.desc}`), name: normalize(s.name) }));
const LINE_INDEX = ET_LINES.map((l) => ({ l, text: normalize(`${l.code} ${l.name}`) }));

/** Todas las palabras deben aparecer; primero las que empiezan por lo escrito. */
/** Estaciones por las que pasa alguna de esas líneas (todas si no se indica). */
export const stationsOfLines = (lines?: string[]) => (lines ? ET_STATIONS.filter((s) => s.lines.some((l) => lines.includes(l))) : ET_STATIONS);

export function searchEtStations(query: string, limit = 8, lines?: string[]): EtStation[] {
    const q = normalize(query);
    if (!q) return [];
    const words = q.split(' ');
    return STATION_INDEX.filter((x) => (!lines || x.s.lines.some((l) => lines.includes(l))) && words.every((w) => x.text.includes(w)))
        .map((x) => ({ s: x.s, rank: x.name.startsWith(q) ? 0 : x.name.split(' ').some((w) => w.startsWith(words[0])) ? 1 : 2 }))
        .sort((a, b) => a.rank - b.rank || a.s.name.length - b.s.name.length)
        .slice(0, limit)
        .map((x) => x.s);
}

export function searchEtLines(query: string): EtLine[] {
    const q = normalize(query);
    if (!q) return ET_LINES;
    const words = q.split(' ');
    return LINE_INDEX.filter((x) => words.every((w) => x.text.includes(w))).map((x) => x.l);
}

export function nearestEtStations(lat: number, lon: number, limit = 4, maxMeters = 1500, lines?: string[]): Array<EtStation & { meters: number }> {
    return stationsOfLines(lines).map((s) => ({ ...s, meters: distanceMeters(lat, lon, s.lat, s.lon) }))
        .filter((s) => s.meters <= maxMeters)
        .sort((a, b) => a.meters - b.meters)
        .slice(0, limit);
}

/** Destino de una línea en un sentido ("Bermeo"), o '' si no existe. */
export const terminalOf = (line: string, dir: EtDirection) => ET_DETAILS[line]?.terminals[dir] ?? '';

/**
 * Estación de la L3 en Euskotren a partir del nombre que le da Metro Bilbao ("Zazpikaleak/Casco viejo", "Matiko"…).
 * Se compara la primera palabra del nombre: en Euskotren llevan el municipio detrás ("Matiko-Bilbao").
 */
export function etL3StationByName(metroName: string): EtStation | undefined {
    const key = normalize(metroName.split('/')[0]).split(' ')[0];
    if (!key) return undefined;
    return ET_STATIONS.find((s) => s.lines.includes('L3') && normalize(s.name).startsWith(key));
}
