# Almanaque de Clases

Sistema de gestión de clases de danza con calendario interactivo, filtros avanzados y sistema de notificaciones.

## Características

- 📅 **Calendario interactivo** con vistas de día y semana
- 🔍 **Filtros avanzados** por profesor, nivel, estilo y lugar
- 👥 **Sistema de roles** (Admin, Profesor, Estudiante)
- 🔔 **Notificaciones** por email y WhatsApp cuando se actualizan las clases
- 📱 **Diseño responsive** y moderno
- ✅ **Subscripciones** a clases favoritas

## Tecnologías

- **Next.js 14** con App Router
- **TypeScript**
- **Prisma** (ORM)
- **NextAuth.js** (Autenticación)
- **Tailwind CSS** (Estilos)
- **PostgreSQL** (Base de datos)
- **Docker** (Contenerización)

## Instalación (Desarrollo Local)

**Nota**: Para desarrollo local, se recomienda usar Docker (ver sección siguiente). Esta instalación requiere PostgreSQL corriendo localmente.

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
# Crear archivo .env
cat > .env << EOF
DATABASE_URL=postgresql://usuario:password@localhost:5432/almanaque?schema=public
NEXTAUTH_URL=http://localhost:7000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NODE_ENV=development
EOF
```

Editar `.env` y configurar:
- `DATABASE_URL`: URL de la base de datos PostgreSQL (debe estar corriendo)
- `NEXTAUTH_SECRET`: Secret key para NextAuth (ya generado arriba)
- Configuraciones opcionales para email/WhatsApp

3. Inicializar base de datos:
```bash
npx prisma generate
npx prisma db push
```

4. (Opcional) Crear datos iniciales:
```bash
npm run seed
```

O usar Prisma Studio para crear datos manualmente:
```bash
npx prisma studio
```

5. Ejecutar en desarrollo:
```bash
npm run dev
```

Abrir [http://localhost:7000](http://localhost:7000) (puerto configurado en package.json)

## Instalación con Docker (Recomendado)

La aplicación está completamente contenerizada y lista para producción usando Docker y Docker Compose.

### Prerrequisitos
- Docker Engine 20.10+
- Docker Compose 2.0+

### Pasos de Instalación

1. **Clonar el repositorio** (si aún no lo has hecho)

2. **Configurar variables de entorno**:
```bash
# El archivo .env ya está creado con valores por defecto para desarrollo
# Si necesitas regenerar el NEXTAUTH_SECRET:
openssl rand -base64 32

# Editar .env y actualizar NEXTAUTH_SECRET si es necesario
# Las variables ya configuradas son:
# - DATABASE_URL: postgresql://almanaque:almanaque_dev_password@postgres:5432/almanaque?schema=public
# - NEXTAUTH_URL: http://localhost:3000
# - NEXTAUTH_SECRET: (generado automáticamente)
# - NODE_ENV: production
```

3. **Construir y levantar los contenedores**:
```bash
docker compose up -d --build
```

4. **Inicializar la base de datos**:
```bash
# Las tablas se crean automáticamente al levantar los contenedores
# Si necesitas recrear la base de datos, ejecuta:
docker compose exec postgres psql -U almanaque -d almanaque -c "SELECT 1;" || \
  docker compose exec postgres psql -U almanaque -c "CREATE DATABASE almanaque;"

# (Opcional) Ejecutar seed para datos iniciales desde tu máquina local:
DATABASE_URL="postgresql://almanaque:almanaque_dev_password@localhost:5432/almanaque" npm run seed
```

5. **Acceder a la aplicación**:
   - Aplicación: [http://localhost:3000](http://localhost:3000)
   - PostgreSQL: `localhost:5432` (usuario: `almanaque`, password: `almanaque_dev_password`)

### Comandos Útiles

```bash
# Ver logs de los contenedores
docker compose logs -f app

# Ver logs de PostgreSQL
docker compose logs -f postgres

# Ver estado de los contenedores
docker compose ps

# Detener los contenedores
docker compose down

# Detener y eliminar volúmenes (⚠️ elimina la base de datos)
docker compose down -v

# Reconstruir solo la aplicación
docker compose build app

# Reiniciar los contenedores
docker compose restart

