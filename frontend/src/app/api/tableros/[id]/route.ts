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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(`/api/tableros/${id}`)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canManageTableros())) {
    return NextResponse.json({ detail: 'No autorizado para gestionar tableros' }, { status: 403 })
  }
  const { id } = await params
  const body = await request.text()
  return proxyToBackend(`/api/tableros/${id}`, { method: 'PUT', body })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canManageTableros())) {
    return NextResponse.json({ detail: 'No autorizado para gestionar tableros' }, { status: 403 })
  }
  const { id } = await params
  return proxyToBackend(`/api/tableros/${id}`, { method: 'DELETE' })
}
