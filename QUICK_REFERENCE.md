# 🚀 Referencia Rápida de APIs

**Guía de consulta rápida para los endpoints más utilizados**

## Metro Bilbao

| Uso | Endpoint | Método |
|-----|----------|--------|
| **Estación en tiempo real** ⭐ | `https://api.metrobilbao.eus/api/stations/{code}?lang=es` | GET |
| Tiempo real por trayecto | `https://api.metrobilbao.eus/metro/real-time/{origin}/{destination}` | GET |
| Incidencias | `/api/metro/incidents?lang=es` | GET |
| Tarifas | `/api/metro/fares?lang=es` | GET |
| Horarios | `/api/metro/schedule?origin={code}&dest={code}&date={date}` | GET |

## Bilbobus

| Descarga | URL | Formato |
|----------|-----|---------|
| **GTFS Static** ⭐ | `https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/gtfs_bilbobus.zip` | ZIP (CSV) |
| **GTFS-Realtime Vehicles** | `https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/gtfsrt_bilbobus_vehicle_positions.pb` | GTFS-RT (protobuf) |
| SIRI Vehicle Monitoring | `https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/siri_bilbobus_vehicle_monitoring.xml` | XML |
| NeTEx | `https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/netex_bilbobus.zip` | ZIP |

## Bizkaibus

| Uso | Endpoint | Método |
|-----|----------|--------|
| **Llegadas por parada** ⭐ | `https://apli.bizkaia.net/APPS/DANOK/TQWS/TQ.ASMX/GetPasoParadaMobile_JSON?callback=""&strParada={stopCode}` | GET |
| Itinerario de línea | `https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetItinerarioLinea_JSON?callback=jsonCallbackParadas&sCodigoLinea={lineCode}&sNumeroRuta=001&sSentido=V` | GET |
| Tarifas | `https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetTarifasLinea_JSON?callback=jsonCallbackTarifa&sCodigoLinea={lineCode}&...` | GET |
| Todas las líneas | `https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetLineas_JSON?callback=xmlCallbackRellenarLineas&...` | GET |
| Paradas cercanas | `https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetParadasCercanasLatLon_JSON?callback=jsonParadas&dLatitudOrigen={lat}&dLongitudOrigen={lon}&dRadio={radius}` | GET |

**Nota Bizkaibus**: Todas requieren limpieza JSONP: `.replace(/^.*?\(/, '').replace(/\);?\s*$/, '').replace(/'/g, '"')`

## Renfe

| Uso | Endpoint | Método |
|-----|----------|--------|
| **Horarios y tiempo real** | `https://horarios.renfe.com/cer/HorariosServlet` | POST |

## Búsqueda Local (Cliente)

| Función | Ubicación | Uso |
|---------|----------|-----|
| `searchBizkaibusStops(query, limit)` | `src/lib/bizkaibus/search.ts` | Búsqueda por nombre |
| `getNearbyBizkaibusStops(lat, lon, radius, limit)` | `src/lib/bizkaibus/search.ts` | Paradas cercanas |
| `searchStops(query)` | `src/lib/shared/stopSearch.ts` | BD (Metro/Bilbobus) |

## Archivos de Datos Locales

| Transporte | Ubicación | Tamaño | Paradas |
|-----------|----------|--------|---------|
| Metro | `src/data/metro/stations.json` | ~5KB | 50 |
| Bilbobus | `src/data/bilbobus/stops.json` | ~500KB | ~2,000 |
| Bizkaibus | `src/data/bizkaibus/stops.json` | ~3MB (300KB gzip) | 30,565 |
| Renfe | `src/data/renfe/stops.json` | ~2KB | ~15 |

## Códigos de Referencia

### Provincias (Bizkaibus)
- `48` = Bizkaia

### Municipios (Bizkaibus)
- `020` = Bilbao
- `901` = Derio

### Líneas Metro
- `L1` = Línea 1
- `L2` = Línea 2
- `L3` = Línea 3 (Euskotren)

### Direcciones (Bizkaibus)
- `V` = Vuelta
- `I` = Ida

---

Consultar [DOCUMENTATION.md](DOCUMENTATION.md) para información completa y detallada.
