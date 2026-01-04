'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Evitar errores de hidratación: solo renderizar en el cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Verificar si el navegador soporta la instalación
    if (!('serviceWorker' in navigator)) {
      return
    }

    // Solo mostrar en HTTPS o localhost
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return
    }

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Verificar si ya está instalada cuando cambia el display mode
    const handleDisplayModeChange = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        setIsInstallable(false)
      }
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      mediaQuery.removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Si no hay prompt disponible, intentar desde el menú
      alert('Por favor, usa el menú del navegador (⋮) → "Instalar app" para instalar la aplicación.')
      return
    }

    setIsLoading(true)

    try {
      // Mostrar el prompt de instalación
      await deferredPrompt.prompt()

      // Esperar a que el usuario responda
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('✅ Usuario aceptó la instalación')
        setIsInstalled(true)
        setIsInstallable(false)
      } else {
        console.log('❌ Usuario rechazó la instalación')
      }

      // Limpiar el prompt
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Error al instalar:', error)
      alert('Error al instalar la aplicación. Por favor, intenta desde el menú del navegador.')
    } finally {
      setIsLoading(false)
    }
  }

  // No renderizar nada hasta que el componente esté montado en el cliente
  // Esto evita errores de hidratación
  if (!mounted) {
    return null
  }

  // No mostrar si ya está instalada
  if (isInstalled) {
    return null
  }

  // No mostrar si no es instalable y no estamos en un navegador compatible
  if (!isInstallable && typeof window !== 'undefined') {
    // Solo mostrar en Chrome/Edge (navegadores que soportan beforeinstallprompt)
    // Safari no soporta beforeinstallprompt, pero podemos mostrar el botón con instrucciones
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isEdge = /Edg/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent)
    
    // En Safari, mostrar el botón con instrucciones diferentes
    if (isSafari) {
      return (
        <button
          onClick={() => {
            alert('Para instalar en Safari:\n\n1. Toca el botón de compartir (□↑) en la parte inferior\n2. Selecciona "Agregar a pantalla de inicio"\n3. Toca "Agregar"')
          }}
          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors text-sm font-medium"
        >
          📱 Descargar App
        </button>
      )
    }
    
    if (!isChrome && !isEdge) {
      return null
    }
  }

  return (
    <button
      onClick={handleInstallClick}
      disabled={isLoading || !isInstallable}
      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      title={!isInstallable ? 'La instalación estará disponible pronto. Mientras tanto, usa el menú del navegador (⋮) → "Instalar app"' : 'Instalar aplicación en tu dispositivo'}
    >
      {isLoading ? 'Instalando...' : '📱 Descargar App'}
    </button>
  )
}

