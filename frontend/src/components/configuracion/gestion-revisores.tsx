'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Power, PowerOff } from 'lucide-react'
import type { Revisor } from '@/types'

export function GestionRevisores() {
    const [revisores, setRevisores] = useState<Revisor[]>([])
    const [loading, setLoading] = useState(true)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [editando, setEditando] = useState<string | null>(null)
    const [nombreEditado, setNombreEditado] = useState('')

    useEffect(() => {
        fetchRevisores()
    }, [])

    const fetchRevisores = async () => {
        try {
            const res = await fetch('/api/revisor')
            const data = await res.json()
            setRevisores(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error al cargar revisores:', error)
            setRevisores([])
        } finally {
            setLoading(false)
        }
    }

    const handleAgregar = async () => {
        if (!nuevoNombre.trim()) { alert('Ingrese un nombre'); return }
        try {
            const res = await fetch('/api/revisor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevoNombre }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail ?? 'Error al crear revisor')
            }
            setNuevoNombre('')
            fetchRevisores()
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Error al crear revisor')
        }
    }

    const handleEditar = async (id: string) => {
        if (!nombreEditado.trim()) { alert('Ingrese un nombre'); return }
        try {
            const res = await fetch(`/api/revisor/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nombreEditado }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail ?? 'Error al actualizar revisor')
            }
            setEditando(null)
            setNombreEditado('')
            fetchRevisores()
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Error al actualizar revisor')
        }
    }

    const handleToggleActivo = async (id: string, activo: boolean) => {
        try {
            const res = await fetch(`/api/revisor/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: !activo }),
            })
            if (!res.ok) throw new Error('Error al actualizar estado')
            fetchRevisores()
        } catch (error) {
            console.error('Error:', error)
            alert('Error al actualizar estado')
        }
    }

    const handleEliminar = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este revisor?')) return
        try {
            const res = await fetch(`/api/revisor/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Error al eliminar revisor')
            fetchRevisores()
        } catch (error) {
            console.error('Error:', error)
            alert('Error al eliminar revisor')
        }
    }

    if (loading) {
        return <div className="text-center py-8">Cargando...</div>
    }

    return (
        <div className="space-y-6">
            {/* Formulario para agregar */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <Label htmlFor="nuevo-revisor">Nuevo Revisor</Label>
                    <Input
                        id="nuevo-revisor"
                        placeholder="Nombre del revisor"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
                    />
                </div>
                <div className="flex items-end">
                    <Button onClick={handleAgregar}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                    </Button>
                </div>
            </div>

            {/* Lista de revisores */}
            <div className="space-y-2">
                {revisores.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        No hay revisores registrados
                    </p>
                ) : (
                    revisores.map((r) => (
                        <div key={r.id} className="flex items-center gap-4 rounded-lg border p-4">
                            {editando === r.id ? (
                                <>
                                    <Input
                                        value={nombreEditado}
                                        onChange={(e) => setNombreEditado(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleEditar(r.id)}
                                        className="flex-1"
                                    />
                                    <Button onClick={() => handleEditar(r.id)} size="sm">Guardar</Button>
                                    <Button
                                        onClick={() => { setEditando(null); setNombreEditado('') }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Cancelar
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <p className="font-semibold">{r.nombre}</p>
                                    </div>
                                    <Badge variant={r.activo ? 'resuelto' : 'default'}>
                                        {r.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                    <Button
                                        onClick={() => { setEditando(r.id); setNombreEditado(r.nombre) }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => handleToggleActivo(r.id, r.activo)}
                                        variant={r.activo ? 'destructive' : 'default'}
                                        size="sm"
                                    >
                                        {r.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                    </Button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
