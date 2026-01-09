import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import ServiceWorkerRegistration from './sw-register'
import ChatbotAssistant from '@/components/ChatbotAssistant'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Almanaque de Clases',
  description: 'Sistema de gestión de clases de danza con calendario interactivo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Almanaque',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isChatbotEnabled = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim())
  
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Almanaque" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          {isChatbotEnabled && <ChatbotAssistant />}
        </Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}



