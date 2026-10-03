'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Globe,
  Scale,
  BarChart3,
  FileText,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Download,
  LogOut,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Building2,
  Users2,
  DollarSign,
  ArrowLeft,
  Printer,
  Sparkles,
  ClipboardList,
  AlertCircle,
  Inbox,
  UserCheck,
  Filter,
  Activity,
  TimerReset,
  Database,
  Construction,
  Wrench,
  Landmark,
  Loader2,
} from 'lucide-react'
import type { EstadisticasDashboard, ApelacionConRelaciones, Abogado, TransparenciaRegistro } from '@/types'
import { clasificarAlerta, diasHabilesRestantes } from '@/lib/calcular-plazo'

// Tipos de sección
type SeccionId = 'resumen' | 'sustracion' | 'apelaciones' | 'poi' | 'proyectos-ley' | 'transparencia' | 'informes'

interface UsuarioSession {
  nombre: string
  rol: string
  email?: string
}

interface CargaRevisorItem {
  revisorId: string
  nombre: string
  totalCasos: number
  casosPendientes: number
  casosResueltos: number
  casosAtendidos: number
}

export default function DirectorPage() {
  const router = useRouter()
  const fechaReferencia = new Date()
  const anioReferencia = fechaReferencia.getFullYear()
  const mesReferencia = fechaReferencia.getMonth()
  const [seccion, setSeccion] = useState<SeccionId>('resumen')
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'ano'>('ano')
  const [session, setSession] = useState<UsuarioSession | null>(null)

  // Datos crudos en vivo desde el backend
  const [statsApelaciones, setStatsApelaciones] = useState<EstadisticasDashboard | null>(null)
  const [rawApelaciones, setRawApelaciones] = useState<ApelacionConRelaciones[]>([])
  const [rawTransparencia, setRawTransparencia] = useState<TransparenciaRegistro[]>([])
  const [abogadosList, setAbogadosList] = useState<Abogado[]>([])
  const [cargaRevisores, setCargaRevisores] = useState<CargaRevisorItem[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [complejidadResoluciones, setComplejidadResoluciones] = useState('todas')
  const [vistaApelaciones, setVistaApelaciones] = useState<'gestion' | 'resoluciones'>('gestion')
  const [descargandoAyudaMemoria, setDescargandoAyudaMemoria] = useState(false)

  // Descarga de Ayuda Memoria Oficial de Gestión de Apelaciones en Word (.docx)
  const handleDescargarAyudaMemoria = async () => {
    try {
      setDescargandoAyudaMemoria(true)
      const payload = {
        periodoLabel: labelPeriodo,
        periodoSlug: periodo,
        kpi: {
          totalCasos: statsFiltradas?.totalCasos ?? 0,
          casosPendientes: statsFiltradas?.casosPendientes ?? 0,
          casosObservados: (statsFiltradas as any)?.casosObservados ?? 0,
          casosResueltos: statsFiltradas?.casosResueltos ?? 0,
          casosAtendidos: statsFiltradas?.casosAtendidos ?? 0,
        },
        cargaAbogados: (statsFiltradas?.cargaPorAbogado || []).map(item => ({
          nombre: item.abogado?.nombre || 'Abogado',
          activo: item.abogado?.activo !== false,
          casosActivos: item.casosActivos,
          casosObservados: (item as any).casosObservados || 0,
          casosResueltos: item.casosResueltos,
          casosCerrados: item.casosCerrados,
          capacidadOperativa: item.abogado?.activo === false
            ? 'No Disponible (Inactivo)'
            : (item.puntosActivos || 0) < 50
              ? 'Disponible'
              : (item.puntosActivos || 0) >= 160
                ? 'Carga Completa'
                : 'En Capacidad',
        })),
        tiemposProyeccion: analiticaResoluciones.profesionalesProyeccion.map(p => ({
          nombre: p.nombre,
          total: p.total,
          mediana: p.mediana,
          promedio: Number(p.promedio.toFixed(1)),
          hasta15: p.hasta15,
          de16a30: p.de16a30,
          de31a60: p.de31a60,
          mas60: p.mas60,
        })),
        medianaRevision: analiticaResoluciones.medianaRevision,
        medianaTotal: analiticaResoluciones.medianaGlobal,
        casosPorComplejidad: statsFiltradas?.casosPorComplejidad || [],
      }

      const res = await fetch('/api/ayuda-memoria/generar-apelaciones-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`Error en servidor: ${res.statusText}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Ayuda_Memoria_Apelaciones_${periodo}_${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error generando Ayuda Memoria:', err)
      alert('No se pudo generar la Ayuda Memoria en este momento. Verifique la conexión con el servicio.')
    } finally {
      setDescargandoAyudaMemoria(false)
    }
  }

  // Cargar sesión del usuario
  useEffect(() => {
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setSession({
            nombre: data.nombre || data.user?.nombre || 'Dra. Directora General',
            rol: data.rol || data.user?.rol || 'directora',
            email: data.email || data.user?.email,
          })
        } else {
          setSession({
            nombre: 'Dra. Directora General',
            rol: 'directora',
          })
        }
      })
      .catch(() => {
        setSession({
          nombre: 'Dra. Directora General',
          rol: 'directora',
        })
      })
  }, [])

  // Cargar datos en vivo de Apelaciones, Abogados y Transparencia
  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => (r.ok ? r.json() : null)),
      fetch('/api/revisor/carga').then(r => (r.ok ? r.json() : [])),
      fetch('/api/apelaciones').then(r => (r.ok ? r.json() : [])),
      fetch('/api/abogados').then(r => (r.ok ? r.json() : [])),
      fetch('/api/transparencia').then(r => (r.ok ? r.json() : [])),
    ])
      .then(([dashData, revData, apelData, abgsData, transpData]) => {
        if (dashData) setStatsApelaciones(dashData)
        if (Array.isArray(revData)) setCargaRevisores(revData)
        if (Array.isArray(apelData)) setRawApelaciones(apelData)
        if (Array.isArray(abgsData)) setAbogadosList(abgsData)
        if (Array.isArray(transpData)) setRawTransparencia(transpData)
      })
      .catch(err => {
        console.error('Error cargando datos del centro de mando:', err)
      })
      .finally(() => {
        setLoadingStats(false)
      })
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // MOTOR DE CÁLCULO Y FILTRADO POR PERÍODO (Mes, Trimestre, Año 2026)
  // ─────────────────────────────────────────────────────────────────
  const statsFiltradas = useMemo(() => {
    if (!rawApelaciones || rawApelaciones.length === 0) return statsApelaciones

    // Tomamos como referencia el año de la data (2026) y mes actual (Agosto = mes 7 en JS 0-index)
    const anioActual = anioReferencia
    const mesActual = mesReferencia

    let desde: Date
    let hasta: Date

    if (periodo === 'mes') {
      // Mes Actual: Agosto 2026 (01/08/2026 - 31/08/2026)
      desde = new Date(anioActual, mesActual, 1, 0, 0, 0)
      hasta = new Date(anioActual, mesActual + 1, 0, 23, 59, 59)
    } else if (periodo === 'trimestre') {
      // III Trimestre: Julio, Agosto, Septiembre 2026 (01/07/2026 - 30/09/2026)
      const q = Math.floor(mesActual / 3) // Q3 = 2
      desde = new Date(anioActual, q * 3, 1, 0, 0, 0)
      hasta = new Date(anioActual, (q + 1) * 3, 0, 23, 59, 59)
    } else {
      // Año Completo 2026 (01/01/2026 - 31/12/2026)
      desde = new Date(anioActual, 0, 1, 0, 0, 0)
      hasta = new Date(anioActual, 11, 31, 23, 59, 59)
    }

    // Filtrar expedientes según fechaIngreso
    const filtrados = rawApelaciones.filter(a => {
      const f = a.fechaIngreso ? new Date(a.fechaIngreso) : (a.createdAt ? new Date(a.createdAt) : null)
      if (!f || isNaN(f.getTime())) return false
      return f >= desde && f <= hasta
    })

    const totalCasos = filtrados.length
    const casosPendientes = filtrados.filter(a => a.estado === 'Pendiente').length
    const casosObservados = filtrados.filter(a => a.estado === 'Observado').length
    const casosResueltos = filtrados.filter(a => a.estado === 'Resuelto').length
    const casosAtendidos = filtrados.filter(a => a.estado === 'Atendido').length

    // Recalcular balance de abogados para el período seleccionado
    const abMap: Record<
      string,
      { model: Abogado; casosActivos: number; casosObservados: number; casosResueltos: number; casosCerrados: number; puntosActivos: number }
    > = {}

    // Inicializar con todos los abogados registrados (activos e inactivos)
    abogadosList.forEach(ab => {
      abMap[ab.id] = {
        model: ab,
        casosActivos: 0,
        casosObservados: 0,
        casosResueltos: 0,
        casosCerrados: 0,
        puntosActivos: 0,
      }
    })

    filtrados.forEach(a => {
      if (a.abogadoId) {
        if (!abMap[a.abogadoId]) {
          abMap[a.abogadoId] = {
            model: a.abogado || {
              id: a.abogadoId,
              nombre: 'Abogado No Registrado',
              activo: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            casosActivos: 0,
            casosObservados: 0,
            casosResueltos: 0,
            casosCerrados: 0,
            puntosActivos: 0,
          }
        }
        if (a.estado === 'Pendiente') abMap[a.abogadoId].casosActivos++
        else if (a.estado === 'Observado') abMap[a.abogadoId].casosObservados++
        else if (a.estado === 'Resuelto') abMap[a.abogadoId].casosResueltos++
        else if (a.estado === 'Atendido') abMap[a.abogadoId].casosCerrados++

        abMap[a.abogadoId].puntosActivos += a.puntosTotal || 0
      }
    })

    // Mostrar abogados activos O aquellos inactivos que tengan expedientes en este período
    const cargaPorAbogado = Object.values(abMap)
      .filter(v => v.model.activo || (v.casosActivos + v.casosObservados + v.casosResueltos + v.casosCerrados) > 0)
      .map(v => ({
        abogado: v.model,
        casosActivos: v.casosActivos,
        casosObservados: v.casosObservados,
        casosResueltos: v.casosResueltos,
        casosCerrados: v.casosCerrados,
        puntosActivos: v.puntosActivos,
      }))
      .sort((a, b) => (b.casosActivos + b.casosObservados + b.casosResueltos + b.casosCerrados) - (a.casosActivos + a.casosObservados + a.casosResueltos + a.casosCerrados))

    // Recalcular por complejidad en este período
    const compMap: Record<string, number> = {}
    filtrados.forEach(a => {
      const nombre = a.complejidad?.nombre || 'Sin complejidad'
      compMap[nombre] = (compMap[nombre] || 0) + 1
    })
    const casosPorComplejidad = Object.entries(compMap).map(([nombre, cantidad]) => ({ nombre, cantidad }))

    // Recalcular por procedencia en este período
    const procMap: Record<string, number> = {}
    filtrados.forEach(a => {
      if (a.procedencia) {
        procMap[a.procedencia] = (procMap[a.procedencia] || 0) + 1
      }
    })
    const casosPorProcedencia = Object.entries(procMap)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)

    return {
      totalCasos,
      casosPendientes,
      casosObservados,
      casosResueltos,
      casosAtendidos,
      casosConPlazoProximo: statsApelaciones?.casosConPlazoProximo ?? 0,
      cargaPorAbogado,
      cargaPorRevisor: statsApelaciones?.cargaPorRevisor ?? [],
      casosPorComplejidad,
      casosPorProcedencia,
    }
  }, [rawApelaciones, abogadosList, periodo, statsApelaciones, anioReferencia, mesReferencia])

  // Recalcular carga de revisores para el período seleccionado
  const revisoresFiltrados = useMemo(() => {
    if (!rawApelaciones || rawApelaciones.length === 0 || cargaRevisores.length === 0) return cargaRevisores

    const anioActual = anioReferencia
    const mesActual = mesReferencia

    let desde: Date
    let hasta: Date

    if (periodo === 'mes') {
      desde = new Date(anioActual, mesActual, 1, 0, 0, 0)
      hasta = new Date(anioActual, mesActual + 1, 0, 23, 59, 59)
    } else if (periodo === 'trimestre') {
      const q = Math.floor(mesActual / 3)
      desde = new Date(anioActual, q * 3, 1, 0, 0, 0)
      hasta = new Date(anioActual, (q + 1) * 3, 0, 23, 59, 59)
    } else {
      desde = new Date(anioActual, 0, 1, 0, 0, 0)
      hasta = new Date(anioActual, 11, 31, 23, 59, 59)
    }

    const filtrados = rawApelaciones.filter(a => {
      const f = a.fechaIngreso ? new Date(a.fechaIngreso) : (a.createdAt ? new Date(a.createdAt) : null)
      if (!f || isNaN(f.getTime())) return false
      return f >= desde && f <= hasta
    })

    return cargaRevisores.map(rev => {
      const casosRev = filtrados.filter(a => a.revisorId === rev.revisorId)
      return {
        ...rev,
        totalCasos: casosRev.length,
        casosPendientes: casosRev.filter(a => a.estado === 'Pendiente').length,
        casosResueltos: casosRev.filter(a => a.estado === 'Resuelto').length,
        casosAtendidos: casosRev.filter(a => a.estado === 'Atendido').length,
      }
    })
  }, [rawApelaciones, cargaRevisores, periodo, anioReferencia, mesReferencia])

  const analiticaResoluciones = useMemo(() => {
    const anioActual = anioReferencia
    const mesActual = mesReferencia
    let desde: Date
    let hasta: Date
    if (periodo === 'mes') {
      desde = new Date(anioActual, mesActual, 1)
      hasta = new Date(anioActual, mesActual + 1, 0, 23, 59, 59)
    } else if (periodo === 'trimestre') {
      const q = Math.floor(mesActual / 3)
      desde = new Date(anioActual, q * 3, 1)
      hasta = new Date(anioActual, (q + 1) * 3, 0, 23, 59, 59)
    } else {
      desde = new Date(anioActual, 0, 1)
      hasta = new Date(anioActual, 11, 31, 23, 59, 59)
    }

    const porComplejidad = (a: ApelacionConRelaciones) =>
      complejidadResoluciones === 'todas' || a.complejidadId === complejidadResoluciones

    // Fecha efectiva de resolución: prioridad 1: fechaResolucion, prioridad 2: fechaCambioResuelto, prioridad 3: updatedAt
    const getFechaResolucionEfectiva = (a: ApelacionConRelaciones): Date | null => {
      if (a.fechaResolucion) {
        const d = new Date(a.fechaResolucion)
        if (!isNaN(d.getTime())) return d
      }
      if (a.fechaCambioResuelto) {
        const d = new Date(a.fechaCambioResuelto)
        if (!isNaN(d.getTime())) return d
      }
      if (['Resuelto', 'Atendido'].includes(a.estado) && a.updatedAt) {
        const d = new Date(a.updatedAt)
        if (!isNaN(d.getTime())) return d
      }
      return null
    }

    // Casos resueltos cuya fecha de resolución cae en el período seleccionado
    const resueltosPeriodo = rawApelaciones.filter(a => {
      if (!porComplejidad(a)) return false
      if (!['Resuelto', 'Atendido'].includes(a.estado) && !a.fechaResolucion) return false
      const f = getFechaResolucionEfectiva(a)
      if (!f) return false
      return f >= desde && f <= hasta
    })

    const mediana = (valores: number[]) => {
      if (!valores.length) return 0
      const ordenados = [...valores].sort((a, b) => a - b)
      const centro = Math.floor(ordenados.length / 2)
      return ordenados.length % 2 ? ordenados[centro] : (ordenados[centro - 1] + ordenados[centro]) / 2
    }

    // 1. Tiempo de Proyección por Abogado: fechaCambioResuelto - fechaAsignacion
    const tiemposProyeccion = resueltosPeriodo.flatMap(a => {
      if (!a.fechaCambioResuelto || !a.fechaAsignacion) return []
      const dInicio = new Date(a.fechaAsignacion)
      const dFin = new Date(a.fechaCambioResuelto)
      if (isNaN(dInicio.getTime()) || isNaN(dFin.getTime())) return []
      const t0 = Date.UTC(dInicio.getFullYear(), dInicio.getMonth(), dInicio.getDate())
      const t1 = Date.UTC(dFin.getFullYear(), dFin.getMonth(), dFin.getDate())
      const dias = Math.round((t1 - t0) / 86400000)
      return isNaN(dias) || dias < 0 ? [] : [{ ...a, dias }]
    })

    const mapProyeccion = new Map<string, { nombre: string; dias: number[] }>()
    tiemposProyeccion.forEach(a => {
      const key = a.abogadoId || 'sin-asignar'
      const actual = mapProyeccion.get(key) || { nombre: a.abogado?.nombre || 'Sin profesional', dias: [] }
      actual.dias.push(a.dias)
      mapProyeccion.set(key, actual)
    })
    const profesionalesProyeccion = Array.from(mapProyeccion.values()).map(item => {
      const hasta15 = item.dias.filter(d => d <= 15).length
      const de16a30 = item.dias.filter(d => d >= 16 && d <= 30).length
      const de31a60 = item.dias.filter(d => d >= 31 && d <= 60).length
      const mas60   = item.dias.filter(d => d > 60).length
      return {
        nombre: item.nombre,
        mediana: mediana(item.dias),
        promedio: item.dias.reduce((s, d) => s + d, 0) / item.dias.length,
        total: item.dias.length,
        hasta15,
        de16a30,
        de31a60,
        mas60,
      }
    }).sort((a, b) => a.mediana - b.mediana)

    // 2. Tiempo de Revisión y Firma (por Abogado): fechaResolucion - fechaRevisor
    const tiemposRevision = resueltosPeriodo.flatMap(a => {
      if (!a.fechaResolucion || !a.fechaRevisor) return []
      const dInicio = new Date(a.fechaRevisor)
      const dFin = new Date(a.fechaResolucion)
      if (isNaN(dInicio.getTime()) || isNaN(dFin.getTime())) return []
      const t0 = Date.UTC(dInicio.getFullYear(), dInicio.getMonth(), dInicio.getDate())
      const t1 = Date.UTC(dFin.getFullYear(), dFin.getMonth(), dFin.getDate())
      const dias = Math.round((t1 - t0) / 86400000)
      return isNaN(dias) || dias < 0 ? [] : [{ ...a, dias }]
    })

    const mapRevision = new Map<string, { nombre: string; dias: number[] }>()
    tiemposRevision.forEach(a => {
      const key = a.abogadoId || 'sin-asignar'
      const actual = mapRevision.get(key) || { nombre: a.abogado?.nombre || 'Sin profesional', dias: [] }
      actual.dias.push(a.dias)
      mapRevision.set(key, actual)
    })
    const profesionalesRevision = Array.from(mapRevision.values()).map(item => ({
      nombre: item.nombre,
      mediana: mediana(item.dias),
      promedio: item.dias.reduce((s, d) => s + d, 0) / item.dias.length,
      total: item.dias.length,
    })).sort((a, b) => a.mediana - b.mediana)

    // 3. Tiempo Total del Trámite Institucional: fechaResolucion - fechaAsignacion
    const tiemposTramiteTotal = resueltosPeriodo.flatMap(a => {
      if (!a.fechaResolucion || !a.fechaAsignacion) return []
      const dInicio = new Date(a.fechaAsignacion)
      const dFin = new Date(a.fechaResolucion)
      if (isNaN(dInicio.getTime()) || isNaN(dFin.getTime())) return []
      const t0 = Date.UTC(dInicio.getFullYear(), dInicio.getMonth(), dInicio.getDate())
      const t1 = Date.UTC(dFin.getFullYear(), dFin.getMonth(), dFin.getDate())
      const dias = Math.round((t1 - t0) / 86400000)
      return isNaN(dias) || dias < 0 ? [] : [{ ...a, dias }]
    })

    const mapTramiteTotal = new Map<string, { nombre: string; dias: number[] }>()
    tiemposTramiteTotal.forEach(a => {
      const key = a.abogadoId || 'sin-asignar'
      const actual = mapTramiteTotal.get(key) || { nombre: a.abogado?.nombre || 'Sin profesional', dias: [] }
      actual.dias.push(a.dias)
      mapTramiteTotal.set(key, actual)
    })
    const profesionalesTramiteTotal = Array.from(mapTramiteTotal.values()).map(item => ({
      nombre: item.nombre,
      mediana: mediana(item.dias),
      promedio: item.dias.reduce((s, d) => s + d, 0) / item.dias.length,
      total: item.dias.length,
    })).sort((a, b) => a.mediana - b.mediana)

    const primerMes = periodo === 'mes' ? mesActual : periodo === 'trimestre' ? Math.floor(mesActual / 3) * 3 : 0
    const ultimoMes = periodo === 'mes' ? mesActual : periodo === 'trimestre' ? primerMes + 2 : 11
    const meses = Array.from({ length: ultimoMes - primerMes + 1 }, (_, indice) => {
      const mes = primerMes + indice
      return {
        mes: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'][mes],
        cantidad: resueltosPeriodo.filter(a => {
          const f = getFechaResolucionEfectiva(a)
          return f && f.getMonth() === mes
        }).length,
      }
    })

    const etiquetas: Record<string, string> = {
      FUNDADO: 'Fundado', FUNDADO_EN_PARTE: 'Fundado en parte', INFUNDADO: 'Infundado',
      IMPROCEDENTE: 'Improcedente', CARECE_DE_OBJETO: 'Carece de objeto emitir pronunciamiento',
      NULIDAD: 'Declara la nulidad', REMISION_ORGANO_COMPETENTE: 'Remisión al órgano competente',
      CESE_PARCIAL_FUNCIONES: 'Cese parcial de sus funciones',
    }
    const resultadosPeriodo = resueltosPeriodo.filter(a => a.resultadoResolucion)
    const resultados = new Map<string, number>()
    resultadosPeriodo.forEach(a => {
      const etiqueta = a.resultadoResolucion ? (etiquetas[a.resultadoResolucion] || a.resultadoResolucion) : 'Sin resultado registrado'
      resultados.set(etiqueta, (resultados.get(etiqueta) || 0) + 1)
    })
    const distribucion = Array.from(resultados, ([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad)
    const baseCobertura = resueltosPeriodo.length
    const porcentaje = (n: number) => baseCobertura ? Math.round(n * 100 / baseCobertura) : 0
    return {
      total: resueltosPeriodo.length,
      totalMedidos: tiemposTramiteTotal.length,
      medianaGlobal: mediana(tiemposTramiteTotal.map(t => t.dias)),
      medianaProyeccion: mediana(tiemposProyeccion.map(t => t.dias)),
      medianaRevision: mediana(tiemposRevision.map(t => t.dias)),
      coberturaResultado: porcentaje(resultadosPeriodo.length),
      coberturaFechaResolucion: porcentaje(resueltosPeriodo.filter(a => a.fechaResolucion).length),
      coberturaCambio: porcentaje(resueltosPeriodo.filter(a => a.fechaCambioResuelto).length),
      baseCobertura,
      profesionales: profesionalesTramiteTotal,
      profesionalesProyeccion,
      profesionalesRevision,
      profesionalesTramiteTotal,
      meses,
      distribucion,
      totalResultados: resultadosPeriodo.length,
    }
  }, [rawApelaciones, periodo, complejidadResoluciones, anioReferencia, mesReferencia])

  const complejidadesResoluciones = useMemo(() => {
    const mapa = new Map(rawApelaciones.map(a => [a.complejidadId, a.complejidad?.nombre || 'Sin complejidad']))
    return Array.from(mapa, ([id, nombre]) => ({ id, nombre })).filter(item => item.id)
  }, [rawApelaciones])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  // ─────────────────────────────────────────────────────────────────
  // MOTOR DE TRANSPARENCIA PARA EL CENTRO DE MANDO DIRECTIVO
  // ─────────────────────────────────────────────────────────────────
  const statsTransparenciaDirector = useMemo(() => {
    if (!rawTransparencia || rawTransparencia.length === 0) {
      return {
        total: 0,
        atendidas: 0,
        enTramite: 0,
        vencidos: 0,
        proximos: 0,
        pctCumplimiento: 0,
        pedidosPeriodo: [],
        porDireccion: [],
        porCategoria: [],
      }
    }

    const anioActual = anioReferencia
    const mesActual = mesReferencia

    let desde: Date
    let hasta: Date

    if (periodo === 'mes') {
      desde = new Date(anioActual, mesActual, 1, 0, 0, 0)
      hasta = new Date(anioActual, mesActual + 1, 0, 23, 59, 59)
    } else if (periodo === 'trimestre') {
      const q = Math.floor(mesActual / 3)
      desde = new Date(anioActual, q * 3, 1, 0, 0, 0)
      hasta = new Date(anioActual, (q + 1) * 3, 0, 23, 59, 59)
    } else {
      desde = new Date(anioActual, 0, 1, 0, 0, 0)
      hasta = new Date(anioActual, 11, 31, 23, 59, 59)
    }

    const filtrados = rawTransparencia.filter(r => {
      const f = r.fechaIngreso ? new Date(r.fechaIngreso) : (r.createdAt ? new Date(r.createdAt) : null)
      if (!f || isNaN(f.getTime())) return false
      return f >= desde && f <= hasta
    })

    const total = filtrados.length
    const atendidas = filtrados.filter(r => r.estado === 'Atendido').length
    const enTramite = filtrados.filter(r => r.estado === 'Pendiente' || r.estado === 'En Proceso').length

    let vencidos = 0
    let proximos = 0

    filtrados.forEach(r => {
      const alerta = clasificarAlerta(r.plazoVencimiento, r.estado)
      if (alerta === 'vencido') vencidos++
      if (alerta === 'proximo' || alerta === 'urgente') proximos++
    })

    const pctCumplimiento = total > 0 ? Math.round((atendidas / total) * 100) : 0

    // Por Dirección
    const dirMap: Record<string, number> = {}
    filtrados.forEach(r => {
      const rawDir: any = r.direccion
      const dirs: string[] = Array.isArray(rawDir)
        ? rawDir
        : (typeof rawDir === 'string' ? rawDir.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      if (dirs.length === 0) {
        dirMap['Sin dirección'] = (dirMap['Sin dirección'] || 0) + 1
      } else {
        dirs.forEach((d: string) => {
          dirMap[d] = (dirMap[d] || 0) + 1
        })
      }
    })
    const porDireccion = Object.entries(dirMap).map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
    })).sort((a, b) => b.cantidad - a.cantidad)

    // Por Categoría
    const catMap: Record<string, number> = {}
    filtrados.forEach(r => {
      const rawCat: any = r.categoria
      const cats: string[] = Array.isArray(rawCat)
        ? rawCat
        : (typeof rawCat === 'string' ? rawCat.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      if (cats.length === 0) {
        catMap['Sin categoría'] = (catMap['Sin categoría'] || 0) + 1
      } else {
        cats.forEach((c: string) => {
          catMap[c] = (catMap[c] || 0) + 1
        })
      }
    })
    const porCategoria = Object.entries(catMap).map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
    })).sort((a, b) => b.cantidad - a.cantidad)

    return {
      total,
      atendidas,
      enTramite,
      vencidos,
      proximos,
      pctCumplimiento,
      pedidosPeriodo: filtrados,
      porDireccion,
      porCategoria,
    }
  }, [rawTransparencia, periodo, anioReferencia, mesReferencia])

  // Lista de secciones del Sidebar clasificadas por estado de desarrollo
  const seccionesMenu: {
    id: SeccionId
    label: string
    icon: React.ReactNode
    habilitado: boolean
    badge?: string
    badgeColor?: string
  }[] = [
    // ── Módulos Habilitados en Vivo ──
    { id: 'resumen', label: 'Resumen General', icon: <LayoutDashboard className="w-5 h-5" />, habilitado: true },
    { id: 'sustracion', label: 'Sustracción Internacional', icon: <Globe className="w-5 h-5" />, habilitado: true, badge: '2 Alertas', badgeColor: 'bg-red-100 text-red-700 border border-red-200' },
    {
      id: 'apelaciones',
      label: 'Gestión de Apelaciones',
      icon: <Scale className="w-5 h-5" />,
      habilitado: true,
      badge: (statsFiltradas?.casosConPlazoProximo ?? 0) > 0 ? `${statsFiltradas?.casosConPlazoProximo} Alertas` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
    },
    {
      id: 'transparencia',
      label: 'Transparencia y Plazos',
      icon: <Eye className="w-5 h-5" />,
      habilitado: true,
      badge: statsTransparenciaDirector.vencidos > 0
        ? `${statsTransparenciaDirector.vencidos} Vencido${statsTransparenciaDirector.vencidos > 1 ? 's' : ''}`
        : statsTransparenciaDirector.proximos > 0
          ? `${statsTransparenciaDirector.proximos} Alerta${statsTransparenciaDirector.proximos > 1 ? 's' : ''}`
          : undefined,
      badgeColor: statsTransparenciaDirector.vencidos > 0
        ? 'bg-red-100 text-red-700 border border-red-200'
        : 'bg-amber-100 text-amber-800 border border-amber-200',
    },

    // ── Módulos en Proceso de Construcción ──
    { id: 'poi', label: 'POI y Presupuesto PP117', icon: <BarChart3 className="w-5 h-5" />, habilitado: false, badge: 'En Construcción', badgeColor: 'bg-slate-100 text-slate-600 border border-slate-300 font-medium' },
    { id: 'proyectos-ley', label: 'Proyectos de Ley', icon: <FileText className="w-5 h-5" />, habilitado: false, badge: 'En Construcción', badgeColor: 'bg-slate-100 text-slate-600 border border-slate-300 font-medium' },
    { id: 'informes', label: 'Informes para Despacho', icon: <FileSpreadsheet className="w-5 h-5" />, habilitado: false, badge: 'Próximamente', badgeColor: 'bg-slate-100 text-slate-600 border border-slate-300 font-medium' },
  ]

  // Texto descriptivo del período activo
  const nombreMes = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(fechaReferencia)
  const trimestreActual = Math.floor(mesReferencia / 3) + 1
  const labelPeriodo = {
    mes: `Mes actual (${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)} ${anioReferencia})`,
    trimestre: `${trimestreActual}.º trimestre ${anioReferencia}`,
    ano: `Año fiscal ${anioReferencia} completo`,
  }[periodo]

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      
      {/* ─────────────────────────────────────────────────────────────
          1. SIDEBAR LATERAL IZQUIERDO (100% Claro, Limpio y Elegante)
      ───────────────────────────────────────────────────────────── */}
      <aside className="w-72 bg-white text-slate-800 flex flex-col flex-shrink-0 border-r border-slate-200 shadow-sm z-20">
        
        {/* Header institucional */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl shadow-md shadow-blue-500/20">
            ⚖️
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight">
              DGNNA · MIMP
            </h1>
            <p className="text-[11px] text-blue-700 font-bold mt-0.5">Centro de Mando Directivo</p>
          </div>
        </div>

        {/* Identificador de la Directora */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs border border-blue-200">
              {session?.nombre?.charAt(0) || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{session?.nombre || 'Directora General'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Alta Dirección</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menú de Navegación por Secciones */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {/* Bloque 1: Módulos Operativos en Vivo */}
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Ejes Operativos en Vivo</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
            {seccionesMenu.filter(s => s.habilitado).map(item => {
              const activo = seccion === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSeccion(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activo
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={activo ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Bloque 2: Módulos en Proceso de Construcción */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>En Proceso de Integración</span>
              <Wrench className="w-3 h-3 text-slate-400" />
            </p>
            {seccionesMenu.filter(s => !s.habilitado).map(item => {
              const activo = seccion === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSeccion(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activo
                      ? 'bg-slate-100 text-slate-800 font-bold border border-slate-300 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={activo ? 'text-slate-700' : 'text-slate-400'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Footer del Sidebar: Volver al menú o Salir */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <button
            onClick={() => router.push('/menu')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>Volver al Menú</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. ÁREA PRINCIPAL DINÁMICA
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Cabecera Superior Clara */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {seccionesMenu.find(s => s.id === seccion)?.label}
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                Vista Macro Directiva
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                <Filter className="w-3 h-3 text-blue-600" />
                {labelPeriodo}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dirección General de Niñas, Niños y Adolescentes · Información consolidada en tiempo real
            </p>
          </div>

          {/* Selector Temporal Dinámico (Mes / Trimestre / Año 2026) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shadow-inner">
              <button
                onClick={() => setPeriodo('mes')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  periodo === 'mes'
                    ? 'bg-white text-blue-700 shadow-sm font-extrabold scale-102'
                    : 'hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Mes Actual
              </button>
              <button
                onClick={() => setPeriodo('trimestre')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  periodo === 'trimestre'
                    ? 'bg-white text-blue-700 shadow-sm font-extrabold scale-102'
                    : 'hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Trimestre
              </button>
              <button
                onClick={() => setPeriodo('ano')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  periodo === 'ano'
                    ? 'bg-white text-blue-700 shadow-sm font-extrabold scale-102'
                    : 'hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                Año {anioReferencia}
              </button>
            </div>

            <button
              onClick={() => setSeccion('informes')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Informe Despacho</span>
            </button>
          </div>
        </header>

        {/* Contenedor con Scroll del Contenido Seleccionado */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* ══════════════════════════════════════════════════════════
              VISTA 1: RESUMEN GENERAL (Tablero Panorámico Claro)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'resumen' && (
            <div className="space-y-8">
              {/* 4 KPIs Clave Superiores */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">NNA Atendidos (Total)</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      👥
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {periodo === 'mes' ? '580' : periodo === 'trimestre' ? '1,640' : '4,820'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+{periodo === 'mes' ? '8.5%' : periodo === 'trimestre' ? '15.2%' : '12.4%'} vs período anterior</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Sustracción Internacional</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      🌍
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {periodo === 'mes' ? '6' : periodo === 'trimestre' ? '14' : '38'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    {periodo === 'mes'
                      ? '4 Requerida · 2 Requirente · 2 Retornos'
                      : periodo === 'trimestre'
                      ? '9 Requerida · 5 Requirente · 6 Retornos'
                      : '24 Requerida · 14 Requirente · 18 Retornos'}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Apelaciones ({labelPeriodo})</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Scale className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {statsFiltradas?.totalCasos ?? (periodo === 'mes' ? 12 : periodo === 'trimestre' ? 28 : 175)}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-2">
                    {statsFiltradas?.casosAtendidos ?? 0} concluidos · {statsFiltradas?.casosPendientes ?? 0} activos
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Ejecución PP 0117 / POI</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-amber-600">
                    {periodo === 'mes' ? '8.4%' : periodo === 'trimestre' ? '26.1%' : '78.4%'}
                  </p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full"
                      style={{
                        width: periodo === 'mes' ? '8.4%' : periodo === 'trimestre' ? '26.1%' : '78.4%',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Panel de 2 Columnas: Radar de Alertas Críticas (Izquierda) + Carga por Dirección (Derecha) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Radar de Alertas Tempranas */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-red-200 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      <h3 className="font-extrabold text-sm text-slate-900">Radar de Alertas Críticas</h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                      {(statsFiltradas?.casosConPlazoProximo ?? 0) > 0 ? `${(statsFiltradas?.casosConPlazoProximo ?? 0) + 2} Urgentes` : '2 Urgentes'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-red-800 mb-1">
                        <span>🌍 Sustracción · Art. 4 La Haya</span>
                        <span className="text-[10px] bg-red-200/80 px-1.5 py-0.5 rounded text-red-900 font-bold">45 días restantes</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        El menor en el caso <strong>EXP-2026-089 (España → Perú)</strong> cumplirá 16 años el 12/10/2026. Requiere impulso judicial prioritario.
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-800 mb-1">
                        <span>📜 Congreso · Comisión de Mujer</span>
                        <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900 font-bold">48h límite</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Proyecto de Ley N.° 7842/2026-CR: Opinión técnica institucional solicitada con fecha de entrega improrrogable.
                      </p>
                    </div>

                    {(statsFiltradas?.casosConPlazoProximo ?? 0) > 0 && (
                      <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-blue-800 mb-1">
                          <span>⚖️ Apelaciones · Vencimiento SLA</span>
                          <span className="text-[10px] bg-blue-200/80 px-1.5 py-0.5 rounded text-blue-900 font-bold">
                            {statsFiltradas?.casosConPlazoProximo} caso(s)
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          {statsFiltradas?.casosConPlazoProximo} expediente(s) tienen plazo de emisión de resolución por vencer en los próximos 5 días hábiles.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumen de Productividad por Direcciones */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <h3 className="font-extrabold text-sm text-slate-900">Estado de Carga por Módulo Misional</h3>
                    <span className="text-xs text-slate-400 font-medium">{labelPeriodo}</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700">🌍 Sustracción Internacional</span>
                        <span className="text-blue-700">84% de Avance Promedio</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '84%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700">
                          ⚖️ Apelaciones ({statsFiltradas?.totalCasos ?? 175} Expedientes)
                        </span>
                        <span className="text-emerald-700">
                          {statsFiltradas && statsFiltradas.totalCasos > 0
                            ? Math.round((statsFiltradas.casosAtendidos / statsFiltradas.totalCasos) * 100)
                            : 0}% Concluidos
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{
                            width: `${
                              statsFiltradas && statsFiltradas.totalCasos > 0
                                ? Math.max(Math.round((statsFiltradas.casosAtendidos / statsFiltradas.totalCasos) * 100), 5)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700">📊 POI - Metas Físicas Alcanzadas (PP 0117)</span>
                        <span className="text-indigo-700">
                          {periodo === 'mes' ? '8.4%' : periodo === 'trimestre' ? '26.1%' : '78.4%'} Meta
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: periodo === 'mes' ? '8.4%' : periodo === 'trimestre' ? '26.1%' : '78.4%',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-700">📜 Proyectos de Ley Atendidos</span>
                        <span className="text-purple-700">95% Opiniones Emitidas</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '95%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Capacidad operativa global de la DGNNA:</span>
                    <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      🟢 Óptima (94.2%)
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 2: SUSTRACCIÓN INTERNACIONAL (La Haya 1980)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'sustracion' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Casos en Cartera</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {periodo === 'mes' ? '6' : periodo === 'trimestre' ? '14' : '38'}
                  </p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">Convenio de La Haya 1980</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Perú AC Requerida</p>
                  <p className="text-3xl font-black text-indigo-700 mt-1">
                    {periodo === 'mes' ? '4' : periodo === 'trimestre' ? '9' : '24'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Menores trasladados al Perú</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Perú AC Requirente</p>
                  <p className="text-3xl font-black text-purple-700 mt-1">
                    {periodo === 'mes' ? '2' : periodo === 'trimestre' ? '5' : '14'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Menores trasladados al exterior</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase">Retornos Concretados</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {periodo === 'mes' ? '2' : periodo === 'trimestre' ? '6' : '18'}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Acuerdos amigables + Judiciales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-extrabold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4">
                    🌍 Top Países Involucrados
                  </h3>
                  <div className="space-y-3">
                    {[
                      { pais: 'España', casos: 12, pct: 32 },
                      { pais: 'Italia', casos: 8, pct: 21 },
                      { pais: 'Argentina', casos: 6, pct: 16 },
                      { pais: 'Estados Unidos', casos: 5, pct: 13 },
                      { pais: 'Chile', casos: 4, pct: 10 },
                      { pais: 'Otros países', casos: 3, pct: 8 },
                    ].map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 w-32">{p.pais}</span>
                        <div className="flex-1 mx-3 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${p.pct}%` }} />
                        </div>
                        <span className="font-black text-slate-900 w-12 text-right">{p.casos} casos</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-extrabold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4">
                    ⚖️ Distribución por Etapa Normativa
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-700">1. Evaluación Inicial de Admisibilidad</span>
                      <span className="font-extrabold text-slate-900">4 casos</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <span className="font-semibold text-amber-800">2. Subsanación de Requisitos (5 días)</span>
                      <span className="font-extrabold text-amber-900">2 casos</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="font-semibold text-blue-800">3. Retorno Voluntario / Cooperación</span>
                      <span className="font-extrabold text-blue-900">8 casos</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                      <span className="font-semibold text-indigo-800">4. Vía Judicial Nacional / Extranjera</span>
                      <span className="font-extrabold text-indigo-900">12 casos</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="font-semibold text-emerald-800">5. Concluidos y Archivados (Éxito)</span>
                      <span className="font-extrabold text-emerald-900">12 casos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 3: APELACIONES (Gestión Operativa y Analítica)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'apelaciones' && (
            <div className="space-y-6">

              {/* Pestañas / Secciones Internas de Apelaciones */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setVistaApelaciones('gestion')}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      vistaApelaciones === 'gestion'
                        ? 'font-black bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-slate-200/60'
                    }`}
                  >
                    ⚖️ Gestión Operativa
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaApelaciones('resoluciones')}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      vistaApelaciones === 'resoluciones'
                        ? 'font-black bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-indigo-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>📈 Analítica de Resoluciones</span>
                    {analiticaResoluciones.total > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        vistaApelaciones === 'resoluciones'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {analiticaResoluciones.total}
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium hidden md:inline">
                    {vistaApelaciones === 'gestion'
                      ? 'Supervisión de expedientes activos, plazos de ley y capacidad operativa'
                      : 'Tiempos desde la asignación legal hasta la emisión de la resolución directoral'}
                  </span>
                  <button
                    type="button"
                    onClick={handleDescargarAyudaMemoria}
                    disabled={descargandoAyudaMemoria}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Descargar Ayuda Memoria Oficial de Gestión de Apelaciones en formato Word (.docx)"
                  >
                    {descargandoAyudaMemoria ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-600" />
                    )}
                    <span>{descargandoAyudaMemoria ? 'Generando Word...' : 'Ayuda Memoria'}</span>
                  </button>
                </div>
              </div>

              {vistaApelaciones === 'gestion' && (
                <div className="space-y-6">

              {/* Banner de Alerta de Plazos si hay casos próximos a vencer */}
              {(statsFiltradas?.casosConPlazoProximo ?? 0) > 0 && (
                <div className="flex items-center justify-between p-4 rounded-2xl border border-red-200 bg-red-50/80 text-red-900 shadow-sm">
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <span>
                      ⚠️ <strong>Alerta Directiva SLA:</strong> {statsFiltradas?.casosConPlazoProximo} caso{statsFiltradas?.casosConPlazoProximo! > 1 ? 's' : ''} con plazo legal próximo a vencer (≤ 5 días hábiles). Requieren impulso prioritario para emisión de resolución.
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/apelaciones')}
                    className="flex items-center gap-1 text-xs font-bold text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors shrink-0 shadow-sm"
                  >
                    <span>Ver en Bandeja</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 5 Tarjetas de Estado (Recalculadas en Vivo según el Filtro Activo) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Expedientes</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Inbox className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {statsFiltradas?.totalCasos ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 truncate">
                    Ingresados en {labelPeriodo}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Pendientes</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-amber-600 mt-1">
                    {statsFiltradas?.casosPendientes ?? 0}
                  </p>
                  <p className="text-xs text-amber-700 font-medium mt-1.5 truncate">
                    En calificación y atención
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Observados</span>
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-rose-600 mt-1">
                    {(statsFiltradas as any)?.casosObservados ?? 0}
                  </p>
                  <p className="text-xs text-rose-700 font-medium mt-1.5 truncate">
                    Requieren subsanación
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Resueltos</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Scale className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-blue-600 mt-1">
                    {statsFiltradas?.casosResueltos ?? 0}
                  </p>
                  <p className="text-xs text-blue-700 font-medium mt-1.5 truncate">
                    Proyecto emitido / revisión
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Atendidos</span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {statsFiltradas?.casosAtendidos ?? 0}
                  </p>
                  <p className="text-xs text-emerald-700 font-medium mt-1.5 truncate">
                    Resolución y cargo notificado
                  </p>
                </div>
              </div>

              {/* Panel de Asignación y Balance de Carga por Abogado (Dinámico) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Balance de Carga y Disponibilidad de Abogados · {labelPeriodo}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ponderación basada en foliatura y complejidad jurídica de los expedientes del período
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                    {statsFiltradas?.cargaPorAbogado?.length ?? 0} Especialistas con Registro
                  </span>
                </div>

                {/* Tabla de Carga de Abogados */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3 px-2">Abogado Responsable</th>
                        <th className="pb-3 px-3 text-center">Pendientes</th>
                        <th className="pb-3 px-3 text-center">Observados</th>
                        <th className="pb-3 px-3 text-center">Resueltos</th>
                        <th className="pb-3 px-3 text-center">Atendidos</th>
                        <th className="pb-3 px-3 text-right">Capacidad Operativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statsFiltradas?.cargaPorAbogado && statsFiltradas.cargaPorAbogado.length > 0 ? (
                        statsFiltradas.cargaPorAbogado.map((item, idx) => {
                          const puntos = item.puntosActivos || 0
                          const esDisponible = puntos < 50
                          const esAlta = puntos >= 160
                          const estaActivo = item.abogado?.activo !== false

                          return (
                            <tr key={item.abogado?.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-2">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs ${
                                    estaActivo ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {item.abogado?.nombre?.charAt(0) || 'A'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-slate-900">{item.abogado?.nombre}</p>
                                      {!estaActivo && (
                                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                          Inactivo
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400">Especialista Legal DGNNA</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  {item.casosActivos}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                {((item as any).casosObservados || 0) > 0 ? (
                                  <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    {(item as any).casosObservados}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold">0</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold text-blue-600">
                                {item.casosResueltos}
                              </td>
                              <td className="py-3.5 px-3 text-center font-bold text-emerald-600">
                                {item.casosCerrados}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                {!estaActivo ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    No Disponible (Inactivo)
                                  </span>
                                ) : esDisponible ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    🟢 Disponible
                                  </span>
                                ) : esAlta ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    🟡 Carga Completa
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    🔵 En Capacidad
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            No hay registros para este período seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2 Columnas: Carga por Revisor Legal + Distribución por Complejidad */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Carga por Revisor Legal */}
                <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Carga por Revisor Legal</h3>
                      <p className="text-xs text-slate-500">{labelPeriodo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {revisoresFiltrados && revisoresFiltrados.length > 0 ? (
                      revisoresFiltrados.map(rev => {
                        const iniciales = rev.nombre
                          ?.split(' ')
                          .slice(0, 2)
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase() || 'R'

                        return (
                          <div
                            key={rev.revisorId}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                                {iniciales}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-xs truncate">{rev.nombre}</p>
                                <p className="text-[10px] text-slate-400">Revisor Asignado</p>
                              </div>
                            </div>
                            <div className="flex items-baseline justify-between pt-2 border-t border-slate-200/60 text-xs">
                              <span className="text-slate-500 font-medium">Asignados en período:</span>
                              <span className="text-xl font-black text-purple-700">{rev.totalCasos}</span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-slate-400 col-span-2 text-center py-4">Sin datos de revisores</p>
                    )}
                  </div>
                </div>

                {/* Por Complejidad Jurídica */}
                <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Distribución por Complejidad Jurídica</h3>
                      <p className="text-xs text-slate-500">{labelPeriodo}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {statsFiltradas?.casosPorComplejidad && statsFiltradas.casosPorComplejidad.length > 0 ? (
                      statsFiltradas.casosPorComplejidad.map((comp, i) => {
                        const total = statsFiltradas.totalCasos || 1
                        const pct = Math.round((comp.cantidad / total) * 100)
                        const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-indigo-600']

                        return (
                          <div key={comp.nombre} className="text-xs">
                            <div className="flex justify-between font-bold text-slate-700 mb-1">
                              <span>{comp.nombre}</span>
                              <span className="text-slate-900">
                                {comp.cantidad} casos ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`${colors[i % colors.length]} h-2 rounded-full`}
                                style={{ width: `${Math.max(pct, 5)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">Sin datos de complejidad para este período</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Distribución por Procedencia */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Top Órganos de Procedencia</h3>
                    <p className="text-xs text-slate-500">Dependencias con mayor volumen de apelaciones en {labelPeriodo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {statsFiltradas?.casosPorProcedencia && statsFiltradas.casosPorProcedencia.length > 0 ? (
                    statsFiltradas.casosPorProcedencia.slice(0, 10).map((proc, i) => (
                      <div
                        key={proc.nombre || i}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-colors"
                      >
                        <p className="text-xl font-black text-slate-900">{proc.cantidad}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5 truncate" title={proc.nombre}>
                          {proc.nombre}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 col-span-5 text-center py-4">Sin datos de procedencia para este período</p>
                  )}
                </div>
              </div>

              </div>
            )}

            {/* SUB-PESTAÑA 2: ANALÍTICA DE RESOLUCIONES (Tiempos y Calidad) */}
            {vistaApelaciones === 'resoluciones' && (
              <section className="space-y-5" aria-labelledby="analitica-resoluciones-title">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 id="analitica-resoluciones-title" className="font-black text-lg text-slate-900">
                          Analítica de Resoluciones y Tiempos de Respuesta
                        </h2>
                        <p className="text-xs text-slate-500">
                          Medición de tiempos desde la fecha de asignación hasta la fecha oficial de la resolución
                        </p>
                      </div>
                    </div>
                  </div>
                  <label className="text-xs font-bold text-slate-600">
                    Complejidad jurídica
                    <select
                      value={complejidadResoluciones}
                      onChange={event => setComplejidadResoluciones(event.target.value)}
                      className="mt-1 block min-w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <option value="todas">Todas las complejidades</option>
                      {complejidadesResoluciones.map(item => (
                        <option key={item.id} value={item.id}>{item.nombre}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Expedientes Resueltos</p>
                    <p className="text-3xl font-black text-blue-600 mt-1">{analiticaResoluciones.total}</p>
                    <p className="text-xs text-slate-500 mt-1">Con resolución emitida o pase a resuelto en {labelPeriodo}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mediana hasta Resuelto</p>
                    <p className="text-3xl font-black text-indigo-600 mt-1">
                      {analiticaResoluciones.totalMedidos ? `${analiticaResoluciones.medianaGlobal} días` : '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Fecha de resolución menos fecha de asignación · {analiticaResoluciones.totalMedidos} medidos</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Resultado Registrado</p>
                    <p className="text-3xl font-black text-emerald-600 mt-1">{analiticaResoluciones.coberturaResultado}%</p>
                    <p className="text-xs text-slate-500 mt-1">Sobre {analiticaResoluciones.baseCobertura} expedientes resueltos en el período</p>
                  </div>
                </div>

                {/* ── 1. TIEMPO DE PROYECCIÓN POR ABOGADA: HISTOGRAMA POR RANGOS DE DÍAS (Opción 2) ── */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                        <h3 className="font-extrabold text-base text-slate-900">
                          1. Tiempo de Proyección por Abogada (Distribución por Rangos de Días)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Días calendario desde la Asignación Legal hasta el Pase a estado Resuelto (Elaboración del proyecto)
                      </p>
                    </div>

                    {/* Leyenda Semafórica Directiva */}
                    <div className="flex items-center flex-wrap gap-2 text-[11px] font-bold">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        ≤ 15 días (Rápido)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        16 a 30 días (Mes 1)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-800 border border-orange-200">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        31 a 60 días (Mes 2)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        &gt; 60 días (Crítico)
                      </span>
                    </div>
                  </div>

                  {/* Cuadrícula de Tarjetas por cada Abogada con Mini-Histograma */}
                  {analiticaResoluciones.profesionalesProyeccion.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
                      {analiticaResoluciones.profesionalesProyeccion.map(item => {
                        const maxVal = Math.max(item.hasta15, item.de16a30, item.de31a60, item.mas60, 1)
                        const pctOportuno = item.total ? Math.round(((item.hasta15 + item.de16a30) / item.total) * 100) : 0

                        const barras = [
                          { label: '≤ 15 d', count: item.hasta15, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgBox: 'bg-emerald-50' },
                          { label: '16-30 d', count: item.de16a30, color: 'bg-amber-500', textColor: 'text-amber-700', bgBox: 'bg-amber-50' },
                          { label: '31-60 d', count: item.de31a60, color: 'bg-orange-500', textColor: 'text-orange-700', bgBox: 'bg-orange-50' },
                          { label: '> 60 d', count: item.mas60, color: 'bg-rose-500', textColor: 'text-rose-700', bgBox: 'bg-rose-50' },
                        ]

                        return (
                          <div
                            key={item.nombre}
                            className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
                          >
                            {/* Cabecera de la Abogada */}
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-extrabold text-xs text-slate-900 truncate" title={item.nombre}>
                                  {item.nombre}
                                </h4>
                                <span className="font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 whitespace-nowrap">
                                  {item.mediana} d med.
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {item.total} exp. · Promedio: {item.promedio.toFixed(1)} d
                              </p>
                            </div>

                            {/* Mini-Histograma Vertical de 4 Columnas */}
                            <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-inner">
                              <div className="h-28 flex items-end justify-between gap-2 pt-2 px-1 border-b border-slate-100">
                                {barras.map(b => {
                                  const alturaPct = Math.max((b.count / maxVal) * 100, 8)
                                  return (
                                    <div key={b.label} className="flex-1 flex flex-col items-center justify-end h-full group">
                                      <span className={`text-[10px] font-black ${b.count > 0 ? b.textColor : 'text-slate-300'} mb-1`}>
                                        {b.count}
                                      </span>
                                      <div className="w-full bg-slate-100 rounded-t-md h-full flex items-end overflow-hidden">
                                        <div
                                          className={`w-full ${b.color} rounded-t-md transition-all duration-500`}
                                          style={{ height: `${b.count > 0 ? alturaPct : 0}%` }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Etiquetas de Rangos bajo cada barra */}
                              <div className="flex justify-between gap-2 pt-2 px-1 text-center">
                                {barras.map(b => (
                                  <div key={b.label} className="flex-1">
                                    <span className="block text-[9px] font-bold text-slate-500 whitespace-nowrap">
                                      {b.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Resumen al pie de la tarjeta */}
                            <div className="pt-1 flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-500">En ≤ 30 días:</span>
                              <span className={pctOportuno >= 50 ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded'}>
                                {pctOportuno}% ({item.hasta15 + item.de16a30}/{item.total})
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-8">Sin expedientes resueltos en este período.</p>
                  )}
                </div>

                {/* ── Fila Inferior de Gráficos 2 y 3: Revisión y Tiempo Total ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* 2. Tiempo con el Revisor Legal */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                            2. Tiempo de Revisión y Firma
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Por abogada · Pase a Revisor ➔ Resolución Directoral firmada
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                          Mediana Global: {analiticaResoluciones.medianaRevision} d
                        </span>
                      </div>

                      {analiticaResoluciones.profesionalesRevision.length ? (
                        <div className="space-y-4">
                          {analiticaResoluciones.profesionalesRevision.map(item => {
                            const maximo = Math.max(...analiticaResoluciones.profesionalesRevision.map(p => p.mediana), 1)
                            return (
                              <div key={item.nombre} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-700 truncate" title={item.nombre}>{item.nombre}</span>
                                  <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px]">
                                    {item.mediana} días
                                  </span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(item.mediana * 100 / maximo, 6)}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Promedio {item.promedio.toFixed(1)} d · {item.total} exp.
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-8">Sin expedientes con fecha de revisor y resolución registrada.</p>
                      )}
                    </div>
                  </div>

                  {/* 3. Tiempo Total del Trámite Institucional */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                            3. Tiempo Total (Ciclo Integral)
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Por abogada · Asignación legal ➔ Resolución Directoral firmada
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                          Mediana Global: {analiticaResoluciones.medianaGlobal} d
                        </span>
                      </div>

                      {analiticaResoluciones.profesionalesTramiteTotal.length ? (
                        <div className="space-y-4">
                          {analiticaResoluciones.profesionalesTramiteTotal.map(item => {
                            const maximo = Math.max(...analiticaResoluciones.profesionalesTramiteTotal.map(p => p.mediana), 1)
                            return (
                              <div key={item.nombre} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-700 truncate" title={item.nombre}>{item.nombre}</span>
                                  <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                    {item.mediana} días
                                  </span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(item.mediana * 100 / maximo, 6)}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Promedio {item.promedio.toFixed(1)} d · {item.total} exp.
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-8">Sin expedientes resueltos con fecha de resolución en este período.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* ── Fila de Volumen y Resultados ── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-900">Expedientes resueltos por mes</h3>
                    <p className="text-xs text-slate-500 pb-3 border-b border-slate-100 mb-4">Basado en la fecha oficial de resolución directoral</p>
                    <div className="h-52 flex items-end gap-2" role="img" aria-label="Expedientes resueltos por mes">
                      {analiticaResoluciones.meses.map(item => {
                        const maximo = Math.max(...analiticaResoluciones.meses.map(m => m.cantidad), 1)
                        return (
                          <div key={item.mes} className="flex-1 h-full flex flex-col justify-end items-center gap-1 min-w-0">
                            <span className="text-[10px] font-black text-slate-700">{item.cantidad || ''}</span>
                            <div
                              className="w-full max-w-8 bg-blue-600 rounded-t-md min-h-0"
                              style={{ height: item.cantidad ? `${Math.max(item.cantidad * 82 / maximo, 5)}%` : 0 }}
                              title={`${item.mes}: ${item.cantidad} expedientes`}
                            />
                            <span className="text-[10px] text-slate-500">{item.mes}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-900">Distribución de resultados</h3>
                    <p className="text-xs text-slate-500 pb-3 border-b border-slate-100 mb-4">Pronunciamientos registrados en las resoluciones del período</p>
                    {analiticaResoluciones.distribucion.length ? (
                      <div className="space-y-3">
                        {analiticaResoluciones.distribucion.map(item => {
                          const total = analiticaResoluciones.totalResultados || 1
                          const porcentaje = Math.round(item.cantidad * 100 / total)
                          return (
                            <div key={item.nombre}>
                              <div className="flex justify-between gap-3 text-xs font-bold mb-1">
                                <span className="text-slate-700">{item.nombre}</span>
                                <span className="text-slate-900 whitespace-nowrap">{item.cantidad} ({porcentaje}%)</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.max(porcentaje, 3)}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-10">No hay resultados de resolución registrados en este período.</p>
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-900">Cobertura de información</h3>
                    <p className="text-xs text-slate-500 pb-3 border-b border-slate-100 mb-4">Calidad y registro de campos en expedientes resueltos del período</p>
                    <div className="space-y-5">
                      {[
                        { nombre: 'Resultado registrado', valor: analiticaResoluciones.coberturaResultado },
                        { nombre: 'Fecha de resolución registrada', valor: analiticaResoluciones.coberturaFechaResolucion },
                        { nombre: 'Fecha de pase a Resuelto', valor: analiticaResoluciones.coberturaCambio },
                      ].map(item => (
                        <div key={item.nombre}>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-slate-700">{item.nombre}</span>
                            <span className="text-slate-900">{item.valor}%</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${item.valor}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      Los expedientes con fecha de resolución o pase a resuelto se incluyen en el cálculo de tiempos.
                    </p>
                  </div>
                </div>
              </section>
            )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 4: POI Y PRESUPUESTO PP 0117 (EN CONSTRUCCIÓN)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'poi' && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                    <Construction className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200/70 text-amber-900 border border-amber-300">
                        En Proceso de Construcción
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Fase II · Integración SIAF / POI</span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      Módulo POI y Presupuesto (PP 0117)
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSeccion('resumen')}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Volver al Resumen General
                </button>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4 my-8">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                  <Wrench className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Integración de Datos Presupuestales en Curso</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Este panel se encuentra en desarrollo técnico para interoperar directamente con el Sistema Integrado de Administración Financiera (SIAF-SP) y los reportes oficiales del Programa Presupuestal 0117 y las 25 Unidades de Protección Especial (UPE).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700">📌 Alcance Previsto</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Ejecución del PIM, devengados y certificación por metas del PP 0117.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700">⏳ Estado de Disponibilidad</p>
                    <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Próximamente disponible en la siguiente entrega directiva.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 5: PROYECTOS DE LEY (EN CONSTRUCCIÓN)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'proyectos-ley' && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                    <Construction className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200/70 text-amber-900 border border-amber-300">
                        En Proceso de Construcción
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Fase II · Enlace Parlamentario</span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      Módulo de Monitoreo de Proyectos de Ley
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSeccion('resumen')}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Volver al Resumen General
                </button>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4 my-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                  <Landmark className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Bandeja Normativa Parlamentaria en Desarrollo</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    La sincronización con los pedidos de opinión técnica solicitados por las Comisiones del Congreso de la República (Mujer y Familia, Justicia y Derechos Humanos) y la OGAJ del MIMP está en etapa de diseño e integración.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700">📌 Alcance Previsto</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Alertas de plazos de opiniones de ley, matrices comparativas e informes técnicos emitidos.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700">⏳ Estado de Disponibilidad</p>
                    <p className="text-[11px] text-amber-700 font-semibold mt-0.5">En proceso de estructuración con el equipo normativo.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 6: TRANSPARENCIA Y PLAZOS (Datos Consolidados en Tiempo Real)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'transparencia' && (
            <div className="space-y-6">

              {/* Banner de Estado Normativo */}
              <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Ley N.° 27806 · Información Pública
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Plazo legal: 10 días hábiles
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1.5">
                    Supervisión Directiva de Pedidos de Transparencia
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Mostrando métricas consolidadas correspondientes a: <strong className="text-slate-800">{labelPeriodo}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/transparencia')}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm self-start md:self-auto"
                >
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Ir a Bandeja Operativa</span>
                </button>
              </div>

              {/* 4 KPIs Clave */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Solicitudes Totales</p>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Inbox className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mt-2">{statsTransparenciaDirector.total}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Registradas en {labelPeriodo}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Atendidas</p>
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-3xl font-black text-emerald-600 mt-2">{statsTransparenciaDirector.atendidas}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    {statsTransparenciaDirector.pctCumplimiento}% de efectividad
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">En Trámite</p>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Clock className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-3xl font-black text-blue-600 mt-2">{statsTransparenciaDirector.enTramite}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">Pendientes o En Proceso</p>
                </div>

                <div className={`p-5 rounded-2xl border shadow-sm ${
                  statsTransparenciaDirector.vencidos > 0
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : statsTransparenciaDirector.proximos > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {statsTransparenciaDirector.vencidos > 0 ? 'Vencidos' : 'Alertas de Plazo'}
                    </p>
                    <span className={`p-2 rounded-xl ${
                      statsTransparenciaDirector.vencidos > 0
                        ? 'bg-red-100 text-red-600'
                        : statsTransparenciaDirector.proximos > 0
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-3xl font-black mt-2">
                    {statsTransparenciaDirector.vencidos > 0
                      ? statsTransparenciaDirector.vencidos
                      : statsTransparenciaDirector.proximos}
                  </p>
                  <p className="text-xs font-medium mt-1">
                    {statsTransparenciaDirector.vencidos > 0
                      ? 'Requieren atención urgente'
                      : statsTransparenciaDirector.proximos > 0
                        ? 'Próximos a vencer (≤3 días)'
                        : 'Todos los plazos al día'}
                  </p>
                </div>
              </div>

              {/* Gráficos ejecutivos y listado de pedidos prioritarios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Pedidos por Dirección asignada */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-extrabold text-sm text-slate-900">Distribución por Dirección</h4>
                  <p className="text-xs text-slate-500 pb-3 border-b border-slate-100 mb-4">
                    Órganos de línea y unidades involucradas en las solicitudes del período
                  </p>
                  {statsTransparenciaDirector.porDireccion.length ? (
                    <div className="space-y-3.5">
                      {statsTransparenciaDirector.porDireccion.map((item, i) => {
                        const total = statsTransparenciaDirector.total || 1
                        const pct = Math.round((item.cantidad * 100) / total)
                        const colores = ['bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-amber-600', 'bg-emerald-600']
                        return (
                          <div key={item.nombre}>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-slate-700">{item.nombre}</span>
                              <span className="text-slate-900">{item.cantidad} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${colores[i % colores.length]}`}
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-10">No hay registros en este período.</p>
                  )}
                </div>

                {/* Pedidos por Categoría */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-extrabold text-sm text-slate-900">Distribución por Categoría</h4>
                  <p className="text-xs text-slate-500 pb-3 border-b border-slate-100 mb-4">
                    Clasificación temática de la información solicitada
                  </p>
                  {statsTransparenciaDirector.porCategoria.length ? (
                    <div className="space-y-3.5">
                      {statsTransparenciaDirector.porCategoria.map((item, i) => {
                        const total = statsTransparenciaDirector.total || 1
                        const pct = Math.round((item.cantidad * 100) / total)
                        const colores = ['bg-cyan-600', 'bg-orange-600', 'bg-lime-600', 'bg-purple-600', 'bg-rose-600']
                        return (
                          <div key={item.nombre}>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-slate-700">{item.nombre}</span>
                              <span className="text-slate-900">{item.cantidad} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${colores[i % colores.length]}`}
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-10">No hay categorías registradas en este período.</p>
                  )}
                </div>

              </div>

              {/* Panel de Solicitudes en Trámite o con Alerta de Plazo */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Solicitudes que Requieren Seguimiento</h4>
                    <p className="text-xs text-slate-500">Expedientes activos del período con indicación de vencimiento</p>
                  </div>
                  <Link href="/transparencia?estado=Pendiente">
                    <span className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer">
                      Ver todos en Bandeja <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>

                {statsTransparenciaDirector.pedidosPeriodo.filter(p => p.estado !== 'Atendido').length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="pb-2.5">N° Expediente</th>
                          <th className="pb-2.5">Fecha Ingreso</th>
                          <th className="pb-2.5">Dirección</th>
                          <th className="pb-2.5">Asunto</th>
                          <th className="pb-2.5">Estado</th>
                          <th className="pb-2.5">Alerta Plazo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {statsTransparenciaDirector.pedidosPeriodo
                          .filter(p => p.estado !== 'Atendido')
                          .slice(0, 5)
                          .map((p) => {
                            const alerta = clasificarAlerta(p.plazoVencimiento, p.estado)
                            const dias = p.plazoVencimiento ? diasHabilesRestantes(new Date(p.plazoVencimiento)) : null
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 font-bold text-slate-900">{p.numeroExpediente}</td>
                                <td className="py-3 text-slate-600">
                                  {p.fechaIngreso ? new Date(p.fechaIngreso).toLocaleDateString('es-PE') : '—'}
                                </td>
                                <td className="py-3 text-slate-700 font-medium">
                                  {Array.isArray(p.direccion) ? p.direccion.join(', ') : p.direccion || '—'}
                                </td>
                                <td className="py-3 text-slate-600 max-w-xs truncate" title={p.asunto}>
                                  {p.asunto}
                                </td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                    p.estado === 'En Proceso'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {p.estado}
                                  </span>
                                </td>
                                <td className="py-3">
                                  {alerta === 'vencido' ? (
                                    <span className="flex items-center gap-1 text-red-600 font-bold text-[11px]">
                                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                      Vencido ({dias ? Math.abs(dias) : 0}d háb.)
                                    </span>
                                  ) : alerta === 'urgente' || alerta === 'proximo' ? (
                                    <span className="flex items-center gap-1 text-amber-600 font-bold text-[11px]">
                                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                      {dias}d háb. restantes
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 font-medium text-[11px]">
                                      En plazo ({dias}d háb.)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No hay solicitudes pendientes ni vencidas en el período seleccionado.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              VISTA 7: INFORMES PARA DESPACHO MINISTERIAL (EN CONSTRUCCIÓN)
          ══════════════════════════════════════════════════════════ */}
          {seccion === 'informes' && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                    <Construction className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200/70 text-amber-900 border border-amber-300">
                        En Proceso de Construcción
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Fase II · Automatización SGD</span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      Generador de Informes para Despacho Ministerial
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSeccion('resumen')}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Volver al Resumen General
                </button>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4 my-8">
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto border border-purple-100">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Plantillas Oficiales y Generación Automatizada</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    La generación automática de Informes Ejecutivos, Ayudas Memoria para la Titular del Pliego y balances estadísticos para Cancillería se habilitará cuando se complete la consolidación multianual.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700">📌 Alcance Previsto</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Exportación instantánea a Word/PDF con sellos de gestión y tablas de indicadores.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700">⏳ Estado de Disponibilidad</p>
                    <p className="text-[11px] text-amber-700 font-semibold mt-0.5">En proceso de integración con la oficina técnica.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  )
}
