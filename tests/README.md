# 🧪 Guía de Testing

Esta guía explica cómo escribir y ejecutar tests para asegurar que el código funcione correctamente y sea predecible.

## 🎯 Objetivo

Los tests aseguran que:
- ✅ Los servicios funcionen correctamente
- ✅ El comportamiento sea predecible
- ✅ Los cambios no rompan funcionalidades anteriores (regression testing)

## 🚀 Ejecutar Tests

### Todos los tests
```bash
npm run test
```

### Modo watch (se ejecutan automáticamente al cambiar archivos)
```bash
npm run test:watch
```

### Interfaz visual
```bash
npm run test:ui
```

### Con cobertura de código
```bash
npm run test:coverage
```

## 📁 Estructura de Tests

```
tests/
├── api/              # Tests de APIs
│   ├── clases.test.ts
│   ├── ai-chat.test.ts
│   └── auth.test.ts
├── services/         # Tests de servicios (cuando se creen)
├── components/       # Tests de componentes React
├── helpers/          # Helpers y mocks
│   └── prisma-mock.ts
└── setup.ts         # Configuración global
```

## ✍️ Escribir Tests

### Estructura de un Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Nombre del módulo', () => {
  beforeEach(() => {
    // Limpiar mocks antes de cada test
    vi.clearAllMocks()
  })

  it('debe hacer algo específico', async () => {
    // Arrange: Preparar datos y mocks
    const mockData = { id: '123' }
    vi.mocked(prisma.clase.findUnique).mockResolvedValue(mockData)

    // Act: Ejecutar la función a testear
    const result = await obtenerClase('123')

    // Assert: Verificar el resultado
    expect(result).toEqual(mockData)
    expect(prisma.clase.findUnique).toHaveBeenCalledWith({
      where: { id: '123' }
    })
  })
})
```

### Testing de APIs

```typescript
import { POST } from '@/app/api/clases/route'
import { NextRequest } from 'next/server'

it('debe crear una clase exitosamente', async () => {
  // Mock de sesión
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: 'user-123', role: 'PROFESOR' }
  })

  const request = new NextRequest('http://localhost:7000/api/clases', {
    method: 'POST',
    body: JSON.stringify({ titulo: 'Clase de Tango' }),
    headers: { 'Content-Type': 'application/json' },
  })

  const response = await POST(request)
  const data = await response.json()

  expect(response.status).toBe(201)
  expect(data).toHaveProperty('id')
})
```

### Testing con Mocks

```typescript
// Mock de Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: createPrismaMock(),
}))

// Mock de NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Usar datos de prueba predefinidos
import { testData } from '../helpers/prisma-mock'
```

## 📋 Checklist de Testing

### Para cada API:
- [ ] Test de caso exitoso
- [ ] Test de autenticación requerida
- [ ] Test de autorización (roles)
- [ ] Test de validación de datos
- [ ] Test de manejo de errores

### Para cada servicio:
- [ ] Test de lógica de negocio
- [ ] Test de casos edge
- [ ] Test de errores esperados

## 🎨 Buenas Prácticas

1. **Nombres descriptivos**: `it('debe rechazar crear clase si el usuario no es profesor')`
2. **AAA Pattern**: Arrange, Act, Assert
3. **Un test, una cosa**: Cada test debe verificar una funcionalidad específica
4. **Mocks aislados**: Limpiar mocks entre tests con `beforeEach`
5. **Datos de prueba**: Usar `testData` helper para datos consistentes

## 🔍 Debugging Tests

Si un test falla:

1. **Ver el output completo**:
   ```bash
   npm run test -- --reporter=verbose
   ```

2. **Ejecutar un test específico**:
   ```bash
   npm run test clases.test.ts
   ```

3. **Modo watch para desarrollo**:
   ```bash
   npm run test:watch
   ```

## 📊 Cobertura de Código

Ver qué partes del código están cubiertas por tests:

```bash
npm run test:coverage
```

Luego abre `coverage/index.html` en el navegador.

## 🚨 Tests en CI/CD

Los tests se ejecutan automáticamente:
- En pre-commit hooks (antes de cada commit)
- En GitHub Actions (en cada push)

Si los tests fallan, el commit/push será rechazado.

