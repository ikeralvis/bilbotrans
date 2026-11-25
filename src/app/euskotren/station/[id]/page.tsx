import type { Metadata } from 'next';
import { EtStationView } from '@/components/euskotren/EtStationView';
import { getEtStation } from '@/lib/euskotren/catalog';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const station = getEtStation((await params).id);
    return { title: station ? `${station.name} · Euskotren` : 'Estación no encontrada · Euskotren' };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    return <EtStationView id={(await params).id} />;
}
