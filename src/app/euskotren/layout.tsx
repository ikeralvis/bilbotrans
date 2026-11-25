import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Euskotren · BilboTrans',
    description: 'Próximos trenes y tranvías de Euskotren: E1, E3, E4, L3 y tranvía de Bilbao',
    manifest: '/manifest-euskotren.json',
    appleWebApp: { capable: true, title: 'Euskotren', statusBarStyle: 'default' },
};

/** `net-euskotren` fija la paleta de la red (azul Euskotren; ver globals.css). */
export default function EuskotrenLayout({ children }: { children: React.ReactNode }) {
    return <div className="net-euskotren">{children}</div>;
}
