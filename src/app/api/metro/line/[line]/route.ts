import { NextResponse } from 'next/server';
import { fetchLineDiagram } from '@/lib/metro/client';
import { isLineId } from '@/lib/metro/lines';

export const revalidate = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ line: string }> }) {
    const line = (await ctx.params).line.toUpperCase();
    if (!isLineId(line)) return NextResponse.json({ error: 'invalid line' }, { status: 400 });
    try {
        const data = await fetchLineDiagram(line);
        return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
