import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

interface PasoGoogle {
  html_instructions?: string
  distance?: { text?: string }
}
interface RespuestaDirections {
  status: string
  error_message?: string
  routes: Array<{
    overview_polyline: { points: string }
    legs: Array<{
      distance?: { text?: string }
      duration?: { text?: string }
      steps: PasoGoogle[]
    }>
  }>
}

/**
 * Calcula una ruta en auto entre dos puntos usando Google Directions.
 * Se resuelve en el servidor (no en el navegador) porque la Directions API
 * no responde con cabeceras CORS para llamadas hechas desde el cliente.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origen  = searchParams.get('origen')
  const destino = searchParams.get('destino')

  if (!origen || !destino) {
    return NextResponse.json({ error: 'Faltan los parámetros origen y destino' }, { status: 400 })
  }
  if (!GOOGLE_KEY) {
    return NextResponse.json({ error: 'No hay una clave de Google Maps configurada' }, { status: 500 })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json`
      + `?origin=${encodeURIComponent(origen)}&destination=${encodeURIComponent(destino)}`
      + `&mode=driving&language=es&region=pe&key=${GOOGLE_KEY}`
    const res = await fetch(url)
    const data = await res.json() as RespuestaDirections

    if (data.status !== 'OK' || !data.routes[0]) {
      const mensaje = data.status === 'ZERO_RESULTS'
        ? 'No se encontró una ruta hacia ese destino'
        : (data.error_message ?? 'No se pudo calcular la ruta')
      return NextResponse.json({ error: mensaje }, { status: 404 })
    }

    const ruta = data.routes[0]
    const leg  = ruta.legs[0]
    return NextResponse.json({
      distancia: leg.distance?.text ?? '',
      duracion: leg.duration?.text ?? '',
      polilinea: ruta.overview_polyline.points,
      pasos: leg.steps.map(s => ({
        instruccion: (s.html_instructions ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        distancia: s.distance?.text ?? '',
      })),
    })
  } catch (error) {
    console.error('Error al pedir ruta a Google Directions:', error)
    return NextResponse.json({ error: 'Error de conexión al calcular la ruta' }, { status: 503 })
  }
}
