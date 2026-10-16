import { NextResponse } from 'next/server';
import { fetchStationLive, isStationCode } from '@/lib/metro/client';

export const revalidate = 10;

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
    const code = (await ctx.params).code.toUpperCase();
    if (!isStationCode(code)) return NextResponse.json({ error: 'invalid station code' }, { status: 400 });
    try {
        const data = await fetchStationLive(code);
        return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
