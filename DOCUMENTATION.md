# 📋 BilboTrans - Documentación Unificada

**Última actualización:** 26 de enero de 2026

Documentación completa de APIs, rutas, archivos descargables y arquitectura del sistema de transportes BilboTrans.

---

## 📑 Tabla de Contenidos

1. [Arquitectura General](#-arquitectura-general)
2. [Metro Bilbao](#metro-bilbao)
3. [Bilbobus](#bilbobus)
4. [Bizkaibus](#bizkaibus)
5. [Renfe Cercanías](#renfe-cercanías)
6. [Euskotren L3](#euskotren-l3)
7. [Infraestructura de Datos](#infraestructura-de-datos)
8. [Guía de Implementación](#guía-de-implementación)

---

## 🚇 Arquitectura General

### Estrategia por Transporte

| Transporte | Paradas | Almacenamiento | Búsqueda | Tiempo Real |
|----------|---------|-----------------|----------|------------|
| Metro Bilbao | 50 | PostgreSQL | `/api/stops/search` | API oficial |
| Bilbobus | ~2,000 | PostgreSQL | `/api/stops/search` | API AJAX |
| Bizkaibus | 30,565 | **JSON LOCAL** | `searchBizkaibusStops()` | API JSONP |
| Renfe | ~15 | JSON estático | N/A | API REST |

### Estructura de Directorios

```
src/
├── lib/
│   ├── metro/
│   │   ├── api.ts              # Cliente API Metro
│   │   └── trainPosition.ts    # Posiciones en tiempo real
│   ├── bilbobus/
│   │   └── api.ts              # Cliente API Bilbobus
│   ├── bizkaibus/
│   │   ├── api.ts              # API tiempo real (JSONP)
│   │   └── search.ts           # Búsqueda LOCAL (sin BD)
│   ├── renfe/
│   │   └── api.ts              # Cliente API Renfe
│   └── shared/
│       ├── db.ts               # Cliente PostgreSQL
│       └── stopSearch.ts       # Búsqueda BD (Metro/Bilbobus)
│
├── data/
│   ├── metro/
│   │   └── stations.json       # 50 estaciones
│   ├── bilbobus/
│   │   └── stops.json          # ~2K paradas urbanas
│   ├── bizkaibus/
│   │   └── stops.json          # 30K paradas (3MB)
│   └── renfe/
│       └── stops.json          # ~15 estaciones
│
└── app/
    └── api/
        └── stops/
            └── search/
                └── route.ts    # API búsqueda (Metro/Bilbobus)
```

---

## 🟠 Metro Bilbao

### Características Generales

- **Estaciones**: 50 estaciones
- **Líneas**: L1, L2, L3 (operada por Euskotren)
- **Almacenamiento**: PostgreSQL (Neon)
- **Búsqueda**: Base de datos
- **Tiempo real**: API oficial Metro Bilbao

### Archivos y Scripts

- **Cliente API**: `src/lib/metro/api.ts`
- **Datos estáticos**: `src/data/metro/stations.json`
- **Script de seed**: `scripts/seed-stops.ts`

### Endpoints API

#### 1. Información de Estación (PRINCIPAL) ⭐

```http
GET https://api.metrobilbao.eus/api/stations/{stationCode}?lang={es|eu|en}
```

**Parámetros:**
- `stationCode`: Código de estación (ej: ABA, SAN, IND)
- `lang`: Idioma (es, eu, en)

**Respuesta Completa:**
```json
{
    "id": 1,
    "name": "Abando",
    "code": "ABA",
    "line": ["L1", "L2"],
    "exits": [
        {
            "id": 74,
            "name": "Ascensor",
            "address": "Gran Vía, 1",
            "elevator": true,
            "nocturnal": true,
            "wheelchairAccessible": true,
            "latitude": "43.26144",
            "longitude": "-2.92820"
        }
    ],
    "platforms": {
        "Station": "ABANDO",
        "StationId": "ABA",
        "Platforms": [
            [
                {
                    "Destination": "Basauri",
                    "Direction": "Etxebarri/Basauri",
                    "Length": 4,
                    "Minutes": 0,
                    "Time": "2026-01-07T12:12:55",
                    "line": "L2"
                },
                {
                    "Destination": "Etxebarri",
                    "Direction": 2,
                    "Length": 5,
                    "Minutes": 3,
                    "Time": "2026-01-07T12:16:01",
                    "line": "L1"
                }
            ],
            [
                {
                    "Destination": "Plentzia",
                    "Direction": "Kabiezes/Plentzia",
                    "Length": 5,
                    "Minutes": -1,
                    "Time": "2026-01-07T12:11:33",
                    "line": "L1"
                },
                {
                    "Destination": "Kabiezes",
                    "Direction": 1,
                    "Length": 4,
                    "Minutes": 2,
                    "Time": "2026-01-07T12:14:21",
                    "line": "L2"
                }
            ]
        ]
    },
    "issues": [],
    "img": "https://api.metrobilbao.eus/stations/ABA.jpg"
}
```

**Notas:**
- `Platforms[0]` = Andén 1, `Platforms[1]` = Andén 2
- Cada tren tiene su `line` correcta (L1, L2, L3)
- `Minutes = -1` significa que el tren ya pasó o está llegando
- Este es el endpoint recomendado para tiempo real

#### 2. Tiempo Real por Trayecto

```http
GET https://api.metrobilbao.eus/metro/real-time/{origin}/{destination}
```

**Parámetros:**
- `origin`: Código de estación de origen
- `destination`: Código de estación de destino

**Respuesta:**
```json
{
    "trains": [
        {
            "wagons": 4,
            "estimated": 3,
            "direction": "Plentzia",
            "time": "10:45:30",
            "timeRounded": "10:46"
        }
    ],
    "trip": {
        "fromStation": { "code": "BAS", "name": "Basauri" },
        "toStation": { "code": "ABN", "name": "Abandoibarra" },
        "duration": 12,
        "line": "L1",
        "transfer": false
    },
    "exits": {
        "origin": [...],
        "destiny": [...]
    }
}
```

**Nota:** Este endpoint devuelve la línea del trayecto, no la de cada tren individual. Para líneas exactas, usar endpoint de estación.

#### 3. Incidencias/Avisos

```http
GET /api/metro/incidents?lang=es
```

**Implementación local**: `src/app/api/metro/incidents/route.ts`

**Fuentes:**
- Español: `https://api.metrobilbao.eus/metro_page/es/avisos`
- Euskera: `https://api.metrobilbao.eus/metro_page/eu/abisuak`

#### 4. Tarifas

```http
GET /api/metro/fares?lang=es
```

**Implementación local**: `src/app/api/metro/fares/route.ts`

**Fuentes:**
- Español: `https://api.metrobilbao.eus/metro_page/es/todas-las-tarifas`
- Euskera: `https://api.metrobilbao.eus/metro_page/eu/tarifa-guztiak`

#### 5. Horarios Programados

```http
GET /api/metro/schedule?origin={code}&dest={code}&date={DD-MM-YYYY}&hourStart={6}&hourEnd={23}&lang=es
```

**Implementación local**: `src/app/api/metro/schedule/route.ts`

**Fuente Externa:**
```
https://api.metrobilbao.eus/metro/obtain-schedule-of-trip/{origin}/{destination}/{hourStart}/{hourEnd}/{date}/{language}
```

---

## 🔴 Bilbobus

### Características Generales

- **Paradas**: ~2,000 paradas urbanas de Bilbao
- **Almacenamiento**: PostgreSQL (Neon)
- **Búsqueda**: Base de datos (`/api/stops/search`)
- **Tiempo real**: API AJAX Bilbobus

### Archivos y Scripts

- **Cliente API**: `src/lib/bilbobus/api.ts`
- **Datos estáticos**: `src/data/bilbobus/stops.json`
- **Script de seed**: `scripts/seed-arin.ts`

### Fuentes de Datos

#### 1. GTFS Static - Información Estática ⭐

```
URL: https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/gtfs_bilbobus.zip
Formato: GTFS (ZIP con CSVs)
Tipo: Estáticos
Tamaño: Variable (decenas de MB)
Actualización: Periódica
```

**Contenido del ZIP:**
- `agency.txt` → Operador del servicio
- `routes.txt` → Líneas de autobús
- `stops.txt` → Paradas (ID, nombre, lat, lon)
- `trips.txt` → Viajes asociados a rutas
- `stop_times.txt` → Horarios teóricos por parada
- `shapes.txt` → Geometría del recorrido (mapas)
- `calendar.txt` / `calendar_dates.txt` → Días de servicio

**Uso en la App:**
- Mostrar líneas y recorridos
- Mostrar paradas en el mapa
- Consultar horarios teóricos
- Planificación básica de rutas

#### 2. GTFS-Realtime - Vehicle Positions

```
URL: https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/gtfsrt_bilbobus_vehicle_positions.pb
Formato: GTFS-RT (Protocol Buffers)
Tipo: Tiempo real
Tamaño: ~1-5 MB
Actualización: Cada 30-60 segundos
Refresco recomendado: 10-20 segundos
```

**Datos Disponibles:**
- ID del vehículo
- Línea / viaje asociado (trip_id, route_id)
- Posición GPS (latitud, longitud)
- Timestamp de actualización
- Velocidad y rumbo (si están disponibles)

**Uso en la App:**
- Mostrar autobuses en tiempo real sobre el mapa
- Saber qué líneas están activas
- Asociar buses a rutas concretas
- Calcular estimaciones aproximadas de llegada

**Limitaciones:**
- ❌ No incluye tiempos de llegada oficiales
- ❌ No incluye información de retrasos por parada

#### 3. SIRI - Vehicle Monitoring

```
URL: https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/siri_bilbobus_vehicle_monitoring.xml
Formato: SIRI (XML)
Tipo: Tiempo real
Tamaño: Variable
Actualización: Cada 30-60 segundos
```

**Contenido:**
- Posición de vehículos
- Estado del vehículo
- Línea asociada

**Notas:**
- Información similar a GTFS-RT Vehicle Positions
- XML muy verboso
- Mayor complejidad de parseo
- **Recomendación**: No usar si ya se consume GTFS-RT

#### 4. NeTEx - Red de Transporte Avanzada

```
URL: https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/netex_bilbobus.zip
Formato: NeTEx (Network Timetable Exchange)
Tipo: Estáticos (modelo completo)
Tamaño: Decenas de MB
```

**Contenido:**
- Modelo completo de la red
- Paradas, rutas, horarios y relaciones complejas

**Observaciones:**
- Estándar europeo muy potente
- Complejo y pesado
- Orientado a grandes integraciones institucionales
- **Recomendación**: No necesario para app de consumo final

#### Stack Recomendado de Bilbobus

✅ **USAR:**
- `GTFS` → Persistir en base de datos (paradas, rutas)
- `GTFS-RT Vehicle Positions` → Consumo periódico para tiempo real
- `API propia` → Normalización y exposición al frontend

❌ **EVITAR:**
- `SIRI` → Redundante con GTFS-RT
- `NeTEx` → Overkill para consumo final

---

## 🟢 Bizkaibus (Interurbano)

### Características Generales

- **Paradas**: 30,565 paradas provinciales
- **Almacenamiento**: **JSON LOCAL** (sin PostgreSQL)
- **Búsqueda**: Local en memoria (`searchBizkaibusStops()`)
- **Tiempo real**: API JSONP Bizkaibus
- **Bundle comprimido**: ~300KB con gzip

### Por qué Almacenamiento Local

- 30K paradas saturarían el PostgreSQL gratuito
- Búsqueda instantánea sin latencia de red
- No consume conexiones de base de datos
- Bundle altamente comprimido

### Archivos

- **API Tiempo Real**: `src/lib/bizkaibus/api.ts`
- **Búsqueda Local**: `src/lib/bizkaibus/search.ts`
- **Datos Estáticos**: `src/data/bizkaibus/stops.json` (3MB)

### Endpoints API Implementados

#### 1. Llegadas en Tiempo Real por Parada ⭐

```http
GET https://apli.bizkaia.net/APPS/DANOK/TQWS/TQ.ASMX/GetPasoParadaMobile_JSON?callback=""&strLinea=&strParada={stopCode}
```

**Parámetros:**
- `stopCode`: Código de parada (ej: 3912, 0913)
- `callback`: Dejar vacío `""` para JSONP
- `strLinea`: Vacío (para todas las líneas)

**Respuesta (después de limpiar JSONP):**
```json
{
  "STATUS": "OK",
  "Resultado": "<PasoParada><linea>A3250</linea><ruta>Bilbao-Teknologia Parkea</ruta>...</PasoParada>"
}
```

**Notas:**
- Formato JSONP: `""({...});` - Necesita limpieza con regex
- Datos vienen en XML dentro del campo `Resultado`
- `e1` = Primera llegada, `e2` = Segunda llegada
- Tiempos en minutos

**Patrón de Limpieza:**
```javascript
.replace(/^.*?\(/, '')
 .replace(/\);?\s*$/, '')
 .replace(/'/g, '"')
```

#### 2. Itinerarios de Línea (Paradas de Ruta)

```http
GET https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetItinerarioLinea_JSON?callback=jsonCallbackParadas&sCodigoLinea={lineCode}&sNumeroRuta={routeNumber}&sSentido={direction}
```

**Parámetros:**
- `lineCode`: Código de línea (ej: A3250, A3123)
- `routeNumber`: Número de ruta, generalmente "001"
- `direction`: `V` (Vuelta) o `I` (Ida)

**Respuesta:**
```json
{
  "STATUS": "OK",
  "Consulta": {
    "Linea": "A3250",
    "Descripcion": "BILBAO - Teknologia Parkea/Parque Tecnológico",
    "DescripcionRuta": "Bilbao-Teknologia Parkea",
    "TRTipoRuta": "1",
    "Ruta": "001",
    "Sentido": "V",
    "Paradas": [
      {
        "IR_PROVIN": "48",
        "IR_MUNICI": "901",
        "DescripcionMunicipio": "DERIO",
        "IR_PARADA": "032",
        "PR_DENOMI": "Nekazaritza Eskola/Escuela Agraria",
        "PR_CODRED": "3912"
      }
    ]
  }
}
```

#### 3. Tarifas de Línea (Origen-Destino)

```http
GET https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetTarifasLinea_JSON?callback=jsonCallbackTarifa&sCodigoLinea={lineCode}&sCodigoProvinciaOrigen={provOrigin}&SCodigoMunicipioOrigen={munOrigin}&sCodigoCentroOrigen=&sCodigoProvinciaDestino={provDest}&SCodigoMunicipioDestino={munDest}&sCodigoCentroDestino=
```

**Parámetros:**
- `lineCode`: Código de línea (ej: A3250)
- `provOrigin/provDest`: Código de provincia (48 = Bizkaia)
- `munOrigin/munDest`: Código de municipio (901 = Derio, 020 = Bilbao)

**Respuesta:**
```json
{
  "STATUS": "OK",
  "Consulta": {
    "Linea": "A3250",
    "Descripcion": "BILBAO - Teknologia Parkea/Parque Tecnológico",
    "Tarifas": {
      "TF_LABORL": "2,1",
      "TF_CRETRN": "0,7",
      "TF_JUBILA": "0,3"
    }
  }
}
```

#### 4. Listado de Todas las Líneas

```http
GET https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetLineas_JSON?callback=xmlCallbackRellenarLineas&iTipoConsulta=1&sCodigoLinea=&sNumeroRuta=&sSentido=&sDescripcionLinea=&sListaCodigosLineas=
```

**Respuesta:**
```json
{
  "STATUS": "OK",
  "Lineas": [
    {
      "LI_CODIGO": "A3250",
      "LI_DENOMI": "BILBAO - Teknologia Parkea",
      "LI_RAIZ": "A3",
      "LI_NUMEROLINEA": "250"
    }
  ]
}
```

#### 5. Paradas Cercanas por Coordenadas

```http
GET https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetParadasCercanasLatLon_JSON?callback=jsonParadas&dLatitudOrigen={lat}&dLongitudOrigen={lon}&dRadio={radius}
```

**Parámetros:**
- `lat`: Latitud (ej: 43.2630)
- `lon`: Longitud (ej: -2.9350)
- `radius`: Radio en metros (ej: 500)

**Respuesta:**
```json
{
  "STATUS": "OK",
  "Consulta": {
    "Paradas": [
      {
        "PROVINCIA": "48",
        "MUNICIPIO": "020",
        "PARADA": "188",
        "DENOMINACION": "Zabalburu (Juan de Garay)",
        "LATITUD": "43.256748",
        "LONGITUD": "-2.933824",
        "CODIGOREDUCIDOPARADA": "4121"
      }
    ]
  }
}
```

### Funciones de Búsqueda Local

#### `searchBizkaibusStops(query, limit)`

```typescript
// Búsqueda LOCAL sin BD
const results = searchBizkaibusStops('Bilbao', 15);
```

**Ubicación**: `src/lib/bizkaibus/search.ts`

**Uso**: Búsqueda por nombre de parada sin necesidad de base de datos.

#### `getNearbyBizkaibusStops(lat, lon, radius, limit)`

```typescript
// Paradas cercanas calculadas localmente
const nearby = getNearbyBizkaibusStops(43.26, -2.92, 2, 10);
```

**Ubicación**: `src/lib/bizkaibus/search.ts`

**Uso**: Encontrar paradas cercanas basadas en coordenadas GPS.

### Notas Técnicas de Bizkaibus

- Todas las respuestas están en formato JSONP
- Los callbacks varían: `jsonCallbackTarifa`, `jsonCallbackParadas`, `xmlCallbackRellenarLineas`
- Requiere limpieza de respuestas JSONP
- Búsqueda optimizada para cliente (no cliente-servidor)

---

## 🟣 Renfe Cercanías

### Características Generales

- **Estaciones**: ~15 estaciones principales
- **Almacenamiento**: JSON estático
- **Búsqueda**: No necesaria (pocas estaciones)
- **Tiempo real**: API REST Renfe

### Archivos

- **Cliente API**: `src/lib/renfe/api.ts`
- **Datos Estáticos**: `src/data/renfe/stops.json`

### Endpoints API

#### Horarios y Tiempo Real

```http
POST https://horarios.renfe.com/cer/HorariosServlet
```

**Body:**
```json
{
    "nucleo": "60",
    "origen": "11511",
    "destino": "11600",
    "fchaViaje": "20260107",
    "validaReglaNegocio": true,
    "tiempoReal": true,
    "servicioHorarios": "VTI",
    "horaViajeOrigen": "08",
    "horaViajeLlegada": "23",
    "accesibilidadTrenes": false
}
```

**Parámetros:**
- `nucleo`: "60" para Bilbao
- `origen/destino`: Códigos de estación
- `fchaViaje`: Fecha en formato YYYYMMDD
- `horaViajeOrigen/horaViajeLlegada`: Rango horario (0-23)

**Notas:**
- Requiere HTTP Plugin de Capacitor para funcionar en móvil
- En web puede requerir proxy por CORS
- Retorna información de horarios y tiempo real

---

## 🟡 Euskotren L3

### Características Generales

- **Línea**: L3 del Metro Bilbao
- **Operador**: Euskotren
- **Características**: API diferente al Metro Bilbao

### Identificación

Las estaciones de L3 se identifican en los datos por tener `"L3"` en su array de líneas.

### Archivos y Verificación

- **Servicio API**: `arin-main/src/services/ApiMetroBilbaoL3.ts`
- **Documentación**: Ubicada en la sección de Metro Bilbao

---

## 💳 Consulta Barik (Saldo de Tarjeta)

### Características

- **Tipo**: Consulta de saldo de tarjeta de transporte
- **Tarjetas Soportadas**: Gizatrans, Creditrans
- **Respuesta**: XML con saldos

### Endpoint

```http
POST https://www.ctb.eus/llamadaServicioBarik.php
```

**Body:**
```
p=IdTarjeta*{barikNumber}|vacio*vacio&metodo=consultaTitulosRecargablesAnt
```

**Headers Requeridos:**
```
Content-Type: application/x-www-form-urlencoded
Origin: https://www.ctb.eus
Referer: https://www.ctb.eus
```

**Respuesta:** XML con saldos Gizatrans y Creditrans

---

## 📊 Infraestructura de Datos

### PostgreSQL (Neon)

El proyecto utiliza PostgreSQL para almacenamiento de datos de Metro y Bilbobus.

**Esquema**: `src/db/schema.ts`

#### Tablas Principales

**1. Paradas (stops)**
- Caché de todas las paradas de transporte
- Coordenadas GPS (latitud, longitud)
- Metadatos (líneas, plataformas, direcciones)
- Agencia de transporte

**2. Favoritos (favorites)**
- Paradas favoritas por usuario
- Agencia de transporte
- Información de usuario

#### Posibles Usos Adicionales

1. **Caché de Horarios** - Almacenar horarios programados para reducir llamadas API
2. **Histórico de Tiempos** - Analytics de retrasos y tendencias
3. **Usuarios y Preferencias** - Si se implementa autenticación
4. **Rutas Guardadas** - Guardar trayectos frecuentes

### Redis (Opcional)

Redis sería ideal para:

1. **Caché de Tiempo Real** - TTL corto (30s) para datos en tiempo real
2. **Rate Limiting** - Controlar llamadas a APIs externas
3. **Session Storage** - Si se implementa autenticación
4. **Pub/Sub** - Notificaciones en tiempo real de incidencias

---

## 🔄 Flujo de Búsqueda por Transporte

### Metro / Bilbobus

```
Usuario escribe
    ↓
HomeClient
    ↓
searchStops(query)
    ↓
fetch('/api/stops/search')
    ↓
PostgreSQL consulta
    ↓
Resultados filtrados por agency (metro | bilbobus)
    ↓
Mostrar paradas en UI
```

### Bizkaibus

```
Usuario escribe
    ↓
HomeClient
    ↓
searchBizkaibusStops(query)
    ↓
Búsqueda en JSON local (en memoria)
    ↓
Resultados inmediatos (sin latencia de red)
    ↓
Mostrar paradas en UI
```

### Paradas Cercanas (Geolocalización)

```
Usuario activa geolocalización
    ↓
GeolocationContext obtiene coordenadas
    ↓
Para Metro/Bilbobus: getNearbyStops(lat, lon, radius) → BD
Para Bizkaibus: getNearbyBizkaibusStops(lat, lon, radius) → Local
    ↓
Resultados combinados
    ↓
Mostrar en mapa
```

---

## ⚙️ Guía de Implementación

### Agregar un Nuevo Transporte

1. **Crear servicio API**
   ```
   src/lib/{transporte}/api.ts
   ```

2. **Crear datos estáticos**
   ```
   src/data/{transporte}/stops.json
   ```

3. **Agregar a base de datos** (si aplica)
   - Crear tabla o actualizar esquema
   - Crear script de seed en `scripts/seed-{transporte}.ts`
   - Ejecutar seed para poblar datos

4. **Crear endpoints API**
   ```
   src/app/api/{transporte}/route.ts
   ```

5. **Actualizar búsqueda**
   - Modificar `stopSearch.ts` para incluir nuevo transporte
   - Agregar función de búsqueda específica si es necesario

6. **Crear componentes UI**
   ```
   src/components/{transporte}/
   ```

### Variables de Entorno Necesarias

```env
# Base de datos
DATABASE_URL=postgres://...

# Almacenamiento en caché (opcional)
REDIS_URL=redis://...

# Vercel KV (alternativa a Redis)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

### Mejores Prácticas

✅ **HACER:**
- Usar PostgreSQL para Metro/Bilbobus
- Usar búsqueda local para Bizkaibus
- Separar claramente las búsquedas por transporte
- Implementar caché para datos que cambian lentamente
- Refresco cada 10-20s para datos en tiempo real

❌ **NO HACER:**
- No mezclar búsquedas de diferentes transportes
- No intentar meter Bizkaibus en BD (30K registros)
- No usar API para búsquedas que pueden ser locales
- No hacer llamadas API sin caché
- No sobrearasar las APIs externas (respetar rate limits)

### Rendimiento

#### Índices en PostgreSQL

Para búsquedas optimizadas:
```sql
CREATE INDEX idx_stops_agency ON stops(agency);
CREATE INDEX idx_stops_name_trgm ON stops USING GIN(name gin_trgm_ops);
CREATE INDEX idx_stops_location ON stops USING GIST(ll_to_earth(latitude, longitude));
```

#### Mejoras Futuras para Bizkaibus

1. **Índice Invertido**: Implementar para búsquedas más rápidas
2. **Fuzzy Matching**: Usar Fuse.js para búsquedas aproximadas
3. **Migración a BD**: Solo si se obtiene PostgreSQL con más capacidad

---

## 📝 Notas Finales

- Todas las APIs de Bilbobus y Bizkaibus son **oficiales y abiertas**
- **No requieren autenticación**
- Son compatibles con **futuras integraciones** (Euskotren, transporte regional)
- La arquitectura está diseñada para **escalabilidad**
- Los datos se mantienen **actualizados regularmente**

---

**Última actualización de documentación**: 26 de enero de 2026
**Versión**: 1.0
