import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface Appellant {
  tipo: 'natural' | 'institucion';
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  documento?: string;
  institucion?: string;
}

export function serializeAppellants(appellants: Appellant[]): string {
  return appellants.map(app => {
    if (app.tipo === 'natural') {
      const parts = [
        app.nombres?.trim() || '',
        app.apellidoPaterno?.trim() || '',
        app.apellidoMaterno?.trim() || '',
        app.documento?.trim() || ''
      ];
      return `[P. Natural] ${parts.join(' | ')}`;
    } else {
      return `[Institución] ${app.institucion?.trim() || ''}`;
    }
  }).join(' ; ');
}

export function deserializeAppellants(str: string): Appellant[] {
  if (!str) return [{ tipo: 'natural', nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '' }];
  
  const parts = str.split(' ; ');
  const appellants: Appellant[] = [];
  
  for (const part of parts) {
    if (part.startsWith('[P. Natural] ')) {
      const content = part.substring('[P. Natural] '.length);
      const fields = content.split(' | ');
      appellants.push({
        tipo: 'natural',
        nombres: fields[0] || '',
        apellidoPaterno: fields[1] || '',
        apellidoMaterno: fields[2] || '',
        documento: fields[3] || '',
      });
    } else if (part.startsWith('[Institución] ')) {
      const content = part.substring('[Institución] '.length);
      appellants.push({
        tipo: 'institucion',
        institucion: content || '',
      });
    } else {
      // Legacy data fallback: try to detect if it looks like an institution or personal name, or default to personal name
      const trimmed = part.trim();
      if (!trimmed) continue;
      appellants.push({
        tipo: 'natural',
        nombres: trimmed,
        apellidoPaterno: '',
        apellidoMaterno: '',
        documento: '',
      });
    }
  }
  
  return appellants.length > 0 ? appellants : [{ tipo: 'natural', nombres: '', apellidoPaterno: '', apellidoMaterno: '', documento: '' }];
}

export interface NnaCarItem {
  tipo: 'natural' | 'institucion';
  nombres?: string;
  primerApellido?: string;
  segundoApellido?: string;
  edad?: string;
  institucion?: string;
}

export function serializeNnaCar(items: NnaCarItem[]): string {
  return items.map(item => {
    if (item.tipo === 'natural') {
      const parts = [
        item.nombres?.trim() || '',
        item.primerApellido?.trim() || '',
        item.segundoApellido?.trim() || '',
        item.edad?.trim() || ''
      ];
      return `[NNA] ${parts.join(' | ')}`;
    } else {
      return `[CAR] ${item.institucion?.trim() || ''}`;
    }
  }).join(' ; ');
}

export function deserializeNnaCar(str: string): NnaCarItem[] {
  if (!str) return [{ tipo: 'natural', nombres: '', primerApellido: '', segundoApellido: '', edad: '' }];
  
  const parts = str.split(' ; ');
  const items: NnaCarItem[] = [];
  
  for (const part of parts) {
    if (part.startsWith('[NNA] ')) {
      const content = part.substring('[NNA] '.length);
      const fields = content.split(' | ');
      items.push({
        tipo: 'natural',
        nombres: fields[0] || '',
        primerApellido: fields[1] || '',
        segundoApellido: fields[2] || '',
        edad: fields[3] || '',
      });
    } else if (part.startsWith('[CAR] ')) {
      const content = part.substring('[CAR] '.length);
      items.push({
        tipo: 'institucion',
        institucion: content || '',
      });
    } else {
      // Legacy fallback
      const trimmed = part.trim();
      if (!trimmed) continue;
      items.push({
        tipo: 'institucion',
        institucion: trimmed,
      });
    }
  }
  
  return items.length > 0 ? items : [{ tipo: 'natural', nombres: '', primerApellido: '', segundoApellido: '', edad: '' }];
}


