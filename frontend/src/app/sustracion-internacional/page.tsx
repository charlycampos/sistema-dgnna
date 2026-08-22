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
  Calendar, AlertTriangle, UserCheck, Info, Lock, Plane, Users, MinusCircle, Copy, FileCode, Send
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

function estadoBadge(e: string) {
  if (e === 'Tramite') return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'En trámite', accent: BL };
  if (e === 'Pendiente') return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Pendiente', accent: '#D97706' };
  return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Archivado', accent: '#64748B' };
}

// ── UTILIDADES DE FECHA Y TEXTO ────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
    profesional: 'EMMA', estado: 'Tramite',
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
  const safeVal = value === null || value === undefined ? '' : String(value);
  return (
    <div style={{ gridColumn: `span ${span}`, padding: '10px 14px', borderBottom: `1px solid ${BR}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: TX3, textTransform: 'uppercase' }}>{label}</span>
      {type === 'select' ? (
        <select
          className="si-input"
          value={safeVal}
          disabled={disabled}
          onChange={e => onChange?.(e.target.value)}
          style={{ ...fieldInputStyle, background: disabled ? '#F8FAFC' : '#fff' }}
        >
          <option value="">Seleccionar...</option>
          {opts?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          className="si-input"
          value={safeVal}
          disabled={disabled}
          onChange={e => onChange?.(e.target.value)}
          rows={3}
          style={{ ...fieldInputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          className="si-input"
          type={type}
          value={safeVal}
          disabled={disabled}
          onChange={e => onChange?.(e.target.value)}
          style={fieldInputStyle}
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

  const esMayor16 = modalNnaForm.tipoEdad === 'Años' && parseInt(modalNnaForm.edad || '0', 10) >= 16;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        background: SURF, borderRadius: 10, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        width: '100%', maxWidth: 520, border: `1px solid ${BR}`, overflow: 'hidden'
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

          {esMayor16 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              borderRadius: 6, background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', fontSize: 11
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span><b>Alerta Convenio:</b> El menor tiene 16 años o más al momento de la solicitud (Art. 4 Convenio de La Haya).</span>
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
  const [template, setTemplate] = useState<'observaciones' | 'citacion' | 'migraciones' | 'cooperacion' | 'resolucion'>('observaciones');
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

  const plantillas = useMemo(() => ({
    observaciones: {
      titulo: 'Oficio de Observaciones y Subsanación (Directiva 006-2021-MIMP)',
      texto: `OFICIO N.° ____-2026-MIMP/DGNNA-DIPNA\n\nLima, ${hoy}\n\nSeñor(a):\n${solNom}\n${caso.solicitanteDomicilio || 'Domicilio no registrado'}\n\nAsunto: Observaciones a la solicitud de ${caso.tipoSolicitud || 'Restitución Internacional'} respecto del menor ${nnaNom}.\nReferencia: Hoja de Trámite N.° ${cod}\n\nDe mi consideración:\n\nMe dirijo a usted en el marco del Convenio de La Haya de 1980 sobre los Aspectos Civiles de la Sustracción Internacional de Menores y la Directiva N.° 006-2021-MIMP. Al respecto, habiéndose efectuado la evaluación preliminar de admisibilidad de su expediente, se ha determinado que se requiere subsanar los siguientes requisitos:\n\n${listaObsTexto}\n\nEn virtud de lo dispuesto en la normativa vigente, se le otorga un plazo de CINCO (05) DÍAS HÁBILES computados a partir del día siguiente de notificado el presente oficio (fecha límite: ${fechaLim}) para que cumpla con remitir la documentación requerida, bajo apercibimiento de declarar el no acogimiento a trámite y archivo de la solicitud.\n\nSin otro particular, quedo de usted.\n\nAtentamente,\n\n__________________________________\nDirección de Políticas de Niñas, Niños y Adolescentes\nAutoridad Central del Perú - DGNNA / MIMP`,
    },
    citacion: {
      titulo: 'Cédula de Citación a Entrevista Amigable de Retorno',
      texto: `CÉDULA DE CITACIÓN N.° ____-2026-MIMP/DGNNA\n\nLima, ${hoy}\n\nSeñor(a):\n${reqNom}\n${caso.requeridoDomicilio || 'Domicilio en territorio peruano'}\n\nAsunto: Citación a sesión de mediación y propuesta de retorno voluntario.\nExpediente: ${cod} | NNA: ${nnaNom}\n\nPor medio del presente, se le cita a la sesión de entrevista que se llevará a cabo el día ${fechaEnt} en la sede de la Dirección General de Niñas, Niños y Adolescentes (Av. Camaná 616, Lima), con la finalidad de propiciar un acuerdo voluntario y no contencioso sobre la restitución / régimen de visitas del menor en referencia, en salvaguarda de su Interés Superior.\n\nSe le recuerda que el presente procedimiento administrativo es confidencial y busca soluciones amigables previas a la instauración de acciones judiciales.\n\nAtentamente,\n\n__________________________________\nEspecialista Legal de Sustracción Internacional\nDirección General de Niñas, Niños y Adolescentes`,
    },
    migraciones: {
      titulo: 'Oficio de Solicitud de Movimiento Migratorio e Impedimento',
      texto: `OFICIO N.° ____-2026-MIMP/DGNNA-DIPNA\n\nLima, ${hoy}\n\nSeñor(a):\nSUPERINTENDENCIA NACIONAL DE MIGRACIONES\nGerencia de Servicios Migratorios\n\nAsunto: Solicitud urgente de Movimiento Migratorio y Alerta Preventiva.\nReferencia: Hoja de Trámite N.° ${cod}\n\nDe mi mayor consideración:\n\nTengo a bien dirigirme a usted para solicitarle se sirva disponer a quien corresponda la remisión con carácter de MUY URGENTE del Reporte Histórico de Movimiento Migratorio de las siguientes personas:\n\n1. Menor: ${nnaNom}\n2. Progenitor(a) / Requerido(a): ${reqNom}\n\nAsimismo, se solicita activar el control de alerta preventiva de salida del territorio nacional para el menor de edad en mención, de conformidad con el Art. 7 del Convenio de La Haya de 1980.\n\nAtentamente,\n\n__________________________________\nDirección de Políticas de Niñas, Niños y Adolescentes\nAutoridad Central del Perú - MIMP`,
    },
    cooperacion: {
      titulo: 'Oficio de Solicitud de Cooperación a la Autoridad Central Extranjera (AC Requirente)',
      texto: `OFICIO N.° ____-2026-MIMP/DGNNA-AC\n\nLima, ${hoy}\n\nTo / A:\nCENTRAL AUTHORITY OF ${pais.toUpperCase()}\nDepartment of International Child Protection\n\nSubject: Request for International Child Return / Access under 1980 Hague Convention\nCase Ref.: ${cod} | Child: ${nnaNom}\n\nDear Central Authority,\n\nThe Ministry of Women and Vulnerable Populations of Peru (MIMP), acting as Central Authority under the 1980 Hague Convention, hereby transmits the application for the prompt return of the child ${nnaNom}, who was wrongfully removed to / retained in your country.\n\nWe kindly request your valuable assistance in locating the child, preventing further harm, and initiating the appropriate voluntary return or judicial proceedings in accordance with Articles 7, 8, and 9 of the Convention.\n\nPlease find attached the complete dossier and official translations.\n\nSincerely yours,\n\n__________________________________\nCentral Authority of Peru\nDirectorate General for Children and Adolescents (DGNNA - MIMP)`,
    },
    resolucion: {
      titulo: 'Resolución Directoral de Conclusión y Archivo del Trámite',
      texto: `RESOLUCIÓN DIRECTORAL N.° ____-2026-MIMP/DGNNA\n\nLima, ${hoy}\n\nVISTO: El expediente de sustracción internacional de menores correspondiente a la Hoja de Trámite N.° ${cod}, referente al menor ${nnaNom};\n\nCONSIDERANDO:\n\nQue, mediante Directiva N.° 006-2021-MIMP se regulan las actuaciones de la Autoridad Central peruana en el marco de los Convenios Internacionales de Restitución de Menores;\n\nQue, en el presente expediente ha acontecido la causal de conclusión: «${caso.motivoCierre || 'Motivo de archivo'}»;\n\nSE RESUELVE:\n\nArtículo 1.- DECLARAR CONCLUIDO el procedimiento administrativo de ${caso.tipoSolicitud || 'Restitución Internacional'} tramitado bajo el expediente N.° ${cod}.\n\nArtículo 2.- DISPONER EL ARCHIVO DEFINITIVO de los actuados, notificando a las partes y a las entidades pertinentes.\n\nRegístrese, comuníquese y archívese.\n\n__________________________________\nDirección General de Niñas, Niños y Adolescentes\nMIMP`,
    },
  }), [caso, nnaNom, solNom, reqNom, cod, pais, hoy, fechaLim, fechaEnt, listaObsTexto]);

  const handleCopy = () => {
    navigator.clipboard.writeText(plantillas[template].texto);
    setCopied(true);
    toast.success('Plantilla copiada al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, maxWidth: '90vw',
      background: '#fff', boxShadow: '-10px 0 25px rgba(0,0,0,0.15)', zIndex: 9000,
      display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${BR}`
    }}>
      <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <b style={{ fontSize: 13, color: N2 }}>Generador de Plantillas Oficiales SGD</b>
          <span style={{ display: 'block', fontSize: 10.5, color: TX3 }}>Documentos tipo según Directiva N.° 006-2021-MIMP</span>
        </div>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: TX3 }}><X size={18} /></button>
      </div>

      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BR}`, display: 'flex', gap: 6, flexWrap: 'wrap', background: '#FAFBFD' }}>
        {(Object.keys(plantillas) as Array<keyof typeof plantillas>).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setTemplate(k)}
            style={{
              padding: '6px 11px', borderRadius: 6, border: `1px solid ${template === k ? BL : BR}`,
              background: template === k ? '#EFF6FF' : '#fff', color: template === k ? BL : TX2,
              fontSize: 11, fontWeight: template === k ? 800 : 600, cursor: 'pointer'
            }}
          >
            {k === 'observaciones' ? 'Oficio Observación' : k === 'citacion' ? 'Cédula Citación' : k === 'migraciones' ? 'Migraciones' : k === 'cooperacion' ? 'Cooperación Extranjera' : 'Res. Cierre'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: N2, marginBottom: 10 }}>{plantillas[template].titulo}</div>
        <textarea
          readOnly
          value={plantillas[template].texto}
          rows={18}
          style={{ width: '100%', height: 'calc(100% - 30px)', padding: 12, borderRadius: 8, border: `1.5px solid ${BR}`, background: '#F8FAFC', fontSize: 11.5, fontFamily: 'monospace', lineHeight: 1.5, resize: 'none', outline: 'none' }}
        />
      </div>

      <div style={{ padding: '14px 20px', background: '#F8FAFC', borderTop: `1px solid ${BR}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
  );
}

