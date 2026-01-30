import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TrainDelay {
    codTren: string;
    codLinea: string;
    retrasoMin: number;
    codEstAct: string;
    codEstSig: string;
    latitud: number;
    longitud: number;
    accesible: boolean;
}

export async function GET() {
    try {
        const response = await fetch('https://tiempo-real.renfe.com/renfe-visor/flota.json', {
            headers: {
                'User-Agent': 'BilboTrans/1.0'
            },
            next: { revalidate: 30 } // Cache for 30 seconds
        });

        if (!response.ok) {
            return NextResponse.json({ ok: false, error: 'Failed to fetch train delays' }, { status: 502 });
        }

        const data = await response.json();
        const allTrains = data.trenes || [];

        // Filter for Bilbao núcleo (60)
        const bilbaoTrains: TrainDelay[] = allTrains
            .filter((t: any) => t.nucleo === '60')
            .map((t: any) => ({
                codTren: t.codTren,
                codLinea: t.codLinea,
                retrasoMin: parseInt(t.retrasoMin) || 0,
                codEstAct: t.codEstAct,
                codEstSig: t.codEstSig,
                latitud: t.latitud,
                longitud: t.longitud,
                accesible: t.accesible || false
            }));

        // Create a map for quick lookup
        const delayMap: Record<string, number> = {};
        for (const train of bilbaoTrains) {
            delayMap[train.codTren] = train.retrasoMin;
        }

        return NextResponse.json({
            ok: true,
            trains: bilbaoTrains,
            delayMap,
            count: bilbaoTrains.length,
            lastUpdate: data.fechaActualizacion || new Date().toISOString()
        });
    } catch (error) {
        console.error('[Renfe Delays] Error:', error);
        return NextResponse.json({ ok: false, error: 'Error fetching delays' }, { status: 500 });
    }
}
