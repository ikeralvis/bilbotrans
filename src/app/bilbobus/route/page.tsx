import type { Metadata } from 'next';
import { BbRouteView } from '@/components/bilbobus/BbRouteView';

export const metadata: Metadata = { title: '¿Qué bus cojo? · Bilbobus' };

export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
    const { from, to } = await searchParams;
    return <BbRouteView from={from ?? null} to={to ?? null} />;
}
