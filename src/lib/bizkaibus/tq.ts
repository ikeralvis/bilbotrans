import { plainText } from '@/lib/metro/incidents';
import type { BizkaibusAlert, BusPass, LineSchedule, ScheduleSeason, StopArrival, StopArrivals } from './types';

/* Capa de servidor: API oficial de Bizkaibus (TQ) y feeds de Open Data Euskadi. Ver API.md §2. */

const TQ = 'https://apli.bizkaia.net/apps/danok/tqws/tq.asmx';
const SIRI_SX = 'https://opendata.euskadi.eus/transport/moveuskadi/bizkaibus/siri_bizkaibus_situation_exchange.xml';
const SCHEDULES = 'http://apps.bizkaia.eus/BBOA000M/rest/BBOA/GetLineasHorarios';
const TIMEOUT_MS = 8000;

async function getText(url: string, revalidate: number, fresh = false): Promise<string> {
    const res = await fetch(url, {
        ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate } }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Bizkaibus ${res.status} ${new URL(url).pathname}`);
    return res.text();
}

/** La API responde JSONP con comillas simples: `({'STATUS': 'OK', ...});`. Se pasa a JSON sin tocar las comillas dobles del texto. */
export function parseLooseJson<T = unknown>(text: string): T {
    const body = text.trim().replace(/^[\w$]*\(/, '').replace(/\);?$/, '');
    let out = '';
    let inString = false;
    for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === "'") {
            out += '"';
            inString = !inString;
        } else if (inString && ch === '"') {
            out += '\\"';
        } else if (inString && ch === '\\') {
            out += '\\\\';
        } else {
            out += ch;
        }
    }
    return JSON.parse(out) as T;
}

const decode = (s: string) =>
    s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

/** Contenido de la primera etiqueta `<tag>…</tag>` dentro de `xml`. */
function tag(xml: string, name: string): string {
    const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
    return m ? decode(m[1]).trim() : '';
}

/* ───────── Llegadas a una parada ───────── */

const STOP_CODE_RE = /^\d{1,6}$/;
export const isStopCode = (c: string) => STOP_CODE_RE.test(c);

/** `<e1><minutos>11</minutos><metros>-10</metros></e1>`. Los metros negativos no significan nada útil. */
function pass(xml: string, name: 'e1' | 'e2'): BusPass | null {
    const block = tag(xml, name);
    const minutes = Number.parseInt(tag(block, 'minutos'), 10);
    if (!Number.isFinite(minutes)) return null;
    const meters = Number.parseInt(tag(block, 'metros'), 10);
    return { minutes: Math.max(0, minutes), meters: Number.isFinite(meters) && meters > 0 ? meters : null };
}

interface PasoRaw {
    STATUS: string;
    Resultado?: string;
}

export async function fetchStopArrivals(code: string, fresh = false): Promise<StopArrivals> {
    const text = await getText(`${TQ}/GetPasoParadaMobile_JSON?callback=&strLinea=&strParada=${code}`, 10, fresh);
    const raw = parseLooseJson<PasoRaw>(text);
    const xml = raw.Resultado ?? '';
    const arrivals: StopArrival[] = [...xml.matchAll(/<PasoParada>([\s\S]*?)<\/PasoParada>/g)]
        .map((m) => ({ line: tag(m[1], 'linea'), route: tag(m[1], 'ruta'), next: pass(m[1], 'e1'), following: pass(m[1], 'e2') }))
        .filter((a) => a.line && a.next)
        .sort((a, b) => (a.next?.minutes ?? 0) - (b.next?.minutes ?? 0));
    // `NOINFO` = parada válida sin buses previstos; cualquier otra cosa es un fallo del servicio.
    if (raw.STATUS !== 'OK' && raw.STATUS !== 'NOINFO') throw new Error(`Bizkaibus STATUS ${raw.STATUS}`);
    return {
        code,
        name: tag(xml, 'DenominacionParada'),
        accessibility: tag(xml, 'Accesibilidad'),
        arrivals,
        fetchedAt: Date.now(),
    };
}

/* ───────── Avisos (SIRI-SX de Open Data Euskadi) ───────── */

export async function fetchAlerts(): Promise<BizkaibusAlert[]> {
    const xml = await getText(SIRI_SX, 60);
    const seen = new Set<string>();
    const alerts: BizkaibusAlert[] = [];
    for (const m of xml.matchAll(/<PtSituationElement>([\s\S]*?)<\/PtSituationElement>/g)) {
        const block = m[1];
        const es = (name: string) => decode(new RegExp(`<${name} xml:lang="es">([\\s\\S]*?)</${name}>`).exec(block)?.[1] ?? '').trim();
        const description = plainText(es('Description'));
        const summary = es('Summary');
        const lines = [...block.matchAll(/<LineRef>(\w+)<\/LineRef>/g)].map((x) => (/^\d/.test(x[1]) ? `A${x[1]}` : x[1]));
        const id = `${lines.join(',')}|${description}`;
        if (!description || seen.has(id)) continue;
        seen.add(id);
        alerts.push({
            id,
            lines: [...new Set(lines)],
            summary,
            description,
            start: tag(block, 'StartTime') || null,
            end: tag(block, 'EndTime') || null,
        });
    }
    return alerts;
}

/* ───────── Horario en texto (servicio legado) ───────── */

const parseDate = (d: string) => {
    const [dd, mm, yyyy] = d.split('/').map(Number);
    return new Date(Date.UTC(yyyy, (mm || 1) - 1, dd || 1)).getTime();
};

export async function fetchLineSchedule(code: string): Promise<LineSchedule> {
    const xml = await getText(SCHEDULES, 3600);
    const start = xml.indexOf(`<KODEA-CODIGO>${code}</KODEA-CODIGO>`);
    const empty: LineSchedule = { code, seasons: [], notice: '', fetchedAt: Date.now() };
    if (start < 0) return empty;
    const next = xml.indexOf('<LINEA-LINEA>', start);
    const block = xml.slice(start, next < 0 ? undefined : next);
    const today = Date.now();
    const seasons: ScheduleSeason[] = [...block.matchAll(/<ORDUTEGIA-HORARIO>([\s\S]*?)<\/ORDUTEGIA-HORARIO>/g)].map((m) => {
        const from = tag(m[1], 'NOIZTIK-PERIODO_DESDE');
        const to = tag(m[1], 'NOIZ_ARTE-PERIODO_HASTA');
        return {
            name: tag(m[1], 'DENBORALDI-TEMPORADA'),
            from,
            to,
            active: from !== '' && to !== '' && parseDate(from) <= today && today < parseDate(to) + 86_400_000,
            outbound: tag(m[1], 'ORDUTEGIA_JOAN_CAS-HORARIO_IDA_CAS'),
            inbound: tag(m[1], 'ORDUTEGIA_ETORRI_CAS-HORARIO_VUELTA_CAS'),
        };
    });
    return { code, seasons: seasons.sort((a, b) => Number(b.active) - Number(a.active) || parseDate(b.from) - parseDate(a.from)), notice: '', fetchedAt: Date.now() };
}
