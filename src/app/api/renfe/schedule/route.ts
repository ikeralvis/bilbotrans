import { NextResponse } from 'next/server';
import { fetchRenfeSchedule } from '@/app/actions';

export const dynamic = 'force-dynamic';

function computeMinutesToGo(departureTime: string, baseDate: Date) {
    const [depHourStr, depMinStr] = departureTime.split(':');
    const depHour = Number.parseInt(depHourStr, 10);
    const depMin = Number.parseInt(depMinStr, 10);
    const departureDate = new Date(baseDate);
    departureDate.setHours(depHour, depMin, 0, 0);

    if (departureDate.getTime() < baseDate.getTime()) {
        // next day
        departureDate.setDate(departureDate.getDate() + 1);
    }
    return Math.round((departureDate.getTime() - baseDate.getTime()) / 60000);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('dest');
    const date = searchParams.get('date'); // optional DD-MM-YYYY

    if (!origin || !destination) {
        return NextResponse.json({ ok: false, error: 'Origin and destination required' }, { status: 400 });
    }

    const dateStr = date || (new Date()).toLocaleDateString('es-ES').split('/').map(v => v.padStart(2, '0')).join('-');

    try {
        const res = await fetchRenfeSchedule(origin, destination, dateStr);
        console.log('[API] Renfe response:', { ok: res.ok, hasData: !!res.data, hasHorario: !!res.data?.horario, horariosCount: res.data?.horario?.length });
        
        if (!res.ok) {
            console.error('[API] Renfe API returned error:', res.error);
            return NextResponse.json({ ok: false, error: res.error || 'Error en la API de Renfe' }, { status: 502 });
        }

        const data = res.data;
        if (!data || !Array.isArray(data.horario) || data.horario.length === 0) {
            console.warn('[API] Renfe API returned no horario or empty');
            return NextResponse.json({ ok: false, error: 'No se encontraron itinerarios para esta ruta' }, { status: 404 });
        }

        const now = new Date();

        const results = (data.horario || []).map((item: any) => {
            const departure = item.horaSalida || item.horaSalidaReal || '';
            const timeToGo = computeMinutesToGo(departure, now);
            return {
                line: item.linea || item.lineaEstOrigen || '',
                trainId: item.cdgoTren || '',
                timeToGo,
                departure,
                arrival: item.horaLlegadaReal || item.horaLlegada || '',
                duration: item.duracion || '',
                isAccessible: !!item.accesible,
                trans: item.trans || undefined
            };
        }).filter((r: any) => r.timeToGo >= 0).sort((a: any, b: any) => a.timeToGo - b.timeToGo);

        console.log('[API] Returning', results.length, 'trains');
        return NextResponse.json({ ok: true, trains: results });
    } catch (err) {
        console.error('[API] Error fetching renfe schedule:', err);
        return NextResponse.json({ ok: false, error: 'Failed to fetch schedule' }, { status: 500 });
    }
}
