/**
 * El horario de Bizkaibus es texto libre (ver API.md §2.4). Se estructura con heurísticas y, si algo no encaja, se deja tal cual:
 *
 *   SALIDAS DE BILBAO:
 *
 *   Laborables: Primera salida 06:15 hasta Mungia.
 *   De 06:45 a 21:45 cada 30 minutos.
 *   Horas de paso por Mungia a :05 y :35.
 *
 *   Sábados: De 06:45 a 21:45 cada hora
 *
 * Contrastado con las ~1 860 tablas de horarios del servicio (29/10/2026): el 87 % se estructura en grupos por tipo de día.
 */

export interface TimeRange {
    from: string;
    to: string;
    /** "cada 30 min", "cada hora", "cada media hora"… */
    every: string | null;
}

/** Una línea del horario ya interpretada. */
export type ScheduleLine =
    | { kind: 'ranges'; ranges: TimeRange[] }
    | { kind: 'times'; times: string[] }
    | { kind: 'text'; text: string };

export interface ScheduleGroup {
    /** "Laborables", "Sábados y festivos"… Vacío si el texto no distingue tipos de día. */
    label: string;
    lines: ScheduleLine[];
}

export interface ParsedSchedule {
    /** "Bilbao" en "SALIDAS DE BILBAO:". */
    origin: string | null;
    groups: ScheduleGroup[];
    /** Líneas sueltas (observaciones, "No hay servicio") que no pertenecen a un grupo. */
    notes: string[];
}

const T = String.raw`\d{1,2}:\d{2}`;
const ORIGIN_RE = /^salidas\s+(?:de|desde|hasta|a)\s+(.+?)\s*:?\s*$/i;
/** "Etiqueta: contenido". Sin cifras ni puntos en la etiqueta, para no confundir una frase con un tipo de día. */
const LABEL_RE = /^([^:.\n\d]{2,54}[^:.\n\d\s]):\s*(.*)$/; // sin espacio antes de ":" → "a :05" no es una etiqueta
const NO_SERVICE_RE = /^no hay servicio\.?$/i;

/** "6:35" → "06:35" (conserva un asterisco final). */
export const padTime = (t: string) => t.replace(/^(\d):/, '0$1:');

const everyLabel = (s: string) => `cada ${s.trim().replace(/\.$/, '').replace(/\bminutos\b/i, 'min').toLowerCase()}`;

/** "De 10:00 a 13:30 cada media hora y de 17:00 a 22:30 cada media hora" → dos rangos con su frecuencia. */
function parseRanges(text: string): ScheduleLine | null {
    const re = new RegExp(String.raw`(?:de\s+)?(${T})\s*a\s*(${T})(?:\s+cada\s+([^.,;]+?))?(?=\s+y\s+|\s*[.,;]|\s*$)`, 'gi');
    const ranges: TimeRange[] = [];
    let rest = text;
    for (const m of text.matchAll(re)) {
        ranges.push({ from: padTime(m[1]), to: padTime(m[2]), every: m[3] ? everyLabel(m[3]) : null });
        rest = rest.replace(m[0], '');
    }
    if (ranges.length === 0 || rest.replace(/\b(de|y)\b|[\s.,;]/gi, '') !== '') return null;
    return { kind: 'ranges', ranges };
}

function parseSentence(raw: string): ScheduleLine {
    const text = raw.trim().replace(/\s+/g, ' ');
    const ranges = parseRanges(text);
    if (ranges) return ranges;

    // "10:15 18:15" / "6:35, 7:35, 8:35" / "07:25* 08:00"
    const times = text.match(new RegExp(`${T}\\*?`, 'g'));
    if (times && text.replace(new RegExp(`${T}\\*?`, 'g'), '').replace(/[\s,;.]|\by\b/gi, '') === '') {
        return { kind: 'times', times: times.map(padTime) };
    }
    return { kind: 'text', text };
}

/** Una línea del original puede traer varias frases ("6:35, 7:35. De 9:35 a 21:35 cada 30 minutos"). */
function parseLine(raw: string): ScheduleLine[] {
    return raw
        .trim()
        .split(/\.\s+(?=[A-ZÁÉÍÓÚÑ0-9])/)
        .filter((s) => s.trim())
        .map(parseSentence);
}

/** Divide un texto en {origen, grupos por tipo de día, notas}. Nunca lanza: lo que no entiende va como texto. */
export function parseSchedule(source: string): ParsedSchedule {
    const result: ParsedSchedule = { origin: null, groups: [], notes: [] };
    let current: ScheduleGroup | null = null;
    let afterBlank = false;

    for (const rawLine of source.replace(/\r/g, '').split('\n')) {
        const line = rawLine.trim();
        if (line === '') {
            afterBlank = true;
            continue;
        }

        if (NO_SERVICE_RE.test(line)) {
            result.notes.push('No hay servicio');
            afterBlank = false;
            continue;
        }

        // Cabecera "SALIDAS DE BILBAO:" sola; con contenido detrás ("Salidas desde X: De 6:00 a…") es un grupo normal.
        const origin = !/:\s*\S/.test(line) && !/\d/.test(line) ? ORIGIN_RE.exec(line) : null;
        if (origin && !result.origin) {
            result.origin = origin[1].replace(/:$/, '').trim();
            afterBlank = false;
            continue;
        }

        const label = LABEL_RE.exec(line);
        if (label && !origin) {
            current = { label: label[1].trim(), lines: [] };
            result.groups.push(current);
            if (label[2].trim()) current.lines.push(...parseLine(label[2]));
            afterBlank = false;
            continue;
        }

        if (current && !afterBlank) {
            current.lines.push(...parseLine(line));
        } else if (!current && result.groups.length === 0 && /\d{1,2}:\d{2}/.test(line)) {
            // Horarios sin tipo de día ("SALIDAS DE GETXO: 06:30 07:00 …"): un grupo sin etiqueta.
            current = { label: '', lines: parseLine(line) };
            result.groups.push(current);
        } else {
            result.notes.push(line);
        }
        afterBlank = false;
    }
    return result;
}

/** ¿El tipo de día de `label` es el de hoy? No conoce festivos: el domingo cuenta como festivo. */
export function isToday(label: string, now = new Date()): boolean {
    if (!label) return false;
    const weekday = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })).getDay(); // 0 = domingo
    const l = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/diario|todos los dias/.test(l)) return true;
    if (weekday === 0) return /festivo|domingo|fin de semana/.test(l);
    if (weekday === 6) return /sabado|fin de semana/.test(l);
    return /laborable|lunes|lectivo/.test(l);
}
