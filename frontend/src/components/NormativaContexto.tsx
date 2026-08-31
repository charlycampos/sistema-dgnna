'use client'

import React, { useState } from 'react'
import { Info, Scale, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Props {
  referencia: string
  titulo?: string
  className?: string
}

export default function NormativaContexto({ referencia, titulo, className }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [datos, setDatos] = useState<{
    referencia: string
    documentoCodigo: string
    articulo?: string
    sumilla?: string
    texto: string
    vigente: boolean
    modificadoPor?: string
  } | null>(null)

  const handleAbrir = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAbierto(true)
    if (!datos) {
      setCargando(true)
      try {
        const res = await fetch(`/api/normativa/contexto?referencia=${encodeURIComponent(referencia)}`)
        if (res.ok) {
          const d = await res.json()
          setDatos(d)
        }
      } catch (err) {
        console.error('Error cargando contexto normativo:', err)
      } finally {
        setCargando(false)
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAbrir}
        className={`inline-flex items-center justify-center text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded p-0.5 transition ${className || ''}`}
        title={titulo || 'Ver sustento legal del campo'}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-3.5 animate-in fade-in zoom-in-95 text-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Sustento Normativo Oficial</span>
                  <span className="text-[10px] text-slate-400">Ref: {referencia}</span>
                </div>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cargando ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Consultando base de datos normativa...
              </div>
            ) : datos ? (
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded text-[11px]">
                    {datos.documentoCodigo}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {datos.articulo}: {datos.sumilla}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-700 leading-relaxed max-h-56 overflow-y-auto font-serif text-[13px]">
                  «{datos.texto}»
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Disposición Vigente
                  </span>

                  <Link
                    href="/normativa"
                    className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                    onClick={() => setAbierto(false)}
                  >
                    Ver en Módulo Normativo <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-4 text-xs text-slate-500">
                No se encontró información detallada para esta referencia.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
