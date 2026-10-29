import type { Metadata } from 'next';
import { BizkaibusLinesView } from '@/components/bizkaibus/BizkaibusLinesView';

export const metadata: Metadata = { title: 'Líneas · Bizkaibus' };

export default function Page() {
    return <BizkaibusLinesView />;
}
