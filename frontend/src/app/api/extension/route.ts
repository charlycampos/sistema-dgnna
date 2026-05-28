import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET() {
  return proxyToBackend('/api/extension')
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  return proxyToBackend('/api/extension', { method: 'POST', body })
}
