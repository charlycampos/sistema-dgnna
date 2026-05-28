import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  return proxyToBackend(`/api/sustracion${search}`)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  return proxyToBackend('/api/sustracion', { method: 'POST', body })
}
