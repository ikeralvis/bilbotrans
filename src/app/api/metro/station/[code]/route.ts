import { NextResponse } from 'next/server';
import { fetchStationLive, isStationCode } from '@/lib/metro/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
    const code = (await ctx.params).code.toUpperCase();
    if (!isStationCode(code)) return NextResponse.json({ error: 'invalid station code' }, { status: 400 });
    try {
        const fresh = new URL(req.url).searchParams.has('fresh');
        const data = await fetchStationLive(code, 'es', fresh);
        return NextResponse.json(data, { headers: { 'Cache-Control': fresh ? 'no-store' : 'public, s-maxage=10' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
