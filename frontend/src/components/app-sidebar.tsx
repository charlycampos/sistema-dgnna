'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Scale, LayoutDashboard, Inbox, Settings, LayoutGrid, LogOut, FileSearch, BarChart3, Upload, TrendingUp, PieChart } from 'lucide-react'
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
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Dispatch change event safely when isCollapsed state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar-collapse-changed', { detail: isCollapsed }))
  }, [isCollapsed])

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev)
    const handleClose = () => setIsOpen(false)
    const handleToggleCollapse = () => {
      setIsCollapsed(prev => !prev)
    }

    window.addEventListener('toggle-sidebar', handleToggle)
    window.addEventListener('close-sidebar', handleClose)
    window.addEventListener('toggle-sidebar-collapse', handleToggleCollapse)
    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle)
      window.removeEventListener('close-sidebar', handleClose)
      window.removeEventListener('toggle-sidebar-collapse', handleToggleCollapse)
    }
  }, [])

  // Cerrar sidebar al cambiar de ruta
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const apelacionesItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
    },
    {
      label: 'Bandeja de Apelaciones',
      href: '/apelaciones',
      icon: <Inbox className="h-4 w-4 shrink-0" />,
    },
  ]

  const transparenciaItems = [
    {
      label: 'Bandeja',
      href: '/transparencia',
      icon: <Inbox className="h-4 w-4 shrink-0" />,
    },
    {
      label: 'Dashboard',
      href: '/transparencia/dashboard',
      icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
    },
  ]

  const NavLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${isCollapsed ? 'justify-center px-0' : ''}`}
        title={isCollapsed ? label : undefined}
      >
        <span className={active ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'}>{icon}</span>
        <span className={`transition-all duration-300 ${isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          {label}
        </span>
      </Link>
    )
  }

  return (
    <>
      {/* Overlay backdrop on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-35 md:hidden animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed left-0 top-0 h-screen bg-white border-r flex flex-col z-40 transition-all duration-300 ease-in-out md:translate-x-0 ${
        isCollapsed ? 'w-[70px]' : 'w-64'
      } ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-5 py-5 border-b transition-all duration-300 ${isCollapsed ? 'justify-center px-2' : ''}`}>
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div className={`transition-all duration-300 ${isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            <p className="text-sm font-bold text-gray-900 leading-tight">DGNNA</p>
            <p className="text-xs text-gray-400 leading-tight">Sistema de Gestión</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

          {/* Módulo Apelaciones — solo cuando se está en rutas de Apelaciones */}
          {(pathname === '/' || pathname.startsWith('/apelaciones') || pathname === '/configuracion') && (
            <>
              <p className={`px-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider transition-all duration-300 ${
                isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'
              }`}>
                Apelaciones
              </p>
              {apelacionesItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
              <div className="pt-4">
                <p className={`px-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider transition-all duration-300 ${
                  isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'
                }`}>
                  Sistema
                </p>
                <Link
                  href="/configuracion"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/configuracion'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={isCollapsed ? 'Configuración' : undefined}
                >
                  <span className={pathname === '/configuracion' ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'}>
                    <Settings className="h-4 w-4" />
                  </span>
                  <span className={`transition-all duration-300 ${isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                    Configuración
                  </span>
                </Link>
              </div>
            </>
          )}

          {/* Módulo POI-PP117 */}
          {pathname.startsWith('/poi-pp117') && (
            <>
              <p className={`px-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 transition-all duration-300 ${
                isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'
              }`}>
                <BarChart3 className="h-3 w-3" /> POI - PP117
              </p>
              <NavLink href="/poi-pp117/carga"     icon={<Upload className="h-4 w-4 shrink-0" />}      label="Carga mensual" />
              <NavLink href="/poi-pp117/dashboard" icon={<PieChart className="h-4 w-4 shrink-0" />}    label="Dashboard" />
              <NavLink href="/poi-pp117/dgnna"     icon={<BarChart3 className="h-4 w-4 shrink-0" />}   label="Ejecución POI DGNNA" />
              <NavLink href="/poi-pp117/pp117"     icon={<TrendingUp className="h-4 w-4 shrink-0" />}  label="Ejecución PP 0117" />
            </>
          )}

          {/* Módulo Transparencia — solo cuando se está en rutas de Transparencia */}
          {pathname.startsWith('/transparencia') && (
            <>
              <p className={`px-2 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 transition-all duration-300 ${
                isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'
              }`}>
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title={isCollapsed ? 'Módulos' : undefined}
            >
              <span className="text-gray-400 shrink-0">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <span className={`transition-all duration-300 ${isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                Módulos
              </span>
            </Link>
          </div>
        </nav>

        {/* Usuario + Logout */}
        <div className="border-t px-3 py-3">
          {me && (
            <div className={`flex items-center gap-2 px-2 py-2 mb-1 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {me.nombre?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className={`min-w-0 transition-all duration-300 ${isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                <p className="text-xs font-medium text-gray-800 truncate">{me.nombre}</p>
                <p className="text-[10px] text-gray-400 truncate">{me.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title={isCollapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={`transition-all duration-300 ${isCollapsed ? 'hidden opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
