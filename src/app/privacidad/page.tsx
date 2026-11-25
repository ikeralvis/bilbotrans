import type { Metadata } from 'next';
import { List, LegalPage, REPO_URL, Section } from '@/components/shared/Legal';

export const metadata: Metadata = { title: 'Privacidad · BilboTrans' };

export default function Page() {
    return (
        <LegalPage title="Privacidad">
            <Section title="En pocas palabras">
                <List>
                    <li>No hay cuentas, registro ni publicidad.</li>
                    <li>No usamos cookies propias ni herramientas de analítica o seguimiento.</li>
                    <li>Tus favoritos, preferencias y última búsqueda se guardan <strong>solo en tu dispositivo</strong>.</li>
                    <li>Tu ubicación solo se usa si pulsas un botón para pedirla, y no sale de tu dispositivo.</li>
                </List>
            </Section>

            <Section title="Responsable">
                <p>
                    El proyecto lo mantiene <a className="underline underline-offset-2" href="https://github.com/ikeralvis" target="_blank" rel="noopener noreferrer">@ikeralvis</a>. Para ejercer tus derechos o resolver dudas sobre privacidad, abre una incidencia en el <a className="underline underline-offset-2" href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">repositorio</a>.
                </p>
            </Section>

            <Section title="Lo que se guarda en tu dispositivo">
                <p>Para funcionar, la aplicación usa el almacenamiento local del navegador (<em>localStorage</em>). Nunca se envía a ningún servidor y puedes borrarlo desde los ajustes del navegador:</p>
                <List>
                    <li>Favoritos (estaciones, paradas y trayectos) y los trayectos recientes que sugiere la app.</li>
                    <li>Preferencias: tema claro/oscuro, vista de la página de inicio, qué bloques mostrar y si recordar la última búsqueda.</li>
                    <li>Último dato recibido de una parada o trayecto, para enseñarlo si abres la app sin conexión (caduca a las 6 horas).</li>
                    <li>Tu última ubicación, durante una hora como máximo, si has pedido «paradas cerca de mí».</li>
                    <li>Un aviso de que ya viste la guía de bienvenida y el idioma.</li>
                </List>
            </Section>

            <Section title="Ubicación">
                <p>
                    La ubicación solo se solicita cuando pulsas «Ver paradas cerca de mí» o la brújula del origen del Metro, y el navegador te pide permiso. Con ella se calcula en tu propio dispositivo qué paradas tienes cerca; <strong>no se envía a nuestros servidores ni a los operadores</strong>. Puedes retirar el permiso cuando quieras desde el navegador.
                </p>
            </Section>

            <Section title="Qué ve el servidor">
                <p>
                    Cuando consultas una estación, parada o línea, tu navegador pide los datos al servidor de BilboTrans, que a su vez los pide al operador. Lo que viaja es el código de la estación, parada o línea; no tu identidad ni tu ubicación. Los operadores ven las peticiones de nuestro servidor, no tu dirección IP.
                </p>
                <p>
                    BilboTrans está alojada en Vercel (región de Fráncfort). Como cualquier alojamiento web, Vercel puede registrar de forma temporal datos técnicos de las visitas (dirección IP, navegador, dirección pedida y hora) por seguridad y para que el servicio funcione. BilboTrans no los usa para identificarte ni para elaborar perfiles.
                </p>
            </Section>

            <Section title="Servicios de terceros que puede contactar tu navegador">
                <List>
                    <li><strong>Esri</strong>, solo al abrir el mapa del Metro: se descargan las imágenes de mapa y Esri recibe tu IP como cualquier servidor de mapas.</li>
                    <li><strong>Google Maps</strong>, solo si pulsas «Cómo llegar a pie»: se abre su web o aplicación, con su propia política.</li>
                    <li><strong>Webs oficiales</strong> (Bilbobus, Metro Bilbao), solo si pulsas un enlace a su ficha.</li>
                </List>
                <p>Las fuentes tipográficas se sirven desde el propio sitio, sin conectar con Google Fonts.</p>
            </Section>

            <Section title="Notificaciones">
                <p>Hoy BilboTrans no envía notificaciones. Si en el futuro se añadieran avisos a una hora, será opt-in, se explicará qué se guarda (un identificador anónimo de la suscripción y las horas que elijas) y podrás borrarlo.</p>
            </Section>

            <Section title="Tus derechos">
                <p>
                    Como no guardamos datos personales sobre ti, no hay nada que acceder o rectificar en nuestros servidores. Si quieres, puedes borrar los datos locales desde el navegador y, si tienes alguna reclamación, puedes dirigirte a la Agencia Española de Protección de Datos (aepd.es).
                </p>
            </Section>

            <Section title="Cambios">
                <p>Si esta política cambia, se actualizará la fecha de esta página. Los cambios importantes se anotarán en el repositorio.</p>
            </Section>
        </LegalPage>
    );
}
