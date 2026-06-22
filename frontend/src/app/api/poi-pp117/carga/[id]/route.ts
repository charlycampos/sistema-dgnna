import { NextRequest } from 'next/server'
import { proxyToPoiService } from '@/lib/backend'

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToPoiService(`/api/poi-pp117/carga/${id}`, { method: 'DELETE' })
}
