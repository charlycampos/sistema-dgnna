// Lista oficial de procedencias - DGNNA
// Incluye UPEs (26), Adopciones y Acogimiento Familiar
export const UPES = [
  // UPEs por región
  'UPE AMAZONAS',
  'UPE ANCASH',
  'UPE APURIMAC',
  'UPE AREQUIPA',
  'UPE AYACUCHO',
  'UPE CAJAMARCA',
  'UPE CUSCO',
  'UPE HUANCAVELICA',
  'UPE HUÁNUCO',
  'UPE ICA',
  'UPE JUNIN',
  'UPE LA LIBERTAD',
  'UPE LAMBAYEQUE',
  'UPE LIMA',
  'UPE LIMA ESTE',
  'UPE LIMA NORTE',
  'UPE LIMA SUR',
  'UPE LORETO',
  'UPE MADRE DE DIOS',
  'UPE MOQUEGUA',
  'UPE PIURA',
  'UPE PUNO',
  'UPE SAN MARTIN',
  'UPE TACNA',
  'UPE TUMBES',
  'UPE UCAYALI',
  // Otras procedencias
  'ADOPCIONES',
  'ACOGIMIENTO FAMILIAR',
] as const

export type UPE = typeof UPES[number]
