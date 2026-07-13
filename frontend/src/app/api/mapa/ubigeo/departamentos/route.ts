import { proxyToMapaService } from '@/lib/backend'

export async function GET() {
  return proxyToMapaService('/api/mapa/ubigeo/departamentos')
}
