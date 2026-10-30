import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BilboTrans · Metro Bilbao en directo",
  description: "Próximos trenes de Metro Bilbao en tiempo real, por sentido y estación",
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }, { url: '/icon.png', type: 'image/png' }],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  // Cada red sustituye este título en su layout: en iOS es el nombre del icono al añadir a la pantalla de inicio
  appleWebApp: { capable: true, title: 'BilboTrans', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* iOS standalone (black-translucent): la web pinta bajo la barra de estado. Esta banda sólida evita el borroso/contenido bajo el reloj. */}
        <div className="bt-statusbar" aria-hidden />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
