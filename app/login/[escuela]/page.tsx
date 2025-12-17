'use client'

import { useParams } from 'next/navigation'
import LoginForm from '@/components/LoginForm'

export default function LoginPageWithEscuela() {
  const params = useParams()
  const escuelaSlug = params?.escuela as string | undefined

  return <LoginForm escuelaSlug={escuelaSlug} />
}

