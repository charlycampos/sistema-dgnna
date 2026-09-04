import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.BACKEND_INTERNAL_URL || 'http://gateway:8000'
const COOKIE_NAME = 'dgnna_session'
const MAX_AGE = 60 * 60 * 8 // 8 horas si el usuario marca explícitamente "No cerrar sesión"

export async function POST(request: Request) {
  try {
    const { email, password, recordar } = await request.json()

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
    const response = NextResponse.json({
      ok: true,
      nombre: data.nombre,
      rol: data.rol,
      modulos: data.modulos,
    })

    const cookieOptions: {
      httpOnly: boolean
      secure: boolean
      sameSite: 'lax'
      path: string
      maxAge?: number
    } = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
    }

    // Si el usuario marcó explícitamente "No cerrar sesión", persistimos la cookie 8h
    // Si no (por defecto), es una cookie de sesión que se destruye al cerrar el navegador
    if (recordar === true) {
      cookieOptions.maxAge = MAX_AGE
    }

    response.cookies.set(COOKIE_NAME, data.access_token, cookieOptions)

    return response
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error de conexión con el servidor' },
      { status: 503 }
    )
  }
}
