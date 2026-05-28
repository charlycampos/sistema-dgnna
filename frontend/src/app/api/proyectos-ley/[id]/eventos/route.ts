import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.text()
  return proxyToBackend(`/api/proyectos-ley/${id}/eventos`, { method: 'POST', body })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(`/api/proyectos-ley/${id}/eventos`, { method: 'DELETE' })
}
