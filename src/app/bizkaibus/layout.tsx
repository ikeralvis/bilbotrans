import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Bizkaibus · BilboTrans',
    description: 'Llegadas en directo, líneas, paradas y horarios de Bizkaibus',
    manifest: '/manifest-bizkaibus.json',
    appleWebApp: { capable: true, title: 'Bizkaibus', statusBarStyle: 'black-translucent' },
};

/** `net-bizkaibus` fija la paleta de la red (verde, verde claro y blanco; ver globals.css). */
export default function BizkaibusLayout({ children }: { children: React.ReactNode }) {
    return <div className="net-bizkaibus">{children}</div>;
}
