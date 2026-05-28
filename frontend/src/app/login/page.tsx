'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, LogIn, HelpCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [mostrarPass, setMostrarPass] = useState(false)
  const [recordar, setRecordar]   = useState(true)
  const [loading, setLoading]     = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Ingresa tu correo y contraseña')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Credenciales incorrectas')
        return
      }

      toast.success(`Bienvenido, ${data.nombre}`)
      router.push('/menu')
      router.refresh()
    } catch {
      toast.error('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="w-full max-w-md px-4">

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Banner superior institucional */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-8 py-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-1">
              {/* Escudo MIMP simplificado */}
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                ⚖️
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-sm leading-tight">DGNNA</p>
                <p className="text-blue-200 text-xs leading-tight">Ministerio de la Mujer y Poblaciones Vulnerables</p>
              </div>
            </div>
            <h1 className="text-white font-bold text-lg mt-3">
              Sistema de Gestión DGNNA
            </h1>
            <p className="text-blue-200 text-xs mt-0.5">
              Dirección General de Niñas, Niños y Adolescentes
            </p>
          </div>

          {/* Avatar */}
          <div className="flex justify-center -mt-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full border-4 border-white shadow flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-9 h-9 text-gray-400" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="px-8 pt-4 pb-8 space-y-4">
            <p className="text-center text-sm text-gray-500 font-medium mb-2">Inicia sesión para continuar</p>

            {/* Email */}
            <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                autoComplete="email"
                className="w-full px-4 py-3 text-sm text-gray-700 outline-none bg-white"
                required
              />
            </div>

            {/* Contraseña */}
            <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all flex items-center">
              <input
                id="password"
                type={mostrarPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                className="flex-1 px-4 py-3 text-sm text-gray-700 outline-none bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarPass(!mostrarPass)}
                className="px-3 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Botón login */}
            <button
              type="submit"
              disabled={loading}
              id="btn-login"
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Iniciar sesión
                </>
              )}
            </button>

            {/* Footer del form */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={e => setRecordar(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                <span className="text-xs text-gray-500">No cerrar sesión</span>
              </label>
              <button
                type="button"
                onClick={() => toast.info('Contacta al administrador del sistema para restablecer tu contraseña.')}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                ¿Necesitas ayuda?
              </button>
            </div>
          </form>
        </div>

        {/* Pie de página */}
        <p className="text-center text-xs text-gray-400 mt-5">
          © {new Date().getFullYear()} MIMP · DGNNA · Uso exclusivo interno
        </p>
      </div>
    </div>
  )
}
