import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  return proxyToBackend(`/api/transparencia${search}`)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  return proxyToBackend('/api/transparencia', { method: 'POST', body })
}
