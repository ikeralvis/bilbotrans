import { NextResponse } from 'next/server';
import { getEtStation, getEtLine } from '@/lib/euskotren/catalog';
import { stationTimes } from '@/lib/euskotren/times';

/** Horas de salida programadas de una línea en una estación (`?line=E1`), por día de la semana. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const line = new URL(req.url).searchParams.get('line') ?? '';
    if (!getEtStation(id) || !getEtLine(line)) return NextResponse.json({ error: 'unknown station or line' }, { status: 404 });
    return NextResponse.json({ directions: stationTimes(getEtLine(line)!.code, id) }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
}
