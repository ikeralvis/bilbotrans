import { NextResponse } from 'next/server';
import { fetchStationLive, isStationCode } from '@/lib/metro/client';
import { SIDE_LABEL } from '@/lib/metro/direction';

export const revalidate = 10;

const MAX_STATIONS = 6;

/**
 * Payload mínimo para widgets (Scriptable, Atajos de iOS, Tasker…): una sola petición para
 * varias estaciones, con el primer tren de cada sentido. Caché de 10 s en el edge.
 * GET /api/metro/widget?stations=ABA,PLE
 */
export async function GET(req: Request) {
    const raw = new URL(req.url).searchParams.get('stations') ?? '';
    const codes = [...new Set(raw.split(',').map((c) => c.trim().toUpperCase()).filter(isStationCode))].slice(0, MAX_STATIONS);
    if (codes.length === 0) return NextResponse.json({ error: 'stations=ABA,PLE required' }, { status: 400 });

    const results = await Promise.allSettled(codes.map((c) => fetchStationLive(c)));
    const stations = results.map((r, i) => {
        if (r.status !== 'fulfilled') return { code: codes[i], name: codes[i], next: [], error: true };
        const s = r.value;
        return {
                code: s.code,
                name: s.name,
                next: s.groups
                    .filter((g) => g.trains.length > 0)
                    .map((g) => ({
                        side: g.side,
                        sideLabel: SIDE_LABEL[g.side],
                        line: g.trains[0].line,
                        destination: g.trains[0].destination,
                        minutes: g.trains[0].minutes,
                    })),
                error: false,
        };
    });

    return NextResponse.json(
        { updatedAt: Date.now(), stations },
        { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20', 'Access-Control-Allow-Origin': '*' } },
    );
}
