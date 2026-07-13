'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Search } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { google: any }
}

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
const CENTRO_PERU = { lat: -9.19, lng: -75.0152 }

let cargandoScript: Promise<void> | null = null
function cargarGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve()
  if (cargandoScript) return cargandoScript
  cargandoScript = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&loading=async`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'))
    document.head.appendChild(script)
  })
  return cargandoScript
}

interface Props {
  lat: number | null
  lng: number | null
  direccion?: string
  onCerrar: () => void
  onConfirmar: (lat: number, lng: number) => void
}

export default function SelectorMapaGoogle({ lat, lng, direccion, onCerrar, onConfirmar }: Props) {
  const divRef    = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [cargado, setCargado] = useState(false)
  const [error, setError]     = useState(false)
  const [busqueda, setBusqueda] = useState(direccion ?? '')
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null
  )

  const buscarDireccion = async () => {
    if (!busqueda.trim() || !GOOGLE_KEY) return
    setBuscando(true); setErrorBusqueda('')
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?region=pe&address=${encodeURIComponent(busqueda)}&key=${GOOGLE_KEY}`
      const res = await fetch(url)
      const data = await res.json()
      const resultado = data.results?.[0]
      if (!resultado) { setErrorBusqueda('No se encontró esa dirección'); return }
      const p = { lat: resultado.geometry.location.lat, lng: resultado.geometry.location.lng }
      setSeleccion(p)
      if (mapObjRef.current && markerRef.current) {
        mapObjRef.current.setCenter(p)
        mapObjRef.current.setZoom(17)
        markerRef.current.setPosition(p)
        markerRef.current.setVisible(true)
      }
    } catch {
      setErrorBusqueda('Error al buscar la dirección')
    } finally { setBuscando(false) }
  }

  useEffect(() => {
    let cancelado = false
    if (!GOOGLE_KEY) { setError(true); return }
    cargarGoogleMaps().then(() => {
      if (cancelado || !divRef.current) return
      const inicial = lat != null && lng != null ? { lat, lng } : CENTRO_PERU
      const map = new window.google.maps.Map(divRef.current, {
        center: inicial, zoom: lat != null && lng != null ? 15 : 5,
      })
      const marker = new window.google.maps.Marker({
        position: inicial, map, draggable: true,
        visible: lat != null && lng != null,
      })
      map.addListener('click', (e: any) => {
        const p = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        marker.setPosition(p); marker.setVisible(true)
        setSeleccion(p)
      })
      marker.addListener('dragend', () => {
        const p = marker.getPosition()
        setSeleccion({ lat: p.lat(), lng: p.lng() })
      })
      mapObjRef.current = map
      markerRef.current = marker
      setCargado(true)
    }).catch(() => setError(true))
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <p className="font-medium">Ubicar en el mapa</p>
          <Button variant="ghost" size="icon" onClick={onCerrar}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={busqueda} placeholder="Dirección a buscar..."
                   onChange={e => setBusqueda(e.target.value)}
                   onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarDireccion() } }} />
            <Button type="button" variant="outline" disabled={buscando || !cargado}
                    onClick={buscarDireccion} className="shrink-0">
              <Search className="h-4 w-4 mr-1" /> {buscando ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          {errorBusqueda && <p className="text-xs text-amber-700">{errorBusqueda}</p>}
          {error && (
            <p className="text-sm text-red-600">
              No se pudo cargar Google Maps. Verificá que la API key sea válida y que
              &quot;Maps JavaScript API&quot; esté habilitada en tu proyecto de Google Cloud.
            </p>
          )}
          {!cargado && !error && (
            <p className="text-sm text-muted-foreground">Cargando mapa...</p>
          )}
          <div ref={divRef} className="w-full rounded border h-[260px] sm:h-[420px]"
               style={{ display: error ? 'none' : 'block' }} />
          <p className="text-xs text-muted-foreground">
            Hacé clic en el mapa para marcar la ubicación exacta. Podés arrastrar el marcador para ajustarla.
          </p>
          {seleccion && (
            <p className="text-sm">
              Lat: <span className="font-mono">{seleccion.lat.toFixed(6)}</span>
              {'   '}
              Lng: <span className="font-mono">{seleccion.lng.toFixed(6)}</span>
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t shrink-0">
          <Button variant="outline" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={!seleccion}
                  onClick={() => seleccion && onConfirmar(seleccion.lat, seleccion.lng)}>
            Usar esta ubicación
          </Button>
        </div>
      </div>
    </div>
  )
}
