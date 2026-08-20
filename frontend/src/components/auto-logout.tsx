'use client'

/**
 * Cierre de sesión automático por inactividad.
 *
 * - A los 29 min sin actividad: muestra un aviso ("tu sesión expirará en 1 minuto").
 * - A los 30 min sin actividad: llama a /api/auth/logout y redirige a /login.
 *
 * La actividad (mouse, teclado, scroll, touch) reinicia los contadores.
 * Debe coincidir con SESSION_MINUTES del middleware.ts.
 */
import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

const IDLE_MINUTES = 480 // 8 horas de sesión activa (jornada laboral)
const IDLE_MS = IDLE_MINUTES * 60 * 1000
const WARN_MS = IDLE_MS - 5 * 60 * 1000 // aviso 5 min antes
/* Mientras el usuario esté activo, renovar la cookie de sesión cada 5 min. */
const PING_MS = 5 * 60 * 1000

const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input', 'change'] as const

export default function AutoLogout() {
  const pathname = usePathname()
  const router = useRouter()
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastId = useRef<string | number | null>(null)

  useEffect(() => {
    // No aplica en la pantalla de login
    if (pathname === '/login') return

    const cerrarSesion = async () => {
      if (toastId.current !== null) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch {
        // aunque falle el fetch, redirigimos igual
      }
      router.replace('/login')
    }

    const reiniciar = () => {
      if (warnTimer.current) clearTimeout(warnTimer.current)
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
      if (toastId.current !== null) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }

      warnTimer.current = setTimeout(() => {
        toastId.current = toast.warning(
          'Tu sesión se cerrará en 5 minutos por inactividad.',
          {
            duration: 60_000,
            action: {
              label: 'Seguir trabajando',
              onClick: () => {
                reiniciar()
                fetch('/api/me').catch(() => {})
              },
            },
          }
        )
      }, WARN_MS)

      logoutTimer.current = setTimeout(cerrarSesion, IDLE_MS)
    }

    // Throttle: reiniciar como máximo una vez por segundo
    let ultimo = 0
    const onActividad = () => {
      const ahora = Date.now()
      if (ahora - ultimo > 1000) {
        ultimo = ahora
        reiniciar()
      }
    }

    EVENTOS.forEach(e => window.addEventListener(e, onActividad, { passive: true }))
    reiniciar()

    /* Keep-alive: si hubo actividad reciente, tocar /api/me para que el
       middleware renueve la cookie. Si responde 401, la sesión ya murió. */
    const ping = setInterval(async () => {
      if (Date.now() - ultimo > PING_MS) return // sin actividad: dejar expirar
      try {
        const res = await fetch('/api/me')
        if (res.status === 401) cerrarSesion()
      } catch {
        // sin conexión: no hacer nada
      }
    }, PING_MS)

    return () => {
      EVENTOS.forEach(e => window.removeEventListener(e, onActividad))
      if (warnTimer.current) clearTimeout(warnTimer.current)
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
      if (toastId.current !== null) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }
      clearInterval(ping)
    }
  }, [pathname, router])

  return null
}
