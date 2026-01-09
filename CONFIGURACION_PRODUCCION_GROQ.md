# 🚀 Configurar Groq en Producción

Esta guía explica cómo configurar la API key de Groq para que el chatbot funcione en producción.

## 📋 Pasos para Configurar

### 1. Obtener API Key de Groq (si no la tienes)

1. Ve a: https://console.groq.com
2. Inicia sesión con tu cuenta
3. Haz clic en "API Keys" en el menú lateral
4. Haz clic en "Create API Key"
5. Copia la API key que se genera

### 2. Agregar Variable de Entorno en Producción

Según tu plataforma de hosting:

---

## 🚂 Railway.app

1. **Ve a tu proyecto en Railway**
   - https://railway.app
   - Selecciona tu proyecto

2. **Selecciona el servicio de la aplicación** (no el de PostgreSQL)

3. **Ve a la pestaña "Variables"**

4. **Haz clic en "+ New Variable" o "Add Variable"**

5. **Agrega la variable:**
   ```
   Nombre: GROQ_API_KEY
   Valor: tu_api_key_de_groq_aqui
   ```

6. **Haz clic en "Add" o "Save"**

7. **⚠️ IMPORTANTE: Hacer Redeploy**
   - Después de agregar la variable, Railway NO la aplica automáticamente
   - Si ves "X Changes" en la parte superior, haz clic en **"Apply X changes"** o presiona **"Deploy ↑+Enter"**
   - Espera 1-2 minutos a que termine el despliegue

8. **Verificar que funciona:**
   - Ve a los logs del servicio
   - Deberías ver: `✅ GROQ_API_KEY configurada (longitud: XX)`
   - Prueba el chatbot en tu aplicación

---

## 🎨 Render.com

1. **Ve a tu proyecto en Render**
   - https://render.com
   - Selecciona tu servicio web

2. **Ve a la sección "Environment"**

3. **Haz clic en "Add Environment Variable"**

4. **Agrega la variable:**
   ```
   Key: GROQ_API_KEY
   Value: tu_api_key_de_groq_aqui
   ```

5. **Haz clic en "Save Changes"**

6. **Render desplegará automáticamente** (puede tardar 2-5 minutos)

7. **Verificar que funciona:**
   - Ve a los logs del servicio
   - Deberías ver: `✅ GROQ_API_KEY configurada (longitud: XX)`
   - Prueba el chatbot en tu aplicación

---

## 🐳 Docker / Servidor Propio

Si estás usando Docker o un servidor propio:

### Opción 1: Variables de entorno en docker-compose.yml

Edita tu `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      # ... otras variables ...
      GROQ_API_KEY: ${GROQ_API_KEY}
```

Luego en tu `.env` o `.env.production`:
```bash
GROQ_API_KEY=tu_api_key_de_groq_aqui
```

### Opción 2: Variables de entorno del sistema

En tu servidor, exporta la variable:
```bash
export GROQ_API_KEY=tu_api_key_de_groq_aqui
```

O agrégalo a `/etc/environment` (Linux) o tu archivo de configuración del sistema.

---

## ✅ Verificar que Funciona

### 1. Revisar los Logs

Después del despliegue, revisa los logs de tu aplicación. Deberías ver:
```
✅ GROQ_API_KEY configurada (longitud: 56)
🔄 Iniciando llamada a Groq...
✅ Respuesta recibida de Groq
```

### 2. Probar el Chatbot

1. Ve a tu aplicación en producción
2. Inicia sesión
3. Haz clic en el botón del chatbot (esquina inferior derecha)
4. Escribe un mensaje de prueba: "Hola"
5. Deberías recibir una respuesta del asistente

### 3. Si hay Errores

**Error: "GROQ_API_KEY no configurada"**
- Verifica que agregaste la variable en la plataforma de hosting
- Asegúrate de haber hecho redeploy después de agregar la variable
- Verifica que el nombre de la variable sea exactamente `GROQ_API_KEY` (sin espacios)

**Error: "API key inválida"**
- Verifica que copiaste la API key correctamente
- Asegúrate de que no tenga espacios extra al inicio o final
- Genera una nueva API key en https://console.groq.com si es necesario

**Error: "Límite de uso alcanzado"**
- Has alcanzado el límite diario (14,400 requests)
- Espera hasta el día siguiente (se resetea cada 24 horas)

---

## 🔒 Seguridad

- ✅ **NUNCA** compartas tu API key públicamente
- ✅ **NUNCA** la subas a GitHub o repositorios públicos
- ✅ Usa variables de entorno en lugar de hardcodearla
- ✅ La API key solo debe estar en:
  - `.env.local` (desarrollo local, NO se sube a Git)
  - Variables de entorno de tu plataforma de hosting (producción)

---

## 📚 Recursos

- Console de Groq: https://console.groq.com
- Documentación: https://console.groq.com/docs
- Límites gratuitos: 14,400 requests/día

---

## 🆘 ¿Necesitas Ayuda?

Si después de seguir estos pasos el chatbot no funciona:

1. **Revisa los logs** de tu aplicación en producción
2. **Verifica** que la variable esté configurada correctamente
3. **Prueba** con el script de test local: `node scripts/test-groq.js`
4. **Contacta** al equipo de desarrollo con los logs de error

