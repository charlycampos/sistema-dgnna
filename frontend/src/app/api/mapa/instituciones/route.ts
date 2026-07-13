import { NextRequest } from 'next/server'
import { proxyToMapaService } from '@/lib/backend'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  return proxyToMapaService(`/api/mapa/instituciones${search}`)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  return proxyToMapaService('/api/mapa/instituciones', { method: 'POST', body })
}
