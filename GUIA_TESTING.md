# 🧪 Guía de Testing y Verificación

Esta guía te ayudará a verificar que todas las mejoras implementadas funcionan correctamente.

## 🔐 1. Verificar Seguridad

### Headers de Seguridad

**En el navegador (Chrome DevTools)**:

1. Abre la aplicación en el navegador
2. Abre DevTools (F12)
3. Ve a la pestaña **Network**
4. Recarga la página (F5)
5. Selecciona cualquier request (ej: el documento principal)
6. Ve a la pestaña **Headers**
7. Busca en **Response Headers**:

```
✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: DENY
✅ X-XSS-Protection: 1; mode=block
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Content-Security-Policy: ...
```

**O usando curl**:
```bash
curl -I http://localhost:7000
```

### Validación con Zod

**Probar validación de creación de clase**:

1. Abre la aplicación y loguéate como profesor
2. Ve a crear una nueva clase
3. Intenta enviar el formulario **sin completar campos requeridos**
4. Deberías ver mensajes de error específicos

**Probar con datos inválidos**:
- Hora de fin anterior a hora de inicio → Debe mostrar error
- Día de semana fuera de rango (ej: 10) → Debe rechazar
- Email inválido en registro → Debe mostrar error de formato

**En la consola del navegador (DevTools)**:
- Abre la pestaña **Console**
- Intenta crear una clase con datos inválidos
- Deberías ver errores de validación en la respuesta de la API

### Rate Limiting

**Probar rate limiting** (básico):

```bash
# Hacer múltiples requests rápidos
for i in {1..15}; do
  curl -X POST http://localhost:7000/api/clases \
    -H "Content-Type: application/json" \
    -d '{"test":"data"}' &
done
```

Nota: El rate limiting actual es básico. En producción se recomienda Redis.

## ⚡ 2. Verificar Optimizaciones

### Índices de Base de Datos

**Verificar que los índices existen**:

```bash
# Conectarse a PostgreSQL
psql $DATABASE_URL

# O si usas Docker:
docker exec -it almanaque-postgres psql -U almanaque -d almanaque
```

Luego ejecuta:

```sql
-- Ver índices en la tabla Clase
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'clase';

-- Deberías ver:
-- idx_Clase_escuelaId_activa
-- idx_Clase_diaSemana_activa
-- idx_Clase_profesorId

-- Ver índices en la tabla User
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'User';

-- Deberías ver:
-- idx_User_escuelaId_role
-- idx_User_email (ya existía por @unique)
```

**Si los índices no existen**, ejecuta:

```bash
npx prisma db push
```

### Rendimiento de Queries

**Antes de aplicar índices** (opcional, para comparar):

```sql
-- Activar timing en PostgreSQL
\timing

-- Query sin índice (lento)
EXPLAIN ANALYZE 
SELECT * FROM "Clase" 
WHERE "escuelaId" = 'tu-escuela-id' AND "activa" = true;
```

**Después de aplicar índices**:

```sql
-- Query con índice (rápido)
EXPLAIN ANALYZE 
SELECT * FROM "Clase" 
WHERE "escuelaId" = 'tu-escuela-id' AND "activa" = true;

-- Deberías ver "Index Scan" en lugar de "Seq Scan"
```

### Next.js Optimizaciones

**Verificar compresión**:

```bash
curl -H "Accept-Encoding: gzip" -I http://localhost:7000
```

Deberías ver:
```
Content-Encoding: gzip
```

**Verificar que no aparece el header "X-Powered-By"**:

```bash
curl -I http://localhost:7000
```

No debería aparecer `X-Powered-By: Next.js`

## 📱 3. Verificar PWA

### Manifest.json

**Verificar que el manifest es accesible**:

1. Abre en el navegador: `http://localhost:7000/manifest.json`
2. Deberías ver el JSON del manifest

**O con curl**:
```bash
curl http://localhost:7000/manifest.json
```

### Service Worker

**Verificar registro del Service Worker**:

1. Abre la aplicación en el navegador
2. Abre DevTools (F12)
3. Ve a la pestaña **Application** (o **Aplicación**)
4. En el menú lateral, busca **Service Workers**
5. Deberías ver el service worker registrado:
   - Estado: **activated and is running**
   - URL: `/sw.js`

**Verificar cache**:

1. En DevTools → **Application** → **Cache Storage**
2. Deberías ver `almanaque-v1` con recursos cacheados

**Nota**: El Service Worker solo se registra en **producción** (`NODE_ENV=production`)

Para probarlo en desarrollo, cambia temporalmente en `app/sw-register.tsx`:

