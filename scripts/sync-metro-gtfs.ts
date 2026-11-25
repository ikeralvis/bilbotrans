/**
 * Descarga el GTFS oficial de Metro Bilbao y genera src/data/metro/gtfs.json:
 * calendario de servicios, patrones de viaje (paradas + tiempos relativos),
 * viajes (patrón, servicio, hora de inicio) y shapes simplificados.
 * Uso: pnpm sync:gtfs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';

const URL = 'https://cms.metrobilbao.eus/get/open_data/horarios/es';
const OUT = resolve(process.cwd(), 'src/data/metro/gtfs.json');

type Row = Record<string, string>;

function table(zip: AdmZip, name: string): Row[] {
    const entry = zip.getEntry(name);
    if (!entry) throw new Error(`Falta ${name} en el GTFS`);
    return parse(entry.getData().toString('utf8').replace(/^﻿/, ''), {
        columns: (h: string[]) => h.map((x) => x.trim()),
        skip_empty_lines: true,
        trim: true,
    }) as Row[];
}

const toSec = (t: string) => {
    const [h, m, s] = t.split(':').map(Number);
    return h * 3600 + m * 60 + s;
};

// ---- Geometría ----
const R = 6371000;
function dist(a: [number, number], b: [number, number]): number {
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLon = ((b[1] - a[1]) * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
}

/** Douglas-Peucker en un plano local (metros). */
function simplify(pts: Array<[number, number]>, tol: number): Array<[number, number]> {
    if (pts.length < 3) return pts;
    const lat0 = pts[0][0];
    const kx = Math.cos((lat0 * Math.PI) / 180) * 111320;
    const xy = pts.map(([la, lo]) => [lo * kx, la * 110540] as const);
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack: Array<[number, number]> = [[0, pts.length - 1]];
    while (stack.length) {
        const [s, e] = stack.pop()!;
        let max = 0;
        let idx = -1;
        const [x1, y1] = xy[s];
        const [x2, y2] = xy[e];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        for (let i = s + 1; i < e; i++) {
            const [px, py] = xy[i];
            const t = len2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) : 0;
            const d = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
            if (d > max) {
                max = d;
                idx = i;
            }
        }
        if (max > tol && idx > 0) {
            keep[idx] = 1;
            stack.push([s, idx], [idx, e]);
        }
    }
    return pts.filter((_, i) => keep[i]);
}

/** Distancia (m) a lo largo de la polilínea del punto más cercano a `p`, buscando desde `from`. */
function project(line: Array<[number, number]>, p: [number, number], from: number): number {
    const kx = Math.cos((p[0] * Math.PI) / 180) * 111320;
    let acc = 0;
    let best = Infinity;
    let bestAt = from;
    for (let i = 0; i < line.length - 1; i++) {
        const segLen = dist(line[i], line[i + 1]);
        const ax = line[i][1] * kx, ay = line[i][0] * 110540;
        const bx = line[i + 1][1] * kx, by = line[i + 1][0] * 110540;
        const px = p[1] * kx, py = p[0] * 110540;
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy;
        const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
        const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        const at = acc + t * segLen;
        if (at >= from - 1 && d < best) {
            best = d;
            bestAt = at;
        }
        acc += segLen;
    }
    return bestAt;
}

const r5 = (n: number) => Math.round(n * 1e5) / 1e5;

