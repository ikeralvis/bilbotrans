# PLAN — BilboTrans v2 (Metro Bilbao primero)

Objetivo: app de Metro Bilbao rápida, siempre actualizada, con sentidos claros y un diseño moderno/animado. Otros transportes ocultos tras `NEXT_PUBLIC_ENABLED_TRANSPORTS`.

## API de Metro Bilbao (base `https://api.metrobilbao.eus`, sin auth)
| Endpoint | Uso |
|---|---|
| `GET /api/stations?page=1&perPage=200&lang=es` | Catálogo completo (42 estaciones, salidas, POIs, zonas, accesibilidad, PDF, `img`) → `catalog.json` |
| `GET /api/stations/{code}?lang=` | Ficha + `platforms` (trenes en vivo por sentido) + `Entrances` |
| `GET /metro/real-time/{from}/{to}` | Trenes del trayecto, `trip` (línea, duración, transbordo), `messages`, salidas, CO₂ |
| `GET /metro/obtain-schedule-of-trip/{from}/{to}/{HH:mm}/{HH:mm}/{YYYY-MM-DD}/{lang}` | Horario programado |
| `GET /metro/line-with-issues/{l1\|l2}/{n}` | Estado por línea/zona |
| `GET /metro-is-in-maintenance` | `{isBlocked}` |
| `GET /metro/obtain-nearby-station/{lat}/{lon}` | Estación cercana |
| `GET /metro/calculate-zones-by-stations/{a}/{b}` | Zonas del trayecto |
| `GET /stations/{CODE}.jpg` | Foto de estación |

Con JWT (no usable): `/api/news`, `/api/languages`, `/api/incidence_categories`.

## Regla de sentido
Ver `.claude/skills/bilbotrans-design/SKILL.md`. Se clasifica por tren (`Direction` / orden del destino), nunca por índice de `Platforms`.

## Fases
- [x] 0. Documentos: `PLAN.md`, `DESIGN_SYSTEM.md`, skill, `CLAUDE.md`
- [x] 1. Capa de datos: `client.ts`, `direction.ts` (+ tests), `catalog.json`, `/api/metro/{station,route,timetable,status}`
- [x] 2. Hooks SWR (`hooks.ts`), búsqueda local de estaciones (`catalog.ts`)
- [x] 3. UI: tokens, `MetroHome`, `MetroStationView` (foto + grupos por sentido), `MetroRouteView`, onboarding adaptado
- [x] 4. SW por estrategia (navegación network-first, tiempo real sin caché), `vercel.json`, `next/image`, limpieza de residuos
- [x] 5. Verificación: build, tests, navegador (ABA, PLE, ABA→ANS)

