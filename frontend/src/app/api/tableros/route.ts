import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'
import { getSession } from '@/lib/auth'

async function canManageTableros() {
  const session = await getSession()
  if (!session) return false
  if (['admin', 'director', 'directora'].includes(session.rol)) return true
  return session.modulos.some(
    ({ modulo, rolModulo }) =>
      (modulo === 'tableros-direcciones' || modulo === 'director') &&
      (rolModulo === 'registrador' || rolModulo === 'admin')
  )
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  return proxyToBackend(`/api/tableros${search}`)
}

export async function POST(request: NextRequest) {
  if (!(await canManageTableros())) {
    return NextResponse.json({ detail: 'No autorizado para gestionar tableros' }, { status: 403 })
  }
  const body = await request.text()
  return proxyToBackend('/api/tableros', { method: 'POST', body })
}
