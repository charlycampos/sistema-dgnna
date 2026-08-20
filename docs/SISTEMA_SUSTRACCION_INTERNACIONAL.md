# Sistema de Sustraccion Internacional

## 1. Objetivo del sistema

El sistema permite registrar, consultar y dar seguimiento operativo a los casos
de sustraccion internacional atendidos por la DGNNA.

Su objetivo no es digitalizar literalmente el Excel ni reemplazar al SGD. La
matriz define la informacion minima que debe conservarse, mientras que el sistema
organiza esa informacion dentro de un expediente de trabajo.

## 2. Principios funcionales acordados

1. Los datos, campos y opciones existentes en la matriz se conservan.
2. Un caso puede incluir uno o varios NNA, por ejemplo hermanos.
3. Todo caso debe conservar al menos un NNA.
4. El SGD permanece fuera del sistema y no existira integracion.
5. La Hoja de Tramite se registra como referencia documental.
6. El profesional se obtiene del usuario del sistema que registra el caso.
7. Los datos pueden completarse y actualizarse posteriormente.
8. El sistema separa recepcion, evaluacion, subsanacion, gestion internacional,
   retorno voluntario, proceso judicial y cierre.
9. El historial permite conocer que ocurrio, cuando y quien lo registro.
10. El Excel se mantiene como referencia para migracion, exportacion y control de
    cobertura, pero no determina la experiencia de usuario.

## 3. Navegacion general

El modulo utiliza dos niveles principales:

```text
Bandeja de casos
      |
      +----> Nuevo caso
      |
      +----> Abrir expediente
                  |
                  +----> Resumen del caso
                  +----> Datos del caso
                  +----> Personas involucradas
                  +----> Evaluacion inicial
                  +----> Requisitos y subsanacion
                  +----> Gestion internacional
                  +----> Retorno voluntario
                  +----> Historial de gestion
                  +----> Proceso judicial
                  +----> Cierre del caso
```

## 4. Bandeja de casos

La bandeja es la pantalla inicial del modulo. Reemplaza la antigua lista lateral
como punto principal de trabajo.

### 4.1 Bandejas operativas

- Todos.
- Por revisar.
- Subsanacion.
- Esperando respuesta.
- Retorno voluntario.
- Judiciales.
- Plazos vencidos.
- Cerrados.

Cada bandeja muestra su cantidad y filtra los expedientes segun la fase, el
estado de respuesta o el vencimiento registrado.

### 4.2 Indicadores

- Casos registrados.
- Casos en tramite.
- Casos pendientes.
- Casos archivados.

### 4.3 Herramientas

- Busqueda por nombre de NNA o Hoja de Tramite.
- Filtro por estado.
- Filtro por profesional.
- Filtro por pais.
- Rango de fechas de ingreso.
- Limpieza de filtros.
- Exportacion de resultados.
- Acceso a nuevo caso.

### 4.4 Tabla

Cada fila presenta:

- NNA involucrados.
- Cantidad de NNA.
- Hoja de Tramite.
- Pais y rol de AC Peru.
- Fase operativa y proximo plazo.
- Profesional.
- Fecha de ingreso y dias transcurridos.
- Estado.
- Accion para abrir el expediente.

Al seleccionar una fila, la bandeja deja espacio al expediente completo.

## 5. Registro de un nuevo caso

El registro se realiza en un formulario principal, no mediante un modal.

### 5.1 Datos minimos

- Hoja de Tramite.
- Fecha Ingreso Solicitud.
- Pais.
- Profesional obtenido del usuario autenticado.
- Al menos un NNA.

### 5.2 Datos adicionales disponibles

- Estado.
- Etapa.
- Tipo de solicitud.
- AC Peru.
- Persona solicitante.
- Persona requerida.
- Informacion inicial disponible.

El formulario permite registrar primero la informacion conocida y completar el
resto dentro del expediente.

### 5.3 Validaciones

- Normalizacion y validacion de Hoja de Tramite.
- Advertencia si la Hoja de Tramite ya existe.
- Obligacion de agregar al menos un NNA.
- Advertencia de posible NNA ya registrado.
- Validacion de fecha de nacimiento respecto de la fecha de ingreso.
- Profesional asignado desde el usuario del sistema.

