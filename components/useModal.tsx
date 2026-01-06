'use client'

import { useState } from 'react'

interface ModalState {
  isOpen: boolean
  title?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  showConfirm?: boolean
  confirmText?: string
  onConfirm?: () => void
}

export function useModal() {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    message: '',
  })

  const showModal = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string
  ) => {
    setModal({
      isOpen: true,
      message,
      type,
      title,
      showConfirm: false,
    })
  }

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    type: 'success' | 'error' | 'warning' | 'info' = 'warning',
    title?: string,
    confirmText?: string
  ) => {
    setModal({
      isOpen: true,
      message,
      type,
      title,
      showConfirm: true,
      confirmText,
      onConfirm,
    })
  }

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }))
  }

  return {
    modal,
    showModal,
    showConfirm,
    closeModal,
  }
}

