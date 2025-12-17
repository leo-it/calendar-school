'use client'

import { useParams } from 'next/navigation'
import RegistroForm from '@/components/RegistroForm'

export default function RegistroPageWithEscuela() {
  const params = useParams()
  const escuelaSlug = params?.escuela as string | undefined

  return <RegistroForm escuelaSlug={escuelaSlug} />
}

