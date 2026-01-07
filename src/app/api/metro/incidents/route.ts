import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Incident {
    title: string;
    description: string;
    resume: string;
    observation: string;
    createdAt: string;
    isInIssuesBar: boolean;
    resoluteAt: string | null;
    line: string[];
    station: { code: string | null };
    exit: string | null;
    type: string;
    direction: string | null;
}

interface IncidentsResponse {
    serviceIssues: Incident[];
    installationIssues: Incident[];
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'es';

    // Solo permitimos "es" y "eu"
    const language = lang === 'eu' ? 'eu' : 'es';
    const endpoint = language === 'eu' ? 'abisuak' : 'avisos';

    try {
        const response = await fetch(
            `https://api.metrobilbao.eus/metro_page/${language}/${endpoint}`,
            { next: { revalidate: 300 } } // Cache 5 minutes
        );

        if (!response.ok) {
            throw new Error('Failed to fetch incidents');
        }

        const data = await response.json();

        const result: IncidentsResponse = {
            serviceIssues: (data.configuration?.incidences?.service_issue || []).map((incident: Incident) => ({
                ...incident,
                station: { code: null },
            })),
            installationIssues: (data.configuration?.incidences?.installation_issue || []).map((incident: Incident) => ({
                ...incident,
                station: { code: incident.station?.code || null },
            })),
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching Metro incidents:', error);
        return NextResponse.json(
            { error: 'Failed to fetch incidents', serviceIssues: [], installationIssues: [] },
            { status: 500 }
        );
    }
}
