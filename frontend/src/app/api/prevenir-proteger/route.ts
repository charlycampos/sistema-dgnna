import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(request: NextRequest) {
  return proxyToBackend(`/api/prevenir-proteger${request.nextUrl.search}`)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  return proxyToBackend('/api/prevenir-proteger', { method: 'POST', body })
}
