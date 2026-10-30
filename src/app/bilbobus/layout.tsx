import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Bilbobus · BilboTrans',
    description: 'Tiempos de espera, líneas y paradas de Bilbobus',
    manifest: '/manifest-bilbobus.json',
    appleWebApp: { capable: true, title: 'Bilbobus', statusBarStyle: 'black-translucent' },
};

/** `net-bilbobus` fija la paleta de la red (rojo y blanco; ver globals.css). */
export default function BilbobusLayout({ children }: { children: React.ReactNode }) {
    return <div className="net-bilbobus">{children}</div>;
}
