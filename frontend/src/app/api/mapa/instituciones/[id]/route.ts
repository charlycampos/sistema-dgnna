import { NextRequest } from 'next/server'
import { proxyToMapaService } from '@/lib/backend'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  return proxyToMapaService(`/api/mapa/instituciones/${id}`)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.text()
  return proxyToMapaService(`/api/mapa/instituciones/${id}`, { method: 'PUT', body })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  return proxyToMapaService(`/api/mapa/instituciones/${id}`, { method: 'DELETE' })
}
