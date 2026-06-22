'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogOut, Scale, Globe, BookOpen, Users, ChevronRight, Lock, Landmark, CalendarDays, FileText, Eye, BarChart3 } from 'lucide-react'
import type { SessionPayload } from '@/lib/auth'

interface Props {
  session: SessionPayload
}

interface Modulo {
  id: string
  titulo: string
  descripcion: string
  icono: React.ReactNode
  ruta?: string
  disponible: boolean
  soloAdmin?: boolean
}

export default function MenuClient({ session }: Props) {
  const router = useRouter()

  const modulos: Modulo[] = [
    {
      id: 'apelaciones',
      titulo: 'Módulo Apelaciones',
      descripcion: 'Gestión y asignación de recursos de apelación',
      icono: <Scale className="w-8 h-8" />,
      ruta: '/apelaciones',
      disponible: true,
    },
    {
      id: 'sustraccion',
      titulo: 'Módulo Sustracción Internacional',
      descripcion: 'Casos de sustracción y restitución internacional de menores',
      icono: <Globe className="w-8 h-8" />,
      ruta: '/sustracion-internacional',
      disponible: true,
    },
    {
      id: 'fortalecimiento',
      titulo: 'Módulo Fortalecimiento de Capacidades',
      descripcion: 'Gestión de capacitaciones y actividades formativas',
      icono: <BookOpen className="w-8 h-8" />,
      disponible: false,
    },
    {
      id: 'congresales',
      titulo: 'Módulo Congresales',
      descripcion: 'Gestión de expedientes y solicitudes congresales',
      icono: <Landmark className="w-8 h-8" />,
      disponible: false,
    },
    {
      id: 'proyectos-ley',
      titulo: 'Módulo Proyectos de Ley',
      descripcion: 'Seguimiento y gestión de proyectos de ley',
      icono: <FileText className="w-8 h-8" />,
      ruta: '/proyectos-ley',
      disponible: true,
    },
    {
      id: 'sala-reuniones',
      titulo: 'Sala de Reuniones',
      descripcion: 'Reserva y gestión de salas para reuniones institucionales',
      icono: <CalendarDays className="w-8 h-8" />,
      ruta: '/sala-reuniones',
      disponible: true,
    },
    {
      id: 'transparencia',
      titulo: 'Módulo Ley de Transparencia',
      descripcion: 'Gestión y seguimiento de solicitudes de acceso a la información pública',
      icono: <Eye className="w-8 h-8" />,
      ruta: '/transparencia',
      disponible: true,
    },
    {
      id: 'poi-pp117',
      titulo: 'Módulo POI - PP117',
      descripcion: 'Carga mensual y reportes de ejecución del POI y Programa Presupuestal 0117',
      icono: <BarChart3 className="w-8 h-8" />,
      ruta: '/poi-pp117',
      disponible: true,
    },
    {
      id: 'usuarios',
      titulo: 'Gestión de Usuarios',
      descripcion: 'Administración de cuentas y permisos del sistema',
      icono: <Users className="w-8 h-8" />,
      ruta: '/usuarios',
      disponible: true,
      soloAdmin: true,
    },
  ]

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  /** true si el usuario tiene acceso a este módulo */
  const tieneAcceso = (modulo: Modulo): boolean => {
    if (session.rol === 'admin') return true
    if (modulo.soloAdmin) return false
    if (!modulo.disponible) return false
    return session.modulos.some(m => m.modulo === modulo.id)
  }

  const handleClick = (modulo: Modulo) => {
    if (!modulo.disponible) {
      toast.info('Este módulo estará disponible próximamente')
      return
    }
    if (modulo.soloAdmin && session.rol !== 'admin') {
      toast.error('Solo los administradores pueden acceder a esta sección')
      return
    }
    if (!tieneAcceso(modulo)) {
      toast.error('No tienes acceso a este módulo')
      return
    }
    if (modulo.ruta) router.push(modulo.ruta)
  }

  // Iniciales del usuario
  const iniciales = session.nombre
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  const rolLabel: Record<string, string> = {
    admin: 'Administrador',
    registrador: 'Registrador',
    directora: 'Directora',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">

      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              ⚖️
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">DGNNA</p>
              <p className="text-gray-400 text-xs">Sistema de Gestión</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Info del usuario */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {iniciales}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-800 leading-tight">{session.nombre}</p>
                <p className="text-xs text-gray-400">{rolLabel[session.rol] ?? session.rol}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {session.nombre.split(' ')[0]}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Selecciona el módulo al que deseas acceder
          </p>
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {modulos.map((modulo) => {
            const esVisible = !modulo.soloAdmin || session.rol === 'admin'
            if (!esVisible) return null

            const acceso = tieneAcceso(modulo)
            const proximamente = !modulo.disponible
            const sinPermiso = modulo.disponible && !acceso

            return (
              <button
                key={modulo.id}
                onClick={() => handleClick(modulo)}
                className={`
                  relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl border-2 transition-all duration-200 group
                  ${acceso
                    ? 'bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700 hover:shadow-lg hover:-translate-y-1 cursor-pointer'
                    : 'bg-blue-400/70 border-blue-300 cursor-not-allowed opacity-80'
                  }
                `}
              >
                {/* Ícono */}
                <div className="text-white/90">
                  {modulo.icono}
                </div>

                {/* Título */}
                <p className="text-white font-semibold text-sm leading-snug">
                  {modulo.titulo}
                </p>

                {/* Badge próximamente */}
                {proximamente && (
                  <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/20 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" />
                    Próximamente
                  </span>
                )}

                {/* Badge sin acceso */}
                {sinPermiso && (
                  <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/20 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" />
                    Sin acceso
                  </span>
                )}

                {/* Flecha hover */}
                {acceso && (
                  <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors" />
                )}
              </button>
            )
          })}
        </div>

        {/* Descripción del módulo seleccionado (footer sutil) */}
        <p className="text-center text-xs text-gray-400 mt-10">
          DGNNA · Ministerio de la Mujer y Poblaciones Vulnerables · © {new Date().getFullYear()}
        </p>
      </main>
    </div>
  )
}

