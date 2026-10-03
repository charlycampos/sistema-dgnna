import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.json()
  return proxyToBackend(`/api/abogados/${id}/usuario`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyToBackend(`/api/abogados/${id}/usuario`, { method: 'DELETE' })
}
