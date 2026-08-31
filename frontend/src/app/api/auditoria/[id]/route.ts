import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(`/api/auditoria/${id}`)
}
