import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.text()
  // Aseguramos que la ruta coincida exactamente con el prefijo /api/sustracion del backend
  return proxyToBackend(`/api/sustracion/${id}/historial-judicial`, { 
    method: 'POST', 
    body,
    headers: { 'Content-Type': 'application/json' }
  })
}
