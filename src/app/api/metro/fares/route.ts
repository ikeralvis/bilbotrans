import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FareRate {
    type: string;
    zones: number;
    price: string;
}

interface FareItem {
    code: string;
    name: string;
    subTitle: string;
    personal: string;
    validate: string;
    terms: string;
    where: string;
    valid: string;
    required: string;
    periodicity: number;
    img: string;
    imgSlider: string;
    moreDetails: string;
    category: string;
    rates: FareRate[][];
    limitTravel: number;
    order: number;
}

interface FareCategory {
    type: string;
    order: number;
    items: FareItem[];
}

interface FaresResponse {
    title: string;
    description: string;
    categories: { [key: string]: FareCategory };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'es';

    // Solo permitimos "es" y "eu"
    const language = lang === 'eu' ? 'eu' : 'es';
    const endpoint = language === 'eu' ? 'tarifa-guztiak' : 'todas-las-tarifas';

    try {
        const response = await fetch(
            `https://api.metrobilbao.eus/metro_page/${language}/${endpoint}`,
            { next: { revalidate: 3600 } } // Cache 1 hour
        );

        if (!response.ok) {
            throw new Error('Failed to fetch fares');
        }

        const data = await response.json();

        const result: FaresResponse = {
            title: data.title || 'Tarifas',
            description: data.description || '',
            categories: data.configuration?.categorized || {},
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching Metro fares:', error);
        return NextResponse.json(
            { error: 'Failed to fetch fares', title: '', description: '', categories: {} },
            { status: 500 }
        );
    }
}
