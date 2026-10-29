import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BizkaibusLineView } from '@/components/bizkaibus/BizkaibusLineView';
import { LINE_DETAILS } from '@/lib/bizkaibus/connect';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
    const line = LINE_DETAILS[(await params).code.toUpperCase()];
    return { title: line ? `${line.code} ${line.name} · Bizkaibus` : 'Línea no encontrada · Bizkaibus' };
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
    const line = LINE_DETAILS[(await params).code.toUpperCase()];
    if (!line) notFound();
    return <BizkaibusLineView line={line} />;
}
