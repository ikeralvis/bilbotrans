import { NextResponse } from 'next/server';
import { getBbStop } from '@/lib/bilbobus/catalog';
import { fetchStopWaiting } from '@/lib/bilbobus/waiting';

export const dynamic = 'force-dynamic';

/** Próximos buses de una parada: junta los tiempos de todas las líneas que pasan por ella. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
    const stop = getBbStop((await ctx.params).code);
    if (!stop) return NextResponse.json({ error: 'unknown stop' }, { status: 404 });
    try {
        const fresh = new URL(req.url).searchParams.has('fresh');
        const data = await fetchStopWaiting(stop.code, fresh);
        return NextResponse.json(data, { headers: { 'Cache-Control': fresh ? 'no-store' : 'public, s-maxage=20' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
