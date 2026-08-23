'use client'

// ══════════════════════════════════════════════════════════════════════
// MÓDULO DE SUSTRACCIÓN INTERNACIONAL — DGNNA / MIMP PERÚ
// Flujo operativo integral y automatizado según Directiva N.° 006-2021-MIMP
// ══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '@/lib/use-me'
import {
  Search, Plus, Trash2, Globe, FileText,
  Scale, CheckCircle, Clock, Archive, Download,
  ArrowLeft, ClipboardList, MessageSquare,
  Save, AlertCircle, Eye, User, Edit3, X,
  Check, ChevronRight, BarChart2,
  TrendingUp, LayoutGrid, ChevronDown, LogOut,
  Calendar, AlertTriangle, UserCheck, Info, Lock, Plane, Users, MinusCircle, Copy, FileCode, Send,
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, RefreshCw, RotateCcw
} from 'lucide-react'
import { descargarExcelSustracion } from '@/lib/export-excel'
import { toast } from 'sonner'

// ── Tipos ──────────────────────────────────────────────────────────────

type Bitacora = {
  id: string; casoId: string; fecha: string
  texto: string; creadoPor?: string; createdAt: string
}

type HistorialJudicial = {
  id: string; casoId: string; etapa: string; fecha: string
  descripcion?: string; creadoPor?: string; createdAt: string
}

type RequisitoProceso = { id: string; nombre: string; estado: 'Pendiente' | 'Completo' | 'Observado' | 'No aplica' }

type ProcesoOperativo = {
  casoId?: string; faseOperativa: string; evaluacionResultado?: string
  fechaEntrevista?: string; resultadoEntrevista?: string
  requisitos: RequisitoProceso[]; fechaObservacion?: string; fechaNotificacion?: string
  fechaLimiteSubsanacion?: string; ampliacionSubsanacion?: string; fechaRespuestaSubsanacion?: string
  resultadoSubsanacion?: string; detalleSubsanacion?: string
  destinatarioGestion?: string; tipoComunicacion?: string; fechaEnvio?: string
  referenciaSgd?: string; respuestaEsperada?: string; proximaAccion?: string; fechaLimite?: string
  respuestaRecibida?: string; estadoCooperacion?: string
  estadoRetornoVoluntario?: string; propuestaRetorno?: string; fechaPrevistaRetorno?: string
  compromisosRetorno?: string; fechaAcuerdo?: string; fechaLimitePasajes?: string
  pasajesRecibidos?: string; fechaRetornoEfectivo?: string
  updatedAt?: string
}

type ExpedienteTab = 'resumen' | 'evaluacion' | 'subsanacion' | 'internacional' | 'retorno' | 'judicial' | 'cierre'

type NnaForm = {
  id?: string
  nombres: string; primerApellido: string; segundoApellido?: string
  sexo?: string; fechaNacimiento?: string; edad?: string; tipoEdad?: string
}

type Caso = {
  id: string
  codigo: string
  nnaNombre?: string | null
  nnaNombres?: string | null
  nnaPrimerApellido?: string | null
  nnaSegundoApellido?: string | null
  nnaSexo?: string | null
  nnaEdad?: string | null
  nnaTipoEdad?: string | null
  nnaFechaNac?: string | null
  pais: string
  etapa?: string | null
  tipoSolicitud?: string | null
  acPeru?: string | null
  fechaIngreso: string
  fechaSalida?: string | null
  solicitanteNombre?: string | null
  solicitanteSexo?: string | null
  solicitanteTelefono?: string | null
  solicitanteCorreo?: string | null
  solicitanteDomicilio?: string | null
  requeridoNombre?: string | null
  requeridoSexo?: string | null
  requeridoTelefono?: string | null
  requeridoCorreo?: string | null
  requeridoDomicilio?: string | null
  profesional?: string | null
  estado: string
  fechaEntrevista?: string | null
  resultadoEntrevista?: string | null
  estadoJudicial?: string | null
  fechaDemanda?: string | null
  numExpedienteJudicial?: string | null
  juzgado?: string | null
  sentencia1ra?: string | null
  sentencia2da?: string | null
  casacion?: string | null
  motivoCierre?: string | null
  retorno?: string | null
  observaciones?: string | null
  creadoPor?: string | null
  createdAt?: string
  updatedAt?: string
  bitacora?: Bitacora[]
  historialJudicial?: HistorialJudicial[]
  nna?: NnaForm[]
  procesoOperativo?: ProcesoOperativo | null
}

type FormCasoInput = Omit<Caso, 'id' | 'createdAt' | 'updatedAt' | 'bitacora' | 'historialJudicial' | 'nna' | 'procesoOperativo'>

// ── TOKENS DE DISEÑO ───────────────────────────────────────────────────
const NK = '#111827', N2 = '#1E3A5F', BL = '#2563EB', BLH = '#1D4ED8';
const SURF = '#FFFFFF', BG = '#F9FAFB', BR = '#E2E8F0';
const TX = '#0F172A', TX2 = '#475569', TX3 = '#94A3B8';

const PAISES = ['Alemania','Argentina','Australia','Bolivia','Brasil','Canadá','Chile','Colombia','Ecuador','España','Estados Unidos','Francia','Italia','México','Países Bajos','Paraguay','Perú','Portugal','Reino Unido','Uruguay','Venezuela','Otro'];
const PROFESIONALES = ['EMMA','JANNY','CECILIA'];
const SEXOS = ['Hombre','Mujer'];
const TIPO_EDAD = ['Años','Meses','Días'];
const ETAPAS = ['Administrativo','Judicial'];
const TIPO_SOL = ['Restitución','Régimen de Visitas'];
const AC_PERU = ['Requirente','Requerida'];
const RESULTADO_ENT = ['Pendiente','Acepta retorno voluntario','Rechaza retorno','No asiste','Reprogramada'];
const RETORNO = ['SI','NO','Pendiente','No aplica'];
const MOTIVOS_CIERRE = [
  'Retorno voluntario','Retorno por sentencia judicial','Acuerdo entre las partes','Sentencia infundada',
  'AC rechaza solicitud - Violencia familiar','AC rechaza solicitud - Art. 12',
  'No cumple requisitos del Convenio','Transcurrió plazo sin ubicar al NNA',
  'Desistimiento del solicitante','Sentencia infundada - Art. 13 A','Sentencia infundada - Art. 13 B',
  'Sentencia infundada - Art. 20','AC rechaza solicitud - Art. 27','Otro',
];
const ETAPAS_JUD = ['Sin demanda','Demanda presentada','En audiencia','Sentencia 1ra instancia','Sentencia 2da instancia','Casación','Ejecución de sentencia','Archivado'];
const REQ_BASE: RequisitoProceso[] = [
  { id: 'r1', nombre: '1. Solicitud formal de restitución o régimen de visitas identificada', estado: 'Pendiente' },
  { id: 'r2', nombre: '2. Identidad y datos del NNA acreditados', estado: 'Pendiente' },
  { id: 'r3', nombre: '3. Residencia habitual acreditada', estado: 'Pendiente' },
  { id: 'r4', nombre: '4. Derecho de custodia o visitas legalmente ejercido', estado: 'Pendiente' },
  { id: 'r5', nombre: '5. Traslado o retención ilícita identificado', estado: 'Pendiente' },
  { id: 'r6', nombre: '6. Documentación sustentatoria y partidas de nacimiento', estado: 'Pendiente' },
  { id: 'r7', nombre: '7. Traducciones oficiales al español, cuando corresponda', estado: 'Pendiente' },
  { id: 'r8', nombre: '8. Información para ubicación del NNA y del presunto sustractor', estado: 'Pendiente' },
];

const BASE_LEGAL_REQUISITOS: Record<string, {
  articuloHaya: string;
  numeralDirectiva: string;
  descripcionLegal: string;
}> = {
  r1: {
    articuloHaya: 'Art. 8 Convenio de La Haya (1980)',
    numeralDirectiva: 'Num. 6.1 Directiva N.° 006-2021-MIMP',
    descripcionLegal: 'Solicitud formal de restitución internacional o régimen de visitas con designación de partes, NNA y fundamentación fáctica.',
  },
  r2: {
    articuloHaya: 'Arts. 4 y 8.a Convenio de La Haya (1980)',
    numeralDirectiva: 'Num. 6.1.1 Directiva N.° 006-2021-MIMP',
    descripcionLegal: 'Acreditación de identidad, fecha de nacimiento y minoría de edad (menor de 16 años cumplidos al momento de los hechos).',
  },
  r3: {
    articuloHaya: 'Arts. 3 y 4 Convenio de La Haya (1980)',
    numeralDirectiva: 'Num. 6.1.2 Directiva N.° 006-2021-MIMP',
    descripcionLegal: 'Acreditación de residencia habitual del NNA en el Estado requirente inmediatamente antes del traslado o retención ilícita.',
  },
  r4: {
    articuloHaya: 'Arts. 3 y 5 Convenio de La Haya (1980)',
    numeralDirectiva: 'Num. 6.1.3 Directiva N.° 006-2021-MIMP',
    descripcionLegal: 'Acreditación del derecho de custodia o visitas atribuido legalmente y ejercido efectivamente al momento del traslado/retención.',
  },
  r5: {
    articuloHaya: 'Arts. 3 y 12 Convenio de La Haya (1980)',
    numeralDirectiva: 'Num. 6.1.4 Directiva N.° 006-2021-MIMP',
    descripcionLegal: 'Identificación de la ilicitud del traslado/retención y verificación del cómputo del plazo preferente (menor a 1 año).',
  },
  r6: {
    articuloHaya: 'Arts. 8.c y 8.d Convenio de La Haya (1980)',
    numeralDirectiva: 'Num. 6.1.5 Directiva N.° 006-2021-MIMP',
    descripcionLegal: 'Documentación probatoria oficial: partida de nacimiento, resoluciones de custodia, certificados escolares o de salud.',
  },
  r7: {
    articuloHaya: 'Art. 24 Convenio de La Haya (1980)',
    numeralDirectiva: 'Num. 6.1.6 Directiva N.° 006-2021-MIMP',
    descripcionLegal: 'Traducción oficial o certificada al idioma español para su tramitación ante la Autoridad Central peruana.',
  },
  r8: {
    articuloHaya: 'Arts. 7.a y 8.b Convenio de La Haya (1980)',
    numeralDirectiva: 'Num. 6.1.7 Directiva N.° 006-2021-MIMP',
    descripcionLegal: 'Información y referencias de ubicación del NNA en el territorio nacional o exterior y datos del presunto sustractor.',
  },
};

function TooltipBaseLegal({ reqId }: { reqId: string }) {
  const [show, setShow] = useState(false);
  const base = BASE_LEGAL_REQUISITOS[reqId];
  if (!base) return null;

  return (
    <div
      style={{ position: 'relative', display: 'inline-block', marginTop: 3 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <span
        tabIndex={0}
        title={`${base.articuloHaya} | ${base.numeralDirectiva} — ${base.descripcionLegal}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
          fontWeight: 700,
          color: BL,
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 4,
          padding: '2px 7px',
          cursor: 'help',
          transition: 'all 0.15s ease',
        }}
      >
        <Info size={11} strokeWidth={2.5} />
        <span>{base.articuloHaya.split(' (')[0]} · {base.numeralDirectiva.split(' ')[0]} {base.numeralDirectiva.split(' ')[1]}</span>
      </span>

      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            width: 320,
            background: '#0F172A',
            color: '#F8FAFC',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 11,
            lineHeight: 1.4,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 9.5, fontWeight: 800, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
            Base Legal Normativa
          </div>
          <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>
            📜 {base.articuloHaya}
          </div>
          <div style={{ fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
            📋 {base.numeralDirectiva}
          </div>
          <div style={{ fontSize: 10.5, color: '#94A3B8', borderTop: '1px solid #334155', paddingTop: 6 }}>
            {base.descripcionLegal}
          </div>
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 16,
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #0F172A',
            }}
          />
        </div>
      )}
    </div>
  );
}

function estadoBadge(e: string) {
  if (e === 'Tramite') return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'En trámite', accent: BL };
  if (e === 'Pendiente') return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Pendiente', accent: '#D97706' };
  return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Archivado', accent: '#64748B' };
}

// ── UTILIDADES DE FECHA Y TEXTO ────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtFecha(f?: string | null): string {
  if (!f) return '—';
  try {
    const [y, m, d] = f.split('-');
    const mes = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(d, 10)} ${mes[parseInt(m, 10) - 1]} ${y}`;
  } catch {
    return f;
  }
}

function nombreNna(n: { nombres?: string; primerApellido?: string; segundoApellido?: string }) {
  return [n.nombres, n.primerApellido, n.segundoApellido].filter(Boolean).join(' ');
}

function nombreCaso(c: Caso): string {
  if (c.nna && c.nna.length > 0) {
    return c.nna.map(nombreNna).join(' / ');
  }
  return c.nnaNombre || (c as any).nnanombre || 'Sin NNA';
}

function vencido(f?: string | null): boolean {
  return Boolean(f && f < todayStr());
}

function diasDesde(f?: string | null): number {
  if (!f) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(`${f}T00:00:00`).getTime()) / 86400000));
}

function sumarDiasHabiles(fechaIso: string, diasHabiles: number): string {
  if (!fechaIso) return '';
  const [y, m, d] = fechaIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  let count = 0;
  while (count < diasHabiles) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    const feriados = new Set(['1-1', '5-1', '6-7', '6-29', '7-23', '7-28', '7-29', '8-6', '8-30', '10-8', '11-1', '12-8', '12-9', '12-25']);
    const esFeriado = feriados.has(`${date.getMonth() + 1}-${date.getDate()}`);
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !esFeriado) count++;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sumarMes(fechaIso: string): string {
  if (!fechaIso) return '';
  try {
    const [y, m, d] = fechaIso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

function edadDesdeNacimiento(nacimientoIso: string, corteIso: string = todayStr()) {
  if (!nacimientoIso) return { edad: '', tipoEdad: 'Años' };
  const nac = new Date(nacimientoIso);
  const corte = new Date(corteIso);
  if (isNaN(nac.getTime()) || isNaN(corte.getTime()) || corte < nac) return { edad: '', tipoEdad: 'Años' };

  let y = corte.getFullYear() - nac.getFullYear();
  let m = corte.getMonth() - nac.getMonth();
  let d = corte.getDate() - nac.getDate();

  if (d < 0) {
    m--;
    const prevMonth = new Date(corte.getFullYear(), corte.getMonth(), 0);
    d += prevMonth.getDate();
  }
  if (m < 0) {
    y--;
    m += 12;
  }

  if (y > 0) return { edad: String(y), tipoEdad: 'Años' };
  if (m > 0) return { edad: String(m), tipoEdad: 'Meses' };
  return { edad: String(Math.max(d, 0)), tipoEdad: 'Días' };
}

function calcularSLA(fechaLimite?: string | null) {
  if (!fechaLimite) return { diasRestantes: 0, estado: 'sin_fecha', texto: 'Sin fecha fijada', color: TX3, bg: '#F1F5F9', border: BR };
  const hoy = new Date(`${todayStr()}T00:00:00`).getTime();
  const limite = new Date(`${fechaLimite}T00:00:00`).getTime();
  const diffDias = Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return { diasRestantes: diffDias, estado: 'vencido', texto: `Vencido hace ${Math.abs(diffDias)} día(s)`, color: '#B91C1C', bg: '#FEE2E2', border: '#DC2626' };
  }
  if (diffDias <= 3) {
    return { diasRestantes: diffDias, estado: 'alerta', texto: diffDias === 0 ? '¡Vence HOY!' : `Vence en ${diffDias} día(s)`, color: '#92400E', bg: '#FEF3C7', border: '#F59E0B' };
  }
  return { diasRestantes: diffDias, estado: 'ok', texto: `${diffDias} días restantes`, color: '#15803D', bg: '#DCFCE7', border: '#16A34A' };
}

function calcularRelojLaHaya(fechaIngreso?: string | null) {
  if (!fechaIngreso) return { semanas: 0, dias: 0, porcentaje: 0, estado: 'ok', texto: 'Sin fecha de ingreso' };
  const dias = diasDesde(fechaIngreso);
  const semanas = Math.floor(dias / 7);
  const porcentaje = Math.min(100, Math.round((dias / 42) * 100));

  if (dias > 42) {
    return { semanas, dias, porcentaje: 100, estado: 'excedido', texto: `Semana ${semanas} (${dias} días) · Supera plazo recomendatorio de 6 sem. (Art. 11 Convenio)` };
  }
  if (dias >= 28) {
    return { semanas, dias, porcentaje, estado: 'alerta', texto: `Semana ${semanas + 1} de 6 (${dias}/42 días) · Alerta de resolución internacional` };
  }
  return { semanas, dias, porcentaje, estado: 'ok', texto: `Semana ${semanas + 1} de 6 (${dias}/42 días) · Plazo estándar de La Haya` };
}

function calcularCaducidadHaya(fechaNacimientoIso?: string | null, edadNum?: string | number, tipoEdad?: string) {
  if (fechaNacimientoIso) {
    const nac = new Date(fechaNacimientoIso);
    if (!isNaN(nac.getTime())) {
      const fecha16 = new Date(nac.getFullYear() + 16, nac.getMonth(), nac.getDate());
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fecha16.setHours(0, 0, 0, 0);
      const diffMs = fecha16.getTime() - hoy.getTime();
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDias <= 0) {
        return {
          esMayor16: true,
          esInminente: false,
          diasRestantes: 0,
          tiempoStr: '0 días',
          texto: 'El menor ha alcanzado los 16 años de edad. Conforme al Art. 4 del Convenio de La Haya de 1980, el Convenio deja de ser aplicable.',
          badge: 'Menor ≥ 16 años (Art. 4 Haya)',
          urgente: false,
        };
      }

      if (diffDias <= 365) {
        const meses = Math.floor(diffDias / 30.4375);
        const dias = Math.floor(diffDias % 30.4375);
        let tiempoStr = '';
        if (meses > 0) {
          tiempoStr = `${meses} mes${meses > 1 ? 'es' : ''}${dias > 0 ? ` y ${dias} día${dias > 1 ? 's' : ''}` : ''}`;
        } else {
          tiempoStr = `${diffDias} día${diffDias > 1 ? 's' : ''}`;
        }
        return {
          esMayor16: false,
          esInminente: true,
          diasRestantes: diffDias,
          tiempoStr,
          texto: `⚠️ ALERTA DE CADUCIDAD: El NNA cumplirá 16 años en ${tiempoStr}. Trámite judicial y de restitución de máxima prioridad internacional (Art. 4 Convenio 1980).`,
          badge: `Caduca en ${tiempoStr} (Art. 4)`,
          urgente: true,
        };
      }
    }
  }

  // Fallback if only numeric age is provided
  if (tipoEdad === 'Años' || !tipoEdad) {
    const e = parseInt(String(edadNum || '0'), 10);
    if (e >= 16) {
      return {
        esMayor16: true,
        esInminente: false,
        diasRestantes: 0,
        tiempoStr: '0 días',
        texto: 'El menor tiene 16 años o más (Inaplicable según Art. 4 Convenio de La Haya 1980).',
        badge: 'Menor ≥ 16 años (Art. 4 Haya)',
        urgente: false,
      };
    }
    if (e === 15) {
      return {
        esMayor16: false,
        esInminente: true,
        diasRestantes: 180,
        tiempoStr: 'pocos meses (15 años)',
        texto: '⚠️ ALERTA DE CADUCIDAD: El NNA tiene 15 años y cumplirá 16 años próximamente. Trámite judicial y de restitución de máxima prioridad internacional (Art. 4 Convenio 1980).',
        badge: '15 años (Prioridad Art. 4)',
        urgente: true,
      };
    }
  }

  return null;
}

function emptyNnaForm(): NnaForm {
  return { nombres: '', primerApellido: '', segundoApellido: '', sexo: 'Hombre', fechaNacimiento: '', edad: '', tipoEdad: 'Años' };
}

function emptyForm(): FormCasoInput {
  return {
    codigo: '', nnaNombre: '', nnaNombres: '', nnaPrimerApellido: '', nnaSegundoApellido: '',
    nnaSexo: '', nnaEdad: '', nnaTipoEdad: '', nnaFechaNac: '',
    pais: '', etapa: 'Administrativo', tipoSolicitud: 'Restitución', acPeru: 'Requerida',
    fechaIngreso: todayStr(), fechaSalida: '',
    solicitanteNombre: '', solicitanteSexo: '', solicitanteTelefono: '', solicitanteCorreo: '', solicitanteDomicilio: '',
    requeridoNombre: '', requeridoSexo: '', requeridoTelefono: '', requeridoCorreo: '', requeridoDomicilio: '',
    profesional: '', estado: 'Tramite',
    fechaEntrevista: '', resultadoEntrevista: '', estadoJudicial: '',
    fechaDemanda: '', numExpedienteJudicial: '', juzgado: '',
    sentencia1ra: '', sentencia2da: '', casacion: '', motivoCierre: '',
    retorno: '', observaciones: '', creadoPor: '',
  };
}

// ── COMPONENTES ATÓMICOS DE FORMULARIO ─────────────────────────────────

const fieldLabelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, fontWeight: 700, color: TX2,
};

const fieldInputStyle: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 6, border: `1px solid ${BR}`, background: '#fff', fontSize: 12, outline: 'none', width: '100%',
};

function Sec({ title }: { title: string }) {
  return (
    <div style={{
      gridColumn: '1 / -1', padding: '12px 14px 6px', fontSize: 10, fontWeight: 800, color: N2,
      textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: `1px solid ${BR}`, marginTop: 8, background: '#F8FAFC'
    }}>
      {title}
    </div>
  );
}

function Row({
  label, value, type = 'text', opts, span = 1, onChange, disabled = false
}: {
  label: string; value: string; type?: 'text' | 'date' | 'select' | 'textarea';
  opts?: readonly string[] | string[]; span?: number; onChange?: (v: string) => void; disabled?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const safeVal = value === null || value === undefined ? '' : String(value);

  const inputActiveStyle: React.CSSProperties = {
    ...fieldInputStyle,
    border: isFocused ? '1.5px solid #2563EB' : `1px solid ${BR}`,
    boxShadow: isFocused ? '0 0 0 3.5px rgba(37, 99, 235, 0.22)' : 'none',
    background: disabled ? '#F8FAFC' : '#FFFFFF',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
    outline: 'none',
  };

  return (
    <div style={{
      gridColumn: `span ${span}`,
      padding: '10px 14px',
      borderBottom: `1px solid ${BR}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 4,
      background: isFocused ? '#F0F7FF' : 'transparent',
      transition: 'background-color 0.15s ease',
    }}>
      <span style={{
        fontSize: 9.5,
        fontWeight: isFocused ? 800 : 700,
        color: isFocused ? '#1D4ED8' : TX3,
        textTransform: 'uppercase',
        minHeight: 14,
        display: 'flex',
        alignItems: 'center',
        transition: 'color 0.15s ease, font-weight 0.15s ease',
      }}>
        {label}
      </span>
      {type === 'select' ? (
        <select
          className="si-input"
          value={safeVal}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={e => onChange?.(e.target.value)}
          style={inputActiveStyle}
        >
          <option value="">Seleccionar...</option>
          {opts?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          className="si-input"
          value={safeVal}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={e => onChange?.(e.target.value)}
          rows={3}
          style={{ ...inputActiveStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          className="si-input"
          type={type}
          value={safeVal}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={e => onChange?.(e.target.value)}
          style={inputActiveStyle}
        />
      )}
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BR}` }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: TX3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: TX, marginTop: 2 }}>{value || '—'}</div>
    </div>
  );
}

