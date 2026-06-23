'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Inbox, Clock, CheckCircle, AlertTriangle, Timer, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { toast } from 'sonner'
import { useMe } from '@/lib/use-me'
import type { TransparenciaDashboard } from '@/types'

// Paleta de colores para gráficos de barras simples
const COLORES_DIR = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981']
const COLORES_CAT = ['#06b6d4','#f97316','#84cc16','#e879f9','#fb7185','#34d399']

function BarraHorizontal({
  label, valor, total, color,
}: { label: string; valor: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium truncate max-w-[60%]">{label}</span>
        <span className="text-muted-foreground">{valor} ({pct}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function TransparenciaDashboardPage() {
  const router = useRouter()
  const { me, meLoading, hasAccess } = useMe() as any
  const [data, setData]       = useState<TransparenciaDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!meLoading && me && !hasAccess('transparencia')) router.replace('/menu')
  }, [me, meLoading, hasAccess, router])

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/transparencia/dashboard')
      const json = await res.json()
      if (!res.ok) { toast.error('Error al cargar dashboard'); return }
      setData(json)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )

  const stats = [
    {
      label:   'Total Pedidos',
      valor:   data?.total ?? 0,
      icon:    <Inbox className="h-5 w-5" />,
      color:   'text-blue-600',
      bg:      'bg-blue-50',
    },
    {
      label:   'Pendientes',
      valor:   data?.pendientes ?? 0,
      icon:    <Clock className="h-5 w-5" />,
      color:   'text-amber-600',
      bg:      'bg-amber-50',
    },
    {
      label:   'En Proceso',
      valor:   data?.enProceso ?? 0,
      icon:    <Timer className="h-5 w-5" />,
      color:   'text-purple-600',
      bg:      'bg-purple-50',
    },
    {
      label:   'Atendidos',
      valor:   data?.atendidos ?? 0,
      icon:    <CheckCircle className="h-5 w-5" />,
      color:   'text-green-600',
      bg:      'bg-green-50',
    },
    {
      label:   'Vencidos',
      valor:   data?.vencidos ?? 0,
      icon:    <AlertTriangle className="h-5 w-5" />,
      color:   'text-red-600',
      bg:      'bg-red-50',
    },
    {
      label:   'Próximos a vencer (≤3d)',
      valor:   data?.proximosVencer ?? 0,
      icon:    <AlertTriangle className="h-5 w-5" />,
      color:   'text-orange-600',
      bg:      'bg-orange-50',
    },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen">

        <header className="border-b bg-card sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center gap-4">
            <Link href="/transparencia">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Bandeja
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Dashboard — Transparencia</h1>
              <p className="text-muted-foreground text-sm">Resumen de pedidos de información</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboard} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Actualizar
            </Button>
          </div>
        </header>

        <main className="px-6 py-6 space-y-6">

          {/* Cards de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map(s => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-4">
                  <div className={`inline-flex p-2 rounded-lg ${s.bg} ${s.color} mb-3`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-bold">{s.valor}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Por Dirección */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos por Dirección</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.porDireccion && data.porDireccion.length > 0
                  ? data.porDireccion
                      .sort((a, b) => b.cantidad - a.cantidad)
                      .map((item, i) => (
                        <BarraHorizontal
                          key={item.nombre}
                          label={item.nombre}
                          valor={item.cantidad}
                          total={data.total}
                          color={COLORES_DIR[i % COLORES_DIR.length]}
                        />
                      ))
                  : <p className="text-sm text-muted-foreground">Sin datos</p>
                }
              </CardContent>
            </Card>

            {/* Por Categoría */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos por Categoría</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.porCategoria && data.porCategoria.length > 0
                  ? data.porCategoria
                      .sort((a, b) => b.cantidad - a.cantidad)
                      .map((item, i) => (
                        <BarraHorizontal
                          key={item.nombre}
                          label={item.nombre}
                          valor={item.cantidad}
                          total={data.total}
                          color={COLORES_CAT[i % COLORES_CAT.length]}
                        />
                      ))
                  : <p className="text-sm text-muted-foreground">Sin datos</p>
                }
              </CardContent>
            </Card>

          </div>

          {/* Alerta resumen */}
          {(data?.vencidos ?? 0) > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 pt-5">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">
                    {data!.vencidos} pedido(s) con plazo vencido
                  </p>
                  <p className="text-sm text-red-700">
                    Revisar la bandeja y actualizar su estado o documento de respuesta.
                  </p>
                </div>
                <Link href="/transparencia?estado=Pendiente" className="ml-auto">
                  <Button variant="destructive" size="sm">Ver pendientes</Button>
                </Link>
              </CardContent>
            </Card>
          )}

        </main>
      </div>
    </div>
  )
}
