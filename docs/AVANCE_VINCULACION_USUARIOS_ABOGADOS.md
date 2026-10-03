# Avance: vinculación de usuarios y abogados

Fecha de actualización: 1 de octubre de 2026.

## Objetivo

Vincular cada registro del catálogo de abogados con una cuenta del sistema que tenga acceso al módulo de Apelaciones y rol `abogado`. Con ello, el abogado autenticado puede consultar únicamente los expedientes que le fueron asignados.

## Implementado

### Persistencia Oracle

- Se agregó `ABOGADOS.USUARIOID` como campo opcional.
- Se agregó la restricción única `UQ_ABOGADOS_USUARIOID` para impedir que una cuenta sea vinculada a más de un abogado.
- La migración se ejecuta al iniciar el servicio de apelaciones y falla explícitamente si esta modificación crítica no puede aplicarse.
- No se utiliza SQLite ni otro mecanismo de persistencia alternativo.

### Backend de apelaciones

- La entidad, repositorio y servicio de abogados admiten búsqueda y vinculación por usuario.
- Se incorporaron endpoints para vincular, cambiar y desvincular la cuenta de un abogado.
- Se incorporó el endpoint `/api/abogados/me` para resolver el abogado correspondiente a la sesión actual.
- Solo un administrador puede gestionar la vinculación de cuentas.
- Solo son elegibles usuarios activos, con acceso a Apelaciones y rol `abogado`.
- El JWT se contrasta con el servicio de autenticación en cada solicitud protegida para evitar que permisos antiguos permanezcan vigentes.
- Un abogado solo puede listar y consultar sus propias apelaciones; no puede crear, eliminar, reasignar ni acceder a tableros, reportes o propuestas globales.
- Se registran eventos de auditoría al vincular o desvincular una cuenta.
- Se controla la concurrencia para devolver un error de negocio cuando otro abogado ya usa la cuenta seleccionada.

### Frontend

- Gestión de Abogados muestra el estado `Vinculado` o `Sin usuario`.
- El administrador puede buscar una cuenta elegible y ejecutar `Vincular`, `Cambiar usuario` o `Desvincular`.
- Gestión de Usuarios permite asignar el rol `Abogado` dentro del módulo Apelaciones.
- La bandeja cambia a `Mis apelaciones` cuando ingresa un abogado y oculta el filtro global por abogado y las acciones de escritura.
- Se agregaron proxies de Next.js para los endpoints de vinculación y `/api/abogados/me`.

### Docker y validación

- Se agregó `AUTH_SERVICE_URL=http://auth-service:8001` al servicio de apelaciones.
- Se reconstruyeron y recrearon `apelaciones-service` y `frontend`.
- Los logs confirman la creación de la columna y de la restricción única en Oracle.
- `http://localhost:3000/login`, `http://localhost:8002/health` y `http://localhost/` responden HTTP 200.
- Las pruebas focalizadas de vinculación y asignación aprobaron previamente: 6 pruebas correctas.
- La compilación Docker de Next.js terminó correctamente, incluyendo validación TypeScript.
- La validación final exacta `npx tsc --noEmit` terminó con 0 errores.
- Las 6 pruebas focalizadas se repitieron dentro del contenedor desplegado y aprobaron.

## Pendiente funcional

- Realizar una prueba manual autenticada: crear/asignar rol `abogado`, vincular la cuenta desde Gestión de Abogados e ingresar con dicha cuenta para confirmar que solo visualiza sus expedientes.

## Observaciones conocidas no relacionadas

- La suite global del servicio presenta dos pruebas históricas fallidas relacionadas con `fechaCambioResuelto`; no fueron introducidas por esta funcionalidad.
- Los logs muestran dos avisos antiguos `ORA-01451` al intentar convertir columnas existentes a `NULL`. Son migraciones previas, el proceso continúa y el servicio queda activo.
- Existen cambios previos en el panel de asignación de nueva apelación; no forman parte de esta vinculación y no deben revertirse al continuar este trabajo.

## Flujo operativo esperado

1. Un administrador crea o edita un usuario y le asigna módulo `Apelaciones` con rol `Abogado`.
2. En Configuración > Abogados, el administrador selecciona el registro del abogado y pulsa `Vincular usuario`.
3. El sistema muestra únicamente cuentas elegibles y aún no utilizadas.
4. Al iniciar sesión, el abogado accede a `Mis apelaciones` y el backend restringe los resultados a su identificador de abogado.
