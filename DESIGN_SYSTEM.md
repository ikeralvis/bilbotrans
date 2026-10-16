# BilboTrans — Design System

Dirección: **Apple-fluido + color de línea**. Superficies limpias y translúcidas, movimiento físico (springs), la foto de la estación como protagonista y el color de la línea como único acento fuerte. Fuentes de criterio: `apple-design`, `emil-design-eng`, `better-ui`, `mobile-native`, `animate`.

## Principios
1. **Información antes que decoración.** Lo primero que se ve es *cuántos minutos faltan y hacia dónde*. Todo lo demás es secundario.
2. **El sentido manda, no el andén.** Nunca se mezclan trenes de sentidos distintos en un mismo grupo (ver `SKILL.md`, regla de sentido).
3. **Siempre vivo y honesto.** Badge "En vivo" con antigüedad real del dato; si falla la red, se muestra el último dato en gris con aviso.
4. **Rápido por defecto.** Datos estáticos del catálogo local, tiempo real por SWR con dedupe, skeletons con el mismo layout que el contenido final.
5. **Restricción.** Un acento por pantalla, pocas sombras, sin gradientes decorativos salvo el scrim de la foto.

## Tokens (CSS variables en `globals.css`)
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F2F2F7` | `#000000` | Fondo de app |
| `--surface` | `#FFFFFF` | `#1C1C1E` | Tarjetas |
| `--surface-2` | `#F7F7FA` | `#2C2C2E` | Filas, inputs |
| `--glass` | `rgba(255,255,255,.72)` | `rgba(28,28,30,.72)` | Cabeceras/tab bar con `backdrop-blur(20px) saturate(180%)` |
| `--ink` | `#0B0B0F` | `#FFFFFF` | Texto principal |
| `--ink-2` | `#6B6B73` | `#98989F` | Texto secundario (contraste ≥ 4.5) |
| `--hairline` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.10)` | Bordes 1px |
| `--metro` | `#F14E2D` | `#FF6A4D` | Marca Metro Bilbao / acento |
| `--l1` | `#D93E14` | `#F0583A` | Línea 1 (Etxebarri–Plentzia), color oficial |
| `--l2` | `#000000` | `#E5E5EA` | Línea 2 (Basauri–Kabiezes), oficial; en oscuro invierte |
| `--l3` | `#E1007A` | `#E1007A` | Línea 3 (Matiko–Kukullaga), oficial |
| `--live` | `#34C759` | `#30D158` | Badge en vivo |
| `--warn` / `--error` | `#FF9F0A` / `#FF3B30` | ajustados | Avisos / errores |

Chip de línea: fondo `--l1`/`--l2`, texto blanco (L2 oscuro: texto `--bg`).

## Tipografía (Geist Sans)
- Minutos: 56/56 `font-weight 700`, `tabular-nums`, tracking −0.03em.
- Título de pantalla: 28/32 · 700 · −0.02em. Sección: 13/16 · 600 · uppercase · +0.06em · `--ink-2`.
- Cuerpo: 16/24 · 400. Secundario: 14/20. Caption: 12/16.
- `font-variant-numeric: tabular-nums` en todo número que cambia.

## Espaciado, radios, sombras
- Escala 4 (4,8,12,16,20,24,32). Gutter de página 16.
- Radios **concéntricos**: contenedor 28 → tarjeta 20 → fila 14 → chip 999. `radio_interior = radio_exterior − padding`.
- Sombra única de tarjeta: `0 1px 0 var(--hairline), 0 8px 24px -12px rgba(0,0,0,.18)`. Sin sombras en oscuro (usar hairline).
- Hit area mínima 44×44 (pseudo-elemento si el icono es menor).

## Componentes
- **StationHero** — foto (`next/image`, blur LQIP) con scrim inferior `linear-gradient(to top, rgba(0,0,0,.65), transparent 60%)`, nombre grande, chips de línea, zona, botón favorito. Parallax ≤ 24 px.
- **DirectionGroup** — título "Hacia Basauri · Etxebarri" / "Hacia Kabiezes · Plentzia" + lista de `TrainRow`. Estado vacío: "Sin trenes ahora".
- **TrainRow** — `LineChip` + destino + vagones + hora de llegada; a la derecha minutos (`0` → "Ya aquí"). El primero es destacado (minutos grandes, barra de progreso).
- **LiveBadge** — botón de actualizar con edad del dato ("Actualizado · hace 12 s"); ámbar y "Desactualizado" a partir de 60 s o sin conexión.
- **SegmentedTabs** (`ui.tsx`) — control tipo iOS con indicador compartido (`layoutId`). Uso: Próximos trenes / Horario en el trayecto.
- **LineDiagram** (`LineDiagram.tsx`, `/metro/lines`) — diagrama vertical de línea con datos de `/metro/line-with-issues/{l}/1`: vía del color oficial (troncal L1/L2 a dos colores), zonas, minutos entre estaciones, incidencias y trenes estimados (GTFS).
- **TrainStrip** (`ui.tsx`) — ilustración oficial `public/brand/tren-vector.svg` (entra una vez, spring suave). La carrocería es casi negra: siempre sobre franja clara (`#e9e9ee`). El logo `public/brand/mb-logo-white-text.png` lleva texto blanco: solo sobre `--hero` (`#1b1b1f`).
- **BottomSheet** (`ui.tsx`) — spring, arrastrable hacia abajo, backdrop con blur, Esc/fondo para cerrar, salida animada. Uso: detalle de avisos (`IncidentsBanner`).
- **ExitList** — salidas con iconos de ascensor / nocturno / accesible.
- **ServiceBanner** — aviso de mantenimiento/incidencia de `/api/metro/status`.

## Movimiento
- Solo `transform` y `opacity`. Nunca `transition: all`.
- Spring estándar `{ type: 'spring', stiffness: 380, damping: 32, mass: .8 }`; sheets `{ stiffness: 320, damping: 34 }`.
- Duraciones: micro 120–160 ms, entradas 220–280 ms, nunca > 320 ms. Curva `cubic-bezier(.22,1,.36,1)` (ease-out fuerte) para entradas.
- Pulsar: `scale(.97)` en `:active` (120 ms). Hover solo con `@media (hover:hover)`.
- Entrada de listas escalonada 30 ms/ítem (máx. 6 ítems). Cambio de minutos: crossfade vertical 8 px.
- Todo interrumpible. `prefers-reduced-motion`: sustituir movimiento por fundido de 120 ms.
- Salida más rápida que la entrada (≈ 70 %).

## Móvil / PWA
- `viewport-fit=cover`, `env(safe-area-inset-*)`, `100dvh`. Zoom del usuario **permitido**.
- Inputs 16 px mínimo. `-webkit-tap-highlight-color: transparent`. `touch-action: manipulation`.
- `user-select: none` solo en controles, nunca en texto informativo.
- `theme-color` sincronizado con claro/oscuro.

## Accesibilidad
- Contraste AA. Estado nunca solo por color (icono + texto).
- `aria-live="polite"` en minutos de la llegada principal; foco visible; etiquetas en botones-icono.
