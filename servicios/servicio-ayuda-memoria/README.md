# Servicio Ayuda Memoria

Microservicio autónomo para el esquema Oracle `AYUDA_MEMORIA_DB`, puerto `8013`. Conserva las rutas `/api/ayuda-memoria/*` del backend monolítico.

1. Crear el usuario con `scripts/000_create_user_oracle.sql`, usando una contraseña segura, tablespace y cuota aprobados por OGTI.
2. Ejecutar `scripts/001_schema_oracle.sql` conectado como `AYUDA_MEMORIA_DB` sobre un esquema nuevo.
3. Ejecutar `scripts/002_alter_oracle.sql` (mismo usuario) para agregar las columnas de
   aprobación, sellado y versionado de documentos y el ciclo de vida de plantillas. Es
   idempotente: puede reejecutarse sin efecto si las columnas ya existen.
4. Ejecutar `scripts/verify_schema.sql` y confirmar las seis tablas, restricciones, índices y objetos válidos.
5. Configurar `DATABASE_URL` y `SESSION_SECRET` a partir de `.env.example`.
6. Iniciar con `uvicorn main:app --host 0.0.0.0 --port 8013`.
7. Verificar `/health/ready` y ejecutar `POST /api/ayuda-memoria/seed` como administrador.

La siembra no ocurre al arrancar: debe solicitarla un administrador después de validar readiness. SQLite se rechaza salvo cuando `TESTING=true`.

## Permisos del flujo de revisión

`/observar`, `/aprobar` y `/publicar` los puede ejecutar un administrador o cualquier
usuario con el módulo **Ayuda Memoria** asignado en rol **Solo Consulta** desde
Gestión de Usuarios (`{"modulo": "ayuda-memoria", "rolModulo": "directora"}` en el
token) — es la misma convención registrador=escritura / directora=supervisión que ya
usa el resto de módulos del sistema. También se reconoce `"revisor"`/`"director"`
literal por si algún emisor de token futuro los usa así.

El token de `servicio-auth` ya trae `direccion` (DPE | DA | DSLD | DPNNA | DGNNA, o
vacío) desde el 14-sep-2026; el acceso por dirección en `tiene_acceso_direccion` y el
filtro de `GET /documentos` la usan cuando está presente.
