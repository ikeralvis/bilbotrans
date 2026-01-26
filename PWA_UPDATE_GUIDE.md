# Guía de Actualización de PWA - BilboTrans

## ¿Cómo funciona ahora?

El sistema ahora detecta automáticamente cuando hay una nueva versión de la app y muestra un banner pidiendo que actualices:

```
┌─────────────────────────────────────┐
│ Nueva versión disponible            │
│ Toca "Actualizar" para instalar     │
│          [ACTUALIZAR] [X]           │
└─────────────────────────────────────┘
```

## ¿Qué hago cuando desplegue cambios?

### 1. Incrementa la versión del Service Worker

Edita `/public/sw.js` y cambia `SW_VERSION`:

```javascript
const SW_VERSION = '2';  // Cambia el número (1 → 2 → 3, etc)
const CACHE_NAME = `bilbotrans-v${SW_VERSION}`;
```

**Cada vez que hagas cambios importantes, incrementa el número.**

### 2. Haz deploy normal

```bash
pnpm build
# Deploy a vercel o tu servidor
```

### 3. En tu móvil/navegador

- Los usuarioS verán el banner "Nueva versión disponible"
- Tocan "Actualizar"
- La app se recarga automáticamente con los cambios
- Los caches viejos se limpian automáticamente

## Cómo funciona técnicamente

1. **Detección de cambios**: El navegador chequea el SW cada 30 segundos
2. **Notificación**: Cuando detecta una nueva versión, muestra el toast azul
3. **Actualización**: Al tocar "Actualizar":
   - Se avisa al nuevo service worker que tome el control
   - Se limpian los caches viejos
   - Se recarga la página
4. **Fallback**: Si el usuario cierra el toast, se actualiza en la próxima visita

## Casos especiales

### Si el usuario no toca "Actualizar"
- No pasa nada
- Seguirá usando la versión anterior hasta cerrar y rearir la app
- La próxima vez que visite, volverá a ver el banner

### Si haces muchos cambios seguidos
- Solo incrementa SW_VERSION una vez cuando hagas deploy final
- Los usuarios recibirán solo una notificación con todos los cambios

### Para testear localmente
```bash
# En desarrollo, el SW no se actualiza automáticamente
# Para forzar un reload completo:
# 1. DevTools → Application → Service Workers
# 2. Toca "Unregister"
# 3. Recarga la página (Ctrl+Shift+R)
```

## Changelog del sistema

- **v2**: Implementado sistema automático de actualización con notificaciones
- **v1**: Service worker inicial con caching básico
