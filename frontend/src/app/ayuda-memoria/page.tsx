import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AyudaMemoriaClient from './AyudaMemoriaClient'

export const metadata = {
  title: 'Módulo Ayuda Memoria — DGNNA MIMP',
  description: 'Generación descentralizada de reportes ejecutivos temáticos y seguimiento de casos emblemáticos',
}

export default async function AyudaMemoriaPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <AyudaMemoriaClient session={session} />
}
