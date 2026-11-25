import type { Metadata } from 'next';
import { BbLinesView } from '@/components/bilbobus/BbLinesView';

export const metadata: Metadata = { title: 'Líneas · Bilbobus' };

export default function Page() {
    return <BbLinesView />;
}
