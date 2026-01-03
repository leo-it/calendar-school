'use client'

import { useState, useEffect } from 'react'

interface TimePickerProps {
  id: string
  value: string // Formato HH:MM
  onChange: (value: string) => void
  required?: boolean
  className?: string
  label?: string
}

export default function TimePicker({
  id,
  value,
  onChange,
  required = false,
  className = '',
  label,
}: TimePickerProps) {
  // Inicializar con valores por defecto o parsear el valor recibido
  const getInitialHour = () => {
    if (value && value.includes(':')) {
      const [h] = value.split(':')
      return h ? h.padStart(2, '0') : '09'
    }
    return '09'
  }

  const getInitialMinute = () => {
    if (value && value.includes(':')) {
      const [, m] = value.split(':')
      return m ? m.padStart(2, '0') : '00'
    }
    return '00'
  }

  const [hour, setHour] = useState(getInitialHour())
  const [minute, setMinute] = useState(getInitialMinute())

  // Parsear el valor inicial y asegurar que siempre hay un valor válido
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':')
      if (h !== undefined && m !== undefined) {
        const hFormatted = h.padStart(2, '0')
        const mFormatted = m.padStart(2, '0')
        if (hour !== hFormatted || minute !== mFormatted) {
          setHour(hFormatted)
          setMinute(mFormatted)
        }
      }
    } else if (!value || value === '') {
      // Si no hay valor, usar valores por defecto
      const defaultHour = '09'
      const defaultMinute = '00'
      if (hour !== defaultHour || minute !== defaultMinute) {
        setHour(defaultHour)
        setMinute(defaultMinute)
        // Solo notificar si realmente no había valor
        onChange(`${defaultHour}:${defaultMinute}`)
      }
    }
  }, [value]) // Removido onChange de las dependencias para evitar loops

  // Generar opciones para horas (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  )

  // Generar opciones para minutos (00, 15, 30, 45) o todos los minutos
  const minutes = Array.from({ length: 60 }, (_, i) => 
    i.toString().padStart(2, '0')
  )

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value
    setHour(newHour)
    onChange(`${newHour}:${minute}`)
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value
    setMinute(newMinute)
    onChange(`${hour}:${newMinute}`)
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && '*'}
        </label>
      )}
      <div className="flex gap-2 items-center">
        <select
          id={`${id}-hour`}
          value={hour}
          onChange={handleHourChange}
          required={required}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
          aria-label="Hora"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-gray-500 font-medium">:</span>
        <select
          id={`${id}-minute`}
          value={minute}
          onChange={handleMinuteChange}
          required={required}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
          aria-label="Minuto"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      {/* Input oculto para mantener compatibilidad con formularios - siempre tiene valor válido */}
      <input
        type="hidden"
        id={id}
        name={id}
        value={`${hour}:${minute}`}
        readOnly
      />
    </div>
  )
}

