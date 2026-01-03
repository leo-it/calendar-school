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
- **PWA** (Progressive Web App)
- **Zod** (Validación de esquemas)

## 🚀 Características de Seguridad y Optimización

- ✅ **Validación estricta** con Zod schemas
- ✅ **Headers de seguridad** (XSS, CSRF, Clickjacking)
- ✅ **Sanitización de inputs** para prevenir inyecciones
- ✅ **Índices de base de datos** optimizados
- ✅ **PWA instalable** desde el navegador
- ✅ **Service Worker** para funcionamiento offline
- ✅ **Rate limiting** básico implementado

Para más detalles, ver [README_SEGURIDAD_OPTIMIZACION.md](./README_SEGURIDAD_OPTIMIZACION.md)

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
- [x] Agregar clases individuales a Google Calendar
- [x] Implementación de PWA (Progressive Web App)
- [x] Optimizaciones de seguridad y rendimiento
- [ ] Sistema de membresía y control de inscripciones
- [ ] Internacionalización (i18n) para múltiples idiomas

## 💳 Sistema de Membresía (Planificado)

### Objetivo

Implementar un sistema de membresía flexible donde cada alumno solo pueda inscribirse a la cantidad de clases que pagó, con diferentes modelos de cobro según la escuela.

### Requisitos

1. **Control de inscripciones por pago**: Cada alumno solo puede inscribirse a la cantidad de clases que pagó
2. **Flexibilidad en modelos de cobro**: El sistema debe soportar diferentes modelos:
   - **Por clase**: El alumno paga por cada clase individual
   - **Por mes**: El alumno tiene acceso a un número limitado de clases por mes
   - **Acceso ilimitado**: El alumno tiene acceso a todas las clases sin restricciones
3. **Gestión por profesores**: Los profesores deben poder:
   - Ver la información de membresía de cada alumno
   - Configurar y actualizar el tipo de membresía
   - Gestionar los créditos/clases disponibles de cada alumno

### Estrategia Propuesta

#### Modelo de Datos

```prisma
model Membresia {
  id              String   @id @default(cuid())
  userId          String
  escuelaId       String
  tipo            String   // "POR_CLASE", "POR_MES", "ILIMITADO"
  clasesDisponibles Int    @default(0) // Para tipo POR_CLASE o POR_MES
  clasesUsadas    Int      @default(0)
  fechaInicio     DateTime
  fechaFin        DateTime?
  activa          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user    User    @relation(fields: [userId], references: [id])
  escuela Escuela @relation(fields: [escuelaId], references: [id])
  
  @@unique([userId, escuelaId])
}

model Pago {
  id              String   @id @default(cuid())
  membresiaId     String
  monto           Decimal
  clasesAgregadas Int      // Cantidad de clases que se agregan con este pago
  metodoPago      String   // "EFECTIVO", "TRANSFERENCIA", "TARJETA", etc.
  fechaPago       DateTime @default(now())
  notas           String?
  
  membresia Membresia @relation(fields: [membresiaId], references: [id])
}
```

#### Lógica de Validación

1. **Al inscribirse a una clase**:
   - Verificar si el alumno tiene membresía activa en la escuela
   - Para tipo "POR_CLASE" o "POR_MES": Verificar que `clasesDisponibles > clasesUsadas`
   - Para tipo "ILIMITADO": Permitir inscripción sin restricciones
   - Incrementar `clasesUsadas` al inscribirse
   - Decrementar `clasesUsadas` al cancelar inscripción

2. **Renovación mensual**:
   - Para tipo "POR_MES": Resetear `clasesUsadas` al inicio de cada mes
   - Mantener `clasesDisponibles` según el plan contratado

#### Interfaz de Usuario

**Panel de Profesores**:
- Vista de alumnos con su estado de membresía
- Formulario para crear/editar membresía
- Registro de pagos
- Historial de clases usadas vs disponibles

**Panel de Estudiantes**:
- Visualización de clases disponibles restantes
- Historial de pagos
- Estado de membresía actual

### Consideraciones de Implementación

