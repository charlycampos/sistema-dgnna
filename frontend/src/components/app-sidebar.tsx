'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Scale, LayoutDashboard, Inbox, Settings, LayoutGrid, LogOut, FileSearch } from 'lucide-react'
import { useMe } from '@/lib/use-me'

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { me } = useMe()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const apelacionesItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: 'Bandeja de Apelaciones',
      href: '/apelaciones',
      icon: <Inbox className="h-4 w-4" />,
    },
  ]

  const transparenciaItems = [
    {
      label: 'Bandeja',
      href: '/transparencia',
      icon: <Inbox className="h-4 w-4" />,
    },
    {
      label: 'Dashboard',
      href: '/transparencia/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
  ]

  const NavLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b">
        <div className="p-1.5 bg-blue-600 rounded-lg">
          <Scale className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">DGNNA</p>
          <p className="text-xs text-gray-400 leading-tight">Sistema de Gestión</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

        {/* Módulo Apelaciones — solo cuando se está en rutas de Apelaciones */}
        {(pathname === '/' || pathname.startsWith('/apelaciones') || pathname === '/configuracion') && (
          <>
            <p className="px-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Apelaciones
            </p>
            {apelacionesItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
            <div className="pt-4">
              <p className="px-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Sistema
              </p>
              <Link
                href="/configuracion"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/configuracion'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={pathname === '/configuracion' ? 'text-blue-600' : 'text-gray-400'}>
                  <Settings className="h-4 w-4" />
                </span>
                Configuración
              </Link>
            </div>
          </>
        )}

        {/* Módulo Transparencia — solo cuando se está en rutas de Transparencia */}
        {pathname.startsWith('/transparencia') && (
          <>
            <p className="px-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <FileSearch className="h-3 w-3" /> Transparencia
            </p>
            {transparenciaItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}

        {/* Módulos — siempre visible */}
        <div className="pt-4">
          <Link
            href="/menu"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <span className="text-gray-400">
              <LayoutGrid className="h-4 w-4" />
            </span>
            Módulos
          </Link>
        </div>
      </nav>

      {/* Usuario + Logout */}
      <div className="border-t px-3 py-3">
        {me && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {me.nombre?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{me.nombre}</p>
              <p className="text-[10px] text-gray-400 truncate">{me.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
