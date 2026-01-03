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
  const [hour, setHour] = useState('09')
  const [minute, setMinute] = useState('00')

  // Parsear el valor inicial
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':')
      if (h !== undefined && m !== undefined) {
        setHour(h.padStart(2, '0'))
        setMinute(m.padStart(2, '0'))
      }
    } else if (!value) {
      // Si no hay valor, usar valores por defecto
      setHour('09')
      setMinute('00')
    }
  }, [value])

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
      {/* Input oculto para mantener compatibilidad con formularios */}
      <input
        type="hidden"
        id={id}
        name={id}
        value={`${hour}:${minute}`}
        required={required}
      />
    </div>
  )
}

