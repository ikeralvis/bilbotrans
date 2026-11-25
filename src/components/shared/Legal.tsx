import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

export const REPO_URL = 'https://github.com/ikeralvis/bilbotrans';
export const UPDATED = '25 de noviembre de 2026';

type Network = 'metro' | 'bilbobus' | 'bizkaibus' | 'euskotren';

interface Credits {
    /** Quién publica cada dato y con qué licencia. */
    sources: string;
    /** Organizaciones con las que BilboTrans no tiene vínculo. */
    owners: string;
    /** Qué hay que saber de los tiempos de esta red. */
    caveat: string;
}

/** Créditos de cada red: se muestran al pie de su home y en la página de fuentes. */
export const NETWORK_CREDITS: Record<Network, Credits> = {
    metro: {
        sources: 'Metro Bilbao (tiempos en directo, avisos y estaciones) y Consorcio de Transportes de Bizkaia (horarios, data.ctb.eus, CC-BY 4.0)',
        owners: 'Metro Bilbao S.A. ni el Consorcio de Transportes de Bizkaia',
        caveat: 'Los minutos los estima el propio operador.',
    },
    bizkaibus: {
        sources: 'Diputación Foral de Bizkaia (llegadas, líneas y horarios) y Open Data Euskadi (avisos, CC-BY 4.0)',
        owners: 'Bizkaibus ni la Diputación Foral de Bizkaia',
        caveat: 'Los minutos los estima el propio operador.',
    },
    euskotren: {
        sources: 'Eusko Trenbideak / Euskotren y Gobierno Vasco (Open Data Euskadi, CC-BY 4.0: horarios GTFS y tiempo real GTFS-RT)',
        owners: 'Eusko Trenbideak ni el Gobierno Vasco',
        caveat: 'Si el operador no da tiempo real para un tren, verás su hora programada, marcada como tal.',
    },
    bilbobus: {
        sources: 'Ayuntamiento de Bilbao / Bilbobus (Open Data Bilbao para horarios y paradas; tiempos de espera de la web de Bilbobus)',
        owners: 'Bilbobus ni el Ayuntamiento de Bilbao',
        caveat: 'Bilbobus renueva sus tiempos de espera cada pocos minutos.',
    },
};

/** Pie de las pantallas: créditos de los datos y enlaces a las páginas de fuentes y privacidad. */
export function LegalFooter({ network, className = '' }: { network?: Network; className?: string }) {
    const c = network ? NETWORK_CREDITS[network] : null;
    return (
        <footer className={`space-y-2 px-1 text-xs leading-5 ${className}`} style={{ color: 'var(--ink-2)' }}>
            {c ? (
                <p>
                    Con información de {c.sources}. {c.caveat} BilboTrans es un proyecto personal: ni {c.owners} participan en él.
                </p>
            ) : (
                <p>Un proyecto personal hecho en Bilbao con datos abiertos. Ningún operador de transporte participa en él ni lo respalda.</p>
            )}
            <p className="flex flex-wrap gap-x-3 gap-y-1 font-medium">
                <Link href="/legal" className="underline underline-offset-2">Fuentes y condiciones</Link>
                <Link href="/privacidad" className="underline underline-offset-2">Privacidad</Link>
            </p>
        </footer>
    );
}

/* ───────── Maquetación de los documentos legales ───────── */

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="min-h-dvh pb-[max(3rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <Link href="/" aria-label="Volver al inicio" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </Link>
                    <h1 className="text-[20px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{title}</h1>
                </div>
            </header>
            <main className="mx-auto max-w-2xl space-y-6 px-5 pt-6" style={{ color: 'var(--ink)' }}>
                {children}
                <p className="pt-2 text-xs" style={{ color: 'var(--ink-2)' }}>Última actualización: {UPDATED}.</p>
            </main>
        </div>
    );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-2.5">
            <h2 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h2>
            <div className="space-y-2.5 text-[15px] leading-6" style={{ color: 'color-mix(in srgb, var(--ink) 86%, transparent)' }}>{children}</div>
        </section>
    );
}

export function List({ children }: { children: ReactNode }) {
    return <ul className="list-disc space-y-1.5 pl-5 marker:text-[var(--ink-2)]">{children}</ul>;
}
