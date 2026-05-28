import os

page_path = 'd:/Usuarios/ccampos/Documents/Python Scripts/asigna_apelaciones/sistema-dgnna/frontend/src/app/sustracion-internacional/page.tsx'

with open(page_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. TOKENS
tokens = """// ── TOKENS ─────────────────────────────────────────────────────────────
const NK='#111827', N2='#1E3A5F', BL='#2563EB', BLH='#1D4ED8';
const SURF='#FFFFFF', BG='#F9FAFB', BR='#E2E8F0';
const TX='#0F172A', TX2='#475569', TX3='#94A3B8';

// ── Constantes ─────────────────────────────────────────────────────────"""
content = content.replace('// ── Constantes ─────────────────────────────────────────────────────────', tokens)

# 2. estadoBadge
old_badge = """function estadoBadge(estado: string) {
  switch (estado) {
    case 'Tramite':   return { bg:'#EFF6FF', color:'#1D4ED8', border:'#BFDBFE', label:'En trámite' }
    case 'Pendiente': return { bg:'#FFFBEB', color:'#92400E', border:'#FDE68A', label:'Pendiente' }
    case 'Archivado': return { bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', label:'Archivado' }
    default:          return { bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', label:estado }
  }
}"""
new_badge = """function estadoBadge(estado: string) {
  switch (estado) {
    case 'Tramite':   return { bg:'#EFF6FF', color:'#1D4ED8', border:'#BFDBFE', label:'En trámite', accent:'#2563EB' }
    case 'Pendiente': return { bg:'#FFFBEB', color:'#92400E', border:'#FDE68A', label:'Pendiente', accent:'#D97706' }
    case 'Archivado': return { bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', label:'Archivado', accent:'#64748B' }
    default:          return { bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', label:estado, accent:'#64748B' }
  }
}"""
content = content.replace(old_badge, new_badge)

# We will apply the changes directly manually from here since we need full replacements.
with open(page_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Tokens and badge applied")
