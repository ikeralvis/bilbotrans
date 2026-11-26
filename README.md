# BilboTrans

**Transporte de Bizkaia en directo, pensado para el móvil.** Metro Bilbao, Bilbobus, Bizkaibus y Euskotren (con la L3 y los tranvías de Bilbao y Vitoria-Gasteiz) en una sola PWA: próximos trenes y buses, horarios, líneas, paradas y mapa.

> Proyecto independiente y no oficial, sin relación con los operadores.

## Qué hace

- **Un buscador para todo.** Escribe «Moyua» y aparecen juntas la estación de Metro y las paradas de Bilbobus y Bizkaibus de alrededor; escribe «A3247» o «56» y aparece la línea.
- **Cerca de ti.** Las paradas más próximas de todas las redes en una lista, ordenadas por distancia (la ubicación solo se pide al pulsar).
- **Metro Bilbao.** Trenes en directo por sentido (nunca mezclados), cuenta atrás al segundo, retraso real frente al horario, transbordo L1↔L2 en etapas, trayectos favoritos y sugeridos, horario por franjas, avisos, diagrama de líneas y mapa con trenes estimados.
- **Bilbobus.** Próximo bus por línea en cada parada, minutos en todas las paradas de una línea, horas de paso programadas, recorrido en el mapa y «¿qué bus cojo?».
- **Bizkaibus.** Próximos buses con distancia a la parada, líneas por municipio, horario de cartel estructurado, avisos, recorrido en el mapa y buscador de trayecto directo.
- **Euskotren.** Tren, L3, tranvías y funicular con tiempo real GTFS-RT y caída al horario programado.
- **Favoritos sin cuenta**, tema claro y oscuro, una PWA instalable por red y funcionamiento fluido con la red lenta.

## Stack

[Next.js 16](https://nextjs.org) (App Router) · React 19 · TypeScript · Tailwind CSS 4 · [Motion](https://motion.dev) · SWR · Leaflet · desplegado en Vercel (`fra1`).

## Empezar

Requisitos: Node 20+ y [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción (antes regenera el catálogo y el GTFS de Metro) |
| `pnpm lint` | ESLint |
| `pnpm test` | Tests de la lógica de datos (sentidos, retrasos, transbordos, horarios) |
| `pnpm sync:metro` · `sync:gtfs` | Regenera el catálogo y el GTFS de Metro |
| `pnpm sync:bilbobus` · `sync:bizkaibus` · `sync:euskotren` | Regenera los catálogos de bus y Euskotren |

### Variables de entorno

Ninguna es obligatoria para desarrollar las pantallas de transporte.

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_ENABLED_TRANSPORTS` | Redes visibles, separadas por comas (por defecto `metro,bizkaibus,bilbobus,euskotren,tranvia-bilbao,tranvia-vitoria`) |
| `NEXT_PUBLIC_BASE_URL` | URL pública, para metadatos y widgets |
| `DATABASE_URL` | Neon Postgres (solo la ruta heredada `/api/stops/search` y las alertas) |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `CRON_SECRET_TOKEN` | Notificaciones push de incidencias de Metro |

## Estructura

```
src/
  app/              rutas (una carpeta por red) y API propia en app/api/*
  components/       pantallas y piezas por red (metro/, bilbobus/, bizkaibus/, euskotren/) + shared/ y home/
  lib/              clientes de cada operador, hooks SWR y lógica pura con tests
  data/             catálogos precompilados (no se editan a mano)
scripts/            sincronización de catálogos y generación de iconos
.github/workflows/  refresco semanal de datos y APK de Android
```

Reglas del código: los componentes no llaman a los operadores, usan los hooks de `src/lib/*/hooks.ts` contra `/api/*`; el sentido de los trenes de Metro se calcula solo con `groupByDirection`.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/DATA.md`](docs/DATA.md) | Fuentes, catálogos, métodos (sentidos, retraso, simulación) y rutas de la API propia |
| [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) | Compromisos de accesibilidad, cómo se comprueba y problemas conocidos |
| [`API.md`](API.md) | Investigación detallada de cada fuente de datos, con fechas de prueba |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | Tokens, tipografía, componentes y movimiento |
| [`PLAN.md`](PLAN.md) | Estado del proyecto y siguientes fases |

## Contribuir

Los issues y pull requests son bienvenidos. Para cambios de interfaz, sigue `DESIGN_SYSTEM.md` y la checklist de `.claude/skills/bilbotrans-design/SKILL.md` (estados de carga, vacío y error; claro y oscuro; 375 px; `prefers-reduced-motion`). Pasa `pnpm lint` y `pnpm test` antes de abrir el PR.

## Licencia y atribuciones

* **Código fuente:** Distribuido bajo la licencia [GNU AGPLv3](LICENSE). Si utilizas o modificas este código, debes mantener la atribución al autor original y liberar el código resultante bajo la misma licencia.
* **Diseño, interfaz y recursos gráficos:** © 2026 Iker Alvis. Todos los derechos reservados. No está permitida la copia o replicación de la identidad visual sin autorización expresa.
* **Datos de transporte:** Los datos en tiempo real y horarios provienen de Open Data Euskadi, Consorcio de Transportes de Bizkaia (Bizkaibus), Bilbobus y Metro Bilbao bajo licencia CC BY 4.0. Detalle por fuente en [`docs/DATA.md`](docs/DATA.md#licencias-y-atribución).
