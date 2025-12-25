# Guía de Troubleshooting - Almanaque de Clases

## Error: "Application error: a server-side exception has occurred"

### Paso 1: Ver los logs

**En Railway:**
1. Ve a tu proyecto: https://railway.app
2. Click en el servicio de tu aplicación (no el de PostgreSQL)
3. Ve a la pestaña **"Deployments"** o **"Logs"**
4. Revisa los logs más recientes

**En Render:**
1. Ve a tu dashboard: https://dashboard.render.com
2. Click en tu servicio web
3. Ve a la sección **"Logs"**
4. Revisa los logs en tiempo real

### Paso 2: Errores comunes y soluciones

#### ❌ Error: "PrismaClientInitializationError" o "Cannot connect to database"

**Síntomas:**
```
PrismaClientInitializationError: Can't reach database server
```

**Causa:** La variable `DATABASE_URL` no está configurada o es incorrecta.

**Solución:**
1. Ve al servicio de PostgreSQL en Railway
2. Pestaña **"Variables"**
3. Busca `DATABASE_URL`
4. Copia el valor completo
5. Ve al servicio de la aplicación
6. Pestaña **"Variables"**
7. Añade o edita `DATABASE_URL` con el valor copiado
8. **O mejor aún**: Usa la referencia `${{Postgres.DATABASE_URL}}` (reemplaza "Postgres" con el nombre exacto de tu servicio PostgreSQL)

#### ❌ Error: "NEXTAUTH_SECRET is missing"

**Síntomas:**
```
Error: Please define a `NEXTAUTH_SECRET` environment variable
```

**Solución:**
1. Genera un secret:
   ```bash
   openssl rand -base64 32
   ```
2. Copia el resultado
3. En Railway → Servicio de aplicación → Variables
4. Añade `NEXTAUTH_SECRET` con el valor generado

#### ❌ Error: "NEXTAUTH_URL is missing" o redirects incorrectos

**Síntomas:**
- La aplicación carga pero los redirects no funcionan
- Errores de autenticación

**Solución:**
1. Ve al servicio de la aplicación en Railway
2. Settings → Networking
3. Copia la URL pública (ej: `https://tu-app.up.railway.app`)
4. Variables → Añade/edita `NEXTAUTH_URL` con esa URL completa (incluyendo `https://`)

#### ❌ Error: "Module not found" o errores de build

**Síntomas:**
```
Error: Cannot find module 'xxx'
```

**Solución:**
1. Verifica que el Dockerfile esté correcto
2. Revisa los logs del build en Railway
3. Asegúrate de que `package.json` tenga todas las dependencias
4. Intenta hacer un redeploy

#### ❌ Error: "Port already in use" o la app no inicia

**Solución:**
- Railway asigna el puerto automáticamente
- Next.js debe usar la variable `PORT` de Railway
- Verifica que tu aplicación lea `process.env.PORT` o usa `PORT || 3000`

### Paso 3: Verificar configuración completa

Asegúrate de tener estas variables en el servicio de la aplicación:

```bash
✅ DATABASE_URL=${{Postgres.DATABASE_URL}}  # O el valor directo
✅ NEXTAUTH_URL=https://tu-app.up.railway.app  # Tu URL pública
✅ NEXTAUTH_SECRET=<valor generado con openssl>
✅ NODE_ENV=production
```

### Paso 4: Revisar el build

Si el error ocurre durante el build:

1. Ve a Deployments → Click en el deployment fallido
2. Revisa los logs del build
3. Errores comunes:
   - TypeScript errors → Ya corregidos en el código
   - Prisma generate errors → Verifica binaryTargets
   - Docker build errors → Verifica Dockerfile

### Paso 5: Reiniciar el servicio

A veces un simple restart ayuda:

**Railway:**
- Deployments → Click en los tres puntos → "Redeploy"

**Render:**
- Dashboard → Tu servicio → "Manual Deploy" → "Clear build cache & deploy"

## Comandos útiles para debugging

### Verificar conexión a la base de datos desde Railway

Puedes ejecutar comandos en el contenedor:
1. Railway → Tu servicio → Settings → "Shell"
2. O usa Railway CLI: `railway run psql $DATABASE_URL`

### Verificar variables de entorno

En los logs, busca:
```
Environment variables loaded
```

O añade temporalmente en tu código:
```typescript
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing')
```

## Contacto y ayuda adicional

Si el problema persiste:
1. Copia los logs completos del error
2. Verifica que todas las variables estén configuradas
3. Revisa que el build se completó sin errores
4. Intenta hacer un redeploy limpio

