import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import EditarClaseClient from './EditarClaseClient'

export default async function EditarClasePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Solo ADMIN y PROFESOR pueden editar clases
  if (session.user.role !== 'ADMIN' && session.user.role !== 'PROFESOR') {
    redirect('/calendario')
  }

  return <EditarClaseClient claseId={params.id} user={session.user} />
}



