import type { Metadata } from 'next';
import { List, LegalPage, NETWORK_NOTICE, REPO_URL, Section } from '@/components/shared/Legal';

export const metadata: Metadata = { title: 'Aviso legal y datos · BilboTrans' };

export default function Page() {
    return (
        <LegalPage title="Aviso legal y datos">
            <Section title="Quién está detrás">
                <p>
                    BilboTrans es un proyecto personal, gratuito y sin ánimo de lucro, mantenido en GitHub por <a className="underline underline-offset-2" href="https://github.com/ikeralvis" target="_blank" rel="noopener noreferrer">@ikeralvis</a>. No hay empresa, publicidad ni venta de datos detrás.
                    Para cualquier duda, error de datos o petición sobre esta página puedes abrir una incidencia en el <a className="underline underline-offset-2" href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">repositorio</a>.
                </p>
            </Section>

            <Section title="Proyecto independiente y no oficial">
                <p>
                    BilboTrans no es una aplicación oficial y <strong>no tiene ninguna relación</strong> con Metro Bilbao S.A., el Consorcio de Transportes de Bizkaia, Bizkaibus, la Diputación Foral de Bizkaia, Bilbobus, el Ayuntamiento de Bilbao, Renfe ni con ningún otro operador o administración citados. Que aparezcan sus nombres y logotipos sirve solo para indicar de qué servicio son los datos.
                </p>
                <p>Los nombres, marcas y logotipos son propiedad de sus titulares. Los logotipos proceden de las webs oficiales o de Wikimedia Commons y no se ofrecen bajo la licencia del proyecto.</p>
            </Section>

            <Section title="De dónde salen los datos">
                <p>BilboTrans solo usa información pública que los propios operadores y administraciones publican para que se reutilice:</p>
                <List>
                    <li><strong>Metro Bilbao.</strong> {NETWORK_NOTICE.metro.data.replace(/^Datos: /, '')}</li>
                    <li><strong>Bizkaibus.</strong> {NETWORK_NOTICE.bizkaibus.data.replace(/^Datos: /, '')}</li>
                    <li><strong>Bilbobus.</strong> {NETWORK_NOTICE.bilbobus.data.replace(/^Datos: /, '')}</li>
                </List>
                <p>
                    Los conjuntos de datos abiertos se usan con las licencias que indica cada publicador (Creative Commons Reconocimiento, CC-BY). Los servicios de tiempos de espera de Bizkaibus y de Bilbobus son los mismos que usan sus webs oficiales; no tienen una licencia de reutilización propia y se consultan con moderación (caché de unos segundos).
                    Las horas programadas salen de los ficheros GTFS oficiales.
                </p>
            </Section>

            <Section title="Exactitud de la información">
                <p>
                    Los tiempos en directo son una previsión del operador y pueden cambiar, retrasarse o faltar; algunos servicios los actualizan cada pocos minutos. Los horarios programados no incluyen incidencias, desvíos ni festivos locales. BilboTrans se ofrece «tal cual», sin garantía de que la información sea completa o esté al día, y no se hace responsable de decisiones tomadas a partir de ella.
                    Para información oficial o ante una incidencia, consulta siempre al operador.
                </p>
            </Section>

            <Section title="Enlaces y servicios de terceros">
                <p>
                    Los enlaces «Cómo llegar» abren Google Maps y la ficha oficial de cada línea abre la web de Bilbobus; esos sitios tienen sus propias condiciones y políticas. El mapa de Metro carga imágenes de mapa de Esri (más detalles en la <a className="underline underline-offset-2" href="/privacidad">política de privacidad</a>).
                </p>
            </Section>

            <Section title="Código y licencia">
                <p>El código de BilboTrans está publicado en <a className="underline underline-offset-2" href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>. Sus datos de terceros, nombres y logotipos conservan sus propias licencias.</p>
            </Section>

            <Section title="Legislación">
                <p>Este aviso se rige por la legislación española. Si algo de él no se pudiera aplicar, el resto seguiría vigente.</p>
            </Section>
        </LegalPage>
    );
}
