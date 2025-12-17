import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ProfesorDashboardClient from './ProfesorDashboardClient'

export default async function ProfesorPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Solo PROFESOR puede acceder
  if (session.user.role !== 'PROFESOR') {
    redirect('/calendario')
  }

  return <ProfesorDashboardClient user={session.user} />
}






