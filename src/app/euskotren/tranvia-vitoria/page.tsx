import type { Metadata } from 'next';
import EtHome from '@/components/euskotren/EtHome';
import { ET_SCOPES } from '@/lib/euskotren/scopes';

const scope = ET_SCOPES['tranvia-vitoria'];

export const metadata: Metadata = { title: `${scope.name} · Euskotren` };

export default function Page() {
    return <EtHome scope={scope} />;
}
