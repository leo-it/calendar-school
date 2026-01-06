# 🔒 Medidas de Seguridad del Chatbot

Este documento detalla todas las medidas de seguridad implementadas para proteger el chatbot de inyección de código, ataques y uso malicioso.

## 🛡️ Medidas Implementadas

### 1. **Validación y Sanitización de Mensajes**

- ✅ **Límite de longitud**: Máximo 2,000 caracteres por mensaje
- ✅ **Detección de patrones maliciosos**: Se detectan y bloquean:
  - Scripts HTML/JavaScript (`<script>`, `javascript:`)
  - Event handlers (`onclick`, `onerror`, etc.)
  - Comandos de ejecución (`eval`, `exec`, `system`, etc.)
  - Funciones peligrosas de PHP/Node (`shell_exec`, `proc_open`, etc.)
- ✅ **Sanitización**: Remoción de caracteres peligrosos usando `sanitizeString()`
- ✅ **Validación de contenido vacío**: Rechaza mensajes que solo contienen caracteres peligrosos

### 2. **Validación del Historial de Conversación**

- ✅ **Límite de mensajes**: Máximo 20 mensajes en el historial
- ✅ **Validación de estructura**: Solo acepta mensajes con formato válido (`role` y `content`)
- ✅ **Sanitización de cada mensaje**: Cada mensaje del historial se sanitiza antes de usar
- ✅ **Filtrado de mensajes maliciosos**: Se eliminan mensajes que contienen patrones peligrosos

### 3. **Rate Limiting (Límite de Solicitudes)**

- ✅ **Límite por usuario**: 15 solicitudes por minuto por usuario
- ✅ **Identificación única**: Usa el ID del usuario para rastrear solicitudes
- ✅ **Ventana de tiempo**: 60 segundos (1 minuto)
- ✅ **Respuesta clara**: Devuelve error 429 cuando se excede el límite

### 4. **Límites de Contexto**

- ✅ **Límite total de contexto**: Máximo 10,000 caracteres en el contexto enviado al modelo
- ✅ **Truncado automático**: Si el contexto es demasiado grande, se trunca automáticamente
- ✅ **Protección contra overflow**: Previene envío de contextos excesivamente grandes

### 5. **Sanitización de Respuestas**

- ✅ **Sanitización de salida**: Las respuestas del modelo también se sanitizan antes de enviar al cliente
- ✅ **Límite de longitud de respuesta**: Máximo 4,000 caracteres en la respuesta

### 6. **Autenticación y Autorización**

- ✅ **Uso sin sesión permitido**: El chatbot está disponible para usuarios no autenticados para ayudar con el registro
- ✅ **Rate limiting por IP**: Usuarios sin sesión tienen rate limiting basado en su IP
- ✅ **Rate limiting por usuario**: Usuarios autenticados tienen rate limiting basado en su ID de usuario
- ✅ **Aislamiento por usuario**: Cada usuario autenticado solo ve su propio contexto
- ✅ **Información general para no autenticados**: Usuarios sin sesión ven información general de clases y la escuela

### 7. **Manejo Seguro de Errores**

- ✅ **No exposición de detalles**: En producción, no se exponen detalles técnicos de errores
- ✅ **Logging seguro**: Los errores se registran en el servidor pero no se envían al cliente
- ✅ **Mensajes genéricos**: Los usuarios ven mensajes amigables, no detalles técnicos

## 🚫 Patrones Bloqueados

El sistema detecta y bloquea automáticamente:

- **Inyección de código JavaScript**: `<script>`, `javascript:`, `eval()`
- **Event handlers maliciosos**: `onclick`, `onerror`, `onload`, etc.
- **Comandos de ejecución**: `exec()`, `system()`, `shell_exec()`, etc.
- **SQL Injection**: Comandos SQL peligrosos (aunque Prisma ya protege contra esto)
- **XSS (Cross-Site Scripting)**: Tags HTML peligrosos

## 📊 Límites Configurados

| Recurso | Límite | Propósito |
|---------|--------|-----------|
| Longitud de mensaje | 2,000 caracteres | Prevenir mensajes excesivamente largos |
| Historial de conversación | 20 mensajes | Limitar el contexto enviado |
| Contexto total | 10,000 caracteres | Prevenir overflow |
| Rate limit (autenticado) | 15 req/min por usuario | Prevenir abuso |
| Rate limit (no autenticado) | 15 req/min por IP | Prevenir abuso |
| Respuesta máxima | 4,000 caracteres | Limitar tamaño de respuesta |

## 🔍 Monitoreo

- ✅ **Logging de intentos maliciosos**: Se registran en la consola del servidor
- ✅ **Detección de patrones**: Se detectan automáticamente intentos de inyección
- ✅ **Rate limiting visible**: Los usuarios ven mensajes claros cuando exceden límites

## 🚀 Recomendaciones Adicionales para Producción

1. **Implementar Redis para Rate Limiting**: El rate limiting actual usa memoria. En producción, usar Redis es más robusto.

2. **Monitoreo de logs**: Configurar alertas para detectar múltiples intentos de inyección desde la misma IP/usuario.

3. **Whitelist de modelos**: En producción, solo permitir modelos específicos que sabes que funcionan.

4. **Validación adicional**: Considerar agregar validación de contenido usando servicios como Google Cloud Safety Settings.

5. **Backup de conversaciones**: Si necesitas guardar conversaciones, asegúrate de sanitizar antes de guardar en la base de datos.

## ✅ Verificación

Para verificar que las medidas funcionan, puedes probar:

1. **Mensaje con script**: Envía `<script>alert('test')</script>` → Debe ser rechazado
2. **Mensaje muy largo**: Envía un mensaje de más de 2,000 caracteres → Debe ser rechazado
3. **Rate limiting**: Envía 20 mensajes rápidamente → Debe bloquear después de 15
4. **Mensaje normal**: Envía "¿Qué clases hay?" → Debe funcionar normalmente

## 📝 Notas Importantes

- Las medidas de seguridad están activas **por defecto**
- Los mensajes se sanitizan **antes** de enviarse al modelo de IA
- Las respuestas también se sanitizan **antes** de enviarse al cliente
- El rate limiting es **por usuario** para autenticados, **por IP** para no autenticados
- El chatbot está disponible **sin sesión** para ayudar con el registro y consultas generales
- Usuarios no autenticados ven información general de clases y la escuela, pero no pueden ver sus inscripciones personales

