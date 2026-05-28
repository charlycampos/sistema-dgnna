'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Power, PowerOff } from 'lucide-react'
import type { ComplejidadJuridica } from '@/types'

export function GestionComplejidad() {
    const [complejidades, setComplejidades] = useState<ComplejidadJuridica[]>([])
    const [loading, setLoading] = useState(true)
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [nuevosPuntos, setNuevosPuntos] = useState('1')
    const [editando, setEditando] = useState<string | null>(null)
    const [nombreEditado, setNombreEditado] = useState('')
    const [puntosEditados, setPuntosEditados] = useState('')

    useEffect(() => {
        fetchComplejidades()
    }, [])

    const fetchComplejidades = async () => {
        try {
            const res = await fetch('/api/complejidad')
            const data = await res.json()
            setComplejidades(data)
        } catch (error) {
            console.error('Error al cargar complejidades:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAgregar = async () => {
        if (!nuevoNombre.trim() || !nuevosPuntos) {
            alert('Complete todos los campos')
            return
        }

        try {
            const res = await fetch('/api/complejidad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: nuevoNombre,
                    puntos: parseInt(nuevosPuntos),
                }),
            })

            if (!res.ok) throw new Error('Error al crear complejidad')

            setNuevoNombre('')
            setNuevosPuntos('1')
            fetchComplejidades()
        } catch (error) {
            console.error('Error:', error)
            alert('Error al crear complejidad')
        }
    }

    const handleEditar = async (id: string) => {
        if (!nombreEditado.trim() || !puntosEditados) {
            alert('Complete todos los campos')
            return
        }

        try {
            const res = await fetch(`/api/complejidad/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: nombreEditado,
                    puntos: parseInt(puntosEditados),
                }),
            })

            if (!res.ok) throw new Error('Error al actualizar complejidad')

            setEditando(null)
            setNombreEditado('')
            setPuntosEditados('')
            fetchComplejidades()
        } catch (error) {
            console.error('Error:', error)
            alert('Error al actualizar complejidad')
        }
    }

    const handleToggleActivo = async (id: string, activo: boolean) => {
        try {
            const res = await fetch(`/api/complejidad/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: !activo }),
            })

            if (!res.ok) throw new Error('Error al actualizar estado')

            fetchComplejidades()
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
            <div className="flex gap-4">
                <div className="flex-1">
                    <Label htmlFor="nuevo-nombre">Nombre del Tipo</Label>
                    <Input
                        id="nuevo-nombre"
                        placeholder="Ej: Adopciones"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                    />
                </div>
                <div className="w-32">
                    <Label htmlFor="nuevos-puntos">Puntos</Label>
                    <Input
                        id="nuevos-puntos"
                        type="number"
                        min="1"
                        max="10"
                        value={nuevosPuntos}
                        onChange={(e) => setNuevosPuntos(e.target.value)}
                    />
                </div>
                <div className="flex items-end">
                    <Button onClick={handleAgregar}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {complejidades.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        No hay tipos de complejidad registrados
                    </p>
                ) : (
                    complejidades.map((comp) => (
                        <div
                            key={comp.id}
                            className="flex items-center gap-4 rounded-lg border p-4"
                        >
                            {editando === comp.id ? (
                                <>
                                    <Input
                                        value={nombreEditado}
                                        onChange={(e) => setNombreEditado(e.target.value)}
                                        className="flex-1"
                                        placeholder="Nombre"
                                    />
                                    <Input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={puntosEditados}
                                        onChange={(e) => setPuntosEditados(e.target.value)}
                                        className="w-24"
                                        placeholder="Puntos"
                                    />
                                    <Button onClick={() => handleEditar(comp.id)} size="sm">
                                        Guardar
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setEditando(null)
                                            setNombreEditado('')
                                            setPuntosEditados('')
                                        }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Cancelar
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <p className="font-semibold">{comp.nombre}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {comp.puntos} punto{comp.puntos !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <Badge variant={comp.activo ? 'resuelto' : 'default'}>
                                        {comp.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                    <Button
                                        onClick={() => {
                                            setEditando(comp.id)
                                            setNombreEditado(comp.nombre)
                                            setPuntosEditados(comp.puntos.toString())
                                        }}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => handleToggleActivo(comp.id, comp.activo)}
                                        variant={comp.activo ? 'destructive' : 'default'}
                                        size="sm"
                                    >
                                        {comp.activo ? (
                                            <PowerOff className="h-4 w-4" />
                                        ) : (
                                            <Power className="h-4 w-4" />
                                        )}
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
