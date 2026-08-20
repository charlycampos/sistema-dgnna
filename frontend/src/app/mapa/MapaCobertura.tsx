'use client'

import { useEffect, useMemo, useRef, useState, useCallback, type TouchEvent as ReactTouchEvent } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  MapPin, Search, X, ChevronRight, ChevronLeft, Building2,
  CheckCircle2, AlertTriangle, Phone, Clock, Home, LocateFixed,
  Navigation, Loader2, Shield, Heart, ShieldAlert, SlidersHorizontal,
} from 'lucide-react'

/* ── Tipos ─────────────────────────────────────────────────────── */
interface Institucion {
  id: string; nombre: string; tipo: string
  direccion?: string; telefono?: string; horario?: string
  lat?: number; lng?: number; acreditacion?: string | null
}

function BadgeAcreditacion({ valor }: { valor?: string | null }) {
  if (!valor) return null
  const color = valor === 'Acreditada' ? 'bg-green-600'
    : valor === 'Inoperativa' ? 'bg-red-600' : 'bg-amber-500'
  return <Badge className={color}>{valor}</Badge>
}

function simplificarNombreSede(nombre: string, tipo: string): string {
  let limpio = nombre.trim()
  const tipoUpper = (tipo || '').toUpperCase()

  if (tipoUpper === 'DEMUNA') {
    const regexPrefijo = /^(defensoria\s+municipal\s+de\s+la\s+niña,\s+niño\s+y\s+adolescente|defensoría\s+municipal\s+de\s+la\s+niña,\s+niño\s+y\s+adolescente|defensoria\s+municipal\s+del\s+niño\s+y\s+del\s+adolescente|defensoría\s+municipal\s+del\s+niño\s+y\s+del\s+adolescente|defensoria\s+municipal\s+del\s+niño\s+y\s+adolescente|defensoría\s+municipal\s+del\s+niño\s+y\s+adolescente|defensoria\s+del\s+niño\s+y\s+del\s+adolescente|defensoría\s+del\s+niño\s+y\s+del\s+adolescente|defensoria\s+del\s+niño\s+y\s+adolescente|defensoría\s+del\s+niño\s+y\s+adolescente|demuna)\b/i;
    limpio = limpio.replace(regexPrefijo, '').trim()
    limpio = limpio.replace(/^(de\s+la\s+|de\s+|del\s+)/i, '').trim()
    return limpio || nombre
  }

  return nombre
}

