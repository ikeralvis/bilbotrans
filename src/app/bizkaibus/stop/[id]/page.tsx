import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBizkaibusStopById } from '@/lib/bizkaibus/api';
import BizkaibusStopDetail from './BizkaibusStopDetail';

interface PageProps {
    readonly params: {
        readonly id: string;
    };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const stop = getBizkaibusStopById(params.id);

    if (!stop) {
        return {
            title: 'Parada no encontrada - BilboTrans',
        };
    }

    return {
        title: `${stop.name} - Bizkaibus - BilboTrans`,
        description: `Horarios y llegadas en tiempo real para la parada ${stop.name} de Bizkaibus en ${stop.municipality}`,
    };
}

export default function BizkaibusStopPage({ params }: PageProps) {
    const stop = getBizkaibusStopById(params.id);

    if (!stop) {
        notFound();
    }

    return <BizkaibusStopDetail stop={stop} />;
}
