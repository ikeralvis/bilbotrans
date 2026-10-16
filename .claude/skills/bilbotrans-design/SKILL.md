---
name: bilbotrans-design
description: Reglas de diseño, movimiento y datos de BilboTrans (app de transporte, Metro Bilbao primero). Úsalo al crear o modificar pantallas, componentes, animaciones o lógica de trenes/andenes/sentidos.
---

# BilboTrans — Skill de proyecto

Lee `DESIGN_SYSTEM.md` para tokens y componentes y `PLAN.md` para el estado del trabajo. Combina con las skills `apple-design`, `emil-design-eng`, `better-ui`, `mobile-native` y `animate`.

## Regla de sentido (NO romper)
- Una estación tiene **dos sentidos**: *Basauri · Etxebarri* (interior) y *Kabiezes · Plentzia* (costa); en la UI se muestra solo el destino, sin "Hacia".
- L2 = Basauri ⇄ Kabiezes. L1 = Etxebarri ⇄ Plentzia (con cortes en Ibarbengoa, Bidezabal…).
- `platforms.Platforms[i]` de `/api/stations/{code}` **no es estable** (en Plentzia `[0]` está vacío y `[1]` trae el sentido interior). Clasifica **por tren**:
  1. `Direction` string `"Etxebarri/Basauri"` o número `2` → interior; `"Kabiezes/Plentzia"` o `1` → costa.
  2. Si falta, compara el orden de la estación de `Destination` con el de la estación actual en `src/data/metro/stations.json` (orden creciente = costa).
- Implementado en `src/lib/metro/direction.ts` (`groupByDirection`). No dupliques esta lógica; no uses "Andén 1/2" salvo que la API lo indique.
- Nunca mezcles sentidos en un grupo. Dentro de un grupo se ordena por minutos y se muestra chip de línea.

## Datos
- Único cliente de la API oficial: `src/lib/metro/client.ts`. Los componentes usan hooks SWR (`src/lib/metro/hooks.ts`) contra `/api/metro/*`; nunca llaman a `api.metrobilbao.eus` desde el navegador.
- Catálogo estático (estaciones, fotos, salidas, POIs, PDF) en `src/data/metro/catalog.json`, generado por `pnpm sync:metro`. Nunca se edita a mano.
- Tiempo real: **sin polling**. Se pide al montar, al volver a la pestaña (máx. 1/30 s) y con el botón de actualizar (`refreshMetroLive`). Siempre se muestra la edad del dato (`LiveBadge`). Caché edge `s-maxage=10`.
- Otros transportes (Bilbobus, Bizkaibus, Renfe) están ocultos con `NEXT_PUBLIC_ENABLED_TRANSPORTS`; no los borres.

## Checklist antes de dar una pantalla por terminada
- [ ] Skeleton con el mismo layout; sin saltos de CLS.
- [ ] Estados: cargando, vacío ("Sin trenes ahora"), error con último dato, offline, mantenimiento.
- [ ] Animaciones solo `transform/opacity`, interrumpibles, con `prefers-reduced-motion`.
- [ ] Modo claro y oscuro, 375 px, zoom permitido, hit areas ≥ 44 px.
- [ ] Sin `console.log`, sin `any`.
