/**
 * Cliente servidor para llamar al backend FastAPI.
 * Lee el token JWT de la cookie dgnna_session y lo envía como Bearer token.
 * Usar solo en API routes de Next.js (server-side).
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BACKEND_URL     = process.env.BACKEND_URL     ?? 'http://localhost:8000'
const POI_SERVICE_URL = process.env.POI_SERVICE_URL ?? 'http://localhost:8007'
const COOKIE_NAME = 'dgnna_session'

/**
 * Llama al backend FastAPI reenviando el token de la cookie actual.
 * @param path  ruta relativa, ej: '/api/apelaciones'
 * @param init  opciones de fetch (method, body, etc.)
 */
export async function callBackend(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
  })
}

/**
 * Proxy genérico: reenvía la respuesta del backend tal cual.
 */
export async function proxyToBackend(
  path: string,
  init: RequestInit = {}
): Promise<NextResponse> {
  try {
    const res = await callBackend(path, init)
    const data = await res.json().catch(() => null)

    return NextResponse.json(data ?? {}, { status: res.status })
  } catch (error) {
    console.error(`Error llamando al backend [${path}]:`, error)
    return NextResponse.json(
      { error: 'Error de conexión con el servidor' },
      { status: 503 }
    )
  }
}

/**
 * Proxy para respuestas binarias (Excel, PDF…).
 * Reenvía el body como stream con el Content-Type y Content-Disposition originales.
 */
export async function proxyBinaryToBackend(
  path: string,
  init: RequestInit = {}
): Promise<NextResponse> {
  try {
    const res = await callBackend(path, init)
    if (!res.ok) {
      const detail = await res.json().catch(() => ({ detail: 'Error en el servidor' }))
      return NextResponse.json(detail, { status: res.status })
    }
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
    const disposition = res.headers.get('content-disposition') ?? ''
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
      },
    })
  } catch (error) {
    console.error(`Error binario del backend [${path}]:`, error)
    return NextResponse.json({ error: 'Error de conexión con el servidor' }, { status: 503 })
  }
}

// ─── Helpers para servicio POI-PP117 (puerto 8007) ───────────────

async function _getToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

export async function proxyToPoiService(
  path: string,
  init: RequestInit = {}
): Promise<NextResponse> {
  try {
    const token = await _getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> ?? {}),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${POI_SERVICE_URL}${path}`, { ...init, headers })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? {}, { status: res.status })
  } catch (error) {
    console.error(`Error POI service [${path}]:`, error)
    return NextResponse.json({ error: 'Error de conexión con servicio POI' }, { status: 503 })
  }
}

export async function proxyBinaryToPoiService(
  path: string,
  init: RequestInit = {}
): Promise<NextResponse> {
  try {
    const token = await _getToken()
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> ?? {}),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${POI_SERVICE_URL}${path}`, { ...init, headers })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({ detail: 'Error en el servidor' }))
      return NextResponse.json(detail, { status: res.status })
    }
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': res.headers.get('content-disposition') ?? '',
      },
    })
  } catch (error) {
    console.error(`Error binario POI [${path}]:`, error)
    return NextResponse.json({ error: 'Error de conexión con servicio POI' }, { status: 503 })
  }
}

export async function proxyMultipartToPoiService(
  path: string,
  formData: FormData
): Promise<NextResponse> {
  try {
    const token = await _getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${POI_SERVICE_URL}${path}`, { method: 'POST', headers, body: formData })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? {}, { status: res.status })
  } catch (error) {
    console.error(`Error multipart POI [${path}]:`, error)
    return NextResponse.json({ error: 'Error de conexión con servicio POI' }, { status: 503 })
  }
}

/**
 * Proxy para upload multipart/form-data.
 * Reenvía el FormData al backend sin sobreescribir el Content-Type (lo gestiona fetch).
 */
export async function proxyMultipartToBackend(
  path: string,
  formData: FormData
): Promise<NextResponse> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? {}, { status: res.status })
  } catch (error) {
    console.error(`Error multipart del backend [${path}]:`, error)
    return NextResponse.json({ error: 'Error de conexión con el servidor' }, { status: 503 })
  }
}
