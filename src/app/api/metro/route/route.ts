import { NextResponse } from 'next/server';
import { fetchRouteLive, isStationCode } from '@/lib/metro/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const from = (sp.get('from') ?? '').toUpperCase();
    const to = (sp.get('to') ?? '').toUpperCase();
    if (!isStationCode(from) || !isStationCode(to) || from === to) {
        return NextResponse.json({ error: 'invalid stations' }, { status: 400 });
    }
    try {
        const fresh = sp.has('fresh');
        const data = await fetchRouteLive(from, to, fresh);
        return NextResponse.json(data, { headers: { 'Cache-Control': fresh ? 'no-store' : 'public, s-maxage=10' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
