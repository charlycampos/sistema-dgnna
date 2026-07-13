# Servicio Mapa Interactivo — Puerto 8008

Microservicio de cobertura territorial de instituciones (UPE, CAR, DEMUNA, etc.)
por departamento, provincia y distrito (códigos UBIGEO del INEI).

## Puesta en marcha (una sola vez)

1. **Crear el usuario Oracle** — ejecutar como SYSTEM:

   ```sql
   CREATE USER mapa_db IDENTIFIED BY Mapa2026;
   GRANT DBA TO mapa_db;
   ```

   (También está en `infrastructure/db/crear_schema_oracle.sql`.)

2. **Iniciar el servicio**: doble clic en `iniciar.bat` (o vía `servicios/iniciar-todo.bat`).
   Al primer arranque crea las tablas y carga automáticamente:
   - Catálogo UBIGEO completo (25 departamentos, 196 provincias, 1,874 distritos)
   - Las 25 UPE del MIMP con su ámbito de competencia (644 relaciones distrito-UPE),
     según el documento oficial "Encuentra la UPE más cercana"
   - Las 1,892 DEMUNAs del padrón MIMP (cada una cubre su distrito), con campo
     de acreditación: 844 Acreditadas, 870 No acreditadas y 178 Inoperativas
     (estas últimas se cargan con estado "inactivo" y no pintan cobertura)

3. **Frontend** (carpeta `frontend`, una sola vez):

   ```bash
   npm install          # instala leaflet
   npm run descargar-geo  # descarga los límites del Perú a public/geo/
   ```

4. **Permisos**: en Gestión de Usuarios, asignar el módulo "Mapa Interactivo"
   a los usuarios que corresponda (rol registrador = puede editar el mantenedor).

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/mapa/cobertura?tipo=` | Datos consolidados para pintar el mapa |
| GET | `/api/mapa/instituciones` | Lista de instituciones (mantenedor) |
| POST/PUT/DELETE | `/api/mapa/instituciones[/{id}]` | CRUD (cobertura = lista de ubigeos) |
| GET | `/api/mapa/ubigeo/departamentos` · `/provincias?dep=` · `/distritos?dep=&prov=` | Catálogo en cascada |
| GET | `/api/mapa/tipos` | Tipos de institución existentes |

## Notas

- La cobertura se registró a nivel provincia completa según el documento MIMP,
  salvo Lima Metropolitana (dividida entre 4 UPE) y Maynas (solo 6 distritos).
  Pachacámac figura cubierto por UPE Lima Este y UPE Lima Sur a la vez.
- Los límites geográficos (GeoJSON, INEI-2007) no incluyen distritos creados
  después de 2007 (p. ej. Mi Perú, Veintiséis de Octubre); esos distritos
  cuentan en las estadísticas pero no se dibujan como polígono.
- El dataset UBIGEO traía dos errores corregidos en el seed: provincia 1608
  renombrada a Putumayo y provincia Bagua con código corregido a 0102.
