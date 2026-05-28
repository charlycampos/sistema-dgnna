import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(`/api/apelaciones/${id}`)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.text()
  return proxyToBackend(`/api/apelaciones/${id}`, { method: 'PUT', body })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(`/api/apelaciones/${id}`, { method: 'DELETE' })
}
