import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NuevaClaseClient from './NuevaClaseClient'

export default async function NuevaClasePage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Solo ADMIN y PROFESOR pueden crear clases
  if (session.user.role !== 'ADMIN' && session.user.role !== 'PROFESOR') {
    redirect('/calendario')
  }

  return <NuevaClaseClient user={session.user} />
}



