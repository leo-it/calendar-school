#!/bin/bash
# Script de test para pre-commit hooks

echo "🧪 Running tests..."

# Ejecutar lint y capturar salida
LINT_OUTPUT=$(npm run lint 2>&1)
LINT_EXIT_CODE=$?

# Mostrar salida del lint
echo "$LINT_OUTPUT"

# Verificar si hay errores (no warnings)
if echo "$LINT_OUTPUT" | grep -q "Error:"; then
  echo ""
  echo "❌ Lint errors found. Please fix them before committing."
  exit 1
fi

# Si el lint falló por otra razón, también fallar
if [ $LINT_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Lint failed. Please fix the issues before committing."
  exit 1
fi

echo ""
echo "✓ Lint passed (warnings are allowed)"

# Ejecutar tests unitarios
echo ""
echo "🧪 Running unit tests..."
TEST_OUTPUT=$(npm run test 2>&1)
TEST_EXIT_CODE=$?

# Mostrar salida de tests
echo "$TEST_OUTPUT"

# Si los tests fallaron, fallar el commit
if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Tests failed. Please fix the issues before committing."
  exit 1
fi

echo ""
echo "✓ Tests passed"

