import { Suspense } from 'react';
import { LinesView } from './lines-view';

export const metadata = { title: 'Líneas · BilboTrans' };

export default function LinesPage() {
    return (
        <Suspense fallback={<div className="min-h-dvh" style={{ background: 'var(--bg)' }} />}>
            <LinesView />
        </Suspense>
    );
}
