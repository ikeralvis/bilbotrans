import { NextResponse } from 'next/server';
import { getBbLine } from '@/lib/bilbobus/catalog';
import { fetchLineWaiting } from '@/lib/bilbobus/waiting';

export const dynamic = 'force-dynamic';

/** Minutos hasta el próximo bus en cada parada de la línea (una petición al servicio del Ayuntamiento, caché 20 s). */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
    const line = getBbLine((await ctx.params).code);
    if (!line) return NextResponse.json({ error: 'unknown line' }, { status: 404 });
    try {
        const fresh = new URL(req.url).searchParams.has('fresh');
        const data = await fetchLineWaiting(line.code, fresh);
        return NextResponse.json(data, { headers: { 'Cache-Control': fresh ? 'no-store' : 'public, s-maxage=20' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
