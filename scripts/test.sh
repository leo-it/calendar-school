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
echo "✓ Tests passed (no test suite configured yet)"

