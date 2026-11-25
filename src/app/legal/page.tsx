import type { Metadata } from 'next';
import { List, LegalPage, NETWORK_CREDITS, REPO_URL, Section } from '@/components/shared/Legal';

export const metadata: Metadata = { title: 'Fuentes y condiciones · BilboTrans' };

const link = 'underline underline-offset-2';

export default function Page() {
    return (
        <LegalPage title="Fuentes y condiciones">
            <Section title="Resumen">
                <List>
                    <li>BilboTrans es gratis, no lleva publicidad y no vende datos.</li>
                    <li>Toda la información de transporte viene de datos públicos de los operadores y administraciones.</li>
                    <li>Es un proyecto personal: ningún operador lo hace, lo revisa ni lo respalda.</li>
                    <li>Los tiempos pueden fallar. Ante una incidencia, manda lo que diga el operador.</li>
                </List>
            </Section>

            <Section title="Fuentes de datos">
                <List>
                    <li><strong>Metro Bilbao:</strong> {NETWORK_CREDITS.metro.sources}.</li>
                    <li><strong>Bizkaibus:</strong> {NETWORK_CREDITS.bizkaibus.sources}.</li>
                    <li><strong>Bilbobus:</strong> {NETWORK_CREDITS.bilbobus.sources}.</li>
                    <li><strong>Euskotren y tranvías:</strong> {NETWORK_CREDITS.euskotren.sources}.</li>
                </List>
                <p>
                    Los datos abiertos se reutilizan con la licencia que fija quien los publica, normalmente Creative Commons Reconocimiento (CC-BY), citando la fuente como arriba.
                    Los tiempos de espera de Bizkaibus y Bilbobus salen de los servicios que usan sus propias webs, que no tienen una licencia de reutilización publicada: BilboTrans los guarda unos segundos en caché para pedirlos lo menos posible.
                </p>
            </Section>

            <Section title="Nombres de los operadores">
                <p>
                    Metro Bilbao, Bizkaibus, Bilbobus, Euskotren, Renfe y el resto de nombres citados pertenecen a sus titulares y aparecen solo para decir de qué servicio es cada dato.
                    BilboTrans no usa sus logotipos: cada red se identifica con un círculo de su color y el icono de su tipo de vehículo.
                </p>
            </Section>

            <Section title="Fiabilidad">
                <p>
                    Un tiempo «en directo» es la previsión que publica el operador, y puede cambiar, llegar tarde o faltar. Los horarios programados no saben de obras, desvíos ni fiestas locales.
                    La información se ofrece tal como llega, sin garantías, y no se asume responsabilidad por lo que se decida con ella.
                </p>
            </Section>

            <Section title="Otros sitios">
                <p>
                    «Cómo llegar» abre Google Maps, y la ficha de cada línea de Bilbobus abre su web. El mapa de Metro descarga teselas de Esri. Cada uno de esos sitios tiene sus propias condiciones; lo que se envía a cada uno está en la <a className={link} href="/privacidad">política de privacidad</a>.
                </p>
            </Section>

            <Section title="Código fuente">
                <p>
                    El código está en <a className={link} href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>. Los datos de terceros siguen bajo la licencia de quien los publica.
                </p>
            </Section>

            <Section title="Contacto">
                <p>
                    Lo mantiene <a className={link} href="https://github.com/ikeralvis" target="_blank" rel="noopener noreferrer">@ikeralvis</a>. Si ves un dato mal o quieres pedir algo sobre esta página, abre una incidencia en el <a className={link} href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">repositorio</a>.
                </p>
            </Section>

            <Section title="Ley aplicable">
                <p>Estas condiciones se rigen por la ley española. Si una parte no fuera válida, el resto seguiría aplicándose.</p>
            </Section>
        </LegalPage>
    );
}
