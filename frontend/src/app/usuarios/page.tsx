'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Users, Plus, ArrowLeft, Pencil, PowerOff, Power,
  ShieldCheck, UserCheck, BookOpen, Search, Globe, KeyRound,
  Scale, FileText, CalendarDays, Eye, BarChart3, MapPin,
  ShieldAlert, Sparkles, X, EyeOff, Dices, Check, CheckCircle2,
  Sparkle, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface ModuloPermiso {
  modulo: string
  rolModulo: string
}

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string          // 'admin' | 'usuario'
  activo: boolean
  createdAt: string
  modulos: ModuloPermiso[]
}

type ErrorCarga = {
  tipo: 'sesion' | 'acceso' | 'general'
  mensaje: string
}

const MODULOS_DISPONIBLES = [
  { id: 'apelaciones',       label: 'Apelaciones',                  desc: 'Recursos y expedientes',       icon: Scale,        color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'sustraccion',       label: 'Sustracción Internacional',    desc: 'Casos y restitución de NNA',   icon: Globe,        color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'proyectos-ley',     label: 'Proyectos de Ley',             desc: 'Seguimiento legislativo',      icon: FileText,     color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'transparencia',     label: 'Ley de Transparencia',         desc: 'Solicitudes y plazos',         icon: Eye,          color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'sala-reuniones',    label: 'Sala de Reuniones',            desc: 'Reservas institucionales',     icon: CalendarDays, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'poi-pp117',         label: 'POI - PP117',                  desc: 'Ejecución presupuestal',       icon: BarChart3,    color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'mapa',              label: 'Mapa de Cobertura',            desc: 'UPE, CAR, DEMUNA',             icon: MapPin,       color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'normativa',         label: 'Consulta Normativa y RAG',     desc: 'DL 1297 e Inteligencia IA',    icon: Sparkles,     color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { id: 'auditoria',         label: 'Auditoría y Trazabilidad',     desc: 'Historial inmutable',          icon: ShieldCheck,  color: 'text-slate-700 bg-slate-100 border-slate-300' },
  { id: 'fortalecimiento',   label: 'Fortalecimiento Capacidades',  desc: 'Capacitaciones DGNNA',         icon: BookOpen,     color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'prevenir-proteger', label: 'Prevenir para Proteger',       desc: 'Alertas y protección',         icon: ShieldAlert,  color: 'text-red-600 bg-red-50 border-red-200' },
]

function RolBadge({ rol, modulos }: { rol: string; modulos: ModuloPermiso[] }) {
  if (rol === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
        <ShieldCheck className="w-3.5 h-3.5" />
        Administrador Global
      </span>
    )
  }
  if (modulos.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
        Sin módulos
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {modulos.map(m => {
        const modDef = MODULOS_DISPONIBLES.find(d => d.id === m.modulo)
        const label = modDef ? modDef.label : m.modulo
        const esRegistrador = m.rolModulo === 'registrador'
        return (
          <span
            key={m.modulo}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
              esRegistrador
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
            title={`Módulo: ${label} | Rol: ${esRegistrador ? 'Registrador' : 'Directora / Consulta'}`}
          >
            {esRegistrador ? <UserCheck className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
            <span>{label}</span>
            <span className="text-[9px] opacity-75 font-normal">({esRegistrador ? 'Reg' : 'Cons'})</span>
          </span>
        )
      })}
    </div>
  )
}

type FormNuevo = {
  nombre: string
  email: string
  password: string
  esAdmin: boolean
  modulos: { modulo: string; rolModulo: string }[]
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios]             = useState<Usuario[]>([])
  const [loading, setLoading]               = useState(true)
  const [errorCarga, setErrorCarga]         = useState<ErrorCarga | null>(null)
  const [busqueda, setBusqueda]             = useState('')
  const [modalCrear, setModalCrear]         = useState(false)
  const [modalEditar, setModalEditar]       = useState<Usuario | null>(null)
  const [modalPassword, setModalPassword]   = useState<Usuario | null>(null)
  const [nuevaPassword, setNuevaPassword]   = useState('')
  const [confirmaPassword, setConfirmaPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [guardando, setGuardando]           = useState(false)

  const formInit: FormNuevo = {
    nombre: '',
    email: '',
    password: '',
    esAdmin: false,
    modulos: []
  }
  const [form, setForm] = useState<FormNuevo>(formInit)

  const cargarUsuarios = useCallback(async () => {
    setLoading(true)
    setErrorCarga(null)
    try {
      const res = await fetch('/api/usuarios')
      if (res.status === 401) {
        setUsuarios([])
        setErrorCarga({
          tipo: 'sesion',
          mensaje: 'Tu sesión venció. Inicia sesión nuevamente para continuar.',
        })
        return
      }
      if (res.status === 403) {
        setUsuarios([])
        setErrorCarga({
          tipo: 'acceso',
          mensaje: 'No tienes permisos para administrar las cuentas del sistema.',
        })
        return
      }
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`)
      }

      const data: unknown = await res.json()
      if (!Array.isArray(data)) {
        throw new Error('La respuesta de usuarios no es una lista')
      }
      setUsuarios(data)
    } catch {
      setUsuarios([])
      setErrorCarga({
        tipo: 'general',
        mensaje: 'No pudimos cargar los usuarios. Verifica la conexión e inténtalo nuevamente.',
      })
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarUsuarios() }, [cargarUsuarios])

  // Generador de contraseñas seguras
  const generarPasswordSegura = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#$@!'
    let pass = 'Dgnna.' + new Date().getFullYear() + '#'
    for (let i = 0; i < 3; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setForm(prev => ({ ...prev, password: pass }))
    navigator.clipboard?.writeText(pass)
    toast.success('Contraseña generada y copiada al portapapeles: ' + pass)
  }

  // Acciones masivas de permisos para formulario de creación
  const aplicarPermisoTodosCrear = (rol: 'registrador' | 'directora' | '') => {
    if (!rol) {
      setForm(prev => ({ ...prev, modulos: [] }))
    } else {
      const nuevos = MODULOS_DISPONIBLES.map(m => ({ modulo: m.id, rolModulo: rol }))
      setForm(prev => ({ ...prev, modulos: nuevos }))
    }
  }

  // Modificar rol de módulo individual en creación
  const toggleRolModuloCrear = (moduloId: string, rol: string) => {
    setForm(prev => {
      const filtrados = prev.modulos.filter(m => m.modulo !== moduloId)
      if (rol) {
        filtrados.push({ modulo: moduloId, rolModulo: rol })
      }
      return { ...prev, modulos: filtrados }
    })
  }

  // Acciones masivas para edición
  const aplicarPermisoTodosEditar = (rol: 'registrador' | 'directora' | '') => {
    if (!modalEditar) return
    if (!rol) {
      setModalEditar(prev => prev ? ({ ...prev, modulos: [] }) : null)
    } else {
      const nuevos = MODULOS_DISPONIBLES.map(m => ({ modulo: m.id, rolModulo: rol }))
      setModalEditar(prev => prev ? ({ ...prev, modulos: nuevos }) : null)
    }
  }

  // Modificar rol de módulo individual en edición
  const toggleRolModuloEditar = (moduloId: string, rol: string) => {
    if (!modalEditar) return
    const filtrados = (modalEditar.modulos || []).filter(m => m.modulo !== moduloId)
    if (rol) {
      filtrados.push({ modulo: moduloId, rolModulo: rol })
    }
    setModalEditar({ ...modalEditar, modulos: filtrados })
  }

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          rol: form.esAdmin ? 'admin' : 'usuario',
          modulos: form.esAdmin ? [] : form.modulos,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.detail ?? data.error ?? 'Error al crear usuario'); return }
      toast.success('¡Usuario creado correctamente!')
      setModalCrear(false)
      setForm(formInit)
      cargarUsuarios()
    } catch { toast.error('Error de conexión al crear usuario') }
    finally { setGuardando(false) }
  }

  const editarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalEditar) return
    setGuardando(true)
    try {
      const res = await fetch(`/api/usuarios/${modalEditar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: modalEditar.nombre.trim(),
          email: modalEditar.email.trim().toLowerCase(),
          rol: modalEditar.rol,
          modulos: modalEditar.rol !== 'admin' ? modalEditar.modulos : [],
        }),
      })
      if (!res.ok) { toast.error('Error al actualizar el usuario'); return }
      toast.success('Usuario actualizado exitosamente')
      setModalEditar(null)
      cargarUsuarios()
    } catch { toast.error('Error de conexión al actualizar usuario') }
    finally { setGuardando(false) }
  }

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalPassword) return
    if (nuevaPassword.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    if (nuevaPassword !== confirmaPassword) { toast.error('Las contraseñas no coinciden'); return }
    setGuardando(true)
    try {
      const res = await fetch(`/api/usuarios/${modalPassword.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nuevaPassword }),
      })
      if (!res.ok) { toast.error('Error al cambiar contraseña'); return }
      toast.success(`Contraseña de ${modalPassword.nombre} actualizada correctamente`)
      setModalPassword(null)
      setNuevaPassword('')
      setConfirmaPassword('')
    } catch { toast.error('Error cambiando contraseña') }
    finally { setGuardando(false) }
  }

  const toggleActivar = async (usuario: Usuario) => {
    const accion = usuario.activo ? 'desactivar' : 'activar'
    if (!confirm(`¿Deseas ${accion} a ${usuario.nombre}?`)) return
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !usuario.activo }),
      })
      if (!res.ok) { toast.error('No se pudo completar la acción'); return }
      toast.success(`Usuario ${usuario.activo ? 'desactivado' : 'activado'} correctamente`)
      cargarUsuarios()
    } catch { toast.error('Error') }
  }

  const filtrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header Superior */}
      <header className="bg-white border-b border-slate-200 shadow-2xs sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/menu">
              <button className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer" title="Volver al Menú">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Gestión de Usuarios y Permisos
              </h1>
              <p className="text-xs text-slate-500">Administración central de cuentas y matriz de accesos por módulo</p>
            </div>
          </div>
          {!errorCarga && (
            <button
              onClick={() => {
                setForm(formInit)
                setModalCrear(true)
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Leyenda y Filtros */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex flex-wrap gap-2.5 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" /> Administrador: Acceso total e irrestricto
            </span>
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg">
              <UserCheck className="w-3.5 h-3.5" /> Registrador: Registra, edita y tramita
            </span>
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <BookOpen className="w-3.5 h-3.5" /> Directora: Solo visualiza tableros y reportes
            </span>
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            />
          </div>
        </div>

        {/* Tabla Principal */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Users className="w-5 h-5 animate-pulse text-blue-600" /> Cargando lista de usuarios...
            </div>
          ) : errorCarga ? (
            <div role="alert" className="p-10 text-center">
              <p className="font-bold text-slate-900">
                {errorCarga.tipo === 'sesion'
                  ? 'Sesión expirada'
                  : errorCarga.tipo === 'acceso'
                    ? 'Acceso restringido'
                    : 'No se pudieron cargar los usuarios'}
              </p>
              <p className="mt-2 text-xs text-slate-600">{errorCarga.mensaje}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {errorCarga.tipo === 'general' ? (
                  <button
                    type="button"
                    onClick={cargarUsuarios}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                  >
                    Reintentar
                  </button>
                ) : (
                  <Link
                    href={errorCarga.tipo === 'sesion' ? '/login' : '/menu'}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                  >
                    {errorCarga.tipo === 'sesion' ? 'Iniciar sesión' : 'Volver al menú'}
                  </Link>
                )}
              </div>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No se encontraron usuarios que coincidan con la búsqueda.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  <th className="text-left px-5 py-3.5">Usuario Institucional</th>
                  <th className="text-left px-5 py-3.5">Permisos Asignados</th>
                  <th className="text-center px-5 py-3.5">Estado</th>
                  <th className="text-right px-5 py-3.5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0">
                          {u.nombre.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.nombre}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <RolBadge rol={u.rol} modulos={u.modulos ?? []} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        u.activo
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModalEditar({ ...u, modulos: u.modulos ?? [] })}
                          title="Editar permisos de usuario"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setModalPassword(u); setNuevaPassword(''); setConfirmaPassword('') }}
                          title="Cambiar contraseña"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActivar(u)}
                          title={u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            u.activo ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.activo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── MODAL CREAR USUARIO (DISEÑO ERGONÓMICO A 2 COLUMNAS) ── */}
      {modalCrear && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Crear Nuevo Usuario</h2>
                  <p className="text-xs text-slate-500">Completa los datos y asigna permisos por módulo en 1-clic</p>
                </div>
              </div>

              <button
                onClick={() => { setModalCrear(false); setForm(formInit) }}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario con Grid a 2 Columnas */}
            <form onSubmit={crearUsuario} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* COLUMNA IZQUIERDA: DATOS BÁSICOS Y TIPO DE ACCESO (5/12) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" /> Información de la Cuenta
                      </h3>

                      {/* Nombre */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Juan Pérez Ramos"
                          value={form.nombre}
                          onChange={e => setForm({ ...form, nombre: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                        />
                      </div>

                      {/* Correo */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Correo Institucional *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="usuario@mimp.gob.pe"
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                        />
                      </div>

                      {/* Contraseña con ojito y generador */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Contraseña Inicial *
                          </label>
                          <button
                            type="button"
                            onClick={generarPasswordSegura}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                            title="Generar contraseña segura aleatoria y copiarla"
                          >
                            <Dices className="w-3 h-3 text-amber-500" /> Generar Segura
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={mostrarPassword ? 'text' : 'password'}
                            required
                            placeholder="Mínimo 6 caracteres"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            className="w-full px-3 py-2 pr-9 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-mono font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarPassword(!mostrarPassword)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {mostrarPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Selector de Perfil Global */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-600" /> Nivel de Acceso Global
                      </h3>

                      <div className="space-y-2">
                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          !form.esAdmin
                            ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-400/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="perfil_global"
                            checked={!form.esAdmin}
                            onChange={() => setForm({ ...form, esAdmin: false })}
                            className="mt-0.5 accent-blue-600"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">Especialista / Usuario de Módulo</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Tiene acceso específico únicamente a los módulos marcados en la matriz derecha.
                            </p>
                          </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          form.esAdmin
                            ? 'bg-purple-50/60 border-purple-300 ring-1 ring-purple-400/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="perfil_global"
                            checked={form.esAdmin}
                            onChange={() => setForm({ ...form, esAdmin: true })}
                            className="mt-0.5 accent-purple-600"
                          />
                          <div>
                            <p className="text-xs font-bold text-purple-950">Administrador Global</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Acceso total e irrestricto a los 11 módulos, auditoría y panel de configuración de IA.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: MATRIZ DE ASIGNACIÓN DE MÓDULOS (7/12) */}
                  <div className="lg:col-span-7 space-y-3">
                    {form.esAdmin ? (
                      <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-2 h-full">
                        <ShieldCheck className="w-12 h-12 text-purple-600 animate-pulse" />
                        <h4 className="text-sm font-bold text-purple-950">Perfil de Administrador Seleccionado</h4>
                        <p className="text-xs text-purple-800 max-w-sm">
                          Este usuario tiene habilitados automáticamente todos los módulos del sistema con privilegios máximos.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Cabecera y Acciones Rápidas */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xs font-bold text-slate-900">Matriz de Permisos por Módulo</h3>
                              <p className="text-[10px] text-slate-500">Selecciona el rol exacto con 1-clic para cada área</p>
                            </div>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {form.modulos.length} de {MODULOS_DISPONIBLES.length} asignados
                            </span>
                          </div>

                          {/* Botones de acción masiva */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Rápido:</span>
                            <button
                              type="button"
                              onClick={() => aplicarPermisoTodosCrear('registrador')}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3 h-3" /> Todos Registrador
                            </button>
                            <button
                              type="button"
                              onClick={() => aplicarPermisoTodosCrear('directora')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <BookOpen className="w-3 h-3" /> Todos Consulta
                            </button>
                            <button
                              type="button"
                              onClick={() => aplicarPermisoTodosCrear('')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ml-auto"
                            >
                              <X className="w-3 h-3" /> Limpiar Todo
                            </button>
                          </div>
                        </div>

                        {/* Lista de Módulos con Botoneras de 1-Clic */}
                        <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                          {MODULOS_DISPONIBLES.map(mod => {
                            const asignado = form.modulos.find(m => m.modulo === mod.id)
                            const rolActual = asignado?.rolModulo || ''

                            return (
                              <div
                                key={mod.id}
                                className={`p-2.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs ${
                                  rolActual
                                    ? 'bg-white border-slate-300'
                                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${mod.color}`}>
                                    <mod.icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 leading-tight">{mod.label}</p>
                                    <p className="text-[10px] text-slate-400">{mod.desc}</p>
                                  </div>
                                </div>

                                {/* Botonera de 3 estados */}
                                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shrink-0 self-end sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => toggleRolModuloCrear(mod.id, '')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                      !rolActual
                                        ? 'bg-white text-slate-700 shadow-2xs border border-slate-200'
                                        : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    Sin Acceso
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleRolModuloCrear(mod.id, 'registrador')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                      rolActual === 'registrador'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-blue-700'
                                    }`}
                                  >
                                    <UserCheck className="w-3 h-3" /> Registrador
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleRolModuloCrear(mod.id, 'directora')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                      rolActual === 'directora'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-emerald-700'
                                    }`}
                                  >
                                    <BookOpen className="w-3 h-3" /> Solo Consulta
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* Footer Fijo del Modal */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
                <span className="text-[11px] text-slate-500">
                  Las cuentas creadas se integran con la autenticación JWT y auditoría institucional.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setModalCrear(false); setForm(formInit) }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {guardando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{guardando ? 'Guardando...' : 'Crear Usuario'}</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── MODAL EDITAR USUARIO (DISEÑO ERGONÓMICO A 2 COLUMNAS) ── */}
      {modalEditar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Editar Permisos de Usuario</h2>
                  <p className="text-xs text-slate-500">{modalEditar.email}</p>
                </div>
              </div>

              <button
                onClick={() => setModalEditar(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario de Edición */}
            <form onSubmit={editarUsuario} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* COLUMNA IZQUIERDA: DATOS BÁSICOS (5/12) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" /> Datos del Usuario
                      </h3>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          required
                          value={modalEditar.nombre}
                          onChange={e => setModalEditar({ ...modalEditar, nombre: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Correo Institucional
                        </label>
                        <input
                          type="email"
                          required
                          value={modalEditar.email}
                          onChange={e => setModalEditar({ ...modalEditar, email: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    {/* Selector de Perfil Global */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-600" /> Nivel de Acceso Global
                      </h3>

                      <div className="space-y-2">
                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          modalEditar.rol !== 'admin'
                            ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-400/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="perfil_editar"
                            checked={modalEditar.rol !== 'admin'}
                            onChange={() => setModalEditar({ ...modalEditar, rol: 'usuario' })}
                            className="mt-0.5 accent-blue-600"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">Especialista / Usuario de Módulo</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Permisos controlados por la matriz de módulos.
                            </p>
                          </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          modalEditar.rol === 'admin'
                            ? 'bg-purple-50/60 border-purple-300 ring-1 ring-purple-400/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="perfil_editar"
                            checked={modalEditar.rol === 'admin'}
                            onChange={() => setModalEditar({ ...modalEditar, rol: 'admin' })}
                            className="mt-0.5 accent-purple-600"
                          />
                          <div>
                            <p className="text-xs font-bold text-purple-950">Administrador Global</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Acceso irrestricto a todos los módulos y configuraciones.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: MATRIZ DE MÓDULOS (7/12) */}
                  <div className="lg:col-span-7 space-y-3">
                    {modalEditar.rol === 'admin' ? (
                      <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-2 h-full">
                        <ShieldCheck className="w-12 h-12 text-purple-600" />
                        <h4 className="text-sm font-bold text-purple-950">Administrador Global</h4>
                        <p className="text-xs text-purple-800 max-w-sm">
                          Este usuario tiene acceso total automático sin requerir permisos por módulo.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Cabecera y Acciones Rápidas */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xs font-bold text-slate-900">Permisos por Módulo</h3>
                              <p className="text-[10px] text-slate-500">Haz clic en el rol que deseas otorgar para cada área</p>
                            </div>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {(modalEditar.modulos || []).length} de {MODULOS_DISPONIBLES.length} asignados
                            </span>
                          </div>

                          {/* Botones de acción masiva */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Rápido:</span>
                            <button
                              type="button"
                              onClick={() => aplicarPermisoTodosEditar('registrador')}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3 h-3" /> Todos Registrador
                            </button>
                            <button
                              type="button"
                              onClick={() => aplicarPermisoTodosEditar('directora')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <BookOpen className="w-3 h-3" /> Todos Consulta
                            </button>
                            <button
                              type="button"
                              onClick={() => aplicarPermisoTodosEditar('')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ml-auto"
                            >
                              <X className="w-3 h-3" /> Limpiar Todo
                            </button>
                          </div>
                        </div>

                        {/* Lista de Módulos con Botoneras de 1-Clic */}
                        <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                          {MODULOS_DISPONIBLES.map(mod => {
                            const asignado = (modalEditar.modulos || []).find(m => m.modulo === mod.id)
                            const rolActual = asignado?.rolModulo || ''

                            return (
                              <div
                                key={mod.id}
                                className={`p-2.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs ${
                                  rolActual
                                    ? 'bg-white border-slate-300'
                                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${mod.color}`}>
                                    <mod.icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 leading-tight">{mod.label}</p>
                                    <p className="text-[10px] text-slate-400">{mod.desc}</p>
                                  </div>
                                </div>

                                {/* Botonera de 3 estados */}
                                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shrink-0 self-end sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => toggleRolModuloEditar(mod.id, '')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                      !rolActual
                                        ? 'bg-white text-slate-700 shadow-2xs border border-slate-200'
                                        : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    Sin Acceso
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleRolModuloEditar(mod.id, 'registrador')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                      rolActual === 'registrador'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-blue-700'
                                    }`}
                                  >
                                    <UserCheck className="w-3 h-3" /> Registrador
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleRolModuloEditar(mod.id, 'directora')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                      rolActual === 'directora'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-emerald-700'
                                    }`}
                                  >
                                    <BookOpen className="w-3 h-3" /> Solo Consulta
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* Footer Fijo del Modal */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
                <span className="text-[11px] text-slate-500">
                  Los cambios se reflejarán de inmediato en el menú del usuario.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalEditar(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {guardando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── MODAL CAMBIAR CONTRASEÑA ── */}
      {modalPassword && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Cambiar Contraseña</h2>
                  <p className="text-[11px] text-slate-500">{modalPassword.nombre}</p>
                </div>
              </div>
              <button
                onClick={() => { setModalPassword(null); setNuevaPassword(''); setConfirmaPassword('') }}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={cambiarPassword} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Nueva contraseña *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#$@!'
                      let pass = 'Dgnna.' + new Date().getFullYear() + '#'
                      for (let i = 0; i < 3; i++) {
                        pass += chars.charAt(Math.floor(Math.random() * chars.length))
                      }
                      setNuevaPassword(pass)
                      setConfirmaPassword(pass)
                      navigator.clipboard?.writeText(pass)
                      toast.success('Contraseña generada y copiada: ' + pass)
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Dices className="w-3 h-3 text-amber-500" /> Generar
                  </button>
                </div>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-mono font-medium"
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPassword}
                  onChange={e => setNuevaPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Confirmar contraseña *
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 font-mono font-medium"
                  placeholder="Repite la contraseña"
                  value={confirmaPassword}
                  onChange={e => setConfirmaPassword(e.target.value)}
                  required
                />
                {confirmaPassword && nuevaPassword !== confirmaPassword && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalPassword(null); setNuevaPassword(''); setConfirmaPassword('') }}
                  className="flex-1 border border-slate-300 text-slate-700 text-xs font-bold py-2 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || nuevaPassword !== confirmaPassword}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-bold py-2 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {guardando ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