## 6. Cabecera del expediente

Al abrir un caso se muestra permanentemente:

- Hoja de Tramite.
- Nombre del NNA o nombres de los hermanos.
- Pais.
- Rol de AC Peru.
- Cantidad de NNA.
- Profesional responsable.
- Estado del caso.
- Accion para regresar a la bandeja.
- Accion de eliminacion, sujeta a confirmacion.

La cabecera no duplica formularios. Resume la identificacion vigente del caso.

## 7. Secciones del expediente

### 7.1 Resumen del caso

Vista de consulta que centraliza los datos vigentes:

- Hoja de Tramite.
- Estado.
- Tipo de solicitud.
- AC Peru.
- Pais.
- Etapa.
- Profesional.
- Fecha de ingreso.
- Cantidad y nombres de NNA.
- Ultima gestion.
- Resultado de entrevista.
- Retorno.
- Situacion judicial.

El resumen no solicita nuevamente la informacion. Lee los datos registrados en
las demas secciones.

### 7.2 Datos del caso

Contiene la identificacion y clasificacion del tramite:

- Hoja de Tramite.
- Fecha Ingreso Solicitud.
- Etapa.
- Tipo de solicitud.
- AC Peru.
- Pais.
- Profesional.

Las opciones de estos campos se mantienen de acuerdo con los catalogos ya
existentes.

### 7.3 Personas involucradas

#### NNA

Se presenta una tabla con uno o varios NNA. Cada registro contiene:

- Nombres.
- Primer apellido.
- Segundo apellido.
- Sexo.
- Fecha de nacimiento.
- Edad.
- Tipo de edad: años, meses o dias.

Reglas:

- Nombres y primer apellido son obligatorios para agregar un NNA.
- Si existe fecha de nacimiento, la edad se calcula automaticamente.
- Si no existe fecha de nacimiento, la edad y su tipo pueden registrarse
  manualmente.
- No se permite eliminar el ultimo NNA de un expediente.

#### Solicitante

- Nombre.
- Sexo.
- Telefono.
- Correo electronico.
- Domicilio.

#### Requerido o presunto sustractor

- Nombre.
- Sexo.
- Telefono.
- Correo electronico.
- Domicilio en el exterior.

### 7.4 Evaluacion inicial

Permite revisar requisitos mediante una lista de control. Cada requisito puede
marcarse como pendiente, completo, observado o no aplicable. Tambien conserva el
resultado general de la evaluacion y la fase operativa del expediente.

### 7.5 Requisitos y subsanacion

Registra:

- Observacion comunicada.
- Fecha de observacion y notificacion.
- Fecha limite de subsanacion.
- Ampliacion de subsanacion.
- Fecha de respuesta.
- Alertas de vencimiento.

El vencimiento genera una alerta visual; no modifica automaticamente el estado
ni toma una decision administrativa.

### 7.6 Gestion internacional

Organiza la coordinacion con la contraparte mediante:

- Destinatario.
- Tipo de comunicacion.
- Fecha de envio.
- Referencia SGD manual.
- Respuesta esperada.
- Proxima accion.
- Fecha limite y alerta de vencimiento.

### 7.7 Retorno voluntario

Concentra fecha y resultado de entrevista, estado de la gestion voluntaria,
propuesta, fecha prevista de retorno y compromisos asumidos.

### 7.8 Historial de gestion

Registra cronologicamente las actuaciones administrativas:

- Fecha.
- Descripcion.
- Usuario que registra.
- Eliminacion mediante confirmacion.

### 7.9 Proceso judicial

Conserva los campos judiciales de la matriz:

- Estado judicial.
- Fecha de demanda.
- Numero de expediente judicial.
- Juzgado.
- Primera instancia.
- Segunda instancia.
- Casacion.

Incluye un historial judicial separado para registrar eventos con fecha, etapa,
descripcion y usuario.

El registro de una demanda presentada puede completar la fecha de demanda cuando
esta aun no existe.

### 7.10 Cierre del caso

