# Accesibilidad

BilboTrans quiere poder usarse con lector de pantalla, con el teclado, con zoom y con la reducción de movimiento activada, en un móvil de 375 px. Objetivo: **WCAG 2.2 nivel AA**.

Este documento recoge qué está hecho, cómo se comprueba y qué falta. Si encuentras una barrera, abre un [issue](https://github.com/ikeralvis/bilbotrans/issues) con la etiqueta `accesibilidad`: dispositivo, navegador, tecnología de apoyo y pantalla.

## Compromisos

| Área | Regla | Dónde |
|---|---|---|
| Zoom | El zoom del usuario **nunca** se bloquea (`viewport` sin `maximum-scale` ni `user-scalable=no`). | `src/app/layout.tsx` |
| Texto | Inputs a 16 px o más (iOS no hace zoom al enfocar). Cuerpo 16/24. | `DESIGN_SYSTEM.md` |
| Contraste | Texto AA (4,5:1; 3:1 en texto grande). Cada color se define para claro y oscuro con `light-dark()`. | `src/app/globals.css` |
| Color | El estado nunca va solo por color: «en hora», «+2 min», «Desactualizado» llevan texto e icono. | `LiveBadge`, `TrainRow` |
| Áreas táctiles | Mínimo 44 × 44 px en botones e iconos (pseudo-elemento si el icono es menor). | `bt-press`, botones de cabecera |
| Movimiento | Solo `transform` y `opacity`. Con `prefers-reduced-motion` las entradas se convierten en fundidos y se quitan bucles (punto «en vivo», esqueletos, flechas). | `useReducedMotion` en cada componente animado, `@media (prefers-reduced-motion)` en `globals.css` |
| Foco | Foco visible en todo lo interactivo (`:focus-visible`). Las hojas inferiores cierran con <kbd>Esc</kbd> o tocando el fondo. | `BottomSheet` (`src/components/metro/ui.tsx`) |
| Lectores de pantalla | Botones-icono con `aria-label`; distintivos de red con `role="img"` y nombre, o `aria-hidden` cuando el nombre ya está escrito al lado; chips de línea anunciados como «Línea L1». | `brand.tsx`, `bus.tsx`, `parts.tsx` |
| Cambios en vivo | Los minutos de la llegada principal y el estado del buscador usan `aria-live="polite"`. | `Minutes`, `UnifiedSearch` |
| Estructura | Un `h1` por pantalla, secciones con `aria-labelledby`, listas reales (`ol`/`ul`) para paradas y trenes, `nav` para el esquema de redes. | Todas las pantallas |
| Idioma | `lang="es"` en `<html>`. Los nombres oficiales en euskera se mantienen tal cual. | `layout.tsx` |
| Ubicación | Solo se pide al pulsar «Usar mi ubicación», nunca al cargar. Se puede usar toda la app sin ella. | `NearbyAll`, `GeolocationContext` |

## Pantallas clave

- **Home.** El buscador anuncia el número de resultados («3 lugares, 1 línea»); <kbd>Esc</kbd> lo vacía. El esquema de redes es un `nav` con una lista ordenada; las redes no disponibles se marcan con `aria-disabled` y el texto «Próximamente».
- **Estación de Metro.** Los trenes se agrupan por sentido con un encabezado por grupo («Basauri · Etxebarri»). El tren destacado anuncia sus minutos; los siguientes no, para no saturar.
- **Línea de bus.** La lista de paradas es la vista principal y funciona sin el mapa; el mapa es un complemento plegable (`aria-expanded`), y cada parada del mapa enlaza a su ficha.
- **Mapa de Metro.** Es una vista visual de apoyo; toda su información (estaciones, líneas, trenes estimados) está también en las listas de `/metro/lines`.

## Cómo se comprueba

Antes de dar una pantalla por terminada (checklist de `.claude/skills/bilbotrans-design/SKILL.md`):

1. **Teclado:** recorrer la pantalla con <kbd>Tab</kbd>; todo lo interactivo se alcanza, el orden es lógico y el foco se ve.
2. **Lector de pantalla:** VoiceOver en iOS y TalkBack en Android sobre la PWA instalada; NVDA + Firefox en escritorio.
3. **Zoom 200 %** y texto grande del sistema: sin cortes ni solapes a 375 px.
4. **Reducción de movimiento** activada en el sistema: sin desplazamientos ni bucles.
5. **Modo claro y oscuro:** contraste revisado en ambos.
6. **Automático:** Lighthouse (Accesibilidad) y axe DevTools en `/`, `/metro`, una estación, un trayecto, una línea y una parada de cada red de bus.

## Problemas conocidos

| Problema | Estado |
|---|---|
| El naranja de Metro sobre fondo oscuro queda justo en el límite de contraste en textos pequeños. Se usa `--accent-text` (más claro en oscuro) para texto, pero quedan casos por revisar. | Pendiente |
| El mapa de Leaflet no es navegable por teclado de forma útil (los marcadores no reciben foco con nombre). Mitigado: la misma información está en listas. | Conocido |
| La interfaz solo está en castellano; faltan euskera e inglés. | Pendiente (`PLAN.md`, Transversal) |
| Algunas páginas heredadas (Renfe, `/metro/station/{id}?agency=bizkaibus`) no siguen aún el sistema de diseño. | Pendiente de migrar |

## Datos de accesibilidad del transporte

La app muestra la información de accesibilidad que publican los operadores, sin inventarla:

- **Metro:** salidas con ascensor, accesibles o nocturnas, y el texto de accesibilidad de cada estación (catálogo oficial). Los avisos de ascensores fuera de servicio se muestran en el trayecto si afectan al origen o al destino.
- **Bilbobus:** `wheelchair_boarding` del GTFS (hoy todas las paradas lo declaran accesible).
- **Euskotren:** `wheelchair_boarding` de cada estación.
- **Bizkaibus:** el campo `Accesibilidad` de la API TQ cuando viene informado.
