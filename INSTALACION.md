# Guía de Instalación - Almanaque de Clases

## Pasos para comenzar

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth - IMPORTANTE: Genera un secret seguro
# Puedes generar uno con: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui-cambiar-en-produccion"

# Email (opcional, para notificaciones)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-password"

# WhatsApp API (opcional, para notificaciones)
WHATSAPP_API_KEY="tu-api-key"
WHATSAPP_API_URL="https://api.whatsapp.com"
```

### 3. Inicializar la base de datos

```bash
# Generar el cliente de Prisma
npm run db:generate

# Crear las tablas en la base de datos
npm run db:push
```

### 4. Poblar la base de datos con datos de ejemplo (opcional)

```bash
npm run seed
```

Esto creará:
- Un usuario admin: `admin@almanaque.com` / `password123`
- 2 profesores de ejemplo
- 3 clases de ejemplo

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Acceso inicial

Si ejecutaste el seed, puedes iniciar sesión con:
- **Email:** admin@almanaque.com
- **Contraseña:** password123

## Próximos pasos

1. **Crear más usuarios**: Puedes usar Prisma Studio para crear usuarios:
   ```bash
   npm run db:studio
   ```

2. **Configurar notificaciones**: Edita `lib/notificaciones.ts` para integrar servicios reales de email/WhatsApp

3. **Personalizar estilos**: Edita `tailwind.config.ts` para cambiar colores y temas

## Comandos útiles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Compilar para producción
- `npm run start` - Iniciar servidor de producción
- `npm run db:studio` - Abrir Prisma Studio (interfaz visual para la BD)
- `npm run seed` - Poblar BD con datos de ejemplo