Contiene:

- Fecha de salida o cierre.
- Retorno.
- Motivo de cierre.

El cierre funcional futuro debe impedir la perdida del historial y permitir la
consulta del expediente cerrado.

## 8. Estados, etapas y opciones actuales

### Estados generales

- En tramite.
- Pendiente.
- Archivado.

### Etapas

- Administrativo.
- Judicial.

### Tipos de solicitud

- Restitucion.
- Regimen de Visitas.

### Rol de AC Peru

- Requirente.
- Requerida.

### Resultado de entrevista

- Favorable.
- Desfavorable.
- Pendiente.
- No aplica.

### Retorno

- SI.
- NO.
- Pendiente.
- No aplica.

### Motivos de cierre

Se mantienen las opciones ya definidas en el sistema y provenientes de la matriz,
incluidos retorno voluntario, retorno por sentencia, acuerdo, desistimiento,
incumplimiento de requisitos y los supuestos relacionados con los articulos del
Convenio.

## 9. Relacion con el backend

El frontend y el backend deben aplicar las mismas reglas criticas:

- Crear el caso con al menos un NNA.
- Impedir que se elimine el ultimo NNA.
- Evitar duplicidad de Hoja de Tramite.
- Asociar el profesional con el usuario autenticado.
- Mantener NNA como una relacion de uno a muchos.
- Conservar bitacora e historial judicial por expediente.
- Contabilizar todos los NNA en estadisticas y exportaciones.

Las validaciones del frontend mejoran la experiencia, pero la regla definitiva
debe existir tambien en el backend.

## 10. Exportacion y estadisticas

La exportacion debe generar una fila por NNA, repitiendo los datos comunes del
caso cuando existan hermanos. Esto evita perder personas al convertir el
expediente a una estructura tabular.

Las estadisticas deben contar:

- Casos.
- Total de NNA.
- NNA por sexo.
- Casos por pais.
- Casos por estado, etapa y profesional.
- Retornos y motivos de cierre.

## 11. Limites del sistema

El sistema no debe:

- Conectarse automaticamente al SGD.
- Enviar documentos por el SGD.
- Reemplazar el expediente documental oficial.
- Tomar decisiones legales o administrativas automaticamente.
- Avanzar etapas solo porque vencio un plazo.
- Eliminar el historial de un caso cerrado.

## 12. Estado de implementacion

### Implementado

- Bandeja de casos a pantalla completa.
- Bandejas operativas por fase, respuesta y vencimiento.
- Indicadores, busqueda, filtros y tabla.
- Formulario principal de nuevo caso.
- Expediente con navegacion por secciones.
- Resumen del caso.
- NNA multiples con nombres separados.
- Edad calculada o manual.
- Validacion de al menos un NNA.
- Advertencias de duplicidad.
- Profesional desde usuario autenticado.
- Historial administrativo y judicial.
- Lista de requisitos y evaluacion inicial.
- Gestion de subsanacion con fechas limite y alertas.
- Gestion internacional con referencia SGD y proxima accion.
- Retorno voluntario estructurado.
- Prototipo frontend del flujo operativo, conservado localmente en el navegador.
- Proceso judicial en una unica seccion.
- Exportacion y estadisticas considerando hermanos.

### Mejoras funcionales siguientes

- Persistencia del flujo operativo en la API existente de Sustraccion, cuando
  se apruebe funcionalmente la interfaz.
- Responsable especifico por proxima accion, cuando sea distinto del
  profesional del caso.
- Referencias SGD individuales por cada evento de la bitacora.
- Cierre con trazabilidad y reapertura justificada.
- Auditoria de modificaciones y eliminacion logica.

## 13. Archivos principales

- Frontend:
  `frontend/src/app/sustracion-internacional/page.tsx`
- Exportacion:
  `frontend/src/lib/export-excel.ts`
- Servicio de dominio:
  `servicios/servicio-sustracion/domain/services/sustracion_service.py`
- API:
  `servicios/servicio-sustracion/infrastructure/api/router.py`
- Pruebas:
  `servicios/servicio-sustracion/tests/test_sustraccion_service.py`
