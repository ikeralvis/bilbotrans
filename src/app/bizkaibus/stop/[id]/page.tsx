import type { Metadata } from 'next';
import { BizkaibusStopView } from '@/components/bizkaibus/BizkaibusStopView';
import { getStop } from '@/lib/bizkaibus/catalog';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const stop = getStop((await params).id);
    return { title: stop ? `${stop.name} · Bizkaibus` : 'Parada no encontrada · Bizkaibus' };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    return <BizkaibusStopView code={(await params).id} />;
}
