'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { useMe } from '@/lib/use-me'
import Servicios from '../Servicios'

export default function ServiciosPage() {
  const router = useRouter()
  const { me, loading, hasAccess } = useMe()

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
          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <h1 className="text-xl font-bold sm:text-2xl">Servicios</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Directorio territorial de servicios para niñas, niños y adolescentes
            </p>
          </div>
        </header>
        <main className="px-3 py-4 sm:px-6 sm:py-6">
          <Servicios />
        </main>
      </div>
    </div>
  )
}