// ── MODAL NNA: REGISTRO Y EDICIÓN DE MENORES ──────────────────────────

function ModalNna({
  isOpen, modalNnaForm, setModalNnaForm, modalNnaIndex, onSave, onClose
}: {
  isOpen: boolean; modalNnaForm: NnaForm; setModalNnaForm: React.Dispatch<React.SetStateAction<NnaForm>>;
  modalNnaIndex: number; onSave: () => void; onClose: () => void;
}) {
  if (!isOpen) return null;

  const caducidad = calcularCaducidadHaya(modalNnaForm.fechaNacimiento, modalNnaForm.edad, modalNnaForm.tipoEdad);

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
    >
      <div style={{
        background: SURF, borderRadius: 10, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        width: '100%', maxWidth: 540, border: `1px solid ${BR}`, overflow: 'hidden'
      }}>
        <div style={{
          padding: '14px 18px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {modalNnaIndex >= 0 ? 'Editar Menor Involucrado' : 'Agregar Menor Involucrado (NNA)'}
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: TX3 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={fieldLabelStyle}>
            Nombres *
            <input
              className="si-input"
              value={modalNnaForm.nombres}
              onChange={e => setModalNnaForm(p => ({ ...p, nombres: e.target.value }))}
              placeholder="Ej. Mateo Alejandro"
              style={fieldInputStyle}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={fieldLabelStyle}>
              Primer Apellido *
              <input
                className="si-input"
                value={modalNnaForm.primerApellido}
                onChange={e => setModalNnaForm(p => ({ ...p, primerApellido: e.target.value }))}
                placeholder="Primer apellido"
                style={fieldInputStyle}
              />
            </label>
            <label style={fieldLabelStyle}>
              Segundo Apellido
              <input
                className="si-input"
                value={modalNnaForm.segundoApellido || ''}
                onChange={e => setModalNnaForm(p => ({ ...p, segundoApellido: e.target.value }))}
                placeholder="Segundo apellido"
                style={fieldInputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={fieldLabelStyle}>
              Sexo
              <select
                className="si-input"
                value={modalNnaForm.sexo || 'Hombre'}
                onChange={e => setModalNnaForm(p => ({ ...p, sexo: e.target.value }))}
                style={fieldInputStyle}
              >
                {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={fieldLabelStyle}>
              Fecha de Nacimiento
              <input
                className="si-input"
                type="date"
                value={modalNnaForm.fechaNacimiento || ''}
                onChange={e => {
                  const f = e.target.value;
                  const auto = edadDesdeNacimiento(f);
                  setModalNnaForm(p => ({ ...p, fechaNacimiento: f, edad: auto.edad, tipoEdad: auto.tipoEdad }));
                }}
                style={fieldInputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={fieldLabelStyle}>
              Edad
              <input
                className="si-input"
                type="number"
                min="0"
                max="99"
                value={modalNnaForm.edad || ''}
                onChange={e => setModalNnaForm(p => ({ ...p, edad: e.target.value }))}
                placeholder="Edad"
                style={fieldInputStyle}
              />
            </label>
            <label style={fieldLabelStyle}>
              Unidad de Edad
              <select
                className="si-input"
                value={modalNnaForm.tipoEdad || 'Años'}
                onChange={e => setModalNnaForm(p => ({ ...p, tipoEdad: e.target.value }))}
                style={fieldInputStyle}
              >
                {TIPO_EDAD.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>

          {caducidad?.esInminente && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
              borderRadius: 8, background: '#FEF2F2', border: '1.5px solid #DC2626', color: '#991B1B', fontSize: 11.5, lineHeight: 1.45
            }}>
              <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <b style={{ display: 'block', fontSize: 12, marginBottom: 2 }}>
                  ⚠️ ALERTA DE CADUCIDAD: El NNA cumplirá 16 años en {caducidad.tiempoStr}.
                </b>
                <span style={{ fontSize: 10.5, color: '#B91C1C' }}>
                  Trámite judicial y de restitución de máxima prioridad internacional (Art. 4 Convenio de La Haya de 1980).
                </span>
              </div>
            </div>
          )}

          {caducidad?.esMayor16 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              borderRadius: 6, background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', fontSize: 11
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span><b>Alerta Convenio:</b> {caducidad.texto}</span>
            </div>
          )}
        </div>

        <div style={{
          padding: '12px 18px', background: '#F8FAFC', borderTop: `1px solid ${BR}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 6, border: `1px solid ${BR}`, background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: BL, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
          >
            {modalNnaIndex >= 0 ? 'Actualizar Menor' : 'Guardar Menor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DRAWER DE PLANTILLAS OFICIALES SGD (CON INYECCIÓN DINÁMICA DE REQUISITOS OBSERVADOS) ──

function DrawerSGD({ caso, onClose }: { caso: Caso; onClose: () => void }) {
  const [template, setTemplate] = useState<
    'observaciones' | 'citacion' | 'interpol' | 'migraciones' | 'cancilleria' | 'informe_admisibilidad' | 'cooperacion' | 'resolucion'
  >('observaciones');
  const [copied, setCopied] = useState(false);

  const nnaNom = nombreCaso(caso);
  const solNom = caso.solicitanteNombre || 'EL/LA SOLICITANTE';
  const reqNom = caso.requeridoNombre || 'EL/LA REQUERIDO/A';
  const cod = caso.codigo || 'EXP-S/N';
  const pais = caso.pais || 'PAÍS NO ESPECIFICADO';
  const hoy = fmtFecha(todayStr());
  const proc = caso.procesoOperativo;
  const fechaLim = fmtFecha(proc?.fechaLimiteSubsanacion || todayStr());
  const fechaEnt = fmtFecha(caso.fechaEntrevista || todayStr());

  // INYECCIÓN DINÁMICA DE REQUISITOS OBSERVADOS EN EL TEXTO DEL OFICIO
  const reqsObs = (proc?.requisitos || []).filter(r => r.estado === 'Observado');
  const listaObsTexto = reqsObs.length > 0
    ? reqsObs.map((r, i) => `${i + 1}. ${r.nombre}: No se acompaña documentación suficiente, actualizada o legible.`).join('\n')
    : '1. Acreditación fehaciente de residencia habitual previa y derecho de custodia ejercido al momento del traslado.';

  const nnaInfoTexto = caso.nna && caso.nna.length > 0
    ? caso.nna.map((n, i) => `• Menor ${i + 1}: ${nombreNna(n)} (Nacimiento: ${fmtFecha(n.fechaNacimiento)}, Edad: ${n.edad ? `${n.edad} ${n.tipoEdad || 'Años'}` : 'No registrada'}, Sexo: ${n.sexo || 'No registrado'})`).join('\n')
    : `• Menor: ${nnaNom} (Edad: ${caso.nnaEdad || 'No registrada'} ${caso.nnaTipoEdad || 'Años'})`;

  const plantillas = useMemo(() => ({
    observaciones: {
      titulo: 'Oficio de Observaciones y Subsanación (Directiva N.° 006-2021-MIMP)',
      texto: `OFICIO N.° ____-2026-MIMP/DGNNA-DIPNA\n\nLima, ${hoy}\n\nSeñor(a):\n${solNom}\n${caso.solicitanteDomicilio || 'Domicilio no registrado'}\n\nAsunto: Observaciones a la solicitud de ${caso.tipoSolicitud || 'Restitución Internacional'} respecto del menor ${nnaNom}.\nReferencia: Hoja de Trámite N.° ${cod}\n\nDe mi consideración:\n\nMe dirijo a usted en el marco del Convenio de La Haya de 1980 sobre los Aspectos Civiles de la Sustracción Internacional de Menores y la Directiva N.° 006-2021-MIMP. Al respecto, habiéndose efectuado la evaluación preliminar de admisibilidad de su expediente, se ha determinado que se requiere subsanar los siguientes requisitos:\n\n${listaObsTexto}\n\nEn virtud de lo dispuesto en la normativa vigente, se le otorga un plazo de CINCO (05) DÍAS HÁBILES computados a partir del día siguiente de notificado el presente oficio (fecha límite: ${fechaLim}) para que cumpla con remitir la documentación requerida, bajo apercibimiento de declarar el no acogimiento a trámite y archivo de la solicitud.\n\nSin otro particular, quedo de usted.\n\nAtentamente,\n\n__________________________________\nDirección de Políticas de Niñas, Niños y Adolescentes\nAutoridad Central del Perú - DGNNA / MIMP`,
    },
    citacion: {
      titulo: 'Cédula de Citación a Entrevista Amigable de Retorno',
      texto: `CÉDULA DE CITACIÓN N.° ____-2026-MIMP/DGNNA\n\nLima, ${hoy}\n\nSeñor(a):\n${reqNom}\n${caso.requeridoDomicilio || 'Domicilio en territorio peruano'}\n\nAsunto: Citación a sesión de mediación y propuesta de retorno voluntario.\nExpediente: ${cod} | NNA: ${nnaNom}\n\nPor medio del presente, se le cita a la sesión de entrevista que se llevará a cabo el día ${fechaEnt} en la sede de la Dirección General de Niñas, Niños y Adolescentes (Av. Camaná 616, Lima), con la finalidad de propiciar un acuerdo voluntario y no contencioso sobre la restitución / régimen de visitas del menor en referencia, en salvaguarda de su Interés Superior.\n\nSe le recuerda que el presente procedimiento administrativo es confidencial y busca soluciones amigables previas a la instauración de acciones judiciales.\n\nAtentamente,\n\n__________________________________\nEspecialista Legal de Sustracción Internacional\nDirección General de Niñas, Niños y Adolescentes`,
    },
    interpol: {
      titulo: 'Oficio a INTERPOL (División de Policía Judicial) — Ubicación y Localización',
      texto: `OFICIO N.° ____-2026-MIMP/DGNNA-DIPNA\n\nLima, ${hoy}\n\nSeñor Coronel PNP\nJEFE DE LA DIVISIÓN DE POLICÍA JUDICIAL E INTERPOL LIMA\nPolicía Nacional del Perú\n\nAsunto: Solicitud urgente de ubicación y localización de menor de edad y presunto sustractor.\nReferencia: Hoja de Trámite N.° ${cod} | Convenio de La Haya de 1980\n\nDe mi mayor consideración:\n\nTengo el agrado de dirigirme a usted en el marco del Convenio de La Haya de 1980 sobre los Aspectos Civiles de la Sustracción Internacional de Menores, ratificado por el Estado Peruano, y la Directiva N.° 006-2021-MIMP, mediante la cual la Dirección General de Niñas, Niños y Adolescentes (DGNNA) del MIMP actúa como Autoridad Central del Perú.\n\nAl respecto, habiéndose admitido a trámite la solicitud de ${caso.tipoSolicitud || 'Restitución Internacional'} respecto de:\n\n${nnaInfoTexto}\n\nPresunto sustractor / Requerido(a):\n• Nombre: ${reqNom}\n• Domicilio / Referencias: ${caso.requeridoDomicilio || 'No especificado'}\n• Teléfono: ${caso.requeridoTelefono || 'No registrado'}\n\nEn virtud de lo dispuesto en el Artículo 7, literal a) del Convenio de La Haya de 1980 y el numeral 6.2 de la Directiva N.° 006-2021-MIMP, se solicita a su digno despacho se sirva disponer con carácter de MUY URGENTE las acciones de inteligencia, búsqueda y localización de las personas mencionadas en el territorio nacional, remitiendo a esta Autoridad Central el informe respectivo a la brevedad posible.\n\nSin otro particular, expreso a usted los sentimientos de mi especial consideración.\n\nAtentamente,\n\n__________________________________\nDirección de Políticas de Niñas, Niños y Adolescentes\nAutoridad Central del Perú - DGNNA / MIMP`,
    },
    migraciones: {
      titulo: 'Oficio a Superintendencia Nacional de MIGRACIONES — Alerta Preventiva e Impedimento',
      texto: `OFICIO N.° ____-2026-MIMP/DGNNA-DIPNA\n\nLima, ${hoy}\n\nSeñor(a):\nSUPERINTENDENCIA NACIONAL DE MIGRACIONES\nGerencia de Servicios Migratorios / Control Migratorio\n\nAsunto: Solicitud urgente de Movimiento Migratorio y Alerta Preventiva de Salida del País.\nReferencia: Hoja de Trámite N.° ${cod}\n\nDe mi mayor consideración:\n\nTengo a bien dirigirme a usted en el marco del Convenio de La Haya de 1980 sobre los Aspectos Civiles de la Sustracción Internacional de Menores y la Directiva N.° 006-2021-MIMP.\n\nPor medio del presente, solicito se sirva disponer con carácter de MUY URGENTE:\n\n1. La remisión del Reporte Histórico de Movimiento Migratorio (entradas y salidas del país) de las siguientes personas:\n${nnaInfoTexto}\n   • Progenitor(a) / Requerido(a): ${reqNom}\n\n2. La activación inmediata del CONTROL DE ALERTA PREVENTIVA DE SALIDA en todos los puestos de control migratorio y fronterizo a nivel nacional respecto del menor ${nnaNom}, con la finalidad de prevenir su salida no autorizada del territorio de la República en salvaguarda de su Interés Superior (Art. 7 Convenio 1980).\n\nAgradeciendo la oportuna atención al presente requerimiento, quedo de usted.\n\nAtentamente,\n\n__________________________________\nDirección de Políticas de Niñas, Niños y Adolescentes\nAutoridad Central del Perú - DGNNA / MIMP`,
    },
    cancilleria: {
      titulo: 'Oficio al Ministerio de Relaciones Exteriores (Cancillería - MRE)',
      texto: `OFICIO N.° ____-2026-MIMP/DGNNA-AC\n\nLima, ${hoy}\n\nSeñor(a) Embajador(a) / Director(a):\nDIRECCIÓN GENERAL DE COMUNIDADES PERUANAS EN EL EXTERIOR Y ASUNTOS CONSULARES\nMinisterio de Relaciones Exteriores del Perú (MRE)\n\nAsunto: Solicitud de Cooperación y Asistencia Consular en Trámite de ${caso.tipoSolicitud || 'Restitución Internacional'}.\nReferencia: Hoja de Trámite N.° ${cod} | País: ${pais}\n\nDe mi mayor consideración:\n\nTengo el honor de dirigirme a usted para poner en su conocimiento que ante esta Autoridad Central se viene tramitando el expediente de ${caso.tipoSolicitud || 'Restitución Internacional'} bajo el marco del Convenio de La Haya de 1980, correspondiente al menor de edad ${nnaNom}, quien se encuentra presuntamente en el Estado de ${pais}.\n\nAl respecto, en cumplimiento del numeral 6.3 de la Directiva N.° 006-2021-MIMP, se solicita a vuestro despacho se sirva coordinar a través de la sección consular correspondiente:\n\n1. Efectuar el seguimiento consular respectivo para verificar el estado de salud e integridad del menor.\n2. Coadyuvar en las comunicaciones oficiales ante la Autoridad Central de ${pais}.\n3. Informar a esta Dirección General sobre los avances y gestiones consulares efectuadas.\n\nAgradeciendo de antemano su valiosa cooperación interinstitucional, hago propicia la oportunidad para reiterarle las seguridades de mi distinguida consideración.\n\nAtentamente,\n\n__________________________________\nDirección General de Niñas, Niños y Adolescentes\nAutoridad Central del Perú - MIMP`,
    },
    informe_admisibilidad: {
      titulo: 'Informe Técnico de Calificación de Admisibilidad (Directiva N.° 006-2021-MIMP)',
      texto: `INFORME TÉCNICO N.° ____-2026-MIMP/DGNNA-DIPNA\n\nA: DIRECCIÓN DE POLÍTICAS DE NIÑAS, NIÑOS Y ADOLESCENTES\nDE: Especialista Legal en Sustracción Internacional\nASUNTO: Calificación de Admisibilidad de Solicitud de ${caso.tipoSolicitud || 'Restitución Internacional'}\nREFERENCIA: Hoja de Trámite N.° ${cod}\nFECHA: Lima, ${hoy}\n\n1. ANTECEDENTES Y PARTES PROCESALES\n   • Menor involucrado: ${nnaNom}\n   • Solicitante: ${solNom} (${caso.solicitanteDomicilio || 'Domicilio no registrado'})\n   • Requerido(a): ${reqNom} (${caso.requeridoDomicilio || 'Domicilio no registrado'})\n   • País involucrado: ${pais} | Rol AC Perú: ${caso.acPeru || 'Requerida'}\n   • Fecha de Ingreso: ${fmtFecha(caso.fechaIngreso)}\n\n2. EVALUACIÓN NORMATIVA (CONVENIO DE LA HAYA 1980 / DIRECTIVA 006-2021-MIMP)\n   a) Verificación de Minoría de Edad (Art. 4 Convenio): Se constata que el NNA tiene menos de 16 años de edad.\n   b) Residencia Habitual Previa (Art. 3 Convenio): Se acredita residencia inmediata anterior al traslado o retención ilícita.\n   c) Ejercicio Efectivo del Derecho de Custodia/Visitas (Arts. 3 y 5 Convenio): Se acompaña documentación fehaciente.\n   d) Traslado o Retención Ilícita (Arts. 3 y 12 Convenio): Se verifica la infracción de los derechos de custodia y el cómputo dentro del plazo preferente.\n\n3. RESULTADO DE LA CALIFICACIÓN DE REQUISITOS\n${listaObsTexto}\n\n4. CONCLUSIÓN Y RECOMENDACIÓN TÉCNICA\n   Habiéndose verificado el cumplimiento de los estándares exigidos por la Directiva N.° 006-2021-MIMP, se concluye que la solicitud resulta ADMISIBLE. Se recomienda proceder con las siguientes actuaciones según corresponda al rol de la Autoridad Central:\n   [ ] Convocar a la sesión de entrevista amigable para promover el retorno voluntario.\n   [ ] Remitir la solicitud formal de cooperación a la Autoridad Central de ${pais}.\n\nEs cuanto informo para los fines pertinentes.\n\n__________________________________\nEspecialista Legal de Sustracción Internacional\nDirección General de Niñas, Niños y Adolescentes - MIMP`,
    },
    cooperacion: {
      titulo: 'Oficio de Solicitud de Cooperación a la Autoridad Central Extranjera (AC Requirente)',
      texto: `OFICIO N.° ____-2026-MIMP/DGNNA-AC\n\nLima, ${hoy}\n\nTo / A:\nCENTRAL AUTHORITY OF ${pais.toUpperCase()}\nDepartment of International Child Protection\n\nSubject: Request for International Child Return / Access under 1980 Hague Convention\nCase Ref.: ${cod} | Child: ${nnaNom}\n\nDear Central Authority,\n\nThe Ministry of Women and Vulnerable Populations of Peru (MIMP), acting as Central Authority under the 1980 Hague Convention, hereby transmits the application for the prompt return of the child ${nnaNom}, who was wrongfully removed to / retained in your country.\n\nWe kindly request your valuable assistance in locating the child, preventing further harm, and initiating the appropriate voluntary return or judicial proceedings in accordance with Articles 7, 8, and 9 of the Convention.\n\nPlease find attached the complete dossier and official translations.\n\nSincerely yours,\n\n__________________________________\nCentral Authority of Peru\nDirectorate General for Children and Adolescents (DGNNA - MIMP)`,
    },
    resolucion: {
      titulo: 'Resolución Directoral de Conclusión y Archivo del Trámite',
      texto: `RESOLUCIÓN DIRECTORAL N.° ____-2026-MIMP/DGNNA\n\nLima, ${hoy}\n\nVISTO: El expediente de sustracción internacional de menores correspondiente a la Hoja de Trámite N.° ${cod}, referente al menor ${nnaNom};\n\nCONSIDERANDO:\n\nQue, mediante Directiva N.° 006-2021-MIMP se regulan las actuaciones de la Autoridad Central peruana en el marco de los Convenios Internacionales de Restitución de Menores;\n\nQue, en el presente expediente ha acontecido la causal de conclusión: «${caso.motivoCierre || 'Motivo de archivo'}»;\n\nSE RESUELVE:\n\nArtículo 1.- DECLARAR CONCLUIDO el procedimiento administrativo de ${caso.tipoSolicitud || 'Restitución Internacional'} tramitado bajo el expediente N.° ${cod}.\n\nArtículo 2.- DISPONER EL ARCHIVO DEFINITIVO de los actuados, notificando a las partes y a las entidades pertinentes.\n\nRegístrese, comuníquese y archívese.\n\n__________________________________\nDirección General de Niñas, Niños y Adolescentes\nMIMP`,
    },
  }), [caso, nnaNom, solNom, reqNom, cod, pais, hoy, fechaLim, fechaEnt, listaObsTexto, nnaInfoTexto]);

  const handleCopy = () => {
    navigator.clipboard.writeText(plantillas[template].texto);
    setCopied(true);
    toast.success('Plantilla copiada al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(1.5px)',
          zIndex: 8999,
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 620, maxWidth: '92vw',
        background: '#fff', boxShadow: '-10px 0 25px rgba(0,0,0,0.15)', zIndex: 9000,
        display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${BR}`
      }}>
      <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <b style={{ fontSize: 13, color: N2 }}>Generador de Plantillas Oficiales SGD</b>
          <span style={{ display: 'block', fontSize: 10.5, color: TX3 }}>Documentos tipo oficiales según Directiva N.° 006-2021-MIMP</span>
        </div>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: TX3 }}><X size={18} /></button>
      </div>

      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${BR}`, display: 'flex', gap: 6, flexWrap: 'wrap', background: '#FAFBFD' }}>
        {[
          { id: 'observaciones', label: 'Oficio Observación' },
          { id: 'citacion', label: 'Cédula Citación' },
          { id: 'interpol', label: 'Oficio INTERPOL' },
          { id: 'migraciones', label: 'Migraciones' },
          { id: 'cancilleria', label: 'Cancillería MRE' },
          { id: 'informe_admisibilidad', label: 'Informe Admisibilidad' },
          { id: 'cooperacion', label: 'Cooperación Extranjera' },
          { id: 'resolucion', label: 'Res. Cierre' },
        ].map(({ id, label }) => {
          const active = template === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTemplate(id as any)}
              style={{
                padding: '6px 10px', borderRadius: 6, border: `1px solid ${active ? BL : BR}`,
                background: active ? '#EFF6FF' : '#fff', color: active ? BL : TX2,
                fontSize: 10.5, fontWeight: active ? 800 : 600, cursor: 'pointer'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: 18, overflowY: 'auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: N2, marginBottom: 8 }}>{plantillas[template].titulo}</div>
        <textarea
          readOnly
          value={plantillas[template].texto}
          rows={18}
          style={{ width: '100%', height: 'calc(100% - 28px)', padding: 12, borderRadius: 8, border: `1.5px solid ${BR}`, background: '#F8FAFC', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5, resize: 'none', outline: 'none' }}
        />
      </div>

      <div style={{ padding: '12px 18px', background: '#F8FAFC', borderTop: `1px solid ${BR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10.5, color: TX3 }}>Pega el texto directamente en el Sistema de Gestión Documental (SGD).</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6,
            border: 'none', background: copied ? '#16A34A' : BL, color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: 'pointer'
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? '¡Copiado!' : 'Copiar para SGD'}</span>
        </button>
      </div>
    </div>
  </>
);
}

