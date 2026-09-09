import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import TablerosDireccionesClient from './TablerosDireccionesClient'

export const metadata = {
  title: 'Tableros de Control de Direcciones de Línea — DGNNA MIMP',
  description: 'Monitoreo analítico y tableros estratégicos de DSLD, DPNNA, DPE y DA',
}

export default async function TablerosDireccionesPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <TablerosDireccionesClient session={session} />
}
