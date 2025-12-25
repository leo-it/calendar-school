# Solución Rápida: Error NO_SECRET en Railway

## El Problema
```
[next-auth][error][NO_SECRET] Please define a `secret` in production.
```

## Solución Paso a Paso

### 1. Verificar que la variable existe en Railway

1. Ve a Railway → Tu proyecto
2. Click en el **servicio de la aplicación** (no el de PostgreSQL)
3. Ve a la pestaña **"Variables"**
4. Busca `NEXTAUTH_SECRET` en la lista
5. **Verifica que:**
   - El nombre sea exactamente `NEXTAUTH_SECRET` (sin espacios, mayúsculas correctas)
   - Tenga un valor asignado (debería estar oculto con `****`)
   - No tenga espacios al inicio o final

### 2. Si NO existe o está mal:

**A. Crear/Editar la variable:**
1. Click en **"+ New Variable"** (o edita la existente)
2. Nombre: `NEXTAUTH_SECRET` (exactamente así)
3. Valor: `2GbO/+HMgzRvdt8jx8BGDFOeJHjRQv80Myuluia9SYg=`
4. Click en **"Add"** o **"Save"**

**B. Verificar que se guardó:**
- Deberías ver `NEXTAUTH_SECRET` en la lista de variables
- Debería mostrar `****` como valor (por seguridad)

### 3. Reiniciar el servicio (MUY IMPORTANTE)

**Opción A: Redeploy**
1. Ve a la pestaña **"Deployments"**
2. Click en los **tres puntos (⋯)** del deployment más reciente
3. Selecciona **"Redeploy"**
4. Espera a que termine el deploy

**Opción B: Restart Service**
1. Ve a **"Settings"**
2. Busca **"Restart Service"** o **"Restart"**
3. Click en restart

### 4. Verificar que funcionó

1. Espera 1-2 minutos después del redeploy
2. Recarga la página de tu aplicación
3. El error debería desaparecer

## Si sigue sin funcionar

### Verificar en los logs

1. Ve a **"Deployments"** → Click en el deployment más reciente
2. Revisa los logs
3. Busca líneas que digan:
   ```
   NEXTAUTH_SECRET: ✅ Set
   ```
   O si ves:
   ```
   NEXTAUTH_SECRET: ❌ Missing
   ```
   Significa que la variable no se está cargando.

### Debug temporal

Puedes añadir temporalmente en `lib/auth.ts` (solo para debug):

```typescript
console.log('NEXTAUTH_SECRET check:', process.env.NEXTAUTH_SECRET ? '✅ Exists' : '❌ Missing')
```

Luego haz redeploy y revisa los logs. Si dice "Missing", la variable no se está cargando correctamente.

### Solución alternativa: Hardcode temporal (solo para testing)

Si nada funciona, puedes temporalmente hardcodear el secret en `lib/auth.ts`:

```typescript
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || '2GbO/+HMgzRvdt8jx8BGDFOeJHjRQv80Myuluia9SYg=',
  // ... resto del código
}
```

**⚠️ IMPORTANTE**: Esto es solo para testing. En producción real, NUNCA hardcodees secrets en el código. Usa siempre variables de entorno.

## Checklist Final

- [ ] Variable `NEXTAUTH_SECRET` existe en Railway
- [ ] Nombre es exactamente `NEXTAUTH_SECRET` (sin espacios)
- [ ] Tiene un valor asignado
- [ ] Se hizo redeploy después de añadir/editar la variable
- [ ] Esperaste 1-2 minutos después del redeploy
- [ ] Recargaste la página de la aplicación

## Variables Requeridas (Verificar todas)

Asegúrate de tener TODAS estas variables en el servicio de la aplicación:

```
✅ DATABASE_URL
✅ NEXTAUTH_URL
✅ NEXTAUTH_SECRET
✅ NODE_ENV=production
```

Si falta alguna, la aplicación no funcionará correctamente.

