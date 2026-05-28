import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(`/api/sustracion/${id}`)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.text()
  return proxyToBackend(`/api/sustracion/${id}`, { method: 'PUT', body })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(`/api/sustracion/${id}`, { method: 'DELETE' })
}
