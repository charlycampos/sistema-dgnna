'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { useMe } from '@/lib/use-me'
import DpeDashboardClient from './DpeDashboardClient'

export default function DpePage() {
  const router = useRouter()
  const { me, loading, hasAccess } = useMe()

  useEffect(() => {
    if (!loading && me && !hasAccess('gestion-datos')) {
      router.replace('/menu')
    }
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
        <DpeDashboardClient />
      </div>
    </div>
  )
}
