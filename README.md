# 🚌 BilboTrans - Horarios Metro & Bilbobus

Una aplicación moderna, minimalista y rápida para consultar **horarios en tiempo real** de:
- 🟠 **Metro Bilbao** (L1, L2)
- 🔴 **Bilbobus**

## ✨ Características

- ✅ **Datos en tiempo real** desde GTFS-RT
- ✅ **Sin duplicados** - Una parada = Un resultado
- ✅ **Paradas favoritas** con almacenamiento local
- ✅ **Paradas cercanas** con geolocalización
- ✅ **Mapa interactivo** (Leaflet)
- ✅ **PWA** - Instala en home screen
- ✅ **Diseño minimalista** estilo Apple
- ✅ **Rápido** - Caché inteligente

## 🚀 Quick Start

### Windows
```bash
setup-and-run.bat
```

### macOS / Linux
```bash
bash setup-and-run.sh
```

### Manual
```bash
npm install leaflet react-leaflet @types/leaflet
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📱 Cómo usar

1. **Busca una parada** - Escribe el nombre (ej: "Abando")
2. **Selecciona resultado** - Sin duplicados, una sola entrada
3. **Ves los horarios REALES** - Divididos por andén (Metro)
4. **Marca como favorita** ❤️ - Aparece en la home
5. **Mira en el mapa** 🗺️ - Ubicación exacta

## 📊 Cambios Recientes

### ✅ Datos REALES (Enero 2026)
- Integración con GTFS-RT del Metro Bilbao
- Horarios en tiempo real, no mock data
- Destinos correctos (Plentzia, Basauri, Kabiezes, Etxebarri)
- Separación correcta de andenes (1 y 2)

### ✅ Sin Duplicados
- Búsqueda sin repetir paradas
- Deduplicación automática

### ✨ Nuevo: Mapa
- Visualiza todas las paradas
- Haz click para ver horarios
- Tu ubicación en tiempo real

## 📚 Documentación

- **[CHANGELOG.md](./CHANGELOG.md)** - Qué cambió
- **[REAL_DATA_GUIDE.md](./REAL_DATA_GUIDE.md)** - Cómo funciona ahora
- **[IMPROVEMENTS.md](./IMPROVEMENTS.md)** - Roadmap completo
- **[QUICK_START.md](./QUICK_START.md)** - Guía rápida

## 🛠️ Tecnología

- **Next.js 16** - Framework React moderno
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilos minimalistas
- **Leaflet** - Mapas interactivos
- **GTFS-RT** - Datos en tiempo real
- **PWA** - Funciona offline

## 📍 Paradas Disponibles

### Línea 1 (L1)
- Plentzia ↔ Etxebarri

### Línea 2 (L2)
- Kabiezes ↔ Basauri

[Ver mapa completo en la app]

## 🐛 Problemas Conocidos

- **Bilbobus**: Todavía usa mock data (en desarrollo)
- **Mapeo incompleto**: Hay paradas que faltan nombres (se van descubriendo)

## 🚧 En desarrollo

- [ ] API real de Bilbobus
- [ ] Mapa en la página principal
- [ ] Tema oscuro
- [ ] Multiidioma
- [ ] Versión nativa (iOS/Android)

## 🔗 URLs Útiles

- [Metro Bilbao GTFS-RT](https://ctb-gtfs-rt.s3.eu-south-2.amazonaws.com/metro-bilbao-trip-updates.pb)
- [OpenStreetMap](https://www.openstreetmap.org/)

## Licencia y Atribuciones

* **Código fuente:** Distribuido bajo la licencia [GNU AGPLv3](LICENSE). Si utilizas o modificas este código, debes mantener la atribución al autor original y liberar el código resultante bajo la misma licencia.
* **Diseño, interfaz y recursos gráficos:** © 2026 Iker Alvis. Todos los derechos reservados. No está permitida la copia o replicación de la identidad visual sin autorización expresa.
* **Datos de transporte:** Los datos en tiempo real y horarios provienen de Open Data Euskadi, Consorcio de Transportes de Bizkaia (Bizkaibus), Bilbobus y Metro Bilbao bajo licencia CC BY 4.0.

---

**Última actualización**: Enero 2026

🎉 ¡Ahora con datos REALES!

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