```typescript
// Cambiar esta línea:
process.env.NODE_ENV === 'production'
// Por:
true
```

### Instalación PWA

**En Android (Chrome)**:

1. Abre la app en Chrome
2. Deberías ver un banner: "Agregar Almanaque a la pantalla de inicio"
3. Toca "Agregar"
4. La app aparece como ícono en la pantalla de inicio
5. Al abrirla, funciona en modo standalone (sin barra del navegador)

**En iOS (Safari)**:

1. Abre la app en Safari
2. Toca el botón de compartir (□↑)
3. Selecciona "Agregar a pantalla de inicio"
4. La app aparece como ícono

**Verificar modo standalone**:

1. Abre la app instalada
2. No debería verse la barra de direcciones del navegador
3. Debería verse como una app nativa

### Lighthouse PWA Score

**Usar Lighthouse para verificar PWA**:

1. Abre DevTools (F12)
2. Ve a la pestaña **Lighthouse**
3. Selecciona **Progressive Web App**
4. Click en **Generate report**
5. Deberías obtener un score alto (80+)

## 🧪 4. Testing Manual Completo

### Flujo Completo de Usuario

1. **Registro**:
   - [ ] Crear cuenta nueva
   - [ ] Validar que requiere email válido
   - [ ] Validar que requiere contraseña fuerte (8+ chars, mayúsculas, números)
   - [ ] Verificar que no permite emails duplicados

2. **Login**:
   - [ ] Login con credenciales correctas
   - [ ] Intentar login con credenciales incorrectas → Debe rechazar

3. **Crear Clase** (como profesor):
   - [ ] Crear clase con datos válidos → Debe funcionar
   - [ ] Intentar crear sin título → Debe mostrar error
   - [ ] Intentar con hora fin < hora inicio → Debe mostrar error
   - [ ] Verificar que el estilo se usa como título si está vacío

4. **Ver Calendario**:
   - [ ] Ver clases del calendario
   - [ ] Aplicar filtros
   - [ ] Verificar que solo se muestran clases de tu escuela

5. **PWA**:
   - [ ] Instalar la app
   - [ ] Abrir en modo standalone
   - [ ] Verificar que funciona offline (básico)

## 🔍 5. Verificar en Producción

### Headers de Seguridad en Producción

```bash
# Reemplaza con tu URL de producción
curl -I https://tu-app.com
```

Verifica todos los headers de seguridad.

### Service Worker en Producción

1. Abre la app en producción
2. DevTools → Application → Service Workers
3. Verifica que está registrado y activo

### Performance

1. Abre DevTools → **Network**
2. Recarga la página
3. Verifica:
   - Recursos comprimidos (gzip)
   - Tiempos de carga razonables
   - No hay errores 404

## 🐛 Troubleshooting

### Los índices no se crearon

```bash
# Verificar schema de Prisma
npx prisma db push

# O crear migración
npx prisma migrate dev --name add_indexes
```

### Service Worker no se registra

1. Verifica que estás en producción o cambiaste el código
2. Verifica la consola del navegador por errores
3. Verifica que `/sw.js` es accesible

### Headers de seguridad no aparecen

1. Verifica que `middleware.ts` existe en la raíz
2. Verifica que no hay errores en el build
3. Limpia el cache del navegador

### Validación no funciona

1. Verifica que `lib/validations/clase.schema.ts` existe
2. Verifica que la ruta API importa el schema
3. Revisa la consola del navegador por errores

## ✅ Checklist Final

- [ ] Headers de seguridad presentes
- [ ] Validación Zod funciona en formularios
- [ ] Índices de BD creados
- [ ] Manifest.json accesible
- [ ] Service Worker registrado
- [ ] PWA instalable
- [ ] Compresión gzip activa
- [ ] No aparece X-Powered-By header
- [ ] Lighthouse PWA score > 80

## 📊 Herramientas Útiles

- **Chrome DevTools**: Para inspeccionar headers, service workers, cache
- **Lighthouse**: Para auditar PWA y performance
- **PostgreSQL**: Para verificar índices
- **curl**: Para probar headers y APIs
- **Network tab**: Para verificar compresión y tiempos

## 🚀 Próximos Pasos

Si todo funciona correctamente:

1. ✅ Aplicar migración de índices a producción
2. ✅ Verificar que el Service Worker funciona en producción
3. ✅ Crear iconos reales para PWA (reemplazar placeholders)
4. ✅ Configurar HTTPS en producción (requerido para PWA completa)
5. ✅ Agregar tests automatizados para validaciones

