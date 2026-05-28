'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Power, PowerOff } from 'lucide-react'
import type { Procedencia } from '@/types'

export function GestionProcedencias() {
    const [procedencias, setProcedencias] = useState<Procedencia[]>([])
    const [loading, setLoading] = useState(true)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [editando, setEditando] = useState<string | null>(null)
    const [nombreEditado, setNombreEditado] = useState('')

    useEffect(() => {
        fetchProcedencias()
    }, [])

    const fetchProcedencias = async () => {
        try {
            const res = await fetch('/api/procedencia')
            const data = await res.json()
            setProcedencias(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error al cargar procedencias:', error)
            setProcedencias([])
        } finally {
            setLoading(false)
        }
    }

    const handleAgregar = async () => {
        if (!nuevoNombre.trim()) { alert('Ingrese un nombre'); return }
        try {
            const res = await fetch('/api/procedencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevoNombre }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail ?? 'Error al crear procedencia')
            }
            setNuevoNombre('')
            fetchProcedencias()
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Error al crear procedencia')
        }
    }

    const handleEditar = async (id: string) => {
        if (!nombreEditado.trim()) { alert('Ingrese un nombre'); return }
        try {
            const res = await fetch(`/api/procedencia/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nombreEditado }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail ?? 'Error al actualizar procedencia')
            }
            setEditando(null)
            setNombreEditado('')
            fetchProcedencias()
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Error al actualizar procedencia')
        }
    }

    const handleToggleActivo = async (id: string, activo: boolean) => {
        try {
            const res = await fetch(`/api/procedencia/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: !activo }),
            })
            if (!res.ok) throw new Error('Error al actualizar estado')
            fetchProcedencias()
        } catch (error) {
            console.error('Error:', error)
            alert('Error al actualizar estado')
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
                    <Label htmlFor="nueva-procedencia">Nueva Procedencia</Label>
                    <Input
                        id="nueva-procedencia"
                        placeholder="Nombre de la procedencia"
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

            {/* Lista de procedencias */}
            <div className="space-y-2">
                {procedencias.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        No hay procedencias registradas
                    </p>
                ) : (
                    procedencias.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 rounded-lg border p-4">
                            {editando === p.id ? (
                                <>
                                    <Input
                                        value={nombreEditado}
                                        onChange={(e) => setNombreEditado(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleEditar(p.id)}
                                        className="flex-1"
                                    />
                                    <Button onClick={() => handleEditar(p.id)} size="sm">Guardar</Button>
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
                                        <p className="font-semibold">{p.nombre}</p>
                                    </div>
                                    <Badge variant={p.activo ? 'resuelto' : 'default'}>
                                        {p.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                    <Button
                                        onClick={() => { setEditando(p.id); setNombreEditado(p.nombre) }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => handleToggleActivo(p.id, p.activo)}
                                        variant={p.activo ? 'destructive' : 'default'}
                                        size="sm"
                                    >
                                        {p.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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
