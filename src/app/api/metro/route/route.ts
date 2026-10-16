import { NextResponse } from 'next/server';
import { fetchRouteLive, isStationCode } from '@/lib/metro/client';

export const revalidate = 10;

export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const from = (sp.get('from') ?? '').toUpperCase();
    const to = (sp.get('to') ?? '').toUpperCase();
    if (!isStationCode(from) || !isStationCode(to) || from === to) {
        return NextResponse.json({ error: 'invalid stations' }, { status: 400 });
    }
    try {
        const data = await fetchRouteLive(from, to);
        return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