## Pendiente / ideas
- `/api/metro/incidents` y `/fares` funcionan (`metro_page/es/avisos`, `todas-las-tarifas`); el 404 era de probar mal el slug. Falta UI de tarifas en la home nueva.
- Dataset abierto de Metro Bilbao (`/open-data/dataset`): posible GTFS estático para horarios offline.
- Mapa: simulación por horario GTFS (`scripts/sync-metro-gtfs.ts`, `src/lib/metro/trainSim.ts`), 0 peticiones. `/api/metro/trains` eliminado.
- Build local necesita `DATABASE_URL` (Neon) por `/api/stops/search`.
- Mapa en vivo con la nueva capa de datos.
- Notificaciones de incidencias (OneSignal) con `/api/metro/status`.
- Reactivar Bilbobus/Bizkaibus/Renfe con el mismo sistema de diseño.
- Retraso real en Metro: cruzar `/metro/real-time/{a}/{b}` con `/metro/obtain-schedule-of-trip/...` (ver `API.md` §1.6).
- Referencia de UI: la vista de parada de Bide+ (<https://bideplus.vercel.app>) gusta por limpia; revisar con calma para inspirarse (no copiar código/diseño: CC BY-NC-SA).

## Mejoras de `/metro` y fases siguientes

Principio de diseño: **lo actual va en grande y destacado** (el próximo tren, sus minutos y si va en hora); lo demás, secundario.

### Hecho
- Home con secciones por red + favoritos de todas (`HubHome`), `/metro` con su manifest PWA.
- Trayecto: próximo tren en grande, retraso real vs programado (`delay.ts`), siguientes debajo.
- "Ya" sustituido por flechas animadas (`Arriving`) + "llegando"; parada con tren destacado en grande.

### Fase 1 — pulir lo que se ve cada día
Hecho (`routes.ts`, `time.ts`, `RouteCards.tsx`):
- [x] **Trayectos favoritos** (corazón en el trayecto) con tarjeta en directo en la home.
- [x] **Sugeridos**: recientes y "habitual" (≥3 visitas, pesa menos con el tiempo; una visita cuenta cada 30 min como mucho).
- [x] **Cuenta atrás en segundos** desde la hora prevista (`time`), sin pedir datos nuevos.
- [x] **Transbordo en etapas**: salida, cambio y llegada final (la hora de llegada de la pestaña Horario ya es la final).
- [x] **Avisos de accesos/ascensores** en el trayecto, solo si el aviso nombra el origen o el destino.

Pendiente:
- **Parada**: filtro por línea y "hacia mi destino" en un toque; marcar qué tren coincide con el trayecto guardado.
- Transbordo resuelto (`src/lib/metro/transfer.ts`): el cambio L1↔L2 es San Ignazio (`SIN`); `transbordTrainGettingTime` es la salida de SIN del siguiente tren de la otra línea (no siempre llega al destino), así que el tren real se busca en el tramo SIN→destino por hora de llegada final. Verificado contra tramos directos el 2026-10-29.
- [x] Parada con hasta 6 trenes por sentido (3 visibles + "Ver N más"): `/api/stations/{code}` solo da 2 por andén, así que la parada usa `/metro/real-time/{estación}/{vecina}` (`fetchStationFull`, `neighborsBySide`): 1 petición por sentido, 2 en una bifurcación como San Ignazio. La home y los widgets siguen con la ficha ligera.
- [x] Estados vacíos y de error: sin conexión / servicio caído (con "Reintentar"), de madrugada, sin trenes ("Ver horario") y último dato guardado (hasta 6 h) en parada y trayecto.

### Fase 2 — alertas a mi hora (petición del usuario)
Quien tenga la PWA instalada configura "a las 8:30 avísame de los trenes ORIGEN→DESTINO", p. ej. 5 min antes, y recibe una notificación como *«ANS→MOY: 5 · 7 · 10 min»* con datos en vivo.
- Ajustes por alerta: origen, destino, hora, días de la semana, antelación (p. ej. 5 min), activar/pausar. Crear desde un trayecto favorito con un toque.
- Notificación: los próximos 3 trenes con su retraso ("5 min · 7 min · 10 min", "+2 min" si hay retraso). Tocarla abre el trayecto.
- Técnica: Web Push (ya hay OneSignal, ver `METRO_ALERTS_SETUP.md`). El contenido debe calcularse **en el momento del envío** (datos en vivo), así que hace falta un planificador en servidor que cada minuto mire las alertas que tocan, consulte `/metro/real-time/{a}/{b}` y envíe el push. Guardar en Neon (ya existe, drizzle): id anónimo de suscripción OneSignal, ruta, hora, días y zona horaria `Europe/Madrid`. Sin cuentas ni datos personales.
- Limitaciones a decidir: Vercel Cron en plan gratuito solo corre 1 vez al día → hace falta plan con cron por minuto, o un planificador externo (cron-job.org, GitHub Actions cada 5 min es poco fiable). iOS solo recibe push con la PWA instalada en pantalla de inicio (iOS 16.4+). Si el tiempo real falla en el envío, mandar el horario programado indicándolo.
- Privacidad: poder borrar todas las alertas desde la app; la suscripción se elimina al desinstalar.

### Fase 3 — mapa y offline
- Mapa en vivo con la capa de datos nueva (simulación por GTFS ya existe en `trainSim.ts`).
- Horarios programados offline (GTFS precompilado) para ver salidas sin red.
- Widgets (ya existe `/api/metro/widget`): documentar y probar los formatos.
- Tarifas (`/api/metro/fares` ya funciona): pantalla de tarifas y zonas del trayecto.

### Fase 4 — otras redes
Reactivar Bizkaibus, Bilbobus, Renfe y Euskotren con la misma ficha de red (`src/lib/networks.ts`), una PWA por red y fuentes de `API.md`. Orden sugerido: Bizkaibus (tiene GPS en SIRI) → Euskotren/tranvías → Renfe → Lurraldebus.

#### Bizkaibus — por dónde empezar (fuentes en `API.md` §2.0)
**Estado (2026-10-29): B1, B2 y el buscador de trayecto hechos** (`src/lib/bizkaibus/*`, `src/components/bizkaibus/*`, `/bizkaibus`, `/bizkaibus/stop/{código}`, `/bizkaibus/lines`, `/bizkaibus/lines/{línea}`, `/bizkaibus/route?from=&to=`). El horario en texto se estructura (`scheduleText.ts`, probado contra las 1 860 tablas reales: ~87 % en grupos por tipo de día; el resto se muestra como texto con las horas resaltadas) y la lista de paradas va por municipios con transbordos y buscador. Pendiente: B3 mapa en vivo, B4 retraso real, B5 extras (tarifas, alertas a una hora), transbordos en "¿Qué bus cojo?" (hoy solo líneas directas), favoritas de líneas, y borrar el código antiguo de Bizkaibus (`lib/bizkaibus/api.ts` usaba `DOMParser` en servidor y no funcionaba; `components/bizkaibus/BizkaibusStop*.tsx`).

1. **B1 · Base y parada (empezar aquí).** Proxy `/api/bizkaibus/stop/{código}` sobre `GetPasoParadaMobile_JSON` (parseo del JSONP, caché ~20 s), catálogo de paradas y líneas traído de `bizkaitrans`, buscador local y "paradas cerca de mí" sin llamadas (lat/lon locales). Vista de parada con el mismo diseño que Metro: próximo bus por línea en grande (minutos + «a 1,2 km»), siguiente debajo, favoritos por parada y línea, esqueletos y estados de error.
2. **B2 · Líneas.** Lista y buscador de líneas, recorrido por sentido, «líneas que paran aquí» con filtro, avisos de línea (`GetLineas_JSON` + SIRI-SX).
3. **B3 · Mapa en vivo.** SIRI-VM de Open Data Euskadi cada ~25 s: buses de una línea sobre su recorrido (la línea sale del `trp_AXXXX_…` del viaje).
4. **B4 · Retraso real.** Contrastar la previsión de la API oficial con el horario GTFS programado, como en Metro (requiere preprocesar el GTFS de 9 MB con un script diario).
5. **B5 · Extras.** Tarifas, horario en texto, alertas push por hora (misma infraestructura que Metro, Fase 2).
**Bilbobus (investigado el 2026-10-29, detalle en `API.md` §4b).** Los feeds GTFS-RT y SIRI-VM del Ayuntamiento/Open Data Euskadi llegan **vacíos** y no existen trip-updates ni avisos SIRI. Pero la web oficial usa un AJAX que devuelve los **minutos hasta el próximo bus en todas las paradas de una línea** (`BBUS_pintarRecorrido_Ajax`, 37 líneas regulares con dato, `codParada` = `stop_code` del GTFS). Plan:
1. **BB1 · Datos:** script que precompila el GTFS (530 paradas, 56 rutas, recorridos por sentido, horario) como el catálogo de Bizkaibus; proxy `/api/bilbobus/line/{línea}` sobre el AJAX (caché 20 s, sin `User-Agent` propio porque el cortafuegos lo rechaza, un `9999` = sin dato) — **hecho**: `scripts/sync-bilbobus-catalog.mjs`, `src/lib/bilbobus/{catalog,waiting,types}.ts`, `/api/bilbobus/line/{línea}` y `/api/bilbobus/stop/{parada}`.
2. **BB2 · Parada y línea — hecho** (`/bilbobus`, `/bilbobus/stop/{código}`, `/bilbobus/lines`, `/bilbobus/lines/{línea}`, `/bilbobus/route?from=&to=`; `src/components/bilbobus/Bb*.tsx`; `BusChip`/`titleCase` compartidos con Bizkaibus en `components/shared/bus.tsx`). Código antiguo de Bilbobus **borrado** (lib, `data.json`, componentes, home antigua `HomeClient`, funciones de `actions.ts` y los scripts `extract-bilbobus-*`, `consolidate_bilbobus.py` y `download-bilbobus-gtfs.ts`, sustituidos por `sync-bilbobus-catalog.mjs`); los enlaces viejos `/metro/station/{parada}?agency=bilbobus` redirigen a `/bilbobus/stop/{parada}`. Sigue sin migrar el código antiguo de Bizkaibus en la página heredada `/metro/station/{id}?agency=bizkaibus` y en `lib/bizkaibus/{api,search}.ts`. Diseño: próximo bus por línea en grande ("hace N min", sin cuenta atrás por segundos porque se actualiza por lotes cada pocos minutos), lista de paradas de la línea con tiempos como la web oficial, favoritos, "¿qué bus cojo?" reutilizando el buscador directo de Bizkaibus.
3. **BB3 · Respaldo y honestidad:** si el AJAX falla o da `9999`, horario del GTFS marcado como "programado"; avisos desde el RSS del Ayuntamiento.
4. **BB4 · Mapa en vivo:** solo cuando el GTFS-RT de posiciones deje de venir vacío (comprobar a diario con una Action); mientras tanto, simulación por horario como en Metro (`trainSim.ts`).
5. Limpieza: `lib/bilbobus/api.ts` y `/api/bilbobus/*` actuales leen un `data.json` antiguo y usan `temporada=21`; sustituirlos.
Bilbobus y Renfe: en `bizkaitrans` hay scripts y un worker con GTFS-RT de Bilbobus (`bilbao.eus/opendata/datos/bilbobus-gtfs-rt`) y de Renfe que sirven de punto de partida.

### Marca, tema y cabeceras (hecho)
- **Tema claro y oscuro**: `light-dark()` + `color-scheme` en `globals.css` (cada color se escribe una vez), sigue al sistema y se puede fijar con el interruptor de la home (`lib/theme.ts`, `data-theme` en `<html>`, sin parpadeo en la primera carga y sin transiciones al cambiar).
- **Paleta propia por red** (`.net-*`): Metro gris y rojo, Bilbobus rojo, Bizkaibus verde. `--brand`, `--accent` (fondo con texto blanco) y `--accent-text` (texto sobre la superficie).
- **Home de transportes** como Bide+: tarjetas de color con logo y flecha ↗, vista cuadrícula/lista.
- **Cabecera de red** (`NetworkHero`): su logo con una flechita ↖ al lado que vuelve a la lista de transportes; sin textos; vehículo animado debajo (tren de Metro, autobús rojo de Bilbobus, verde de Bizkaibus).
- Bilbobus: destino final real (`trip_headsign`), color oficial de cada línea y correspondencias en la lista de paradas.
- `SegmentedTabs` con indicador CSS (el `layoutId` se quedaba desplazado si cambiaba la altura de lo de encima).

### Legal, marca y búsqueda por horas (hecho)
- `/legal` (aviso legal y datos) y `/privacidad`; `LegalFooter` en la home y en cada red con el origen de los datos y el aviso de proyecto independiente. Contacto por issues de GitHub.
- Logo propio de BilboTrans (una «B» como línea de transporte con tres paradas): `public/icons/icon.svg`, iconos PWA y favicon generados con `scripts/gen-icons.mjs`; `BilboMark`/`LogoLoader` (se dibuja en bucle) en `src/app/loading.tsx`.
- Tarjetas de la home: al pulsar, velo con la marca latiendo (`useLinkStatus`).
- Bizkaibus: rótulo de texto blanco con «bus» en lima (el logo oficial no se leía).
- Metro por horas: «Viajar ahora / Elegir hora» en la home, vista `MetroScheduleView` (lista salida → llegada, próxima resaltada) y `TripEditor` para cambiar origen, destino, fecha y franja.
- Bilbobus: horas de paso por parada y línea (GTFS).

### Pendiente: logo propio de BilboTrans
El logo provisional («B» con tres paradas) no representa a Bilbao. Dirección elegida: **B doble** (trazo encajonado como una línea de plano de metro) con los colores de las tres redes: naranja Metro #d93e14, rojo Bilbobus #c22629, verde Bizkaibus #a5ca71. Variantes dibujadas en SVG en `docs/logo-lab.html` (E cinta triple, F parada tricolor, G con la ría, H naranja+rojo); recomendación: E grande y H para el favicon. Falta elegir e integrar en `public/icons/icon.svg` (+ `scripts/gen-icons.mjs`), `BilboMark`, favicon y loader.

### Datos que se actualizan solos
- Metro: `prebuild` descarga estaciones y GTFS en cada despliegue; `refresh-metro-data.yml` redespliega cada lunes.
- Bilbobus y Bizkaibus: sus catálogos son JSON del repo; `refresh-catalogs.yml` (lunes, o a mano) los regenera (GTFS de Bilbobus; instantánea de `bizkaitrans` para Bizkaibus) y hace commit si cambian, lo que dispara el despliegue de Vercel. `pnpm sync:bilbobus` / `pnpm sync:bizkaibus` lo hacen en local. Los tiempos en directo se piden al operador al vuelo (caché 10–20 s en el CDN, sin polling).

### Transversal
- Euskera e inglés (hoy todo en castellano).
- Compartir un trayecto por enlace (`/metro/route?origin=…&dest=…` ya funciona; falta el botón).
- Accesibilidad: contraste del naranja sobre fondo oscuro, `prefers-reduced-motion` en las flechas (ya respetado), tamaños táctiles ≥ 44 px.
