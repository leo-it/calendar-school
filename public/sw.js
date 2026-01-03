// Service Worker para PWA
const CACHE_NAME = 'almanaque-v1'
const urlsToCache = [
  '/',
  '/calendario',
  '/login',
  '/manifest.json',
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto')
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('Error al cachear recursos:', error)
      })
  )
  self.skipWaiting()
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Estrategia: Network First, luego Cache
self.addEventListener('fetch', (event) => {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') {
    return
  }

  // No cachear requests a la API
  if (event.request.url.includes('/api/')) {
    return
  }

  // No cachear recursos externos (Google Fonts, etc.) que pueden violar CSP
  if (event.request.url.startsWith('http') && !event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Solo cachear respuestas válidas del mismo origen
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {
              // Ignorar errores de cache (puede fallar por CSP)
            })
          })
        }
        return response
      })
      .catch(() => {
        // Si falla la red, intentar desde el cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 })
        })
      })
  )
})

