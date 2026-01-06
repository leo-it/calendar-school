# 🤖 Configuración del Asistente Virtual con Google Gemini

## 📋 Pasos para Configurar

### 1. Obtener API Key de Google Gemini (Gratis)

1. Ve a: https://makersuite.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key" o "Get API Key"
4. Copia la API key que se genera

⚠️ **IMPORTANTE**: 
- Si solo usas Google AI Studio (makersuite.google.com), **NO necesitas configurar facturación**
- Las requests simplemente se bloquean cuando alcanzas el límite (1,500/día)
- **NO se te cobrará automáticamente** sin tu consentimiento
- Solo se cobra si explícitamente configuras una cuenta de Google Cloud con tarjeta de crédito

### 2. Configurar en el Proyecto

Agrega la API key a tu archivo `.env` (o `.env.local`):

```bash
GEMINI_API_KEY=tu_api_key_aqui
```

### 3. Reiniciar el Servidor

```bash
npm run dev
```

## 🎯 Límites Gratuitos de Gemini

- **15 requests por minuto**
- **1,500 requests por día**
- Modelo: Gemini Pro

Esto es suficiente para la mayoría de escuelas pequeñas y medianas.

## ✅ Verificar que Funciona

1. Inicia sesión en la aplicación
2. Deberías ver un botón flotante de chat en la esquina inferior derecha
3. Haz clic y prueba con: "¿Qué clases de tango hay?"

## 🐛 Solución de Problemas

### Error: "GEMINI_API_KEY no configurada"
- Verifica que agregaste la variable en `.env`
- Reinicia el servidor después de agregar la variable

### Error: "API key inválida"
- Verifica que copiaste la API key correctamente
- Asegúrate de que no tenga espacios extra

### Error: "Límite de uso alcanzado"
- Has alcanzado el límite diario (1,500 requests)
- Espera hasta el día siguiente o considera usar otra opción

## 🔄 Alternativas

Si necesitas más capacidad, considera:
- **Groq**: 14,400 requests/día gratis
- **Ollama**: 100% gratis, pero requiere servidor propio

Ver `IDEAS_IA.md` para más detalles.