// ── MODAL ESTADÍSTICAS Y REPORTES OPERATIVOS ──────────────────────────

function ModalEstadisticas({
  isOpen,
  onClose,
  casos,
  flows,
}: {
  isOpen: boolean;
  onClose: () => void;
  casos: Caso[];
  flows: Map<string, any>;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    const total = casos.length;
    const tramite = casos.filter(c => c.estado === 'Tramite').length;
    const pendientes = casos.filter(c => c.estado === 'Pendiente').length;
    const archivados = casos.filter(c => c.estado === 'Archivado').length;

    // Retornos Concretados
    const retornos = casos.filter(c => {
      const retDirecto = (c.retorno || '').toUpperCase() === 'SI';
      const retProc = c.procesoOperativo?.estadoRetornoVoluntario === 'Retorno concretado' || Boolean(c.procesoOperativo?.fechaRetornoEfectivo);
      const retCierre = (c.motivoCierre || '').toLowerCase().includes('retorno');
      return retDirecto || retProc || retCierre;
    }).length;

    // Distribución Rol AC Perú
    const requerida = casos.filter(c => (c.acPeru || 'Requerida') === 'Requerida').length;
    const requirente = casos.filter(c => c.acPeru === 'Requirente').length;
    const pctRequerida = total > 0 ? Math.round((requerida / total) * 100) : 0;
    const pctRequirente = total > 0 ? Math.round((requirente / total) * 100) : 0;

    // Top Países Involucrados
    const paisesCount: Record<string, number> = {};
    casos.forEach(c => {
      const p = c.pais?.trim() || 'No especificado';
      paisesCount[p] = (paisesCount[p] || 0) + 1;
    });
    const topPaises = Object.entries(paisesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const maxPaisCount = topPaises.length > 0 ? Math.max(...topPaises.map(p => p[1])) : 1;

    // Reloj de La Haya (Art. 11 - Meta Resolutiva de 6 Semanas / 42 días)
    const activos = casos.filter(c => c.estado !== 'Archivado');
    let dentroPlazo = 0;
    let fueraPlazo = 0;
    activos.forEach(c => {
      const d = diasDesde(c.fechaIngreso);
      if (d <= 42) dentroPlazo++;
      else fueraPlazo++;
    });
    const tasaCumplimiento = activos.length > 0 ? Math.round((dentroPlazo / activos.length) * 100) : 100;

    // Distribución por Fase Operativa
    let fEvaluacion = 0;
    let fSubsanacion = 0;
    let fRetorno = 0;
    let fJudicial = 0;
    let fCierre = archivados;

    casos.forEach(c => {
      if (c.estado !== 'Archivado') {
        const f = flows.get(c.id);
        const stageId = f?.current?.id;
        if (stageId === 'evaluacion') fEvaluacion++;
        else if (stageId === 'subsanacion') fSubsanacion++;
        else if (stageId === 'retorno' || stageId === 'internacional') fRetorno++;
        else if (stageId === 'judicial') fJudicial++;
        else fEvaluacion++;
      }
    });

    const pctFase = (count: number) => total > 0 ? Math.round((count / total) * 100) : 0;

    return {
      total,
      tramite,
      pendientes,
      archivados,
      retornos,
      pctRetornos: total > 0 ? Math.round((retornos / total) * 100) : 0,
      requerida,
      requirente,
      pctRequerida,
      pctRequirente,
      topPaises,
      maxPaisCount,
      activosCount: activos.length,
      dentroPlazo,
      fueraPlazo,
      tasaCumplimiento,
      fases: [
        { id: 'evaluacion', label: '1. Evaluación Inicial', count: fEvaluacion, pct: pctFase(fEvaluacion), color: BL, bg: '#EFF6FF', border: '#BFDBFE', desc: 'Control de admisibilidad formal y verificación de los 8 requisitos del Convenio' },
        { id: 'subsanacion', label: '2. Subsanación', count: fSubsanacion, pct: pctFase(fSubsanacion), color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', desc: 'Requerimientos documentales con plazo de 5 días hábiles a la parte solicitante' },
        { id: 'retorno', label: '3. Retorno Vol. / Coop.', count: fRetorno, pct: pctFase(fRetorno), color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', desc: 'Entrevistas de mediación amigable o coordinación con Autoridades Centrales del exterior' },
        { id: 'judicial', label: '4. Proceso Judicial', count: fJudicial, pct: pctFase(fJudicial), color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', desc: 'Acciones ante Juzgados de Familia peruanos o tribunales de jurisdicción extranjera' },
        { id: 'cierre', label: '5. Cierre y Archivo', count: fCierre, pct: pctFase(fCierre), color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', desc: 'Resolución de conclusión definitiva conforme a causales de la Directiva N.° 006-2021' },
      ],
    };
  }, [casos, flows]);

  if (!isOpen) return null;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div
        style={{
          background: SURF,
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          width: '100%',
          maxWidth: 920,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${BR}`,
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            background: '#F8FAFC',
            borderBottom: `1px solid ${BR}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              }}
            >
              <BarChart2 size={19} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: NK, lineHeight: 1.2 }}>
                Panel de Analítica Operativa y Estadísticas
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: TX3, marginTop: 2 }}>
                Módulo de Sustracción Internacional · DGNNA / MIMP (Convenio de La Haya de 1980)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${BR}`,
              background: '#FFFFFF',
              color: TX2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#FEE2E2';
              e.currentTarget.style.color = '#DC2626';
              e.currentTarget.style.borderColor = '#FECACA';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.color = TX2;
              e.currentTarget.style.borderColor = BR;
            }}
            title="Cerrar modal (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }} className="main-scroll">
          {/* KPI CARDS GLOBALES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            <div
              style={{
                background: '#F8FAFC',
                borderTop: `1px solid ${BR}`,
                borderRight: `1px solid ${BR}`,
                borderBottom: `1px solid ${BR}`,
                borderLeft: `4px solid ${N2}`,
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Total Expedientes
                </span>
                <Globe size={14} color={N2} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: N2, marginTop: 4 }}>{stats.total}</div>
              <div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>100% de la carga procesal</div>
            </div>

            <div
              style={{
                background: '#EFF6FF',
                borderTop: '1px solid #BFDBFE',
                borderRight: '1px solid #BFDBFE',
                borderBottom: '1px solid #BFDBFE',
                borderLeft: `4px solid ${BL}`,
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  En Trámite
                </span>
                <Clock size={14} color={BL} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: BL, marginTop: 4 }}>{stats.tramite}</div>
              <div style={{ fontSize: 10, color: '#2563EB', marginTop: 2 }}>
                {stats.total > 0 ? Math.round((stats.tramite / stats.total) * 100) : 0}% en gestión activa
              </div>
            </div>

            <div
              style={{
                background: '#F0FDF4',
                borderTop: '1px solid #BBF7D0',
                borderRight: '1px solid #BBF7D0',
                borderBottom: '1px solid #BBF7D0',
                borderLeft: '4px solid #16A34A',
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Archivados / Concluidos
                </span>
                <CheckCircle size={14} color="#16A34A" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#16A34A', marginTop: 4 }}>{stats.archivados}</div>
              <div style={{ fontSize: 10, color: '#15803D', marginTop: 2 }}>
                {stats.total > 0 ? Math.round((stats.archivados / stats.total) * 100) : 0}% concluidos formalmente
              </div>
            </div>

            <div
              style={{
                background: '#F5F3FF',
                borderTop: '1px solid #DDD6FE',
                borderRight: '1px solid #DDD6FE',
                borderBottom: '1px solid #DDD6FE',
                borderLeft: '4px solid #7C3AED',
                borderRadius: 8,
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Retornos Concretados
                </span>
                <TrendingUp size={14} color="#7C3AED" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED', marginTop: 4 }}>{stats.retornos}</div>
              <div style={{ fontSize: 10, color: '#6D28D9', marginTop: 2 }}>
                {stats.pctRetornos}% efectividad de restitución
              </div>
            </div>
          </div>

          {/* FILA 2: ROL AC PERÚ & RELOJ DE LA HAYA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            {/* ROL AC PERÚ */}
            <div style={{ background: '#FFFFFF', border: `1px solid ${BR}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: N2 }}>Distribución según Rol AC Perú</div>
                  <div style={{ fontSize: 10.5, color: TX3, marginTop: 1 }}>Autoridad Central Requirente vs Requerida</div>
                </div>
                <Users size={16} color={N2} />
              </div>

              {/* Bar 1: Requerida */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: TX }}>
                    <Users size={12} color={BL} /> AC Requerida (Menor en Perú)
                  </span>
                  <span style={{ color: BL, fontWeight: 800 }}>{stats.requerida} ({stats.pctRequerida}%)</span>
                </div>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${stats.pctRequerida}%`, height: '100%', background: BL, borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: 10, color: TX3, marginTop: 3 }}>
                  Solicitud promovida por Estado extranjero para restitución de NNA en territorio peruano.
                </div>
              </div>

              {/* Bar 2: Requirente */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: TX }}>
                    <Plane size={12} color="#6366F1" /> AC Requirente (Menor en Exterior)
                  </span>
                  <span style={{ color: '#6366F1', fontWeight: 800 }}>{stats.requirente} ({stats.pctRequirente}%)</span>
                </div>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${stats.pctRequirente}%`, height: '100%', background: '#6366F1', borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: 10, color: TX3, marginTop: 3 }}>
                  Solicitud formulada por progenitor en Perú para restitución desde el país extranjero.
                </div>
              </div>
            </div>

            {/* RELOJ DE LA HAYA (ART. 11) */}
            <div style={{ background: '#FFFFFF', border: `1px solid ${BR}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: N2 }}>Reloj de La Haya (Art. 11 Convenio 1980)</div>
                  <div style={{ fontSize: 10.5, color: TX3, marginTop: 1 }}>Meta preferente de resolución: 6 semanas (42 días)</div>
                </div>
                <Clock size={16} color={BL} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F8FAFC', border: `1px solid ${BR}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: stats.tasaCumplimiento >= 70 ? '#16A34A' : '#D97706' }}>
                    {stats.tasaCumplimiento}%
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: TX3, textTransform: 'uppercase' }}>Tasa Oportuna</div>
                </div>
                <div style={{ width: 1, height: 34, background: BR }} />
                <div style={{ flex: 1, fontSize: 11, lineHeight: 1.4, color: TX2 }}>
                  <b style={{ color: '#16A34A' }}>{stats.dentroPlazo} expedientes</b> dentro de las 6 semanas reglamentarias;{' '}
                  <b style={{ color: stats.fueraPlazo > 0 ? '#DC2626' : TX3 }}>{stats.fueraPlazo} expedientes</b> con alerta de plazo extendido.
                </div>
              </div>

              {/* Progress bar dual */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: TX3, marginBottom: 4 }}>
                  <span style={{ color: '#16A34A' }}>≤ 6 Semanas ({stats.dentroPlazo})</span>
                  <span style={{ color: stats.fueraPlazo > 0 ? '#DC2626' : TX3 }}>&gt; 6 Semanas ({stats.fueraPlazo})</span>
                </div>
                <div style={{ height: 8, background: stats.fueraPlazo > 0 ? '#FEE2E2' : '#F1F5F9', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${stats.tasaCumplimiento}%`, height: '100%', background: '#16A34A', transition: 'width 0.4s ease' }} />
                  <div style={{ width: `${100 - stats.tasaCumplimiento}%`, height: '100%', background: '#DC2626', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>
          </div>

          {/* FILA 3: TOP PAÍSES & DISTRIBUCIÓN POR FASE OPERATIVA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            {/* TOP PAÍSES */}
            <div style={{ background: '#FFFFFF', border: `1px solid ${BR}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: N2 }}>Top Países Involucrados</div>
                  <div style={{ fontSize: 10.5, color: TX3, marginTop: 1 }}>Estados de procedencia o destino con mayor incidencia</div>
                </div>
                <Globe size={16} color={N2} />
              </div>

              {stats.topPaises.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: TX3, fontSize: 11 }}>
                  No se registran países en los expedientes.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {stats.topPaises.map(([pais, count], idx) => {
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    const relPct = Math.round((count / stats.maxPaisCount) * 100);
                    return (
                      <div key={pais} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: TX3, width: 14, textAlign: 'right' }}>
                          {idx + 1}.
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                            <span style={{ color: TX, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {pais}
                            </span>
                            <span style={{ color: N2, fontWeight: 800, flexShrink: 0 }}>
                              {count} {count === 1 ? 'exp.' : 'exp.'} ({pct}%)
                            </span>
                          </div>
                          <div style={{ height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${relPct}%`, height: '100%', background: BL, borderRadius: 99 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DISTRIBUCIÓN POR FASE OPERATIVA */}
            <div style={{ background: '#FFFFFF', border: `1px solid ${BR}`, borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: N2 }}>Distribución por Fase Operativa</div>
                  <div style={{ fontSize: 10.5, color: TX3, marginTop: 1 }}>Carga actual según la etapa procesal del expediente</div>
                </div>
                <TrendingUp size={16} color={N2} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {stats.fases.map(f => (
                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: TX, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color }} />
                        {f.label}
                      </span>
                      <span style={{ fontWeight: 800, color: f.color }}>
                        {f.count} ({f.pct}%)
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${f.pct}%`, height: '100%', background: f.color, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 22px',
            background: '#F8FAFC',
            borderTop: `1px solid ${BR}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: TX3 }}>
            <Info size={13} color={BL} />
            <span>Datos procesados en tiempo real según registros del módulo.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => descargarExcelSustracion(casos as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 7,
                border: `1px solid ${BR}`,
                background: '#FFFFFF',
                color: TX2,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#F0FDF4';
                e.currentTarget.style.color = '#15803D';
                e.currentTarget.style.borderColor = '#BBF7D0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.color = TX2;
                e.currentTarget.style.borderColor = BR;
              }}
            >
              <Download size={13} />
              <span>Exportar Reporte</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: 7,
                border: 'none',
                background: BL,
                color: '#FFFFFF',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: RESUMEN DEL CASO (CON RELOJ DE LA HAYA) ──────────────────

function TabResumen({
  caso, onSelectTab, onAgregarBitacora
}: {
  caso: Caso; onSelectTab: (t: ExpedienteTab) => void; onAgregarBitacora?: (texto: string) => Promise<void>;
}) {
  const proceso = caso.procesoOperativo || { faseOperativa: 'Evaluación', requisitos: REQ_BASE };
  const reqPend = (proceso.requisitos || []).filter(r => r.estado === 'Pendiente' || r.estado === 'Observado').length;
  const b = estadoBadge(caso.estado);

  const [quickNote, setQuickNote] = useState('');
  const [savingQuickNote, setSavingQuickNote] = useState(false);

  const relojHaya = useMemo(() => calcularRelojLaHaya(caso.fechaIngreso), [caso.fechaIngreso]);

  const nnaList = useMemo(() => {
    return (caso.nna && caso.nna.length > 0)
      ? caso.nna
      : [{ nombres: caso.nnaNombre || 'Menor involucrado', primerApellido: '', fechaNacimiento: caso.nnaFechaNac || (caso as any).nnafechanac, edad: caso.nnaEdad || (caso as any).nnaedad, tipoEdad: caso.nnaTipoEdad || (caso as any).nnatipoedad, sexo: caso.nnaSexo || '' }];
  }, [caso]);

  const caducidadAlert = useMemo(() => {
    for (const n of nnaList) {
      const cad = calcularCaducidadHaya(n.fechaNacimiento, n.edad, n.tipoEdad);
      if (cad?.esInminente) {
        return { nnaNom: nombreNna(n) || 'El NNA', ...cad };
      }
    }
    return null;
  }, [nnaList]);

  const handleQuickNoteSubmit = async () => {
    if (!quickNote.trim() || !onAgregarBitacora) return;
    try {
      setSavingQuickNote(true);
      await onAgregarBitacora(quickNote.trim());
      setQuickNote('');
      toast.success('Nota registrada en la bitácora');
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar nota rápida');
    } finally {
      setSavingQuickNote(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        {/* BANNER RELOJ DE LA HAYA (6 SEMANAS / ART. 11) */}
        <div style={{
          gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          background: relojHaya.estado === 'excedido' ? '#FEF2F2' : relojHaya.estado === 'alerta' ? '#FFFBEB' : '#EFF6FF',
          border: `1.5px solid ${relojHaya.estado === 'excedido' ? '#FECACA' : relojHaya.estado === 'alerta' ? '#FDE68A' : '#BFDBFE'}`,
          borderRadius: 8, padding: '12px 18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: relojHaya.estado === 'excedido' ? '#DC2626' : relojHaya.estado === 'alerta' ? '#D97706' : BL,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: relojHaya.estado === 'excedido' ? '#991B1B' : relojHaya.estado === 'alerta' ? '#92400E' : BL, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Reloj de La Haya · Plazo Objetivo Art. 11 (6 Semanas / 42 Días)
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: TX, marginTop: 2 }}>{relojHaya.texto}</div>
            </div>
          </div>
          <div style={{ width: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: TX3, marginBottom: 4 }}>
              <span>Transcurrido</span>
              <span>{relojHaya.porcentaje}%</span>
            </div>
            <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${relojHaya.porcentaje}%`, height: '100%', background: relojHaya.estado === 'excedido' ? '#DC2626' : relojHaya.estado === 'alerta' ? '#D97706' : BL }} />
            </div>
          </div>
        </div>

        {/* ALERTA DE CADUCIDAD INMINENTE (ART. 4 CONVENIO DE LA HAYA) */}
        {caducidadAlert && (
          <div style={{
            gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12,
            background: '#FEF2F2', border: '1.5px solid #DC2626', borderRadius: 8, padding: '12px 18px', color: '#991B1B'
          }}>
            <AlertTriangle size={22} color="#DC2626" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: '#B91C1C' }}>
                Art. 4 Convenio de La Haya de 1980 · Alerta de Caducidad Inminente por Edad
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>
                ⚠️ ALERTA DE CADUCIDAD: El NNA <b>{caducidadAlert.nnaNom}</b> cumplirá 16 años en {caducidadAlert.tiempoStr}. Trámite judicial y de restitución de máxima prioridad internacional (Art. 4 Convenio 1980).
              </div>
            </div>
          </div>
        )}

        {/* PRÓXIMA ACCIÓN */}
        <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
            Datos del Procedimiento
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <SummaryValue label="Hoja de Trámite" value={<span style={{ fontFamily: 'monospace', color: N2 }}>{caso.codigo}</span>} />
            <SummaryValue label="Rol AC Perú" value={caso.acPeru === 'Requirente' ? 'Requirente (Menor en Exterior)' : 'Requerida (Menor en Perú)'} />
            <SummaryValue label="País Contraparte" value={caso.pais} />
            <SummaryValue label="Tipo Solicitud" value={caso.tipoSolicitud} />
            <SummaryValue label="Fecha de Ingreso" value={fmtFecha(caso.fechaIngreso)} />
            <SummaryValue label="Especialista" value={caso.profesional} />
          </div>
        </div>

        <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
            Situación y Diligencias del Caso
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <SummaryValue
              label="Requisitos Convenio"
              value={reqPend === 0 ? <span style={{ color: '#16A34A', fontWeight: 800 }}>8 / 8 Conformes</span> : <span style={{ color: '#D97706', fontWeight: 800 }}>{8 - reqPend} / 8 Cumplidos</span>}
            />
            <SummaryValue label="Estado Operativo" value={<span style={{ padding: '3px 8px', borderRadius: 99, background: b.bg, color: b.color, border: `1px solid ${b.border}`, fontSize: 10.5, fontWeight: 800 }}>{b.label}</span>} />
            <SummaryValue label="Entrevista Amigable" value={caso.resultadoEntrevista || 'Pendiente'} />
            <SummaryValue
              label="Proceso Judicial"
              value={
                <div>
                  <div>{caso.estadoJudicial || 'Sin demanda'}</div>
                  {caso.numExpedienteJudicial && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => window.open('https://cej.pj.gob.pe/cej/forms/busquedaform.html', '_blank', 'noopener,noreferrer')}
                        title="Consultar expediente en el CEJ del Poder Judicial"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#EFF6FF',
                          color: BL,
                          border: '1px solid #BFDBFE',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Scale size={11} />
                        <span>Ver en CEJ ({caso.numExpedienteJudicial}) ↗</span>
                      </button>
                    </div>
                  )}
                </div>
              }
            />
            <SummaryValue label="Retorno Concretado" value={caso.retorno || 'Pendiente'} />
            <SummaryValue label="Fecha de Conclusión" value={fmtFecha(caso.fechaSalida)} />
          </div>
        </div>

        {/* NNA Y ÚLTIMA GESTIÓN */}
        <div style={{ gridColumn: '1 / -1', background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            Menores Involucrados ({nnaList.length})
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {nnaList.map((n, i) => {
              const cad = calcularCaducidadHaya(n.fechaNacimiento, n.edad, n.tipoEdad);
              return (
                <div key={i} style={{ padding: '8px 12px', background: '#F8FAFC', border: `1px solid ${cad?.esInminente ? '#DC2626' : BR}`, borderRadius: 6, fontSize: 11.5 }}>
                  <b>{nombreNna(n)}</b> <span style={{ color: TX3 }}>· {n.edad ? `${n.edad} ${n.tipoEdad || 'Años'}` : 'Edad no reg.'} · {n.sexo || 'Sexo no reg.'}</span>
                  {cad?.esInminente && (
                    <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 4, background: '#FEE2E2', color: '#B91C1C', fontSize: 10, fontWeight: 800, border: '1px solid #FECACA' }}>
                      ⚠️ Cumple 16 años en {cad.tiempoStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* WIDGET DE BITÁCORA RÁPIDA (1-CLIC) */}
        <div style={{
          gridColumn: '1 / -1', background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 16,
          display: 'flex', flexDirection: 'column', gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              <MessageSquare size={14} color={BL} />
              <span>Bitácora Rápida de Seguimiento ({caso.bitacora?.length || 0} notas registradas)</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab?.('cierre')}
              style={{ fontSize: 10.5, fontWeight: 700, color: BL, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Ir a Cierre / Ficha Técnica →
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="si-input"
              value={quickNote}
              onChange={e => setQuickNote(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && quickNote.trim()) {
                  e.preventDefault();
                  handleQuickNoteSubmit();
                }
              }}
              placeholder="Registrar una nota rápida en la bitácora (Presiona Enter para guardar)..."
              style={{ flex: 1, ...fieldInputStyle }}
            />
            <button
              type="button"
              disabled={!quickNote.trim() || savingQuickNote}
              onClick={handleQuickNoteSubmit}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 6,
                border: 'none', background: quickNote.trim() ? BL : '#E2E8F0', color: quickNote.trim() ? '#fff' : TX3,
                fontSize: 11, fontWeight: 800, cursor: quickNote.trim() ? 'pointer' : 'default', flexShrink: 0
              }}
            >
              <Send size={12} />
              <span>{savingQuickNote ? 'Guardando...' : 'Registrar'}</span>
            </button>
          </div>
          {caso.bitacora && caso.bitacora.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
              {caso.bitacora.slice(-2).reverse().map((b, i) => (
                <div key={b.id || i} style={{ padding: '8px 12px', background: '#F8FAFC', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: TX, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    💬 {b.texto}
                  </span>
                  <span style={{ color: TX3, fontSize: 10, flexShrink: 0 }}>
                    {fmtFecha(b.fecha)} · {b.creadoPor || 'Especialista'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: DATOS DEL CASO ───────────────────────────────────────────

function TabDatos({ caso, getVal, onChange }: { caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="main-scroll">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Sec title="Identificación del Expediente" />
        <Row label="Hoja de Trámite" value={getVal('codigo')} onChange={v => onChange('codigo', v)} />
        <Row label="Rol AC Perú" value={getVal('acPeru') || 'Requerida'} type="select" opts={AC_PERU} onChange={v => onChange('acPeru', v)} />
        <Row label={getVal('acPeru') === 'Requirente' ? 'País de Destino (Exterior)' : 'País de Procedencia'} value={getVal('pais')} type="select" opts={PAISES} onChange={v => onChange('pais', v)} />
        <Row label="Tipo de Solicitud" value={getVal('tipoSolicitud') || 'Restitución'} type="select" opts={TIPO_SOL} onChange={v => onChange('tipoSolicitud', v)} />

        <Sec title="Seguimiento y Fechas" />
        <Row label="Especialista Asignado" value={getVal('profesional')} type="select" opts={PROFESIONALES} onChange={v => onChange('profesional', v)} />
        <Row label="Fecha de Ingreso DGNNA" value={getVal('fechaIngreso')} type="date" onChange={v => onChange('fechaIngreso', v)} />
        <Row label="Fecha de Salida / Conclusión" value={getVal('fechaSalida')} type="date" onChange={v => onChange('fechaSalida', v)} />
        <Row label="Estado del Expediente" value={getVal('estado') || 'Tramite'} type="select" opts={['Tramite', 'Pendiente', 'Archivado']} onChange={v => onChange('estado', v)} />

        <Sec title="Observaciones Generales" />
        <Row label="Observaciones del Expediente" value={getVal('observaciones')} type="textarea" span={4} onChange={v => onChange('observaciones', v)} />
      </div>
    </div>
  );
}

// ── PESTAÑA: PERSONAS INVOLUCRADAS ────────────────────────────────────

function TabPersonas({
  caso, getVal, onChange, onOpenNnaModal
}: {
  caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void; onOpenNnaModal: (idx: number) => void;
}) {
  const esRequirente = getVal('acPeru') === 'Requirente';

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="main-scroll">
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BR}`, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <b style={{ fontSize: 12, color: N2 }}>NIÑA, NIÑO O ADOLESCENTE INVOLUCRADOS</b>
          <span style={{ display: 'block', fontSize: 10.5, color: TX3 }}>Lista de niñas, niños y adolescentes sujetos al procedimiento</span>
        </div>
        <button
          type="button"
          onClick={() => onOpenNnaModal(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: BL, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={13} /> Agregar
        </button>
      </div>

      <div style={{ padding: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, background: '#fff', border: `1px solid ${BR}`, borderRadius: 6, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${BR}`, textAlign: 'left', color: TX3, fontSize: 10, textTransform: 'uppercase' }}>
              <th style={{ padding: '8px 12px' }}>N.°</th>
              <th style={{ padding: '8px 12px' }}>Nombre Completo</th>
              <th style={{ padding: '8px 12px' }}>Sexo</th>
              <th style={{ padding: '8px 12px' }}>Nacimiento</th>
              <th style={{ padding: '8px 12px' }}>Edad</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(caso.nna && caso.nna.length > 0 ? caso.nna : [{ id: '1', nombres: caso.nnaNombre || 'Sin nombre', primerApellido: '', edad: caso.nnaEdad || '', tipoEdad: caso.nnaTipoEdad || 'Años', sexo: caso.nnaSexo || '' }]).map((n, i) => (
              <tr key={n.id || i} style={{ borderBottom: `1px solid ${BR}` }}>
                <td style={{ padding: '9px 12px', color: TX3 }}>{i + 1}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700 }}>{nombreNna(n)}</td>
                <td style={{ padding: '9px 12px' }}>{n.sexo || '—'}</td>
                <td style={{ padding: '9px 12px' }}>{fmtFecha(n.fechaNacimiento)}</td>
                <td style={{ padding: '9px 12px' }}>{n.edad ? `${n.edad} ${n.tipoEdad || 'Años'}` : '—'}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                  <button type="button" onClick={() => onOpenNnaModal(i)} style={{ border: 'none', background: 'transparent', color: BL, fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── PARTE SOLICITANTE Y REQUERIDA LADO A LADO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {/* Columna Izquierda: Parte Solicitante */}
        <div style={{ borderRight: `1px solid ${BR}`, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignContent: 'start' }}>
          <Sec title="Parte Solicitante" />
          <Row label="Nombres y Apellidos" value={getVal('solicitanteNombre')} span={2} onChange={v => onChange('solicitanteNombre', v)} />
          <Row label="Sexo" value={getVal('solicitanteSexo')} type="select" opts={SEXOS} span={1} onChange={v => onChange('solicitanteSexo', v)} />
          <Row label="Teléfono de Contacto" value={getVal('solicitanteTelefono')} span={1} onChange={v => onChange('solicitanteTelefono', v)} />
          <Row label="Correo Electrónico" value={getVal('solicitanteCorreo')} span={2} onChange={v => onChange('solicitanteCorreo', v)} />
          <Row label="Domicilio" value={getVal('solicitanteDomicilio')} span={2} onChange={v => onChange('solicitanteDomicilio', v)} />
        </div>

        {/* Columna Derecha: Parte Requerida */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignContent: 'start' }}>
          <Sec title={esRequirente ? 'Parte Requerida (En el Exterior)' : 'Parte Requerida / Presunto Sustractor'} />
          <Row label="Nombres y Apellidos" value={getVal('requeridoNombre')} span={2} onChange={v => onChange('requeridoNombre', v)} />
          <Row label="Sexo" value={getVal('requeridoSexo')} type="select" opts={SEXOS} span={1} onChange={v => onChange('requeridoSexo', v)} />
          <Row label="Teléfono de Contacto" value={getVal('requeridoTelefono')} span={1} onChange={v => onChange('requeridoTelefono', v)} />
          <Row label="Correo Electrónico" value={getVal('requeridoCorreo')} span={2} onChange={v => onChange('requeridoCorreo', v)} />
          <Row label={esRequirente ? 'Domicilio en el Exterior' : 'Domicilio en el Perú'} value={getVal('requeridoDomicilio')} span={2} onChange={v => onChange('requeridoDomicilio', v)} />
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: BITÁCORA DEL EXPEDIENTE (HISTORIAL DE NOTAS Y ACTUACIONES) ───

function TabBitacora({
  caso, me, onAgregarBitacora
}: {
  caso: Caso; me: any; onAgregarBitacora: (texto: string) => Promise<void>;
}) {
  const [nuevaNota, setNuevaNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const agregarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNota.trim()) return;
    try {
      setGuardando(true);
      await onAgregarBitacora(nuevaNota.trim());
      setNuevaNota('');
      toast.success('Nota agregada a la bitácora');
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar nota');
    } finally {
      setGuardando(false);
    }
  };

  const lista = caso.bitacora || [];

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Formulario para nueva nota */}
      <form onSubmit={agregarNota} style={{ background: '#F8FAFC', border: `1px solid ${BR}`, borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: N2, marginBottom: 8, textTransform: 'uppercase' }}>
          Agregar Nota de Seguimiento
        </div>
        <textarea
          rows={3}
          value={nuevaNota}
          onChange={e => setNuevaNota(e.target.value)}
          placeholder="Escriba aquí la diligencia realizada, comunicación telefónica, recepción de documentos, etc..."
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${BR}`, fontSize: 12, outline: 'none', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 10.5, color: TX3 }}>Registrado por: <b>{me?.nombre || (me as any)?.username || 'Usuario en sesión'}</b></span>
          <button
            type="submit"
            disabled={guardando || !nuevaNota.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 6, border: 'none',
              background: BL, color: '#fff', fontSize: 11, fontWeight: 800, cursor: nuevaNota.trim() ? 'pointer' : 'default', opacity: nuevaNota.trim() ? 1 : 0.6
            }}
          >
            <Send size={12} /> {guardando ? 'Guardando...' : 'Registrar Nota'}
          </button>
        </div>
      </form>

      {/* Listado cronológico */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', marginBottom: 10 }}>
          Historial de Actuaciones ({lista.length})
        </div>
        {lista.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: TX3, fontSize: 12, background: '#FAFBFD', border: `1px dashed ${BR}`, borderRadius: 8 }}>
            No hay notas registradas en la bitácora de este expediente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lista.slice().reverse().map(item => (
              <div key={item.id} style={{ background: '#fff', border: `1px solid ${BR}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: N2 }}>{item.creadoPor || 'Especialista DGNNA'}</span>
                  <span style={{ fontSize: 10.5, color: TX3, fontWeight: 600 }}>{fmtFecha(item.fecha)}</span>
                </div>
                <div style={{ fontSize: 12, color: TX, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {item.texto}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PESTAÑA: EVALUACIÓN INICIAL (CON BARRA DE PROGRESO Y BOTONERA ERGONÓMICA) ─────

function TabEvaluacion({
  caso, onGuardarProceso
}: {
  caso: Caso; onGuardarProceso: (p: ProcesoOperativo, nota?: string, targetTab?: ExpedienteTab) => void;
}) {
  const isSpanishCountry = useMemo(() => {
    const hispano = ['Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'República Dominicana', 'Uruguay', 'Venezuela'];
    return hispano.includes(caso.pais);
  }, [caso.pais]);

  const [proc, setProc] = useState<ProcesoOperativo>(() => {
    const base = caso.procesoOperativo || {
      casoId: caso.id, faseOperativa: 'Evaluación', requisitos: REQ_BASE, evaluacionResultado: 'Pendiente',
    };
    const esVisitas = caso.tipoSolicitud === 'Régimen de Visitas';
    if (esVisitas || isSpanishCountry) {
      const autoReqs = base.requisitos.map(r => {
        if (esVisitas && r.id === 'r5' && r.estado === 'Pendiente') return { ...r, estado: 'No aplica' as const };
        if (isSpanishCountry && r.id === 'r7' && r.estado === 'Pendiente') return { ...r, estado: 'No aplica' as const };
        return r;
      });
      return { ...base, requisitos: autoReqs };
    }
    return base;
  });

  useEffect(() => {
    if (caso.procesoOperativo) setProc(caso.procesoOperativo);
  }, [caso.id, caso.procesoOperativo?.updatedAt]);

  const calcularResultadoAuto = (reqs: RequisitoProceso[]) => {
    const hayObservado = reqs.some(r => r.estado === 'Observado');
    if (hayObservado) return 'Observada';
    const hayPendiente = reqs.some(r => r.estado === 'Pendiente');
    if (!hayPendiente) {
      const todosNoAplica = reqs.every(r => r.estado === 'No aplica');
      return todosNoAplica ? 'No corresponde' : 'Completa';
    }
    return 'Pendiente';
  };

  const actualizarRequisito = (id: string, nuevoEstado: RequisitoProceso['estado']) => {
    const nuevosReqs = proc.requisitos.map(x => (x.id === id ? { ...x, estado: nuevoEstado } : x));
    const autoRes = calcularResultadoAuto(nuevosReqs);
    setProc(prev => ({
      ...prev,
      requisitos: nuevosReqs,
      evaluacionResultado: autoRes !== 'Pendiente' ? autoRes : (prev.evaluacionResultado === 'Completa' || prev.evaluacionResultado === 'Observada' ? autoRes : prev.evaluacionResultado),
    }));
  };

  const ejecutarGuardado = (customProc?: ProcesoOperativo) => {
    const p = customProc || proc;
    const observados = p.requisitos.filter(r => r.estado === 'Observado').length;
    const completados = p.requisitos.filter(r => r.estado === 'Completo' || r.estado === 'No aplica').length;

    let autoRes = p.evaluacionResultado || 'Pendiente';
    if (observados > 0) autoRes = 'Observada';
    else if (completados === p.requisitos.length) autoRes = 'Completa';

    let fase = p.faseOperativa || 'Evaluación';
    let accion = p.proximaAccion || '';
    let targetTab: ExpedienteTab = 'evaluacion';
    let nota = '';

    if (autoRes === 'Completa') {
      fase = caso.acPeru === 'Requirente' ? 'Gestión internacional' : 'Retorno voluntario';
      accion = caso.acPeru === 'Requirente'
        ? 'Elaborar y remitir solicitud formal de cooperación jurídica internacional a la Autoridad Central extranjera.'
        : 'Notificar y citar al presunto sustractor para audiencia / entrevista amigable de retorno voluntario.';
      targetTab = caso.acPeru === 'Requirente' ? 'internacional' : 'retorno';
      nota = `Evaluación inicial CONFORME (${completados}/8 requisitos normativos aprobados). Expediente derivado a ${caso.acPeru === 'Requirente' ? 'Cooperación Internacional' : 'Retorno Voluntario'}.`;
    } else if (autoRes === 'Observada') {
      fase = 'Subsanación';
      accion = `Notificar observaciones al solicitante (plazo legal: 5 días hábiles; ${observados} requisito(s) pendiente(s)).`;
      targetTab = 'subsanacion';
      nota = `Evaluación inicial con OBSERVACIONES (${observados} requisito(s) observados). Expediente trasladado a Subsanación.`;
    } else if (autoRes === 'No corresponde') {
      fase = 'Cierre';
      accion = 'Emitir resolución y archivar por no configurar sustracción o no cumplir ámbito de aplicación.';
      targetTab = 'cierre';
      nota = 'Evaluación inicial: No corresponde admitir a trámite. Se deriva a Cierre.';
    } else {
      fase = 'Evaluación';
      accion = 'Completar la matriz de requisitos y emitir el resultado de la evaluación inicial.';
      targetTab = 'evaluacion';
      nota = 'Actualización de matriz de requisitos en etapa de Evaluación Inicial.';
    }

    const payload: ProcesoOperativo = {
      ...p,
      evaluacionResultado: autoRes,
      faseOperativa: fase,
      proximaAccion: accion,
      fechaObservacion: autoRes === 'Observada' ? (p.fechaObservacion || todayStr()) : p.fechaObservacion,
    };

    onGuardarProceso(payload, nota, targetTab);
  };

  const marcarTodosConformes = () => {
    const esVisitas = caso.tipoSolicitud === 'Régimen de Visitas';
    const nuevosReqs = proc.requisitos.map(r => ({
      ...r,
      estado: ((isSpanishCountry && r.id === 'r7') ? 'No aplica' : (esVisitas && r.id === 'r5') ? 'No aplica' : 'Completo') as RequisitoProceso['estado'],
    }));
    const updatedProc: ProcesoOperativo = {
      ...proc,
      requisitos: nuevosReqs,
      evaluacionResultado: 'Completa',
    };
    setProc(updatedProc);
    ejecutarGuardado(updatedProc);
  };

  const conformes = proc.requisitos.filter(r => r.estado === 'Completo' || r.estado === 'No aplica').length;
  const observados = proc.requisitos.filter(r => r.estado === 'Observado').length;
  const total = proc.requisitos.length;
  const porcentaje = Math.round((conformes / total) * 100);

  const resBadge = useMemo(() => {
    if (proc.evaluacionResultado === 'Completa') {
      return {
        label: 'Evaluación Completa',
        bg: '#DCFCE7', border: '#16A34A', text: '#15803D',
        icon: <Check size={13} strokeWidth={3} />
      };
    }
    if (proc.evaluacionResultado === 'Observada') {
      return {
        label: 'Con Observaciones',
        bg: '#FEE2E2', border: '#DC2626', text: '#B91C1C',
        icon: <AlertTriangle size={13} strokeWidth={2.6} />
      };
    }
    if (proc.evaluacionResultado === 'No corresponde') {
      return {
        label: 'No Corresponde',
        bg: '#EEF2FF', border: '#6366F1', text: '#4338CA',
        icon: <MinusCircle size={13} strokeWidth={2.4} />
      };
    }
    return {
      label: 'Pendiente de Evaluación',
      bg: '#FEF3C7', border: '#D97706', text: '#B45309',
      icon: <Clock size={13} strokeWidth={2.4} />
    };
  }, [proc.evaluacionResultado]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        {/* Cabecera con Botón 1-clic y Badge Dinámico */}
        <div style={{ padding: '14px 18px', background: '#F8FAFC', borderBottom: `1px solid ${BR}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <b style={{ fontSize: 13, color: N2 }}>Matriz de 8 Requisitos Normativos (Directiva N.° 006-2021-MIMP)</b>
              <span style={{ display: 'block', fontSize: 10.5, color: TX3, marginTop: 2 }}>
                Evaluación preliminar de admisibilidad del Convenio de La Haya de 1980
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={marcarTodosConformes}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6,
                  border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                }}
                title="Marcar todos los requisitos como Conformes de 1 clic"
              >
                <Check size={13} strokeWidth={2.8} /> Todo conforme (1-clic)
              </button>

              {/* Badge Dinámico de Estado */}
              <div
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99,
                  border: `1.5px solid ${resBadge.border}`, background: resBadge.bg, color: resBadge.text, fontSize: 11, fontWeight: 800
                }}
              >
                {resBadge.icon}
                <span>{resBadge.label}</span>
              </div>

              <button
                type="button"
                onClick={() => ejecutarGuardado()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 6,
                  background: proc.evaluacionResultado === 'Completa' ? '#16A34A' : proc.evaluacionResultado === 'Observada' ? '#D97706' : BL,
                  color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {proc.evaluacionResultado === 'Completa' ? (
                  <><span>Guardar y Pasar a Siguiente Etapa</span> <ChevronRight size={13} /></>
                ) : proc.evaluacionResultado === 'Observada' ? (
                  <><span>Guardar y Derivar a Subsanación</span> <ChevronRight size={13} /></>
                ) : (
                  <span>Guardar Evaluación</span>
                )}
              </button>
            </div>
          </div>

          {/* BARRA DE PROGRESO PORCENTUAL DINÁMICA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 7, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                width: `${porcentaje}%`,
                height: '100%',
                background: observados > 0 ? '#EF4444' : porcentaje === 100 ? '#16A34A' : BL,
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: TX2, minWidth: 80, textAlign: 'right' }}>
              {conformes} / {total} ({porcentaje}%)
            </span>
          </div>
        </div>

        {/* LISTADO DE REQUISITOS CON BOTONERA DE ESTADOS (ÍCONO + TEXTO) */}
        <div>
          {proc.requisitos.map((r, i) => {
            const isConforme = r.estado === 'Completo';
            const isObservado = r.estado === 'Observado';
            const isPendiente = r.estado === 'Pendiente';
            const isNoAplica = r.estado === 'No aplica';

            return (
              <div
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 18px',
                  borderTop: i ? `1px solid ${BR}` : 'none',
                  background: isObservado ? '#FFFBFB' : isConforme ? '#FBFDFB' : SURF,
                  transition: 'background 0.2s ease'
                }}
              >
                {/* Ícono de Estado Principal */}
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isConforme ? '#DCFCE7' : isObservado ? '#FEE2E2' : '#F1F5F9',
                  color: isConforme ? '#15803D' : isObservado ? '#DC2626' : TX3,
                  fontSize: 11, fontWeight: 800,
                  border: `1px solid ${isConforme ? '#86EFAC' : isObservado ? '#FCA5A5' : '#E2E8F0'}`
                }}>
                  {isConforme ? <Check size={13} strokeWidth={3} /> : isObservado ? <AlertTriangle size={12} strokeWidth={2.5} /> : i + 1}
                </div>

                {/* Nombre del Requisito y Base Legal */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: isConforme || isObservado ? 700 : 600, color: isObservado ? '#991B1B' : TX, lineHeight: 1.4 }}>
                    {r.nombre}
                  </div>
                  <TooltipBaseLegal reqId={r.id} />
                </div>

                {/* BOTONERA DE ESTADOS INTERACTIVOS (1 CLIC SOLO ÍCONOS) */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Botón Conforme */}
                  <button
                    type="button"
                    onClick={() => actualizarRequisito(r.id, 'Completo')}
                    title="Conforme"
                    style={{
                      width: 32, height: 32,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6,
                      border: `1.5px solid ${isConforme ? '#16A34A' : '#E2E8F0'}`,
                      background: isConforme ? '#DCFCE7' : '#FFFFFF',
                      color: isConforme ? '#15803D' : TX3,
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={15} strokeWidth={isConforme ? 3 : 2} />
                  </button>

                  {/* Botón Observado */}
                  <button
                    type="button"
                    onClick={() => actualizarRequisito(r.id, 'Observado')}
                    title="Observado"
                    style={{
                      width: 32, height: 32,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6,
                      border: `1.5px solid ${isObservado ? '#DC2626' : '#E2E8F0'}`,
                      background: isObservado ? '#FEE2E2' : '#FFFFFF',
                      color: isObservado ? '#B91C1C' : TX3,
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <AlertTriangle size={14} strokeWidth={isObservado ? 2.5 : 2} />
                  </button>

                  {/* Botón Pendiente */}
                  <button
                    type="button"
                    onClick={() => actualizarRequisito(r.id, 'Pendiente')}
                    title="Pendiente"
                    style={{
                      width: 32, height: 32,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6,
                      border: `1.5px solid ${isPendiente ? '#D97706' : '#E2E8F0'}`,
                      background: isPendiente ? '#FEF3C7' : '#FFFFFF',
                      color: isPendiente ? '#B45309' : TX3,
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <Clock size={14} strokeWidth={isPendiente ? 2.5 : 2} />
                  </button>

                  {/* Botón No aplica */}
                  <button
                    type="button"
                    onClick={() => actualizarRequisito(r.id, 'No aplica')}
                    title="No aplica"
                    style={{
                      width: 32, height: 32,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6,
                      border: `1.5px solid ${isNoAplica ? '#64748B' : '#E2E8F0'}`,
                      background: isNoAplica ? '#F1F5F9' : '#FFFFFF',
                      color: isNoAplica ? '#475569' : TX3,
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <MinusCircle size={14} strokeWidth={isNoAplica ? 2.5 : 2} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: SUBSANACIÓN (v2 CON SLA Y PRÓRROGAS) ──────────────────────

function TabSubsanacion({
  caso, onGuardarProceso
}: {
  caso: Caso; onGuardarProceso: (p: ProcesoOperativo, nota?: string, targetTab?: ExpedienteTab) => void;
}) {
  const [proc, setProc] = useState<ProcesoOperativo>(() => caso.procesoOperativo || {
    casoId: caso.id, faseOperativa: 'Subsanación', requisitos: REQ_BASE, fechaObservacion: '', fechaNotificacion: '', fechaLimiteSubsanacion: '', ampliacionSubsanacion: 'No', fechaRespuestaSubsanacion: '', resultadoSubsanacion: 'Pendiente', detalleSubsanacion: '',
  });

  useEffect(() => {
    if (caso.procesoOperativo) setProc(caso.procesoOperativo);
  }, [caso.id, caso.procesoOperativo?.updatedAt]);

  const set = (k: keyof ProcesoOperativo) => (v: any) => setProc(curr => ({ ...curr, [k]: v }));
  const plazoVencido = vencido(proc.fechaLimiteSubsanacion);

  const ejecutarGuardadoSubsanacion = () => {
    let fase = 'Subsanación';
    let accion = '';
    let targetTab: ExpedienteTab = 'subsanacion';
    let nota = '';

    if (proc.resultadoSubsanacion === 'Subsanó') {
      fase = caso.acPeru === 'Requirente' ? 'Gestión internacional' : 'Retorno voluntario';
      accion = caso.acPeru === 'Requirente' ? 'Proceder con la remisión de la solicitud a la AC extranjera.' : 'Citar a entrevista amigable de retorno voluntario.';
      targetTab = caso.acPeru === 'Requirente' ? 'internacional' : 'retorno';
      nota = `Subsanación CONFORME. Se habilita etapa de ${caso.acPeru === 'Requirente' ? 'Cooperación Internacional' : 'Retorno Voluntario'}.`;
    } else if (proc.resultadoSubsanacion === 'No subsanó') {
      fase = 'Cierre';
      accion = 'Emitir resolución de archivo por vencimiento de plazo de subsanación sin respuesta.';
      targetTab = 'cierre';
      nota = 'Subsanación DENEGADA / NO SUBSANADA dentro del plazo legal. Derivado a Cierre.';
    } else {
      fase = 'Subsanación';
      accion = proc.fechaNotificacion ? 'Esperar respuesta de subsanación dentro del plazo legal.' : 'Notificar el pliego de observaciones al solicitante.';
      targetTab = 'subsanacion';
      nota = 'Actualización del estado de subsanación.';
    }

    const payload: ProcesoOperativo = {
      ...proc,
      faseOperativa: fase,
      proximaAccion: accion,
    };

    onGuardarProceso(payload, nota, targetTab);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <b>Control de Plazos y Subsanación Normativa</b>
            <span style={{ display: 'block', fontSize: 10, color: TX3, marginTop: 2 }}>
              Plazo legal de 5 días hábiles prorrogables a 10 según Directiva N.° 006-2021-MIMP.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {proc.fechaLimiteSubsanacion && (() => {
              const sla = calcularSLA(proc.fechaLimiteSubsanacion);
              return (
                <span style={{ padding: '4px 10px', borderRadius: 99, background: sla.bg, color: sla.color, border: `1.5px solid ${sla.border}`, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> SLA Subsanación: {sla.texto}
                </span>
              );
            })()}
            {proc.resultadoSubsanacion === 'Subsanó' && (
              <span style={{ padding: '4px 10px', borderRadius: 99, background: '#DCFCE7', color: '#15803D', border: '1px solid #16A34A', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> Subsanación Conforme
              </span>
            )}
            {plazoVencido && proc.resultadoSubsanacion === 'Pendiente' && (
              <span style={{ padding: '4px 10px', borderRadius: 99, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #DC2626', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={12} /> Plazo Legal Vencido
              </span>
            )}
            <button
              type="button"
              onClick={ejecutarGuardadoSubsanacion}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 6,
                background: proc.resultadoSubsanacion === 'Subsanó' ? '#16A34A' : proc.resultadoSubsanacion === 'No subsanó' ? '#DC2626' : BL,
                color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {proc.resultadoSubsanacion === 'Subsanó' ? (
                <><span>Guardar y Pasar a Siguiente Etapa</span> <ChevronRight size={13} /></>
              ) : proc.resultadoSubsanacion === 'No subsanó' ? (
                <><span>Guardar y Derivar a Archivo</span> <ChevronRight size={13} /></>
              ) : (
                <span>Guardar Subsanación</span>
              )}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, padding: 14 }}>
          <label style={fieldLabelStyle}>
            FECHA DE OBSERVACIÓN
            <input type="date" value={proc.fechaObservacion || ''} onChange={e => set('fechaObservacion')(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={fieldLabelStyle}>
            FECHA DE NOTIFICACIÓN
            <input
              type="date"
              value={proc.fechaNotificacion || ''}
              onChange={e => {
                const val = e.target.value;
                setProc(curr => ({
                  ...curr,
                  fechaNotificacion: val,
                  fechaLimiteSubsanacion: val ? sumarDiasHabiles(val, curr.ampliacionSubsanacion === 'Sí' ? 10 : 5) : '',
                  proximaAccion: val ? 'Esperar respuesta de subsanación dentro del plazo legal.' : curr.proximaAccion,
                }));
              }}
              style={fieldInputStyle}
            />
          </label>
          <label style={fieldLabelStyle}>
            AMPLIACIÓN DE PLAZO (10 DÍAS)
            <select
              value={proc.ampliacionSubsanacion || 'No'}
              onChange={e => {
                const val = e.target.value;
                setProc(curr => ({
                  ...curr,
                  ampliacionSubsanacion: val,
                  fechaLimiteSubsanacion: curr.fechaNotificacion ? sumarDiasHabiles(curr.fechaNotificacion, val === 'Sí' ? 10 : 5) : '',
                }));
              }}
              style={fieldInputStyle}
            >
              <option value="No">No (Plazo ordinario 5 días)</option>
              <option value="Sí">Sí (Ampliación legal a 10 días)</option>
            </select>
          </label>
          <label style={fieldLabelStyle}>
            FECHA LÍMITE LEGAL
            <input type="date" value={proc.fechaLimiteSubsanacion || ''} readOnly style={{ ...fieldInputStyle, background: plazoVencido ? '#FEE2E2' : '#EFF6FF', fontWeight: 800, color: plazoVencido ? '#991B1B' : BL }} />
          </label>
          <label style={fieldLabelStyle}>
            FECHA DE RESPUESTA
            <input type="date" value={proc.fechaRespuestaSubsanacion || ''} onChange={e => set('fechaRespuestaSubsanacion')(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={fieldLabelStyle}>
            RESULTADO DE LA SUBSANACIÓN
            <select value={proc.resultadoSubsanacion || 'Pendiente'} onChange={e => set('resultadoSubsanacion')(e.target.value)} style={fieldInputStyle}>
              <option value="Pendiente">Pendiente</option>
              <option value="Subsanó">Subsanó (Conforme)</option>
              <option value="Subsanó parcialmente">Subsanó parcialmente</option>
              <option value="No subsanó">No subsanó (Vencido)</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1', ...fieldLabelStyle }}>
            DETALLE Y CONSTANCIAS DE SUBSANACIÓN
            <textarea rows={3} value={proc.detalleSubsanacion || ''} onChange={e => set('detalleSubsanacion')(e.target.value)} style={{ ...fieldInputStyle, resize: 'vertical' }} />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: RETORNO VOLUNTARIO (v2 AUTOMATIZADA CON SLA DE PASAJES) ───

function TabRetorno({
  caso, getVal, onChange, onGuardarProceso
}: {
  caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void;
  onGuardarProceso: (p: ProcesoOperativo, nota?: string, targetTab?: ExpedienteTab) => void;
}) {
  const [proc, setProc] = useState<ProcesoOperativo>(() => caso.procesoOperativo || {
    casoId: caso.id, faseOperativa: 'Retorno voluntario', requisitos: REQ_BASE, estadoRetornoVoluntario: 'Pendiente', propuestaRetorno: '', fechaPrevistaRetorno: '', compromisosRetorno: '', fechaAcuerdo: '', fechaLimitePasajes: '', pasajesRecibidos: 'No', fechaRetornoEfectivo: '',
  });

  useEffect(() => {
    if (caso.procesoOperativo) setProc(caso.procesoOperativo);
  }, [caso.id, caso.procesoOperativo?.updatedAt]);

  const set = (k: keyof ProcesoOperativo) => (v: any) => setProc(curr => ({ ...curr, [k]: v }));

  const ejecutarGuardadoRetorno = () => {
    const resEntrevista = getVal('resultadoEntrevista') || proc.resultadoEntrevista || '';
    const estRetorno = proc.estadoRetornoVoluntario || 'Pendiente';

    let fase = 'Retorno voluntario';
    let accion = '';
    let targetTab: ExpedienteTab = 'retorno';
    let nota = '';

    if (resEntrevista === 'Acepta retorno voluntario' || estRetorno === 'Acuerdo alcanzado') {
      if (proc.fechaRetornoEfectivo) {
        fase = 'Cierre';
        accion = 'Retorno voluntario ejecutado y concretado. Proceder al archivo definitivo del expediente.';
        targetTab = 'cierre';
        nota = `Retorno voluntario EJECUTADO EFECTIVAMENTE con fecha ${fmtFecha(proc.fechaRetornoEfectivo)}. Expediente derivado a Cierre.`;
      } else {
        fase = 'Retorno voluntario';
        accion = 'Esperar remisión de pasajes aéreos y autorizaciones de viaje del solicitante (plazo legal: 1 mes).';
        targetTab = 'retorno';
        nota = 'Acuerdo de retorno voluntario formalizado. Plazo de 1 mes para pasajes activado.';
      }
    } else if (resEntrevista === 'Rechaza retorno' || resEntrevista === 'No asiste' || estRetorno === 'Sin acuerdo') {
      fase = 'Judicial';
      accion = 'Presentar demanda de restitución internacional ante el Juzgado de Familia competente.';
      targetTab = 'judicial';
      nota = `Vía amigable agotada (${resEntrevista || 'Sin acuerdo'}). Se habilita proceso judicial.`;
    } else {
      fase = 'Retorno voluntario';
      accion = 'Convocar a entrevista amigable y evaluar la voluntad de retorno del requerido.';
      targetTab = 'retorno';
      nota = 'Actualización de datos y compromisos del procedimiento de retorno voluntario.';
    }

    const payload: ProcesoOperativo = {
      ...proc,
      faseOperativa: fase,
      proximaAccion: accion,
      fechaEntrevista: getVal('fechaEntrevista'),
      resultadoEntrevista: resEntrevista,
    };

    onGuardarProceso(payload, nota, targetTab);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <b>Entrevista Amigable y Procedimiento de Retorno Voluntario</b>
            <span style={{ display: 'block', fontSize: 10, color: TX3, marginTop: 2 }}>
              Etapa no contenciosa (AC Requerida) según Directiva N.° 006-2021-MIMP.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {proc.fechaLimitePasajes && (() => {
              const sla = calcularSLA(proc.fechaLimitePasajes);
              return (
                <span style={{ padding: '4px 10px', borderRadius: 99, background: sla.bg, color: sla.color, border: `1.5px solid ${sla.border}`, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> Límite Pasajes: {sla.texto}
                </span>
              );
            })()}
            <button
              type="button"
              onClick={ejecutarGuardadoRetorno}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 6,
                background: (getVal('resultadoEntrevista') === 'Acepta retorno voluntario' || proc.estadoRetornoVoluntario === 'Acuerdo alcanzado') ? '#16A34A' : (getVal('resultadoEntrevista') === 'Rechaza retorno' || getVal('resultadoEntrevista') === 'No asiste' || proc.estadoRetornoVoluntario === 'Sin acuerdo') ? '#2563EB' : BL,
                color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {(getVal('resultadoEntrevista') === 'Acepta retorno voluntario' || proc.estadoRetornoVoluntario === 'Acuerdo alcanzado') ? (
                proc.fechaRetornoEfectivo ? (
                  <><span>Retorno Concretado: Pasar a Cierre</span> <ChevronRight size={13} /></>
                ) : (
                  <span>Guardar Acuerdo y Activar Plazo Pasajes</span>
                )
              ) : (getVal('resultadoEntrevista') === 'Rechaza retorno' || getVal('resultadoEntrevista') === 'No asiste' || proc.estadoRetornoVoluntario === 'Sin acuerdo') ? (
                <><span>Agotar Vía Amigable e Iniciar Vía Judicial</span> <ChevronRight size={13} /></>
              ) : (
                <span>Guardar Gestión de Retorno</span>
              )}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, padding: 14 }}>
          <label style={fieldLabelStyle}>
            FECHA DE ENTREVISTA AMIGABLE
            <input type="date" value={getVal('fechaEntrevista') || ''} onChange={e => onChange('fechaEntrevista', e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={fieldLabelStyle}>
            RESULTADO DE LA ENTREVISTA
            <select value={getVal('resultadoEntrevista') || 'Pendiente'} onChange={e => onChange('resultadoEntrevista', e.target.value)} style={fieldInputStyle}>
              {RESULTADO_ENT.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label style={fieldLabelStyle}>
            FECHA DEL ACUERDO
            <input
              type="date"
              value={proc.fechaAcuerdo || ''}
              onChange={e => {
                const val = e.target.value;
                setProc(curr => ({
                  ...curr,
                  fechaAcuerdo: val,
                  fechaLimitePasajes: val ? sumarMes(val) : '',
                }));
              }}
              style={fieldInputStyle}
            />
          </label>
          <label style={fieldLabelStyle}>
            FECHA LÍMITE PASAJES (1 MES LEGAL)
            <input type="date" value={proc.fechaLimitePasajes || ''} readOnly style={{ ...fieldInputStyle, background: '#EFF6FF', fontWeight: 800, color: BL }} />
          </label>
          <label style={fieldLabelStyle}>
            ¿PASAJES Y AUTORIZACIONES RECIBIDOS?
            <select value={proc.pasajesRecibidos || 'No'} onChange={e => set('pasajesRecibidos')(e.target.value)} style={fieldInputStyle}>
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
          </label>
          <label style={fieldLabelStyle}>
            FECHA DE RETORNO EFECTIVO
            <input type="date" value={proc.fechaRetornoEfectivo || ''} onChange={e => set('fechaRetornoEfectivo')(e.target.value)} style={{ ...fieldInputStyle, background: proc.fechaRetornoEfectivo ? '#DCFCE7' : '#fff', fontWeight: proc.fechaRetornoEfectivo ? 800 : 400 }} />
          </label>
          <label style={{ gridColumn: '1 / -1', ...fieldLabelStyle }}>
            COMPROMISOS Y DETALLE DEL ACUERDO
            <textarea rows={3} value={proc.compromisosRetorno || ''} onChange={e => set('compromisosRetorno')(e.target.value)} style={{ ...fieldInputStyle, resize: 'vertical' }} />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: COOPERACIÓN INTERNACIONAL (AC REQUIRENTE) ─────────────────

function TabInternacional({
  caso, onGuardarProceso
}: {
  caso: Caso; onGuardarProceso: (p: ProcesoOperativo, nota?: string, targetTab?: ExpedienteTab) => void;
}) {
  const [proc, setProc] = useState<ProcesoOperativo>(() => caso.procesoOperativo || {
    casoId: caso.id, faseOperativa: 'Gestión internacional', requisitos: REQ_BASE, destinatarioGestion: '', tipoComunicacion: '', fechaEnvio: '', referenciaSgd: '', respuestaEsperada: '', proximaAccion: '', fechaLimite: '', respuestaRecibida: 'No', estadoCooperacion: 'En seguimiento',
  });

  useEffect(() => {
    if (caso.procesoOperativo) setProc(caso.procesoOperativo);
  }, [caso.id, caso.procesoOperativo?.updatedAt]);

  const set = (k: keyof ProcesoOperativo) => (v: any) => setProc(curr => ({ ...curr, [k]: v }));

  const guardarGestion = () => {
    const payload: ProcesoOperativo = {
      ...proc,
      faseOperativa: 'Gestión internacional',
      proximaAccion: proc.respuestaRecibida === 'Sí' ? 'Evaluar la respuesta de la AC extranjera y coordinar con el solicitante.' : 'Realizar seguimiento a la respuesta formal de la AC extranjera.',
    };
    onGuardarProceso(payload, `Actualización de gestión internacional con ${caso.pais}.`, 'internacional');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <b>Gestión y Cooperación Internacional (AC Requirente)</b>
            <span style={{ display: 'block', fontSize: 10, color: TX3, marginTop: 2 }}>
              Coordinación diplomática y con la Autoridad Central de {caso.pais}.
            </span>
          </div>
          <button
            type="button"
            onClick={guardarGestion}
            style={{ padding: '7px 14px', border: 'none', borderRadius: 6, background: BL, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
          >
            Guardar Gestión Internacional
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, padding: 14 }}>
          <label style={fieldLabelStyle}>
            AUTORIDAD CENTRAL DESTINATARIA
            <input value={proc.destinatarioGestion || ''} onChange={e => set('destinatarioGestion')(e.target.value)} placeholder={`Autoridad Central de ${caso.pais}`} style={fieldInputStyle} />
          </label>
          <label style={fieldLabelStyle}>
            TIPO DE COMUNICACIÓN
            <select value={proc.tipoComunicacion || 'Oficio SGD'} onChange={e => set('tipoComunicacion')(e.target.value)} style={fieldInputStyle}>
              <option value="Oficio SGD">Oficio SGD</option>
              <option value="Correo Oficial">Correo Oficial</option>
              <option value="Valija Diplomática (Cancillería)">Valija Diplomática (Cancillería)</option>
              <option value="Nota Consular">Nota Consular</option>
            </select>
          </label>
          <label style={fieldLabelStyle}>
            N.° REFERENCIA / OFICIO SGD
            <input value={proc.referenciaSgd || ''} onChange={e => set('referenciaSgd')(e.target.value)} placeholder="Ej. OFICIO-00234-2026-MIMP" style={fieldInputStyle} />
          </label>
          <label style={fieldLabelStyle}>
            FECHA DE ENVÍO
            <input type="date" value={proc.fechaEnvio || ''} onChange={e => set('fechaEnvio')(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={fieldLabelStyle}>
            FECHA LÍMITE DE RESPUESTA ESPERADA
            <input type="date" value={proc.respuestaEsperada || ''} onChange={e => set('respuestaEsperada')(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={fieldLabelStyle}>
            ¿SE RECIBIÓ RESPUESTA FORMAL?
            <select value={proc.respuestaRecibida || 'No'} onChange={e => set('respuestaRecibida')(e.target.value)} style={fieldInputStyle}>
              <option value="No">No (En espera)</option>
              <option value="Sí">Sí (Respuesta recibida)</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1', ...fieldLabelStyle }}>
            DETALLE DEL ESTADO DE LA COOPERACIÓN
            <textarea rows={3} value={proc.detalleSubsanacion || ''} onChange={e => set('detalleSubsanacion')(e.target.value)} placeholder="Resumen de las gestiones y respuestas de la AC extranjera..." style={{ ...fieldInputStyle, resize: 'vertical' }} />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: PROCESO JUDICIAL ─────────────────────────────────────────

function TabJudicial({
  caso, getVal, onChange, onGuardarHistorialJudicial
}: {
  caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void;
  onGuardarHistorialJudicial: (etapa: string, fecha: string, desc: string) => void;
}) {
  const [nuevaEtapa, setNuevaEtapa] = useState('Demanda presentada');
  const [fechaH, setFechaH] = useState(todayStr());
  const [descH, setDescH] = useState('');

  const esRequirente = getVal('acPeru') === 'Requirente';
  const numExp = getVal('numExpedienteJudicial') || caso.numExpedienteJudicial;

  const agregarH = () => {
    if (!fechaH) return;
    onGuardarHistorialJudicial(nuevaEtapa, fechaH, descH);
    setDescH('');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="main-scroll">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Sec title={esRequirente ? 'Seguimiento Judicial en el Extranjero' : 'Proceso Judicial ante Juzgado de Familia (Perú)'} />
        <Row label="N.° Expediente Judicial" value={getVal('numExpedienteJudicial')} onChange={v => onChange('numExpedienteJudicial', v)} />
        <Row label={esRequirente ? 'Tribunal / Corte Extranjera' : 'Juzgado de Familia'} value={getVal('juzgado')} onChange={v => onChange('juzgado', v)} />
        <Row label="Etapa Procesal Actual" value={getVal('estadoJudicial') || 'Demanda presentada'} type="select" opts={ETAPAS_JUD} onChange={v => onChange('estadoJudicial', v)} />
        <Row label="Fecha de Demanda" value={getVal('fechaDemanda')} type="date" onChange={v => onChange('fechaDemanda', v)} />

        {numExp && (
          <div style={{
            gridColumn: '1 / -1', padding: '10px 16px', background: '#EFF6FF',
            borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#1E3A5F', fontWeight: 600 }}>
              <Scale size={15} color={BL} />
              <span>Expediente Judicial: <b style={{ fontFamily: 'monospace', color: BL }}>{numExp}</b></span>
            </div>
            <button
              type="button"
              onClick={() => window.open('https://cej.pj.gob.pe/cej/forms/busquedaform.html', '_blank', 'noopener,noreferrer')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                background: BL, color: '#fff', border: 'none', borderRadius: 6,
                fontSize: 11, fontWeight: 800, cursor: 'pointer', boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Scale size={13} />
              <span>Ver en CEJ Poder Judicial ↗</span>
            </button>
          </div>
        )}

        <Row label="Sentencia 1ra Instancia" value={getVal('sentencia1ra')} onChange={v => onChange('sentencia1ra', v)} />
        <Row label="Sentencia 2da Instancia" value={getVal('sentencia2da')} onChange={v => onChange('sentencia2da', v)} />
        <Row label="Recurso de Casación" value={getVal('casacion')} span={2} onChange={v => onChange('casacion', v)} />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, fontSize: 11, fontWeight: 800, color: N2 }}>
            REGISTRAR ACTUACIÓN JUDICIAL EN LÍNEA DE TIEMPO
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 10, padding: 14, alignItems: 'flex-end' }}>
            <label style={fieldLabelStyle}>
              ETAPA
              <select value={nuevaEtapa} onChange={e => setNuevaEtapa(e.target.value)} style={fieldInputStyle}>
                {ETAPAS_JUD.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label style={fieldLabelStyle}>
              FECHA
              <input type="date" value={fechaH} onChange={e => setFechaH(e.target.value)} style={fieldInputStyle} />
            </label>
            <label style={fieldLabelStyle}>
              DESCRIPCIÓN / RESOLUCIÓN
              <input value={descH} onChange={e => setDescH(e.target.value)} placeholder="Ej. Notificación de audiencia..." style={fieldInputStyle} />
            </label>
            <button
              type="button"
              onClick={agregarH}
              style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: BL, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', height: 35 }}
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: CIERRE DEL CASO ──────────────────────────────────────────

function TabCierre({
  caso, getVal, onChange, onArchivarCaso
}: {
  caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void; onArchivarCaso: () => void;
}) {
  const estaArchivado = getVal('estado') === 'Archivado';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: estaArchivado ? '#F0FDF4' : '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <b style={{ fontSize: 13, color: estaArchivado ? '#15803D' : N2 }}>Conclusión y Archivo Definitivo del Expediente</b>
            <span style={{ display: 'block', fontSize: 10.5, color: TX3, marginTop: 2 }}>
              Cierre formal según causales normativas de la Directiva N.° 006-2021-MIMP.
            </span>
          </div>
          <button
            type="button"
            onClick={onArchivarCaso}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 6,
              background: '#16A34A', color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <Check size={14} />
            <span>{estaArchivado ? 'Actualizar Cierre' : 'Archivar Expediente (100%)'}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <Row label="Estado del Expediente" value={getVal('estado') || 'Tramite'} type="select" opts={['Tramite', 'Pendiente', 'Archivado']} onChange={v => onChange('estado', v)} />
          <Row label="¿Se Concretó el Retorno?" value={getVal('retorno') || 'NO'} type="select" opts={RETORNO} onChange={v => onChange('retorno', v)} />
          <Row label="Fecha de Salida / Conclusión" value={getVal('fechaSalida') || ''} type="date" onChange={v => onChange('fechaSalida', v)} />
          <Row label="Motivo de Cierre Normativo" value={getVal('motivoCierre')} type="select" opts={MOTIVOS_CIERRE} span={4} onChange={v => onChange('motivoCierre', v)} />
          <Row label="Observaciones Finales y Archivo" value={getVal('observaciones')} type="textarea" span={4} onChange={v => onChange('observaciones', v)} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ORQUESTADOR PRINCIPAL (PÁGINA COMPLETA)
// ══════════════════════════════════════════════════════════════════════

type KpiFilter = 'all' | 'tramite' | 'pendiente' | 'archivado';

export default function SustracionPage() {
  const router = useRouter();
  const { me } = useMe();

  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Caso | null>(null);
  const [pending, setPending] = useState<Partial<Caso>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [fProfesional, setFProfesional] = useState('');
  const [fPais, setFPais] = useState('');
  const [fRolAc, setFRolAc] = useState('');
  const [fTipoSol, setFTipoSol] = useState('');
  const [subBandeja, setSubBandeja] = useState('todos');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>('all');
  const [tab, setTab] = useState<ExpedienteTab>('resumen');
  const [drawer, setDrawer] = useState<'ficha' | 'sgd' | null>(null);
  const [fichaTab, setFichaTab] = useState<'datos' | 'personas' | 'bitacora'>('datos');
  const [showStats, setShowStats] = useState(false);

  // Ordenamiento interactivo de columnas (B.1)
  const [sortField, setSortField] = useState<'codigo' | 'nna' | 'pais' | 'acPeru' | 'fechaIngreso' | 'estado'>('fechaIngreso');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Paginación completa (B.2)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Nuevo caso & Borrador LocalStorage (A.2)
  const [view, setView] = useState<'bandeja' | 'nuevo'>('bandeja');
  const [formNew, setFormNew] = useState<FormCasoInput>(emptyForm());
  const [nnaNew, setNnaNew] = useState<NnaForm[]>([]);
  const [modalNnaForm, setModalNnaForm] = useState<NnaForm>(emptyNnaForm());
  const [modalNnaIndex, setModalNnaIndex] = useState<number>(-2);
  const [savingNew, setSavingNew] = useState(false);
  const [errorNew, setErrorNew] = useState('');
  const [draftInfo, setDraftInfo] = useState<{ form: FormCasoInput; nna: NnaForm[]; savedAt: string } | null>(null);

  const DRAFT_KEY = 'sustracion_borrador_nuevo';

  // Verificar borrador guardado en LocalStorage al entrar a 'nuevo'
  useEffect(() => {
    if (view === 'nuevo') {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.form?.codigo || parsed.form?.pais || (parsed.nna && parsed.nna.length > 0))) {
            setDraftInfo(parsed);
          }
        }
      } catch (e) {
        // Ignore localStorage error
      }
    } else {
      setDraftInfo(null);
    }
  }, [view]);

  // Auto-guardado de borrador en LocalStorage cada vez que cambie el formulario nuevo
  useEffect(() => {
    if (view === 'nuevo') {
      const hasContent = Boolean(
        formNew.codigo || formNew.pais || formNew.solicitanteNombre ||
        formNew.requeridoNombre || formNew.observaciones || nnaNew.length > 0
      );
      if (hasContent) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            form: formNew,
            nna: nnaNew,
            savedAt: new Date().toISOString(),
          }));
        } catch (e) {
          // Ignore localStorage error
        }
      }
    }
  }, [view, formNew, nnaNew]);

  const restaurarBorrador = () => {
    if (draftInfo) {
      setFormNew(draftInfo.form || emptyForm());
      setNnaNew(draftInfo.nna || []);
      setDraftInfo(null);
      toast.success('Borrador recuperado correctamente');
    }
  };

  const descartarBorrador = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
    setDraftInfo(null);
    toast.info('Borrador descartado');
  };

  // Reset de página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, fProfesional, fPais, fRolAc, fTipoSol, subBandeja, kpiFilter, pageSize]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sustracion');
      if (!res.ok) throw new Error('Error al cargar casos de sustracción');
      const data = await res.json();
      const casosList = Array.isArray(data) ? data : [];
      const merged = casosList.map((c: Caso) => {
        try {
          const raw = localStorage.getItem(`proc_sustracion_${c.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            return { ...c, procesoOperativo: parsed };
          }
        } catch {}
        return c;
      });
      setCasos(merged);
    } catch (e: any) {
      toast.error(e.message || 'Error al conectar con la base de datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const getVal = useCallback(
    (field: keyof Caso): string => {
      if (pending[field] !== undefined) {
        const val = pending[field];
        return val === null || val === undefined ? '' : String(val);
      }
      if (selected && selected[field] !== undefined) {
        const val = selected[field];
        return val === null || val === undefined ? '' : String(val);
      }
      return '';
    },
    [pending, selected]
  );

  const onChange = useCallback((field: keyof Caso, value: any) => {
    setPending(prev => ({ ...prev, [field]: value }));
  }, []);

  const hasPending = useMemo(() => Object.keys(pending).length > 0, [pending]);

  const guardar = async () => {
    if (!selected || !hasPending) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/sustracion/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending),
      });
      if (!res.ok) throw new Error('Error al actualizar el expediente');
      const updated = await res.json();
      setCasos(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      setSelected(updated);
      setPending({});
      toast.success('Expediente actualizado correctamente');
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Atajos de teclado: Escape (Esc) y Ctrl+S / Ctrl+Enter (A.4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showStats) {
          setShowStats(false);
        } else if (modalNnaIndex >= -1) {
          setModalNnaIndex(-2);
        } else if (drawer !== null) {
          setDrawer(null);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault();
        if (view === 'nuevo') {
          crearCasoDesdePagina();
        } else if (selected && hasPending && !saving) {
          guardar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStats, modalNnaIndex, drawer, view, selected, hasPending, saving, formNew, nnaNew]);

  const onGuardarProceso = async (proc: ProcesoOperativo, nota?: string, targetTab?: ExpedienteTab) => {
    if (!selected) return;
    try {
      const payload = {
        faseOperativa: proc.faseOperativa,
        evaluacionResultado: proc.evaluacionResultado,
        fechaEntrevista: proc.fechaEntrevista,
        resultadoEntrevista: proc.resultadoEntrevista,
        requisitos: proc.requisitos,
        fechaObservacion: proc.fechaObservacion,
        fechaNotificacion: proc.fechaNotificacion,
        fechaLimiteSubsanacion: proc.fechaLimiteSubsanacion,
        ampliacionSubsanacion: proc.ampliacionSubsanacion,
        fechaRespuestaSubsanacion: proc.fechaRespuestaSubsanacion,
        resultadoSubsanacion: proc.resultadoSubsanacion,
        detalleSubsanacion: proc.detalleSubsanacion,
        destinatarioGestion: proc.destinatarioGestion,
        tipoComunicacion: proc.tipoComunicacion,
        fechaEnvio: proc.fechaEnvio,
        referenciaSgd: proc.referenciaSgd,
        respuestaEsperada: proc.respuestaEsperada,
        proximaAccion: proc.proximaAccion,
        fechaLimite: proc.fechaLimite,
        respuestaRecibida: proc.respuestaRecibida,
        estadoCooperacion: proc.estadoCooperacion,
        estadoRetornoVoluntario: proc.estadoRetornoVoluntario,
        propuestaRetorno: proc.propuestaRetorno,
        fechaPrevistaRetorno: proc.fechaPrevistaRetorno,
        compromisosRetorno: proc.compromisosRetorno,
        fechaAcuerdo: proc.fechaAcuerdo,
        fechaLimitePasajes: proc.fechaLimitePasajes,
        pasajesRecibidos: proc.pasajesRecibidos,
        fechaRetornoEfectivo: proc.fechaRetornoEfectivo,
      };

      const res = await fetch(`/api/sustracion/${selected.id}/proceso-operativo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al actualizar el proceso operativo');

      const procToStore: ProcesoOperativo = {
        ...proc,
        ...payload,
        casoId: selected.id,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(`proc_sustracion_${selected.id}`, JSON.stringify(procToStore));
      } catch (e) {}

      if (nota) {
        await fetch(`/api/sustracion/${selected.id}/bitacora`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha: todayStr(), texto: nota, creadoPor: me?.nombre || (me as any)?.username || 'Usuario' }),
        }).catch(() => null);
      }

      const etapaCalculada = payload.faseOperativa === 'Judicial' ? 'Judicial' : (payload.faseOperativa === 'Cierre' ? 'Cierre' : 'Administrativo');

      setSelected(prev => (prev ? {
        ...prev,
        etapa: etapaCalculada,
        procesoOperativo: procToStore,
      } : null));

      setCasos(prev => prev.map(c => (c.id === selected.id ? {
        ...c,
        etapa: etapaCalculada,
        procesoOperativo: procToStore,
      } : c)));

      toast.success('Proceso operativo actualizado con éxito');
      if (targetTab) setTab(targetTab);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar proceso');
    }
  };

  const onGuardarHistorialJudicial = async (etapa: string, fecha: string, desc: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/sustracion/${selected.id}/judicial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa, fecha, descripcion: desc, creadoPor: me?.nombre || (me as any)?.username || 'Usuario' }),
      });
      if (!res.ok) throw new Error('Error al registrar actuación judicial');
      const nuevaH = await res.json();
      setSelected(prev => (prev ? { ...prev, historialJudicial: [...(prev.historialJudicial || []), nuevaH], estadoJudicial: etapa } : null));
      setCasos(prev => prev.map(c => (c.id === selected.id ? { ...c, estadoJudicial: etapa } : c)));
      toast.success('Actuación judicial registrada');
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar actuación judicial');
    }
  };

  const onAgregarBitacora = async (texto: string) => {
    if (!selected) return;
    const res = await fetch(`/api/sustracion/${selected.id}/bitacora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: todayStr(), texto, creadoPor: me?.nombre || (me as any)?.username || 'Usuario' }),
    });
    if (!res.ok) throw new Error('Error al registrar nota');
    const nuevaB = await res.json();
    setSelected(prev => (prev ? { ...prev, bitacora: [...(prev.bitacora || []), nuevaB] } : null));
    setCasos(prev => prev.map(c => (c.id === selected.id ? { ...c, bitacora: [...(c.bitacora || []), nuevaB] } : c)));
  };

  const onArchivarCaso = async () => {
    if (!selected) return;
    try {
      const fechaSal = getVal('fechaSalida') || todayStr();
      const motivo = getVal('motivoCierre') || 'Conclusión formal del trámite';
      const payload = {
        ...pending,
        estado: 'Archivado',
        fechaSalida: fechaSal,
        motivoCierre: motivo,
      };
      const res = await fetch(`/api/sustracion/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al archivar expediente');
      const updated = await res.json();
      setCasos(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      setSelected(updated);
      setPending({});
      toast.success('Expediente archivado formalmente (100% completado)');
    } catch (e: any) {
      toast.error(e.message || 'Error al archivar');
    }
  };

  const eliminarCaso = async () => {
    if (!selected) return;
    if (!confirm(`¿Estás seguro de eliminar el expediente ${selected.codigo}?`)) return;
    try {
      const res = await fetch(`/api/sustracion/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setCasos(prev => prev.filter(c => c.id !== selected.id));
      setSelected(null);
      toast.success('Expediente eliminado');
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  // Creación de caso nuevo con validación rigurosa
  const crearCasoDesdePagina = async () => {
    if (!formNew.codigo?.trim() || !formNew.pais?.trim() || !formNew.fechaIngreso) {
      setErrorNew('Hoja de Trámite, País y Fecha de Ingreso son campos obligatorios.');
      return;
    }

    const nnaValidos = nnaNew.filter(n => n.nombres?.trim() || n.primerApellido?.trim());
    if (nnaValidos.length === 0) {
      setErrorNew('Debe agregar al menos un menor involucrado (NNA) usando el botón "+ Agregar Menor".');
      return;
    }

    const primerNna = nnaValidos[0];
    const nnaCompleto = nnaValidos.map(n => [n.nombres, n.primerApellido, n.segundoApellido].filter(Boolean).join(' ').trim()).join(' / ');

    setSavingNew(true);
    setErrorNew('');

    try {
      const payload = {
        codigo: formNew.codigo.trim(),
        pais: formNew.pais.trim(),
        fechaIngreso: formNew.fechaIngreso,
        fechaSalida: formNew.fechaSalida || null,
        tipoSolicitud: formNew.tipoSolicitud || 'Restitución',
        acPeru: formNew.acPeru || 'Requerida',
        etapa: formNew.etapa || 'Administrativo',
        profesional: me?.nombre || (me as any)?.username || 'Usuario en sesión',
        estado: 'Tramite',
        solicitanteNombre: formNew.solicitanteNombre?.trim() || null,
        solicitanteSexo: formNew.solicitanteSexo || null,
        solicitanteTelefono: formNew.solicitanteTelefono?.trim() || null,
        solicitanteCorreo: formNew.solicitanteCorreo?.trim() || null,
        solicitanteDomicilio: formNew.solicitanteDomicilio?.trim() || null,
        requeridoNombre: formNew.requeridoNombre?.trim() || null,
        requeridoSexo: formNew.requeridoSexo || null,
        requeridoTelefono: formNew.requeridoTelefono?.trim() || null,
        requeridoCorreo: formNew.requeridoCorreo?.trim() || null,
        requeridoDomicilio: formNew.requeridoDomicilio?.trim() || null,
        observaciones: formNew.observaciones?.trim() || null,
        nnaNombre: nnaCompleto,
        nnanombre: nnaCompleto,
        nnasexo: primerNna.sexo || null,
        nnaedad: primerNna.edad ? String(primerNna.edad) : '',
        nnatipoedad: primerNna.tipoEdad || 'Años',
        nnafechanac: primerNna.fechaNacimiento || '',
        creadoPor: me?.nombre || (me as any)?.username || 'Usuario en sesión',
        nna: nnaValidos,
      };

      const res = await fetch('/api/sustracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Error al registrar el expediente');
      }
      const nuevo = await res.json();
      setCasos(prev => [nuevo, ...prev]);
      setSelected(nuevo);
      setView('bandeja');
      setTab('evaluacion');

      // Limpiar borrador local tras guardado exitoso
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {}
      setDraftInfo(null);

      toast.success(`Expediente ${nuevo.codigo} registrado exitosamente.`);
    } catch (e: any) {
      setErrorNew(e.message || 'Error al crear caso');
      toast.error(e.message || 'Error al crear caso');
    } finally {
      setSavingNew(false);
    }
  };

  const deriveCaseFlow = useCallback((caso: Caso) => {
    const alerts: { tone: 'info' | 'warning' | 'error'; message: string }[] = [];
    const proceso = caso.procesoOperativo;
    const labels = [
      'Evaluación inicial',
      'Subsanación',
      caso.acPeru === 'Requirente' ? 'Cooperación internacional' : 'Retorno voluntario',
      caso.acPeru === 'Requirente' ? 'Seguimiento judicial exterior' : 'Proceso judicial',
      'Cierre de caso',
    ];
    const ids: ExpedienteTab[] = ['evaluacion', 'subsanacion', caso.acPeru === 'Requirente' ? 'internacional' : 'retorno', 'judicial', 'cierre'];
    const closed = caso.estado === 'Archivado' || Boolean(caso.fechaSalida);

    let currentStep = 1;
    let nextAction = 'Completar los 8 requisitos de admisibilidad del Convenio de La Haya.';

    if (closed) {
      currentStep = 5;
      nextAction = 'Expediente archivado formalmente.';
    } else if (caso.etapa === 'Judicial' || (proceso && proceso.faseOperativa === 'Judicial') || caso.estadoJudicial) {
      currentStep = 4;
      nextAction = caso.acPeru === 'Requirente' ? 'Hacer seguimiento al proceso judicial ante tribunales extranjeros.' : 'Seguimiento a la demanda ante el Juzgado de Familia.';
    } else if (proceso && proceso.faseOperativa === 'Subsanación') {
      currentStep = 2;
      nextAction = proceso.proximaAccion || 'Esperar recepción de documentos observados dentro del plazo legal.';
    } else if (proceso && (proceso.faseOperativa === 'Retorno voluntario' || proceso.faseOperativa === 'Gestión internacional')) {
      currentStep = 3;
      nextAction = caso.acPeru === 'Requirente' ? 'Continuar la coordinación con la Autoridad Central extranjera.' : 'Registrar la entrevista y el resultado de la propuesta de retorno.';
    } else if (proceso && proceso.evaluacionResultado === 'Conforme') {
      currentStep = 3;
      nextAction = caso.acPeru === 'Requirente' ? 'Remitir solicitud formal a la AC Extranjera.' : 'Convocar a sesión de entrevista amigable de retorno.';
    }

    const progress = closed ? 100 : Math.round(((currentStep - 1) / 4) * 100);

    return {
      current: { number: currentStep, id: ids[currentStep - 1] || 'resumen', label: labels[currentStep - 1] || 'Evaluación' },
      stages: ids.map((id, idx) => ({
        id,
        number: idx + 1,
        label: labels[idx],
        status: idx + 1 < currentStep ? 'complete' : idx + 1 === currentStep ? 'active' : 'locked',
        note: idx + 1 === 1 ? 'Evaluación de requisitos de admisibilidad' : idx + 1 === 2 ? 'Subsanación de observaciones' : idx + 1 === 3 ? (caso.acPeru === 'Requirente' ? 'SGD / Cancillería' : 'Audiencia no contenciosa') : idx + 1 === 4 ? (caso.acPeru === 'Requirente' ? 'Tribunal exterior' : 'Juzgado de Familia') : 'Resolución y archivo',
      })),
      nextAction,
      progress,
      closed,
      alerts,
    };
  }, []);

  const flows = useMemo(() => {
    const map = new Map<string, any>();
    casos.forEach(c => map.set(c.id, deriveCaseFlow(c)));
    return map;
  }, [casos, deriveCaseFlow]);

  const selectedFlow = useMemo(() => {
    if (!selected) return null;
    return flows.get(selected.id) || deriveCaseFlow(selected);
  }, [selected, flows, deriveCaseFlow]);

  const selectedCaducidad = useMemo(() => {
    if (!selected) return null;
    const nnaList = (selected.nna && selected.nna.length > 0)
      ? selected.nna
      : [{ nombres: selected.nnaNombre || 'Menor', primerApellido: '', fechaNacimiento: selected.nnaFechaNac || (selected as any).nnafechanac, edad: selected.nnaEdad || (selected as any).nnaedad, tipoEdad: selected.nnaTipoEdad || (selected as any).nnatipoedad }];
    for (const n of nnaList) {
      const cad = calcularCaducidadHaya(n.fechaNacimiento, n.edad, n.tipoEdad);
      if (cad?.esInminente) {
        return { nnaNom: nombreNna(n) || 'El menor', ...cad };
      }
    }
    return null;
  }, [selected]);

  const handleKpiSelect = (filterId: KpiFilter) => {
    if (kpiFilter === filterId && filterId !== 'all') {
      setKpiFilter('all');
    } else {
      setKpiFilter(filterId);
      if (filterId === 'archivado') {
        if (subBandeja !== 'todos' && subBandeja !== 'cerrados') {
          setSubBandeja('cerrados');
        }
      } else if (filterId === 'tramite' || filterId === 'pendiente') {
        if (subBandeja === 'cerrados') {
          setSubBandeja('todos');
        }
      }
    }
  };

  const paisesDisponibles = useMemo(() => {
    const set = new Set<string>(PAISES);
    casos.forEach(c => {
      if (c.pais) set.add(c.pais);
    });
    return Array.from(set).sort();
  }, [casos]);

  const visibles = useMemo(() => {
    return casos.filter(c => {
      const txt = search.toLowerCase();
      const nnaStr = nombreCaso(c).toLowerCase();
      const matchTxt = !txt || c.codigo.toLowerCase().includes(txt) || nnaStr.includes(txt) || (c.pais || '').toLowerCase().includes(txt);
      const matchProf = !fProfesional || c.profesional === fProfesional;
      const matchPais = !fPais || c.pais === fPais;
      const matchRol = !fRolAc || c.acPeru === fRolAc;
      const matchTipo = !fTipoSol || c.tipoSolicitud === fTipoSol;

      if (!matchTxt || !matchProf || !matchPais || !matchRol || !matchTipo) return false;

      // Filtro interactivo de KPIs (1-clic)
      if (kpiFilter === 'tramite' && c.estado !== 'Tramite') return false;
      if (kpiFilter === 'pendiente' && c.estado !== 'Pendiente') return false;
      if (kpiFilter === 'archivado' && c.estado !== 'Archivado') return false;

      const f = flows.get(c.id);
      if (subBandeja === 'activos') return c.estado !== 'Archivado';
      if (subBandeja === 'cerrados') return c.estado === 'Archivado';
      if (subBandeja === 'evaluacion') return f && f.current.id === 'evaluacion' && c.estado !== 'Archivado';
      if (subBandeja === 'subsanacion') return f && f.current.id === 'subsanacion' && c.estado !== 'Archivado';
      if (subBandeja === 'retorno') return f && (f.current.id === 'retorno' || f.current.id === 'internacional') && c.estado !== 'Archivado';
      if (subBandeja === 'judicial') return f && f.current.id === 'judicial' && c.estado !== 'Archivado';
      if (subBandeja === 'alerta') {
        const proc = c.procesoOperativo;
        const lim = proc?.fechaLimite || proc?.fechaLimiteSubsanacion || proc?.fechaLimitePasajes;
        const esVencido = lim ? vencido(lim) : false;
        const reloj = calcularRelojLaHaya(c.fechaIngreso);
        const nnaList = (c.nna && c.nna.length > 0) ? c.nna : [{ fechaNacimiento: c.nnaFechaNac || (c as any).nnafechanac, edad: c.nnaEdad || (c as any).nnaedad, tipoEdad: c.nnaTipoEdad || (c as any).nnatipoedad }];
        const tieneCaducidad = nnaList.some(n => calcularCaducidadHaya(n.fechaNacimiento, n.edad, n.tipoEdad)?.esInminente);
        return esVencido || reloj.estado === 'excedido' || tieneCaducidad || (f && f.alerts.some((a: any) => a.tone === 'error'));
      }
      return true;
    });
  }, [casos, search, fProfesional, fPais, fRolAc, fTipoSol, subBandeja, kpiFilter, flows]);

  const handleSort = (field: 'codigo' | 'nna' | 'pais' | 'acPeru' | 'fechaIngreso' | 'estado') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedVisibles = useMemo(() => {
    const list = [...visibles];
    list.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'codigo') {
        valA = (a.codigo || '').toLowerCase();
        valB = (b.codigo || '').toLowerCase();
      } else if (sortField === 'nna') {
        valA = nombreCaso(a).toLowerCase();
        valB = nombreCaso(b).toLowerCase();
      } else if (sortField === 'pais') {
        valA = (a.pais || '').toLowerCase();
        valB = (b.pais || '').toLowerCase();
      } else if (sortField === 'acPeru') {
        valA = (a.acPeru || '').toLowerCase();
        valB = (b.acPeru || '').toLowerCase();
      } else if (sortField === 'fechaIngreso') {
        valA = a.fechaIngreso || '';
        valB = b.fechaIngreso || '';
      } else if (sortField === 'estado') {
        valA = (a.estado || '').toLowerCase();
        valB = (b.estado || '').toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [visibles, sortField, sortOrder]);

  const totalPages = useMemo(() => {
    if (pageSize === 0) return 1;
    return Math.max(1, Math.ceil(sortedVisibles.length / pageSize));
  }, [sortedVisibles.length, pageSize]);

  const safePage = useMemo(() => {
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [currentPage, totalPages]);

  const pagedCasos = useMemo(() => {
    if (pageSize === 0) return sortedVisibles;
    const start = (safePage - 1) * pageSize;
    return sortedVisibles.slice(start, start + pageSize);
  }, [sortedVisibles, safePage, pageSize]);

  const hasActiveFilters = Boolean(
    search || fProfesional || fPais || fRolAc || fTipoSol || subBandeja !== 'todos' || kpiFilter !== 'all'
  );

  const limpiarFiltros = () => {
    setSearch('');
    setFProfesional('');
    setFPais('');
    setFRolAc('');
    setFTipoSol('');
    setSubBandeja('todos');
    setKpiFilter('all');
  };

  const stageCounts = useMemo(() => {
    const baseList = casos.filter(c => {
      const txt = search.toLowerCase();
      const nnaStr = nombreCaso(c).toLowerCase();
      const matchTxt = !txt || c.codigo.toLowerCase().includes(txt) || nnaStr.includes(txt) || (c.pais || '').toLowerCase().includes(txt);
      const matchProf = !fProfesional || c.profesional === fProfesional;
      const matchPais = !fPais || c.pais === fPais;
      const matchRol = !fRolAc || c.acPeru === fRolAc;
      const matchTipo = !fTipoSol || c.tipoSolicitud === fTipoSol;
      return matchTxt && matchProf && matchPais && matchRol && matchTipo;
    });

    let todos = baseList.length;
    let evaluacion = 0;
    let subsanacion = 0;
    let retorno = 0;
    let judicial = 0;
    let cerrados = 0;
    let alerta = 0;

    baseList.forEach(c => {
      const f = flows.get(c.id);
      const isArchived = c.estado === 'Archivado';
      if (isArchived) {
        cerrados++;
      } else {
        if (f?.current?.id === 'evaluacion') evaluacion++;
        else if (f?.current?.id === 'subsanacion') subsanacion++;
        else if (f?.current?.id === 'retorno' || f?.current?.id === 'internacional') retorno++;
        else if (f?.current?.id === 'judicial') judicial++;
      }

      const proc = c.procesoOperativo;
      const lim = proc?.fechaLimite || proc?.fechaLimiteSubsanacion || proc?.fechaLimitePasajes;
      const esVencido = lim ? vencido(lim) : false;
      const reloj = calcularRelojLaHaya(c.fechaIngreso);
      const nnaList = (c.nna && c.nna.length > 0) ? c.nna : [{ fechaNacimiento: c.nnaFechaNac || (c as any).nnafechanac, edad: c.nnaEdad || (c as any).nnaedad, tipoEdad: c.nnaTipoEdad || (c as any).nnatipoedad }];
      const tieneCaducidad = nnaList.some(n => calcularCaducidadHaya(n.fechaNacimiento, n.edad, n.tipoEdad)?.esInminente);
      if (esVencido || reloj.estado === 'excedido' || tieneCaducidad || (f && f.alerts?.some((a: any) => a.tone === 'error'))) {
        alerta++;
      }
    });

    return { todos, evaluacion, subsanacion, retorno, judicial, cerrados, alerta };
  }, [casos, search, fProfesional, fPais, fRolAc, fTipoSol, flows]);

  const kpis: { id: KpiFilter; label: string; value: number; color: string; bgActive: string }[] = useMemo(() => {
    const total = casos.length;
    const enTramite = casos.filter(c => c.estado === 'Tramite').length;
    const pendientes = casos.filter(c => c.estado === 'Pendiente').length;
    const archivados = casos.filter(c => c.estado === 'Archivado').length;
    return [
      { id: 'all', label: 'Total expedientes', value: total, color: N2, bgActive: '#F1F5F9' },
      { id: 'tramite', label: 'En trámite', value: enTramite, color: BL, bgActive: '#EFF6FF' },
      { id: 'pendiente', label: 'Pendientes', value: pendientes, color: '#D97706', bgActive: '#FFFBEB' },
      { id: 'archivado', label: 'Archivados', value: archivados, color: '#16A34A', bgActive: '#F0FDF4' },
    ];
  }, [casos]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: BG, overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* GLOBAL FOCUS STYLES FOR HIGH CONTRAST ACCESSIBILITY (A.1) */}
      <style>{`
        .si-input:focus {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 3.5px rgba(37, 99, 235, 0.22) !important;
          background-color: #FFFFFF !important;
          outline: none !important;
        }
        .si-btn-hover:hover {
          background-color: #EFF6FF !important;
          color: #2563EB !important;
          border-color: #BFDBFE !important;
        }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {view === 'nuevo' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="main-scroll">
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              {/* BANNER DE RECUPERACIÓN DE BORRADOR LOCALSTORAGE (A.2) */}
              {draftInfo && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '12px 18px', background: '#EFF6FF', border: '1.5px solid #BFDBFE',
                  borderRadius: 8, marginBottom: 18, color: '#1E40AF', flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Info size={18} color={BL} />
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      Se encontró un borrador no guardado ({draftInfo.form?.codigo || 'Sin código'} · {fmtFecha(draftInfo.savedAt?.slice(0, 10))}). ¿Deseas restaurarlo?
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={descartarBorrador}
                      style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${BR}`, background: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: TX2 }}
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={restaurarBorrador}
                      style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: BL, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                    >
                      Restaurar Borrador
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => { setView('bandeja'); setErrorNew(''); }}
                    style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${BR}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: TX, margin: 0 }}>Registrar Nuevo Expediente</h1>
                    <p style={{ fontSize: 11, color: TX3, margin: '2px 0 0' }}>Ingreso y apertura de trámite bajo el Convenio de La Haya de 1980 (Ctrl+S / Ctrl+Enter para guardar).</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setView('bandeja'); setErrorNew(''); }}
                    style={{ padding: '8px 16px', borderRadius: 7, border: `1px solid ${BR}`, background: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={crearCasoDesdePagina}
                    disabled={savingNew}
                    title="Guardar expediente (Ctrl+S / Ctrl+Enter)"
                    style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: BL, color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)' }}
                  >
                    {savingNew ? 'Guardando...' : 'Guardar Expediente'}
                  </button>
                </div>
              </div>

              {errorNew && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, color: '#B91C1C', fontSize: 11.5, marginBottom: 16, fontWeight: 700 }}>
                  <AlertCircle size={15} />
                  <span>{errorNew}</span>
                </div>
              )}

              <div style={{ background: '#fff', border: `1px solid ${BR}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <Sec title="1. Datos del Trámite" />
                  <Row label="Hoja de Trámite *" value={formNew.codigo || ''} onChange={v => setFormNew(p => ({ ...p, codigo: v }))} />
                  <Row label="Rol AC Perú" value={formNew.acPeru || 'Requerida'} type="select" opts={AC_PERU} onChange={v => setFormNew(p => ({ ...p, acPeru: v }))} />
                  <Row label={formNew.acPeru === 'Requirente' ? 'País de Destino (Exterior) *' : 'País de Procedencia *'} value={formNew.pais || ''} type="select" opts={PAISES} onChange={v => setFormNew(p => ({ ...p, pais: v }))} />
                  <Row label="Tipo de Solicitud" value={formNew.tipoSolicitud || 'Restitución'} type="select" opts={TIPO_SOL} onChange={v => setFormNew(p => ({ ...p, tipoSolicitud: v }))} />

                  <Row label="Fecha de Ingreso *" value={formNew.fechaIngreso || todayStr()} type="date" span={2} onChange={v => setFormNew(p => ({ ...p, fechaIngreso: v }))} />
                  <div style={{ gridColumn: 'span 2', padding: '10px 14px', borderBottom: `1px solid ${BR}` }}>
                    <label style={fieldLabelStyle}>
                      Profesional que Registra
                      <div style={{ ...fieldInputStyle, background: '#F8FAFC', color: TX, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, cursor: 'default', border: `1.5px solid ${BR}` }}>
                        <User size={13} color={BL} />
                        <span>{me?.nombre || (me as any)?.username || 'Usuario en sesión'}</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ padding: '14px 18px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <b style={{ fontSize: 11, color: N2 }}>2. NIÑA, NIÑO O ADOLESCENTE INVOLUCRADOS</b>
                    <span style={{ display: 'block', fontSize: 10, color: TX3 }}>Debes registrar al menos un menor para dar apertura al expediente</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setModalNnaForm(emptyNnaForm()); setModalNnaIndex(-1); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: BL, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Plus size={13} /> Agregar
                  </button>
                </div>

                <div style={{ padding: 14 }}>
                  {nnaNew.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', background: '#FAFBFD', border: `1.5px dashed ${BR}`, borderRadius: 8, color: TX3, fontSize: 11.5 }}>
                      No se han agregado menores al expediente. Haz clic en <b>«Agregar»</b> arriba.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, background: '#fff', border: `1px solid ${BR}`, borderRadius: 6, overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${BR}`, textAlign: 'left', color: TX3, fontSize: 10, textTransform: 'uppercase' }}>
                          <th style={{ padding: '8px 12px' }}>N.°</th>
                          <th style={{ padding: '8px 12px' }}>Nombre Completo</th>
                          <th style={{ padding: '8px 12px' }}>Sexo</th>
                          <th style={{ padding: '8px 12px' }}>Nacimiento</th>
                          <th style={{ padding: '8px 12px' }}>Edad</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nnaNew.map((n, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${BR}` }}>
                            <td style={{ padding: '9px 12px', color: TX3 }}>{idx + 1}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 700 }}>{nombreNna(n)}</td>
                            <td style={{ padding: '9px 12px' }}>{n.sexo}</td>
                            <td style={{ padding: '9px 12px' }}>{fmtFecha(n.fechaNacimiento)}</td>
                            <td style={{ padding: '9px 12px' }}>{n.edad ? `${n.edad} ${n.tipoEdad || 'Años'}` : '—'}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                              <button type="button" onClick={() => { setModalNnaForm({ ...n }); setModalNnaIndex(idx); }} style={{ border: 'none', background: 'transparent', color: BL, fontWeight: 700, cursor: 'pointer', marginRight: 10 }}>Editar</button>
                              <button type="button" onClick={() => setNnaNew(p => p.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'transparent', color: '#DC2626', fontWeight: 700, cursor: 'pointer' }}>Quitar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* ── BLOQUES 3 Y 4: LADO A LADO (PARTE SOLICITANTE | PARTE REQUERIDA) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  {/* Columna Izquierda: 3. Parte Solicitante */}
                  <div style={{ borderRight: `1px solid ${BR}`, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignContent: 'start' }}>
                    <Sec title="3. Parte Solicitante" />
                    <Row label="Nombres y Apellidos" value={formNew.solicitanteNombre || ''} span={2} onChange={v => setFormNew(p => ({ ...p, solicitanteNombre: v }))} />
                    <Row label="Sexo" value={formNew.solicitanteSexo || ''} type="select" opts={SEXOS} span={1} onChange={v => setFormNew(p => ({ ...p, solicitanteSexo: v }))} />
                    <Row label="Teléfono de Contacto" value={formNew.solicitanteTelefono || ''} span={1} onChange={v => setFormNew(p => ({ ...p, solicitanteTelefono: v }))} />
                    <Row label="Correo Electrónico" value={formNew.solicitanteCorreo || ''} span={2} onChange={v => setFormNew(p => ({ ...p, solicitanteCorreo: v }))} />
                    <Row label="Domicilio" value={formNew.solicitanteDomicilio || ''} span={2} onChange={v => setFormNew(p => ({ ...p, solicitanteDomicilio: v }))} />
                  </div>

                  {/* Columna Derecha: 4. Parte Requerida / Presunto Sustractor */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignContent: 'start' }}>
                    <Sec title={formNew.acPeru === 'Requirente' ? '4. Parte Requerida (En el Exterior)' : '4. Parte Requerida / Presunto Sustractor'} />
                    <Row label="Nombres y Apellidos" value={formNew.requeridoNombre || ''} span={2} onChange={v => setFormNew(p => ({ ...p, requeridoNombre: v }))} />
                    <Row label="Sexo" value={formNew.requeridoSexo || ''} type="select" opts={SEXOS} span={1} onChange={v => setFormNew(p => ({ ...p, requeridoSexo: v }))} />
                    <Row label="Teléfono de Contacto" value={formNew.requeridoTelefono || ''} span={1} onChange={v => setFormNew(p => ({ ...p, requeridoTelefono: v }))} />
                    <Row label="Correo Electrónico" value={formNew.requeridoCorreo || ''} span={2} onChange={v => setFormNew(p => ({ ...p, requeridoCorreo: v }))} />
                    <Row label={formNew.acPeru === 'Requirente' ? 'Domicilio en el Exterior' : 'Domicilio en el Perú'} value={formNew.requeridoDomicilio || ''} span={2} onChange={v => setFormNew(p => ({ ...p, requeridoDomicilio: v }))} />
                  </div>
                </div>

                {/* ── BLOQUE 5: OBSERVACIONES INICIALES (ANCHO COMPLETO) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
                  <Sec title="5. Observaciones Iniciales" />
                  <Row label="Observaciones del Expediente" value={formNew.observaciones || ''} type="textarea" span={1} onChange={v => setFormNew(p => ({ ...p, observaciones: v }))} />
                </div>
              </div>
            </div>
          </div>
        ) : !selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* ── BARRA SUPERIOR INSTITUCIONAL EN BANDEJA PRINCIPAL ── */}
            <header
              style={{
                background: SURF,
                borderBottom: `1px solid ${BR}`,
                padding: '0 24px',
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                zIndex: 30,
              }}
            >
              {/* Left: Navegación & Título Institucional */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => router.push('/menu')}
                  title="Volver al Menú Principal"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    background: '#F8FAFC',
                    color: TX2,
                    border: `1px solid ${BR}`,
                    borderRadius: 8,
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#EFF6FF';
                    e.currentTarget.style.color = BL;
                    e.currentTarget.style.borderColor = '#BFDBFE';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#F8FAFC';
                    e.currentTarget.style.color = TX2;
                    e.currentTarget.style.borderColor = BR;
                  }}
                >
                  <LayoutGrid size={15} />
                  <span>Menú Principal</span>
                </button>

                <div style={{ width: 1, height: 28, background: BR, flexShrink: 0 }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    <Globe size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h1
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: NK,
                        margin: 0,
                        lineHeight: 1.2,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      Sustracción Internacional de Menores
                    </h1>
                    <p
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: TX3,
                        margin: '2px 0 0',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      Autoridad Central de Perú (DGNNA / MIMP) · Convenio de La Haya de 1980
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Estadísticas, Exportar Excel, Nuevo Expediente y Chip de Sesión */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {/* Botón Estadísticas */}
                <button
                  type="button"
                  onClick={() => setShowStats(true)}
                  title="Ver estadísticas y analítica operativa"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#F8FAFC',
                    color: N2,
                    border: `1px solid ${BR}`,
                    borderRadius: 8,
                    padding: '7px 13px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#EFF6FF';
                    e.currentTarget.style.color = BL;
                    e.currentTarget.style.borderColor = '#BFDBFE';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#F8FAFC';
                    e.currentTarget.style.color = N2;
                    e.currentTarget.style.borderColor = BR;
                  }}
                >
                  <BarChart2 size={15} color={BL} />
                  <span>Estadísticas</span>
                </button>

                {/* Botón Exportar Excel */}
                <button
                  type="button"
                  onClick={() => descargarExcelSustracion(sortedVisibles as any)}
                  title="Descargar reporte en formato Excel con los expedientes filtrados"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#F8FAFC',
                    color: TX2,
                    border: `1px solid ${BR}`,
                    borderRadius: 8,
                    padding: '7px 13px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#F0FDF4';
                    e.currentTarget.style.color = '#15803D';
                    e.currentTarget.style.borderColor = '#BBF7D0';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#F8FAFC';
                    e.currentTarget.style.color = TX2;
                    e.currentTarget.style.borderColor = BR;
                  }}
                >
                  <Download size={14} />
                  <span>Exportar Excel</span>
                </button>

                {/* Botón + Nuevo Expediente */}
                <button
                  type="button"
                  onClick={() => {
                    setFormNew(emptyForm());
                    setNnaNew([]);
                    setErrorNew('');
                    setView('nuevo');
                  }}
                  title="Registrar nuevo expediente de sustracción internacional"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: BL,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 15px',
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = BLH;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = BL;
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>+ Nuevo Expediente</span>
                </button>

                <div style={{ width: 1, height: 28, background: BR, margin: '0 2px' }} />

                {/* Identificador del Usuario en Sesión Activa */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#F8FAFC',
                    border: `1px solid ${BR}`,
                    borderRadius: 8,
                    padding: '4px 8px 4px 10px',
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: BL,
                      flexShrink: 0,
                    }}
                  >
                    <User size={13} strokeWidth={2.5} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: TX,
                        maxWidth: 140,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={me?.nombre || (me as any)?.username || 'Usuario'}
                    >
                      {me?.nombre || (me as any)?.username || 'Usuario'}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: me?.rol === 'admin' ? '#1D4ED8' : '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: '.03em',
                      }}
                    >
                      {me?.rol === 'admin' ? 'Administrador' : 'Especialista DGNNA'}
                    </span>
                  </div>

                  {/* Botón de Cierre de Sesión */}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        router.push('/login');
                        router.refresh();
                      } catch {
                        router.push('/login');
                      }
                    }}
                    title="Cerrar sesión"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid transparent',
                      background: 'transparent',
                      color: TX3,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      marginLeft: 2,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#FEE2E2';
                      e.currentTarget.style.color = '#DC2626';
                      e.currentTarget.style.borderColor = '#FECACA';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = TX3;
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              </div>
            </header>

            {/* ── CUERPO PRINCIPAL DE LA BANDEJA ── */}
            <main className="main-scroll si-page" style={{ flex: 1, overflowY: 'auto', background: BG, padding: '20px 24px' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto' }}>

              {/* KPIS EN 4 COLUMNAS HORIZONTALES (INTERACTIVOS 1-CLIC) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
                {kpis.map(item => {
                  const isSelected = kpiFilter === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleKpiSelect(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKpiSelect(item.id); } }}
                      title={`Filtrar por ${item.label} (1-clic)`}
                      style={{
                        background: isSelected ? item.bgActive : SURF,
                        borderTop: isSelected ? `2px solid ${item.color}` : `1px solid ${BR}`,
                        borderRight: isSelected ? `2px solid ${item.color}` : `1px solid ${BR}`,
                        borderBottom: isSelected ? `2px solid ${item.color}` : `1px solid ${BR}`,
                        borderLeft: `4px solid ${item.color}`,
                        borderRadius: 8,
                        padding: '12px 15px',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 4px 12px -2px rgba(0,0,0,0.1)' : '0 1px 2px 0 rgba(0,0,0,0.05)',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: isSelected ? item.color : TX3, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          {item.label}
                        </div>
                        {isSelected && (
                          <span style={{ fontSize: 9, fontWeight: 800, color: item.color, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: 99, border: `1px solid ${item.color}` }}>
                            Filtro Activo
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 23, fontWeight: 800, color: item.color, marginTop: 3 }}>
                        {item.value}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* TOOLBAR SUPERIOR: BUSCADOR Y FILTROS AVANZADOS (B.3) */}
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BR}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: TX3 }} />
                    <input
                      className="si-input"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar por NNA, código o país..."
                      style={{ width: '100%', padding: '7px 11px 7px 30px', border: `1.5px solid ${BR}`, borderRadius: 7, fontSize: 11.5, outline: 'none' }}
                    />
                  </div>

                  {/* Dropdown Filtro País */}
                  <select
                    value={fPais}
                    onChange={e => setFPais(e.target.value)}
                    style={{ padding: '7px 10px', border: `1px solid ${BR}`, borderRadius: 7, fontSize: 11, color: TX2, background: fPais ? '#EFF6FF' : '#fff', fontWeight: fPais ? 700 : 400 }}
                  >
                    <option value="">Todos los Países</option>
                    {paisesDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  {/* Dropdown Filtro Rol AC */}
                  <select
                    value={fRolAc}
                    onChange={e => setFRolAc(e.target.value)}
                    style={{ padding: '7px 10px', border: `1px solid ${BR}`, borderRadius: 7, fontSize: 11, color: TX2, background: fRolAc ? '#EFF6FF' : '#fff', fontWeight: fRolAc ? 700 : 400 }}
                  >
                    <option value="">Todos los Roles AC</option>
                    {AC_PERU.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  {/* Dropdown Filtro Tipo Solicitud */}
                  <select
                    value={fTipoSol}
                    onChange={e => setFTipoSol(e.target.value)}
                    style={{ padding: '7px 10px', border: `1px solid ${BR}`, borderRadius: 7, fontSize: 11, color: TX2, background: fTipoSol ? '#EFF6FF' : '#fff', fontWeight: fTipoSol ? 700 : 400 }}
                  >
                    <option value="">Tipos de Solicitud</option>
                    {TIPO_SOL.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  {/* Dropdown Filtro Especialista */}
                  <select
                    value={fProfesional}
                    onChange={e => setFProfesional(e.target.value)}
                    style={{ padding: '7px 10px', border: `1px solid ${BR}`, borderRadius: 7, fontSize: 11, color: TX2, background: fProfesional ? '#EFF6FF' : '#fff', fontWeight: fProfesional ? 700 : 400 }}
                  >
                    <option value="">Todos los profesionales</option>
                    {PROFESIONALES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  {/* Botón Limpiar Filtros */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={limpiarFiltros}
                      title="Restablecer todos los filtros aplicados"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px',
                        border: '1px solid #FECACA', borderRadius: 7, background: '#FEF2F2',
                        color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>

                {/* SUB-BANDEJAS POR ETAPAS OPERATIVAS */}
                <div style={{ padding: '8px 14px', borderBottom: `1px solid ${BR}`, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', background: '#FAFAFA' }}>
                  {[
                    { id: 'todos', label: 'Todos', count: stageCounts.todos },
                    { id: 'evaluacion', label: '1. Evaluación', count: stageCounts.evaluacion },
                    { id: 'subsanacion', label: '2. Subsanación', count: stageCounts.subsanacion },
                    { id: 'retorno', label: '3. Retorno / Coop.', count: stageCounts.retorno },
                    { id: 'judicial', label: '4. Judicial', count: stageCounts.judicial },
                    { id: 'cerrados', label: '5. Archivados', count: stageCounts.cerrados },
                    { id: 'alerta', label: '⚠️ Con alerta / Caducidad', count: stageCounts.alerta },
                  ].map(({ id, label, count }) => {
                    const active = subBandeja === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSubBandeja(id);
                          if (id === 'cerrados') setKpiFilter('archivado');
                          else if (kpiFilter === 'archivado' && id !== 'todos') setKpiFilter('all');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 10px',
                          borderRadius: 7,
                          border: `1px solid ${active ? BL : BR}`,
                          background: active ? '#EFF6FF' : SURF,
                          color: active ? BL : id === 'alerta' ? '#DC2626' : TX2,
                          fontSize: 10.5,
                          fontWeight: active ? 800 : 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{label}</span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1px 6px',
                            borderRadius: 99,
                            fontSize: 9.5,
                            fontWeight: 800,
                            background: active
                              ? BL
                              : id === 'alerta' && count > 0
                              ? '#FEE2E2'
                              : '#F1F5F9',
                            color: active
                              ? '#FFFFFF'
                              : id === 'alerta' && count > 0
                              ? '#B91C1C'
                              : TX3,
                            minWidth: 18,
                            lineHeight: '14px',
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* TABLA PRINCIPAL CON ORDENAMIENTO INTERACTIVO Y ACCIONES RÁPIDAS (B.1 & B.4) */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1020, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${BR}`, textAlign: 'left' }}>
                        {/* Hoja de Trámite (Ordenable) */}
                        <th
                          onClick={() => handleSort('codigo')}
                          title="Ordenar por Código de Hoja de Trámite"
                          style={{ padding: '10px 12px', fontSize: 9.5, fontWeight: 800, color: sortField === 'codigo' ? BL : TX3, textTransform: 'uppercase', letterSpacing: '.04em', cursor: 'pointer', userSelect: 'none', width: 140 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>Hoja de Trámite</span>
                            {sortField === 'codigo' ? (sortOrder === 'asc' ? <ArrowUp size={12} color={BL} /> : <ArrowDown size={12} color={BL} />) : <ArrowUpDown size={11} color={TX3} />}
                          </div>
                        </th>

                        {/* NNA (Ordenable) */}
                        <th
                          onClick={() => handleSort('nna')}
                          title="Ordenar por Nombre de Menor"
                          style={{ padding: '10px 12px', fontSize: 9.5, fontWeight: 800, color: sortField === 'nna' ? BL : TX3, textTransform: 'uppercase', letterSpacing: '.04em', cursor: 'pointer', userSelect: 'none', minWidth: 220 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>Menor (NNA)</span>
                            {sortField === 'nna' ? (sortOrder === 'asc' ? <ArrowUp size={12} color={BL} /> : <ArrowDown size={12} color={BL} />) : <ArrowUpDown size={11} color={TX3} />}
                          </div>
                        </th>

                        {/* Rol / País (Ordenable) */}
                        <th
                          onClick={() => handleSort('pais')}
                          title="Ordenar por País"
                          style={{ padding: '10px 12px', fontSize: 9.5, fontWeight: 800, color: sortField === 'pais' ? BL : TX3, textTransform: 'uppercase', letterSpacing: '.04em', cursor: 'pointer', userSelect: 'none', width: 150 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>Rol / País</span>
                            {sortField === 'pais' ? (sortOrder === 'asc' ? <ArrowUp size={12} color={BL} /> : <ArrowDown size={12} color={BL} />) : <ArrowUpDown size={11} color={TX3} />}
                          </div>
                        </th>

                        {/* Etapa actual */}
                        <th style={{ padding: '10px 12px', fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em', width: 150 }}>
                          Etapa Actual
                        </th>

                        {/* Fecha de Ingreso (Ordenable) */}
                        <th
                          onClick={() => handleSort('fechaIngreso')}
                          title="Ordenar por Fecha de Ingreso"
                          style={{ padding: '10px 12px', fontSize: 9.5, fontWeight: 800, color: sortField === 'fechaIngreso' ? BL : TX3, textTransform: 'uppercase', letterSpacing: '.04em', cursor: 'pointer', userSelect: 'none', width: 120 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>Ingreso DGNNA</span>
                            {sortField === 'fechaIngreso' ? (sortOrder === 'asc' ? <ArrowUp size={12} color={BL} /> : <ArrowDown size={12} color={BL} />) : <ArrowUpDown size={11} color={TX3} />}
                          </div>
                        </th>

                        {/* Próxima acción */}
                        <th style={{ padding: '10px 12px', fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                          Próxima Acción
                        </th>

                        {/* Avance */}
                        <th style={{ padding: '10px 12px', fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em', width: 100 }}>
                          Avance
                        </th>

                        {/* Acciones Rápidas */}
                        <th style={{ padding: '10px 12px', fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right', width: 90 }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: TX3, fontSize: 12 }}>Cargando expedientes...</td></tr>}
                      {!loading && pagedCasos.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: TX3, fontSize: 12 }}>Sin resultados para los filtros seleccionados.</td></tr>}
                      {!loading && pagedCasos.map(caso => {
                        const flow = flows.get(caso.id) || deriveCaseFlow(caso);
                        const critical = flow.alerts.some((a: any) => a.tone === 'error');
                        const nnaList = (caso.nna && caso.nna.length > 0)
                          ? caso.nna
                          : [{ nombres: caso.nnaNombre || 'Menor', primerApellido: '', fechaNacimiento: caso.nnaFechaNac || (caso as any).nnafechanac, edad: caso.nnaEdad || (caso as any).nnaedad, tipoEdad: caso.nnaTipoEdad || (caso as any).nnatipoedad }];
                        const nnaCount = nnaList.length;
                        const caducidad = nnaList.find(n => calcularCaducidadHaya(n.fechaNacimiento, n.edad, n.tipoEdad)?.esInminente);
                        const cadInfo = caducidad ? calcularCaducidadHaya(caducidad.fechaNacimiento, caducidad.edad, caducidad.tipoEdad) : null;

                        return (
                          <tr
                            key={caso.id}
                            onClick={() => {
                              const procStored = (() => {
                                try {
                                  const raw = localStorage.getItem(`proc_sustracion_${caso.id}`);
                                  return raw ? JSON.parse(raw) : null;
                                } catch { return null; }
                              })();
                              const fullCaso = { ...caso, procesoOperativo: procStored || caso.procesoOperativo };
                              const caseFlow = deriveCaseFlow(fullCaso);
                              setSelected(fullCaso);
                              setPending({});
                              setDrawer(null);
                              setTab(caseFlow.current.id);
                            }}
                            style={{ borderBottom: `1px solid ${BR}`, cursor: 'pointer', transition: 'background-color 0.12s ease' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={e => e.currentTarget.style.background = SURF}
                          >
                            {/* Código con botón de copia 1-clic */}
                            <td style={{ padding: '11px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: N2 }}>
                                  {caso.codigo}
                                </span>
                                <button
                                  type="button"
                                  title="Copiar Hoja de Trámite al portapapeles"
                                  onClick={e => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(caso.codigo);
                                    toast.success(`Código ${caso.codigo} copiado al portapapeles`);
                                  }}
                                  style={{
                                    border: 'none', background: 'transparent', color: TX3, cursor: 'pointer',
                                    padding: '2px 4px', borderRadius: 4, display: 'inline-flex', alignItems: 'center'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.color = BL; e.currentTarget.style.background = '#EFF6FF'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = TX3; e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                            </td>

                            {/* NNA con alerta de caducidad si aplica */}
                            <td style={{ padding: '11px 12px', minWidth: 220 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: TX }}>{nombreCaso(caso)}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: TX3, marginTop: 2, flexWrap: 'wrap' }}>
                                <span>{nnaCount} {nnaCount === 1 ? 'NNA' : 'NNA'}</span>
                                {cadInfo && (
                                  <span style={{ padding: '1px 6px', borderRadius: 4, background: '#FEE2E2', color: '#B91C1C', fontSize: 9.5, fontWeight: 800, border: '1px solid #FECACA' }}>
                                    ⚠️ 15 años ({cadInfo.tiempoStr})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Rol / País */}
                            <td style={{ padding: '11px 12px', color: TX2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                                {caso.acPeru === 'Requirente' ? <Plane size={11} color={BL} /> : <Users size={11} color="#15803D" />}
                                <span style={{ fontWeight: 600 }}>{caso.acPeru || 'Sin rol'}</span>
                              </div>
                              <div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>{caso.pais}</div>
                            </td>

                            {/* Etapa actual */}
                            <td style={{ padding: '11px 12px' }}>
                              <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', padding: '3px 9px', borderRadius: 99, color: flow.closed ? '#15803D' : BL, background: flow.closed ? '#F0FDF4' : '#EFF6FF', border: `1px solid ${flow.closed ? '#BBF7D0' : '#BFDBFE'}`, fontSize: 10, fontWeight: 700 }}>
                                {flow.closed ? 'Cerrado' : `${flow.current.number}. ${flow.current.label}`}
                              </span>
                              {critical && <div style={{ marginTop: 4, color: '#DC2626', fontSize: 10, fontWeight: 700, display: 'flex', gap: 4, alignItems: 'center' }}><AlertTriangle size={10} /> Alerta</div>}
                            </td>

                            {/* Fecha de Ingreso */}
                            <td style={{ padding: '11px 12px', fontSize: 11, color: TX2 }}>
                              {fmtFecha(caso.fechaIngreso)}
                            </td>

                            {/* Próxima Acción */}
                            <td style={{ padding: '11px 12px', maxWidth: 260, fontSize: 11, lineHeight: 1.45, color: TX2 }}>
                              {flow.nextAction}
                            </td>

                            {/* Avance */}
                            <td style={{ padding: '11px 12px', width: 100 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ flex: 1, height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${flow.progress}%`, height: '100%', background: flow.closed ? '#16A34A' : BL }} />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: TX3 }}>{flow.progress}%</span>
                              </div>
                            </td>

                            {/* Acciones Rápidas (B.4) */}
                            <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  type="button"
                                  title="Ver ficha técnica"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelected(caso);
                                    setPending({});
                                    setFichaTab('datos');
                                    setDrawer('ficha');
                                  }}
                                  style={{
                                    border: `1px solid ${BR}`, background: '#fff', color: TX2, padding: '4px 7px',
                                    borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = BL; e.currentTarget.style.color = BL; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = BR; e.currentTarget.style.color = TX2; }}
                                >
                                  <FileText size={12} />
                                </button>
                                <ChevronRight size={14} color={TX3} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* BARRA DE PAGINACIÓN COMPLETA (B.2) */}
                <div style={{
                  padding: '10px 16px', background: '#F8FAFC', borderTop: `1px solid ${BR}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
                }}>
                  {/* Selector de registros por página y total */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: TX3 }}>
                    <span>
                      Mostrando <b>{sortedVisibles.length === 0 ? 0 : (safePage - 1) * (pageSize || sortedVisibles.length) + 1} - {pageSize === 0 ? sortedVisibles.length : Math.min(safePage * pageSize, sortedVisibles.length)}</b> de <b>{sortedVisibles.length}</b> expedientes
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Mostrar:</span>
                      <select
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        style={{ padding: '3px 8px', border: `1px solid ${BR}`, borderRadius: 5, fontSize: 11, background: '#fff', color: TX }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={0}>Todos</option>
                      </select>
                    </div>
                  </div>

                  {/* Controles de Navegación de Páginas */}
                  {pageSize > 0 && totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage(1)}
                        title="Primera página"
                        style={{
                          padding: '4px 8px', border: `1px solid ${BR}`, borderRadius: 5, background: '#fff',
                          color: safePage <= 1 ? '#CBD5E1' : TX, fontSize: 11, fontWeight: 700, cursor: safePage <= 1 ? 'default' : 'pointer'
                        }}
                      >
                        «
                      </button>
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        title="Página anterior"
                        style={{
                          padding: '4px 10px', border: `1px solid ${BR}`, borderRadius: 5, background: '#fff',
                          color: safePage <= 1 ? '#CBD5E1' : TX, fontSize: 11, fontWeight: 700, cursor: safePage <= 1 ? 'default' : 'pointer'
                        }}
                      >
                        Anterior
                      </button>

                      <span style={{ padding: '0 8px', fontSize: 11, fontWeight: 700, color: TX2 }}>
                        Página {safePage} de {totalPages}
                      </span>

                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        title="Página siguiente"
                        style={{
                          padding: '4px 10px', border: `1px solid ${BR}`, borderRadius: 5, background: '#fff',
                          color: safePage >= totalPages ? '#CBD5E1' : TX, fontSize: 11, fontWeight: 700, cursor: safePage >= totalPages ? 'default' : 'pointer'
                        }}
                      >
                        Siguiente
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        title="Última página"
                        style={{
                          padding: '4px 8px', border: `1px solid ${BR}`, borderRadius: 5, background: '#fff',
                          color: safePage >= totalPages ? '#CBD5E1' : TX, fontSize: 11, fontWeight: 700, cursor: safePage >= totalPages ? 'default' : 'pointer'
                        }}
                      >
                        »
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      ) : selectedFlow ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="si-exp-header" style={{ position: 'sticky', top: 0, zIndex: 100, background: SURF, borderBottom: `1px solid ${BR}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexShrink: 0, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <button onClick={() => { setSelected(null); setPending({}); setDrawer(null); }} title="Volver a la bandeja" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${BR}`, background: SURF, color: TX2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  <ArrowLeft size={16} />
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      Expediente · <span style={{ fontFamily: 'monospace' }}>{selected.codigo}</span>
                    </span>
                    {selectedCaducidad && (
                      <span style={{ padding: '2px 7px', borderRadius: 99, background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 9.5, fontWeight: 800 }}>
                        ⚠️ Caducidad La Haya ({selectedCaducidad.tiempoStr})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nombreCaso(selected)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <button onClick={() => { setFichaTab('datos'); setDrawer('ficha'); }} title="Abrir ficha integral del expediente" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 7, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <FileText size={13} /> Ficha
                </button>
                <button onClick={() => setDrawer('sgd')} title="Generar plantillas oficiales SGD" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: BL, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                  <FileCode size={13} /> Plantillas SGD
                </button>

                {selected.numExpedienteJudicial && (
                  <button
                    type="button"
                    onClick={() => window.open('https://cej.pj.gob.pe/cej/forms/busquedaform.html', '_blank', 'noopener,noreferrer')}
                    title="Consultar expediente en el CEJ del Poder Judicial"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                      borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF',
                      color: BL, fontSize: 11, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <Scale size={13} />
                    <span>CEJ Judicial ↗</span>
                  </button>
                )}

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: '#F1F5F9', border: `1px solid ${BR}`, color: TX2, fontSize: 10, fontWeight: 700 }}>
                  {selected.acPeru === 'Requirente' ? <Plane size={10} /> : <Users size={10} />} AC {selected.acPeru || 'sin rol'}
                </span>
                <span style={{ padding: '3px 9px', borderRadius: 99, background: '#F1F5F9', border: `1px solid ${BR}`, color: TX2, fontSize: 10, fontWeight: 700 }}>
                  {selected.pais}
                </span>
                <select value={getVal('estado') || 'Tramite'} onChange={e => onChange('estado', e.target.value)} style={{ padding: '4px 9px', borderRadius: 99, background: estadoBadge(getVal('estado') || 'Tramite').bg, color: estadoBadge(getVal('estado') || 'Tramite').color, border: `1px solid ${estadoBadge(getVal('estado') || 'Tramite').border}`, fontSize: 10, fontWeight: 700 }}>
                  <option value="Tramite">En trámite</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Archivado">Archivado</option>
                </select>
                <button
                  onClick={guardar}
                  disabled={saving || !hasPending}
                  title={hasPending ? "Guardar cambios pendientes en el expediente (Ctrl+S)" : "No hay cambios pendientes por guardar"}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 13px',
                    borderRadius: 7,
                    border: 'none',
                    background: hasPending ? '#16A34A' : '#E2E8F0',
                    color: hasPending ? '#FFFFFF' : TX3,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: hasPending && !saving ? 'pointer' : 'default',
                    boxShadow: hasPending ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Save size={13} /> {saving ? 'Guardando...' : hasPending ? 'Guardar (Ctrl+S)' : 'Guardado'}
                </button>
                <button onClick={eliminarCaso} title="Eliminar expediente" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ background: selectedFlow.alerts.some((a: any) => a.tone === 'error') ? '#FEF2F2' : '#EFF6FF', borderBottom: `1px solid ${selectedFlow.alerts.some((a: any) => a.tone === 'error') ? '#FECACA' : '#BFDBFE'}`, padding: '10px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: SURF, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selectedFlow.alerts.some((a: any) => a.tone === 'error') ? <AlertTriangle size={13} color="#DC2626" /> : <Info size={13} color={BL} />}
                </span>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: selectedFlow.alerts.some((a: any) => a.tone === 'error') ? '#991B1B' : BL, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Próxima acción recomendada
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{selectedFlow.nextAction}</div>
                </div>
              </div>
            </div>

            <div className="si-exp-body" style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
              {/* MENÚ DE ETAPAS DEL EXPEDIENTE */}
              <aside className="main-scroll si-rail" style={{ width: 230, flexShrink: 0, background: SURF, borderRight: `1px solid ${BR}`, padding: '16px 14px', overflowY: 'auto' }}>
                <div style={{ padding: '0 10px 6px', fontSize: 9, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Vista general
                </div>
                <button
                  onClick={() => setTab('resumen')}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', marginBottom: 14,
                    borderRadius: 8, border: `1px solid ${tab === 'resumen' ? '#BFDBFE' : 'transparent'}`,
                    background: tab === 'resumen' ? '#EFF6FF' : 'transparent', color: tab === 'resumen' ? BL : TX2,
                    textAlign: 'left', fontSize: 12, fontWeight: tab === 'resumen' ? 800 : 700, cursor: 'pointer'
                  }}
                >
                  <LayoutGrid size={15} /> Resumen del caso
                </button>

                <div style={{ padding: '0 10px 8px', fontSize: 9, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Etapas del Procedimiento
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase' }}>
                    <span>Avance</span>
                    <span style={{ color: BL }}>{selectedFlow.progress}%</span>
                  </div>
                  <div style={{ height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${selectedFlow.progress}%`, height: '100%', background: selectedFlow.closed ? '#16A34A' : BL }} />
                  </div>
                </div>

                {selectedFlow.stages.map((stage: any, index: number) => {
                  const active = tab === stage.id;
                  const complete = stage.status === 'complete';
                  const locked = stage.status === 'locked';
                  return (
                    <div key={stage.id} style={{ marginBottom: 4 }}>
                      <button
                        onClick={() => setTab(stage.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 11px',
                          borderRadius: 8, border: `1px solid ${active ? '#BFDBFE' : 'transparent'}`,
                          background: active ? '#EFF6FF' : 'transparent', textAlign: 'left', cursor: 'pointer'
                        }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: complete ? '#16A34A' : active ? BL : '#F1F5F9',
                          color: complete || active ? '#fff' : TX3,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0
                        }}>
                          {complete ? <Check size={11} strokeWidth={3} /> : stage.number}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', color: active ? BL : TX, fontSize: 12, fontWeight: active ? 800 : 700 }}>
                            {stage.label}
                          </span>
                          <span style={{ display: 'block', color: TX3, fontSize: 10, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {stage.note}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </aside>

              {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                {tab === 'resumen' && <TabResumen caso={selected} onSelectTab={t => setTab(t)} onAgregarBitacora={onAgregarBitacora} />}
                {tab === 'evaluacion' && <TabEvaluacion caso={selected} onGuardarProceso={onGuardarProceso} />}
                {tab === 'subsanacion' && <TabSubsanacion caso={selected} onGuardarProceso={onGuardarProceso} />}
                {tab === 'retorno' && <TabRetorno caso={selected} getVal={getVal} onChange={onChange} onGuardarProceso={onGuardarProceso} />}
                {tab === 'internacional' && <TabInternacional caso={selected} onGuardarProceso={onGuardarProceso} />}
                {tab === 'judicial' && <TabJudicial caso={selected} getVal={getVal} onChange={onChange} onGuardarHistorialJudicial={onGuardarHistorialJudicial} />}
                {tab === 'cierre' && <TabCierre caso={selected} getVal={getVal} onChange={onChange} onArchivarCaso={onArchivarCaso} />}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* MODAL NNA */}
      <ModalNna
        isOpen={modalNnaIndex >= -1}
        modalNnaForm={modalNnaForm}
        setModalNnaForm={setModalNnaForm}
        modalNnaIndex={modalNnaIndex}
        onSave={() => {
          if (!modalNnaForm.nombres?.trim() || !modalNnaForm.primerApellido?.trim()) {
            toast.error('Debe ingresar al menos Nombres y Primer Apellido del menor');
            return;
          }
          if (view === 'nuevo') {
            if (modalNnaIndex >= 0) {
              setNnaNew(prev => prev.map((item, idx) => (idx === modalNnaIndex ? { ...modalNnaForm } : item)));
            } else {
              setNnaNew(prev => [...prev, { ...modalNnaForm }]);
            }
          } else if (selected) {
            const currentNna = selected.nna || [];
            let updatedNna: NnaForm[];
            if (modalNnaIndex >= 0) {
              updatedNna = currentNna.map((item, idx) => (idx === modalNnaIndex ? { ...modalNnaForm } : item));
            } else {
              updatedNna = [...currentNna, { ...modalNnaForm }];
            }
            setSelected(prev => (prev ? { ...prev, nna: updatedNna } : null));
            setPending(prev => ({ ...prev, nna: updatedNna as any }));
          }
          setModalNnaIndex(-2);
        }}
        onClose={() => setModalNnaIndex(-2)}
      />

      {/* DRAWER PLANTILLAS SGD */}
      {drawer === 'sgd' && selected && <DrawerSGD caso={selected} onClose={() => setDrawer(null)} />}

      {/* DRAWER FICHA CON PESTAÑA DE BITÁCORA */}
      {drawer === 'ficha' && selected && (
        <>
          <div
            onClick={() => setDrawer(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(1.5px)',
              zIndex: 8999,
            }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 720, maxWidth: '95vw',
            background: '#fff', boxShadow: '-10px 0 25px rgba(0,0,0,0.15)', zIndex: 9000,
            display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${BR}`
          }}>
            <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <b style={{ fontSize: 13, color: N2 }}>Ficha del Expediente · {selected.codigo}</b>
                <span style={{ display: 'block', fontSize: 10.5, color: TX3 }}>{nombreCaso(selected)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasPending && (
                  <button onClick={guardar} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 0, background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    <Save size={13} /> Guardar
                  </button>
                )}
                <button type="button" onClick={() => setDrawer(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: TX3 }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: `1px solid ${BR}`, background: '#FAFBFD' }}>
              <button onClick={() => setFichaTab('datos')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${fichaTab === 'datos' ? BL : BR}`, background: fichaTab === 'datos' ? '#EFF6FF' : '#fff', color: fichaTab === 'datos' ? BL : TX2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Datos del caso</button>
              <button onClick={() => setFichaTab('personas')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${fichaTab === 'personas' ? BL : BR}`, background: fichaTab === 'personas' ? '#EFF6FF' : '#fff', color: fichaTab === 'personas' ? BL : TX2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Personas involucradas</button>
              <button onClick={() => setFichaTab('bitacora')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${fichaTab === 'bitacora' ? BL : BR}`, background: fichaTab === 'bitacora' ? '#EFF6FF' : '#fff', color: fichaTab === 'bitacora' ? BL : TX2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Bitácora ({selected.bitacora?.length || 0})</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {fichaTab === 'datos' && <TabDatos caso={selected} getVal={getVal} onChange={onChange} />}
              {fichaTab === 'personas' && <TabPersonas caso={selected} getVal={getVal} onChange={onChange} onOpenNnaModal={idx => { setModalNnaForm(selected.nna?.[idx] ? { ...selected.nna[idx] } : emptyNnaForm()); setModalNnaIndex(idx); }} />}
              {fichaTab === 'bitacora' && <TabBitacora caso={selected} me={me} onAgregarBitacora={onAgregarBitacora} />}
            </div>
          </div>
        </>
      )}

      {/* MODAL ESTADÍSTICAS Y ANALÍTICA OPERATIVA */}
      <ModalEstadisticas
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        casos={casos}
        flows={flows}
      />
    </div>
  );
}
