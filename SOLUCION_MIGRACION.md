# 🔧 Solución: Error de migración DNI y Apellido

## Problema
```
Error: The column `User.apellido` does not exist in the current database.
```

## Solución Rápida

### Opción 1: Script de migración (Recomendado)

Ejecuta el script de migración que creé:

```bash
npm run db:migrate-dni
```

O directamente:

```bash
npx tsx scripts/migrate-dni-apellido.ts
```

### Opción 2: Prisma DB Push

Si tienes acceso a la base de datos:

```bash
npx prisma db push
```

### Opción 3: SQL Directo (Railway/Render)

Si estás en Railway o Render:

1. **Railway:**
   - Ve a tu proyecto → Servicio PostgreSQL
   - Pestaña "Data" → "Query"
   - Ejecuta:

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "apellido" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dni" TEXT;
ALTER TABLE "Profesor" ADD COLUMN IF NOT EXISTS "dni" TEXT;
```

2. **Render:**
   - Ve a tu base de datos PostgreSQL
   - Abre "Connect" → "psql"
   - Ejecuta el mismo SQL de arriba

### Opción 4: Railway CLI

```bash
railway run npx tsx scripts/migrate-dni-apellido.ts
```

O:

```bash
railway run npx prisma db push
```

## Verificación

Después de ejecutar la migración, verifica que funcionó:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' 
  AND column_name IN ('apellido', 'dni');
```

Deberías ver 2 filas con los campos `apellido` y `dni`.

## Importante

**Después de aplicar la migración, reinicia tu aplicación** para que los cambios surtan efecto.

## Si el error persiste

1. Verifica que el script se ejecutó correctamente
2. Verifica que la base de datos tiene los campos (usando el SQL de verificación)
3. Reinicia la aplicación completamente
4. Si usas Railway, haz un redeploy completo

