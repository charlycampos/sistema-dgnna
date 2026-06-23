'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Users, Plus, ArrowLeft, Pencil, PowerOff, Power,
  ShieldCheck, UserCheck, BookOpen, Search, Globe, KeyRound
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

const MODULOS_DISPONIBLES = [
  { id: 'apelaciones',     label: 'Módulo Apelaciones' },
  { id: 'sustraccion',     label: 'Módulo Sustracción Internacional' },
  { id: 'proyectos-ley',   label: 'Módulo Proyectos de Ley' },
  { id: 'sala-reuniones',  label: 'Sala de Reuniones' },
  { id: 'transparencia',   label: 'Módulo Ley de Transparencia' },
  { id: 'fortalecimiento', label: 'Módulo Fortalecimiento de Capacidades' },
  { id: 'poi-pp117',       label: 'Módulo POI - PP117' },
]

const ROL_MODULO_OPTIONS = [
  { value: 'registrador', label: 'Registrador' },
  { value: 'directora',   label: 'Directora / Solo visualización' },
]

function RolBadge({ rol, modulos }: { rol: string; modulos: ModuloPermiso[] }) {
  if (rol === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
        <ShieldCheck className="w-3.5 h-3.5" />
        Administrador
      </span>
    )
  }
  if (modulos.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
        Sin módulos
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {modulos.map(m => (
        <span key={m.modulo} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
          m.rolModulo === 'registrador' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
        }`}>
          {m.rolModulo === 'registrador'
            ? <UserCheck className="w-3.5 h-3.5" />
            : <BookOpen className="w-3.5 h-3.5" />
          }
          {m.rolModulo === 'registrador' ? 'Registrador' : 'Directora'} · {m.modulo}
        </span>
      ))}
    </div>
  )
}

type FormNuevo = {
  nombre: string; email: string; password: string
  esAdmin: boolean
  modulos: { modulo: string; rolModulo: string }[]
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios]             = useState<Usuario[]>([])
  const [loading, setLoading]               = useState(true)
  const [busqueda, setBusqueda]             = useState('')
  const [modalCrear, setModalCrear]         = useState(false)
  const [modalEditar, setModalEditar]       = useState<Usuario | null>(null)
  const [modalPassword, setModalPassword]   = useState<Usuario | null>(null)
  const [nuevaPassword, setNuevaPassword]   = useState('')
  const [confirmaPassword, setConfirmaPassword] = useState('')
  const [guardando, setGuardando]           = useState(false)

  const formInit: FormNuevo = {
    nombre: '', email: '', password: '', esAdmin: false,
    modulos: [{ modulo: 'apelaciones', rolModulo: 'registrador' }]
  }
  const [form, setForm] = useState<FormNuevo>(formInit)

  const cargarUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/usuarios')
      if (res.status === 403) { toast.error('Acceso denegado'); return }
      setUsuarios(await res.json())
    } catch { toast.error('Error cargando usuarios') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarUsuarios() }, [cargarUsuarios])

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          password: form.password,
          rol: form.esAdmin ? 'admin' : 'usuario',
          modulos: form.esAdmin ? [] : form.modulos,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.detail ?? data.error); return }
      toast.success('Usuario creado correctamente')
      setModalCrear(false)
      setForm(formInit)
      cargarUsuarios()
    } catch { toast.error('Error creando usuario') }
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
          nombre: modalEditar.nombre,
          modulos: modalEditar.rol !== 'admin' ? modalEditar.modulos : [],
        }),
      })
      if (!res.ok) { toast.error('Error al actualizar'); return }
      toast.success('Usuario actualizado')
      setModalEditar(null)
      cargarUsuarios()
    } catch { toast.error('Error actualizando usuario') }
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
      toast.success(`Contraseña de ${modalPassword.nombre} actualizada`)
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

  // Helper para editar módulo de un usuario en el modal
  const setModuloRol = (modulo: string, rolModulo: string) => {
    if (!modalEditar) return
    const modulos = modalEditar.modulos.filter(m => m.modulo !== modulo)
    if (rolModulo) modulos.push({ modulo, rolModulo })
    setModalEditar({ ...modalEditar, modulos })
  }

  const filtrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/menu">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Gestión de Usuarios
              </h1>
              <p className="text-xs text-gray-400">Administración de cuentas y permisos por módulo</p>
            </div>
          </div>
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Leyenda de roles */}
        <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500">
          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Admin: acceso total</span>
          <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-blue-600" /> Registrador: registra, edita, visualiza</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-teal-600" /> Directora: solo visualiza dashboard y reportes</span>
        </div>

        {/* Buscador */}
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Cargando usuarios...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No se encontraron usuarios</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Usuario</th>
                  <th className="text-left px-5 py-3">Permisos</th>
                  <th className="text-center px-5 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.nombre.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.nombre}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <RolBadge rol={u.rol} modulos={u.modulos ?? []} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-green-500' : 'bg-red-400'}`} />
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModalEditar({ ...u, modulos: u.modulos ?? [] })}
                          title="Editar usuario"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setModalPassword(u); setNuevaPassword(''); setConfirmaPassword('') }}
                          title="Cambiar contraseña"
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActivar(u)}
                          title={u.activo ? 'Desactivar' : 'Activar'}
                          className={`p-1.5 rounded-lg transition-colors ${u.activo ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
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

      {/* ── Modal Crear Usuario ── */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b">
              <h2 className="font-bold text-gray-900">Nuevo Usuario</h2>
              <p className="text-xs text-gray-400 mt-0.5">Completa los datos para crear la cuenta</p>
            </div>
            <form onSubmit={crearUsuario} className="p-6 space-y-4">
              <input
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Nombre completo *"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
              />
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Correo electrónico *"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Contraseña *"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />

              {/* Tipo de usuario */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Tipo de acceso</p>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={!form.esAdmin}
                    onChange={() => setForm({ ...form, esAdmin: false })}
                    className="accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Usuario de módulo</p>
                    <p className="text-xs text-gray-400">Accede solo a los módulos asignados</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={form.esAdmin}
                    onChange={() => setForm({ ...form, esAdmin: true })}
                    className="accent-purple-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Administrador</p>
                    <p className="text-xs text-gray-400">Acceso total a todos los módulos</p>
                  </div>
                </label>
              </div>

              {/* Asignación de módulos (solo si no es admin) */}
              {!form.esAdmin && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Asignación de módulos</p>
                  {MODULOS_DISPONIBLES.map(mod => {
                    const asignado = form.modulos.find(m => m.modulo === mod.id)
                    return (
                      <div key={mod.id} className="p-3 rounded-lg border space-y-2">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700">{mod.label}</span>
                        </div>
                        <select
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400"
                          value={asignado?.rolModulo ?? ''}
                          onChange={e => {
                            const val = e.target.value
                            const modulos = form.modulos.filter(m => m.modulo !== mod.id)
                            if (val) modulos.push({ modulo: mod.id, rolModulo: val })
                            setForm({ ...form, modulos })
                          }}
                        >
                          <option value="">— Sin acceso —</option>
                          {ROL_MODULO_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalCrear(false); setForm(formInit) }}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Editar Usuario ── */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b">
              <h2 className="font-bold text-gray-900">Editar Usuario</h2>
              <p className="text-xs text-gray-400 mt-0.5">{modalEditar.email}</p>
            </div>
            <form onSubmit={editarUsuario} className="p-6 space-y-4">
              <input
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Nombre completo *"
                value={modalEditar.nombre}
                onChange={e => setModalEditar({ ...modalEditar, nombre: e.target.value })}
                required
              />

              {/* Módulos (solo para no-admin) */}
              {modalEditar.rol !== 'admin' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Permisos por módulo</p>
                  {MODULOS_DISPONIBLES.map(mod => {
                    const asignado = modalEditar.modulos.find(m => m.modulo === mod.id)
                    return (
                      <div key={mod.id} className="p-3 rounded-lg border space-y-2">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-700">{mod.label}</span>
                        </div>
                        <select
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400"
                          value={asignado?.rolModulo ?? ''}
                          onChange={e => setModuloRol(mod.id, e.target.value)}
                        >
                          <option value="">— Sin acceso —</option>
                          {ROL_MODULO_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Cambiar Contraseña ── */}
      {modalPassword && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Cambiar Contraseña</h2>
                <p className="text-xs text-gray-400 mt-0.5">{modalPassword.nombre}</p>
              </div>
            </div>
            <form onSubmit={cambiarPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nueva contraseña</label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPassword}
                  onChange={e => setNuevaPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirmar contraseña</label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  placeholder="Repite la contraseña"
                  value={confirmaPassword}
                  onChange={e => setConfirmaPassword(e.target.value)}
                  required
                />
                {confirmaPassword && nuevaPassword !== confirmaPassword && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalPassword(null); setNuevaPassword(''); setConfirmaPassword('') }}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || nuevaPassword !== confirmaPassword}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
