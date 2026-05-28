'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit } from 'lucide-react'
import type { ExtensionRango } from '@/types'

export function GestionExtension() {
    const [rangos, setRangos] = useState<ExtensionRango[]>([])
    const [loading, setLoading] = useState(true)
    const [editando, setEditando] = useState<string | null>(null)
    const [puntosEditados, setPuntosEditados] = useState('')

    useEffect(() => {
        fetchRangos()
    }, [])

    const fetchRangos = async () => {
        try {
            const res = await fetch('/api/extension')
            const data = await res.json()
            setRangos(data)
        } catch (error) {
            console.error('Error al cargar rangos:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEditar = async (id: string) => {
        if (!puntosEditados) {
            alert('Ingrese los puntos')
            return
        }

        try {
            const res = await fetch(`/api/extension/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puntos: parseInt(puntosEditados) }),
            })

            if (!res.ok) throw new Error('Error al actualizar rango')

            setEditando(null)
            setPuntosEditados('')
            fetchRangos()
        } catch (error) {
            console.error('Error:', error)
            alert('Error al actualizar rango')
        }
    }

    if (loading) {
        return <div className="text-center py-8">Cargando...</div>
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Configure los puntos asignados a cada rango de folios. Los rangos no se pueden eliminar.
            </p>

            <div className="space-y-2">
                {rangos.map((rango) => (
                    <div
                        key={rango.id}
                        className="flex items-center gap-4 rounded-lg border p-4"
                    >
                        {editando === rango.id ? (
                            <>
                                <div className="flex-1">
                                    <p className="font-semibold">{rango.descripcion}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {rango.minFolios} - {rango.maxFolios || '∞'} folios
                                    </p>
                                </div>
                                <div className="w-24">
                                    <Label htmlFor={`puntos-${rango.id}`}>Puntos</Label>
                                    <Input
                                        id={`puntos-${rango.id}`}
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={puntosEditados}
                                        onChange={(e) => setPuntosEditados(e.target.value)}
                                    />
                                </div>
                                <Button onClick={() => handleEditar(rango.id)} size="sm">
                                    Guardar
                                </Button>
                                <Button
                                    onClick={() => {
                                        setEditando(null)
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
                                    <p className="font-semibold">{rango.descripcion}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {rango.minFolios} - {rango.maxFolios || '∞'} folios
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-primary">{rango.puntos}</p>
                                    <p className="text-xs text-muted-foreground">punto{rango.puntos !== 1 ? 's' : ''}</p>
                                </div>
                                <Button
                                    onClick={() => {
                                        setEditando(rango.id)
                                        setPuntosEditados(rango.puntos.toString())
                                    }}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
