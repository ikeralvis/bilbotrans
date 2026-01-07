# API de Transportes - BilboTrans

## Endpoints Actuales

### Metro Bilbao

#### 1. **Información de Estación (RECOMENDADO)** ⭐
```
GET https://api.metrobilbao.eus/api/stations/{stationCode}?lang={es|eu|en}
```
**Este es el endpoint principal** - Devuelve toda la información de una estación incluyendo trenes en tiempo real con las líneas correctas (L1/L2/L3).

**Parámetros:**
- `stationCode`: Código de estación (ej: ABA, SAN, IND)
- `lang`: Idioma (es, eu, en)

**Respuesta:**
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
                {"Destination": "Basauri", "Direction": "Etxebarri/Basauri", "Length": 4, "Minutes": 0, "Time": "2026-01-07T12:12:55", "line": "L2"},
                {"Destination": "Etxebarri", "Direction": 2, "Length": 5, "Minutes": 3, "Time": "2026-01-07T12:16:01", "line": "L1"}
            ],
            [
                {"Destination": "Plentzia", "Direction": "Kabiezes/Plentzia", "Length": 5, "Minutes": -1, "Time": "2026-01-07T12:11:33", "line": "L1"},
                {"Destination": "Kabiezes", "Direction": 1, "Length": 4, "Minutes": 2, "Time": "2026-01-07T12:14:21", "line": "L2"}
            ]
        ]
    },
    "issues": [],
    "img": "https://api.metrobilbao.eus/stations/ABA.jpg"
}
```

**Notas:**
- `Platforms[0]` = Andén 1
- `Platforms[1]` = Andén 2
- Cada tren tiene su `line` correcta (L1, L2, L3)
- `Minutes` = -1 significa que el tren ya pasó o está llegando

#### 2. Tiempo Real por Trayecto
```
GET https://api.metrobilbao.eus/metro/real-time/{origin}/{destination}
```
**Nota:** Este endpoint devuelve la línea del trayecto, no la de cada tren individual. Usar endpoint de estación para líneas correctas.

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

#### 3. Incidencias/Avisos
```
GET /api/metro/incidents?lang=es
```
**Implementación local:** `src/app/api/metro/incidents/route.ts`

**Fuente:** 
- ES: `https://api.metrobilbao.eus/metro_page/es/avisos`
- EU: `https://api.metrobilbao.eus/metro_page/eu/abisuak`

#### 4. Tarifas
```
GET /api/metro/fares?lang=es
```
**Implementación local:** `src/app/api/metro/fares/route.ts`

**Fuente:**
- ES: `https://api.metrobilbao.eus/metro_page/es/todas-las-tarifas`
- EU: `https://api.metrobilbao.eus/metro_page/eu/tarifa-guztiak`

#### 5. Horarios Programados
```
GET /api/metro/schedule?origin={code}&dest={code}&date={DD-MM-YYYY}&hourStart={6}&hourEnd={23}&lang=es
```
**Implementación local:** `src/app/api/metro/schedule/route.ts`

**Fuente:**
```
https://api.metrobilbao.eus/metro/obtain-schedule-of-trip/{origin}/{destination}/{hourStart}/{hourEnd}/{date}/{language}
```

---

## Endpoints Futuros (Pendientes de Implementar)

### Bizkaibus

**Endpoint encontrado en arin-main:**
```
GET https://apli.bizkaia.net/APPS/DANOK/TQWS/TQ.ASMX/GetPasoParadaMobile_JSON?callback=""&strLinea=&strParada={stopCode}
```

**Datos disponibles:**
- Tiempos de llegada en tiempo real
- Línea y ruta
- Minutos estimados (e1, e2)

**Notas:**
- La respuesta está en formato JSONP y necesita parsing especial
- Los datos XML están embebidos en el JSON

**Itinerarios:**
```
GET https://apli.bizkaia.net/apps/danok/tqws/tq.asmx/GetItinerarioLinea_JSON?callback=jsonCallbackParadas&sCodigoLinea={lineCode}&sNumeroRuta={routeNumber}&sSentido={direction}
```

---

### Renfe Cercanías Bilbao

**Endpoint encontrado en arin-main:**
```
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

**Notas:**
- Nucleo 60 = Bilbao
- Requiere HTTP Plugin de Capacitor para funcionar en móvil
- En web puede requerir proxy por CORS

---

### Euskotren (L3 Metro Bilbao)

La línea L3 es operada por Euskotren y tiene API diferente.

**Verificación disponible en:** `arin-main/src/services/ApiMetroBilbaoL3.ts`

**Notas:**
- Las estaciones de L3 se identifican por tener "L3" en su array de líneas
- Utiliza endpoint diferente al de Metro Bilbao

---

### Consulta Barik (Saldo)

**Endpoint:**
```
POST https://www.ctb.eus/llamadaServicioBarik.php
```

**Body:**
```
p=IdTarjeta*{barikNumber}|vacio*vacio&metodo=consultaTitulosRecargablesAnt
```

**Headers requeridos:**
```
Content-Type: application/x-www-form-urlencoded
Origin: https://www.ctb.eus
Referer: https://www.ctb.eus
```

**Respuesta:** XML con saldos Gizatrans y Creditrans

---

## Uso de PostgreSQL (Neon)

El proyecto tiene PostgreSQL configurado para:

1. **Almacenar paradas** (`stops` table):
   - Caché de todas las paradas de transporte
   - Coordenadas GPS
   - Metadatos (líneas, plataformas, direcciones)

2. **Favoritos de usuarios** (`favorites` table):
   - Paradas favoritas por usuario
   - Agencia de transporte

**Esquema:** `src/db/schema.ts`

### Posibles usos adicionales:

1. **Caché de horarios** - Almacenar horarios programados para reducir llamadas API
2. **Histórico de tiempos** - Analytics de retrasos
3. **Usuarios y preferencias** - Si implementamos autenticación
4. **Rutas guardadas** - Guardar trayectos frecuentes

---

## Posible uso de Redis

Redis sería ideal para:

1. **Caché de tiempo real** - TTL corto (30s) para datos en tiempo real
2. **Rate limiting** - Controlar llamadas a APIs externas
3. **Session storage** - Si implementamos auth
4. **Pub/Sub** - Notificaciones en tiempo real de incidencias

---

## Notas de Implementación

### Para añadir un nuevo transporte:

1. Crear servicio en `src/lib/{transporte}.ts`
2. Añadir paradas a la base de datos con `agency: '{transporte}'`
3. Crear endpoints API en `src/app/api/{transporte}/`
4. Actualizar `stopSearch.ts` para incluir nuevo transporte
5. Añadir componentes UI específicos si es necesario

### Variables de entorno necesarias:

```env
DATABASE_URL=postgres://...
# Si se añade Redis:
REDIS_URL=redis://...
# Si se añade Vercel KV:
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```
