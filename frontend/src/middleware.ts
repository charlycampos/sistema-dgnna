import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dgnna-sistema-dgnna-secret-2026'
)
const COOKIE_NAME = 'dgnna_session'

// Rutas que NO requieren autenticación
const RUTAS_PUBLICAS = ['/login']

// Prefijos de rutas públicas (APIs de auth, archivos estáticos)
const PREFIJOS_PUBLICOS = [
  '/api/auth/',
  '/_next/',
  '/favicon.ico',
  '/icons/',
  '/images/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas
  if (RUTAS_PUBLICAS.includes(pathname)) {
    return NextResponse.next()
  }
  if (PREFIJOS_PUBLICOS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Verificar cookie de sesión
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    // No autenticado → redirigir al login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    // Token inválido o expirado → redirigir al login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    // Limpiar la cookie inválida
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
