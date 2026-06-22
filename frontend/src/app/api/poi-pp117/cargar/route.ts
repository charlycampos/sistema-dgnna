import { NextRequest } from 'next/server'
import { proxyMultipartToPoiService } from '@/lib/backend'

export async function POST(request: NextRequest) {
  const search = request.nextUrl.search
  const formData = await request.formData()
  return proxyMultipartToPoiService(`/api/poi-pp117/cargar${search}`, formData)
}
