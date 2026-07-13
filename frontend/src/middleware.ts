import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dgnna-sistema-dgnna-secret-2026'
)
const COOKIE_NAME = 'dgnna_session'
const SESSION_MINUTES = 15 // inactividad máxima antes de cerrar sesión

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
    const { payload } = await jwtVerify(token, SECRET)

    // Renovación deslizante: cada request válido re-emite el token
    // con 15 min más de vida. Si el usuario deja de usar el sistema,
    // la sesión expira sola a los 15 min.
    const { exp: _exp, iat: _iat, ...datos } = payload
    const nuevoToken = await new SignJWT(datos)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_MINUTES}m`)
      .sign(SECRET)

    const response = NextResponse.next()
    response.cookies.set(COOKIE_NAME, nuevoToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * SESSION_MINUTES,
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
