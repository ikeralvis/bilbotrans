import { NextResponse } from 'next/server';
import { fetchTimetable, isStationCode } from '@/lib/metro/client';

export const revalidate = 300;

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const from = (sp.get('from') ?? '').toUpperCase();
    const to = (sp.get('to') ?? '').toUpperCase();
    const start = sp.get('start') ?? '';
    const end = sp.get('end') ?? '';
    const date = sp.get('date') ?? '';
    if (!isStationCode(from) || !isStationCode(to) || !TIME_RE.test(start) || !TIME_RE.test(end) || !DATE_RE.test(date)) {
        return NextResponse.json({ error: 'invalid params' }, { status: 400 });
    }
    try {
        const data = await fetchTimetable(from, to, start, end, date);
        return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
