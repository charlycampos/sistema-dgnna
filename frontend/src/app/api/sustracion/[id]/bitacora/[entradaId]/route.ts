import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; entradaId: string }> }
) {
  const { id, entradaId } = await params
  return proxyToBackend(`/api/sustracion/${id}/bitacora/${entradaId}`, { method: 'DELETE' })
}
