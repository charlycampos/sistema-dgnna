/**
 * Descarga los GeoJSON de límites del Perú (INEI, repo juaneladio/peru-geojson)
 * hacia public/geo/. Ejecutar una sola vez: npm run descargar-geo
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { get } from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const destDir = join(__dirname, '..', 'public', 'geo')
mkdirSync(destDir, { recursive: true })

const BASE = 'https://cdn.jsdelivr.net/gh/juaneladio/peru-geojson@master'
const ARCHIVOS = [
  ['peru_departamental_simple.geojson', 'departamentos.geojson'],
  ['peru_provincial_simple.geojson',    'provincias.geojson'],
  ['peru_distrital_simple.geojson',     'distritos.geojson'],
]

function descargar(url, destino) {
  return new Promise((resolve, reject) => {
    const req = get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return descargar(res.headers.location, destino).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} en ${url}`))
      }
      const out = createWriteStream(destino)
      res.pipe(out)
      out.on('finish', () => out.close(resolve))
      out.on('error', reject)
    })
    req.on('error', reject)
  })
}

console.log('Descargando límites geográficos del Perú...\n')
for (const [remoto, local] of ARCHIVOS) {
  const destino = join(destDir, local)
  if (existsSync(destino) && statSync(destino).size > 10000) {
    console.log(`  ✓ ${local} ya existe, se omite`)
    continue
  }
  process.stdout.write(`  ↓ ${local} ... `)
  await descargar(`${BASE}/${remoto}`, destino)
  const kb = Math.round(statSync(destino).size / 1024)
  console.log(`OK (${kb} KB)`)
}
console.log('\nListo. Archivos en frontend/public/geo/')
