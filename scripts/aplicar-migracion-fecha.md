# Aplicar Migración: Columna `fecha` en ClaseSubscription

## Problema
El schema de Prisma tiene el campo `fecha` en `ClaseSubscription`, pero la base de datos no tiene esa columna, causando errores al crear estudiantes.

## Solución

### Opción 1: Usar Prisma DB Push (Recomendado si tienes acceso a la base de datos)

```bash
# Si la base de datos está en localhost
DATABASE_URL="postgresql://almanaque:almanaque_dev_password@localhost:5432/almanaque?schema=public" npx prisma db push

# O si está en Docker y está corriendo
npx prisma db push
```

### Opción 2: Ejecutar SQL directamente

Si tienes acceso a la base de datos PostgreSQL, ejecuta el script SQL:

```bash
# Conectarte a la base de datos
psql -h localhost -U almanaque -d almanaque

# O si está en Docker
docker exec -i almanaque-postgres psql -U almanaque -d almanaque < scripts/add_fecha_column.sql
```

O ejecuta el contenido de `scripts/add_fecha_column.sql` directamente en tu cliente de PostgreSQL.

### Opción 3: Usar Prisma Studio

```bash
npx prisma studio
```

Luego ejecuta manualmente el SQL desde la interfaz.

## Verificación

Después de aplicar la migración, verifica que la columna existe:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ClaseSubscription' 
AND column_name = 'fecha';
```

Deberías ver una fila con `fecha` de tipo `timestamp without time zone` y `is_nullable = YES`.

