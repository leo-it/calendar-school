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
   - Click en "New" → "Database" → "PostgreSQL"
   - Railway creará automáticamente la base de datos
   - Copia la variable `DATABASE_URL` que Railway genera

   **Servicio 2: Aplicación Next.js**
   - Click en "New" → "GitHub Repo" → Selecciona tu repo
   - Railway detectará el Dockerfile automáticamente
   - O configura manualmente:
     - Build Command: `docker build -t almanaque .`
     - Start Command: `docker run almanaque`

3. **Configurar variables de entorno**

   En el servicio de la aplicación, añade estas variables:
   ```
   DATABASE_URL=<la URL que Railway generó para PostgreSQL>
   NEXTAUTH_URL=https://tu-app.railway.app
   NEXTAUTH_SECRET=<genera uno con: openssl rand -base64 32>
   NODE_ENV=production
   ```

4. **Desplegar**
   - Railway desplegará automáticamente cuando hagas push a la rama principal
   - O puedes hacerlo manualmente desde el dashboard

5. **Configurar dominio (opcional)**
   - En el servicio de la aplicación → Settings → Generate Domain
   - Railway te dará una URL como: `almanaque-production.up.railway.app`

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
   NODE_ENV=production
   PORT=10000
   ```

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

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté correctamente configurada
- En Render, usa la "Internal Database URL" (no la externa)
- En Railway, usa la variable `DATABASE_URL` que Railway genera

### Error: "Prisma Client initialization error"
- Verifica que el binaryTarget en `prisma/schema.prisma` sea correcto
- Para Railway/Render (Linux x64): `linux-musl-x64-openssl-3.0.x`

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


