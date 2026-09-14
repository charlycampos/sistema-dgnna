import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const SESSION_SECRET_ENV = process.env.SESSION_SECRET
if (!SESSION_SECRET_ENV) {
  throw new Error(
    'SESSION_SECRET no está definido. Defínelo en el entorno del contenedor frontend ' +
    '(no existe valor por defecto; genera uno con: openssl rand -hex 32).'
  )
}
const SECRET = new TextEncoder().encode(SESSION_SECRET_ENV)
const COOKIE_NAME = 'dgnna_session'
const SESSION_MINUTES = 480 // 8 horas de validez de token

// Cada cuánto se revalida la sesión contra la base de datos (no en cada
// request, para no sobrecargar auth-service). Si en ese lapso el usuario
// fue desactivado o le cambiaron el rol/módulos, la sesión se corta o se
// actualiza en la siguiente renovación, en vez de esperar a que el JWT
// expire (hasta 8 horas después).
const REVALIDAR_SEGUNDOS = 300
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://gateway:8000'

type EstadoRevalidado = {
  activo: boolean
  rol: string
  direccion?: string | null
  modulos: unknown
}

// null  → el backend confirmó que la sesión ya no es válida (cortar sesión)
// undefined → no se pudo consultar al backend (caída puntual: mantener la
//             sesión con los datos que ya tenía el token y reintentar luego)
// objeto → sesión vigente, con los datos actuales de rol/dirección/módulos
async function revalidarContraBD(token: string): Promise<EstadoRevalidado | null | undefined> {
  try {
    const resp = await fetch(`${BACKEND_INTERNAL_URL}/api/auth/estado`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (resp.status === 401) return null
    if (!resp.ok) return undefined
    return (await resp.json()) as EstadoRevalidado
  } catch {
    return undefined
  }
}

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
    const { exp: _exp, iat: _iat, chk, ...datos } = payload as typeof payload & { chk?: number }
    const ahora = Math.floor(Date.now() / 1000)
    let datosVigentes: Record<string, unknown> = datos
    let ultimaRevalidacion = typeof chk === 'number' ? chk : 0

    if (ahora - ultimaRevalidacion >= REVALIDAR_SEGUNDOS) {
      const estado = await revalidarContraBD(token)
      if (estado === null) {
        // El backend confirmó que la cuenta está desactivada o ya no existe.
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const response = NextResponse.redirect(url)
        response.cookies.delete(COOKIE_NAME)
        return response
      }
      if (estado !== undefined) {
        datosVigentes = {
          ...datos,
          rol:       estado.rol,
          direccion: estado.direccion ?? '',
          modulos:   estado.modulos,
        }
        ultimaRevalidacion = ahora
      }
      // Si estado es undefined (auth-service no respondió), seguimos con los
      // datos que ya traía el token y se reintenta en la próxima request,
      // para no cortar sesiones por una caída puntual del backend.
    }

    const nuevoToken = await new SignJWT({ ...datosVigentes, chk: ultimaRevalidacion })
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
