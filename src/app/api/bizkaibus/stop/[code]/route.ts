import { NextResponse } from 'next/server';
import { fetchStopArrivals, isStopCode } from '@/lib/bizkaibus/tq';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
    const code = (await ctx.params).code;
    if (!isStopCode(code)) return NextResponse.json({ error: 'invalid stop code' }, { status: 400 });
    try {
        const fresh = new URL(req.url).searchParams.has('fresh');
        const data = await fetchStopArrivals(code, fresh);
        return NextResponse.json(data, { headers: { 'Cache-Control': fresh ? 'no-store' : 'public, s-maxage=10' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
