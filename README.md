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
- **SQLite** (Base de datos - fácil migrar a PostgreSQL)

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` y configurar:
- `DATABASE_URL`: URL de la base de datos
- `NEXTAUTH_SECRET`: Secret key para NextAuth (generar con `openssl rand -base64 32`)
- Configuraciones opcionales para email/WhatsApp

3. Inicializar base de datos:
```bash
npx prisma generate
npx prisma db push
```

4. (Opcional) Crear usuario admin inicial:
```bash
npm run dev
```
Luego usar el script de seed o crear manualmente desde Prisma Studio:
```bash
npx prisma studio
```

5. Ejecutar en desarrollo:
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

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

[ ] 1. Contenerización Completa (Docker):

[ ] Crear un Dockerfile optimizado para el Front/Back de Next.js (con multi-stage build).

[ ] Crear un docker-compose.yml para correr Next.js y PostgreSQL (en lugar de SQLite) localmente.

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