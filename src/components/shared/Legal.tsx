import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

export const REPO_URL = 'https://github.com/ikeralvis/bilbotrans';
export const UPDATED = '29 de octubre de 2026';

type Network = 'metro' | 'bilbobus' | 'bizkaibus';

/** Textos de cada red: de dónde salen los datos y que BilboTrans no es oficial. Mismo texto en la home de la red y en el aviso legal. */
export const NETWORK_NOTICE: Record<Network, { data: string; independent: string }> = {
    metro: {
        data: 'Datos: Metro Bilbao (tiempo real, avisos y fichas de estación) y Consorcio de Transportes de Bizkaia (data.ctb.eus, CC-BY 4.0: horarios).',
        independent: 'Proyecto independiente y no oficial, sin relación con Metro Bilbao S.A. ni con el Consorcio de Transportes de Bizkaia. Los tiempos en directo son una previsión del operador.',
    },
    bizkaibus: {
        data: 'Datos: Diputación Foral de Bizkaia (llegadas, líneas y horarios de Bizkaibus) y Open Data Euskadi (CC-BY 4.0: avisos).',
        independent: 'Proyecto independiente y no oficial, sin relación con Bizkaibus ni con la Diputación Foral de Bizkaia. Los tiempos en directo son una previsión del operador.',
    },
    bilbobus: {
        data: 'Datos: Ayuntamiento de Bilbao / Bilbobus (Open Data Bilbao: horarios y paradas; tiempos de espera del servicio de la web de Bilbobus).',
        independent: 'Proyecto independiente y no oficial, sin relación con Bilbobus ni con el Ayuntamiento de Bilbao. Los tiempos de espera los publica Bilbobus y se actualizan cada pocos minutos.',
    },
};

/** Pie de las pantallas: origen de los datos, aviso de independencia y enlaces legales. */
export function LegalFooter({ network, className = '' }: { network?: Network; className?: string }) {
    const n = network ? NETWORK_NOTICE[network] : null;
    return (
        <footer className={`space-y-2 px-1 text-xs leading-5 ${className}`} style={{ color: 'var(--ink-2)' }}>
            {n ? (
                <>
                    <p>{n.data}</p>
                    <p>{n.independent}</p>
                </>
            ) : (
                <p>
                    BilboTrans usa datos públicos y abiertos de sus operadores. Es un proyecto independiente y no oficial, sin relación con Metro Bilbao, Bizkaibus, Bilbobus ni con las administraciones que publican los datos. Los logotipos son de sus titulares.
                </p>
            )}
            <p className="flex flex-wrap gap-x-3 gap-y-1 font-medium">
                <Link href="/legal" className="underline underline-offset-2">Aviso legal y datos</Link>
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
