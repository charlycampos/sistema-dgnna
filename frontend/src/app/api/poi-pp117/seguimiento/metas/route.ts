import { NextRequest } from 'next/server'
import { proxyToPoiService } from '@/lib/backend'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  return proxyToPoiService(`/api/poi-pp117/seguimiento/metas${search}`)
}

export async function PUT(request: NextRequest) {
  const body = await request.text()
  return proxyToPoiService('/api/poi-pp117/seguimiento/metas', { method: 'PUT', body })
}
