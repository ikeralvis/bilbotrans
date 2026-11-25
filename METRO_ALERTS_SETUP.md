# Sistema de Alertas de Metro Bilbao

Este documento explica cómo configurar y usar el sistema de notificaciones push para alertas de Metro Bilbao.

## 📋 Descripción

El sistema permite a los usuarios recibir notificaciones push cuando hay avisos importantes en el Metro de Bilbao, incluso cuando la app no está abierta.

### Características
- ✅ Notificaciones push con OneSignal
- ✅ Funciona sin la app abierta (Service Worker)
- ✅ Alertas solo para avisos importantes de servicio
- ✅ Los usuarios pueden activar/desactivar las alertas
- ✅ Multiidioma (ES/EU)

## 🔧 Configuración

### 1. Crear cuenta en OneSignal

1. Ve a [https://onesignal.com](https://onesignal.com) y crea una cuenta
2. Crea una nueva app de tipo "Web Push"
3. Sigue el wizard de configuración:
   - **Site Name**: BilboTrans
   - **Site URL**: Tu dominio (ej: `https://bilbotrans.vercel.app`)
   - **Default Notification Icon**: Sube el logo de la app

### 2. Configurar variables de entorno

#### Para desarrollo (archivo `.env.local`):

```env
# OneSignal Configuration
NEXT_PUBLIC_ONESIGNAL_APP_ID=tu-app-id-aqui
ONESIGNAL_REST_API_KEY=tu-rest-api-key-aqui

# Cron Job Security (genera uno aleatorio)
CRON_SECRET_TOKEN=tu-token-secreto-aleatorio

# Base URL para desarrollo
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

#### Para producción (Vercel):

En tu dashboard de Vercel → Settings → Environment Variables:

```env
NEXT_PUBLIC_ONESIGNAL_APP_ID=tu-app-id-aqui
ONESIGNAL_REST_API_KEY=tu-rest-api-key-aqui
CRON_SECRET_TOKEN=el-mismo-token-que-en-github
NEXT_PUBLIC_BASE_URL=https://tu-app.vercel.app
```

**Dónde obtener las credenciales de OneSignal:**
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`: Settings → Keys & IDs → "OneSignal App ID"
- `ONESIGNAL_REST_API_KEY`: Settings → Keys & IDs → "REST API Key"

**Cómo generar CRON_SECRET_TOKEN:**

Elige uno de estos métodos:

```bash
# Método 1: Node.js (si tienes instalado)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Método 2: PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Método 3: Online (fácil)
# Ve a https://generate-secret.vercel.app/32 
# O usa cualquier generador de strings aleatorios
```

**Ejemplo de output:**
```
a7K9mP3nQ8rT4vW6xY2zA5bC7dE9fG1hI3jK5lM7nP9q
```

Copia ese string y úsalo como tu `CRON_SECRET_TOKEN`.

### 3. Configurar GitHub Actions (GRATIS)

Usaremos GitHub Actions en lugar de Vercel Cron Jobs (que requiere plan Pro).

Si no tienes Vercel Pro, puedes usar GitHub Actions:

Crea `.github/workflows/check-metro-alerts.yml`:

```yaml
name: Check Metro Alerts

on:
  schedule:
    # Cada 15 minutos
    - cron: '*/15 * * * *'
  workflow_dispatch: # Permite ejecución manual

jobs:
  check-alerts:
    runs-on: ubuntu-latest
    
    steps:
      - name: Call check-alerts API
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}" \
            https://tu-app.vercel.app/api/metro/check-alerts
```

Luego agrega el secret en GitHub:
- Repo → Settings → Secrets and variables → Actions
- New repository secret: `CRON_SECRET_TOKEN`

## 🎯 Uso

### Para usuarios
El archivo `.github/workflows/check-metro-alerts.yml` ya está creado y configurado para ejecutarse:
- **Días**: Lunes a Viernes
- **Horario**: 7:00 AM - 9:00 AM (hora de España)
- **Frecuencia**: Cada 10 minutos

**IMPORTANTE sobre la hora UTC:**
- España en invierno (UTC+1): 7-9 AM = 6-8 AM UTC
- España en verano (UTC+2): 7-9 AM = 5-7 AM UTC
- El workflow está configurado para `6-7 * * * 1-5` (ajusta si es necesario)

#### Configurar el Secret en GitHub:

1. **Ve a tu repositorio en GitHub**

2. **Settings** → **Secrets and variables** → **Actions**

3. Click en **"New repository secret"**

4. Completa los campos:
   - **Name**: `CRON_SECRET_TOKEN`
   - **Secret**: Pega el token que generaste antes (el string aleatorio)
   
   Ejemplo de lo que pegarías:
   ```
   a7K9mP3nQ8rT4vW6xY2zA5bC7dE9fG1hI3jK5lM7nP9q
   ```

5. Click en **"Add secret"**

**Importante**: Este token debe ser **exactamente el mismo** que pusiste en Vercel como `CRON_SECRET_TOKEN`.
  -H "Authorization: Bearer tu-token-secreto" \
  http://localhost:3000/api/metro/check-alerts
```

### Estructura de archivos

```
src/
├── lib/onesignal/
│   └── config.ts                    # Configuración de OneSignal
├── hooks/
│   └── useOneSignal.ts              # Hook para manejar suscripciones
├── components/
│   └── MetroAlertsConfig.tsx        # UI de configuración de alertas
└── app/
    ├── api/metro/check-alerts/
    │   └── route.ts                 # Endpoint para verificar y enviar alertas
    └── metro-map/
        └── page.tsx                 # Integración del botón de alertas

public/
├── sw.js                            # Service Worker con soporte para push
└── OneSignalSDKWorker.js            # Worker de OneSignal
```

## 🚀 Flujo de funcionamiento

1. **Usuario se suscribe**:
   - Click en "Activar alertas" → solicita permisos → OneSignal registra el dispositivo
   - Se agrega un tag `metro_alerts=eL-V 7-9 AM cada 10 min):
   - GitHub Action llama a `/api/metro/check-alerts`
   - Endpoint obtiene incidencias actuales del Metro
   - **Filtra solo avisos críticos**: `isInIssuesBar: true` y `type: 'service_issue'`
   - Excluye cosas menores como ascensores rotos (`installation_issue`)
   - Si hay incidencias importantes, envía notificaciones

