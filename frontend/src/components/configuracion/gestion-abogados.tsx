'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, Link2, Plus, Power, PowerOff, Search, Unlink, UserCheck, UserPlus } from 'lucide-react'
import type { Abogado } from '@/types'
import { useMe } from '@/lib/use-me'

interface Usuario {
    id: string
    nombre: string
    email: string
    rol: string
    activo: boolean
    modulos: Array<{ modulo: string; rolModulo: string }>
}

const esUsuarioAbogado = (usuario: Usuario) => usuario.activo && usuario.rol !== 'admin' && usuario.modulos.some(
    (permiso) => permiso.modulo === 'apelaciones' && permiso.rolModulo === 'abogado',
)

export function GestionAbogados() {
    const { me } = useMe()
    const esAdmin = me?.rol === 'admin'
    const [abogados, setAbogados] = useState<Abogado[]>([])
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [loading, setLoading] = useState(true)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [editando, setEditando] = useState<string | null>(null)
    const [nombreEditado, setNombreEditado] = useState('')
    const [abogadoVinculando, setAbogadoVinculando] = useState<Abogado | null>(null)
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('')
    const [busqueda, setBusqueda] = useState('')
    const [guardandoVinculo, setGuardandoVinculo] = useState(false)

    const fetchAbogados = useCallback(async () => {
        const res = await fetch('/api/abogados')
        const data = await res.json()
        if (!res.ok || !Array.isArray(data)) throw new Error(data.detail ?? 'No se pudieron cargar los abogados')
        setAbogados(data)
    }, [])

    const fetchUsuarios = useCallback(async () => {
        if (!esAdmin) return
        const res = await fetch('/api/usuarios')
        const data = await res.json()
        if (!res.ok || !Array.isArray(data)) throw new Error(data.detail ?? 'No se pudieron cargar los usuarios')
        setUsuarios(data)
    }, [esAdmin])

    useEffect(() => {
        Promise.all([fetchAbogados(), fetchUsuarios()])
            .catch((error) => toast.error(error instanceof Error ? error.message : 'Error al cargar la configuración'))
            .finally(() => setLoading(false))
    }, [fetchAbogados, fetchUsuarios])

    const usuariosPorId = useMemo(() => new Map(usuarios.map((usuario) => [usuario.id, usuario])), [usuarios])
    const idsVinculados = useMemo(() => new Set(abogados.map((abogado) => abogado.usuarioId).filter(Boolean)), [abogados])
    const usuariosElegibles = useMemo(() => {
        const texto = busqueda.trim().toLocaleLowerCase('es')
        return usuarios.filter((usuario) => {
            const disponible = esUsuarioAbogado(usuario) && (!idsVinculados.has(usuario.id) || usuario.id === abogadoVinculando?.usuarioId)
            return disponible && (!texto || `${usuario.nombre} ${usuario.email}`.toLocaleLowerCase('es').includes(texto))
        })
    }, [abogadoVinculando?.usuarioId, busqueda, idsVinculados, usuarios])

    const recargar = async () => {
        await Promise.all([fetchAbogados(), fetchUsuarios()])
    }

    const handleAgregar = async () => {
        if (!nuevoNombre.trim()) { toast.error('Ingrese un nombre'); return }
        try {
            const res = await fetch('/api/abogados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nuevoNombre.trim() }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail ?? 'Error al crear abogado')
            setNuevoNombre('')
            await fetchAbogados()
            toast.success('Abogado registrado')
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al crear abogado') }
    }

    const handleEditar = async (id: string, activo: boolean) => {
        if (!nombreEditado.trim()) { toast.error('Ingrese un nombre'); return }
        try {
            const res = await fetch(`/api/abogados/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombreEditado.trim(), activo }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail ?? 'Error al actualizar abogado')
            setEditando(null)
            setNombreEditado('')
            await fetchAbogados()
            toast.success('Abogado actualizado')
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al actualizar abogado') }
    }

    const handleToggleActivo = async (abogado: Abogado) => {
        try {
            const res = await fetch(`/api/abogados/${abogado.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: abogado.nombre, activo: !abogado.activo }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail ?? 'Error al actualizar estado')
            await fetchAbogados()
            toast.success(abogado.activo ? 'Abogado desactivado' : 'Abogado activado')
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al actualizar estado') }
    }

    const abrirVinculacion = (abogado: Abogado) => {
        setAbogadoVinculando(abogado)
        setUsuarioSeleccionado(abogado.usuarioId ?? '')
        setBusqueda('')
    }

    const vincular = async () => {
        if (!abogadoVinculando || !usuarioSeleccionado) return
        setGuardandoVinculo(true)
        try {
            const res = await fetch(`/api/abogados/${abogadoVinculando.id}/usuario`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuarioId: usuarioSeleccionado }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail ?? 'No se pudo vincular el usuario')
            await recargar()
            setAbogadoVinculando(null)
            toast.success('Cuenta vinculada correctamente')
        } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo vincular el usuario') }
        finally { setGuardandoVinculo(false) }
    }

    const desvincular = async (abogado: Abogado) => {
        if (!window.confirm(`¿Desvincular la cuenta de ${abogado.nombre}? Sus expedientes no se eliminarán.`)) return
        try {
            const res = await fetch(`/api/abogados/${abogado.id}/usuario`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail ?? 'No se pudo desvincular la cuenta')
            await recargar()
            toast.success('Cuenta desvinculada')
        } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo desvincular la cuenta') }
    }

    if (loading) return <div className="py-8 text-center">Cargando...</div>

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <div className="flex-1"><Label htmlFor="nuevo-abogado">Nuevo Abogado</Label><Input id="nuevo-abogado" placeholder="Nombre del abogado" value={nuevoNombre} onChange={(event) => setNuevoNombre(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleAgregar()} /></div>
                <div className="flex items-end"><Button onClick={handleAgregar}><Plus className="mr-2 h-4 w-4" />Agregar</Button></div>
            </div>

            {!esAdmin && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Solo un administrador puede vincular cuentas de acceso. Puede continuar administrando el catálogo operativo de abogados.</div>}

            <div className="space-y-2">
                {abogados.length === 0 ? <p className="py-8 text-center text-muted-foreground">No hay abogados registrados</p> : abogados.map((abogado) => {
                    const usuario = abogado.usuarioId ? usuariosPorId.get(abogado.usuarioId) : undefined
                    return <div key={abogado.id} className="flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center">
                        {editando === abogado.id ? <><Input value={nombreEditado} onChange={(event) => setNombreEditado(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleEditar(abogado.id, abogado.activo)} className="flex-1" /><Button onClick={() => handleEditar(abogado.id, abogado.activo)} size="sm">Guardar</Button><Button onClick={() => { setEditando(null); setNombreEditado('') }} variant="outline" size="sm">Cancelar</Button></> : <>
                            <div className="min-w-0 flex-1"><p className="font-semibold">{abogado.nombre}</p><p className="truncate text-sm text-muted-foreground">ID: {abogado.id}</p></div>
                            <div className="min-w-0 lg:w-80">
                                {abogado.usuarioId ? <div className="flex items-start gap-2"><UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><div className="min-w-0"><p className="text-sm font-medium">{usuario?.nombre ?? 'Usuario vinculado'}</p><p className="truncate text-xs text-muted-foreground">{usuario?.email ?? abogado.usuarioId}</p></div></div> : <div className="flex items-center gap-2 text-sm text-amber-700"><UserPlus className="h-4 w-4" />Sin cuenta vinculada</div>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={abogado.activo ? 'resuelto' : 'default'}>{abogado.activo ? 'Activo' : 'Inactivo'}</Badge>
                                {esAdmin && <Button onClick={() => abrirVinculacion(abogado)} variant="outline" size="sm"><Link2 className="mr-2 h-4 w-4" />{abogado.usuarioId ? 'Cambiar cuenta' : 'Vincular usuario'}</Button>}
                                {esAdmin && abogado.usuarioId && <Button onClick={() => desvincular(abogado)} variant="outline" size="sm" aria-label={`Desvincular cuenta de ${abogado.nombre}`}><Unlink className="h-4 w-4" /></Button>}
                                <Button onClick={() => { setEditando(abogado.id); setNombreEditado(abogado.nombre) }} variant="outline" size="sm" aria-label={`Editar ${abogado.nombre}`}><Edit className="h-4 w-4" /></Button>
                                <Button onClick={() => handleToggleActivo(abogado)} variant={abogado.activo ? 'destructive' : 'default'} size="sm" aria-label={abogado.activo ? `Desactivar ${abogado.nombre}` : `Activar ${abogado.nombre}`}>{abogado.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}</Button>
                            </div>
                        </>}
                    </div>
                })}
            </div>

            <AlertDialog open={Boolean(abogadoVinculando)} onOpenChange={(open) => !open && setAbogadoVinculando(null)}>
                <AlertDialogContent className="sm:max-w-xl">
                    <AlertDialogHeader><AlertDialogTitle>Vincular usuario</AlertDialogTitle><AlertDialogDescription>Seleccione la cuenta que representará a {abogadoVinculando?.nombre}. Solo aparecen usuarios activos con rol Abogado en Apelaciones.</AlertDialogDescription></AlertDialogHeader>
                    <div className="space-y-3">
                        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o correo" className="pl-9" /></div>
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                            {usuariosElegibles.length ? usuariosElegibles.map((usuario) => <label key={usuario.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${usuarioSeleccionado === usuario.id ? 'border-blue-500 bg-blue-50' : ''}`}><input type="radio" name="usuario-abogado" value={usuario.id} checked={usuarioSeleccionado === usuario.id} onChange={() => setUsuarioSeleccionado(usuario.id)} /><span className="min-w-0"><span className="block text-sm font-medium">{usuario.nombre}</span><span className="block truncate text-xs text-muted-foreground">{usuario.email}</span></span></label>) : <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">No hay usuarios elegibles. Cree o edite una cuenta y asígnele el rol Abogado en el módulo de Apelaciones.</div>}
                        </div>
                        <Link href="/usuarios" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 underline" target="_blank"><UserPlus className="h-4 w-4" />Gestionar usuarios</Link>
                    </div>
                    <AlertDialogFooter><Button variant="outline" onClick={() => setAbogadoVinculando(null)}>Cancelar</Button><Button onClick={vincular} disabled={!usuarioSeleccionado || guardandoVinculo}>{guardandoVinculo ? 'Vinculando...' : 'Confirmar vínculo'}</Button></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
