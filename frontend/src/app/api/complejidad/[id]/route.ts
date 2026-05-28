import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.text()
  return proxyToBackend(`/api/complejidad/${id}`, { method: 'PUT', body })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(`/api/complejidad/${id}`, { method: 'DELETE' })
}
