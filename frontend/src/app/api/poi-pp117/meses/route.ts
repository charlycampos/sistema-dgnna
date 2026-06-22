import { proxyToPoiService } from '@/lib/backend'

export async function GET() {
  return proxyToPoiService('/api/poi-pp117/meses')
}
