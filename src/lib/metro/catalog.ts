import catalogJson from '@/data/metro/catalog.json';

export interface CatalogExit { id: number; name: string; address: string; elevator: boolean; nocturnal: boolean; accessible: boolean }
export interface CatalogStation {
    code: string;
    name: string;
    lines: string[];
    zone: string | null;
    img: string;
    map: string | null;
    lat: number | null;
    lon: number | null;
    exits: CatalogExit[];
    pois: Array<{ exit: string; name: string; distance: string }>;
    accessibility: { es: string; en: string; eu: string };
}

export const STATIONS = (catalogJson as unknown as { stations: CatalogStation[] }).stations;
const BY_CODE = new Map(STATIONS.map((s) => [s.code, s]));

export const getStation = (code: string) => BY_CODE.get(code.toUpperCase());

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Búsqueda local e instantánea (prefijo primero, luego contiene). */
export function searchStations(query: string, limit = 8): CatalogStation[] {
    const q = norm(query.trim());
    if (!q) return [];
    const starts: CatalogStation[] = [];
    const contains: CatalogStation[] = [];
    for (const s of STATIONS) {
        const n = norm(s.name);
        if (n.startsWith(q) || s.code.toLowerCase() === q) starts.push(s);
        else if (n.includes(q)) contains.push(s);
    }
    return [...starts, ...contains].slice(0, limit);
}
