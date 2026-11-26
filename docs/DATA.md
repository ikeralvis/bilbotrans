# Datos, métodos y APIs

Cómo obtiene BilboTrans cada dato, qué hace con él y qué rutas propias expone. La investigación de cada fuente, con fechas de prueba y respuestas de ejemplo, está en [`API.md`](../API.md).

> BilboTrans es un proyecto independiente y no oficial. Ningún dato procede de un acuerdo con los operadores: se usan datos abiertos y las mismas APIs públicas que usan sus webs.

## Índice

1. [Principios](#principios)
2. [Fuentes por red](#fuentes-por-red)
3. [Catálogos estáticos](#catálogos-estáticos)
4. [Métodos](#métodos)
5. [Rutas de la API propia](#rutas-de-la-api-propia)
6. [Caché y frecuencia de peticiones](#caché-y-frecuencia-de-peticiones)
7. [Licencias y atribución](#licencias-y-atribución)

## Principios

- **Lo estático, en el repo; lo vivo, al vuelo.** Paradas, líneas, recorridos y horarios programados son JSON precompilados en `src/data/`. Solo los tiempos de llegada se piden en el momento.
- **El navegador nunca llama al operador.** Todo pasa por rutas `/api/*` del propio servidor, que normalizan, cachean y protegen de CORS y de cambios de formato.
- **Sin polling.** El tiempo real se pide al abrir una pantalla, al volver a la pestaña (máx. 1 vez cada 30 s) y al pulsar «Actualizar». La interfaz siempre muestra la antigüedad del dato.
- **Honestidad.** Si el directo falla se muestra el último dato válido (hasta 6 h) marcado como desactualizado, o el horario programado indicando que lo es.

## Fuentes por red

| Red | Estático | Tiempo real | Avisos |
|---|---|---|---|
| **Metro Bilbao** | `api.metrobilbao.eus/api/stations` (catálogo) + GTFS de CTB | `api.metrobilbao.eus` (`/api/stations/{code}`, `/metro/real-time/{a}/{b}`) | CMS de metrobilbao.eus (`/metro/line-with-issues`) |
| **Bilbobus** | GTFS del Ayuntamiento de Bilbao (Open Data Euskadi) | AJAX `BBUS_pintarRecorrido_Ajax` de bilbao.eus (minutos por parada de una línea) | — |
| **Bizkaibus** | Catálogo del repo `ikeralvis/bizkaitrans` (API TQ de la Diputación) | API TQ: `GetPasoParadaMobile_JSON` (minutos y metros por parada) | `GetLineas_JSON` (avisos por línea) |
| **Euskotren** (tren, L3, tranvías, funicular) | GTFS de Open Data Euskadi | GTFS-RT `trip_updates` de Open Data Euskadi | SIRI-SX (hoy vacío) |
| **Renfe Cercanías** | GTFS NAP 1130 | — | GTFS-RT `alerts` |

### Metro Bilbao

| Endpoint de origen | Uso en BilboTrans |
|---|---|
| `GET /api/stations?page=1&perPage=200&lang=es` | Catálogo (42 estaciones, salidas, ascensores, POIs, zonas, foto) → `src/data/metro/catalog.json` |
| `GET /api/stations/{code}` | Ficha ligera con 2 trenes por andén (home y widgets) |
| `GET /metro/real-time/{from}/{to}` | Trenes de un trayecto con hora al segundo, línea, transbordo y avisos |
| `GET /metro/obtain-schedule-of-trip/{from}/{to}/{HH:mm}/{HH:mm}/{fecha}/{lang}` | Horario programado por franja |
| `GET /metro/line-with-issues/{l1\|l2}/{n}` | Estado e incidencias por línea |
| `GET /metro-is-in-maintenance` | Modo mantenimiento |

El GTFS de Metro (`scripts/sync-metro-gtfs.ts` → `src/data/metro/gtfs.json`) solo se usa para el mapa por simulación.

### Bilbobus

El GTFS-RT y SIRI-VM oficiales llegan vacíos. El único directo es el AJAX que usa la web del Ayuntamiento: una petición por línea devuelve los minutos hasta el próximo bus en **todas** sus paradas (`codParada` = `stop_code` del GTFS). Se actualiza por lotes cada pocos minutos, así que la interfaz dice «hace N min» en lugar de contar segundos. No admite un `User-Agent` propio (el cortafuegos lo rechaza).

### Bizkaibus

API TQ (`apli.bizkaia.net/apps/danok/tqws/tq.asmx`), sin autenticación, en JSONP con comillas simples. `GetPasoParadaMobile_JSON` da el próximo y el siguiente bus por línea en una parada, con minutos y metros a la parada. Los horarios de cartel vienen como texto y se estructuran con `src/lib/bizkaibus/scheduleText.ts` (≈87 % de las tablas reales quedan en grupos por tipo de día; el resto se muestra como texto con las horas resaltadas).

### Euskotren

GTFS y GTFS-RT `trip_updates` de Open Data Euskadi. Una estación es `StopPlace:N` y sus andenes `Quay:N_…`, así que `N` une estático y directo. Si una estación no tiene viajes en el GTFS-RT, se cae al horario programado y se indica.

## Catálogos estáticos

| Fichero | Generado por | Contenido |
|---|---|---|
| `src/data/metro/catalog.json` | `pnpm sync:metro` (también en `prebuild`) | Estaciones, salidas, accesibilidad, POIs |
| `src/data/metro/gtfs.json` | `pnpm sync:gtfs` (también en `prebuild`) | Recorridos y horarios para simular trenes |
| `src/data/bilbobus/catalog/*` | `pnpm sync:bilbobus` | 530 paradas, 56 líneas, recorrido por sentido, horas de paso (`times.json`, solo servidor) |
| `src/data/bizkaibus/catalog/*` | `pnpm sync:bizkaibus` | 2 376 paradas con municipio y líneas, 105 líneas, recorridos |
| `src/data/euskotren/catalog/*` | `pnpm sync:euskotren` | 130 estaciones, 12 líneas, recorridos y horas de salida |

No se editan a mano. Se regeneran solos:

- **Metro:** en cada despliegue (`prebuild`) y cada lunes (`.github/workflows/refresh-metro-data.yml`).
- **Bilbobus, Bizkaibus y Euskotren:** cada lunes a las 05:30 UTC (`.github/workflows/refresh-catalogs.yml`); si cambian se hace commit y Vercel redespliega.

## Métodos

### Sentido de los trenes de Metro
Una estación tiene dos sentidos: *Basauri · Etxebarri* (interior) y *Kabiezes · Plentzia* (costa). El índice de andén de la API **no es estable** (en Plentzia `[0]` viene vacío), así que se clasifica **por tren**: primero por el campo `Direction`; si falta, comparando el orden de la estación destino con el de la actual. Implementado una sola vez en `src/lib/metro/direction.ts` (`groupByDirection`), con tests.

### Retraso real en Metro
Se cruza `/metro/real-time/{a}/{b}` (hora prevista al segundo) con `/metro/obtain-schedule-of-trip/...` (horario programado): cada tren real se empareja con la salida programada más cercana. |diferencia| < 60 s → «en hora»; si no, «+N min». Es la previsión del propio operador, no GPS. Código: `src/lib/metro/delay.ts`.

### Transbordo L1 ↔ L2
El cambio es en San Ignazio (`SIN`). El tren de la segunda etapa se busca en el tramo `SIN → destino` por hora de llegada final. Código: `src/lib/metro/transfer.ts`.

### Cuenta atrás
La cuenta atrás en segundos se calcula en el cliente desde la hora prevista del tren, sin pedir datos nuevos (`src/lib/metro/time.ts`). Bilbobus no tiene cuenta atrás porque su dato llega por lotes.

### Mapa por simulación
No hay GPS público de Metro ni de Euskotren. El mapa de Metro coloca cada tren interpolando entre paradas según el horario GTFS vigente (`src/lib/metro/trainSim.ts`), con 0 peticiones, y lo indica como «estimado según horario».

### Mapa de recorrido de una línea de bus
El recorrido se dibuja uniendo en orden las coordenadas de las paradas del catálogo (no hay geometría de calle precompilada). Leaflet se carga solo al abrir el mapa. Código: `src/components/shared/LineMapCard.tsx`.

### Buscador único y «Cerca de ti»
`src/lib/search/unified.ts` indexa en el servidor las paradas y líneas de todas las redes activas. Las paradas con el mismo nombre limpio (sin la coletilla bilingüe ni palabras como «geltokia» o «estación») se agrupan en un lugar, de modo que «Moyua» devuelve juntas la estación de Metro y las paradas de bus. Las líneas solo aparecen al buscar por su código. «Cerca de ti» devuelve las paradas más próximas de cada red a menos de 900 m; el cliente redondea la posición a ~110 m antes de enviarla.

### Favoritos y recientes
Se guardan solo en `localStorage` del dispositivo (`src/context/FavoritesContext.tsx`, `src/lib/metro/routes.ts`). No hay cuentas.

## Rutas de la API propia

Todas responden JSON. Las de directo llevan `fetchedAt` (epoch ms) para que la interfaz muestre la antigüedad.

| Ruta | Descripción |
|---|---|
| `GET /api/search?q=` | Buscador único: `{ places: [{ key, name, hits[] }], lines[] }` |
| `GET /api/search/nearby?lat=&lon=` | Paradas cercanas de todas las redes: `{ stops: [{ …hit, meters }] }` |
| `GET /api/metro/station/{code}` | Ficha de estación con trenes por sentido |
| `GET /api/metro/route?origin=&dest=` | Trenes de un trayecto con retraso y transbordo |
| `GET /api/metro/schedule?…` · `/api/metro/timetable?…` | Horario programado por franja |
| `GET /api/metro/status` | Mantenimiento e incidencias |
| `GET /api/metro/line/{line}` | Estado de una línea (diagrama) |
| `GET /api/metro/incidents` · `/api/metro/fares` | Avisos y tarifas |
| `GET /api/metro/widget` | Datos compactos para widgets |
| `GET /api/bilbobus/line/{code}` | Minutos por parada de una línea |
| `GET /api/bilbobus/stop/{code}` | Próximo bus por línea en una parada |
| `GET /api/bilbobus/times/{stop}` | Horas de paso programadas (GTFS) |
| `GET /api/bizkaibus/stop/{code}` | Próximos buses (minutos y metros) |
| `GET /api/bizkaibus/line/{code}` · `/alerts` · `/connect` · `/arrivals` | Recorrido, avisos y buscador de trayecto directo |
| `GET /api/euskotren/station/{id}` · `/times/{id}` | Directo y horario de una estación |

## Caché y frecuencia de peticiones

| Dato | Caché en el CDN (`s-maxage`) |
|---|---|
| Metro en directo | 10 s |
| Bilbobus en directo | 20 s (y último dato de hasta 5 min si el AJAX falla) |
| Bizkaibus en directo | 10 s |
| Euskotren en directo | 10 s en el CDN (el feed GTFS-RT se reaprovecha 15 s en el servidor) |
| Horas de paso programadas (Bilbobus) | 5 min |
| Búsqueda y cercanas | 24 h (catálogos estáticos) |

Al pulsar «Actualizar» la petición lleva un parámetro de frescura y responde con `no-store`, saltándose el CDN. El service worker (`public/sw.js`) usa *network-first* para las páginas y no cachea el tiempo real.

## Licencias y atribución

| Fuente | Licencia |
|---|---|
| GTFS / GTFS-RT / SIRI de Open Data Euskadi, CTB y Open Data Bizkaia | CC BY 4.0, con atribución al operador |
| GTFS de Bilbobus (Ayuntamiento de Bilbao) | CC BY 4.0 |
| `api.metrobilbao.eus`, AJAX de bilbao.eus, API TQ de Bizkaibus | APIs públicas sin contrato: se cachean y no se abusa de ellas; pueden cambiar sin aviso |
| Teselas del mapa | © Esri (World Light Gray Base) |

Los nombres y marcas de los operadores son de sus titulares. BilboTrans no usa sus logotipos: cada red tiene un distintivo propio.
