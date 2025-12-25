# GitHub Actions Workflows

Este directorio contiene los workflows de CI/CD para el proyecto.

## Workflows Disponibles

### `ci-cd.yml`

Pipeline principal de CI/CD que se ejecuta en cada push y pull request.

**Jobs:**
1. **lint-and-typecheck**: Ejecuta ESLint y verificación de tipos TypeScript
2. **build-and-test**: Construye la aplicación y ejecuta tests (si existen)
3. **build-and-push**: Construye y publica la imagen Docker a GitHub Container Registry
4. **deploy**: Despliegue automático (comentado, se puede activar cuando esté configurado)

**Triggers:**
- Push a ramas `main`, `master`, `develop`
- Pull requests a esas ramas
- Ejecución manual desde GitHub Actions

**Permisos necesarios:**
- `contents: read` - Para leer el código
- `packages: write` - Para publicar imágenes Docker

**Secrets opcionales (para despliegue automático):**
- `RAILWAY_TOKEN` - Token de Railway para despliegue automático
- `RENDER_SERVICE_ID` - ID del servicio de Render
- `RENDER_API_KEY` - API Key de Render

## Ver imágenes publicadas

Las imágenes Docker se publican en GitHub Container Registry:
- URL: `ghcr.io/tu-usuario/almanaque`
- Tags: `latest`, `main`, `master`, `develop`, y tags basados en SHA

Para ver las imágenes:
1. Ve a tu repositorio en GitHub
2. Click en "Packages" (lado derecho de la página)
3. Verás todas las imágenes publicadas

## Personalización

Para activar el despliegue automático:
1. Descomenta el job `deploy` en `ci-cd.yml`
2. Añade los secrets necesarios en GitHub → Settings → Secrets and variables → Actions
3. Configura Railway o Render según las instrucciones en `DESPLIEGUE.md`


