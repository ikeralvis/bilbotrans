import { NextResponse } from 'next/server';
import { getBbLine, getBbStop } from '@/lib/bilbobus/catalog';
import { passTimes } from '@/lib/bilbobus/times';

/** Horas de paso programadas de una línea en una parada (`?line=56`). Datos estáticos del GTFS: sin llamadas al Ayuntamiento. */
export async function GET(req: Request, ctx: { params: Promise<{ stop: string }> }) {
    const stop = getBbStop((await ctx.params).stop);
    const line = getBbLine(new URL(req.url).searchParams.get('line') ?? '');
    if (!stop || !line) return NextResponse.json({ error: 'unknown stop or line' }, { status: 404 });
    return NextResponse.json({ stop: stop.code, line: line.code, directions: passTimes(line.code, stop.code) }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
