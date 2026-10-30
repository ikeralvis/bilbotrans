import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Metro Bilbao · BilboTrans",
    description: "Próximos trenes de Metro Bilbao en tiempo real, por sentido y estación",
    manifest: '/manifest-metro.json',
    appleWebApp: { capable: true, title: 'Metro Bilbao', statusBarStyle: 'black-translucent' },
};

/** `net-metro` fija la paleta de la red (gris, rojo y blanco; ver globals.css). */
export default function MetroLayout({ children }: { children: React.ReactNode }) {
    return <div className="net-metro">{children}</div>;
}
