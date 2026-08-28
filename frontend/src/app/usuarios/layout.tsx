import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function UsuariosLayout({ children }: { children: ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.rol !== 'admin') redirect('/menu')

  return children
}
