'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { apelacionSchema } from '@/lib/validations'
import { calcularPuntosExtension } from '@/lib/calcular-puntos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2, User, Building, Search } from 'lucide-react'
import Link from 'next/link'
import type { ComplejidadJuridica, CargaAbogado, Procedencia } from '@/types'
import type { z } from 'zod'
import { PanelAsignacion } from '@/components/panel-asignacion'
import { toast } from 'sonner'
import { Appellant, serializeAppellants, deserializeAppellants, NnaCarItem, serializeNnaCar, deserializeNnaCar } from '@/lib/utils'

type ApelacionFormValues = z.infer<typeof apelacionSchema>

const dateToValue = (v: unknown): string => {
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0]
    return ''
}
const valueToDate = (str: string): Date | null => {
    if (!str || str.length < 10) return null
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
}

interface SearchableSelectProps {
    options: { id: string; nombre: string }[]
    value: string
    onChange: (val: string) => void
    placeholder?: string
}

function SearchableSelect({ options, value, onChange, placeholder = 'Seleccione...' }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Filtrado insensible a acentos
    const filteredOptions = options.filter(opt =>
        opt.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
            searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        )
    )

    useEffect(() => {
        setFocusedIndex(-1)
    }, [searchQuery, isOpen])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                setIsOpen(true)
            }
            return
        }

        if (e.key === 'Escape') {
            setIsOpen(false)
            return
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedIndex(prev => (prev + 1) % Math.max(1, filteredOptions.length))
            setTimeout(() => {
                const element = listRef.current?.children[focusedIndex + 1] as HTMLElement
                if (element) {
                    element.scrollIntoView({ block: 'nearest' })
                }
            }, 10)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedIndex(prev => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length))
            setTimeout(() => {
                const element = listRef.current?.children[focusedIndex - 1] as HTMLElement
                if (element) {
                    element.scrollIntoView({ block: 'nearest' })
                }
            }, 10)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
                onChange(filteredOptions[focusedIndex].nombre)
                setIsOpen(false)
                setSearchQuery('')
            }
        }
    }

    return (
        <div ref={containerRef} className="relative w-full" onKeyDown={handleKeyDown}>
            <div
                tabIndex={0}
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
                <span className={value ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {value || placeholder}
                </span>
                <span className="text-[10px] opacity-50">▼</span>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-80 slide-in-from-top-1">
                    <div className="flex items-center border-b px-2 py-1.5 bg-muted/40">
                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        <input
                            type="text"
                            placeholder="Buscar procedencia..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex h-7 w-full rounded-md bg-transparent text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            autoFocus
                        />
                    </div>
                    <div ref={listRef} className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                        {filteredOptions.length === 0 ? (
                            <div className="py-3 text-center text-xs text-muted-foreground">
                                Sin resultados.
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = value === opt.nombre
                                const isFocused = idx === focusedIndex
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => {
                                            onChange(opt.nombre)
                                            setIsOpen(false)
                                            setSearchQuery('')
                                        }}
                                        className={`relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none transition-colors ${
                                            isFocused ? 'bg-accent text-accent-foreground font-medium' : ''
                                        } ${
                                            isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/60 text-foreground'
                                        }`}
                                    >
                                        <span className="flex-1 truncate">{opt.nombre}</span>
                                        {isSelected && <span className="text-primary text-[10px] ml-2">✓</span>}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function NuevaApelacionPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [pendingData, setPendingData] = useState<ApelacionFormValues | null>(null)
    const [complejidades, setComplejidades] = useState<ComplejidadJuridica[]>([])
    const [procedencias, setProcedencias] = useState<Procedencia[]>([])
    const [cargaAbogados, setCargaAbogados] = useState<CargaAbogado[]>([])
    const [expedienteDuplicado, setExpedienteDuplicado] = useState(false)
    const [expedientesExistentes, setExpedientesExistentes] = useState<string[]>([])
    const [listaApelacionesCompleta, setListaApelacionesCompleta] = useState<any[]>([])

    // NUEVOS ESTADOS PARA RESOLUCIÓN DE COINCIDENCIAS
    const [showCoincidenciasResolucionModal, setShowCoincidenciasResolucionModal] = useState(false)
    const [coincidenciasParaResolucion, setCoincidenciasParaResolucion] = useState<any[]>([])
    const [selectedExpedienteVinculo, setSelectedExpedienteVinculo] = useState<any | null>(null)

    const form = useForm<ApelacionFormValues>({
        resolver: zodResolver(apelacionSchema) as any,
        defaultValues: {
            numeroExpediente: '',
            fechaIngreso: new Date(),
            fechaIngresoMIMP: null,
            plazoVencimiento: null,
            apelante: '',
            nnaCar: '',
            apelantes: [
                { tipo: 'natural', nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '' }
            ],
            nnas: [
                { tipo: 'natural', nombres: '', primerApellido: '', segundoApellido: '', edad: '', institucion: '' }
            ],
            procedencia: '',
            documento: '',
            asunto: '',
            folios: 1,
            complejidadId: '',
            abogadoId: '',
            fechaAsignacion: new Date(),
            estado: 'Pendiente',
            numeroResolucion: '',
            documentoAtencion: '',
            cargos: '',
            observaciones: '',
        },
    })

    const [tipoApelante, setTipoApelante] = useState<'natural' | 'institucion'>('natural')
    const [appellants, setAppellants] = useState<Appellant[]>([
        { tipo: 'natural', nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '' }
    ])

    const [selectedCoincidencia, setSelectedCoincidencia] = useState<any | null>(null)
    const [loadingCoincidencia, setLoadingCoincidencia] = useState(false)
    const [coincidenciaDetails, setCoincidenciaDetails] = useState<any | null>(null)

    const verDetalleCoincidencia = async (coincidencia: any) => {
        setSelectedCoincidencia(coincidencia)
        setLoadingCoincidencia(true)
        setCoincidenciaDetails(null)
        try {
            const res = await fetch(`/api/apelaciones/${coincidencia.id}`)
            if (res.ok) {
                const data = await res.json()
                setCoincidenciaDetails(data)
            } else {
                toast.error('No se pudieron obtener los detalles del expediente')
            }
        } catch (error) {
            console.error('Error al obtener detalle:', error)
        } finally {
            setLoadingCoincidencia(false)
        }
    }

    const [coincidenciasApelantes, setCoincidenciasApelantes] = useState<{ [index: number]: any[] }>({})

    // Serialización simple para comparar cambios y evitar loops
    const serializedAppellantsStr = JSON.stringify(appellants.map(app => ({
        tipo: app.tipo,
        nombres: app.nombres?.trim() || "",
        apellidoPaterno: app.apellidoPaterno?.trim() || "",
        institucion: app.institucion?.trim() || ""
    })))

    useEffect(() => {
        form.setValue('apelante', serializeAppellants(appellants), { shouldValidate: true })
        form.setValue('apelantes', appellants, { shouldValidate: true })
    }, [appellants, form])

    useEffect(() => {
        console.log("Reactivo useEffect: appellants cambiado!", appellants);
        const timers: NodeJS.Timeout[] = []

        appellants.forEach((app, index) => {
            const isNatural = app.tipo === 'natural'
            const nomClean = app.nombres ? app.nombres.trim() : ""
            const patClean = app.apellidoPaterno ? app.apellidoPaterno.trim() : ""
            const instClean = app.institucion ? app.institucion.trim() : ""

            const hasData = (isNatural && nomClean.length >= 3 && patClean.length >= 3) || (!isNatural && instClean.length >= 3)

            console.log(`Evaluando Apelante index ${index}: tipo=${app.tipo}, nombres='${nomClean}' (${nomClean.length}), apellidoPaterno='${patClean}' (${patClean.length}). tieneDatos=${hasData}`);

            if (!hasData) {
                setCoincidenciasApelantes(prev => {
                    if (prev[index] && prev[index].length > 0) {
                        console.log(`Limpiando coincidencias para index ${index}`);
                        const next = { ...prev }
                        delete next[index]
                        return next
                    }
                    return prev
                })
                return;
            }

            console.log(`Programando debounce de 600ms para index ${index}...`);
            const timer = setTimeout(async () => {
                try {
                    let url = '/api/apelantes/buscar-coincidencias?'
                    if (isNatural) {
                        url += `nombres=${encodeURIComponent(nomClean)}&apellidoPaterno=${encodeURIComponent(patClean)}`
                    } else {
                        url += `institucion=${encodeURIComponent(instClean)}`
                    }

                    console.log(`Lanzando petición fetch para index ${index}:`, url);
                    const res = await fetch(url)
                    console.log(`Respuesta fetch para index ${index}: status=${res.status}`);
                    if (res.ok) {
                        const data = await res.json()
                        console.log(`Coincidencias recibidas para index ${index}:`, data);
                        setCoincidenciasApelantes(prev => ({
                            ...prev,
                            [index]: data
                        }))
                    } else {
                        const errText = await res.text();
                        console.error(`Error respuesta HTTP para index ${index}:`, errText);
                    }
                } catch (error) {
                    console.error('Error al buscar coincidencias:', error)
                }
            }, 600)

            timers.push(timer)
        })

        return () => {
            timers.forEach(t => clearTimeout(t))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serializedAppellantsStr])

    const [tipoNna, setTipoNna] = useState<'natural' | 'institucion'>('natural')
    const [nnaItems, setNnaItems] = useState<NnaCarItem[]>([
        { tipo: 'natural', nombres: '', primerApellido: '', segundoApellido: '', edad: '' }
    ])

    const [coincidenciasNna, setCoincidenciasNna] = useState<{ [index: number]: any[] }>({})

    // Serialización simple para comparar cambios y evitar loops
    const serializedNnaItemsStr = JSON.stringify(nnaItems.map(item => ({
        tipo: item.tipo,
        nombres: item.nombres?.trim() || "",
        primerApellido: item.primerApellido?.trim() || "",
        institucion: item.institucion?.trim() || ""
    })))

    useEffect(() => {
        form.setValue('nnaCar', serializeNnaCar(nnaItems), { shouldValidate: true })
        form.setValue('nnas', nnaItems, { shouldValidate: true })
    }, [nnaItems, form])

    useEffect(() => {
        console.log("Reactivo useEffect: nnaItems cambiado!", nnaItems);
        const timers: NodeJS.Timeout[] = []

        nnaItems.forEach((nna, index) => {
            const isNatural = nna.tipo === 'natural'
            const nomClean = nna.nombres ? nna.nombres.trim() : ""
            const apeClean = nna.primerApellido ? nna.primerApellido.trim() : ""

            // SOLO PARA NNA natural, no para CAR
            const hasData = isNatural && nomClean.length >= 3 && apeClean.length >= 3

            console.log(`Evaluando NNA index ${index}: tipo=${nna.tipo}, nombres='${nomClean}' (${nomClean.length}), primerApellido='${apeClean}' (${apeClean.length}). tieneDatos=${hasData}`);

            if (!hasData) {
                setCoincidenciasNna(prev => {
                    if (prev[index] && prev[index].length > 0) {
                        console.log(`Limpiando coincidencias NNA para index ${index}`);
                        const next = { ...prev }
                        delete next[index]
                        return next
                    }
                    return prev
                })
                return;
            }

            console.log(`Programando NNA debounce de 600ms para index ${index}...`);
            const timer = setTimeout(async () => {
                try {
                    const url = `/api/nna/buscar-coincidencias?nombres=${encodeURIComponent(nomClean)}&primerApellido=${encodeURIComponent(apeClean)}`
                    console.log(`Lanzando petición NNA fetch para index ${index}:`, url);
                    const res = await fetch(url)
                    console.log(`Respuesta NNA fetch para index ${index}: status=${res.status}`);
                    if (res.ok) {
                        const data = await res.json()
                        console.log(`Coincidencias NNA recibidas para index ${index}:`, data);
                        setCoincidenciasNna(prev => ({
                            ...prev,
                            [index]: data
                        }))
                    } else {
                        const errText = await res.text();
                        console.error(`Error respuesta HTTP NNA para index ${index}:`, errText);
                    }
                } catch (error) {
                    console.error('Error al buscar coincidencias NNA:', error)
                }
            }, 600)

            timers.push(timer)
        })

        return () => {
            timers.forEach(t => clearTimeout(t))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serializedNnaItemsStr])

    const getTodasLasCoincidencias = (): any[] => {
        const todas: any[] = [];
        const seenIds = new Set<string>();

        Object.values(coincidenciasApelantes).forEach((arr) => {
            if (Array.isArray(arr)) {
                arr.forEach((item) => {
                    if (item && item.id && !seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        todas.push({ ...item, origen: "Apelante" });
                    }
                });
            }
        });

        Object.values(coincidenciasNna).forEach((arr) => {
            if (Array.isArray(arr)) {
                arr.forEach((item) => {
                    if (item && item.id && !seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        todas.push({ ...item, origen: "NNA" });
                    }
                });
            }
        });

        return todas;
    };

    const onSubmit = async (data: ApelacionFormValues) => {
        setPendingData(data)

        let coincidencias = getTodasLasCoincidencias();

        // Si hay duplicidad de expediente, buscar y agregar el expediente coincidente al inicio
        if (expedienteDuplicado) {
            const matchExp = listaApelacionesCompleta.find(
                a => a.numeroExpediente?.toLowerCase() === data.numeroExpediente.toLowerCase()
            );
            if (matchExp) {
                const formattedMatch = {
                    id: matchExp.id,
                    numeroExpediente: matchExp.numeroExpediente,
                    fechaIngreso: matchExp.fechaIngreso,
                    estado: matchExp.estado,
                    abogadoNombre: matchExp.abogado?.nombre || "No asignado",
                    abogadoId: matchExp.abogado?.id || null,
                    origen: "Expediente Duplicado",
                    apelantes: matchExp.apelantes?.map((ap: any) => {
                        if (ap.tipo === 'institucion') {
                            return { tipo: 'institucion', nombre: ap.institucion || '', documento: ap.documento || '' };
                        } else {
                            const nombreCompleto = [ap.nombres, ap.apellidoPaterno, ap.apellidoMaterno].filter(Boolean).join(' ');
                            return { tipo: 'natural', nombre: nombreCompleto, documento: ap.documento || '' };
                        }
                    }) || [],
                    nnas: matchExp.nnas?.map((n: any) => {
                        if (n.tipo === 'institucion') {
                            return { tipo: 'institucion', nombre: n.institucion || '', edad: null };
                        } else {
                            const nombreCompleto = [n.nombres, n.primerApellido, n.segundoApellido].filter(Boolean).join(' ');
                            return { tipo: 'natural', nombre: nombreCompleto, edad: n.edad };
                        }
                    }) || []
                };

                // Evitar duplicidades y colocar el expediente coincidente al principio
                coincidencias = [formattedMatch, ...coincidencias.filter(c => c.id !== formattedMatch.id)];
            }
        }

        if (coincidencias.length > 0) {
            setCoincidenciasParaResolucion(coincidencias)
            setSelectedExpedienteVinculo(null) // Limpiar previa selección
            setShowCoincidenciasResolucionModal(true)
        } else {
            setShowConfirmModal(true)
        }
    }

    const confirmarGuardado = async () => {
        if (!pendingData) return
        setShowConfirmModal(false)
        setLoading(true)
        try {
            const cleanedNnas = pendingData.nnas?.map(nna => ({
                ...nna,
                edad: nna.edad !== undefined && nna.edad !== null && String(nna.edad).trim() !== "" ? Number(nna.edad) : null
            })) || [];

            const response = await fetch('/api/apelaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...pendingData,
                    fechaIngreso: pendingData.fechaIngreso.toISOString(),
                    fechaAsignacion: pendingData.fechaAsignacion.toISOString(),
                    nnas: cleanedNnas,
                }),
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al registrar apelación')
            }
            toast.success('Apelación registrada correctamente')
            router.push('/apelaciones')
        } catch (error) {
            console.error('Error:', error)
            toast.error(error instanceof Error ? error.message : 'Error al registrar apelación')
        } finally {
            setLoading(false)
        }
    }

    const confirmarVincularExistente = async () => {
        if (!pendingData || !selectedExpedienteVinculo) return
        setShowCoincidenciasResolucionModal(false)
        setLoading(true)
        try {
            const cleanedNnas = pendingData.nnas?.map(nna => ({
                ...nna,
                edad: nna.edad !== undefined && nna.edad !== null && String(nna.edad).trim() !== "" ? Number(nna.edad) : null
            })) || [];

            // Capturar directamente el abogadoId del caso de coincidencia
            const abogadoIdVinculado = selectedExpedienteVinculo.abogadoId;

            const response = await fetch('/api/apelaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...pendingData,
                    abogadoId: abogadoIdVinculado, // Sobrescribir abogado!
                    fechaIngreso: pendingData.fechaIngreso.toISOString(),
                    fechaAsignacion: pendingData.fechaAsignacion.toISOString(),
                    nnas: cleanedNnas,
                }),
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al registrar apelación')
            }
            toast.success('Apelación registrada correctamente y vinculada al abogado del caso existente.')
            router.push('/apelaciones')
        } catch (error) {
            console.error('Error:', error)
            toast.error(error instanceof Error ? error.message : 'Error al registrar apelación')
        } finally {
            setLoading(false)
        }
    }

    const handleTipoApelanteChange = (tipo: 'natural' | 'institucion') => {
        setTipoApelante(tipo)
        setAppellants(appellants.map(() => ({
            tipo,
            nombres: '',
            apellidoPaterno: '',
            apellidoMaterno: '',
            documento: '',
            institucion: ''
        })))
    }

    const addAppellant = () => {
        setAppellants([
            ...appellants,
            { tipo: tipoApelante, nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '', institucion: '' }
        ])
    }

    const removeAppellant = (index: number) => {
        if (appellants.length > 1) {
            const newItems = appellants.filter((_, i) => i !== index)
            setAppellants(newItems)
        }
    }

    const updateAppellant = (index: number, fields: Partial<Appellant>) => {
        const newItems = [...appellants]
        newItems[index] = { ...newItems[index], ...fields }
        setAppellants(newItems)
    }

    const handleTipoNnaChange = (tipo: 'natural' | 'institucion') => {
        setTipoNna(tipo)
        setNnaItems(nnaItems.map(() => ({
            tipo,
            nombres: '',
            primerApellido: '',
            segundoApellido: '',
            edad: '',
            institucion: ''
        })))
    }

    const addNnaItem = () => {
        setNnaItems([
            ...nnaItems,
            { tipo: tipoNna, nombres: '', primerApellido: '', segundoApellido: '', edad: '', institucion: '' }
        ])
    }

    const removeNnaItem = (index: number) => {
        if (nnaItems.length > 1) {
            const newItems = nnaItems.filter((_, i) => i !== index)
            setNnaItems(newItems)
        }
    }

    const updateNnaItem = (index: number, fields: Partial<NnaCarItem>) => {
        const newItems = [...nnaItems]
        newItems[index] = { ...newItems[index], ...fields }
        setNnaItems(newItems)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchCatalogos() }, [])

    const fetchCatalogos = async () => {
        try {
            const [complejidadesRes, dashboardRes, apelacionesRes, procedenciasRes] = await Promise.all([
                fetch('/api/complejidad'),
                fetch('/api/dashboard'),
                fetch('/api/apelaciones'),
                fetch('/api/procedencia'),
            ])
            const complejidadesData = await complejidadesRes.json()
            const dashboardData = await dashboardRes.json()
            const apelacionesData = await apelacionesRes.json()
            const procedenciasData = await procedenciasRes.json()

            const complejidadesActivas = complejidadesData.filter((c: ComplejidadJuridica) => c.activo)
            setComplejidades(complejidadesActivas)
            setCargaAbogados(dashboardData.cargaPorAbogado || [])
            setProcedencias(procedenciasData.filter((p: Procedencia) => p.activo))

            if (Array.isArray(apelacionesData)) {
                setExpedientesExistentes(apelacionesData.map((a: { numeroExpediente?: string }) => a.numeroExpediente ? a.numeroExpediente.toLowerCase() : ''))
                setListaApelacionesCompleta(apelacionesData)
            }
        } catch (error) {
            console.error('Error al cargar catálogos:', error)
        }
    }

    const verificarDuplicado = (valor: string) => {
        if (!valor) { setExpedienteDuplicado(false); return }
        const existe = expedientesExistentes.includes(valor.toLowerCase())
        setExpedienteDuplicado(existe)
        if (existe) toast.warning(`El expediente "${valor}" ya está registrado en el sistema`)
    }

    const folios = form.watch('folios')
    const complejidadId = form.watch('complejidadId')
    const puntosExtension = calcularPuntosExtension(folios || 0)
    const complejidadSeleccionada = complejidades.find((c) => c.id === complejidadId)
    const puntosComplejidad = complejidadSeleccionada?.puntos || 0
    const puntosTotal = puntosExtension + puntosComplejidad

    const abogadoAsignado = cargaAbogados.length > 0
        ? cargaAbogados.reduce((min, curr) => curr.puntosActivos < min.puntosActivos ? curr : min)
        : null

    useEffect(() => {
        if (abogadoAsignado) form.setValue('abogadoId', abogadoAsignado.abogado.id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abogadoAsignado?.abogado.id])

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/apelaciones">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Registrar Nueva Apelación</h1>
                            <p className="text-muted-foreground">Complete el formulario para registrar una nueva apelación</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Datos de la Apelación</CardTitle>
                                <CardDescription>Ingrese la información del expediente</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                        {/* Información Básica */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Información Básica</h3>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="numeroExpediente"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Número de Expediente *</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input
                                                                        placeholder="UPETACNA20250000557"
                                                                        {...field}
                                                                        onBlur={(e) => {
                                                                            field.onBlur()
                                                                            verificarDuplicado(e.target.value)
                                                                        }}
                                                                        className={expedienteDuplicado ? 'border-amber-500 focus-visible:ring-amber-500' : ''}
                                                                    />
                                                                    {expedienteDuplicado && (
                                                                        <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                                                                    )}
                                                                </div>
                                                            </FormControl>
                                                            {expedienteDuplicado && (
                                                                <p className="text-sm text-amber-600 flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    Este expediente ya existe en el sistema
                                                                </p>
                                                            )}
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="fechaIngreso"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fecha de Ingreso *</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    value={dateToValue(field.value)}
                                                                    onChange={(e) => field.onChange(valueToDate(e.target.value) ?? new Date())}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="fechaIngresoMIMP"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fecha Ingreso MIMP</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    value={dateToValue(field.value)}
                                                                    onChange={(e) => field.onChange(valueToDate(e.target.value))}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="plazoVencimiento"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Plazo de Vencimiento</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    value={dateToValue(field.value)}
                                                                    onChange={(e) => field.onChange(valueToDate(e.target.value))}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-foreground">Registro de Apelantes</h4>
                                                        <p className="text-xs text-muted-foreground">Registre uno o más apelantes involucrados</p>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary w-fit">
                                                        {appellants.length} {appellants.length === 1 ? 'Apelante' : 'Apelantes'}
                                                    </span>
                                                </div>

                                                {/* Selector de Naturaleza (Toggle Estilizado) fuera de la grilla */}
                                                <div className="flex flex-col gap-1.5 bg-muted/20 p-3 rounded-lg border">
                                                    <span className="text-xs font-semibold text-muted-foreground">Tipo de Apelante:</span>
                                                    <div className="grid grid-cols-2 gap-2 bg-background p-1 rounded-lg border max-w-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTipoApelanteChange('natural')}
                                                            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                                                tipoApelante === 'natural'
                                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                                    : 'text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <User className="h-3.5 w-3.5" />
                                                            Persona Natural
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTipoApelanteChange('institucion')}
                                                            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                                                tipoApelante === 'institucion'
                                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                                    : 'text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <Building className="h-3.5 w-3.5" />
                                                            Institución / Entidad
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Contenedor de Grilla Tabular */}
                                                <div className="border rounded-lg bg-card/30 p-4 shadow-sm space-y-3">
                                                    {/* Encabezados de Columna (Ocultos en móvil) */}
                                                    <div className="hidden md:grid grid-cols-12 gap-2 pb-2 border-b text-xs font-semibold text-muted-foreground">
                                                        <div className="col-span-11">
                                                            {tipoApelante === 'natural' ? (
                                                                <div className="grid grid-cols-11 gap-2">
                                                                    <div className="col-span-4">Nombres *</div>
                                                                    <div className="col-span-4">Apellido Paterno *</div>
                                                                    <div className="col-span-3">Apellido Materno</div>
                                                                </div>
                                                            ) : (
                                                                <div>Nombre de la Institución o Entidad *</div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1 text-center">Acciones</div>
                                                    </div>

                                                    {/* Filas Dinámicas */}
                                                    <div className="space-y-3">
                                                        {appellants.map((app, index) => (
                                                            <div 
                                                                key={index} 
                                                                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 border rounded-lg bg-muted/10 relative"
                                                            >
                                                                {/* Campos de Entrada */}
                                                                <div className="col-span-1 md:col-span-11 flex flex-col gap-2">
                                                                    {tipoApelante === 'natural' ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-11 gap-2">
                                                                            <div className="space-y-1 sm:col-span-4">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Nombres *</label>
                                                                                <Input
                                                                                    placeholder="Nombres *"
                                                                                    value={app.nombres || ''}
                                                                                    onChange={(e) => updateAppellant(index, { nombres: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-4">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Apellido Paterno *</label>
                                                                                <Input
                                                                                    placeholder="Ap. Paterno *"
                                                                                    value={app.apellidoPaterno || ''}
                                                                                    onChange={(e) => updateAppellant(index, { apellidoPaterno: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-3">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Apellido Materno</label>
                                                                                <Input
                                                                                    placeholder="Ap. Materno"
                                                                                    value={app.apellidoMaterno || ''}
                                                                                    onChange={(e) => updateAppellant(index, { apellidoMaterno: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-medium text-muted-foreground md:hidden">Nombre de la Institución / Entidad *</label>
                                                                            <Input
                                                                                placeholder="Nombre de la Institución o Entidad * (ej: MINJUS, Fiscalía, CAR, etc.)"
                                                                                value={app.institucion || ''}
                                                                                onChange={(e) => updateAppellant(index, { institucion: e.target.value })}
                                                                                className="h-9 text-xs w-full"
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {/* Banner de Advertencia de Duplicidad */}
                                                                    {coincidenciasApelantes[index] && coincidenciasApelantes[index].length > 0 && (
                                                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2 mt-1 shadow-sm animate-fade-in">
                                                                            <div className="flex items-center gap-2 font-semibold">
                                                                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                                                                <span>¡Advertencia de Coincidencia! Este apelante ya cuenta con registros previos en el sistema.</span>
                                                                            </div>
                                                                            <div className="pl-6 space-y-1">
                                                                                <p className="text-[11px] text-amber-700 font-medium">Expedientes previos encontrados:</p>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {coincidenciasApelantes[index].map((coincidencia: any, cIdx: number) => (
                                                                                        <button 
                                                                                            key={cIdx}
                                                                                            type="button"
                                                                                            onClick={() => verDetalleCoincidencia(coincidencia)}
                                                                                            className="hover:underline flex items-center gap-1.5 font-semibold text-amber-900 bg-amber-100/50 border border-amber-200/60 rounded px-2 py-0.5 text-left transition-all hover:bg-amber-100"
                                                                                        >
                                                                                            <span>📄 Expediente N° {coincidencia.numeroExpediente}</span>
                                                                                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-200 rounded">
                                                                                                {coincidencia.estado}
                                                                                            </span>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Botón de Eliminar */}
                                                                <div className="col-span-1 md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-0">
                                                                    {appellants.length > 1 ? (
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                                                            onClick={() => removeAppellant(index)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    ) : (
                                                                        <div className="h-8 w-8 hidden md:block" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Botón de Agregar al final de la grilla */}
                                                    <div className="flex justify-end pt-2 border-t mt-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={addAppellant}
                                                            className="border-dashed hover:border-primary/50 text-xs flex items-center gap-1.5 h-8 font-medium shadow-none hover:bg-primary/5 text-primary"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                            Agregar otro Apelante
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Campo oculto para cumplir con react-hook-form y validaciones */}
                                                <FormField
                                                    control={form.control}
                                                    name="apelante"
                                                    render={({ field }) => (
                                                        <FormItem className="hidden">
                                                            <FormControl>
                                                                <Input {...field} value={field.value ?? ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-foreground">Niño, Niña, Adolescente o CAR</h4>
                                                        <p className="text-xs text-muted-foreground">Registre los datos de los NNA o centros involucrados</p>
                                                    </div>
                                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary w-fit">
                                                        {nnaItems.length} {nnaItems.length === 1 ? 'Registro' : 'Registros'}
                                                    </span>
                                                </div>

                                                {/* Selector de Naturaleza (Toggle Estilizado) */}
                                                <div className="flex flex-col gap-1.5 bg-muted/20 p-3 rounded-lg border">
                                                    <span className="text-xs font-semibold text-muted-foreground">Tipo de Registro:</span>
                                                    <div className="grid grid-cols-2 gap-2 bg-background p-1 rounded-lg border max-w-md">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTipoNnaChange('natural')}
                                                            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                                                tipoNna === 'natural'
                                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                                    : 'text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <User className="h-3.5 w-3.5" />
                                                            Niño/a o Adolescente (NNA)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTipoNnaChange('institucion')}
                                                            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                                                tipoNna === 'institucion'
                                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                                    : 'text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <Building className="h-3.5 w-3.5" />
                                                            Centro o Institución (CAR)
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Contenedor de Grilla Tabular */}
                                                <div className="border rounded-lg bg-card/30 p-4 shadow-sm space-y-3">
                                                    {/* Encabezados de Columna (Ocultos en móvil) */}
                                                    <div className="hidden md:grid grid-cols-12 gap-2 pb-2 border-b text-xs font-semibold text-muted-foreground">
                                                        <div className="col-span-11">
                                                            {tipoNna === 'natural' ? (
                                                                <div className="grid grid-cols-11 gap-2">
                                                                    <div className="col-span-3">Nombres *</div>
                                                                    <div className="col-span-3">Primer Apellido *</div>
                                                                    <div className="col-span-3">Segundo Apellido</div>
                                                                    <div className="col-span-2">Edad</div>
                                                                </div>
                                                            ) : (
                                                                <div>Nombre de la Institución/Entidad (CAR) *</div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1 text-center">Acciones</div>
                                                    </div>

                                                    {/* Filas Dinámicas */}
                                                    <div className="space-y-3">
                                                        {nnaItems.map((item, index) => (
                                                            <div 
                                                                key={index} 
                                                                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 md:p-0 border md:border-0 rounded-lg md:rounded-none bg-muted/20 md:bg-transparent relative"
                                                            >
                                                                {/* Campos de Entrada */}
                                                                <div className="col-span-1 md:col-span-11">
                                                                    {tipoNna === 'natural' ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-11 gap-2">
                                                                            <div className="space-y-1 sm:col-span-3">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Nombres *</label>
                                                                                <Input
                                                                                    placeholder="Nombres *"
                                                                                    value={item.nombres || ''}
                                                                                    onChange={(e) => updateNnaItem(index, { nombres: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-3">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Primer Apellido *</label>
                                                                                <Input
                                                                                    placeholder="Primer Apellido *"
                                                                                    value={item.primerApellido || ''}
                                                                                    onChange={(e) => updateNnaItem(index, { primerApellido: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-3">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Segundo Apellido</label>
                                                                                <Input
                                                                                    placeholder="Segundo Apellido"
                                                                                    value={item.segundoApellido || ''}
                                                                                    onChange={(e) => updateNnaItem(index, { segundoApellido: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1 sm:col-span-2">
                                                                                <label className="text-[10px] font-medium text-muted-foreground sm:hidden">Edad</label>
                                                                                <Input
                                                                                    placeholder="Edad"
                                                                                    value={item.edad || ''}
                                                                                    onChange={(e) => updateNnaItem(index, { edad: e.target.value })}
                                                                                    className="h-9 text-xs"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-medium text-muted-foreground md:hidden">Nombre de la Institución / Entidad *</label>
                                                                            <Input
                                                                                placeholder="Nombre de la Institución o Entidad (CAR) * (ej: CAR San Miguel, CAR Virgen de Fátima, etc.)"
                                                                                value={item.institucion || ''}
                                                                                onChange={(e) => updateNnaItem(index, { institucion: e.target.value })}
                                                                                className="h-9 text-xs w-full"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    {/* Banner de Advertencia de Duplicidad NNA */}
                                                                    {coincidenciasNna[index] && coincidenciasNna[index].length > 0 && (
                                                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-2 mt-2 shadow-sm animate-fade-in">
                                                                            <div className="flex items-center gap-2 font-semibold">
                                                                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                                                                <span>¡Advertencia de Coincidencia NNA! Este menor ya cuenta con registros previos en el sistema.</span>
                                                                            </div>
                                                                            <div className="pl-6 space-y-1">
                                                                                <p className="text-[11px] text-amber-700 font-medium">Expedientes previos encontrados:</p>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {coincidenciasNna[index].map((coincidencia: any, cIdx: number) => (
                                                                                        <button 
                                                                                            key={cIdx}
                                                                                            type="button"
                                                                                            onClick={() => verDetalleCoincidencia(coincidencia)}
                                                                                            className="hover:underline flex items-center gap-1.5 font-semibold text-amber-900 bg-amber-100/50 border border-amber-200/60 rounded px-2 py-0.5 text-left transition-all hover:bg-amber-100"
                                                                                        >
                                                                                            <span>📄 Expediente N° {coincidencia.numeroExpediente}</span>
                                                                                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-200 rounded">
                                                                                                {coincidencia.estado}
                                                                                            </span>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Botón de Eliminar */}
                                                                <div className="col-span-1 md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-0">
                                                                    {nnaItems.length > 1 ? (
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                                                            onClick={() => removeNnaItem(index)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    ) : (
                                                                        <div className="h-8 w-8 hidden md:block" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Botón de Agregar al final de la grilla */}
                                                    <div className="flex justify-end pt-2 border-t mt-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={addNnaItem}
                                                            className="border-dashed hover:border-primary/50 text-xs flex items-center gap-1.5 h-8 font-medium shadow-none hover:bg-primary/5 text-primary"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                            Agregar otro {tipoNna === 'natural' ? 'NNA' : 'CAR'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Campo oculto para cumplir con react-hook-form y validaciones */}
                                                <FormField
                                                    control={form.control}
                                                    name="nnaCar"
                                                    render={({ field }) => (
                                                        <FormItem className="hidden">
                                                            <FormControl>
                                                                <Input {...field} value={field.value ?? ''} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="procedencia"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Procedencia *</FormLabel>
                                                            <FormControl>
                                                                <SearchableSelect 
                                                                    options={procedencias} 
                                                                    value={field.value} 
                                                                    onChange={field.onChange} 
                                                                    placeholder="Seleccione procedencia..." 
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="documento"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Documento *</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Nº de nota o documento de ingreso" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="asunto"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Asunto *</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="Descripción del asunto de la apelación" className="min-h-[100px]" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Triaje */}
                                        <div className="space-y-4">
                                                <h3 className="text-lg font-semibold">Triaje</h3>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <FormField
                                                        control={form.control}
                                                        name="folios"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Cantidad de Folios *</FormLabel>
                                                                <FormControl>
                                                                    <Input 
                                                                        type="number" 
                                                                        min="1" 
                                                                        {...field} 
                                                                        value={isNaN(field.value) ? '' : field.value}
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value);
                                                                            field.onChange(isNaN(val) ? 0 : val);
                                                                        }} 
                                                                    />
                                                                </FormControl>
                                                                <FormDescription>Puntos por extensión: {puntosExtension}</FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="complejidadId"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Complejidad Jurídica *</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Seleccione complejidad" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {complejidades.map((comp) => (
                                                                            <SelectItem key={comp.id} value={comp.id}>
                                                                                {comp.nombre} ({comp.puntos} pts)
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormDescription>Puntos por complejidad: {puntosComplejidad}</FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                        {/* Asignación */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Asignación</h3>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name="fechaAsignacion"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Fecha de Asignación *</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    type="date"
                                                                    value={dateToValue(field.value)}
                                                                    onChange={(e) => field.onChange(valueToDate(e.target.value) ?? new Date())}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="estado"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Estado *</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                                                    <SelectItem value="Resuelto">Resuelto</SelectItem>
                                                                    <SelectItem value="Atendido">Atendido</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Observaciones */}
                                        <FormField
                                            control={form.control}
                                            name="observaciones"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Observaciones</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Notas adicionales sobre el caso" className="min-h-[80px]" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Botones */}
                                        <div className="flex gap-4">
                                            <Button type="submit" disabled={loading}>
                                                <Save className="mr-2 h-4 w-4" />
                                                {loading ? 'Guardando...' : 'Guardar Apelación'}
                                            </Button>
                                            <Link href="/apelaciones">
                                                <Button type="button" variant="outline">Cancelar</Button>
                                            </Link>
                                        </div>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Panel Lateral */}
                    <div className="lg:col-span-1 space-y-6">
                        <PanelAsignacion cargaAbogados={cargaAbogados} />

                        {/* Resumen de Puntos */}
                        <Card className="sticky top-4">
                                <CardHeader>
                                    <CardTitle>Resumen de Puntos</CardTitle>
                                    <CardDescription>Cálculo automático del triaje</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Folios:</span>
                                            <span className="font-medium">{folios || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Puntos por extensión:</span>
                                            <span className="font-semibold">{puntosExtension}</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-border" />
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Complejidad:</span>
                                            <span className="font-medium">{complejidadSeleccionada?.nombre || '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Puntos por complejidad:</span>
                                            <span className="font-semibold">{puntosComplejidad}</span>
                                        </div>
                                    </div>
                                    <div className="h-px bg-border" />
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Total de Puntos:</span>
                                        <span className="text-2xl font-bold text-primary">{puntosTotal}</span>
                                    </div>
                                    <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                                        <p className="font-medium mb-1">Rango de puntos:</p>
                                        <p>Mínimo: 2 puntos</p>
                                        <p>Máximo: 8 puntos</p>
                                    </div>
                                </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Modal de confirmación */}
            <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar asignación</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm">
                                <p>La apelación será asignada automáticamente a:</p>
                                {abogadoAsignado && (
                                    <div className="rounded-lg border bg-muted/50 px-4 py-3">
                                        <p className="font-semibold text-foreground text-base">{abogadoAsignado.abogado.nombre}</p>
                                        <p className="text-muted-foreground text-xs mt-0.5">{abogadoAsignado.puntosActivos} pts activos actualmente</p>
                                    </div>
                                )}
                                <p className="text-muted-foreground">¿Desea continuar y guardar la apelación?</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowConfirmModal(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmarGuardado}>Confirmar y guardar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Resolución de Coincidencias */}
            <AlertDialog open={showCoincidenciasResolucionModal} onOpenChange={setShowCoincidenciasResolucionModal}>
                <AlertDialogContent className="max-w-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg flex items-center gap-2 border-b pb-2 text-amber-600 font-bold">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 animate-pulse" />
                            <span>Resolución de Coincidencias Detectadas</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 pt-3 text-sm">
                                <p className="text-muted-foreground text-xs">
                                    Hemos detectado coincidencias de <strong>{expedienteDuplicado ? 'Número de Expediente, ' : ''}Apelantes</strong> o <strong>NNA</strong> en la base de datos con respecto a la información que está ingresando. 
                                    Por favor, elija una de las siguientes opciones para continuar con el registro:
                                </p>

                                {expedienteDuplicado && (
                                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-800 dark:text-red-300 text-xs flex gap-2.5 items-start">
                                        <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="font-bold">¡Atención! Número de expediente duplicado detectado:</strong>
                                            <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">El número de expediente ingresado ya existe en la base de datos. Se recomienda utilizar la <strong>Opción A (Aceptar y Vincular)</strong> para asociar esta nueva apelación al expediente existente. La Opción B creará un registro homónimo que podría generar duplicidad.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="border rounded-lg overflow-hidden bg-muted/20">
                                    <div className="bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5 border-b flex justify-between items-center">
                                        <span className="font-semibold text-xs text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                                            Coincidencias Encontradas ({coincidenciasParaResolucion.length})
                                        </span>
                                        <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                                            Seleccione un caso para vincular al mismo abogado
                                        </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto divide-y">
                                        {coincidenciasParaResolucion.map((coincidencia) => {
                                            const isSelected = selectedExpedienteVinculo?.id === coincidencia.id;
                                            return (
                                                <div 
                                                    key={coincidencia.id} 
                                                    onClick={() => setSelectedExpedienteVinculo(coincidencia)}
                                                    className={`p-3 transition-colors cursor-pointer flex items-start gap-3 hover:bg-muted/40 ${
                                                        isSelected ? 'bg-amber-50/30 dark:bg-amber-950/10 border-l-4 border-amber-500 pl-2' : ''
                                                    }`}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name="coincidencia_vinculo" 
                                                        checked={isSelected}
                                                        onChange={() => setSelectedExpedienteVinculo(coincidencia)}
                                                        className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300"
                                                    />
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                                        <div className="md:col-span-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-xs text-foreground">
                                                                    Expediente N° {coincidencia.numeroExpediente}
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize border ${
                                                                    coincidencia.origen === "Expediente Duplicado" 
                                                                        ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900" 
                                                                        : "bg-muted text-muted-foreground"
                                                                }`}>
                                                                    Origen: {coincidencia.origen || 'General'}
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                                    coincidencia.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800 font-bold border border-amber-200' :
                                                                    coincidencia.estado === 'Resuelto' ? 'bg-green-100 text-green-800 font-bold border border-green-200' :
                                                                    'bg-blue-100 text-blue-800 font-bold border border-blue-200'
                                                                }`}>
                                                                    {coincidencia.estado}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1.5 space-y-1 text-xs">
                                                                {coincidencia.apelantes && coincidencia.apelantes.length > 0 && (
                                                                    <p className="text-muted-foreground text-[11px] truncate">
                                                                        <strong>Apelante:</strong> {coincidencia.apelantes.map((a: any) => a.nombre).join(', ')}
                                                                    </p>
                                                                )}
                                                                {coincidencia.nnas && coincidencia.nnas.length > 0 && (
                                                                    <p className="text-muted-foreground text-[11px] truncate">
                                                                        <strong>NNA/CAR:</strong> {coincidencia.nnas.map((n: any) => n.nombre).join(', ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l pt-2 md:pt-0 md:pl-3 text-xs">
                                                            <span className="text-muted-foreground text-[10px] uppercase font-bold">Abogado Asignado:</span>
                                                            <span className="font-semibold text-foreground mt-0.5">{coincidencia.abogadoNombre || 'No asignado'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className={`p-4 border rounded-lg transition-all flex flex-col justify-between ${
                                        selectedExpedienteVinculo 
                                            ? 'border-amber-500 bg-amber-50/10 shadow-sm' 
                                            : 'border-muted bg-muted/10 opacity-70'
                                    }`}>
                                        <div>
                                            <h4 className="font-bold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                                                Opción A: Aceptar y Vincular
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground">
                                                Registra la apelación y la vincula directamente al abogado <strong>{selectedExpedienteVinculo?.abogadoNombre || '(Seleccione un caso arriba)'}</strong>, quien ya está viendo este caso. Se omitirá la asignación automática por puntos.
                                            </p>
                                        </div>
                                        <div className="mt-4">
                                            <Button 
                                                type="button"
                                                onClick={confirmarVincularExistente} 
                                                disabled={!selectedExpedienteVinculo || loading}
                                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 transition-colors gap-2"
                                            >
                                                <span>Aceptar y Vincular</span>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-4 border rounded-lg bg-card hover:bg-muted/10 transition-all flex flex-col justify-between border-muted">
                                        <div>
                                            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider mb-1">
                                                Opción B: Generar como Nuevo Registro
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground">
                                                Omite las advertencias y registra el caso como un expediente homónimo totalmente nuevo e independiente. Se abrirá la confirmación para asignación automática (según abogado con menor carga activa).
                                            </p>
                                        </div>
                                        <div className="mt-4">
                                            <Button 
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowCoincidenciasResolucionModal(false);
                                                    setShowConfirmModal(true);
                                                }}
                                                disabled={loading}
                                                className="w-full font-semibold text-xs h-9 hover:bg-muted transition-colors"
                                            >
                                                <span>Generar como Nuevo Registro</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="border-t pt-3 mt-2">
                        <AlertDialogCancel 
                            type="button"
                            onClick={() => setShowCoincidenciasResolucionModal(false)}
                            className="w-full sm:w-auto h-9 text-xs"
                        >
                            Cancelar Registro
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Detalle de Coincidencia */}
            <AlertDialog open={!!selectedCoincidencia} onOpenChange={(open) => { if (!open) setSelectedCoincidencia(null) }}>
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base flex items-center gap-2 border-b pb-2">
                            <span className="text-amber-600 shrink-0">📄</span>
                            <span>Expediente N° {selectedCoincidencia?.numeroExpediente}</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-xs pt-2">
                                {loadingCoincidencia ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        <p className="text-muted-foreground text-xs">Cargando detalles del expediente...</p>
                                    </div>
                                ) : coincidenciaDetails ? (
                                    <div className="space-y-4">
                                        {/* Fila superior con estado y fechas */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-lg border">
                                            <div>
                                                <span className="font-semibold text-muted-foreground block mb-0.5 text-[10px] uppercase">Estado:</span>
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    coincidenciaDetails.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                    coincidenciaDetails.estado === 'Resuelto' ? 'bg-green-100 text-green-800 border border-green-200' :
                                                    'bg-blue-100 text-blue-800 border border-blue-200'
                                                }`}>
                                                    {coincidenciaDetails.estado}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-muted-foreground block mb-0.5 text-[10px] uppercase">Fecha de Ingreso:</span>
                                                <span className="font-semibold text-foreground text-xs">
                                                    {coincidenciaDetails.fechaIngreso ? new Date(coincidenciaDetails.fechaIngreso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                                </span>
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <span className="font-semibold text-muted-foreground block mb-0.5 text-[10px] uppercase">Procedencia:</span>
                                                <span className="font-semibold text-foreground text-xs">{coincidenciaDetails.procedencia || '-'}</span>
                                            </div>
                                        </div>

                                        {/* Datos del Apelante y NNA */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Apelante(s):</span>
                                                {coincidenciaDetails.apelantes && coincidenciaDetails.apelantes.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {coincidenciaDetails.apelantes.map((ap: any, aIdx: number) => (
                                                            <div key={aIdx} className="p-1.5 border rounded bg-muted/30 text-xs">
                                                                {ap.tipo === 'natural' ? (
                                                                    <span><strong>Persona Natural:</strong> {ap.nombres} {ap.apellidoPaterno} {ap.apellidoMaterno} {ap.documento ? `(Doc: ${ap.documento})` : ''}</span>
                                                                ) : (
                                                                    <span><strong>Institución:</strong> {ap.institucion}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-2 border rounded-lg bg-card text-foreground font-medium min-h-[40px] text-xs">
                                                        {coincidenciaDetails.apelante || '-'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">NNA / CAR:</span>
                                                {coincidenciaDetails.nnas && coincidenciaDetails.nnas.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {coincidenciaDetails.nnas.map((nna: any, nIdx: number) => (
                                                            <div key={nIdx} className="p-1.5 border rounded bg-muted/30 text-xs">
                                                                {nna.tipo === 'natural' ? (
                                                                    <span><strong>NNA:</strong> {nna.nombres} {nna.primerApellido} {nna.segundoApellido} {nna.edad ? `(Edad: ${nna.edad})` : ''}</span>
                                                                ) : (
                                                                    <span><strong>CAR/Inst:</strong> {nna.institucion}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-2 border rounded-lg bg-card text-foreground font-medium min-h-[40px] text-xs">
                                                        {coincidenciaDetails.nnaCar || '-'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Documento y Asunto */}
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className="md:col-span-1 space-y-1">
                                                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Documento de Ingreso:</span>
                                                    <div className="p-2 border rounded-lg bg-card text-foreground font-medium text-xs">
                                                        {coincidenciaDetails.documento || '-'}
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Asunto:</span>
                                                    <div className="p-2 border rounded-lg bg-card text-foreground font-medium text-xs">
                                                        {coincidenciaDetails.asunto || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Puntos y Abogado */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border">
                                            <div>
                                                <span className="font-semibold text-muted-foreground block mb-0.5 text-[10px] uppercase">Folios:</span>
                                                <span className="font-semibold text-foreground text-xs">{coincidenciaDetails.folios}</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-muted-foreground block mb-0.5 text-[10px] uppercase">Complejidad:</span>
                                                <span className="font-semibold text-foreground text-xs">{coincidenciaDetails.complejidad?.nombre || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-muted-foreground block mb-0.5 text-[10px] uppercase">Total Puntos:</span>
                                                <span className="font-bold text-primary text-xs">{coincidenciaDetails.puntosTotal} pts</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-muted-foreground block mb-0.5 text-[10px] uppercase">Abogado Asignado:</span>
                                                <span className="font-semibold text-foreground text-xs">{coincidenciaDetails.abogado?.nombre || '-'}</span>
                                            </div>
                                        </div>

                                        {/* Revisor y observaciones */}
                                        {coincidenciaDetails.revisor?.nombre && (
                                            <div className="space-y-1">
                                                <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Revisor Asignado:</span>
                                                <div className="p-2 border rounded-lg bg-card text-foreground font-medium text-xs">
                                                    {coincidenciaDetails.revisor.nombre}
                                                </div>
                                            </div>
                                        )}

                                        {coincidenciaDetails.observaciones && (
                                            <div className="space-y-1">
                                                <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">Observaciones:</span>
                                                <div className="p-2 border rounded-lg bg-card text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto text-xs">
                                                    {coincidenciaDetails.observaciones}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground text-xs">
                                        No se pudo cargar la información del expediente.
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="border-t pt-3 mt-4">
                        <AlertDialogCancel type="button" onClick={() => setSelectedCoincidencia(null)} className="w-full sm:w-auto h-9 text-xs">Cerrar</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
