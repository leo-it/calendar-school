'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RegistroFormProps {
  escuelaSlug?: string
}

export default function RegistroForm({ escuelaSlug }: RegistroFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    apellido: '',
    dni: '',
    phone: '',
    role: 'ESTUDIANTE' as 'ESTUDIANTE' | 'PROFESOR',
    escuelaId: '',
    codigoInvitacion: '',
    nombreEscuela: '', // Para crear nueva escuela si es profesor
  })
  const [codigoValido, setCodigoValido] = useState(false)
  const [validandoCodigo, setValidandoCodigo] = useState(false)
  const [escuelas, setEscuelas] = useState<any[]>([])
  const [escuelaSeleccionada, setEscuelaSeleccionada] = useState<any>(null)
  const [nombreEscuelaBuscado, setNombreEscuelaBuscado] = useState('')
  const [buscandoEscuela, setBuscandoEscuela] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingEscuelas, setLoadingEscuelas] = useState(true)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Cargar escuelas disponibles y buscar por slug si viene en la URL
  useEffect(() => {
    const cargarEscuelas = async () => {
      try {
        // Si hay un slug en la URL, buscar esa escuela específica
        if (escuelaSlug) {
          const response = await fetch(`/api/escuelas/buscar?nombre=${encodeURIComponent(escuelaSlug)}`)
          if (response.ok) {
            const escuela = await response.json()
            setEscuelaSeleccionada(escuela)
            setFormData(prev => ({ ...prev, escuelaId: escuela.id }))
          } else {
            setError('Escuela no encontrada')
          }
        }
      } catch (err) {
        console.error('Error al cargar escuelas:', err)
      } finally {
        setLoadingEscuelas(false)
      }
    }
    cargarEscuelas()
  }, [escuelaSlug])

  // Buscar escuela por nombre cuando el usuario escribe
  const buscarEscuelaPorNombre = async (nombre: string) => {
    if (!nombre || nombre.trim() === '') {
      setEscuelaSeleccionada(null)
      setFormData(prev => ({ ...prev, escuelaId: '' }))
      return
    }

    setBuscandoEscuela(true)
    try {
      const response = await fetch(`/api/escuelas/buscar?nombre=${encodeURIComponent(nombre.trim())}`)
      if (response.ok) {
        const escuela = await response.json()
        setEscuelaSeleccionada(escuela)
        setFormData(prev => ({ ...prev, escuelaId: escuela.id }))
        setError('')
      } else {
        setEscuelaSeleccionada(null)
        setFormData(prev => ({ ...prev, escuelaId: '' }))
        setError('Escuela no encontrada. Verifica que hayas escrito el nombre correctamente.')
      }
    } catch (err) {
      console.error('Error al buscar escuela:', err)
      setEscuelaSeleccionada(null)
      setFormData(prev => ({ ...prev, escuelaId: '' }))
      setError('Error al buscar la escuela')
    } finally {
      setBuscandoEscuela(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    // Validar que profesor tenga nombre de escuela o código de invitación
    if (formData.role === 'PROFESOR') {
      if (!formData.nombreEscuela && !formData.codigoInvitacion) {
        setError('Debes proporcionar el nombre de tu escuela o un código de invitación')
        setLoading(false)
        return
      }
      
      // Si usa código de invitación, debe estar validado
      if (formData.codigoInvitacion && !codigoValido) {
        setError('Por favor, valida tu código de invitación antes de continuar')
        setLoading(false)
        return
      }
    }

    // Validar que estudiante tenga escuela seleccionada
    if (formData.role === 'ESTUDIANTE' && !escuelaSeleccionada) {
      setError('Debes escribir el nombre de la escuela y verificar que existe')
      setLoading(false)
      return
    }

    // Si viene de una URL con escuela, asegurar que se use
    let escuelaIdFinal = formData.escuelaId
    if (escuelaSeleccionada && !escuelaIdFinal) {
      escuelaIdFinal = escuelaSeleccionada.id
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          apellido: formData.apellido || undefined,
          dni: formData.dni || undefined,
          phone: formData.phone || undefined,
          role: formData.role,
          escuelaId: escuelaIdFinal || undefined,
          codigoInvitacion: formData.role === 'PROFESOR' && formData.codigoInvitacion ? formData.codigoInvitacion : undefined,
          nombreEscuela: formData.role === 'PROFESOR' && formData.nombreEscuela ? formData.nombreEscuela : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Error al registrar usuario'
        const errorDetails = data.details ? ` (${data.details})` : ''
        setError(errorMessage + errorDetails)
        setLoading(false)
        return
      }

      // Registro exitoso, redirigir al login (con el mismo slug si existe)
      const loginUrl = escuelaSlug ? `/login/${escuelaSlug}` : '/login'
      router.push(`${loginUrl}?registrado=true`)
    } catch (err) {
      setError('Error al registrar usuario')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Registro
        </h1>
        {escuelaSeleccionada && (
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm text-primary-800">
              <strong>Escuela:</strong> {escuelaSeleccionada.nombre}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
              Apellido (opcional)
            </label>
            <input
              id="apellido"
              type="text"
              value={formData.apellido}
              onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              placeholder="Tu apellido"
            />
          </div>

          <div>
            <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1">
              DNI (opcional)
            </label>
            <input
              id="dni"
              type="text"
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              placeholder="DNI"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono (opcional)
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              placeholder="+5491112345678"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de cuenta
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => {
                setFormData({ ...formData, role: e.target.value as 'ESTUDIANTE' | 'PROFESOR', codigoInvitacion: '' })
                setCodigoValido(false)
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            >
              <option value="ESTUDIANTE">Estudiante</option>
              <option value="PROFESOR">Profesor</option>
            </select>
          </div>

          {formData.role === 'PROFESOR' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  ¿Eres el primer profesor de tu escuela?
                </p>
                <p className="text-xs text-blue-700">
                  Si eres el fundador o administrador de tu escuela, escribe el nombre de tu escuela. 
                  Si ya existe una escuela y te invitaron, usa el código de invitación.
                </p>
              </div>
              
              <div>
                <label htmlFor="nombreEscuela" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de tu Escuela (si eres el primer profesor)
                </label>
                <input
                  id="nombreEscuela"
                  type="text"
                  value={formData.nombreEscuela}
                  onChange={(e) => {
                    setFormData({ ...formData, nombreEscuela: e.target.value, codigoInvitacion: '' })
                    setCodigoValido(false)
                  }}
                  placeholder="Ej: Duo Tricks, La Central..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si escribes el nombre de tu escuela, serás el administrador de la misma y podrás invitar otros profesores.
                </p>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">O</span>
                </div>
              </div>

              <div>
                <label htmlFor="codigoInvitacion" className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Invitación (si te invitaron a una escuela existente)
                </label>
                <div className="flex gap-2">
                  <input
                    id="codigoInvitacion"
                    type="text"
                    value={formData.codigoInvitacion}
                    onChange={(e) => {
                      const codigo = e.target.value.toUpperCase()
                      setFormData({ ...formData, codigoInvitacion: codigo, nombreEscuela: '' })
                      setCodigoValido(false)
                    }}
                    onBlur={async () => {
                      if (formData.codigoInvitacion.length >= 4) {
                        setValidandoCodigo(true)
                        try {
                          const response = await fetch(`/api/invitaciones/validar?codigo=${encodeURIComponent(formData.codigoInvitacion)}`)
                          if (response.ok) {
                            const data = await response.json()
                            setCodigoValido(true)
                            // Si el código tiene una escuela asignada, pre-seleccionarla
                            if (data.escuelaId && !formData.escuelaId) {
                              setFormData(prev => ({ ...prev, escuelaId: data.escuelaId }))
                            }
                          } else {
                            setCodigoValido(false)
                          }
                        } catch (err) {
                          setCodigoValido(false)
                        } finally {
                          setValidandoCodigo(false)
                        }
                      }
                    }}
                    placeholder="ABC12345"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 uppercase"
                  />
                  {validandoCodigo && (
                    <span className="text-sm text-gray-500 self-center">Validando...</span>
                  )}
                  {!validandoCodigo && formData.codigoInvitacion && (
                    <span className={`text-sm self-center ${codigoValido ? 'text-green-600' : 'text-red-600'}`}>
                      {codigoValido ? '✓ Válido' : '✗ Inválido'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Si tienes un código de invitación de un profesor administrador, úsalo aquí.
                </p>
              </div>
            </>
          )}

          {loadingEscuelas ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : (
            <div>
              {formData.role !== 'PROFESOR' && (
                <div>
                  <label htmlFor="nombreEscuelaBuscado" className="block text-sm font-medium text-gray-700 mb-1">
                    Escuela {escuelaSeleccionada ? '(encontrada)' : '*'}
                  </label>
                  {escuelaSeleccionada ? (
                    <div className="w-full px-4 py-2 border border-green-300 rounded-lg bg-green-50 text-gray-900">
                      ✓ {escuelaSeleccionada.nombre}
                    </div>
                  ) : (
                    <div>
                      <input
                        id="nombreEscuelaBuscado"
                        type="text"
                        required
                        value={nombreEscuelaBuscado}
                        onChange={(e) => {
                          const valor = e.target.value
                          setNombreEscuelaBuscado(valor)
                          
                          // Limpiar timer anterior
                          if (debounceTimer) {
                            clearTimeout(debounceTimer)
                          }
                          
                          // Si el campo está vacío, limpiar la selección
                          if (!valor.trim()) {
                            setEscuelaSeleccionada(null)
                            setFormData(prev => ({ ...prev, escuelaId: '' }))
                            setError('')
                            return
                          }
                          
                          // Buscar después de que el usuario deje de escribir (debounce)
                          const timeoutId = setTimeout(() => {
                            buscarEscuelaPorNombre(valor)
                          }, 500)
                          setDebounceTimer(timeoutId)
                        }}
                        onBlur={() => {
                          if (nombreEscuelaBuscado.trim()) {
                            buscarEscuelaPorNombre(nombreEscuelaBuscado)
                          }
                        }}
                        placeholder="Escribe el nombre exacto de tu escuela"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 ${
                          nombreEscuelaBuscado && !escuelaSeleccionada && !buscandoEscuela ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {buscandoEscuela && (
                        <p className="text-xs text-gray-500 mt-1">Buscando escuela...</p>
                      )}
                      {nombreEscuelaBuscado && !escuelaSeleccionada && !buscandoEscuela && (
                        <p className="text-xs text-red-600 mt-1">
                          Escuela no encontrada. Verifica que hayas escrito el nombre correctamente.
                        </p>
                      )}
                    </div>
                  )}
                  {escuelaSeleccionada && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Escuela encontrada y verificada
                    </p>
                  )}
                  {!escuelaSeleccionada && !escuelaSlug && (
                    <p className="text-xs text-gray-500 mt-1">
                      Escribe el nombre exacto de tu escuela para verificar que existe
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>

          <div className="text-center text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link 
              href={escuelaSlug ? `/login/${escuelaSlug}` : '/login'} 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

