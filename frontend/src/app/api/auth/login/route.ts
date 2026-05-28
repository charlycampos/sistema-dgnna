import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'
const COOKIE_NAME = 'dgnna_session'
const MAX_AGE = 60 * 60 * 8 // 8 horas

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Llamar al backend FastAPI
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? 'Credenciales incorrectas' },
        { status: res.status }
      )
    }

    // Guardar el token JWT del FastAPI en una cookie HttpOnly
    // (mismo nombre y formato que antes — el middleware lo sigue leyendo igual)
    const response = NextResponse.json({
      ok: true,
      nombre: data.nombre,
      rol: data.rol,
      modulos: data.modulos,
    })

    response.cookies.set(COOKIE_NAME, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error de conexión con el servidor' },
      { status: 503 }
    )
  }
}
