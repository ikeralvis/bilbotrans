# Widget de Metro para Android

Proyecto Android mínimo (Kotlin, sin Compose ni Material) con un widget de pantalla de inicio: **origen → destino** y los próximos 4 trenes en tiempo real.

## Cómo funciona
- **Datos**: el widget llama directamente a `https://api.metrobilbao.eus/metro/real-time/{origen}/{destino}` (API pública). No pasa por Vercel, así que no gasta peticiones de la web.
- **Minutos que bajan solos**: cada tren se guarda con su hora absoluta y se pinta con un `Chronometer` en cuenta atrás, que corre en el launcher sin pedir nada.
- **Cuándo se actualiza**: cada 15 min (el mínimo de Android, con `WorkManager`, solo con red), al añadir el widget y al pulsar ↻ (máximo una vez cada 20 s). Un mismo trayecto en varios widgets se pide una sola vez.
- **Tocar el widget** abre el trayecto en la web/PWA.
- Estaciones: `app/src/main/assets/stations.json` (copia del catálogo de la web).

## Compilar (sin Android Studio)
GitHub Actions: workflow **Android widget APK** → *Run workflow* → descarga `BilboTrans-widget-apk` de *Artifacts*. Con una etiqueta `android-v0.1.0` además se crea una Release con el APK.

## Instalar
Pasa el APK al móvil, ábrelo y permite «Instalar apps desconocidas» para esa app. Play Protect puede avisar de «app no verificada»: *Instalar de todos modos*. Mantén pulsada la pantalla de inicio → Widgets → BilboTrans.

## Firma
La clave de firma **no está en el repo**. Sin hacer nada, cada compilación genera una clave temporal: el APK se instala bien, pero para instalar uno nuevo hay que desinstalar el anterior. Para poder actualizar encima, crea una clave una vez y guárdala como secretos del repositorio (Settings → Secrets and variables → Actions):

```bash
keytool -genkeypair -keystore bilbotrans.keystore -alias bilbotrans -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 bilbotrans.keystore
```

Secretos: `ANDROID_KEYSTORE_B64` (el base64), `ANDROID_KEYSTORE_PASSWORD` (la misma contraseña para almacén y clave) y `ANDROID_KEY_ALIAS` (`bilbotrans`). Guarda el `.keystore` fuera del repo.
