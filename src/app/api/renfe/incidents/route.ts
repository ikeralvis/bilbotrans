import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RenfeAlert {
    id: string;
    type: 'warning' | 'info' | 'error';
    title: string;
    description: string;
    lines: string[];
    station?: string;
    startTime?: number;
}

// Nucleo 60 = Bilbao Cercanías
const BILBAO_ROUTE_PREFIX = '60';

function extractLineFromRoute(routeId: string): string | null {
    // Format: 60T0001C1 -> C1, 60T0003C2 -> C2, etc.
    const match = routeId.match(/C\d+A?$/);
    return match ? match[0] : null;
}

function extractStationFromText(text: string): string | null {
    // Try to extract station name from text (usually at the beginning)
    const match = text.match(/^([A-ZÁÉÍÓÚÑ\s-]+):/);
    return match ? match[1].trim() : null;
}

function determineAlertType(id: string): 'warning' | 'info' | 'error' {
    if (id.startsWith('AVISO_')) return 'warning';
    if (id.startsWith('INFO_')) return 'info';
    if (id.startsWith('ERROR_') || id.includes('CANCEL')) return 'error';
    return 'info';
}

export async function GET() {
    try {
        const response = await fetch('https://gtfsrt.renfe.com/alerts.json', {
            next: { revalidate: 60 }, // Cache for 1 minute
            headers: {
                'User-Agent': 'BilboTrans/1.0'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ ok: false, error: 'Failed to fetch Renfe alerts' }, { status: 502 });
        }

        const data = await response.json();
        const entities = data.entity || [];

        // Filter for Bilbao routes (nucleo 60)
        const bilbaoAlerts: RenfeAlert[] = [];

        for (const entity of entities) {
            const alert = entity.alert;
            if (!alert) continue;

            const informedEntities = alert.informedEntity || [];
            const bilbaoRoutes = informedEntities
                .filter((e: any) => e.routeId?.startsWith(BILBAO_ROUTE_PREFIX))
                .map((e: any) => extractLineFromRoute(e.routeId))
                .filter((line: string | null): line is string => line !== null);

            // Skip if no Bilbao routes
            if (bilbaoRoutes.length === 0) continue;

            // Get unique lines
            const lines: string[] = Array.from(new Set(bilbaoRoutes)) as string[];

            // Get description text (prefer Spanish)
            const translations = alert.descriptionText?.translation || [];
            const esTranslation = translations.find((t: any) => t.language === 'es');
            const description = esTranslation?.text || translations[0]?.text || '';

            // Extract station name if present
            const station = extractStationFromText(description);

            // Clean description (remove station prefix if we extracted it)
            let cleanDescription = description;
            if (station) {
                cleanDescription = description.replace(`${station}:`, '').trim();
            }

            // Split bilingual text if present
            const parts = cleanDescription.split(' // ');
            const finalDescription = parts[parts.length - 1].trim(); // Get last part (Spanish usually)

            bilbaoAlerts.push({
                id: entity.id,
                type: determineAlertType(entity.id),
                title: station || (lines.length > 0 ? `Líneas ${lines.join(', ')}` : 'Aviso general'),
                description: finalDescription,
                lines,
                station: station || undefined,
                startTime: alert.activePeriod?.[0]?.start ? parseInt(alert.activePeriod[0].start) : undefined
            });
        }

        // Sort by type (warnings first) then by start time
        bilbaoAlerts.sort((a, b) => {
            const typeOrder = { error: 0, warning: 1, info: 2 };
            const typeDiff = typeOrder[a.type] - typeOrder[b.type];
            if (typeDiff !== 0) return typeDiff;
            return (b.startTime || 0) - (a.startTime || 0);
        });

        return NextResponse.json({ 
            ok: true, 
            incidents: bilbaoAlerts,
            count: bilbaoAlerts.length,
            lastUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Renfe Incidents] Error:', error);
        return NextResponse.json({ ok: false, error: 'Error fetching incidents' }, { status: 500 });
    }
}
