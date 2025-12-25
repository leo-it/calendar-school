import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

// Debug: Verificar variables de entorno (siempre mostrar en producción)
console.log('🔍 [AUTH DEBUG] Inicializando NextAuth...')
console.log('  - NODE_ENV:', process.env.NODE_ENV)
console.log('  - Todas las variables de entorno disponibles:', Object.keys(process.env).filter(k => k.includes('NEXT') || k.includes('DATABASE') || k.includes('NODE') || k.includes('POSTGRES')).join(', '))
console.log('  - NEXTAUTH_SECRET existe:', !!process.env.NEXTAUTH_SECRET)
if (process.env.NEXTAUTH_SECRET) {
  console.log('  - NEXTAUTH_SECRET (primeros 10 chars):', process.env.NEXTAUTH_SECRET.substring(0, 10) + '...')
} else {
  console.error('  - NEXTAUTH_SECRET: ❌ NO CONFIGURADO')
  console.error('  - Verifica que la variable esté en Railway → Variables del servicio calendar-school')
  console.error('  - Asegúrate de hacer REDEPLOY después de añadir la variable')
}
console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ NO CONFIGURADO')
console.log('  - DATABASE_URL existe:', !!process.env.DATABASE_URL)
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL
  // Mostrar solo los primeros caracteres por seguridad
  const masked = dbUrl.substring(0, 20) + '...' + dbUrl.substring(dbUrl.length - 20)
  console.log('  - DATABASE_URL (masked):', masked)
} else {
  console.error('  - DATABASE_URL: ❌ NO CONFIGURADO')
  console.error('  - PROBLEMA: Railway no está pasando DATABASE_URL al runtime')
  console.error('  - SOLUCIÓN: Usa el valor directo en lugar de la referencia ${{Postgres.DATABASE_URL}}')
}

if (!process.env.NEXTAUTH_SECRET) {
  console.error('❌ ERROR CRÍTICO: NEXTAUTH_SECRET no está definido!')
  console.error('📋 PASOS PARA SOLUCIONAR:')
  console.error('   1. Ve a Railway → Servicio "calendar-school" → Pestaña "Variables"')
  console.error('   2. Verifica que NEXTAUTH_SECRET esté en la lista')
  console.error('   3. Si no está, añádela con: openssl rand -base64 32')
  console.error('   4. IMPORTANTE: Haz click en "Apply changes" o "Deploy" para hacer redeploy')
  console.error('   5. Las variables solo se aplican después de un redeploy')
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { escuela: true }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          escuelaId: user.escuelaId,
          esAdminEscuela: user.esAdminEscuela || false,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.escuelaId = user.escuelaId
        token.esAdminEscuela = user.esAdminEscuela || false
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.escuelaId = token.escuelaId as string | null
        session.user.esAdminEscuela = token.esAdminEscuela || false
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}



