/**
 * Cliente servidor para llamar al backend FastAPI.
 * Lee el token JWT de la cookie dgnna_session y lo envía como Bearer token.
 * Usar solo en API routes de Next.js (server-side).
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'
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
