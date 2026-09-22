import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend, proxyMultipartToBackend } from '@/lib/backend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const subpath = path.join('/')
  const search = request.nextUrl.search
  return proxyToBackend(`/api/gestion-datos/${subpath}${search}`)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const subpath = path.join('/')
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error(`No se pudo leer el archivo enviado a /api/gestion-datos/${subpath}:`, error)
      return NextResponse.json(
        { detail: 'No se pudo leer el archivo enviado. Verifique que no supere los 50 MB e inténtelo de nuevo.' },
        { status: 413 }
      )
    }
    return proxyMultipartToBackend(`/api/gestion-datos/${subpath}`, formData)
  }

  const body = await request.text()
  return proxyToBackend(`/api/gestion-datos/${subpath}`, {
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
  return proxyToBackend(`/api/gestion-datos/${subpath}`, {
    method: 'PUT',
    body,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const subpath = path.join('/')
  return proxyToBackend(`/api/gestion-datos/${subpath}`, {
    method: 'DELETE',
  })
}
