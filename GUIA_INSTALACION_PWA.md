# 📱 Guía de Instalación PWA - Troubleshooting

## Problema: No aparece el banner de instalación

Si no ves el banner para instalar la app en tu celular, sigue estos pasos:

### ✅ Verificaciones Básicas

1. **HTTPS**: Asegúrate de estar usando HTTPS (no HTTP)
   - ✅ `https://calendar-school-production.up.railway.app`
   - ❌ `http://calendar-school-production.up.railway.app`

2. **Navegador compatible**:
   - Android: Chrome o Edge
   - iOS: Safari (no Chrome en iOS)

3. **Acceso al manifest**:
   - Abre: `https://calendar-school-production.up.railway.app/manifest.json`
   - Debe mostrar el JSON del manifest

### 🔧 Soluciones por Plataforma

#### Android (Chrome/Edge)

**Opción 1: Menú del navegador**
1. Abre la app en Chrome/Edge
2. Toca el menú (⋮) en la esquina superior derecha
3. Busca "Agregar a la pantalla de inicio" o "Instalar app"
4. Toca la opción

**Opción 2: Verificar criterios de instalación**
1. Abre Chrome DevTools (desde PC, conectado al celular)
2. Ve a Application → Manifest
3. Verifica que no haya errores
4. Ve a Application → Service Workers
5. Verifica que el service worker esté registrado

**Opción 3: Forzar instalación**
1. Abre Chrome
2. Ve a `chrome://flags`
3. Busca "PWA"
4. Asegúrate de que esté habilitado

#### iOS (Safari)

**Siempre funciona desde el menú de compartir:**
1. Abre la app en Safari (no en Chrome)
2. Toca el botón de compartir (□↑)
3. Desplázate hacia abajo
4. Selecciona "Agregar a pantalla de inicio"
5. Personaliza el nombre si quieres
6. Toca "Agregar"

### 🐛 Problemas Comunes

#### El manifest.json no es accesible

**Síntoma**: Error 404 al acceder a `/manifest.json`

**Solución**:
- Verifica que el archivo existe en `public/manifest.json`
- Asegúrate de que Next.js esté sirviendo archivos estáticos
- Verifica la configuración de Railway

#### El Service Worker no se registra

**Síntoma**: No aparece en DevTools → Application → Service Workers

**Solución**:
1. Abre la consola del navegador (F12)
2. Busca errores relacionados con el service worker
3. Verifica que `/sw.js` sea accesible
4. Asegúrate de estar en HTTPS

#### Los iconos no cargan

**Síntoma**: El manifest muestra errores en los iconos

**Solución**:
- Verifica que los iconos existan en `public/icon-192x192.png` y `public/icon-512x512.png`
- Asegúrate de que sean imágenes PNG válidas
- Verifica que sean accesibles desde la URL

### 🔍 Verificación Técnica

**Desde el celular (Chrome DevTools remoto)**:

1. Conecta tu celular a la PC
2. En Chrome (PC), ve a `chrome://inspect`
3. Selecciona tu dispositivo
4. Inspecciona la página
5. Ve a Application → Manifest
6. Verifica:
   - ✅ Manifest válido
   - ✅ Iconos cargados
   - ✅ Service Worker registrado
   - ✅ HTTPS activo

**Desde el navegador del celular**:

1. Abre la consola (si es posible)
2. Ejecuta:
```javascript
// Verificar manifest
fetch('/manifest.json').then(r => r.json()).then(console.log)

// Verificar service worker
navigator.serviceWorker.getRegistration().then(console.log)
```

### 📋 Checklist de Instalación

- [ ] Estás usando HTTPS
- [ ] Navegador compatible (Chrome/Edge en Android, Safari en iOS)
- [ ] `/manifest.json` es accesible
- [ ] `/sw.js` es accesible
- [ ] Los iconos existen y son accesibles
- [ ] Service Worker está registrado
- [ ] No hay errores en la consola
- [ ] Has intentado desde el menú del navegador

### 🚀 Solución Rápida

**Si nada funciona, intenta esto:**

1. **Limpia el cache del navegador**
2. **Cierra completamente el navegador**
3. **Abre de nuevo y ve a la URL**
4. **Espera unos segundos** (el banner puede tardar)
5. **Si no aparece, usa el menú del navegador**

### 📞 Verificación Final

**Para verificar que todo está bien configurado:**

1. Abre: `https://calendar-school-production.up.railway.app/manifest.json`
   - Debe mostrar el JSON sin errores

2. Abre: `https://calendar-school-production.up.railway.app/sw.js`
   - Debe mostrar el código del service worker

3. Abre: `https://calendar-school-production.up.railway.app/icon-192x192.png`
   - Debe mostrar la imagen

Si todos estos recursos son accesibles, la PWA debería funcionar. El banner puede tardar en aparecer o puede requerir que uses el menú del navegador.

