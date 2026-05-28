/**
 * Utilidades de autenticación para el frontend.
 * La creación de tokens JWT se hace en el backend (FastAPI).
 * Aquí solo leemos y verificamos la cookie de sesión.
 */

import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dgnna-sistema-apelaciones-secret-2026'
)
export const COOKIE_NAME = 'dgnna_session'

export interface ModuloPermiso {
  modulo: string    // "apelaciones" | "sustraccion" | "fortalecimiento"
  rolModulo: string // "registrador" | "directora"
}

export interface SessionPayload {
  userId: string
  nombre: string
  email: string
  rol: 'admin' | 'usuario'
  modulos: ModuloPermiso[]
}

/** Lee y verifica el JWT de la cookie (usar en Server Components y API routes) */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, SECRET)
    const p = payload as unknown as SessionPayload
    if (!p.modulos) p.modulos = []
    return p
  } catch {
    return null
  }
}

/** ¿Tiene el usuario acceso a este módulo? */
export function hasModuleAccess(session: SessionPayload, modulo: string): boolean {
  if (session.rol === 'admin') return true
  return session.modulos.some(m => m.modulo === modulo)
}

/** ¿Puede el usuario escribir en este módulo? */
export function canWrite(session: SessionPayload, modulo: string): boolean {
  if (session.rol === 'admin') return true
  return session.modulos.some(m => m.modulo === modulo && m.rolModulo === 'registrador')
}
