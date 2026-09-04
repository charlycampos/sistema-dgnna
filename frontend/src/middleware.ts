import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dgnna-sistema-dgnna-secret-2026'
)
const COOKIE_NAME = 'dgnna_session'
const SESSION_MINUTES = 480 // 8 horas de validez de token

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
    if (pathname === '/login') {
      const token = request.cookies.get(COOKIE_NAME)?.value
      if (token) {
        try {
          await jwtVerify(token, SECRET)
          const url = request.nextUrl.clone()
          url.pathname = '/menu'
          return NextResponse.redirect(url)
        } catch {
          // Token inválido o expirado, permitir acceso a /login
        }
      }
    }
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
    const { payload } = await jwtVerify(token, SECRET)

    // Si intenta acceder a la raíz '/', redirigir al menú principal
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/menu'
      return NextResponse.redirect(url)
    }

    // Renovación deslizante con cookie de sesión (sin maxAge para que expire al cerrar navegador)
    const { exp: _exp, iat: _iat, ...datos } = payload
    const nuevoToken = await new SignJWT(datos)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_MINUTES}m`)
      .sign(SECRET)

    const response = NextResponse.next()
    response.cookies.set(COOKIE_NAME, nuevoToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
    })
    return response
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
