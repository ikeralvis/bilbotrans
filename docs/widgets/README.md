# Widgets sin tienda

Una web app no puede crear widgets de pantalla de inicio. Mientras no haya app nativa, estas dos vías leen la API pública de BilboTrans:

```
GET https://bilbotrans.vercel.app/api/metro/widget?stations=ABA,PLE   (máx. 6 estaciones)
→ { updatedAt, stations: [{ code, name, next: [{ side, sideLabel, line, destination, minutes }] }] }
```

Una petición para todas las estaciones, con caché de 10 s en el servidor. `next` trae el primer tren de cada sentido.

## iPhone — Scriptable (widget visual)
1. Instala **Scriptable** (gratis, App Store).
2. Crea un script nuevo y pega `docs/widgets/bilbotrans-scriptable.js`; edita `STATIONS`.
3. Pantalla de inicio → mantener pulsado → `+` → Scriptable → elige tamaño → editar widget → Script = este.

iOS decide cuándo refrescar el widget (normalmente cada 5–15 min); no se puede forzar. Al tocarlo se abre Scriptable.

## iPhone — API Widget (sin código)
[API Widget](https://apiwidget.com) es una app **solo de iOS** que pinta en un widget un JSON con filas `{key, value, color}` (máx. 12 filas, 24 caracteres por campo). Tiene su propio formato, así que usa este endpoint (sin query string, porque la clave de la app usa `::` como separador):

```
GET https://bilbotrans.vercel.app/api/metro/widget/apiwidget/ABA-PLE
→ [{"key":"ABANDO","color":"main"},{"key":"L1 Etxebarri","value":"1 min","color":"warning"}, ...]
```

Hasta 3 estaciones (cabecera + 1 fila por sentido + separador). Colores: ≤1 min `warning`, ≤3 min `success`.
1. En la app pega la clave: `v1::w12::dark::json::https://bilbotrans.vercel.app/api/metro/widget/apiwidget/ABA-PLE` (temas: `dark`, `light`, `terminal`) y guarda.
2. Pantalla de inicio → `+` → API Widget → tamaño Small → elige la configuración.

Es el widget más rápido de montar, pero menos personalizable que Scriptable. iOS decide el refresco (~15 min).

## iPhone — Atajos (texto o diálogo)
1. Atajos → nuevo atajo: **Obtener contenido de URL** `https://bilbotrans.vercel.app/api/metro/widget?stations=ABA` → **Obtener valor del diccionario** (`stations`) → **Repetir con cada** … **Texto**: `[nombre] [destino] [minutos] min` → **Mostrar resultado** / **Leer en voz alta**.
2. Añádelo como icono a la pantalla de inicio o a Siri ("Oye Siri, metro Abando").

## Android
**API Widget no existe en Android.** Para Android hacen falta KWGT, Tasker u otra app que lea JSON con rutas (usa `/api/metro/widget?stations=ABA`).

- **Accesos directos de la app:** al instalar la PWA desde Chrome, mantener pulsado el icono muestra *Favoritos* y *Mapa* (definidos en `public/manifest.json`; son fijos, el manifest no admite accesos dinámicos).
- **Widget:** con Tasker/KWGT (HTTP request + JSON a `/api/metro/widget`) se puede montar uno propio. Un widget nativo real requiere app (Capacitor + Glance).

## Siguiente paso: widgets nativos
Capacitor envolviendo esta web + WidgetKit (iOS) y Glance (Android) que usan el mismo endpoint. Requiere cuenta de Apple (99 $/año) y Google Play (25 $ una vez).
