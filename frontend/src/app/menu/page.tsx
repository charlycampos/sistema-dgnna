import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import MenuClient from './MenuClient'

export default async function MenuPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <MenuClient session={session} />
}
