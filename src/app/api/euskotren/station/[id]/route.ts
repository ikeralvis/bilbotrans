import { NextResponse } from 'next/server';
import { getEtStation } from '@/lib/euskotren/catalog';
import { fetchStationLive } from '@/lib/euskotren/realtime';

export const dynamic = 'force-dynamic';

/** Próximas salidas de una estación de Euskotren (GTFS-RT; horario programado si no hay tiempo real). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    if (!getEtStation(id)) return NextResponse.json({ error: 'unknown station' }, { status: 404 });
    try {
        const fresh = new URL(req.url).searchParams.has('fresh');
        const data = await fetchStationLive(id);
        return NextResponse.json(data, { headers: { 'Cache-Control': fresh ? 'no-store' : 'public, s-maxage=10' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