1. **Flexibilidad por escuela**: Cada escuela puede tener diferentes modelos de cobro
2. **Migración de datos**: Alumnos existentes necesitarán membresías asignadas
3. **Notificaciones**: Alertar cuando se acerquen al límite de clases
4. **Reportes**: Generar reportes de uso y pagos para profesores/administradores

### Próximos Pasos

- [ ] Diseñar esquema de base de datos detallado
- [ ] Implementar modelos Prisma
- [ ] Crear API endpoints para gestión de membresías
- [ ] Desarrollar interfaz de profesores para gestión
- [ ] Implementar validación en inscripciones
- [ ] Agregar notificaciones de límites
- [ ] Crear panel de estudiantes para ver estado

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

## 🌍 Internacionalización (i18n) - Planificado

### Objetivo

Implementar soporte para múltiples idiomas, permitiendo que los usuarios elijan su idioma preferido y que la aplicación se adapte automáticamente.

### Requisitos

1. **Soporte multiidioma**: La aplicación debe poder mostrar contenido en diferentes idiomas
2. **Selector de idioma**: Los usuarios deben poder cambiar el idioma desde la interfaz
3. **Persistencia de preferencia**: El idioma seleccionado debe guardarse en las preferencias del usuario
4. **Traducción completa**: Todos los textos de la interfaz deben ser traducibles
5. **Formato de fechas y números**: Adaptar formatos según el idioma seleccionado

### Idiomas Propuestos

- 🇪🇸 **Español** (es) - Idioma por defecto
- 🇺🇸 **Inglés** (en)
- 🇵🇹 **Portugués** (pt) - Para expansión en Brasil/Portugal
- 🇫🇷 **Francés** (fr) - Para expansión en Francia/Canadá

### Estrategia Propuesta

#### Tecnología Recomendada

**next-intl** o **next-i18next**:
- Integración nativa con Next.js App Router
- Soporte para Server Components
- Type-safe translations
- Lazy loading de traducciones
- Formato de fechas y números automático

#### Estructura Propuesta

```
almanaque/
├── messages/              # Archivos de traducción
│   ├── es.json           # Español
│   ├── en.json           # Inglés
│   ├── pt.json           # Portugués
│   └── fr.json           # Francés
├── lib/
│   └── i18n.ts           # Configuración de i18n
└── middleware.ts          # Middleware para detectar idioma
```

#### Ejemplo de Implementación

```typescript
// messages/es.json
{
  "common": {
    "welcome": "Bienvenido",
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión"
  },
  "calendar": {
    "title": "Calendario de Clases",
    "filter": "Filtrar",
    "subscribe": "Inscribirse"
  }
}

// messages/en.json
{
  "common": {
    "welcome": "Welcome",
    "login": "Log in",
    "logout": "Log out"
  },
  "calendar": {
    "title": "Class Calendar",
    "filter": "Filter",
    "subscribe": "Subscribe"
  }
}
```

#### Detección de Idioma

1. **Prioridad de detección**:
   - Preferencia guardada del usuario (en base de datos)
   - Header `Accept-Language` del navegador
   - Idioma por defecto (español)

2. **Almacenamiento**:
   - Guardar preferencia en el modelo `User` de Prisma
   - Cookie para usuarios no autenticados
   - Persistir en localStorage del navegador

#### Consideraciones de Implementación

1. **Contenido dinámico**:
   - Los nombres de profesores, escuelas y clases no se traducen (son datos del usuario)
   - Solo se traducen textos de la interfaz (botones, labels, mensajes)

2. **Formato de fechas**:
   - Usar `date-fns` con locales específicos
   - Adaptar formato según idioma (DD/MM/YYYY vs MM/DD/YYYY)

3. **Formato de números**:
   - Separadores decimales según idioma
   - Formato de teléfonos según país

4. **RTL (Right-to-Left)**:
   - Considerar soporte para idiomas RTL en el futuro (árabe, hebreo)

