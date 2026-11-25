# 🚇 Arquitectura de Transportes - BilboTrans

## Estrategia por Transporte

### 🟠 Metro Bilbao
- **Paradas**: 50 estaciones
- **Almacenamiento**: PostgreSQL (Neon)
- **Búsqueda**: `/api/stops/search` → BD
- **Tiempo real**: API oficial Metro Bilbao
- **Archivos**:
  - `src/lib/metro/api.ts` - Cliente API
  - `src/data/metro/stations.json` - Datos estáticos
  - Script seed: `scripts/seed-stops.ts`

---

### 🔴 Bilbobus
- **Paradas**: ~2,000 paradas urbanas de Bilbao
- **Almacenamiento**: PostgreSQL (Neon)
- **Búsqueda**: `/api/stops/search` → BD
- **Tiempo real**: API AJAX Bilbobus
- **Archivos**:
  - `src/lib/bilbobus/api.ts` - Cliente API
  - `src/data/bilbobus/stops.json` - Datos estáticos
  - Script seed: `scripts/seed-arin.ts`

---

### 🟢 Bizkaibus (Interurbano)
- **Paradas**: 30,565 paradas provinciales
- **Almacenamiento**: ⚠️ **JSON LOCAL** (sin BD)
- **Búsqueda**: `searchBizkaibusStops()` → Búsqueda en memoria
- **Tiempo real**: API JSONP Bizkaibus
- **Archivos**:
  - `src/lib/bizkaibus/api.ts` - Cliente API tiempo real
  - `src/lib/bizkaibus/search.ts` - **Búsqueda LOCAL** 🆕
  - `src/data/bizkaibus/stops.json` - Fuente de datos (3MB)

**¿Por qué local?**
- 30K paradas saturaría PostgreSQL gratuito
- Búsqueda instantánea sin latencia de red
- No gasta conexiones DB
- Bundle comprimido: ~300KB con gzip

---

### 🟣 Renfe
- **Estaciones**: ~15 estaciones principales
- **Almacenamiento**: JSON estático
- **Búsqueda**: No necesaria (pocas estaciones)
- **Tiempo real**: API REST Renfe
- **Archivos**:
  - `src/lib/renfe/api.ts` - Cliente API
  - `src/data/renfe/stops.json` - Datos estáticos

---

## 📁 Estructura de Archivos

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
│   │   └── search.ts           # 🆕 Búsqueda LOCAL (sin BD)
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
│   │   └── stops.json          # 30K paradas (3MB) 📦
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

## 🔍 Flujo de Búsqueda

### Metro / Bilbobus
```
Usuario escribe → HomeClient → searchStops() 
→ fetch('/api/stops/search') → PostgreSQL 
→ Resultados filtrados por agency
```

### Bizkaibus
```
Usuario escribe → HomeClient → searchBizkaibusStops() 
→ Búsqueda en JSON local (en memoria)
→ Resultados inmediatos (sin red)
```

---

## ⚡ Funciones Clave

### `searchBizkaibusStops(query, limit)` 🆕
**Ubicación**: `src/lib/bizkaibus/search.ts`
```typescript
// Búsqueda LOCAL sin BD
const results = searchBizkaibusStops('Bilbao', 15);
```

### `searchStops(query)`
**Ubicación**: `src/lib/shared/stopSearch.ts`
```typescript
// Búsqueda en BD (Metro/Bilbobus)
const results = await searchStops('Moyua');
```

### `getNearbyBizkaibusStops(lat, lon, radius, limit)` 🆕
**Ubicación**: `src/lib/bizkaibus/search.ts`
```typescript
// Paradas cercanas calculadas localmente
const nearby = getNearbyBizkaibusStops(43.26, -2.92, 2, 10);
```

---

## 🎯 Recomendaciones

✅ **DO**
- Metro/Bilbobus → Usar BD y `/api/stops/search`
- Bizkaibus → Usar `searchBizkaibusStops()` local
- Separar claramente las búsquedas por transporte

❌ **DON'T**
- No mezclar búsquedas de diferentes transportes
- No intentar meter Bizkaibus en BD (30K registros)
- No usar API para búsquedas que pueden ser locales

---

## 🚀 Próximos Pasos

Si en el futuro necesitas:
1. **Más rendimiento en Bizkaibus**: Implementar índice invertido o Fuse.js
2. **Búsqueda más inteligente**: Agregar fuzzy matching
3. **Migrar a BD**: Solo si tienes PostgreSQL con más capacidad

---

## 📊 Comparativa de Tamaño

| Transporte | Paradas | Estrategia | Tamaño JSON |
|------------|---------|------------|-------------|
| Metro      | 50      | BD         | ~5KB        |
| Bilbobus   | 2,000   | BD         | ~500KB      |
| Bizkaibus  | 30,565  | **Local**  | **3MB**     |
| Renfe      | 15      | JSON       | ~2KB        |

**Total bundle Bizkaibus**: ~300KB comprimido con gzip
