'use client'

import { useState, useEffect } from 'react'

export interface MeData {
  userId: string
  nombre: string
  email: string
  rol: 'admin' | 'usuario'
  modulos: { modulo: string; rolModulo: string }[]
}

/** Hook para obtener la sesión actual desde el cliente */
export function useMe() {
  const [me, setMe] = useState<MeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setMe(data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false))
  }, [])

  /** true si es admin global o registrador en el módulo dado */
  const canWrite = (modulo: string) => {
    if (!me) return false
    if (me.rol === 'admin') return true
    return me.modulos.some(m => m.modulo === modulo && m.rolModulo === 'registrador')
  }

  /** true si tiene cualquier acceso al módulo */
  const hasAccess = (modulo: string) => {
    if (!me) return false
    if (me.rol === 'admin') return true
    return me.modulos.some(m => m.modulo === modulo)
  }

  /** true si el usuario es registrador (no admin) en el módulo dado */
  const isRegistrador = (modulo: string) => {
    if (!me) return false
    if (me.rol === 'admin') return false
    return me.modulos.some(m => m.modulo === modulo && m.rolModulo === 'registrador')
  }

  return { me, loading, canWrite, hasAccess, isRegistrador }
}