function KpiAcreditacionDemuna({ stats }: {
  stats: { acred: number; noAcred: number; total: number; pct: number } | null
}) {
  if (!stats || stats.total === 0) return null
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Acreditación DEMUNA
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-green-700 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" /> {stats.acred} acreditadas
        </span>
        <span className="flex items-center gap-1 text-amber-700 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" /> {stats.noAcred} no acreditadas
        </span>
      </div>
      <div className="h-1.5 rounded bg-amber-400/40 overflow-hidden">
        <div className="h-full bg-green-600" style={{ width: `${stats.pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground text-right">{stats.pct}% acreditadas ({stats.total} en total)</p>
    </div>
  )
}
interface InstitucionDetalle extends Institucion {
  departamento?: string; cobertura: string[]
}
interface Cobertura {
  instituciones: Institucion[]
  distritos: Record<string, number[]>          // ubigeo → índices
  totalesDep: Record<string, number>           // DD → total distritos
  totalesProv: Record<string, number>          // DDPP → total distritos
}
interface Opcion { codigo: string; nombre: string }
interface DistOpcion { codigo: string; provincia: string; nombre: string }
interface ResultadoBusqueda {
  codigo: string; nombre: string; dep: string; prov: string
  depNombre: string; provNombre: string
}
interface UbicacionUsuario { lat: number; lng: number; precision: number }
interface PasoRuta { instruccion: string; distancia: string }
interface RutaActiva {
  destino: Institucion & { lat: number; lng: number }
  distancia: string; duracion: string; pasos: PasoRuta[]
}

/* ── Utilidades ────────────────────────────────────────────────── */
const COLOR_SIN   = '#d1d5db'
const COLOR_BORDE = '#6b7280'

function colorPorPct(pct: number): string {
  if (pct <= 0)   return COLOR_SIN
  if (pct < 25)   return '#fde68a'
  if (pct < 50)   return '#fbbf24'
  if (pct < 75)   return '#60a5fa'
  if (pct < 100)  return '#3b82f6'
  return '#1d4ed8'
}

const COLOR_ACREDITADA    = '#16a34a'
const COLOR_NO_ACREDITADA = '#f59e0b'

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radioTierraKm = 6371
  const aRadianes = (grados: number) => grados * Math.PI / 180
  const dLat = aRadianes(lat2 - lat1)
  const dLng = aRadianes(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * radioTierraKm * Math.asin(Math.sqrt(a))
}

function textoDistancia(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
}

/* Decodifica el "overview_polyline" (encoded polyline de Google) a pares [lat, lng]. */
function decodificarPolilinea(cod: string): [number, number][] {
  let indice = 0, lat = 0, lng = 0
  const puntos: [number, number][] = []
  while (indice < cod.length) {
    let resultado = 0, desplazamiento = 0, byte: number
    do {
      byte = cod.charCodeAt(indice++) - 63
      resultado |= (byte & 0x1f) << desplazamiento
      desplazamiento += 5
    } while (byte >= 0x20)
    lat += (resultado & 1) ? ~(resultado >> 1) : (resultado >> 1)

    resultado = 0; desplazamiento = 0
    do {
      byte = cod.charCodeAt(indice++) - 63
      resultado |= (byte & 0x1f) << desplazamiento
      desplazamiento += 5
    } while (byte >= 0x20)
    lng += (resultado & 1) ? ~(resultado >> 1) : (resultado >> 1)

    puntos.push([lat / 1e5, lng / 1e5])
  }
  return puntos
}

const SVG_ESCUDO = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
const SVG_CASA = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
const SVG_CORAZON = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
const SVG_ALERTA = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
const SVG_EDIFICIO = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/><line x1="9" y1="16" x2="15" y2="16"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/></svg>`

function crearIconoSvg(color: string, svgContent: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 2px ${color}44, 0 3px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
      ">
        ${svgContent}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

function iconoPorInstitucion(i: Institucion): L.DivIcon {
  const tipo = (i.tipo ?? '').toUpperCase()
  if (tipo === 'DEMUNA') {
    const color = i.acreditacion === 'Acreditada' ? '#10b981' : i.acreditacion === 'Inoperativa' ? '#ef4444' : '#f59e0b'
    return crearIconoSvg(color, SVG_CORAZON)
  }
  if (tipo === 'UPE') {
    return crearIconoSvg('#4f46e5', SVG_ESCUDO)
  }
  if (tipo === 'CAR') {
    return crearIconoSvg('#0d9488', SVG_CASA)
  }
  if (tipo === 'CEM') {
    return crearIconoSvg('#d946ef', SVG_ALERTA)
  }
  return crearIconoSvg('#64748b', SVG_EDIFICIO)
}

/* % de DEMUNA acreditadas entre las que cubren un prefijo de ubigeo (distrito,
   provincia o departamento). null si no hay ninguna DEMUNA en esa zona. */
function pctAcreditacionDemuna(cobertura: Cobertura, prefijoUbigeo: string): number | null {
  let acred = 0, total = 0
  Object.entries(cobertura.distritos).forEach(([ubi, idxs]) => {
    if (!ubi.startsWith(prefijoUbigeo)) return
    idxs.forEach(i => {
      const inst = cobertura.instituciones[i]
      if (!inst || inst.tipo !== 'DEMUNA') return
      total++
      if (inst.acreditacion === 'Acreditada') acred++
    })
  })
  return total ? Math.round((acred / total) * 100) : null
}

/* Color de un polígono según el % de DEMUNA acreditadas en la zona:
   gris = sin cobertura, degradado rojo (0%) → ámbar → verde (100%). */
function colorPorAcreditacionDemuna(cobertura: Cobertura, prefijoUbigeo: string): string {
  const pct = pctAcreditacionDemuna(cobertura, prefijoUbigeo)
  if (pct === null) return COLOR_SIN
  if (pct < 25)  return '#E24B4A'
  if (pct < 50)  return '#EF9F27'
  if (pct < 75)  return '#FAC775'
  if (pct < 100) return '#97C459'
  return '#639922'
}

const cacheGeo: Record<string, GeoJSON.FeatureCollection> = {}
async function cargarGeo(archivo: string): Promise<GeoJSON.FeatureCollection> {
  if (cacheGeo[archivo]) return cacheGeo[archivo]
  const res = await fetch(`/geo/${archivo}`)
  if (!res.ok) throw new Error(`No se encontró /geo/${archivo}`)
  const data = await res.json()
  cacheGeo[archivo] = data
  return data
}

/* ── Componente ────────────────────────────────────────────────── */
export default function MapaCobertura() {
  const mapRef       = useRef<L.Map | null>(null)
  const capaGeoRef   = useRef<L.GeoJSON | null>(null)
  const capaSedesRef = useRef<L.LayerGroup | null>(null)
  const capaUbicacionRef = useRef<L.LayerGroup | null>(null)
  const capaRutaRef  = useRef<L.LayerGroup | null>(null)
  const divRef       = useRef<HTMLDivElement | null>(null)
  const layersRef    = useRef<Record<string, L.Path>>({})

  const [cobertura, setCobertura]   = useState<Cobertura | null>(null)
  const [tipos, setTipos]           = useState<string[]>([])
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [modoVisualizacion, setModoVisualizacion] = useState<'resumen' | 'geografia'>('resumen')
  const [busquedaSedes, setBusquedaSedes] = useState('')
  const [verSedes, setVerSedes]     = useState(true)
  const [errorGeo, setErrorGeo]     = useState(false)
  const [ubicacion, setUbicacion]   = useState<UbicacionUsuario | null>(null)

  const [ubicando, setUbicando]     = useState(false)
  const [ruta, setRuta]             = useState<RutaActiva | null>(null)
  const [trazandoRuta, setTrazandoRuta] = useState(false)

  /* selección jerárquica (sincroniza mapa ↔ combos ↔ panel) */
  const [selDep, setSelDep]   = useState<string | null>(null)   // '15'
  const [selProv, setSelProv] = useState<string | null>(null)   // '01'
  const [selDist, setSelDist] = useState<string | null>(null)   // '150123'
  const [instSel, setInstSel] = useState<InstitucionDetalle | null>(null)

  /* catálogos para combos */
  const [depsOpts, setDepsOpts]   = useState<Opcion[]>([])
  const [provOpts, setProvOpts]   = useState<Opcion[]>([])
  const [distOpts, setDistOpts]   = useState<DistOpcion[]>([])

  /* panel y buscador */
  /* En móvil el panel arranca cerrado (solo se ve su botón); en escritorio abierto */
  const esPantallaMovil = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  const [panelAbierto, setPanelAbierto] = useState(() => !esPantallaMovil())
  const [busqueda, setBusqueda]         = useState('')
  const [resultados, setResultados]     = useState<ResultadoBusqueda[]>([])

  /* móvil: drawer de filtros, bottom sheet del panel y leyenda colapsable */
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [leyendaAbierta, setLeyendaAbierta] = useState(false)
  /* táctil: primer toque en un polígono muestra su etiqueta; el segundo navega */
  const ultimoTapRef = useRef<string | null>(null)
  const [alturaPanel, setAlturaPanel] = useState<'min' | 'medio' | 'max'>('medio')
  const touchInicioY = useRef<number | null>(null)

  const onTouchStartPanel = (e: ReactTouchEvent) => {
    touchInicioY.current = e.touches[0].clientY
  }
  const onTouchEndPanel = (e: ReactTouchEvent) => {
    if (touchInicioY.current === null) return
    const delta = e.changedTouches[0].clientY - touchInicioY.current
    touchInicioY.current = null
    if (Math.abs(delta) < 30) return // tap, lo maneja onClick
    const orden: ('min' | 'medio' | 'max')[] = ['min', 'medio', 'max']
    const i = orden.indexOf(alturaPanel)
    if (delta < 0 && i < 2) setAlturaPanel(orden[i + 1]) // deslizar hacia arriba → expandir
    if (delta > 0 && i > 0) setAlturaPanel(orden[i - 1]) // hacia abajo → contraer
  }

  /* Cuántas sedes mostrar en el listado (se pintan de a 100 para no congelar la UI) */
  const [maxSedes, setMaxSedes] = useState(100)

  useEffect(() => {
    setBusquedaSedes('')
    setMaxSedes(100)
  }, [tipoFiltro, selDep, selProv, selDist])

  /* ── datos ──────────────────────────────────────────────────── */
  useEffect(() => {
    const q = tipoFiltro !== 'todos' ? `?tipo=${encodeURIComponent(tipoFiltro)}` : ''
    fetch(`/api/mapa/cobertura${q}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setCobertura)
      .catch(() => toast.error('Error al cargar la cobertura'))
  }, [tipoFiltro])

  useEffect(() => {
    fetch('/api/mapa/tipos').then(r => r.ok ? r.json() : []).then(setTipos).catch(() => {})
    fetch('/api/mapa/ubigeo/departamentos').then(r => r.ok ? r.json() : []).then(setDepsOpts).catch(() => {})
  }, [])

  useEffect(() => {
    setProvOpts([])
    if (!selDep) return
    fetch(`/api/mapa/ubigeo/provincias?dep=${selDep}`)
      .then(r => r.ok ? r.json() : []).then(setProvOpts).catch(() => {})
  }, [selDep])

  useEffect(() => {
    setDistOpts([])
    if (!selDep || !selProv) return
    fetch(`/api/mapa/ubigeo/distritos?dep=${selDep}&prov=${selProv}`)
      .then(r => r.ok ? r.json() : []).then(setDistOpts).catch(() => {})
  }, [selDep, selProv])

  /* buscador con debounce */
  useEffect(() => {
    if (busqueda.trim().length < 2) { setResultados([]); return }
    const t = setTimeout(() => {
      fetch(`/api/mapa/ubigeo/buscar?q=${encodeURIComponent(busqueda.trim())}`)
        .then(r => r.ok ? r.json() : []).then(setResultados).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  /* ── derivados ──────────────────────────────────────────────── */
  const { cubiertosDep, cubiertosProv } = useMemo(() => {
    const cd: Record<string, number> = {}
    const cp: Record<string, number> = {}
    if (cobertura) {
      for (const ubi of Object.keys(cobertura.distritos)) {
        cd[ubi.slice(0, 2)] = (cd[ubi.slice(0, 2)] ?? 0) + 1
        cp[ubi.slice(0, 4)] = (cp[ubi.slice(0, 4)] ?? 0) + 1
      }
    }
    return { cubiertosDep: cd, cubiertosProv: cp }
  }, [cobertura])

  const institucionesCercanas = useMemo(() => {
    if (!ubicacion || !cobertura) return []
    return cobertura.instituciones
      .filter((i): i is Institucion & { lat: number; lng: number } =>
        typeof i.lat === 'number' && Number.isFinite(i.lat)
        && typeof i.lng === 'number' && Number.isFinite(i.lng))
      .map(i => ({
        ...i,
        distancia: distanciaKm(ubicacion.lat, ubicacion.lng, i.lat, i.lng),
      }))
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 5)
  }, [ubicacion, cobertura])

  /* Índices de instituciones con cobertura en el ámbito actual (precalculado
     una sola vez por cambio de selección — antes se hacía un cálculo O(n²)
     por cada render del listado, lo que congelaba la UI con ~1700 sedes) */
  const idxsCubiertos = useMemo(() => {
    const s = new Set<number>()
    if (!cobertura) return s
    const prefijo = selDist ? selDist : (selDep && selProv) ? (selDep + selProv) : selDep ?? ''
    Object.entries(cobertura.distritos).forEach(([ubi, idxs]) => {
      if (ubi.startsWith(prefijo)) idxs.forEach(ix => s.add(ix))
    })
    return s
  }, [cobertura, selDep, selProv, selDist])

  const nombreDep  = depsOpts.find(d => d.codigo === selDep)?.nombre ?? ''
  const nombreProv = provOpts.find(p => p.codigo === selProv)?.nombre ?? ''

  /* conteo de acreditación DEMUNA, opcionalmente acotado a un prefijo de ubigeo */
  const statsDemuna = useCallback((prefijo?: string) => {
    if (!cobertura) return null
    const idxs = new Set<number>()
    if (prefijo) {
      Object.entries(cobertura.distritos).forEach(([ubi, is]) => {
        if (ubi.startsWith(prefijo)) is.forEach(i => idxs.add(i))
      })
    } else {
      cobertura.instituciones.forEach((_, i) => idxs.add(i))
    }
    let acred = 0, noAcred = 0
    idxs.forEach(i => {
      const inst = cobertura.instituciones[i]
      if (!inst || inst.tipo !== 'DEMUNA') return
      if (inst.acreditacion === 'Acreditada') acred++
      else noAcred++
    })
    const total = acred + noAcred
    return { acred, noAcred, total, pct: total ? Math.round((acred / total) * 100) : 0 }
  }, [cobertura])

  /* ── navegación (única vía de cambio de selección) ──────────── */
  const irPais = useCallback(() => {
    setSelDep(null); setSelProv(null); setSelDist(null); setInstSel(null)
    setModoVisualizacion('resumen')
  }, [])
  /* Al navegar por el mapa: en escritorio abre el panel; en móvil lo deja
     como barra colapsada para no tapar el mapa (el usuario lo expande si quiere) */
  const abrirPanelTrasNavegar = useCallback(() => {
    setPanelAbierto(true)
    if (esPantallaMovil()) setAlturaPanel('min')
  }, [])

  const irDep = useCallback((dep: string) => {
    setSelDep(dep); setSelProv(null); setSelDist(null); setInstSel(null)
    abrirPanelTrasNavegar()
    setModoVisualizacion('resumen')
  }, [abrirPanelTrasNavegar])
  const irProv = useCallback((dep: string, prov: string) => {
    setSelDep(dep); setSelProv(prov); setSelDist(null); setInstSel(null)
    abrirPanelTrasNavegar()
    setModoVisualizacion('resumen')
  }, [abrirPanelTrasNavegar])
  const irDist = useCallback((codigo: string) => {
    setSelDep(codigo.slice(0, 2)); setSelProv(codigo.slice(2, 4))
    setSelDist(codigo); setInstSel(null)
    abrirPanelTrasNavegar()
    setModoVisualizacion('resumen')
  }, [abrirPanelTrasNavegar])

  const verInstitucion = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mapa/instituciones/${id}`)
      // Sesión expirada: el middleware devuelve 401 (o redirige a /login)
      if (res.status === 401 || (res.redirected && res.url.includes('/login'))) {
        toast.error('Tu sesión expiró. Vuelve a iniciar sesión.')
        window.location.href = '/login'
        return
      }
      if (!res.ok) throw new Error()
      setInstSel(await res.json())
      setPanelAbierto(true)
      if (esPantallaMovil()) setAlturaPanel('medio') // el usuario pidió ver la ficha
    } catch { toast.error('No se pudo cargar la institución') }
  }, [])

  const usarMiUbicacion = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Este dispositivo no permite obtener la ubicación')
      return
    }
    setUbicando(true)
    navigator.geolocation.getCurrentPosition(
      posicion => {
        const nuevaUbicacion = {
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
          precision: posicion.coords.accuracy,
        }
        setUbicacion(nuevaUbicacion)
        setVerSedes(true)
        setRuta(null)
        capaRutaRef.current?.clearLayers()
        mapRef.current?.setView([nuevaUbicacion.lat, nuevaUbicacion.lng], 13)
        toast.success('Ubicación encontrada')
        setUbicando(false)
      },
      error => {
        const mensaje = error.code === error.PERMISSION_DENIED
          ? 'Permite el acceso a tu ubicación para encontrar instituciones cercanas'
          : 'No se pudo determinar tu ubicación. Inténtalo nuevamente.'
        toast.error(mensaje)
        setUbicando(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }, [])

  const cerrarRuta = useCallback(() => {
    setRuta(null)
    capaRutaRef.current?.clearLayers()
  }, [])

  /* traza en el propio mapa la ruta en auto hacia una institución (sin salir de la página) */
  const trazarRuta = useCallback(async (destino: Institucion & { lat: number; lng: number }) => {
    if (!ubicacion) {
      toast.error('Primero usa tu ubicación para calcular una ruta')
      return
    }
    setTrazandoRuta(true)
    try {
      const origen = `${ubicacion.lat},${ubicacion.lng}`
      const dest   = `${destino.lat},${destino.lng}`
      const res = await fetch(`/api/mapa/ruta?origen=${origen}&destino=${dest}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Error al calcular la ruta')

      const capa = capaRutaRef.current
      capa?.clearLayers()
      const puntos = decodificarPolilinea(data.polilinea as string)
      const linea = L.polyline(puntos, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(capa!)
      L.marker([destino.lat, destino.lng], { icon: iconoPorInstitucion(destino) })
        .bindTooltip(destino.nombre, { direction: 'top' }).addTo(capa!)

      mapRef.current?.fitBounds(linea.getBounds(), { padding: [40, 40] })
      setRuta({
        destino,
        distancia: data.distancia ?? '',
        duracion: data.duracion ?? '',
        pasos: (data.pasos ?? []) as PasoRuta[],
      })
      setPanelAbierto(true)
      // En móvil la ruta se ve en la ventana superior; el panel de cobertura queda como barra
      if (esPantallaMovil()) setAlturaPanel('min')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo calcular la ruta')
    } finally {
      setTrazandoRuta(false)
    }
  }, [ubicacion])

  /* ── mapa base ──────────────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current || !divRef.current) return
    const map = L.map(divRef.current, { center: [-9.2, -75.0], zoom: 5, minZoom: 4 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18,
    }).addTo(map)
    capaSedesRef.current = L.layerGroup().addTo(map)
    capaUbicacionRef.current = L.layerGroup().addTo(map)
    capaRutaRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  /* ── ubicación actual del usuario ───────────────────────────── */
  useEffect(() => {
    const capa = capaUbicacionRef.current
    if (!capa) return
    capa.clearLayers()
    if (!ubicacion) return

    L.circle([ubicacion.lat, ubicacion.lng], {
      radius: Math.max(ubicacion.precision, 20),
      color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.12, weight: 1,
    }).addTo(capa)
    L.circleMarker([ubicacion.lat, ubicacion.lng], {
      radius: 8, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
    }).bindTooltip('Estás aquí', { permanent: false, direction: 'top' }).addTo(capa)
  }, [ubicacion])

  /* ── marcadores de sedes ────────────────────────────────────── */
  useEffect(() => {
    const capa = capaSedesRef.current
    if (!capa || !cobertura) return
    capa.clearLayers()
    if (!verSedes) return
    cobertura.instituciones
      .filter(i => i.lat != null && i.lng != null)
      .forEach(i => {
        const m = L.marker([i.lat!, i.lng!], { icon: iconoPorInstitucion(i) })
        const estado = i.tipo === 'DEMUNA'
          ? (i.acreditacion === 'Acreditada' ? ' — Acreditada' : ' — No acreditada')
          : ''
        m.bindTooltip(`${i.nombre}${estado}`, { direction: 'top' })
        m.on('click', () => verInstitucion(i.id))
        m.addTo(capa)
      })
  }, [cobertura, verSedes, verInstitucion])

  /* ── capa coroplética ───────────────────────────────────────── */
  const pintar = useCallback(async () => {
    const map = mapRef.current
    if (!map || !cobertura) return
    try {
      let geo: GeoJSON.FeatureCollection
      let codigoDe: (p: Record<string, unknown>) => string
      let filtro: (p: Record<string, unknown>) => boolean
      let estilo: (p: Record<string, unknown>) => { color: string; etiqueta: string }
      let onClick: (p: Record<string, unknown>) => void

      if (selDep && selProv) {
        geo = await cargarGeo('distritos.geojson')
        const pref = selDep + selProv
        codigoDe = p => String(p.IDDIST ?? '')
        filtro = p => codigoDe(p).startsWith(pref)
        estilo = p => {
          const ubi = codigoDe(p)
          const idxs = cobertura.distritos[ubi] ?? []
          const nombres = idxs.map(i => cobertura.instituciones[i]?.nombre).filter(Boolean)
          const color = tipoFiltro === 'DEMUNA'
            ? colorPorAcreditacionDemuna(cobertura, ubi)
            : (nombres.length ? '#3b82f6' : COLOR_SIN)
          return {
            color,
            etiqueta: nombres.length
              ? `${String(p.NOMBDIST)} — ${nombres.join(', ')}`
              : `${String(p.NOMBDIST)} — SIN COBERTURA`,
          }
        }
        onClick = p => irDist(codigoDe(p))
      } else if (selDep) {
        geo = await cargarGeo('provincias.geojson')
        codigoDe = p => String(p.FIRST_IDPR ?? '')
        filtro = p => codigoDe(p).startsWith(selDep)
        estilo = p => {
          const pp = codigoDe(p)
          const tot = cobertura.totalesProv[pp] ?? 0
          const cub = cubiertosProv[pp] ?? 0
          const pct = tot ? (cub / tot) * 100 : 0
          const color = tipoFiltro === 'DEMUNA' ? colorPorAcreditacionDemuna(cobertura, pp) : colorPorPct(pct)
          return { color, etiqueta: `${String(p.NOMBPROV)}: ${cub}/${tot} distritos cubiertos` }
        }
        onClick = p => irProv(selDep, codigoDe(p).slice(2, 4))
      } else {
        geo = await cargarGeo('departamentos.geojson')
        codigoDe = p => String(p.FIRST_IDDP ?? '')
        filtro = () => true
        estilo = p => {
          const dd = codigoDe(p)
          const tot = cobertura.totalesDep[dd] ?? 0
          const cub = cubiertosDep[dd] ?? 0
          const pct = tot ? (cub / tot) * 100 : 0
          const color = tipoFiltro === 'DEMUNA' ? colorPorAcreditacionDemuna(cobertura, dd) : colorPorPct(pct)
          return { color, etiqueta: `${String(p.NOMBDEP)}: ${cub}/${tot} distritos cubiertos` }
        }
        onClick = p => irDep(codigoDe(p))
      }

      capaGeoRef.current?.remove()
      layersRef.current = {}
      ultimoTapRef.current = null
      /* En dispositivos sin hover (táctiles) el tooltip nunca se ve con un solo
         toque, porque el tap dispara directamente el click que navega. */
      const esTactil = window.matchMedia('(hover: none)').matches
      const capa = L.geoJSON(geo, {
        filter: f => filtro((f.properties ?? {}) as Record<string, unknown>),
        style: f => {
          const props = (f?.properties ?? {}) as Record<string, unknown>
          const { color } = estilo(props)
          const esSel = selDist !== null && codigoDe(props) === selDist
          return {
            fillColor: color, fillOpacity: esSel ? 0.8 : 0.55,
            color: esSel ? '#1e3a8a' : COLOR_BORDE, weight: esSel ? 3 : 1,
          }
        },
        onEachFeature: (f, layer) => {
          const props = (f.properties ?? {}) as Record<string, unknown>
          const codigo = codigoDe(props)
          layersRef.current[codigo] = layer as L.Path
          layer.bindTooltip(estilo(props).etiqueta, { sticky: !esTactil, direction: 'top' })
          layer.on('mouseover', () => (layer as L.Path).setStyle({ weight: 2.5, fillOpacity: 0.75 }))
          layer.on('mouseout', () => {
            const esSel = selDist !== null && codigo === selDist
            ;(layer as L.Path).setStyle({ weight: esSel ? 3 : 1, fillOpacity: esSel ? 0.8 : 0.55 })
          })
          layer.on('click', () => {
            if (esTactil && ultimoTapRef.current !== codigo) {
              // Primer toque: solo mostrar la etiqueta (cobertura de la zona)
              ultimoTapRef.current = codigo
              capa.eachLayer(l => (l as L.Path).closeTooltip?.())
              layer.openTooltip()
              return
            }
            // Segundo toque en la misma zona (o escritorio): navegar
            ultimoTapRef.current = null
            onClick(props)
          })
        },
      }).addTo(map)
      capaGeoRef.current = capa

      const objetivo = selDist ? (layersRef.current[selDist] as L.Polygon | undefined) : undefined
      const bounds = objetivo?.getBounds?.() ?? capa.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16] })
      setErrorGeo(false)
    } catch { setErrorGeo(true) }
  }, [cobertura, selDep, selProv, selDist, cubiertosDep, cubiertosProv, tipoFiltro, irDep, irProv, irDist])

  useEffect(() => { pintar() }, [pintar])

  /* resaltar polígono desde el listado del panel */
  const resaltar = (codigo: string, on: boolean) => {
    const ly = layersRef.current[codigo]
    if (!ly) return
    const esSel = selDist !== null && codigo === selDist
    ly.setStyle(on
      ? { weight: 3, fillOpacity: 0.85 }
      : { weight: esSel ? 3 : 1, fillOpacity: esSel ? 0.8 : 0.55 })
  }

  /* ── resumen de tipos de servicio en ámbito actual ───────────── */
  const renderResumenPorTipos = () => {
    if (!cobertura) return null

    const prefijo = selDist ? selDist : (selDep && selProv) ? (selDep + selProv) : selDep ? selDep : ""
    
    let totalDistritosScope = 0
    if (selDep && selProv) {
      totalDistritosScope = cobertura.totalesProv[selDep + selProv] ?? 0
    } else if (selDep) {
      totalDistritosScope = cobertura.totalesDep[selDep] ?? 0
    } else {
      totalDistritosScope = Object.values(cobertura.totalesDep).reduce((a, b) => a + b, 0)
    }

    const distritosPorTipo: Record<string, Set<string>> = {}
    const instsPorTipo: Record<string, Set<string>> = {}

    Object.entries(cobertura.distritos).forEach(([ubigeo, idxs]) => {
      if (ubigeo.startsWith(prefijo)) {
        idxs.forEach(idx => {
          const inst = cobertura.instituciones[idx]
          if (inst) {
            const tipo = inst.tipo || 'Otro'
            if (!distritosPorTipo[tipo]) distritosPorTipo[tipo] = new Set()
            if (!instsPorTipo[tipo]) instsPorTipo[tipo] = new Set()
            
            distritosPorTipo[tipo].add(ubigeo)
            instsPorTipo[tipo].add(inst.id)
          }
        })
      }
    })

    const tiposDeInteres = Array.from(new Set([
      'UPE', 'DEMUNA', 'CAR', 'CEM', 
      ...Object.keys(instsPorTipo)
    ])).filter(t => instsPorTipo[t]?.size > 0)

    if (tiposDeInteres.length === 0) return null

    const getIcon = (tipo: string) => {
      switch (tipo.toUpperCase()) {
        case 'UPE': return <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        case 'DEMUNA': return <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        case 'CAR': return <Home className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
        case 'CEM': return <ShieldAlert className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400 shrink-0" />
        default: return <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
      }
    }

    return (
      <div className="border-t pt-3 mt-1 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Cobertura por Tipo de Servicio
        </p>
        <div className="grid grid-cols-1 gap-2">
          {tiposDeInteres.map(tipo => {
            const cantSedes = instsPorTipo[tipo]?.size ?? 0
            const coveredDists = distritosPorTipo[tipo]?.size ?? 0
            const pct = totalDistritosScope ? Math.round((coveredDists / totalDistritosScope) * 100) : 0
            const isSelected = tipoFiltro === tipo
            
            return (
              <div 
                key={tipo} 
                onClick={() => setTipoFiltro(isSelected ? 'todos' : tipo)}
                className={`rounded-lg border p-2.5 flex items-start gap-2.5 cursor-pointer transition-all hover:scale-[1.01] hover:bg-muted/50 ${
                  isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'bg-muted/30'
                }`}
              >
                <div className="p-1.5 rounded-md bg-white dark:bg-slate-900 border shadow-sm shrink-0">
                  {getIcon(tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{tipo}</span>
                    <span className="text-xs text-muted-foreground font-medium">{cantSedes} {cantSedes === 1 ? 'sede' : 'sedes'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between gap-1">
                    <span>Cubre: {coveredDists} de {totalDistritosScope} distritos</span>
                    <span className="font-bold text-foreground shrink-0">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded bg-gray-200 dark:bg-gray-800 mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded transition-all duration-500 ${
                        tipo === 'DEMUNA' ? 'bg-emerald-600' :
                        tipo === 'UPE' ? 'bg-indigo-600' :
                        tipo === 'CAR' ? 'bg-teal-600' :
                        tipo === 'CEM' ? 'bg-fuchsia-600' :
                        'bg-slate-500'
                      }`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ── render listado de instituciones de tipo seleccionado ────── */
  const renderListadoInstituciones = (tipo: string) => {
    if (!cobertura) return null

    let listado = cobertura.instituciones.filter((i, idx) =>
      (i.tipo || '').toUpperCase() === tipo.toUpperCase() && idxsCubiertos.has(idx))

    if (busquedaSedes.trim() !== '') {
      listado = listado.filter(i => 
        i.nombre.toLowerCase().includes(busquedaSedes.toLowerCase()) || 
        (i.direccion && i.direccion.toLowerCase().includes(busquedaSedes.toLowerCase()))
      )
    }

    return (
      <div className="border-t pt-3 mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sedes de {tipo} ({listado.length})
          </p>
          <button 
            onClick={() => setTipoFiltro('todos')} 
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Ver todos los tipos
          </button>
        </div>

        <div className="relative mt-1 mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            name="buscar-sedes" autoComplete="off"
            placeholder={`Buscar ${tipo.toLowerCase()}...`}
            value={busquedaSedes}
            onChange={(e) => setBusquedaSedes(e.target.value)}
            className="pl-8 h-9 text-xs bg-card"
          />
          {busquedaSedes && (
            <button 
              onClick={() => setBusquedaSedes('')}
              className="absolute right-2.5 top-2.5 rounded-full hover:bg-muted p-0.5"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {listado.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">
            No se encontraron sedes de este tipo en esta zona.
          </p>
        ) : (
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {listado.slice(0, maxSedes).map(i => (
              <button 
                key={i.id} 
                onClick={() => {
                  if (i.lat && i.lng) {
                    mapRef.current?.setView([i.lat, i.lng], 15)
                  }
                  verInstitucion(i.id)
                }}
                className="w-full text-left text-sm px-2.5 py-2 rounded-lg border bg-card hover:bg-muted transition-colors flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-semibold block truncate text-foreground" title={i.nombre}>
                    {simplificarNombreSede(i.nombre, i.tipo)}
                  </span>
                  {i.direccion && (
                    <span className="text-xs text-muted-foreground block truncate">{i.direccion}</span>
                  )}
                </div>
              </button>
            ))}
            {listado.length > maxSedes && (
              <Button variant="outline" size="sm" className="w-full mt-1"
                      onClick={() => setMaxSedes(m => m + 200)}>
                Mostrar más ({listado.length - maxSedes} restantes)
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ── contenido del panel ────────────────────────────────────── */
  const renderPanel = () => {
    if (!cobertura) return <p className="text-sm text-muted-foreground p-4">Cargando...</p>

    /* Ficha de institución (clic en sede) */
    if (instSel) {
      const grupos: Record<string, number> = {}
      instSel.cobertura.forEach(u => { grupos[u.slice(0, 2)] = (grupos[u.slice(0, 2)] ?? 0) + 1 })
      return (
        <div className="p-4 space-y-3">
          <button onClick={() => setInstSel(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" /> Volver
          </button>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold leading-tight">{instSel.nombre}</p>
              <span className="inline-flex gap-1.5 mt-1">
                <Badge variant="secondary">{instSel.tipo}</Badge>
                <BadgeAcreditacion valor={instSel.acreditacion} />
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setInstSel(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1.5 text-sm">
            {instSel.direccion && <p className="flex gap-2"><Home className="h-4 w-4 shrink-0 text-muted-foreground" /> {instSel.direccion}</p>}
            {instSel.telefono && <p className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-muted-foreground" /> {instSel.telefono}</p>}
            {instSel.horario && <p className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-muted-foreground" /> {instSel.horario}</p>}
          </div>
          {instSel.lat != null && instSel.lng != null && (
            ubicacion ? (
              <Button size="sm" className="w-full" disabled={trazandoRuta}
                      onClick={() => trazarRuta(instSel as InstitucionDetalle & { lat: number; lng: number })}>
                {trazandoRuta ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Navigation className="h-4 w-4 mr-1.5" />}
                Cómo llegar
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="w-full" onClick={usarMiUbicacion} disabled={ubicando}>
                <LocateFixed className="h-4 w-4 mr-1.5" /> Usar mi ubicación para trazar la ruta
              </Button>
            )
          )}
          <div className="border-t pt-3">
            <p className="text-sm font-medium mb-2">
              Cobertura: {instSel.cobertura.length} distrito{instSel.cobertura.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
              {Object.entries(grupos).sort().map(([dd, n]) => (
                <button key={dd} onClick={() => irDep(dd)}
                        className="w-full flex justify-between text-sm px-2 py-1.5 rounded hover:bg-muted text-left">
                  <span>{depsOpts.find(d => d.codigo === dd)?.nombre ?? `Dep. ${dd}`}</span>
                  <span className="text-muted-foreground">{n} distrito{n > 1 ? 's' : ''}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    /* Ficha de distrito */
    if (selDist) {
      const nombreDist = distOpts.find(d => d.codigo === selDist)?.nombre ?? selDist
      const idxs = cobertura.distritos[selDist] ?? []
      const insts = idxs.map(i => cobertura.instituciones[i]).filter(Boolean)
      return (
        <div className="p-4 space-y-3">
          <button onClick={() => setSelDist(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" /> Volver a {nombreProv}
          </button>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{nombreDep} · {nombreProv}</p>
              <p className="font-semibold">{nombreDist}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelDist(null)}><X className="h-4 w-4" /></Button>
          </div>
          {insts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Este distrito no tiene cobertura registrada
            </div>
          ) : (
            <div className="space-y-2">
              {insts.map(i => (
                <div key={i.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium leading-tight" title={i.nombre}>
                      {simplificarNombreSede(i.nombre, i.tipo)}
                    </p>
                    <span className="flex gap-1 shrink-0">
                      <Badge variant="secondary">{i.tipo}</Badge>
                      <BadgeAcreditacion valor={i.acreditacion} />
                    </span>
                  </div>
                  {i.direccion && <p className="text-xs text-muted-foreground">📍 {i.direccion}</p>}
                  {i.telefono && <p className="text-xs text-muted-foreground">📞 {i.telefono}</p>}
                  {i.horario && <p className="text-xs text-muted-foreground">🕐 {i.horario}</p>}
                  <button onClick={() => verInstitucion(i.id)} className="text-xs text-blue-600 hover:underline">
                    Ver ficha completa →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    /* Listado de distritos de la provincia */
    if (selDep && selProv) {
      const pref = selDep + selProv
      const tot = cobertura.totalesProv[pref] ?? 0
      const cub = cubiertosProv[pref] ?? 0
      const cubiertos = distOpts.filter(d => (cobertura.distritos[d.codigo] ?? []).length > 0)
      const sinCob    = distOpts.filter(d => (cobertura.distritos[d.codigo] ?? []).length === 0)
      return (
        <div className="p-4 space-y-3">
          <button onClick={() => irDep(selDep)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" /> Volver a {nombreDep}
          </button>
          <div>
            <p className="text-xs text-muted-foreground">{nombreDep}</p>
            <p className="font-semibold">Provincia {nombreProv}</p>
            <Badge className={cub === tot ? 'bg-green-600 mt-1' : cub > 0 ? 'bg-blue-600 mt-1' : 'bg-gray-400 mt-1'}>
              {cub}/{tot} distritos cubiertos ({tot ? Math.round((cub / tot) * 100) : 0}%)
            </Badge>
          </div>

          {modoVisualizacion === 'resumen' ? (
            <>
              {renderResumenPorTipos()}
              {tipoFiltro !== 'todos' && renderListadoInstituciones(tipoFiltro)}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2" 
                onClick={() => setModoVisualizacion('geografia')}
              >
                Ver por distritos <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Listado por Distritos</span>
                <button 
                  onClick={() => setModoVisualizacion('resumen')} 
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Volver al resumen
                </button>
              </div>
              {tipoFiltro === 'DEMUNA' && <KpiAcreditacionDemuna stats={statsDemuna(selDep + selProv)} />}
              {cubiertos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Con cobertura ({cubiertos.length})
                  </p>
                  <div className="space-y-0.5">
                    {cubiertos.map(d => {
                      const nombres = (cobertura.distritos[d.codigo] ?? [])
                        .map(i => cobertura.instituciones[i]?.nombre).filter(Boolean)
                      return (
                        <button key={d.codigo} onClick={() => irDist(d.codigo)}
                                onMouseEnter={() => resaltar(d.codigo, true)}
                                onMouseLeave={() => resaltar(d.codigo, false)}
                                className="w-full text-left text-sm px-2 py-1 rounded hover:bg-muted">
                          <span className="font-medium">{d.nombre}</span>
                          <span className="block text-xs text-muted-foreground truncate">{nombres.join(', ')}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {sinCob.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Sin cobertura ({sinCob.length})
                  </p>
                  <div className="space-y-0.5">
                    {sinCob.map(d => (
                      <button key={d.codigo} onClick={() => irDist(d.codigo)}
                              onMouseEnter={() => resaltar(d.codigo, true)}
                              onMouseLeave={() => resaltar(d.codigo, false)}
                              className="w-full text-left text-sm px-2 py-1 rounded hover:bg-muted text-muted-foreground">
                        {d.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    /* Listado de provincias del departamento */
    if (selDep) {
      const tot = cobertura.totalesDep[selDep] ?? 0
      const cub = cubiertosDep[selDep] ?? 0
      return (
        <div className="p-4 space-y-3">
          <button onClick={irPais}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" /> Volver a Perú
          </button>
          <div>
            <p className="font-semibold">Departamento {nombreDep}</p>
            <Badge className={cub === tot ? 'bg-green-600 mt-1' : cub > 0 ? 'bg-blue-600 mt-1' : 'bg-gray-400 mt-1'}>
              {cub}/{tot} distritos cubiertos ({tot ? Math.round((cub / tot) * 100) : 0}%)
            </Badge>
          </div>

          {modoVisualizacion === 'resumen' ? (
            <>
              {renderResumenPorTipos()}
              {tipoFiltro !== 'todos' && renderListadoInstituciones(tipoFiltro)}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2" 
                onClick={() => setModoVisualizacion('geografia')}
              >
                Ver por provincias <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Listado por Provincias</span>
                <button 
                  onClick={() => setModoVisualizacion('resumen')} 
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Volver al resumen
                </button>
              </div>
              {tipoFiltro === 'DEMUNA' && <KpiAcreditacionDemuna stats={statsDemuna(selDep)} />}
              <div className="space-y-1">
                {provOpts.map(p => {
                  const pp = selDep + p.codigo
                  const t = cobertura.totalesProv[pp] ?? 0
                  const c = cubiertosProv[pp] ?? 0
                  const pct = t ? (c / t) * 100 : 0
                  return (
                    <button key={p.codigo} onClick={() => irProv(selDep, p.codigo)}
                            onMouseEnter={() => resaltar(pp, true)}
                            onMouseLeave={() => resaltar(pp, false)}
                            className="w-full text-left px-2 py-2.5 sm:py-1.5 rounded hover:bg-muted">
                      <span className="flex justify-between text-sm">
                        <span className="font-medium">{p.nombre}</span>
                        <span className="text-muted-foreground">{c}/{t}</span>
                      </span>
                      <span className="block h-1.5 mt-1 rounded bg-gray-200 overflow-hidden">
                        <span className="block h-full rounded" style={{ width: `${pct}%`, background: colorPorPct(pct) }} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )
    }

    /* Resumen nacional */
    const totalNac = Object.values(cobertura.totalesDep).reduce((a, b) => a + b, 0)
    const cubNac   = Object.keys(cobertura.distritos).length
    return (
      <div className="p-4 space-y-3">
        <div>
          <p className="font-semibold">Perú — cobertura nacional</p>
          <Badge className="bg-blue-600 mt-1">
            {cubNac}/{totalNac} distritos cubiertos ({totalNac ? Math.round((cubNac / totalNac) * 100) : 0}%)
          </Badge>
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> {cobertura.instituciones.length} instituciones activas
          </p>
        </div>

        {modoVisualizacion === 'resumen' ? (
          <>
            {renderResumenPorTipos()}
            {tipoFiltro !== 'todos' && renderListadoInstituciones(tipoFiltro)}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2" 
              onClick={() => setModoVisualizacion('geografia')}
            >
              Ver por departamentos <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Listado por Departamentos</span>
              <button 
                onClick={() => setModoVisualizacion('resumen')} 
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Volver al resumen
              </button>
            </div>
            {tipoFiltro === 'DEMUNA' && <KpiAcreditacionDemuna stats={statsDemuna()} />}
            <div className="space-y-1">
              {depsOpts.map(d => {
                const t = cobertura.totalesDep[d.codigo] ?? 0
                const c = cubiertosDep[d.codigo] ?? 0
                const pct = t ? (c / t) * 100 : 0
                return (
                  <button key={d.codigo} onClick={() => irDep(d.codigo)}
                          onMouseEnter={() => resaltar(d.codigo, true)}
                          onMouseLeave={() => resaltar(d.codigo, false)}
                          className="w-full text-left px-2 py-2.5 sm:py-1.5 rounded hover:bg-muted">
                    <span className="flex justify-between text-sm">
                      <span className="font-medium">{d.nombre}</span>
                      <span className="text-muted-foreground">{c}/{t}</span>
                    </span>
                    <span className="block h-1.5 mt-1 rounded bg-gray-200 overflow-hidden">
                      <span className="block h-full rounded" style={{ width: `${pct}%`, background: colorPorPct(pct) }} />
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  /* Ruta activa: instrucciones paso a paso, dentro del mismo panel */
  const renderRuta = () => {
    if (!ruta) return null
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b bg-blue-50/60 dark:bg-blue-950/30 space-y-2">
          <button onClick={cerrarRuta}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1.5 -my-1.5 sm:py-0 sm:my-0">
            <ChevronLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Cerrar ruta
          </button>
          <p className="text-sm font-semibold leading-tight">{ruta.destino.nombre}</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-semibold text-blue-700">
              <Navigation className="h-4 w-4" /> {ruta.distancia}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {ruta.duracion}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {ruta.pasos.map((p, idx) => (
            <div key={idx} className="flex gap-2.5 text-sm">
              <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold flex items-center justify-center">
                {idx + 1}
              </span>
              <div className="border-b pb-2.5 flex-1">
                <p className="leading-snug">{p.instruccion}</p>
                {p.distancia && <p className="text-xs text-muted-foreground mt-0.5">{p.distancia}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* Instituciones más cercanas: lista compacta, siempre visible en el panel mientras haya ubicación */
  const renderCercanos = () => (
    <div className="border-b bg-blue-50/40 dark:bg-blue-950/20">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-300 flex items-center gap-1">
          <LocateFixed className="h-3.5 w-3.5" /> Cerca de ti
        </p>
        <button onClick={() => setUbicacion(null)} className="p-2 -m-1 sm:p-0.5 sm:m-0 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                title="Ocultar ubicación">
          <X className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
        </button>
      </div>
      {institucionesCercanas.length > 0 ? (
        <div className="px-2 pb-2 space-y-0.5">
          {institucionesCercanas.map(i => (
            <div key={i.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-white/70 dark:hover:bg-white/5">
              <button className="flex-1 min-w-0 text-left" title="Ver ficha"
                      onClick={() => { mapRef.current?.setView([i.lat, i.lng], 16); verInstitucion(i.id) }}>
                <span className="block text-sm font-medium truncate" title={i.nombre}>
                  {simplificarNombreSede(i.nombre, i.tipo)}
                </span>
                <span className="block text-xs text-muted-foreground truncate">
                  {textoDistancia(i.distancia)} · {i.tipo}{i.direccion ? ` · ${i.direccion}` : ''}
                </span>
              </button>
              <button className="shrink-0 p-2.5 sm:p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                      title="Cómo llegar" disabled={trazandoRuta} onClick={() => trazarRuta(i)}>
                {trazandoRuta
                  ? <Loader2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-spin" />
                  : <Navigation className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-3 pb-2.5 text-xs text-muted-foreground">
          No hay instituciones con coordenadas registradas cerca de ti.
        </p>
      )}
    </div>
  )

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── Barra de controles ──
          Móvil (<640px): buscador + botón "Filtros" (drawer inferior).
          Escritorio: combos + buscador + filtros en línea. */}
      <div className="flex items-center gap-2 sm:hidden">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 w-full h-11" placeholder="Buscar distrito..." value={busqueda}
                 name="buscar-distrito-movil" autoComplete="off"
                 onChange={e => setBusqueda(e.target.value)} />
          {resultados.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-[min(18rem,90vw)] bg-card border rounded-lg shadow-lg z-[1200] max-h-64 overflow-y-auto">
              {resultados.map(r => (
                <button key={r.codigo}
                        onClick={() => { irDist(r.codigo); setBusqueda(''); setResultados([]) }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm border-b last:border-0">
                  <span className="font-medium">{r.nombre}</span>
                  <span className="block text-xs text-muted-foreground">{r.depNombre} · {r.provNombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" className="h-11 shrink-0 relative px-3"
                onClick={() => setFiltrosAbiertos(true)}>
          <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Filtros
          {(selDep || tipoFiltro !== 'todos') && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600" />
          )}
        </Button>
      </div>

      <div className="hidden sm:flex flex-wrap items-center gap-2">
        <Select value={selDep ?? 'todos'}
                onValueChange={v => v === 'todos' ? irPais() : irDep(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Departamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">— Todo el Perú —</SelectItem>
            {depsOpts.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selProv ?? 'todas'} disabled={!selDep}
                onValueChange={v => selDep && (v === 'todas' ? irDep(selDep) : irProv(selDep, v))}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Provincia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">— Todas —</SelectItem>
            {provOpts.map(p => <SelectItem key={p.codigo} value={p.codigo}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selDist ?? 'todos'} disabled={!selProv}
                onValueChange={v => v === 'todos' ? (selDep && selProv && irProv(selDep, selProv)) : irDist(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Distrito" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">— Todos —</SelectItem>
            {distOpts.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Buscador de distritos */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 w-56" placeholder="Buscar distrito..." value={busqueda}
                 name="buscar-distrito" autoComplete="off"
                 onChange={e => setBusqueda(e.target.value)} />
          {resultados.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-[min(18rem,90vw)] bg-card border rounded-lg shadow-lg z-[1200] max-h-64 overflow-y-auto">
              {resultados.map(r => (
                <button key={r.codigo}
                        onClick={() => { irDist(r.codigo); setBusqueda(''); setResultados([]) }}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0">
                  <span className="font-medium">{r.nombre}</span>
                  <span className="block text-xs text-muted-foreground">{r.depNombre} · {r.provNombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent className="z-[1200]">
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={verSedes ? 'default' : 'outline'} size="sm" onClick={() => setVerSedes(v => !v)}>
            <MapPin className="h-4 w-4 mr-1" /> Sedes
          </Button>
          <Button variant={ubicacion ? 'default' : 'outline'} size="sm"
                  onClick={usarMiUbicacion} disabled={ubicando}>
            {ubicando
              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              : <LocateFixed className="h-4 w-4 mr-1" />}
            {ubicando ? 'Ubicando...' : ubicacion ? 'Actualizar ubicación' : 'Usar mi ubicación'}
          </Button>
        </div>
      </div>

      {/* Drawer inferior de filtros (solo móvil) */}
      {filtrosAbiertos && (
        <div className="fixed inset-0 z-[1300] sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltrosAbiertos(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-card rounded-t-2xl shadow-2xl
                          max-h-[85dvh] overflow-y-auto p-4 space-y-3
                          pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center justify-between">
              <p className="font-semibold">Filtros del mapa</p>
              <button onClick={() => setFiltrosAbiertos(false)} className="p-2 -m-2 rounded hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Departamento</p>
              <Select value={selDep ?? 'todos'}
                      onValueChange={v => v === 'todos' ? irPais() : irDep(v)}>
                <SelectTrigger className="w-full h-11"><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent className="z-[1400]">
                  <SelectItem value="todos">— Todo el Perú —</SelectItem>
                  {depsOpts.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Provincia</p>
              <Select value={selProv ?? 'todas'} disabled={!selDep}
                      onValueChange={v => selDep && (v === 'todas' ? irDep(selDep) : irProv(selDep, v))}>
                <SelectTrigger className="w-full h-11"><SelectValue placeholder="Provincia" /></SelectTrigger>
                <SelectContent className="z-[1400]">
                  <SelectItem value="todas">— Todas —</SelectItem>
                  {provOpts.map(p => <SelectItem key={p.codigo} value={p.codigo}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Distrito</p>
              <Select value={selDist ?? 'todos'} disabled={!selProv}
                      onValueChange={v => v === 'todos' ? (selDep && selProv && irProv(selDep, selProv)) : irDist(v)}>
                <SelectTrigger className="w-full h-11"><SelectValue placeholder="Distrito" /></SelectTrigger>
                <SelectContent className="z-[1400]">
                  <SelectItem value="todos">— Todos —</SelectItem>
                  {distOpts.map(d => <SelectItem key={d.codigo} value={d.codigo}>{d.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tipo de institución</p>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger className="w-full h-11"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent className="z-[1400]">
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-11"
                      onClick={() => { irPais(); setTipoFiltro('todos') }}>
                Limpiar
              </Button>
              <Button className="flex-1 h-11" onClick={() => setFiltrosAbiertos(false)}>
                Ver mapa
              </Button>
            </div>
          </div>
        </div>
      )}

      {errorGeo && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-800">
            No se encontraron los límites geográficos (<code>frontend/public/geo/</code>).
            Ejecuta una sola vez: <code className="font-semibold">npm run descargar-geo</code> dentro
            de la carpeta <code>frontend</code> y recarga la página.
          </CardContent>
        </Card>
      )}

      {/* Breadcrumb de navegación: Perú › Departamento › Provincia › Distrito */}
      {selDep && (
        <nav aria-label="Nivel del mapa"
             className="inline-flex items-center gap-1 text-sm flex-wrap
                        rounded-full border border-blue-200 dark:border-blue-900
                        bg-blue-50 dark:bg-blue-950/40 shadow-sm px-2 py-1.5">
          <button onClick={irPais}
                  className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full
                             text-blue-700 dark:text-blue-300 font-medium underline underline-offset-2 decoration-blue-300
                             hover:bg-blue-100 dark:hover:bg-blue-900 hover:no-underline transition-colors"
                  title="Volver a la vista nacional">
            <Home className="h-3.5 w-3.5" /> Perú
          </button>
          <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />
          {selProv ? (
            <button onClick={() => irDep(selDep)}
                    className="px-2.5 py-1 rounded-full text-blue-700 dark:text-blue-300 font-medium
                               underline underline-offset-2 decoration-blue-300
                               hover:bg-blue-100 dark:hover:bg-blue-900 hover:no-underline transition-colors"
                    title={`Volver a ${nombreDep}`}>
              {nombreDep || 'Departamento'}
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-semibold shadow-sm">
              {nombreDep || 'Departamento'}
            </span>
          )}
          {selProv && (
            <>
              <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />
              {selDist ? (
                <button onClick={() => irProv(selDep, selProv)}
                        className="px-2.5 py-1 rounded-full text-blue-700 dark:text-blue-300 font-medium
                                   underline underline-offset-2 decoration-blue-300
                                   hover:bg-blue-100 dark:hover:bg-blue-900 hover:no-underline transition-colors"
                        title={`Volver a ${nombreProv}`}>
                  {nombreProv || 'Provincia'}
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-semibold shadow-sm">
                  {nombreProv || 'Provincia'}
                </span>
              )}
            </>
          )}
          {selDist && (
            <>
              <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-semibold shadow-sm">
                {distOpts.find(d => d.codigo === selDist)?.nombre ?? 'Distrito'}
              </span>
            </>
          )}
        </nav>
      )}

      {/* Mapa + panel flotante (el mapa nunca cambia de tamaño) */}
      <div className="relative">
        <div ref={divRef} className="w-full rounded-lg border z-0 h-[calc(100dvh-16rem)] min-h-[340px] sm:h-[70vh]" />

        {/* Botones flotantes (solo móvil): mi ubicación y sedes.
            Se ocultan cuando el panel de cobertura está expandido para no taparlo. */}
        <div className={`absolute right-3 bottom-20 z-[1001] flex-col gap-2 sm:hidden
                         ${panelAbierto && alturaPanel !== 'min' ? 'hidden' : 'flex'}`}>
          <button onClick={usarMiUbicacion} disabled={ubicando} title="Usar mi ubicación"
                  className={`w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-colors
                              ${ubicacion ? 'bg-blue-600 border-blue-600 text-white' : 'bg-card text-foreground'}`}>
            {ubicando ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
          </button>
          <button onClick={() => setVerSedes(v => !v)} title="Mostrar/ocultar sedes"
                  className={`w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-colors
                              ${verSedes ? 'bg-blue-600 border-blue-600 text-white' : 'bg-card text-foreground'}`}>
            <MapPin className="h-5 w-5" />
          </button>
        </div>

        {/* Resumen de ruta activa: solo cuando el panel está cerrado (si está abierto, ya se ve completo en la ventana derecha) */}
        {ruta && !panelAbierto && (
          <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-card/95 backdrop-blur
                          border rounded-full shadow-xl pl-3 pr-1.5 py-1.5 text-sm max-w-[calc(100%-1.5rem)]">
            <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-semibold whitespace-nowrap">{ruta.distancia}</span>
            <span className="text-muted-foreground whitespace-nowrap">· {ruta.duracion}</span>
            <span className="text-muted-foreground truncate hidden sm:inline">a {ruta.destino.nombre}</span>
            <button onClick={cerrarRuta} className="shrink-0 p-1 rounded-full hover:bg-muted" title="Cerrar ruta">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {panelAbierto ? (
          <>
            {/* Escritorio — ventana izquierda: SIEMPRE cobertura */}
            <div className="absolute z-[1000] hidden sm:flex flex-col
                            sm:top-3 sm:left-3 sm:bottom-3 sm:w-80
                            bg-card/95 backdrop-blur border rounded-lg shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Detalle de cobertura
                </p>
                <button onClick={() => setPanelAbierto(false)}
                        className="p-1 rounded hover:bg-muted" title="Ocultar panel">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{renderPanel()}</div>
            </div>

            {/* Móvil — bottom sheet deslizable con 3 alturas (min/medio/max) */}
            <div className={`absolute z-[1000] flex flex-col sm:hidden inset-x-2 bottom-2
                             bg-card/95 backdrop-blur border rounded-lg shadow-xl overflow-hidden
                             transition-[height] duration-200 max-h-[calc(100%-0.75rem)]
                             ${alturaPanel === 'min' ? 'h-14' : alturaPanel === 'medio' ? 'h-[42dvh]' : 'h-[78dvh]'}`}>
              <div className="shrink-0 select-none touch-none cursor-grab"
                   onTouchStart={onTouchStartPanel} onTouchEnd={onTouchEndPanel}
                   onClick={() => setAlturaPanel(a => a === 'min' ? 'medio' : a === 'medio' ? 'max' : 'min')}>
                <div className="mx-auto mt-1.5 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
                <div className="flex items-center justify-between px-3 py-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Detalle de cobertura
                  </p>
                  <button onClick={e => { e.stopPropagation(); setPanelAbierto(false) }}
                          className="p-2 -m-1 rounded hover:bg-muted" title="Ocultar panel">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {alturaPanel !== 'min' && (
                <div className="flex-1 overflow-y-auto overscroll-contain border-t">{renderPanel()}</div>
              )}
            </div>

            {/* Ventana derecha: todo lo relacionado a "mi ubicación" — cercanos y cómo llegar */}
            {ubicacion && (
              <>
                <div className="absolute z-[1000] hidden sm:flex flex-col
                                sm:top-3 sm:right-3 sm:w-80 sm:max-h-[70vh]
                                bg-card/95 backdrop-blur border rounded-lg shadow-xl overflow-hidden">
                  <div className="flex-1 overflow-y-auto">{ruta ? renderRuta() : renderCercanos()}</div>
                </div>
                <div className="absolute z-[1000] flex sm:hidden flex-col
                                inset-x-2 top-2 max-h-[32dvh]
                                bg-card/95 backdrop-blur border rounded-lg shadow-xl overflow-hidden">
                  <div className="flex-1 overflow-y-auto overscroll-contain">{ruta ? renderRuta() : renderCercanos()}</div>
                </div>
              </>
            )}
          </>
        ) : (
          <button onClick={() => { setPanelAbierto(true); if (esPantallaMovil()) setAlturaPanel('medio') }}
                  className="absolute top-3 left-3 z-[1000] bg-card border rounded-lg shadow-xl
                             flex items-center gap-1.5 px-3 py-2.5 sm:p-2 hover:bg-muted text-sm font-medium"
                  title="Mostrar panel de cobertura">
            <Building2 className="h-5 w-5 sm:hidden" />
            <span className="sm:hidden">Cobertura</span>
            <ChevronRight className="hidden sm:block h-4 w-4" />
          </button>
        )}
      </div>

      {/* Leyenda (colapsable en móvil, siempre visible en escritorio) */}
      <div className="border rounded-lg sm:border-0 sm:rounded-none">
        <button type="button"
                className="sm:hidden w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-muted-foreground"
                onClick={() => setLeyendaAbierta(v => !v)}>
          Leyenda del mapa
          <ChevronRight className={`h-4 w-4 transition-transform ${leyendaAbierta ? 'rotate-90' : ''}`} />
        </button>
        <div className={`${leyendaAbierta ? 'flex' : 'hidden'} sm:flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground px-3 pb-3 sm:px-0 sm:pb-0`}>
        {tipoFiltro === 'DEMUNA' ? (
          <>
            <span className="font-medium">% DEMUNA acreditadas:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-3 rounded-sm border" style={{ background: COLOR_SIN }} /> Sin cobertura
            </span>
            {[['0–24 %', '#E24B4A'], ['25–49 %', '#EF9F27'], ['50–74 %', '#FAC775'],
              ['75–99 %', '#97C459'], ['100 %', '#639922']].map(([lbl, c]) => (
              <span key={lbl} className="flex items-center gap-1">
                <span className="inline-block w-4 h-3 rounded-sm border" style={{ background: c }} /> {lbl}
              </span>
            ))}
          </>
        ) : (
          <>
            <span className="font-medium">Cobertura de distritos:</span>
            {[['0 %', COLOR_SIN], ['1–24 %', '#fde68a'], ['25–49 %', '#fbbf24'],
              ['50–74 %', '#60a5fa'], ['75–99 %', '#3b82f6'], ['100 %', '#1d4ed8']].map(([lbl, c]) => (
              <span key={lbl} className="flex items-center gap-1">
                <span className="inline-block w-4 h-3 rounded-sm border" style={{ background: c }} /> {lbl}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#4f46e5] border border-white" /> UPE
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#0d9488] border border-white" /> CAR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#10b981] border border-white" /> DEMUNA Acreditada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#f59e0b] border border-white" /> DEMUNA No Acred
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#d946ef] border border-white" /> CEM
            </span>
          </>
        )}
        </div>
      </div>
    </div>
  )
}

