'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AppSidebar } from '@/components/app-sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMe } from '@/lib/use-me'
import Mantenedor from './Mantenedor'

// Leaflet solo funciona en el navegador (sin SSR)
const MapaCobertura = dynamic(() => import('./MapaCobertura'), {
  ssr: false,
  loading: () => (
    <div className="h-[55vh] sm:h-[70vh] flex items-center justify-center text-muted-foreground">
      Cargando mapa...
    </div>
  ),
})

export default function MapaPage() {
  const router = useRouter()
  const { me, loading, hasAccess, canWrite } = useMe()

  useEffect(() => {
    if (!loading && me && !hasAccess('mapa')) router.replace('/menu')
  }, [me, loading, hasAccess, router])

  if (loading || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen">

        <header className="border-b bg-card sticky top-0 z-30">
          <div className="px-3 sm:px-6 py-3 sm:py-4">
            <h1 className="text-xl sm:text-2xl font-bold">Mapa Interactivo</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Cobertura territorial de instituciones (UPE, CAR, DEMUNA, etc.) por departamento, provincia y distrito
            </p>
          </div>
        </header>

        <main className="px-3 sm:px-6 py-4 sm:py-6">
          <Tabs defaultValue="mapa">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="mapa">Mapa de cobertura</TabsTrigger>
              <TabsTrigger value="mantenedor">Mantenedor de instituciones</TabsTrigger>
            </TabsList>
            <TabsContent value="mapa">
              <MapaCobertura />
            </TabsContent>
            <TabsContent value="mantenedor">
              <Mantenedor puedeEditar={canWrite('mapa')} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
