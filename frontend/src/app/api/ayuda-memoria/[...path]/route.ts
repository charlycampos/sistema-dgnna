import { NextRequest } from 'next/server'
import { proxyToBackend, proxyBinaryToBackend } from '@/lib/backend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const subpath = path.join('/')
  const search = request.nextUrl.search

  if (subpath.includes('exportar-docx') || subpath.includes('exportar-pdf')) {
    return proxyBinaryToBackend(`/api/ayuda-memoria/${subpath}${search}`)
  }

  return proxyToBackend(`/api/ayuda-memoria/${subpath}${search}`)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const subpath = path.join('/')
  const body = await request.text()
  return proxyToBackend(`/api/ayuda-memoria/${subpath}`, {
    method: 'POST',
    body,
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const subpath = path.join('/')
  const body = await request.text()
  return proxyToBackend(`/api/ayuda-memoria/${subpath}`, {
    method: 'PUT',
    body,
  })
}
