import { NextRequest } from 'next/server'
import { proxyToPoiService } from '@/lib/backend'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  return proxyToPoiService(`/api/poi-pp117/estructura-pp117${search}`)
}
