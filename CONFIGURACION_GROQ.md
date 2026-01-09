# 🤖 Configuración del Asistente Virtual con Groq (GRATIS)

## 📋 Pasos para Configurar

### 1. Obtener API Key de Groq (100% Gratis)

1. Ve a: https://console.groq.com
2. Inicia sesión con tu cuenta de Google, GitHub o email
3. Haz clic en "API Keys" en el menú lateral
4. Haz clic en "Create API Key"
5. Copia la API key que se genera

⚠️ **IMPORTANTE**: 
- **NO necesitas tarjeta de crédito**
- **Es completamente gratis**
- Las requests simplemente se bloquean cuando alcanzas el límite (muy generoso)

### 2. Configurar en el Proyecto

Agrega la API key a tu archivo `.env.local`:

```bash
GROQ_API_KEY=tu_api_key_aqui
```

### 3. Reiniciar el Servidor

```bash
npm run dev
```

## 🎯 Límites Gratuitos de Groq

- **14,400 requests por día** (muy generoso)
- **30 requests por minuto**
- Modelos disponibles:
  - `llama-3.3-70b-versatile` (más potente, recomendado)
  - `llama-3.1-8b-instant` (más rápido)
  - `mixtral-8x7b-32768` (alternativa)

Esto es más que suficiente para cualquier escuela.

## ✅ Verificar que Funciona

1. Inicia sesión en la aplicación
2. Deberías ver un botón flotante de chat en la esquina inferior derecha
3. Haz clic y prueba con: "¿Qué clases de tango hay?"

## 🐛 Solución de Problemas

### Error: "GROQ_API_KEY no configurada"
- Verifica que agregaste la variable en `.env.local`
- Reinicia el servidor después de agregar la variable

### Error: "API key inválida"
- Verifica que copiaste la API key correctamente
- Asegúrate de que no tenga espacios extra
- Obtén una nueva API key en https://console.groq.com

### Error: "Límite de uso alcanzado"
- Has alcanzado el límite diario (14,400 requests)
- Espera hasta el día siguiente (se resetea cada 24 horas)

## 🚀 Ventajas de Groq

- ✅ **100% Gratis** - No requiere tarjeta de crédito
- ✅ **Muy rápido** - Respuestas en milisegundos
- ✅ **Muy confiable** - Infraestructura robusta
- ✅ **Límites generosos** - 14,400 requests/día
- ✅ **Modelos de última generación** - Llama 3.1, Mixtral

## 📚 Recursos

- Console de Groq: https://console.groq.com
- Documentación: https://console.groq.com/docs
- Modelos disponibles: https://console.groq.com/docs/models

