import { NextResponse } from 'next/server';
import { getStop } from '@/lib/bizkaibus/catalog';
import { findDirect } from '@/lib/bizkaibus/connect';

/** Líneas directas entre dos paradas (datos estáticos: sin llamadas a la API en vivo). */
export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const from = sp.get('from') ?? '';
    const to = sp.get('to') ?? '';
    if (!getStop(from) || !getStop(to) || from === to) return NextResponse.json({ error: 'invalid stops' }, { status: 400 });
    return NextResponse.json({ connections: findDirect(from, to) }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
}