3. **Usuario recibe notificación**:
   - OneSignal envía push notification
   - Service Worker muestra la notificación
   - Click en notificación → abre la app en `/metro-map`

### Tipos de avisos que notifican:

✅ **SÍ notifica**:
- Retrasos generalizados
- Interrupciones de servicio
- Incidencias de líneas completas
- Avisos críticos marcados con `isInIssuesBar: true`

❌ **NO notifica**:
- Ascensores rotos
- Escaleras mecánicas en mantenimiento
- Avisos de instalaciones (`installation_issue`)
- Avisos menores no críticos
   - Service Worker muestra la notificación
   - Click en notificación → abre la app en `/metro-map`

## 📊 Monitoreo

Puedes ver estadísticas en el dashboard de OneSignal:
- Usuarios suscritos
- Notificaciones enviadas
- Tasa de apertura (click-through rate)
- Dispositivos activos

## ⚠️ Notas importantes

1. **Limitaciones de OneSignal Free Tier**:
   - 10,000 web push subscribers
   - Unlimited notifications
   - Básico suficiente para empezar

2. **Service Worker**:
   - El Service Worker (`sw.js`) debe estar en la raíz de `public/`
   - Incrementa `SW_VERSION` cuando hagas cambios importantes

3. **Testing en localhost**:
   - OneSignal funciona en localhost gracias a `allowLocalhostAsSecureOrigin: true`
   - Las notificaciones reales solo funcionan con HTTPS en producción

4. **Privacidad**:
   - Los usuarios deben (GitHub Actions)

1. Verifica que el workflow esté habilitado:
   - Repo → Actions → Check Metro Alerts → debe estar "enabled"
   
2. Verifica que el secret esté configurado:
   - Settings → Secrets → Actions → debe existir `CRON_SECRET_TOKEN`
   Resumen de configuración

### Checklist de setup:

- [ ] Crear cuenta en OneSignal y obtener App ID y API Key
- [ ] Generar `CRON_SECRET_TOKEN` aleatorio
- [ ] Configurar variables en `.env.local` (desarrollo)
- [ ] Configurar variables en Vercel (producción)
- [ ] Configurar secret `CRON_SECRET_TOKEN` en GitHub
- [ ] Hacer push del código
- [ ] Probar manualmente el workflow en GitHub Actions
- [ ] Activar alertas desde la app y verificar

### TODO / Mejoras futuras

- [ ] Implementar sistema de tracking de incidencias ya notificadas (evitar duplicados)
- [ ] Agregar filtros por línea específica de metro
- [ ] Permitir personalizar horarios de notificación por usuario
   - Repo → Actions → Check Metro Alerts → "Run workflow"

5. Revisa los logs:
   - Actions → Click en la última ejecución → Ver errores
## 🐛 Troubleshooting

### Las notificaciones no llegan

1. Verifica que las variables de entorno estén configuradas
2. Revisa que el cron job esté ejecutándose (logs en Vercel o GitHub Actions)
3. Verifica en OneSignal dashboard que hay usuarios suscritos
4. Chequea la consola del navegador por errores

### Error "OneSignal no está configurado"

- Asegúrate de que `NEXT_PUBLIC_ONESIGNAL_APP_ID` esté definido
- Recarga la página después de agregar variables de entorno

### Cron job no ejecuta

- Vercel: Necesitas plan Pro, o usa GitHub Actions
- GitHub Actions: Verifica que el workflow esté enabled y el secret configurado

## 📝 TODO / Mejoras futuras

- [ ] Implementar sistema de tracking de incidencias ya notificadas (evitar duplicados)
- [ ] Agregar filtros por línea específica de metro
- [ ] Agregar configuración de horarios (ej: solo notificar de 7am a 10pm)
- [ ] Soporte para notificaciones de otros transportes (Bilbobus, Bizkaibus)
- [ ] Analytics de engagement con las notificaciones

## 📚 Referencias

- [OneSignal Web Push Docs](https://documentation.onesignal.com/docs/web-push-quickstart)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
