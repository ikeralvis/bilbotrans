import type { Metadata } from 'next';
import { EtLinesView } from '@/components/euskotren/EtLinesView';

export const metadata: Metadata = { title: 'Líneas · Euskotren' };

export default function Page() {
    return <EtLinesView />;
}
