import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const subpath = path.join('/')
  const search = request.nextUrl.search
  return proxyToBackend(`/api/normativa/${subpath}${search}`)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const subpath = path.join('/')
  const body = await request.text()
  return proxyToBackend(`/api/normativa/${subpath}`, {
    method: 'POST',
    body,
  })
}
