# API.md — Fuentes de datos por transporte

Catálogo de URLs, feeds y APIs para cada transporte de Euskadi. Verificado el **2026-10-29** (todos responden 200).

Fuente de la investigación: repo open source [Garridoparrayeray/bizkaibus-renewed](https://github.com/Garridoparrayeray/bizkaibus-renewed) (app Bide+, <https://bideplus.vercel.app>), más las APIs ya usadas en BilboTrans. Ver `PLAN.md` para el estado y `TRANSPORT_APIS.md` para notas históricas.

## ⚠️ Licencias: qué se puede reutilizar

| Cosa | Licencia | Qué implica para BilboTrans |
|---|---|---|
| **Código, diseño e iconos de Bide+** | CC BY-NC-SA 4.0 (© 2026 Yeray Garrido) | **No copiar código ni diseño.** NC (no comercial) + SA (derivados con la misma licencia) contaminaría este proyecto. Usamos solo las *ideas* y los *hechos* (URLs, formatos), escribiendo nuestra propia implementación. Si algún día se copia algo, hay que atribuir y aceptar CC BY-NC-SA. |
| **Datos GTFS / SIRI / GTFS-RT** de CTB, Open Data Euskadi, Open Data Bizkaia | CC-BY 4.0 | Libres, incluso comercial, **con atribución** al operador (ver cada sección). |
| Nombres y logos de Bizkaibus, Metro Bilbao, Euskotren, Renfe | De sus titulares | No usar como marca propia; mantener aviso de proyecto independiente. |
| `api.metrobilbao.eus` | Sin auth, API de la propia web/app de Metro | No es open data formal: cachear, no abusar, puede cambiar sin aviso. |

Aviso a mostrar en la app: *«Proyecto independiente y no oficial, sin relación con los operadores.»*

---

## Resumen por transporte

| Transporte | Estático (horarios) | Tiempo real | Avisos |
|---|---|---|---|
| **Metro Bilbao** | GTFS CTB | `api.metrobilbao.eus` (ya usado) · GTFS-RT trip-updates · SIRI-VM | JSON del CMS + SIRI-SX |
| **Bizkaibus** | GTFS CTB / NAP 1061 | SIRI-VM (GPS) | SIRI-SX |
| **Euskotren** (tren + tranvía Bilbao/Vitoria) | GTFS NAP 1263 | — (no fiable) | SIRI-SX |
| **Renfe Cercanías** | GTFS NAP 1130 | — | `alerts.json` GTFS-RT |
| **Bilbobus** | GTFS Bilbao / Open Data Euskadi | **AJAX interno de bilbao.eus** (minutos por parada de una línea); GTFS-RT y SIRI-VM **vacíos** | RSS del Ayuntamiento (sin SIRI-SX) — ver §4b |
| **Lurraldebus** (Gipuzkoa) | 7 GTFS por operador | SIRI-VM (hoy vacío) | SIRI-SX por operador |

---

## 1. Metro Bilbao

### 1.1 API propia de Metro Bilbao (ya integrada)
Base `https://api.metrobilbao.eus`, sin auth. Detalle completo y usos en `PLAN.md` (stations, real-time, schedule, line-with-issues, maintenance, nearby, zones).

### 1.2 Estático — GTFS
- Principal: `https://ctb-gtfs.s3.eu-south-2.amazonaws.com/metrobilbao.zip` (CTB, mismo origen que el tiempo real)
- Respaldo: `https://nap.transportes.gob.es/api/Fichero/download/1066` (NAP; requiere `ApiKey` en cabecera)
- Dataset: <https://data.ctb.eus/dataset/horario-metro-bilbao> (CC-BY 4.0)

Particularidades (aprendidas del repo de referencia, comprobar al implementar):
- No trae `feed_info.txt`.
- Muchos `service_id` no están en `calendar.txt`, solo en `calendar_dates.txt` y a menudo con **una única fecha** (eventos tipo Aste Nagusia, obras). No generalizar esa fecha a "todos los domingos".
- `direction_id` es inútil (binario tosco en una red con ramas). El sentido se deduce comparando el orden de parada dentro del patrón de viaje frente a una estación de referencia — alineado con nuestra regla `groupByDirection`.
- El mismo `trip_id` no identifica el mismo tren entre estático y tiempo real (se reutilizan números): hay que emparejar por **orden de estaciones + menor diferencia horaria** (tolerancia ~10 min).

### 1.3 Tiempo real — GTFS-Realtime trip updates
- `https://ctb-gtfs-rt.s3.eu-south-2.amazonaws.com/metro-bilbao-trip-updates.pb` (protobuf, ~15 KB)
- Dataset: <https://data.ctb.eus/dataset/metro-bilbao-online> (CC-BY 4.0)
- Contiene `trip_update_<id>` con la hora prevista por estación restante.
- Caché recomendada 15 s; descartar si el feed tiene más de 5 min.
- **Idea de la app de referencia ("retraso real")**: comparar la hora prevista del feed con la hora **programada** del GTFS. Diferencia < 1 min → "en hora"; mayor → mostrar "+N min de retraso" aunque el panel diga "1 min". Es lo que aporta valor sobre `Minutes` de la API de Metro.

### 1.3b Cuál usar en Metro (probado el 2026-10-29)
La API de Metro (§1.1) ya trae **tiempo real y horario programado** para un origen→destino, así que es la fuente principal. El GTFS-RT queda como respaldo o para casos sin API.

### 1.6 Retraso = tiempo real vs programado (origen→destino)
- Real: `GET /metro/real-time/ABA/ANS` → `trains[]` con `time` (ISO, al segundo) y `estimated` (min redondeados), más `trip` (línea, duración, transbordo).
- Programado: `GET /metro/obtain-schedule-of-trip/ABA/ANS/{HH:mm}/{HH:mm}/{YYYY-MM-DD}/es` → `trips["1_6"][]` con `originArrivalTime` (con segundos) y `destinyArrivalTime`.
- Emparejado: cada tren real se asocia con la salida programada más cercana (misma estación origen). Prueba real: reales 12:20:57 / 12:27:38 / 12:34:03 / 12:40:51 contra programados 12:21:07 / 12:27:47 / 12:34:27 / 12:41:07, diferencias de −10 a −24 s.
- Regla propuesta: |diff| < 60 s → "en hora"; > 60 s → "+N min de retraso" (o adelanto). Usar `time`, no `estimated` (ya viene redondeado).
- Cuidado: el "tiempo real" es una previsión del propio operador, no GPS; el retraso detectado es el que él mismo reconoce.

### 1.7 Búsqueda por franja horaria (probado el 2026-10-29)
`GET /metro/obtain-schedule-of-trip/{from}/{to}/{HH:mm|HH.mm}/{HH:mm|HH.mm}/{fecha}/es` acepta una franja larga (p. ej. 10:00–16:00 devuelve ~58 salidas de Ansio→Plentzia) y la fecha tanto en `YYYY-MM-DD` como en `dd-MM-YYYY`. `trips` viene agrupado en claves `{n}_{m}`; BilboTrans las une, ordena y quita duplicados (`flattenTrips`). En pantalla: `/metro/route?origin=&dest=&start=HH:mm&end=HH:mm&date=YYYY-MM-DD` pinta «salida → llegada». Con cambio, la llegada es `finalDestinyTime` (ver 1.3b).

### 1.4 Tiempo real — SIRI Vehicle Monitoring
- `https://opendata.euskadi.eus/transport/moveuskadi/metro_bilbao/siri_metro_bilbao_vehicle_monitoring.xml` (XML, ~240 KB)
- Campos por `VehicleActivity`: `RecordedAtTime`, `LineRef` (`MB`), `DirectionRef`, `DestinationRef`, `DestinationAimedArrivalTime`, `VehicleJourneyRef`. **Sin GPS ni retraso**: solo destino y hora objetivo de llegada.

### 1.5 Avisos
- CMS Metro (JSON): `https://cms.metrobilbao.eus/es/get/open_data/json/avisos/es`
  `{"data":[{id,title_es,type,station_id,publish_start_date,publish_end_date,finished_at,...}]}`. Tipos vistos: `aviso_ascensor`, `aviso_entrada`. El `station_id` es un ID interno **que no corresponde** al `stop_id` GTFS; el texto nombra la estación → mostrar como lista global. Caché 60 s.
- SIRI-SX: `https://opendata.euskadi.eus/transport/moveuskadi/metro_bilbao/siri_metro_bilbao_situation_exchange.xml`

Atribución: *Metro Bilbao / Consorcio de Transportes de Bizkaia (data.ctb.eus, CC-BY 4.0).*

---

## 2. Bizkaibus

### 2.0 API oficial de Bizkaibus (TQ, Diputación Foral de Bizkaia) — verificada el 2026-10-29
Base `https://apli.bizkaia.net/apps/danok/tqws/tq.asmx`. Sin auth. Responde JSONP con comillas simples: hay que quitar `callback(` … `)` y convertir `'` en `"` (con cuidado con textos). Es lo que usa la app oficial y es la mejor fuente de **llegadas por parada**.

| Endpoint | Para qué | Notas |
|---|---|---|
| `GetPasoParadaMobile_JSON?callback=&strLinea=&strParada={código reducido}` | Próximos buses de una parada | Devuelve XML dentro de `Resultado`: `DenominacionParada`, `Accesibilidad` (p. ej. `B`), y por línea `e1`/`e2` (próximo y siguiente bus) con `minutos` y **`metros`** (distancia del bus a la parada; negativo = ya pasó). Probado con la parada 4255 (Moyúa). |
| `GetLineas_JSON?callback=&iTipoConsulta=1&sCodigoLinea=&sNumeroRuta=&sSentido=&sDescripcionLinea=&sListaCodigosLineas=` | Catálogo de líneas | `IR_CLINEA`, `LN_DENOMI` y avisos de la línea en castellano/euskera (`LN_INCCAS`, `LN_INCEUS`), p. ej. traslados de parada. |
| `GetItinerarioLinea_JSON?callback=&sCodigoLinea={A3527}&sNumeroRuta=001&sSentido={I\|V}` | Paradas de una línea y sentido | Incluye municipio y código reducido (`PR_CODRED`). |
| `GetParadas_JSON?callback=` | Todas las paradas | Respuesta enorme: dio timeout desde aquí; mejor usar el catálogo precompilado (ver abajo) y regenerarlo con un script. |
| `GetParadasCercanasLatLon_JSON?...dLatitudOrigen=&dLongitudOrigen=&dRadio=` | Paradas cercanas | Los nombres de parámetros no coinciden con los de `TRANSPORT_APIS.md` (devolvió «Missing parameter: dbLat»): no hace falta, se calcula en local con las coordenadas del catálogo. |
| `GetTarifasLinea_JSON?...` | Tarifa origen-destino por línea | Ver `TRANSPORT_APIS.md`. |

**Catálogo ya hecho** (repo propio `ikeralvis/bizkaitrans`, carpeta `Proyectos/bizkaitrans`, sin problema de licencia): `src/data/bizkaibus/stops.json` (2 376 paradas con lat/lon y **líneas que pasan por cada parada**), `lines.json` (105 líneas) y `lines/{código}.json` (paradas ordenadas por sentido, 477 KB). Scripts para regenerarlo: `scripts/fetch-bizkaibus-{stops,lines}.mjs`.

### 2.0b Open Data Euskadi — qué hay de Bizkaibus (base `https://opendata.euskadi.eus/transport/moveuskadi/bizkaibus/`, redirige a un S3, usar `-L`)
- `siri_bizkaibus_vehicle_monitoring.xml` — GPS de ~260 buses (lat/lon, `VehicleRef`, `VehicleJourneyRef` = `trp_A3411_…`, de donde sale la línea `A3411`, y la parada actual `StopPointRef` con un id interno **distinto** del código reducido). Sirve para el mapa en vivo.
- `siri_bizkaibus_situation_exchange.xml` — avisos por línea, bilingües.
- `gtfs_bizkaibus.zip` — horario programado (9 MB).
- `siri_bizkaibus_estimated_timetable.xml` — **no usar**: trae `Delay PT0S` en todo y fechas de 1970, no aporta previsión real.

### 2.1 Estático — GTFS
- `https://ctb-gtfs.s3.eu-south-2.amazonaws.com/bizkaibus.zip`
- Respaldo NAP: `https://nap.transportes.gob.es/api/Fichero/download/1061` (agency `200`)
- Particularidades: `calendar.txt` viene con días a cero; la verdad está en `calendar_dates.txt` (fechas sueltas). `stop_desc` vacío: no hay municipio por parada (se necesitaría geocodificación inversa, p. ej. Nominatim a 1 req/s, cacheando). Los patrones de viaje deben derivarse de la secuencia real de paradas, no del `shape_id`.

### 2.2 Tiempo real — SIRI Vehicle Monitoring (GPS)
- `https://ctb-siri.s3.eu-south-2.amazonaws.com/bizkaibus-vehicle-positions.xml` (~137 KB, ~250 vehículos, ~1 actualización/min)
- Por vehículo: `VehicleLocation` (lat/lon), `LocationRecordedAtTime`, `VehicleJourneyRef` (= `trip_id` GTFS, p. ej. `trp_A3411_803_..._7`), `VehicleRef` (nº de flota), `MonitoredCall/StopPointRef` (**próxima** parada), `ArrivalStatus`.
- El feed `bizkaibus-trip-updates.xml` del CTB **no sirve** (sin GPS, hora ni retraso).
- Caché ~25 s; si falla, último dato guardado → horario oficial.

### 2.3 Avisos — SIRI Situation Exchange
- Principal (trae GPS/hora/retraso en su pareja VM y avisos bilingües): `https://opendata.euskadi.eus/transport/moveuskadi/bizkaibus/siri_bizkaibus_situation_exchange.xml`
- Respaldo: `https://ctb-siri.s3.eu-south-2.amazonaws.com/bizkaibus-service-alerts.xml`
- `PtSituationElement`: `ValidityPeriod`, `Summary`/`Description` con `xml:lang` `es`/`eu`, `Affects/VehicleJourneys/AffectedVehicleJourney/LineRef`.

### 2.4 Horario en texto (legado)
- `http://apps.bizkaia.eus/BBOA000M/rest/BBOA/GetLineasHorarios` (XML, ~1,4 MB, **HTTP sin TLS**)
- Por línea (`KODEA-CODIGO`, `DESKRIPZIOA-DESCRIPCION`) y temporada: texto libre de horarios ida/vuelta en euskera y castellano. No estructurado, solo complementario. Caché 1 h.

### 2.5 Algoritmo "pace" (precisión de llegadas)
Idea (workflows `pace-capture.yml` y `rebuild-schedule.yml` del repo de referencia); no hay que copiar código, sí el concepto:
1. El GPS da la posición del bus, pero estimar la llegada con el horario puro falla (~5 min de error).
2. Se coloca el bus sobre su ruta real y se estima el tiempo restante con **tiempos aprendidos por tramo** entre paradas (útil en autopista, donde el horario no refleja la realidad) y un **factor k** (cuánto más rápido/lento que el horario va cada línea).
3. Una Action captura el feed en vivo ~45 min cada hora (cron `17 * * * *`), guarda solo muestras compactas (JSONL como asset de una *release* `pace-data` → no dispara deploys), y otra recalibra a diario (`0 4 * * *`), cambiando los ficheros solo si el error baja en un conjunto de prueba.
4. Resultado declarado: error típico de ~5 min → <1,5 min; 93 % de llegadas a ±2 min con todos los tramos aprendidos (70 % si faltan).
5. Una Action diaria (`0 3 * * *`) reconstruye las BBDD desde el GTFS y redespliega; avisa 10 días antes de que caduque el horario publicado.

Atribución: *Bizkaibus / Open Data Bizkaia (CC-BY 4.0).*

---

## 3. Euskotren (tren, tranvía Bilbao y tranvía Vitoria)

- GTFS único para los tres: `https://nap.transportes.gob.es/api/Fichero/download/1263` (NAP, `ApiKey`)
  Respaldo: `ftp://ftp.geo.euskadi.net/cartografia/Transporte/Moveuskadi/Euskotren/google_transit.zip`
- Se separan por `agency_id`: tren `ES:Euskotren:Operator:EUS_Tren:`, tranvía Bilbao `ES:Euskotren:Operator:EUS_TrBi:`, tranvía Vitoria otro `EUS_*` (comprobar en el GTFS).
- Tiempo real: **ninguno fiable** → mostrar horario oficial y decirlo en UI.
- Avisos SIRI-SX: `https://opendata.euskadi.eus/transport/moveuskadi/euskotren/siri_euskotren_situation_exchange.xml`

Atribución: *Euskotren / Open Data Euskadi (CC-BY 4.0).*

---

## 4. Renfe Cercanías (Bilbao y Donostia/Irun)

- GTFS: `https://nap.transportes.gob.es/api/Fichero/download/1130` (NAP, `ApiKey`). Filtrar rutas con prefijo `60T` y `61T`.
- Avisos GTFS-RT JSON: `https://gtfsrt.renfe.com/alerts.json` (~100 KB, todo el país; filtrar por `informedEntity.routeId` / `stopId`). Caché 120 s.
- Tiempo real de trenes: ninguno fiable → horario oficial.

Atribución: *Renfe Cercanías / NAP.*

---

## 4b. Bilbobus (Bilbao, Ayuntamiento de Bilbao) — investigado y probado el 2026-10-29

**Resumen: el tiempo real *sí existe*, pero no está en los feeds oficiales (GTFS-RT/SIRI llegan vacíos).** Lo que usa la web oficial es un endpoint AJAX sin documentar que da el **tiempo de espera de toda una línea en una petición**. Es la única fuente en vivo que funciona hoy.

| Fuente | URL | Estado hoy | Para qué |
|---|---|---|---|
| **AJAX de tiempos de espera (el de la web oficial)** | `POST https://www.bilbao.eus/cs/Satellite?pagename=Bilbaonet%2FComunes%2FPresentacion%2FBBUS_pintarRecorrido_Ajax` con `codLinea=01&temporada=24&language=es` (`application/x-www-form-urlencoded`) | ✅ funciona, ~250–900 ms | Minutos hasta el próximo bus **en cada parada de la línea** |
| GTFS estático | `https://www.bilbao.eus/opendata/datos/bilbobus-gtfs` = `https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/gtfs_bilbobus.zip` (3,5 MB, mismo fichero) | ✅ vigente del 01/09/2026 al 30/06/2027 | Líneas, paradas, horarios, recorridos (shapes), tarifas |
| GTFS-RT posiciones | `https://www.bilbao.eus/opendata/datos/bilbobus-gtfs-rt` = `…/moveuskadi/bilbobus/gtfsrt_bilbobus_vehicle_positions.pb` | ⚠️ 200 con **0 bytes** (probado 3 veces en 15 s y varias horas) | Mapa en vivo, si algún día trae buses |
| SIRI-VM | `…/moveuskadi/bilbobus/siri_bilbobus_vehicle_monitoring.xml` | ⚠️ existe pero `<VehicleMonitoringDelivery/>` **vacío** | Igual que el anterior |
| GTFS-RT trip-updates / alerts, SIRI-SX / ET | `…/bilbobus/gtfsrt_bilbobus_trip_updates.pb`, `…_alerts.pb`, `siri_bilbobus_situation_exchange.xml`, `…_estimated_timetable.xml` | ❌ **403: no existen** (a diferencia de Bizkaibus, Metro o dBus) | — |
| CSV "tiempos de espera por parada" (Open Data Bilbao) | `https://www.bilbao.eus/aytoonline/jsp/opendata/bilbobus/od_horarios.jsp?idioma=c&formato=csv&tipo=espera` | ⚠️ catalogado como diario (CC BY 3.0 España), pero responde **vacío**; no usar | — |
| CSV de horarios de salida en cabecera | mismo `od_horarios.jsp` con `tipo=horarios` (cualquier otro `tipo` devuelve lo mismo), 461 KB, ISO-8859-1, separador `;` | ✅ | Horas teóricas de salida por línea, día y sentido |

### El AJAX de tiempos de espera
- Se usa en la página de línea `https://www.bilbao.eus/cs/Satellite/bilbobus/es/linea?codLinea=01&temporada_linea=24`: la página pinta las paradas y cada cierto tiempo llama al AJAX y rellena las celdas.
- **Petición**: `codLinea` (= `route_short_name` del GTFS: `01`, `10`, `A1`…), `temporada` (la web manda 24; el resultado **no cambia** con 21 o 24, pero se envía igual) y `language=es`. Sin cookies. **No enviar `User-Agent` propio:** el cortafuegos del sitio responde `200` con una página HTML "Request Rejected" si lleva uno (probado con `BilboTrans/1.0`); con las cabeceras por defecto de Node (`fetch` sin `User-Agent`) funciona. Hay que comprobar que la respuesta empieza por `[`. El navegador no puede llamarla directamente (CORS): hay que hacerlo desde el servidor.
- **Respuesta**: array JSON `[{"codParada":"1306","tiempo":6}, …]`, **una entrada por parada de la línea** (ambos sentidos: los códigos de parada son distintos por sentido). `tiempo` son **minutos** hasta el próximo bus; `0` (o menos de 1) = "llegando"; `9999` = sin información. Solo un bus por parada (no hay "el siguiente").
- **`codParada` = `stop_code` del GTFS** (no `stop_id`): `stop_code 1101` ↔ `codParada 1101`. Y `codLinea` ↔ `route_short_name`. Así se une con el GTFS sin tablas intermedias.
- **Cobertura** (todas las líneas del GTFS, 56): las 37 líneas regulares (`01`…`88` y `A1`…`A9`) devuelven el 100 % de sus paradas con dato; las 19 líneas especiales (`E*` refuerzos/eventos, `G1`–`G7` Gautxori nocturnos, `BT` bus turístico) devuelven `[]` fuera de su horario.
- **Frescura**: no es un reloj. Los valores se **actualizan por lotes cada varios minutos**: muestreando la línea 10 cada 15 s durante 4 min, los números no se movieron durante ≥ 70 s, saltaron a la vez −3 min en las 6 paradas de control a las 15:49:50 y volvieron a quedarse fijos otros 2,6 min (hasta el final de la prueba). Entre actualizaciones el mismo número se repite aunque pasen minutos. Contrastado con el horario del GTFS en la línea 01: coincide ±2 min en la mayoría de paradas y se separa hasta 6 min en otras, y tras ~75 s hubo paradas que cambiaron −3 a −5 min y otras que saltaron +7 a +12 (pasó un bus). Es decir, parece alimentado por la posición real de los buses (Deia, 2022: el sistema de tiempos de espera "está conectado al sistema que geolocaliza todas las unidades"), pero no se puede asegurar. En la UI conviene decir "hace N min" y no hacer cuentas atrás por segundos.
- **Robustez** (probado): en ráfagas de 8 líneas a la vez el servicio se pone lento y 6 de 8 dieron *timeout* de 6 s (4 y 8 en paralelo sin problema otras veces). El cliente reintenta una vez, junta peticiones simultáneas de la misma línea y, si falla, sirve el último dato de hasta 5 min (su `fetchedAt` original le dice a la interfaz cuánto tiene).
- **Qué NO hay**: segundo bus, distancia en metros, GPS, retraso ni destino por bus. Para saber qué línea/sentido es una parada se usa el GTFS.
- **Riesgos**: endpoint interno del sitio web, sin contrato ni documentación, puede cambiar sin aviso. Cachear en servidor 20–30 s y no más de 1 petición por línea y ventana de caché. Responsabilizarse: no es "open data" formal.

### Cómo montar una parada con esto
1. Del GTFS (`stops.txt`, `stop_times.txt`, `trips.txt`, `routes.txt`) se precompila: paradas (530, todas con `wheelchair_boarding=1`), qué líneas pasan por cada `stop_code`, recorrido por sentido (`direction_id`) y horario programado.
2. Para una parada con N líneas → N llamadas al AJAX (una por línea, caché compartida entre paradas), quedándose con la entrada cuyo `codParada` es la parada. Los tiempos de las N líneas se muestran juntos.
3. Para "tiempos de toda una línea" (como la web oficial): una sola llamada.
4. Respaldo cuando el AJAX falle o devuelva `9999`: horario programado del GTFS, marcado como tal.

### Datos del GTFS (descargado el 2026-10-29)
- `agency`: Bilbobus, tel. (+34) 944 790 981, tarifas en `bilbao.eus/cs/Satellite/bilbobus/es/tarifas`. `feed_version` 1793224894287, contacto `webmaster@bilbao.eus`.
- 56 rutas, 530 paradas, 20 450 viajes, 337 243 `stop_times`, `shapes.txt` de 3,4 MB. `route_url` apunta a la página oficial de cada línea (`…/linea?codLinea=01`). Los `route_id` son numéricos y no son el número de línea: usar `route_short_name`.
- `calendar.txt` (12 servicios `24-NN`) más `calendar_dates.txt`: el calendario depende mucho de excepciones por fecha (Aste Nagusia, festivos). Ver la nota de calendarios en la sección 1.2.
- `trip_headsign` del tipo `PT-Semana / (MINA DEL MORRO)`: lleva tipo de día y cabecera; no es un destino limpio.
- Tarifas (`fare_attributes.txt`): ocasional 1,30 €, Barik/Creditrans 0,65 €, Gizatrans 0,32 €, Hirukotrans 0,48/0,32 €, Bilbotrans 0,32 €, Gazte Bio 30 € (abono), Gautxori 0,65 € (efectivo). Trasbordo en 45 min (`transfer_duration=2700`).

### Colores y destinos de cada línea
- **Color oficial**: el GTFS no trae `route_color`. Está en la hoja de estilos de la web, `https://www.bilbao.eus/Bilbobus/css/bilbobus-styles.css`, como `.l56 {background: #3F2794}` (la 56 es morada). Clases: `.lN` = línea numerada sin el cero ("l1" = 01), `.aN` = A1…A8, `.gN` = Gautxori G1…G8. Faltan la 55, A9, BT y los refuerzos E2/E5/E7; los demás refuerzos (E56, E57, E62, E28, E38, E3, EA4) usan el color de su línea base. Todas rotulan en blanco, pero con amarillos (la 40) hay que usar texto oscuro. `scripts/sync-bilbobus-catalog.mjs` lo lee y lo guarda en `lines.json` (50 de 56 líneas).
- **Destino final**: `trip_headsign` del GTFS (`PT-Semana / (JESUSEN BIHOTZA)`): lo que va entre paréntesis es el rótulo del bus, y es el "hacia X" correcto (la 56 va "hacia Jesusen Bihotza" o "hacia La Peña"). No es la última parada del recorrido más habitual (que sería "Gran Vía 85"). Salvo `PT-Semana/Retirada` e `Incorporación` (viajes a cocheras), sin paréntesis.
- **Correspondencias**: cada parada de la página oficial lista las otras líneas que paran (`Correspondencia en la parada`); en BilboTrans salen del propio GTFS (`stops.json` → `lines`).
- **Horas de paso por parada** (planificado): enlace de la página de línea `…/bilbobus/es/horario?codLinea=56&temporada=24&parada=5518&sentido=Ida`. Pendiente de investigar para BB3 (horario programado por parada sin descargar el GTFS completo).

### Otras páginas oficiales útiles (HTML, sin API)
- `…/bilbobus/es/linea?codLinea=XX&temporada_linea=24` — paradas por sentido (tabla con celdas `ida_{codParada}` / `vuelta_{codParada}`).
- `…/bilbobus/es/direccion` (formulario `calle`, `codigoCalle`, `portal`, `distancia`, `temporada_direccion`) — paradas cerca de una dirección; la lista de calles sale de `Satellite?pagename=Bilbaonet/Comunes/Presentacion/BIO_pintarNombreCalles` y `…/BIO_pintarNumerosPortal`.
- `…/bilbobus/es/lineas-bilbobus`, `horarios-y-tiempos-de-espera`, `mapa-de-paradas`, `donde-esta-mi-bilbobus` (mapas de Google Maps renderizados en servidor), `…/es/tarifas`.
- RSS de avisos de Bilbobus: `…Satellite?c=Page&cid=3000106352&language=es&pageid=3000106352&pagename=Bilbaonet%2FPage%2FBIO_rss&tipoSus=Bilbobus` (suscripción en `BIO_suscripcionRSS`). Sin SIRI-SX, es la única fuente de avisos.
- Atención al cliente: 900 840 655 · clientesbilbobus@bilbao.eus.

### Otras apps y proyectos que usan datos de Bilbobus
- **App oficial "Bilbobus"** (Ayuntamiento de Bilbao, iOS y Android; en datos.gob.es figura como aplicación que reutiliza los datos): tiempos de espera, paradas cercanas, localización de autobuses y avisos Bluetooth de parada próxima. No se encontró API pública detrás.
- **ikeralvis/bilbotrans** (este proyecto) y **ikeralvis/bizkaitrans**: ya llaman al AJAX (`BilboTrans` con `temporada=21`, obsoleto pero inocuo) y tienen un worker que decodifica el GTFS-RT de posiciones.
- **RickAndMe/ha-bilbao-transit** (Home Assistant, v1.2.0): afirma que "Bilbobus no publica estimaciones de llegada (solo posiciones, a menudo vacías)" y usa horario programado. Es correcto para los feeds, pero **no conoce el AJAX** que sí da tiempos.
- **Transit, Moovit, Google Maps y similares**: solo consumen el GTFS estático (Mobility Database `mdb-2681`, NAP).
- No se ha encontrado ningún repositorio abierto que documente el AJAX.

### Logos (en `public/brand/`)
Versiones para fondo de color. Son marcas de sus titulares: sirven para identificar la red, sin sugerir que BilboTrans es oficial.
| Archivo | Origen |
|---|---|
| `mb-logo-white-text.png` | Logo de Metro Bilbao (anillos naranjas y texto blanco) |
| `bilbobus-logo-white.png` | `https://www.bilbao.eus/Bilbobus/images/bilbobus-logo1.png` (blanco, sin fondo) |
| `bizkaibus-logo-tile.png` | `https://www.bizkaia.eus/o/IYBBTBIC/images/bizkaia/logo.png` (baldosa verde clara `#A5CA71` con el logo en blanco) |
| `renfe-cercanias-logo.svg` | Wikimedia Commons `File:Renfe Cercanías.svg` (dominio público; se pinta en blanco con un filtro CSS) |

### Paleta de cada red
| Red | Fondo de cabecera | Acento | Notas |
|---|---|---|---|
| Metro Bilbao | gris `rgba(36,35,36,.9)` → `#3a393a` en claro, `#212021` en oscuro | rojo `#d93e14` | |
| Bilbobus | rojo `#c22629` | `#c22629` (en oscuro `#d6343a`) | línea con su color oficial (ver arriba) |
| Bizkaibus | verde `#22533d` | verde `#22533d` (en oscuro `#2f7a59`, texto `#a5ca71`) | |
Definidas en `globals.css` (`.net-metro`, `.net-bilbobus`, `.net-bizkaibus`, aplicadas por el `layout.tsx` de cada red).

### Licencias y atribución
- GTFS y open data de Bilbao: CC BY (el catálogo indica 3.0 España para los CSV; GTFS y GTFS-RT en Euskadi: CC BY 4.0 según su ficha). Atribuir: *Ayuntamiento de Bilbao / Bilbobus (Open Data Bilbao)*.
- El AJAX no tiene licencia explícita: usarlo con prudencia (caché, volumen bajo, identificarse) y mostrar siempre un aviso de proyecto no oficial.

### 4b.x Horas de paso por parada y línea
La página oficial las da (lento, 8–11 s); BilboTrans las precompila desde el GTFS (`times.json`, `src/lib/bilbobus/times.ts`): tipo de día → horas, hoy resaltado, próxima salida marcada. Coinciden con la oficial. Ruta: `/api/bilbobus/times/{parada}?line=`.

## 5. Lurraldebus (Gipuzkoa)

Un GTFS y feeds SIRI por operador, todos bajo `https://opendata.euskadi.eus/transport/moveuskadi/lurraldebus/`:

| Operador | GTFS | SIRI-VM | SIRI-SX |
|---|---|---|---|
| Ekialdebus | `ekialdebus/gtfs_ekialdebus.zip` | `ekialdebus/siri_ekialdebus_vehicle_monitoring.xml` | `ekialdebus/siri_ekialdebus_situation_exchange.xml` |
| Euskotren bus | `euskotren_bus/gtfs_euskotren_bus.zip` | — | — |
| Goierrialdea | `goierrialdea/gtfs_goierrialdea.zip` | `goierrialdea/siri_goierrialdea_vehicle_monitoring.xml` | `goierrialdea/siri_goierrialdea_situation_exchange.xml` |
| Gipuzkoana | `guipuzkoana/gtfs_guipuzkoana.zip` | `guipuzkoana/siri_guipuzkoana_vehicle_monitoring.xml` | `guipuzkoana/siri_guipuzkoana_situation_exchange.xml` |
| PESA | `pesa/gtfs_pesa.zip` | `pesa/siri_pesa_vehicle_monitoring.xml` | `pesa/siri_pesa_situation_exchange.xml` |
| TBH | `tbh/gtfs_tbh.zip` | `tbh/siri_tbh_vehicle_monitoring.xml` | `tbh/siri_tbh_situation_exchange.xml` |
| Tolosaldea | `tolosaldea/gtfs_tolosaldea.zip` | — | — |

Los feeds SIRI-VM llegaban **vacíos** el 2026-10-27 según el repo de referencia: activarlos solo cuando traigan buses. Atribución: *Lurraldebus / Diputación Foral de Gipuzkoa vía Moveuskadi.*

---

## 6. Acceso a NAP (Punto de Acceso Nacional)

`https://nap.transportes.gob.es/api/Fichero/download/{id}` requiere cabecera `ApiKey` (cuenta gratuita en nap.transportes.gob.es). IDs: Bizkaibus 1061 · Metro 1066 · Renfe 1130 · Euskotren 1263. Guardar como secreto (`NAP_API_KEY`), nunca en el repo. Preferir los espejos S3 del CTB y Open Data Euskadi, que no necesitan clave.

## 7. Fuera de alcance (no usar)

- `GetLineasHorarios` solo por HTTP: no llamarlo desde el navegador (mixed content); solo desde servidor.
- Nominatim (OSM) para geocodificar: máx. 1 req/s, cachear y atribuir © OpenStreetMap.

## 8. Cómo aplicar esto a BilboTrans

1. **Home con secciones por transporte** (Metro, Bizkaibus, Euskotren/tranvías, Renfe, Lurraldebus), ocultas por `NEXT_PUBLIC_ENABLED_TRANSPORTS` hasta que estén listas.
2. **Una "ficha de red" por transporte** (slug, colores, feeds, features, atribución) como única fuente de verdad, en vez de ramificar por `if`.
3. **PWA por transporte**: un `manifest` por red (nombre, iconos, `theme_color`, `start_url=/<red>`), instalable por separado.
4. **Favoritos y listas** de paradas/líneas en `localStorage`, sin cuentas.
5. **Retraso real en Metro**: cruzar GTFS-RT (previsión) con GTFS (programado) para el "queda 1 min pero va con retraso".
6. **Offline**: GTFS precompilado y reconstruido a diario por GitHub Action.