async function main() {
    const res = await fetch(URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const zip = new AdmZip(Buffer.from(await res.arrayBuffer()));

    const stopsRaw = table(zip, 'stops.txt');
    const stopCode = new Map(stopsRaw.map((s) => [s.stop_id, s.stop_code]));
    const stops: Record<string, [number, number, string]> = {};
    for (const s of stopsRaw) stops[s.stop_code] = [r5(Number(s.stop_lat)), r5(Number(s.stop_lon)), s.stop_name];

    // Shapes
    const shapeRows = table(zip, 'shapes.txt');
    const rawShapes = new Map<string, Array<[number, number, number]>>();
    for (const r of shapeRows) {
        const a = rawShapes.get(r.shape_id) ?? [];
        a.push([Number(r.shape_pt_sequence), Number(r.shape_pt_lat), Number(r.shape_pt_lon)]);
        rawShapes.set(r.shape_id, a);
    }
    const shapes: Record<string, Array<[number, number]>> = {};
    for (const [id, pts] of rawShapes) {
        pts.sort((a, b) => a[0] - b[0]);
        shapes[id] = simplify(pts.map(([, la, lo]) => [la, lo] as [number, number]), 2).map(([la, lo]) => [r5(la), r5(lo)]);
    }

    // Calendario
    const services: Record<string, { days: number[]; start: string; end: string }> = {};
    for (const r of table(zip, 'calendar.txt')) {
        services[r.service_id] = {
            days: [r.sunday, r.monday, r.tuesday, r.wednesday, r.thursday, r.friday, r.saturday].map(Number),
            start: r.start_date,
            end: r.end_date,
        };
    }
    const exceptions = table(zip, 'calendar_dates.txt').map((r) => [r.service_id, r.date, Number(r.exception_type)] as [string, string, number]);
    // servicios que solo existen vía calendar_dates
    for (const [id] of exceptions) services[id] ??= { days: [0, 0, 0, 0, 0, 0, 0], start: '00000000', end: '00000000' };

    // Stop times por viaje
    const times = new Map<string, Array<{ seq: number; code: string; arr: number; dep: number }>>();
    for (const r of table(zip, 'stop_times.txt')) {
        const a = times.get(r.trip_id) ?? [];
        a.push({ seq: Number(r.stop_sequence), code: stopCode.get(r.stop_id) ?? r.stop_id, arr: toSec(r.arrival_time), dep: toSec(r.departure_time) });
        times.set(r.trip_id, a);
    }

    // Patrones (viajes con mismas paradas y tiempos relativos) + viajes
    const patterns: Array<{ shape: string; headsign: string; dir: number; stops: string[]; t: number[]; d: number[] }> = [];
    const patIndex = new Map<string, number>();
    const trips: Array<[number, string, number]> = [];
    for (const tr of table(zip, 'trips.txt')) {
        const st = times.get(tr.trip_id);
        if (!st || st.length < 2 || !shapes[tr.shape_id]) continue;
        st.sort((a, b) => a.seq - b.seq);
        const t0 = st[0].arr;
        const rel: number[] = [];
        for (const s of st) rel.push(s.arr - t0, s.dep - t0);
        const key = `${tr.shape_id}|${tr.trip_headsign}|${st.map((s) => s.code).join(',')}|${rel.join(',')}`;
        let pi = patIndex.get(key);
        if (pi === undefined) {
            pi = patterns.length;
            patIndex.set(key, pi);
            patterns.push({ shape: tr.shape_id, headsign: tr.trip_headsign, dir: Number(tr.direction_id), stops: st.map((s) => s.code), t: rel, d: [] });
        }
        trips.push([pi, tr.service_id, t0]);
    }

    // Distancia a lo largo del shape de cada parada
    const lengths: Record<string, number> = {};
    for (const [id, line] of Object.entries(shapes)) {
        let l = 0;
        for (let i = 0; i < line.length - 1; i++) l += dist(line[i], line[i + 1]);
        lengths[id] = Math.round(l);
    }
    for (const p of patterns) {
        let from = 0;
        p.d = p.stops.map((code) => {
            const s = stops[code];
            const d = project(shapes[p.shape], [s[0], s[1]], from);
            from = d;
            return Math.round(d);
        });
    }

    // Servicio -> índices compactos
    const serviceIds = Object.keys(services);
    const sIdx = new Map(serviceIds.map((id, i) => [id, i]));
    const dates = Object.values(services).filter((s) => s.end !== '00000000');
    const validFrom = dates.map((s) => s.start).sort()[0];
    const validTo = dates.map((s) => s.end).sort().at(-1);

    const data = {
        generatedAt: new Date().toISOString(),
        validFrom,
        validTo,
        stops,
        shapes,
        services: serviceIds.map((id) => ({ id, ...services[id] })),
        exceptions: exceptions.map(([id, date, type]) => [sIdx.get(id)!, date, type]),
        patterns,
        trips: trips.map(([p, s, t]) => [p, sIdx.get(s)!, t]),
    };
    mkdirSync(dirname(OUT), { recursive: true });
    const json = JSON.stringify(data);
    writeFileSync(OUT, json);
    console.log(`gtfs.json: ${patterns.length} patrones, ${trips.length} viajes, ${Object.keys(shapes).length} shapes, ${(json.length / 1024).toFixed(0)} KB, vigente ${validFrom}–${validTo}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
