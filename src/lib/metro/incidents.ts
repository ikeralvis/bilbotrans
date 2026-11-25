/** Aviso del CMS oficial (`/api/metro/incidents`, que lee `metro_page/{lang}/avisos`). */
export interface MetroIncident {
    title: string;
    description: string;
    resume: string;
    createdAt: string;
    resoluteAt: string | null;
    line: string[];
    station: { code: string | null };
    exit: string | null;
    type: string;
    direction: string | null;
}

export interface IncidentsPayload {
    serviceIssues: MetroIncident[];
    installationIssues: MetroIncident[];
}

/** El CMS devuelve HTML en las descripciones: se muestra siempre como texto plano. */
export function plainText(html: string | null | undefined): string {
    return (html ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|li|div)>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
