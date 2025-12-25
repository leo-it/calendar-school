import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

// Debug: Verificar variables de entorno (solo en producción para debugging)
if (process.env.NODE_ENV === 'production') {
  console.log('🔍 [DEBUG] Verificando variables de entorno:')
  console.log('  - NODE_ENV:', process.env.NODE_ENV)
  console.log('  - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Configurado (' + process.env.NEXTAUTH_SECRET.substring(0, 10) + '...)' : '❌ NO CONFIGURADO')
  console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ NO CONFIGURADO')
  console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurado' : '❌ NO CONFIGURADO')
  
  if (!process.env.NEXTAUTH_SECRET) {
    console.error('❌ ERROR CRÍTICO: NEXTAUTH_SECRET no está configurado en producción!')
    console.error('Por favor, añade la variable NEXTAUTH_SECRET en Railway.')
  }
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



