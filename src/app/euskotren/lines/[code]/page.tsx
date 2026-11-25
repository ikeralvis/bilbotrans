import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EtLineView } from '@/components/euskotren/EtLineView';
import { ET_DETAILS, getEtLine } from '@/lib/euskotren/catalog';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
    const line = getEtLine((await params).code);
    return { title: line ? `${line.code} ${line.name} · Euskotren` : 'Línea no encontrada · Euskotren' };
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
    const line = getEtLine((await params).code);
    if (!line) notFound();
    return <EtLineView line={line} detail={ET_DETAILS[line.code] ?? null} />;
}
