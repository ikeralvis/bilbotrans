import type { Metadata } from 'next';
import { BbStopView } from '@/components/bilbobus/BbStopView';
import { getBbStop } from '@/lib/bilbobus/catalog';
import { titleCase } from '@/lib/shared/textGeo';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const stop = getBbStop((await params).id);
    return { title: stop ? `${titleCase(stop.name)} · Bilbobus` : 'Parada no encontrada · Bilbobus' };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    return <BbStopView code={(await params).id} />;
}