// ── PESTAÑA: RESUMEN DEL CASO (CON RELOJ DE LA HAYA) ──────────────────

function TabResumen({ caso, onSelectTab }: { caso: Caso; onSelectTab: (t: ExpedienteTab) => void }) {
  const proceso = caso.procesoOperativo || { faseOperativa: 'Evaluación', requisitos: REQ_BASE };
  const reqPend = (proceso.requisitos || []).filter(r => r.estado === 'Pendiente' || r.estado === 'Observado').length;
  const fechaLimite = proceso.fechaLimite || proceso.fechaLimiteSubsanacion;
  const plazoVencido = vencido(fechaLimite);
  const b = estadoBadge(caso.estado);
  const ultima = caso.bitacora && caso.bitacora.length > 0 ? caso.bitacora[caso.bitacora.length - 1] : null;

  const relojHaya = useMemo(() => calcularRelojLaHaya(caso.fechaIngreso), [caso.fechaIngreso]);

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
            <SummaryValue label="Proceso Judicial" value={caso.estadoJudicial || 'Sin demanda'} />
            <SummaryValue label="Retorno Concretado" value={caso.retorno || 'Pendiente'} />
            <SummaryValue label="Fecha de Conclusión" value={fmtFecha(caso.fechaSalida)} />
          </div>
        </div>

        {/* NNA Y ÚLTIMA GESTIÓN */}
        <div style={{ gridColumn: '1 / -1', background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
            Menores Involucrados ({caso.nna?.length || 1})
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(caso.nna && caso.nna.length > 0 ? caso.nna : [{ nombres: caso.nnaNombre || 'Sin nombre', primerApellido: '', edad: caso.nnaEdad || '', tipoEdad: caso.nnaTipoEdad || 'Años', sexo: caso.nnaSexo || '' }]).map((n, i) => (
              <div key={i} style={{ padding: '8px 12px', background: '#F8FAFC', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11.5 }}>
                <b>{nombreNna(n)}</b> <span style={{ color: TX3 }}>· {n.edad ? `${n.edad} ${n.tipoEdad || 'Años'}` : 'Edad no reg.'} · {n.sexo || 'Sexo no reg.'}</span>
              </div>
            ))}
          </div>
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
          <b style={{ fontSize: 12, color: N2 }}>MENORES INVOLUCRADOS (NNA)</b>
          <span style={{ display: 'block', fontSize: 10.5, color: TX3 }}>Lista de niños, niñas y adolescentes sujetos a restitución</span>
        </div>
        <button
          type="button"
          onClick={() => onOpenNnaModal(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: BL, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={13} /> Agregar NNA
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Sec title="Parte Solicitante" />
        <Row label="Nombres y Apellidos" value={getVal('solicitanteNombre')} span={2} onChange={v => onChange('solicitanteNombre', v)} />
        <Row label="Sexo" value={getVal('solicitanteSexo')} type="select" opts={SEXOS} onChange={v => onChange('solicitanteSexo', v)} />
        <Row label="Teléfono de Contacto" value={getVal('solicitanteTelefono')} onChange={v => onChange('solicitanteTelefono', v)} />
        <Row label="Correo Electrónico" value={getVal('solicitanteCorreo')} span={2} onChange={v => onChange('solicitanteCorreo', v)} />
        <Row label="Domicilio" value={getVal('solicitanteDomicilio')} span={2} onChange={v => onChange('solicitanteDomicilio', v)} />

        <Sec title={esRequirente ? 'Parte Requerida (En el Exterior)' : 'Parte Requerida / Presunto Sustractor'} />
        <Row label="Nombres y Apellidos" value={getVal('requeridoNombre')} span={2} onChange={v => onChange('requeridoNombre', v)} />
        <Row label="Sexo" value={getVal('requeridoSexo')} type="select" opts={SEXOS} onChange={v => onChange('requeridoSexo', v)} />
        <Row label="Teléfono de Contacto" value={getVal('requeridoTelefono')} onChange={v => onChange('requeridoTelefono', v)} />
        <Row label="Correo Electrónico" value={getVal('requeridoCorreo')} span={2} onChange={v => onChange('requeridoCorreo', v)} />
        <Row label={esRequirente ? 'Domicilio en el Exterior' : 'Domicilio en el Perú'} value={getVal('requeridoDomicilio')} span={2} onChange={v => onChange('requeridoDomicilio', v)} />
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

                {/* Nombre del Requisito */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: isConforme || isObservado ? 700 : 600, color: isObservado ? '#991B1B' : TX, lineHeight: 1.4 }}>
                    {r.nombre}
                  </div>
                </div>

                {/* BOTONERA DE ESTADOS INTERACTIVOS (1 CLIC CON ÍCONO Y TEXTO) */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Botón Conforme */}
                  <button
                    type="button"
                    onClick={() => actualizarRequisito(r.id, 'Completo')}
                    title="Marcar como Conforme"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 6,
                      border: `1.5px solid ${isConforme ? '#16A34A' : '#E2E8F0'}`,
                      background: isConforme ? '#DCFCE7' : '#FFFFFF',
                      color: isConforme ? '#15803D' : TX3,
                      fontSize: 11, fontWeight: isConforme ? 800 : 600,
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <Check size={12} strokeWidth={isConforme ? 3 : 2} />
                    Conforme
                  </button>

                  {/* Botón Observado */}
                  <button
                    type="button"
                    onClick={() => actualizarRequisito(r.id, 'Observado')}
                    title="Marcar como Observado"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 6,
                      border: `1.5px solid ${isObservado ? '#DC2626' : '#E2E8F0'}`,
                      background: isObservado ? '#FEE2E2' : '#FFFFFF',
                      color: isObservado ? '#B91C1C' : TX3,
                      fontSize: 11, fontWeight: isObservado ? 800 : 600,
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <AlertTriangle size={12} strokeWidth={isObservado ? 2.5 : 2} />
                    Observado
                  </button>

                  {/* Botón Pendiente */}
                  <button
                    type="button"
                    onClick={() => actualizarRequisito(r.id, 'Pendiente')}
                    title="Marcar como Pendiente"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 9px', borderRadius: 6,
                      border: `1.5px solid ${isPendiente ? '#64748B' : '#E2E8F0'}`,
                      background: isPendiente ? '#F1F5F9' : '#FFFFFF',
                      color: isPendiente ? '#334155' : TX3,
                      fontSize: 11, fontWeight: isPendiente ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <Clock size={11} />
                    Pendiente
                  </button>

                  {/* Botón No aplica */}
                  <button
                    type="button"
                    onClick={() => actualizarRequisito(r.id, 'No aplica')}
                    title="No aplica a esta solicitud"
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '5px 8px', borderRadius: 6,
                      border: `1.5px solid ${isNoAplica ? '#94A3B8' : '#E2E8F0'}`,
                      background: isNoAplica ? '#E2E8F0' : '#FFFFFF',
                      color: isNoAplica ? '#475569' : TX3,
                      fontSize: 10.5, fontWeight: isNoAplica ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    N/A
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
  const [subBandeja, setSubBandeja] = useState('todos');
  const [tab, setTab] = useState<ExpedienteTab>('resumen');
  const [drawer, setDrawer] = useState<'ficha' | 'sgd' | null>(null);
  const [fichaTab, setFichaTab] = useState<'datos' | 'personas' | 'bitacora'>('datos');

  // Nuevo caso
  const [view, setView] = useState<'bandeja' | 'nuevo'>('bandeja');
  const [formNew, setFormNew] = useState<FormCasoInput>(emptyForm());
  const [nnaNew, setNnaNew] = useState<NnaForm[]>([]);
  const [modalNnaForm, setModalNnaForm] = useState<NnaForm>(emptyNnaForm());
  const [modalNnaIndex, setModalNnaIndex] = useState<number>(-2);
  const [savingNew, setSavingNew] = useState(false);
  const [errorNew, setErrorNew] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sustracion');
      if (!res.ok) throw new Error('Error al cargar casos de sustracción');
      const data = await res.json();
      setCasos(Array.isArray(data) ? data : []);
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

      const res = await fetch(`/api/sustracion/${selected.id}/proceso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al actualizar el proceso operativo');
      const updatedProc = await res.json();

      if (nota) {
        await fetch(`/api/sustracion/${selected.id}/bitacora`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha: todayStr(), texto: nota, creadoPor: me?.nombre || (me as any)?.username || 'Usuario' }),
        });
      }

      await cargar();
      const resUpdated = await fetch(`/api/sustracion/${selected.id}`);
      if (resUpdated.ok) {
        const fullUpdated = await resUpdated.json();
        setSelected(fullUpdated);
      } else {
        setSelected(prev => (prev ? { ...prev, procesoOperativo: updatedProc } : null));
      }

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
        profesional: formNew.profesional || me?.nombre || (me as any)?.username || 'EMMA',
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

  const visibles = useMemo(() => {
    return casos.filter(c => {
      const txt = search.toLowerCase();
      const nnaStr = nombreCaso(c).toLowerCase();
      const matchTxt = !txt || c.codigo.toLowerCase().includes(txt) || nnaStr.includes(txt) || (c.pais || '').toLowerCase().includes(txt);
      const matchProf = !fProfesional || c.profesional === fProfesional;
      if (!matchTxt || !matchProf) return false;

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
        return esVencido || reloj.estado === 'excedido' || (f && f.alerts.some((a: any) => a.tone === 'error'));
      }
      return true;
    });
  }, [casos, search, fProfesional, subBandeja, flows]);

  const counters = useMemo(() => {
    const total = casos.length;
    const enTramite = casos.filter(c => c.estado === 'Tramite').length;
    const pendientes = casos.filter(c => c.estado === 'Pendiente').length;
    const archivados = casos.filter(c => c.estado === 'Archivado').length;
    return [
      { label: 'Total expedientes', value: total, color: N2 },
      { label: 'En trámite', value: enTramite, color: BL },
      { label: 'Pendientes', value: pendientes, color: '#D97706' },
      { label: 'Archivados', value: archivados, color: '#16A34A' },
    ];
  }, [casos]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: BG, overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {view === 'nuevo' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="main-scroll">
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
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
                    <p style={{ fontSize: 11, color: TX3, margin: '2px 0 0' }}>Ingreso y apertura de trámite bajo el Convenio de La Haya de 1980.</p>
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
                    style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: BL, color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
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
                  <Row label="Rol de la Autoridad Central (AC Perú)" value={formNew.acPeru || 'Requerida'} type="select" opts={AC_PERU} onChange={v => setFormNew(p => ({ ...p, acPeru: v }))} />
                  <Row label={formNew.acPeru === 'Requirente' ? 'País de Destino (Exterior) *' : 'País de Procedencia *'} value={formNew.pais || ''} type="select" opts={PAISES} onChange={v => setFormNew(p => ({ ...p, pais: v }))} />
                  <Row label="Tipo de Solicitud" value={formNew.tipoSolicitud || 'Restitución'} type="select" opts={TIPO_SOL} onChange={v => setFormNew(p => ({ ...p, tipoSolicitud: v }))} />

                  <Row label="Fecha de Ingreso *" value={formNew.fechaIngreso || todayStr()} type="date" onChange={v => setFormNew(p => ({ ...p, fechaIngreso: v }))} />
                  <Row label="Especialista Responsable" value={formNew.profesional || 'EMMA'} type="select" opts={PROFESIONALES} onChange={v => setFormNew(p => ({ ...p, profesional: v }))} />
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
                    <b style={{ fontSize: 11, color: N2 }}>2. MENORES INVOLUCRADOS (NNA) *</b>
                    <span style={{ display: 'block', fontSize: 10, color: TX3 }}>Debes registrar al menos un menor para dar apertura al expediente</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setModalNnaForm(emptyNnaForm()); setModalNnaIndex(-1); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: BL, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Plus size={13} /> Agregar Menor
                  </button>
                </div>

                <div style={{ padding: 14 }}>
                  {nnaNew.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', background: '#FAFBFD', border: `1.5px dashed ${BR}`, borderRadius: 8, color: TX3, fontSize: 11.5 }}>
                      No se han agregado menores al expediente. Haz clic en <b>«Agregar Menor»</b> arriba.
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <Sec title="3. Parte Solicitante" />
                  <Row label="Nombres y Apellidos" value={formNew.solicitanteNombre || ''} span={2} onChange={v => setFormNew(p => ({ ...p, solicitanteNombre: v }))} />
                  <Row label="Sexo" value={formNew.solicitanteSexo || ''} type="select" opts={SEXOS} onChange={v => setFormNew(p => ({ ...p, solicitanteSexo: v }))} />
                  <Row label="Teléfono de Contacto" value={formNew.solicitanteTelefono || ''} onChange={v => setFormNew(p => ({ ...p, solicitanteTelefono: v }))} />
                  <Row label="Correo Electrónico" value={formNew.solicitanteCorreo || ''} span={2} onChange={v => setFormNew(p => ({ ...p, solicitanteCorreo: v }))} />
                  <Row label="Domicilio" value={formNew.solicitanteDomicilio || ''} span={2} onChange={v => setFormNew(p => ({ ...p, solicitanteDomicilio: v }))} />

                  <Sec title={formNew.acPeru === 'Requirente' ? '4. Parte Requerida (En el Exterior)' : '4. Parte Requerida / Presunto Sustractor'} />
                  <Row label="Nombres y Apellidos" value={formNew.requeridoNombre || ''} span={2} onChange={v => setFormNew(p => ({ ...p, requeridoNombre: v }))} />
                  <Row label="Sexo" value={formNew.requeridoSexo || ''} type="select" opts={SEXOS} onChange={v => setFormNew(p => ({ ...p, requeridoSexo: v }))} />
                  <Row label="Teléfono de Contacto" value={formNew.requeridoTelefono || ''} onChange={v => setFormNew(p => ({ ...p, requeridoTelefono: v }))} />
                  <Row label="Correo Electrónico" value={formNew.requeridoCorreo || ''} span={2} onChange={v => setFormNew(p => ({ ...p, requeridoCorreo: v }))} />
                  <Row label={formNew.acPeru === 'Requirente' ? 'Domicilio en el Exterior' : 'Domicilio en el Perú'} value={formNew.requeridoDomicilio || ''} span={2} onChange={v => setFormNew(p => ({ ...p, requeridoDomicilio: v }))} />

                  <Sec title="5. Observaciones Iniciales" />
                  <Row label="Observaciones del Expediente" value={formNew.observaciones || ''} type="textarea" span={4} onChange={v => setFormNew(p => ({ ...p, observaciones: v }))} />
                </div>
              </div>
            </div>
          </div>
        ) : !selected ? (
          <main className="main-scroll si-page" style={{ flex: 1, overflowY: 'auto', background: BG, padding: '22px 24px' }}>
            <div style={{ maxWidth: 1240, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: TX, margin: 0 }}>Bandeja de expedientes</h1>
                  <p style={{ fontSize: 11.5, color: TX3, margin: '4px 0 0' }}>Seguimiento del flujo operativo de Sustracción Internacional.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFormNew(emptyForm()); setNnaNew([]); setErrorNew(''); setView('nuevo'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: N2, color: '#fff', border: 0, borderRadius: 8, padding: '9px 15px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus size={13} /> Nuevo expediente
                </button>
              </div>

              {/* KPIS EN 4 COLUMNAS HORIZONTALES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
                {counters.map(item => (
                  <div key={item.label} style={{ background: SURF, border: `1px solid ${BR}`, borderLeft: `3px solid ${item.color}`, borderRadius: 8, padding: '13px 15px' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
                    <div style={{ fontSize: 23, fontWeight: 800, color: item.color, marginTop: 3 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BR}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                    <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: TX3 }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar por NNA o hoja de trámite"
                      style={{ width: '100%', padding: '7px 11px 7px 30px', border: `1px solid ${BR}`, borderRadius: 7, fontSize: 11.5, outline: 'none' }}
                    />
                  </div>
                  <select value={fProfesional} onChange={e => setFProfesional(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${BR}`, borderRadius: 7, fontSize: 11, color: TX2 }}>
                    <option value="">Todos los profesionales</option>
                    {PROFESIONALES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {[
                    ['todos', 'Todos'],
                    ['evaluacion', '1. Evaluación'],
                    ['subsanacion', '2. Subsanación'],
                    ['retorno', '3. Retorno / Coop.'],
                    ['judicial', '4. Judicial'],
                    ['cerrados', '5. Archivados'],
                    ['alerta', '⚠️ Con alerta'],
                  ].map(([id, label]) => {
                    const active = subBandeja === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSubBandeja(id)}
                        style={{
                          padding: '7px 11px', borderRadius: 7,
                          border: `1px solid ${active ? BL : BR}`,
                          background: active ? '#EFF6FF' : SURF,
                          color: active ? BL : id === 'alerta' ? '#DC2626' : TX2,
                          fontSize: 11, fontWeight: active ? 800 : 600,
                          cursor: 'pointer'
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button title="Exportar reporte Excel" onClick={() => descargarExcelSustracion(visibles as any)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', border: `1px solid ${BR}`, borderRadius: 7, background: SURF, color: TX2, fontSize: 11, fontWeight: 600, marginLeft: 'auto', cursor: 'pointer' }}>
                    <Download size={13} /> Exportar
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${BR}`, textAlign: 'left' }}>
                        {['NNA', 'Hoja de trámite', 'Rol / País', 'Etapa actual', 'Próxima acción', 'Avance', ''].map(label => (
                          <th key={label} style={{ padding: '10px 12px', fontSize: 9, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: TX3, fontSize: 12 }}>Cargando expedientes...</td></tr>}
                      {!loading && visibles.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: TX3, fontSize: 12 }}>Sin resultados.</td></tr>}
                      {!loading && visibles.map(caso => {
                        const flow = flows.get(caso.id) || deriveCaseFlow(caso);
                        const critical = flow.alerts.some((a: any) => a.tone === 'error');
                        const nnaCount = caso.nna?.length || 1;
                        return (
                          <tr key={caso.id} onClick={() => { setSelected(caso); setPending({}); setDrawer(null); setTab(flow.current.id); }} style={{ borderBottom: `1px solid ${BR}`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = SURF}>
                            <td style={{ padding: '11px 12px', minWidth: 220 }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{nombreCaso(caso)}</div>
                              <div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>{nnaCount} NNA · ingreso {fmtFecha(caso.fechaIngreso)}</div>
                            </td>
                            <td style={{ padding: '11px 12px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: N2 }}>{caso.codigo}</td>
                            <td style={{ padding: '11px 12px', color: TX2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                                {caso.acPeru === 'Requirente' ? <Plane size={11} /> : <Users size={11} />}
                                {caso.acPeru || 'Sin rol'}
                              </div>
                              <div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>{caso.pais}</div>
                            </td>
                            <td style={{ padding: '11px 12px' }}>
                              <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', padding: '3px 9px', borderRadius: 99, color: flow.closed ? '#15803D' : BL, background: flow.closed ? '#F0FDF4' : '#EFF6FF', border: `1px solid ${flow.closed ? '#BBF7D0' : '#BFDBFE'}`, fontSize: 10, fontWeight: 700 }}>
                                {flow.closed ? 'Cerrado' : `${flow.current.number}. ${flow.current.label}`}
                              </span>
                              {critical && <div style={{ marginTop: 4, color: '#DC2626', fontSize: 10, fontWeight: 700, display: 'flex', gap: 4, alignItems: 'center' }}><AlertTriangle size={10} /> Alerta</div>}
                            </td>
                            <td style={{ padding: '11px 12px', maxWidth: 270, fontSize: 11, lineHeight: 1.45, color: TX2 }}>{flow.nextAction}</td>
                            <td style={{ padding: '11px 12px', width: 115 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ flex: 1, height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${flow.progress}%`, height: '100%', background: flow.closed ? '#16A34A' : BL }} />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: TX3 }}>{flow.progress}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '11px 12px', textAlign: 'right' }}><ChevronRight size={14} color={TX3} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        ) : selectedFlow ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="si-exp-header" style={{ background: SURF, borderBottom: `1px solid ${BR}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <button onClick={() => { setSelected(null); setPending({}); setDrawer(null); }} title="Volver a la bandeja" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${BR}`, background: SURF, color: TX2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  <ArrowLeft size={16} />
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Expediente · <span style={{ fontFamily: 'monospace' }}>{selected.codigo}</span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nombreCaso(selected)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <button onClick={() => { setFichaTab('datos'); setDrawer('ficha'); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <FileText size={13} /> Ficha
                </button>
                <button onClick={() => setDrawer('sgd')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: BL, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                  <FileCode size={13} /> Plantillas SGD
                </button>
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
                {hasPending && (
                  <button onClick={guardar} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: 0, background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    <Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                )}
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
                {tab === 'resumen' && <TabResumen caso={selected} onSelectTab={t => setTab(t)} />}
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
      )}
    </div>
  );
}
