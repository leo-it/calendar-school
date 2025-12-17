import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminPanelClient from './AdminPanelClient'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Solo ADMIN o PROFESOR admin de su escuela puede acceder
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, esAdminEscuela: true }
  })

  if (!user || (user.role !== 'ADMIN' && !(user.role === 'PROFESOR' && user.esAdminEscuela))) {
    redirect('/calendario')
  }

  return <AdminPanelClient user={session.user} />
}






