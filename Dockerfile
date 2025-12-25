# Dockerfile optimizado con multi-stage build para Next.js
# Stage 1: Dependencies - Instalar dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder - Construir la aplicación
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependencias del stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma Client con binaryTargets específicos
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-arm64-openssl-3.0.x
RUN npx prisma generate

# Crear directorio public si no existe (Next.js lo necesita)
RUN mkdir -p public

# Construir la aplicación Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Runner - Imagen de producción optimizada
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl libc6-compat

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios desde el builder
# Next.js standalone output incluye todo lo necesario en .next/standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copiar public (ya existe porque lo creamos en el builder)
COPY --from=builder /app/public ./public

# Copiar Prisma schema y binarios necesarios para db push en runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copiar script de inicio
COPY --from=builder /app/start.sh ./start.sh

# Cambiar ownership de los archivos
RUN chown -R nextjs:nodejs /app
RUN chmod +x start.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["./start.sh"]

