/**
 * Descarga el catálogo completo de estaciones de la API oficial de Metro Bilbao
 * y lo guarda reducido en src/data/metro/catalog.json.
 * Uso: pnpm sync:metro
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE = 'https://api.metrobilbao.eus';
const OUT = resolve(process.cwd(), 'src/data/metro/catalog.json');

interface RawStation {
    code: string;
    name: string;
    line: string[];
    zones?: Array<{ code: string }>;
    exits?: Record<string, unknown> | Array<{ id: number; name: string; address: string; elevator: boolean; nocturnal: boolean; wheelchairAccessible: boolean; latitude: string; longitude: string }>;
    pointsOfInterest?: Array<{ exit: string; name: string; distance: string | null }>;
    accessibilityEs?: string;
    accessibilityEu?: string;
    accessibilityEn?: string;
    map?: string | null;
    img?: string | null;
    timeToNextStation?: number;
}

function toArr<T>(v: T[] | Record<string, T> | null | undefined): T[] {
    if (!v) return [];
    return Array.isArray(v) ? v : Object.values(v);
}

function stripHtml(html: string | undefined): string {
    return (html ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|li)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

async function main() {
    const res = await fetch(`${BASE}/api/stations?page=1&perPage=200&lang=es`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { 'hydra:member': RawStation[] };
    const stations = json['hydra:member'].map((s) => ({
        code: s.code,
        name: s.name,
        lines: s.line,
        zone: s.zones?.[0]?.code ?? null,
        img: s.img ?? `${BASE}/stations/${s.code}.jpg`,
        map: s.map ? (s.map.startsWith('/') ? `https://cms.metrobilbao.eus${s.map}` : s.map) : null,
        lat: s.exits?.[0] ? Number(s.exits[0].latitude) : null,
        lon: s.exits?.[0] ? Number(s.exits[0].longitude) : null,
        exits: toArr(s.exits).map((e) => ({
            id: e.id,
            name: e.name,
            address: e.address,
            elevator: e.elevator,
            nocturnal: e.nocturnal,
            accessible: e.wheelchairAccessible,
        })),
        pois: toArr(s.pointsOfInterest).map((p) => ({ exit: p.exit, name: p.name, distance: (p.distance ?? "").trim() })),
        accessibility: { es: stripHtml(s.accessibilityEs), en: stripHtml(s.accessibilityEn), eu: stripHtml(s.accessibilityEu) },
    }));
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), stations }));
    console.log(`catalog.json: ${stations.length} estaciones`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
