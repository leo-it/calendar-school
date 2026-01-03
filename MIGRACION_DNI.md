# Migración: Agregar campos DNI y Apellido

## Problema
La base de datos no tiene los campos `apellido` y `dni` que fueron agregados al schema de Prisma.

## Solución

### Opción 1: Usar Prisma (Recomendado)

Si tienes acceso a la base de datos con las variables de entorno configuradas:

```bash
npx prisma db push
```

### Opción 2: Ejecutar SQL directamente

Si estás en Railway, Render u otro servicio:

1. Conéctate a tu base de datos PostgreSQL
2. Ejecuta el script SQL:

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apellido" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dni" TEXT;
ALTER TABLE "Profesor" ADD COLUMN IF NOT EXISTS "dni" TEXT;
```

O ejecuta el archivo `scripts/add_dni_apellido.sql`

### Opción 3: Desde Railway CLI

```bash
railway run npx prisma db push
```

### Opción 4: Desde el panel de Railway

1. Ve a tu servicio en Railway
2. Abre la pestaña "Data" o "Postgres"
3. Haz clic en "Query" o "SQL Editor"
4. Ejecuta:

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apellido" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dni" TEXT;
ALTER TABLE "Profesor" ADD COLUMN IF NOT EXISTS "dni" TEXT;
```

## Verificación

Después de ejecutar la migración, verifica que los campos existan:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' 
  AND column_name IN ('apellido', 'dni');
```

## Importante

Después de aplicar la migración, **reinicia tu aplicación** para que los cambios surtan efecto.

