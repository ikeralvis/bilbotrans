import EtHome from '@/components/euskotren/EtHome';
import { ET_SCOPES } from '@/lib/euskotren/scopes';

export default function Page() {
    return <EtHome scope={ET_SCOPES.euskotren} />;
}
