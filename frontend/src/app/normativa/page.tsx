import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import NormativaClient from './NormativaClient'

export const metadata = {
  title: 'Consulta Normativa y Asistente RAG — Sistema DGNNA',
  description: 'Búsqueda de artículos legales y asistente Multi-LLM para la protección de NNA',
}

export default async function NormativaPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <NormativaClient session={session} />
}
