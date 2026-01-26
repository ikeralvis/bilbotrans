import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BILBOBUS_AJAX_URL = 'https://www.bilbao.eus/cs/Satellite?pagename=Bilbaonet%2FComunes%2FPresentacion%2FBBUS_pintarRecorrido_Ajax';

interface BilbobusApiResponse {
    codParada: string;
    tiempo: number;
}

// Obtener llegadas reales desde la API de Bilbobus
async function fetchRealArrivals(lineId: string): Promise<BilbobusApiResponse[]> {
    try {
        const params = new URLSearchParams();
        params.append('codLinea', lineId);
        params.append('temporada', '21');
        params.append('language', 'es');

        const response = await fetch(BILBOBUS_AJAX_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`Bilbobus API error for line ${lineId}: ${response.status}`);
            return [];
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            console.warn(`Unexpected response for line ${lineId}:`, data);
            return [];
        }

        return data;
    } catch (error) {
        console.error(`Error fetching Bilbobus arrivals for line ${lineId}:`, error);
        return [];
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const stopId = searchParams.get('stopId');
        const lineId = searchParams.get('lineId');
        const linesParam = searchParams.get('lines'); // Para filtrar por múltiples líneas

        if (!stopId) {
            return NextResponse.json(
                { error: 'stopId parameter is required' },
                { status: 400 }
            );
        }

        // Determinar qué líneas consultar
        let lines: string[] = [];
        
        if (linesParam) {
            lines = linesParam.split(',').filter(Boolean);
        } else if (lineId) {
            lines = [lineId];
        }

        if (lines.length === 0) {
            return NextResponse.json({
                stopId,
                arrivals: [],
                timestamp: new Date().toISOString(),
                source: 'bilbobus-api',
                error: 'No lines specified',
            });
        }

        // Obtener llegadas de todas las líneas en paralelo
        const allArrivalsPromises = lines.map(async (line) => {
            const lineArrivals = await fetchRealArrivals(line);
            return lineArrivals
                .filter(arr => arr.codParada === stopId)
                .map(arr => ({
                    lineId: line,
                    stopId: arr.codParada,
                    destination: `Línea ${line}`,
                    etaMinutes: arr.tiempo,
                    etaDisplay: arr.tiempo <= 0 ? 'Llegando' : arr.tiempo === 1 ? '1 min' : `${arr.tiempo} min`,
                }));
        });

        const allArrivals = (await Promise.all(allArrivalsPromises)).flat();
        
        // Ordenar por tiempo de llegada
        allArrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);

        return NextResponse.json({
            stopId,
            arrivals: allArrivals,
            timestamp: new Date().toISOString(),
            source: 'bilbobus-api',
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Error in Bilbobus arrivals API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch arrivals', details: String(error) },
            { status: 500 }
        );
    }
}
