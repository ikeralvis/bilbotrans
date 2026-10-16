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