5. **SEO**:
   - URLs con prefijo de idioma: `/es/calendario`, `/en/calendar`
   - Meta tags en el idioma correcto
   - Sitemap multiidioma

### Próximos Pasos

- [ ] Investigar y elegir librería de i18n (next-intl recomendado)
- [ ] Crear estructura de archivos de traducción
- [ ] Agregar campo `locale` al modelo `User` en Prisma
- [ ] Implementar middleware de detección de idioma
- [ ] Crear selector de idioma en la interfaz
- [ ] Traducir todos los textos de la aplicación
- [ ] Configurar formato de fechas y números por idioma
- [ ] Agregar tests para verificar traducciones
- [ ] Documentar proceso para agregar nuevos idiomas

### Beneficios

- 🌍 **Alcance global**: Permite expandir a mercados internacionales
- 👥 **Mejor UX**: Los usuarios pueden usar la app en su idioma nativo
- 📈 **Escalabilidad**: Fácil agregar nuevos idiomas sin cambiar código
- 🔍 **SEO mejorado**: Contenido en múltiples idiomas mejora el SEO

### Casos de Uso Futuros con Microfrontends

#### Mapa de Escuelas (Google Maps)

Una funcionalidad futura sería crear un microfrontend independiente que muestre un mapa interactivo con Google Maps donde se visualicen todas las escuelas registradas en el sistema.

**Características propuestas**:
- 📍 **Mapa interactivo** con marcadores de todas las escuelas
- 🔍 **Búsqueda y filtrado** de escuelas por ubicación
- 📋 **Información detallada** de cada escuela al hacer clic en el marcador
- 🗺️ **Rutas y direcciones** desde la ubicación del usuario
- 🔗 **Integración** con el sistema principal mediante microfrontend

**Ventajas de usar microfrontend**:
- **Desarrollo independiente**: El equipo puede trabajar en el módulo de mapas sin afectar la aplicación principal
- **Carga bajo demanda**: El mapa solo se carga cuando el usuario lo necesita
- **Tecnologías específicas**: Puede usar librerías de mapas optimizadas sin afectar el bundle principal
- **Escalabilidad**: Fácil agregar más funcionalidades de mapas sin aumentar la complejidad del core

**Estructura propuesta**:
```
microfrontends/
├── calendario/          # Calendario principal
├── admin/               # Panel de administración
├── mapa-escuelas/      # Mapa con Google Maps (nuevo)
└── shared/             # Componentes compartidos
```

Esta arquitectura permitiría que el módulo de mapas conviva perfectamente con la aplicación principal, compartiendo datos de escuelas pero manteniendo su propia lógica de renderizado y estado.
- ✅ **Aislamiento de errores** entre módulos

## Despliegue a Producción

La aplicación está lista para desplegarse usando servicios gratuitos:

- **Railway.app**: Plan gratuito con $5 de crédito mensual
- **Render.com**: Plan gratuito (con limitaciones)
- **GitHub Container Registry**: Almacenamiento gratuito de imágenes Docker

Para instrucciones detalladas, consulta: [DESPLIEGUE.md](./DESPLIEGUE.md)

### CI/CD Automático

El proyecto incluye un pipeline de CI/CD con GitHub Actions que:
- ✅ Ejecuta linting y verificación de tipos
- ✅ Construye la aplicación
- ✅ Construye y publica imagen Docker a GitHub Container Registry
- ⏳ Despliegue automático (configurable con Railway/Render)

Ver: `.github/workflows/ci-cd.yml`

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

[x] 3. Pipeline de CI/CD:

[x] Implementar un workflow en GitHub Actions (o GitLab CI).

[x] Configurar el CI para que ejecute tests, construya la imagen Docker y la suba a un registro (ej. Docker Hub/ECR).

[x] Configurar el CD para que actualice la implementación en K8s con la nueva imagen.

**Nota**: El pipeline está configurado con GitHub Actions y GitHub Container Registry. Para despliegue automático, ver [DESPLIEGUE.md](./DESPLIEGUE.md).

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

[x] Implementar la funcionalidad de Agregar clases individuales a Google Calendar.

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