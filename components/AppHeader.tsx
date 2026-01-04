'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface AppHeaderProps {
  title: string
  subtitle?: string
  user: {
    id: string
    email: string
    name?: string | null
    role: string
    esAdminEscuela?: boolean
  }
  currentPath?: string
  nombreEscuela?: string | null
}

export default function AppHeader({ title, subtitle, user, currentPath, nombreEscuela }: AppHeaderProps) {
  const router = useRouter()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const menuItems = [
    {
      label: 'Calendario',
      path: '/calendario',
      show: true,
      icon: '📅',
    },
    {
      label: 'Panel Admin',
      path: '/admin',
      show: user.role === 'ADMIN' || (user.role === 'PROFESOR' && user.esAdminEscuela),
      icon: '⚙️',
    },
    {
      label: 'Dashboard',
      path: '/profesor',
      show: user.role === 'PROFESOR',
      icon: '👨‍🏫',
    },
    {
      label: 'Nueva Clase',
      path: '/clases/nueva',
      show: user.role === 'ADMIN' || user.role === 'PROFESOR',
      icon: '➕',
    },
  ]

  const handleMenuItemClick = (path: string) => {
    router.push(path)
    setMenuAbierto(false)
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {subtitle}
                {nombreEscuela && (user.role === 'ESTUDIANTE' || user.role === 'PROFESOR') && (
                  <span className="ml-2 text-primary-600 font-medium">• {nombreEscuela}</span>
                )}
              </p>
            )}
            {!subtitle && nombreEscuela && (user.role === 'ESTUDIANTE' || user.role === 'PROFESOR') && (
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                <span className="text-primary-600 font-medium">{nombreEscuela}</span>
              </p>
            )}
          </div>
          
          {/* Desktop: Botones visibles */}
          <div className="hidden md:flex items-center gap-2">
            {menuItems
              .filter(item => item.show)
              .map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPath === item.path
                      ? 'bg-primary-600 text-white'
                      : item.path === '/clases/nueva'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : item.path === '/admin'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : item.path === '/profesor'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Mobile: Menú de elipsis - SIEMPRE VISIBLE */}
          <div className="md:hidden relative ml-2">
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="p-2 text-gray-700 hover:text-gray-900 focus:outline-none rounded-lg hover:bg-gray-100"
              aria-label="Menú de opciones"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Menú desplegable */}
            {menuAbierto && (
              <>
                {/* Overlay para cerrar al hacer clic fuera */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuAbierto(false)}
                />
                {/* Menú */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    {menuItems
                      .filter(item => item.show)
                      .map((item) => (
                        <button
                          key={item.path}
                          onClick={() => handleMenuItemClick(item.path)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            currentPath === item.path ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={() => {
                        signOut({ callbackUrl: '/login' })
                        setMenuAbierto(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      🚪 Cerrar Sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

