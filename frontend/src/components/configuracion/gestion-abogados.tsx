'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Power, PowerOff } from 'lucide-react'
import type { Abogado } from '@/types'

export function GestionAbogados() {
    const [abogados, setAbogados] = useState<Abogado[]>([])
    const [loading, setLoading] = useState(true)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [editando, setEditando] = useState<string | null>(null)
    const [nombreEditado, setNombreEditado] = useState('')

    useEffect(() => {
        fetchAbogados()
    }, [])

    const fetchAbogados = async () => {
        try {
            const res = await fetch('/api/abogados')
            const data = await res.json()
            setAbogados(data)
        } catch (error) {
            console.error('Error al cargar abogados:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAgregar = async () => {
        if (!nuevoNombre.trim()) { alert('Ingrese un nombre'); return }
        try {
            const res = await fetch('/api/abogados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevoNombre }),
            })
            if (!res.ok) throw new Error('Error al crear abogado')
            setNuevoNombre('')
            fetchAbogados()
        } catch (error) {
            console.error('Error:', error)
            alert('Error al crear abogado')
        }
    }

    const handleEditar = async (id: string, activo: boolean) => {
        if (!nombreEditado.trim()) { alert('Ingrese un nombre'); return }
        try {
            const res = await fetch(`/api/abogados/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nombreEditado, activo }),
            })
            if (!res.ok) throw new Error('Error al actualizar abogado')
            setEditando(null)
            setNombreEditado('')
            fetchAbogados()
        } catch (error) {
            console.error('Error:', error)
            alert('Error al actualizar abogado')
        }
    }

    const handleToggleActivo = async (id: string, nombre: string, activo: boolean) => {
        try {
            const res = await fetch(`/api/abogados/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, activo: !activo }),
            })
            if (!res.ok) throw new Error('Error al actualizar estado')
            fetchAbogados()
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
                    <Label htmlFor="nuevo-abogado">Nuevo Abogado</Label>
                    <Input
                        id="nuevo-abogado"
                        placeholder="Nombre del abogado"
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

            {/* Lista de abogados */}
            <div className="space-y-2">
                {abogados.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        No hay abogados registrados
                    </p>
                ) : (
                    abogados.map((abogado) => (
                        <div key={abogado.id} className="flex items-center gap-4 rounded-lg border p-4">
                            {editando === abogado.id ? (
                                <>
                                    <Input
                                        value={nombreEditado}
                                        onChange={(e) => setNombreEditado(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleEditar(abogado.id, abogado.activo)}
                                        className="flex-1"
                                    />
                                    <Button onClick={() => handleEditar(abogado.id, abogado.activo)} size="sm">Guardar</Button>
                                    <Button onClick={() => { setEditando(null); setNombreEditado('') }} variant="outline" size="sm">Cancelar</Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <p className="font-semibold">{abogado.nombre}</p>
                                        <p className="text-sm text-muted-foreground">ID: {abogado.id}</p>
                                    </div>
                                    <Badge variant={abogado.activo ? 'resuelto' : 'default'}>
                                        {abogado.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                    <Button
                                        onClick={() => { setEditando(abogado.id); setNombreEditado(abogado.nombre) }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => handleToggleActivo(abogado.id, abogado.nombre, abogado.activo)}
                                        variant={abogado.activo ? 'destructive' : 'default'}
                                        size="sm"
                                    >
                                        {abogado.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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
