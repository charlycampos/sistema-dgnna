import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'dgnna-sistema-apelaciones-secret-2026'
)
const COOKIE_NAME = 'dgnna_session'

// Rutas que NO requieren autenticación
const PUBLIC_PATHS = ['/login', '/api/auth/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas y assets
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    // Si ya tiene sesión y va a /login → redirigir al menú
    if (pathname.startsWith('/login')) {
      const token = request.cookies.get(COOKIE_NAME)?.value
      if (token) {
        try {
          await jwtVerify(token, SECRET)
          return NextResponse.redirect(new URL('/menu', request.url))
        } catch {
          // Token inválido, dejar pasar a /login
        }
      }
    }
    return NextResponse.next()
  }

  // Verificar sesión para rutas protegidas
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    // Token expirado o inválido
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
