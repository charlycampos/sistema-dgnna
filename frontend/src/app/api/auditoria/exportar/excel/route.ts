import { NextRequest, NextResponse } from 'next/server'
import { callBackend } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.search
    const res = await callBackend(`/api/auditoria/exportar/excel${search}`)

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al exportar reporte de auditoría' }, { status: res.status })
    }

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': res.headers.get('Content-Disposition') || 'attachment; filename=auditoria.xlsx'
      }
    })
  } catch (error) {
    console.error('Error exportando auditoría:', error)
    return NextResponse.json({ error: 'Error interno de exportación' }, { status: 500 })
  }
}
