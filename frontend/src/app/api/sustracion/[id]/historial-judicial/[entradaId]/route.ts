import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; entradaId: string }> }
) {
  const { id, entradaId } = await params
  return proxyToBackend(`/api/sustracion/${id}/historial-judicial/${entradaId}`, { method: 'DELETE' })
}
