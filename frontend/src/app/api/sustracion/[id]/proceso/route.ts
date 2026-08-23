import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const updatePayload: Record<string, any> = {}

    if (body.faseOperativa) {
      const fase = String(body.faseOperativa).toLowerCase()
      if (fase.includes('judicial')) updatePayload.etapa = 'Judicial'
      else if (fase.includes('cierre')) updatePayload.etapa = 'Cierre'
      else updatePayload.etapa = 'Administrativo'
    }
    if (body.fechaEntrevista !== undefined) updatePayload.fechaEntrevista = body.fechaEntrevista
    if (body.resultadoEntrevista !== undefined) updatePayload.resultadoEntrevista = body.resultadoEntrevista
    if (body.motivoCierre !== undefined) updatePayload.motivoCierre = body.motivoCierre
    if (body.fechaDemanda !== undefined) updatePayload.fechaDemanda = body.fechaDemanda
    if (body.sentencia1ra !== undefined) updatePayload.sentencia1ra = body.sentencia1ra
    if (body.retorno !== undefined) updatePayload.retorno = body.retorno

    return proxyToBackend(`/api/sustracion/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatePayload),
    })
  } catch {
    return proxyToBackend(`/api/sustracion/${id}`, { method: 'PUT', body: '{}' })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(`/api/sustracion/${id}`)
}
