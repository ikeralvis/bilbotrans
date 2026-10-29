import { NextResponse } from 'next/server';
import { getLine } from '@/lib/bizkaibus/catalog';
import { fetchLineSchedule } from '@/lib/bizkaibus/tq';

export const revalidate = 3600;

/** Horario programado en texto de una línea (servicio legado de la Diputación). */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
    const code = (await ctx.params).code.toUpperCase();
    if (!getLine(code)) return NextResponse.json({ error: 'unknown line' }, { status: 404 });
    try {
        const schedule = await fetchLineSchedule(code);
        return NextResponse.json(schedule, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
