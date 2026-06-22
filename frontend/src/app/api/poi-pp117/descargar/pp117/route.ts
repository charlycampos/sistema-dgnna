import { NextRequest } from 'next/server'
import { proxyBinaryToPoiService } from '@/lib/backend'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  return proxyBinaryToPoiService(`/api/poi-pp117/descargar/pp117${search}`)
}
