# Guía de Despliegue

Esta guía explica cómo desplegar Almanaque de Clases usando Railway.app o Render.com, ambos con planes gratuitos.

## Opción 1: Railway.app (Recomendado)

### Prerrequisitos
- Cuenta en [Railway.app](https://railway.app) (gratis con GitHub)
- Repositorio en GitHub con el código

### Pasos de Despliegue

1. **Conectar repositorio a Railway**
   - Ve a [railway.app](https://railway.app)
   - Inicia sesión con GitHub
   - Click en "New Project" → "Deploy from GitHub repo"
   - Selecciona tu repositorio `almanaque`

2. **Configurar servicios**

   Railway detectará automáticamente el `docker-compose.yml` o puedes configurar manualmente:

   **Servicio 1: Base de datos PostgreSQL**
   - En tu proyecto, busca el botón **"+ New"** o **"Add Service"** o **"Create"**
   - Selecciona **"Database"** → **"PostgreSQL"**
   - Railway creará automáticamente la base de datos
   - Ve a la pestaña **"Variables"** del servicio PostgreSQL
   - Copia la variable `DATABASE_URL` que Railway genera automáticamente

   **Servicio 2: Aplicación Next.js**
   - Click en **"+ New"** o **"Add Service"** → **"GitHub Repo"**
   - Selecciona tu repositorio `calendar-school` (o el nombre que tenga)
   - Railway detectará el Dockerfile automáticamente
   - Si no lo detecta, en Settings → Build:
     - Build Command: (dejar vacío, Railway usa Docker)
     - Start Command: (dejar vacío, Railway usa Docker)

3. **Configurar dominio público (primero)**

   **IMPORTANTE**: Necesitas obtener el dominio de tu aplicación ANTES de configurar `NEXTAUTH_URL`:
   
   - Ve al servicio de la aplicación Next.js (no el de PostgreSQL)
   - Ve a la pestaña **"Settings"** o **"Networking"**
   - Busca la sección **"Public Networking"** o **"Generate Domain"**
   - Click en **"Generate Domain"** o activa **"Public Networking"**
   - Railway te dará una URL automáticamente, algo como: `calendar-school-production.up.railway.app`
   - **Copia esta URL completa** (incluyendo el `https://`)

4. **Configurar variables de entorno**

   En el servicio de la aplicación Next.js:
   - Ve a la pestaña **"Variables"**
   - Click en **"+ New Variable"** o **"Add Variable"**
   - Añade estas variables:
   ```
   DATABASE_URL=<usa la variable DATABASE_URL del servicio PostgreSQL>
   NEXTAUTH_URL=<la URL que copiaste en el paso 3, ejemplo: https://calendar-school-production.up.railway.app>
   NEXTAUTH_SECRET=<ver instrucciones abajo>
   GROQ_API_KEY=<tu_api_key_de_groq - obtén una gratis en https://console.groq.com>
   NODE_ENV=production
   ```
   
   **¿Qué es GROQ_API_KEY?**
   - Es la API key para el chatbot con inteligencia artificial
   - Es **100% gratis** (no requiere tarjeta de crédito)
   - Obtén una en: https://console.groq.com → API Keys → Create API Key
   - Ver guía completa: `CONFIGURACION_PRODUCCION_GROQ.md`
   
   **¿Qué es NEXTAUTH_SECRET?**
   - Es una clave secreta que NextAuth.js usa para cifrar tokens de sesión y cookies
   - Debe ser una cadena aleatoria y segura
   - **NUNCA** la compartas públicamente (es un secreto)
   
   **Cómo generar NEXTAUTH_SECRET:**
   
   **Opción 1: Desde tu terminal (recomendado)**
   ```bash
   openssl rand -base64 32
   ```
   Esto generará algo como: `xK8pL2mN9qR4sT6vW8yZ0aB2cD4eF6gH8iJ0kL2mN4=`
   - Copia el resultado completo
   - Pégalo como valor de `NEXTAUTH_SECRET` en Railway
   
   **Opción 2: Desde Railway directamente**
   - Railway puede generar valores aleatorios automáticamente
   - O puedes usar cualquier generador de strings aleatorios online
   - Asegúrate de que tenga al menos 32 caracteres
   
   **Opción 3: Usar el mismo secret que en desarrollo (solo para pruebas)**
   - Si ya tienes un `.env` local, puedes usar el mismo `NEXTAUTH_SECRET`
   - **⚠️ En producción real, usa un secret diferente y más seguro**
   
   **Cómo obtener DATABASE_URL (RECOMENDADO - Usa referencia):**
   
   **⚠️ IMPORTANTE**: Usa la referencia entre servicios en lugar de copiar el valor. Esto asegura que Railway use la URL interna correcta.
   
   1. Ve al servicio de la aplicación Next.js (no el de PostgreSQL)
   2. Pestaña **"Variables"**
   3. Busca o crea la variable `DATABASE_URL`
   4. En lugar de copiar el valor, usa la **referencia entre servicios**:
      - Valor: `${{Postgres.DATABASE_URL}}`
      - ⚠️ **Reemplaza "Postgres" con el nombre EXACTO de tu servicio PostgreSQL** (puede ser "Postgres", "postgres", "PostgreSQL", etc.)
      - Para ver el nombre exacto: ve al servicio PostgreSQL y mira el nombre en la parte superior
   
   **Alternativa (si la referencia no funciona):**
   - Ve al servicio **PostgreSQL** → Pestaña **"Variables"**
   - Busca `DATABASE_URL`
   - Click en el ícono de **copiar** (📋)
   - Pégalo en la variable `DATABASE_URL` del servicio de la aplicación
   - ⚠️ Asegúrate de que la URL use `postgres.railway.internal` (URL interna) y no `postgres.railway.app` (URL pública)

5. **Aplicar cambios y desplegar**
   
   **⚠️ IMPORTANTE**: Después de añadir o modificar variables de entorno, DEBES hacer redeploy:
   
   - Si ves "X Changes" en la parte superior, haz click en **"Apply X changes"** o presiona **"Deploy ↑+Enter"**
   - Railway NO aplica las variables automáticamente hasta que hagas redeploy
   - Espera 1-2 minutos a que termine el despliegue
   - Verifica los logs para confirmar que las variables están disponibles
   
   **Despliegue automático:**
   - Railway desplegará automáticamente cuando hagas push a la rama principal
   - Pero si añades variables después del push, necesitas hacer redeploy manual
   
   **Una vez desplegado:**
   - Tu aplicación estará disponible en la URL que configuraste en `NEXTAUTH_URL`
   - Verifica los logs para confirmar que no hay errores de variables faltantes

### Costos
- **Gratis**: $5 de crédito mensual (suficiente para proyectos pequeños)
- **Hobby**: $20/mes (más recursos)

---

## Opción 2: Render.com

### Prerrequisitos
- Cuenta en [Render.com](https://render.com) (gratis con GitHub)
- Repositorio en GitHub con el código

### Pasos de Despliegue

1. **Crear base de datos PostgreSQL**
   - Ve a [render.com](https://render.com)
   - Inicia sesión con GitHub
   - Click en "New" → "PostgreSQL"
   - Configura:
     - Name: `almanaque-db`
     - Database: `almanaque`
     - User: `almanaque`
     - Region: Elige el más cercano
     - Plan: Free (con limitaciones) o Starter ($7/mes)
   - Copia la "Internal Database URL"

2. **Crear servicio Web**
   - Click en "New" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Configura:
     - Name: `almanaque-app`
     - Environment: `Docker`
     - Region: Elige el mismo que la base de datos
     - Branch: `main` o `master`
     - Root Directory: `/` (raíz del proyecto)

3. **Configurar variables de entorno**
   ```
   DATABASE_URL=<Internal Database URL de Render>
   NEXTAUTH_URL=https://almanaque-app.onrender.com
   NEXTAUTH_SECRET=<genera uno con: openssl rand -base64 32>
   GROQ_API_KEY=<tu_api_key_de_groq - obtén una gratis en https://console.groq.com>
   NODE_ENV=production
   PORT=10000
   ```
   
   **GROQ_API_KEY**: API key gratis para el chatbot. Obtén una en https://console.groq.com

4. **Configurar build y start commands**
   - Build Command: (dejar vacío, Render usa Docker)
   - Start Command: (dejar vacío, Render usa Docker)

5. **Desplegar**
   - Render desplegará automáticamente
   - La primera vez puede tardar 5-10 minutos

### Costos
- **Free**: Con limitaciones (se duerme después de 15 min de inactividad)
- **Starter**: $7/mes (siempre activo)

---

## Usando GitHub Container Registry

Las imágenes Docker se publican automáticamente en GitHub Container Registry cuando haces push al repositorio.

### Ver imágenes publicadas
1. Ve a tu repositorio en GitHub
2. Click en "Packages" (lado derecho)
3. Verás las imágenes Docker publicadas

### Usar imagen en Railway/Render

**Railway:**
- Puedes usar la imagen directamente desde GHCR:
  - En el servicio, configura "Image" en lugar de "GitHub Repo"
  - Imagen: `ghcr.io/tu-usuario/almanaque:latest`

**Render:**
- Render funciona mejor con GitHub Repo directamente
- Pero puedes usar la imagen si configuras un servicio Docker manualmente

---

## CI/CD Automático

El workflow de GitHub Actions está configurado para:
1. ✅ Ejecutar linting y verificación de tipos
2. ✅ Construir la aplicación
3. ✅ Construir y publicar imagen Docker a GHCR
4. ⏳ Desplegar automáticamente (se puede activar cuando esté configurado)

### Activar despliegue automático

Para Railway, añade este secret en GitHub:
- `RAILWAY_TOKEN`: Obtén el token desde Railway → Account Settings → Tokens

Para Render, añade estos secrets:
- `RENDER_SERVICE_ID`: ID del servicio de Render
- `RENDER_API_KEY`: API Key de Render (Account Settings → API Keys)

Luego descomenta el job `deploy` en `.github/workflows/ci-cd.yml`

---

## Troubleshooting

### Error: "Application error: a server-side exception has occurred"

Este es un error común. Sigue estos pasos para diagnosticarlo:

**1. Ver los logs del servidor en Railway:**
   - Ve al servicio de tu aplicación en Railway
   - Click en la pestaña **"Deployments"** o **"Logs"**
   - Revisa los logs más recientes para ver el error específico
   - Los errores comunes son:

**2. Error: "Cannot connect to database" o "PrismaClientInitializationError" - "Environment variable not found: DATABASE_URL"**

   **Síntomas:**
   ```
   error: Environment variable not found: DATABASE_URL.
   PrismaClientInitializationError: Can't reach database server
   ```
   
   **Causa**: Railway no está pasando `DATABASE_URL` al contenedor Docker en runtime.
   
   **Solución paso a paso:**
   
   1. **Verifica que el servicio PostgreSQL esté corriendo:**
      - Ve al servicio PostgreSQL → Debe estar "Running" o "Online" (no "Sleeping")
      - Si está dormido, haz click en "Start" o "Wake"
   
   2. **Configura DATABASE_URL en el servicio de la aplicación:**
      - Ve al servicio de la aplicación (calendar-school) → Pestaña "Variables"
      - **IMPORTANTE**: Usa el **valor directo**, NO la referencia `${{Postgres.DATABASE_URL}}`
      - Ve al servicio PostgreSQL → Variables → Copia el valor completo de `DATABASE_URL`
      - Pégalo en `DATABASE_URL` del servicio de la aplicación
      - El valor debe ser algo como: `postgresql://postgres:password@postgres.railway.internal:5432/railway`
   
   3. **Verifica el nombre de la variable:**
      - Debe ser exactamente `DATABASE_URL` (sin espacios, mayúsculas correctas)
      - No debe tener caracteres especiales o espacios al inicio/final
   
   4. **Haz redeploy:**
      - Después de configurar la variable, haz click en "Apply changes" o "Deploy"
      - Railway NO aplica las variables hasta que hagas redeploy
      - Espera 1-2 minutos a que termine el despliegue
   
   5. **Verifica los logs:**
      - Después del redeploy, ve a "Deployments" → Logs
      - Busca los logs de debug que muestran `DATABASE_URL existe: true`
      - Si sigue mostrando `false`, Railway no está inyectando la variable correctamente
   
   **Si el problema persiste:**
   - Verifica que el servicio esté configurado para usar Docker (no Buildpack)
   - En Railway → Settings → Service Type debe ser "Docker" o "GitHub Repo"
   - Si usas GitHub Repo, Railway debe estar construyendo desde el Dockerfile

**3. Error: "Prisma Client initialization error" o "binaryTarget"**
   - **Causa**: Prisma Client no está generado correctamente para la arquitectura del servidor
   - **Solución**: El `schema.prisma` ya está configurado correctamente. Si persiste:
     - Verifica que el build se completó correctamente
     - Revisa los logs del build en Railway

**4. Error: "NEXTAUTH_SECRET is missing"**
   - **Causa**: La variable `NEXTAUTH_SECRET` no está configurada
   - **Solución**: Añade la variable `NEXTAUTH_SECRET` con un valor generado con `openssl rand -base64 32`

**5. Error: "Module not found" o errores de importación**
   - **Causa**: Dependencias faltantes o build incompleto
   - **Solución**: 
     - Verifica que el Dockerfile esté correcto
     - Revisa los logs del build para ver si hay errores de compilación

**6. La aplicación no inicia**
   - Verifica que el puerto esté configurado correctamente
   - Railway usa la variable `PORT` automáticamente, pero Next.js usa `3000` por defecto
   - Añade `PORT=3000` en las variables de entorno si es necesario

**Cómo ver logs en Railway:**
1. Ve a tu proyecto en Railway
2. Click en el servicio de la aplicación
3. Ve a la pestaña **"Deployments"**
4. Click en el deployment más reciente
5. Verás los logs en tiempo real
6. O ve a la pestaña **"Logs"** para ver todos los logs

### Error: "Cannot connect to database" (más específico)
- Verifica que `DATABASE_URL` esté correctamente configurada
- En Render, usa la "Internal Database URL" (no la externa)
- En Railway, usa la variable `DATABASE_URL` que Railway genera o la referencia `${{Postgres.DATABASE_URL}}`

### Error: "Prisma Client initialization error"
- Verifica que el binaryTarget en `prisma/schema.prisma` sea correcto
- Para Railway/Render (Linux x64): `linux-musl-openssl-3.0.x`
- El schema ya está configurado correctamente con los binaryTargets necesarios

### La aplicación se duerme (Render Free)
- Esto es normal en el plan gratuito de Render
- La primera petición después de dormir puede tardar 30-60 segundos
- Considera upgrade a Starter ($7/mes) para evitar esto

---

## Monitoreo

### Railway
- Dashboard con logs en tiempo real
- Métricas de CPU, memoria, red
- Alertas configurables

### Render
- Dashboard con logs
- Métricas básicas
- Alertas por email

---

## Próximos Pasos

Una vez desplegado, considera:
- [ ] Configurar dominio personalizado
- [ ] Configurar SSL/HTTPS (automático en Railway/Render)
- [ ] Configurar backups de la base de datos
- [ ] Configurar monitoreo y alertas
- [ ] Configurar CI/CD para despliegue automático


