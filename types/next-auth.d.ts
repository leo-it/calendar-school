import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      escuelaId?: string | null
      esAdminEscuela?: boolean
    }
  }

  interface User {
    role: string
    id: string
    escuelaId?: string | null
    esAdminEscuela?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    id: string
    escuelaId?: string | null
    esAdminEscuela?: boolean
  }
}



