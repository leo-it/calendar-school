import { vi } from 'vitest'

// Mock de Next.js (solo para componentes React)
if (typeof window !== 'undefined') {
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  }))
}

// Mock de NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
  authOptions: {},
}))

// Mock de variables de entorno
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:7000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.GROQ_API_KEY = 'test-groq-key'

