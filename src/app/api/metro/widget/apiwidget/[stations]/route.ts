import { NextResponse } from 'next/server';
import { fetchWidgetStations, parseStationCodes } from '@/lib/metro/client';

export const revalidate = 10;

type Row = { key: string; value?: string; color?: 'main' | 'muted' | 'info' | 'success' | 'warning' | 'danger' };

// API Widget (iOS) admite 12 filas y 24 caracteres por campo
const MAX_ROWS = 12;
const clip = (s: string) => (s.length > 24 ? `${s.slice(0, 23)}…` : s);

/**
 * Formato "W12" de la app API Widget (https://apiwidget.com): array de {key, value, color}.
 * Sin query string (la clave de la app usa `::` como separador): /api/metro/widget/apiwidget/ABA-PLE
 * Cada estación ocupa 1 cabecera + 1 fila por sentido (+1 separador): caben 3 estaciones.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ stations: string }> }) {
    const codes = parseStationCodes((await ctx.params).stations);
    if (codes.length === 0) return NextResponse.json({ error: 'invalid stations' }, { status: 400 });

    const stations = await fetchWidgetStations(codes);
    const rows: Row[] = [];
    stations.forEach((st, i) => {
        if (i > 0) rows.push({ key: '' });
        rows.push({ key: clip(st.name.toUpperCase()), color: 'main' });
        if (st.error) rows.push({ key: 'Sin datos', color: 'warning' });
        else if (st.next.length === 0) rows.push({ key: 'Sin trenes', color: 'muted' });
        for (const n of st.next) {
            rows.push({
                key: clip(`${n.line} ${n.destination}`),
                value: n.minutes <= 0 ? 'Ya aquí' : `${n.minutes} min`,
                color: n.minutes <= 1 ? 'warning' : n.minutes <= 3 ? 'success' : undefined,
            });
        }
    });

    return NextResponse.json(rows.slice(0, MAX_ROWS), {
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' },
    });
}
