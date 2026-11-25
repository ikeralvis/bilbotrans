import type { Metadata } from 'next';
import { BizkaibusRouteView } from '@/components/bizkaibus/BizkaibusRouteView';

export const metadata: Metadata = { title: '¿Qué bus cojo? · Bizkaibus' };

export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
    const { from, to } = await searchParams;
    return <BizkaibusRouteView from={from ?? null} to={to ?? null} />;
}
