import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AuditoriaClient from './AuditoriaClient'

export const metadata = {
  title: 'Auditoría y Trazabilidad — Sistema DGNNA',
  description: 'Historial de modificaciones y registro de actividades del sistema',
}

export default async function AuditoriaPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const isAdmin = session.rol === 'admin'
  const tieneRolDirectivo = session.modulos?.some(
    m => m.rolModulo === 'directora' || m.rolModulo === 'director'
  ) ?? false

  // Solo administradores y directivos pueden acceder a la auditoría global
  if (!isAdmin && !tieneRolDirectivo) {
    redirect('/menu')
  }

  return <AuditoriaClient session={session} />
}
