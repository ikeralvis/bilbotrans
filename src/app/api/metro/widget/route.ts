import { NextResponse } from 'next/server';
import { fetchWidgetStations, parseStationCodes } from '@/lib/metro/client';

export const revalidate = 10;

/**
 * Payload mínimo para widgets (Scriptable, Atajos de iOS, Tasker…): una sola petición para
 * varias estaciones, con el primer tren de cada sentido. Caché de 10 s en el edge.
 * GET /api/metro/widget?stations=ABA,PLE
 */
export async function GET(req: Request) {
    const codes = parseStationCodes(new URL(req.url).searchParams.get('stations') ?? '');
    if (codes.length === 0) return NextResponse.json({ error: 'stations=ABA,PLE required' }, { status: 400 });
    const stations = await fetchWidgetStations(codes);
    return NextResponse.json(
        { updatedAt: Date.now(), stations },
        { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20', 'Access-Control-Allow-Origin': '*' } },
    );
}