# Acceder a la base de datos directamente
docker compose exec postgres psql -U almanaque -d almanaque
```

### Notas Importantes

- **Producción**: Cambiar las contraseñas por defecto en `docker-compose.yml` y `.env` antes de desplegar
- **Variables de entorno**: Para producción, usar un archivo `.env.production` o un gestor de secretos
- **Volúmenes**: Los datos de PostgreSQL se persisten en el volumen `postgres_data`
- **Base de datos**: Las tablas se crean automáticamente al levantar los contenedores por primera vez
- **Prisma**: El schema está configurado para PostgreSQL con binaryTargets para Alpine Linux (ARM64)
- **Puerto**: La aplicación corre en el puerto 3000 (configurado en docker-compose.yml)

## Estructura del Proyecto

```
almanaque/
├── app/                    # App Router de Next.js
│   ├── api/               # API routes
│   ├── calendario/        # Página principal del calendario
│   ├── login/             # Página de login
│   └── layout.tsx         # Layout principal
├── components/            # Componentes React
│   ├── Filtros.tsx
│   ├── VistaCalendario.tsx
│   └── TarjetaClase.tsx
├── lib/                   # Utilidades
│   ├── prisma.ts
│   ├── auth.ts
│   └── notificaciones.ts
├── prisma/                # Schema de Prisma
│   └── schema.prisma
└── types/                 # TypeScript types
```

## Próximos Pasos

- [ ] Implementar envío real de emails (nodemailer)
- [ ] Integrar API de WhatsApp Business
- [ ] Panel de administración para crear/editar clases
- [ ] Dashboard para profesores
- [ ] Sistema de preferencias de notificación por usuario
- [ ] Exportar calendario a iCal/Google Calendar

## 🧩 Arquitectura de Microfrontends

Este proyecto está preparado para ser convertido en una arquitectura de microfrontends en el futuro. 

### Estado Actual

El proyecto actualmente es una aplicación monolítica Next.js, pero su estructura permite una migración gradual hacia microfrontends si es necesario.

### ¿Cuándo considerar Microfrontends?

- **Múltiples equipos** trabajando en diferentes módulos
- **Necesidad de escalar** módulos independientemente
- **Diferentes ciclos de release** por funcionalidad
- **Integración** con otros sistemas existentes

### Preparación para Microfrontends

El proyecto puede ser estructurado como microfrontends usando:

1. **Module Federation** (Webpack 5) - Para Next.js
2. **Componentes como librería NPM** - Para reutilización
3. **Next.js Standalone** - Como microfrontend independiente

### Estructura Propuesta

```
almanaque/
├── microfrontends/
│   ├── calendario/          # Microfrontend del calendario
│   ├── admin/               # Microfrontend de administración
│   └── shared/              # Componentes compartidos
└── shell/                   # Aplicación shell (host)
```

### Documentación Detallada

Para más información sobre la preparación para microfrontends, consulta:
- [MEJORAS_ARQUITECTURA.md](./MEJORAS_ARQUITECTURA.md) - Sección "MICROFRONTENDS"

### Beneficios Potenciales

- ✅ **Despliegue independiente** de módulos
- ✅ **Equipos autónomos** trabajando en paralelo
- ✅ **Escalabilidad** horizontal por módulo
- ✅ **Aislamiento de errores** entre módulos

## Licencia

MIT



🚀 Próximos Pasos: El Camino a Producción
El objetivo principal ahora es llevar la aplicación a un entorno de producción escalable y automatizado, siguiendo las mejores prácticas de DevOps y Plataforma.

I. ⚙️ Ingeniería de Plataforma (DevOps) - PRIORIDAD ALTA
Esta fase es crucial para asegurar la confiabilidad y el despliegue automático del proyecto.

[x] 1. Contenerización Completa (Docker):

[x] Crear un Dockerfile optimizado para el Front/Back de Next.js (con multi-stage build).

[x] Crear un docker-compose.yml para correr Next.js y PostgreSQL (en lugar de SQLite) localmente.

[ ] 2. Infraestructura como Código (IaC):

[ ] Definir los recursos en la nube (ej. en AWS o GCP) usando Terraform.

[ ] Configurar un clúster de Kubernetes (K8s) (o un servicio de contenedores como AWS ECS/Google Cloud Run).

[ ] Desplegar la base de datos PostgreSQL en la nube.

[ ] 3. Pipeline de CI/CD:

[ ] Implementar un workflow en GitHub Actions (o GitLab CI).

[ ] Configurar el CI para que ejecute tests, construya la imagen Docker y la suba a un registro (ej. Docker Hub/ECR).

[ ] Configurar el CD para que actualice la implementación en K8s con la nueva imagen.

II. ✨ Características Pendientes de Negocio
Estas son las características que añaden valor al usuario final y que quedaron pendientes.

[ ] 1. Panel de Administración y Roles:

[ ] Implementar el Panel de Administración para Admin (Crear, Editar, Eliminar Clases y Profesores).

[ ] Desarrollar el Dashboard del Profesor (Vista solo de sus clases, historial).

[ ] 2. Notificaciones Robustas:

[ ] Implementar envío real de emails usando un servicio (ej. Nodemailer con SendGrid/Resend).

[ ] Integrar API de WhatsApp Business para notificaciones críticas.

[ ] Crear el Sistema de Preferencias de Notificación por usuario.

[ ] 3. Interoperabilidad:

[ ] Implementar la funcionalidad de Exportar calendario a formatos estándar (iCal/Google Calendar).

III. 🔒 Calidad y Testing
[ ] 1. Pruebas de Integración:

[ ] Añadir tests de integración con Playwright o Cypress para el flujo de autenticación y la creación de clases.

[ ] 2. Monitoreo de Producción (Observabilidad):

[ ] Integrar Prometheus y Grafana para monitorear métricas de CPU, latencia de API y errores 5xx.

[ ] Configurar alertas automáticas para fallas en el servicio.

⚙️ Tecnologías Adicionales (Fase DevOps)
Docker y Docker Compose (Contenerización)

Terraform (Infraestructura como Código - IaC)

Kubernetes (K8s) o AWS ECS / Google Cloud Run (Orquestación)

GitHub Actions (CI/CD)

Prometheus & Grafana (Observabilidad)