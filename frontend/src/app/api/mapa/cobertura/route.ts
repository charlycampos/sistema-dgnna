import { NextRequest } from 'next/server'
import { proxyToMapaService } from '@/lib/backend'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  return proxyToMapaService(`/api/mapa/cobertura${search}`)
}
