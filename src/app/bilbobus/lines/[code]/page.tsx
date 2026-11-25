import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BbLineView } from '@/components/bilbobus/BbLineView';
import { BB_DETAILS, getBbLine } from '@/lib/bilbobus/catalog';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
    const line = getBbLine((await params).code);
    return { title: line ? `Línea ${line.code} · Bilbobus` : 'Línea no encontrada · Bilbobus' };
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
    const line = getBbLine((await params).code);
    if (!line) notFound();
    return <BbLineView line={line} detail={BB_DETAILS[line.code] ?? null} />;
}
