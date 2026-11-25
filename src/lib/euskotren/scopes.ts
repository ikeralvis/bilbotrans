/**
 * Cada "red" que se ve en la home sale del mismo GTFS de Euskotren pero se muestra por separado:
 * el tren, la L3 (que es del metro de Bilbao), el tranvía de Bilbao y el de Vitoria-Gasteiz.
 * Una estación aparece en un ámbito si alguna de sus líneas es de ese ámbito (Matiko, por ejemplo, está en el tren y en la L3).
 */
import type { NetworkId } from '@/components/shared/brand';

export type EtScopeId = 'euskotren' | 'l3' | 'tranvia-bilbao' | 'tranvia-vitoria';

export interface EtScope {
    id: EtScopeId;
    /** Ruta de su home. */
    href: string;
    name: string;
    placeholder: string;
    lines: string[];
    /** Rótulo de la cabecera (los tranvías no son "Euskotren" a la vista). */
    mark: NetworkId;
    /** Clase de tema de globals.css. */
    theme: string;
}

export const ET_SCOPES: Record<EtScopeId, EtScope> = {
    euskotren: { id: 'euskotren', href: '/euskotren', name: 'Euskotren', placeholder: 'Busca tu estación', lines: ['E1', 'E3', 'E3a', 'E4', 'T0', 'T1', 'FE'], mark: 'euskotren', theme: 'net-euskotren' },
    l3: { id: 'l3', href: '/euskotren/l3', name: 'Línea 3', placeholder: 'Busca una estación de la L3', lines: ['L3'], mark: 'euskotren', theme: 'net-euskotren' },
    'tranvia-bilbao': { id: 'tranvia-bilbao', href: '/euskotren/tranvia-bilbao', name: 'Tranvía de Bilbao', placeholder: 'Busca una parada del tranvía', lines: ['TR'], mark: 'tranvia-bilbao', theme: 'net-tranvia-bilbao' },
    'tranvia-vitoria': { id: 'tranvia-vitoria', href: '/euskotren/tranvia-vitoria', name: 'Tranvía de Vitoria-Gasteiz', placeholder: 'Busca una parada del tranvía', lines: ['TG1', 'TG2', '41'], mark: 'tranvia-vitoria', theme: 'net-tranvia-vitoria' },
};

/** Ámbito de una estación para la ruta de vuelta: el primero cuyas líneas paren en ella. */
export const scopeOfLines = (lines: string[]): EtScope => Object.values(ET_SCOPES).find((s) => lines.some((l) => s.lines.includes(l))) ?? ET_SCOPES.euskotren;

/** Ámbito de una línea concreta (para la vista de línea). */
export const scopeOfLine = (code: string): EtScope => scopeOfLines([code]);
