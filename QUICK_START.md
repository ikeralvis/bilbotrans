# 🎯 Guía Rápida - BilboTrans

## Lo que se ha mejorado ✅

Tu app ahora tiene:

### 1. **Paradas Favoritas** 💖
- Marca paradas como favoritas y aparecen en la home
- Se guardan automáticamente en localStorage
- Muestra distancia si tienes ubicación habilitada

### 2. **Paradas Cercanas** 📍
- Tab para ver paradas cerca de ti
- Detección automática de ubicación
- Ordenadas por distancia

### 3. **Diseño Minimalista (Estilo Apple)**
- Limpio, blanco, sin ruido visual
- Interacciones suaves y naturales
- Colores: Naranja (Metro), Rojo (Bilbobus)

### 4. **PWA Lista**
- Instala en home screen
- Funciona offline
- Service worker para caché inteligente

### 5. **Búsqueda Mejorada**
- Busca paradas por nombre
- Muestra agencia (Metro/Bilbobus)
- Dropdown con mejor UX

---

## ⚡ Lo Siguiente (Prioridad Alta)

### 1. **Conectar APIs Reales** (1-2 días)
Los endpoints ya existen en tu código. Solo hay que usarlos:

```typescript
// En src/lib/metro.ts - ya está implementado
import { getMetroArrivals } from '@/lib/metro';

// En src/lib/bilbobus.ts - ya está implementado
import { getBilbobusRealtime } from '@/lib/bilbobus';
```

**Qué hacer**:
1. Editar `station/[id]/page.tsx` línea ~55 (`loadMockSchedules`)
2. Cambiar datos mock por llamadas reales a `getMetroArrivals()` y `getBilbobusRealtime()`
3. Parsear respuestas y mapear a formato `Schedule[]`

### 2. **Mejorar Búsqueda de Paradas Cercanas** (1 día)
Ahora usa `BETWEEN` en lat/lon. Cambiar a PostGIS:

```typescript
// En src/app/actions.ts - getNearbyStops()
// Reemplazar el BETWEEN simple con una query de distancia PostGIS
// Referencia: https://www.postgresql.org/docs/current/functions-geometry.html
```

### 3. **Testing** (1-2 días)
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

Crear tests para:
- Contextos (FavoritesContext, GeolocationContext)
- Componentes principales
- Flujo de favoritos

---

## 🎨 Personalizaciones Fáciles

### Cambiar colores
**Archivo**: `src/app/globals.css` o editar en componentes

```jsx
// Metro = naranja
bg-orange-500, text-orange-600

// Bilbobus = rojo
bg-red-600, text-red-700
```

### Cambiar tipografía
**Archivo**: `src/app/layout.tsx`
```tsx
// Ya está usando Geist Sans (limpio y moderno)
// Para cambiar: importar otra font de Google Fonts
```

### Agregar tema oscuro
1. Instalar `next-themes`
2. Envolver app en `ThemeProvider`
3. Usar `dark:` classes en Tailwind

---

## 🔌 Estructura del Código

```
src/
├── app/
│   ├── page.tsx              ← Home (favoritos + cercanas)
│   ├── station/[id]/page.tsx ← Detalle parada
│   ├── actions.ts            ← Server actions (search, caché)
│   ├── layout.tsx            ← Providers
│   └── globals.css           ← Estilos globales
├── components/
│   ├── FavoriteStopCard.tsx  ← Tarjeta favorito
│   ├── NearbyStops.tsx       ← Lista cercanas
│   ├── StopSearch.tsx        ← Búsqueda
│   ├── TransportCard.tsx     ← Tarjeta transporte
│   ├── PWAClient.tsx         ← SW registration
│   └── ...
├── context/
│   ├── FavoritesContext.tsx  ← Gestión favoritos
│   └── GeolocationContext.tsx ← Gestión ubicación
├── hooks/
│   └── usePWA.ts             ← Hook PWA
└── lib/
    ├── metro.ts              ← API Metro (ya existe)
    ├── bilbobus.ts           ← API Bilbobus (ya existe)
    └── db.ts                 ← BD connection
```

---

## 🚀 Checklist Rápido

- [ ] Conectar APIs reales (getMetroArrivals, getBilbobusRealtime)
- [ ] Mejorar getNearbyStops con PostGIS
- [ ] Agregar tests unitarios básicos
- [ ] Implementar tema oscuro
- [ ] Agregar soporte multiidioma
- [ ] Crear landing page con instrucciones
- [ ] Configurar deploy en Vercel

---

## 💡 Tips

1. **Para debug rápido**: Usa React DevTools extension
2. **Para performance**: Revisa Network tab en DevTools
3. **Para mobile**: Test con Chrome DevTools modo mobile
4. **Para PWA**: Usa Lighthouse (DevTools > Lighthouse)
5. **Para componentes**: Storybook es optional pero útil

---

## 📚 Recursos Útiles

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hooks](https://react.dev/reference/react/hooks)
- [PWA Docs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [GTFS-RT](https://developers.google.com/transit/gtfs-realtime)

---

¡Tu app está en buen camino! 🎉 Lo más importante ahora es conectar los datos reales y ver todo funcionando con información viva.
