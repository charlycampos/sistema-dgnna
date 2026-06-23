import { z } from "zod";

const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\.]*$/;

const nombrePersonaSchema = z.string().optional().nullable().refine(
    (val) => !val || namePattern.test(val),
    "Solo letras, espacios y puntos (para iniciales)"
);

export const apelacionBaseSchema = z.object({
    numeroExpediente: z.string().min(1, "El número de expediente es obligatorio"),
    fechaIngreso: z.date({ message: "La fecha de ingreso es obligatoria" }),
    fechaIngresoMIMP: z.date().optional().nullable(),
    plazoVencimiento: z.date().optional().nullable(),
    apelante: z.string().optional().nullable(),
    nnaCar: z.string().optional().nullable(),
    apelantes: z.array(z.object({
        tipo: z.enum(["natural", "institucion"]),
        nombres: nombrePersonaSchema,
        apellidoPaterno: nombrePersonaSchema,
        apellidoMaterno: nombrePersonaSchema,
        documento: z.string().optional(),
        institucion: z.string().optional()
    })).min(1, "Debe agregar al menos un apelante"),
    nnas: z.array(z.object({
        tipo: z.enum(["natural", "institucion"]),
        nombres: nombrePersonaSchema,
        primerApellido: nombrePersonaSchema,
        segundoApellido: nombrePersonaSchema,
        edad: z.string().or(z.number()).optional().nullable(),
        institucion: z.string().optional()
    })).optional().nullable(),
    procedencia: z.string().min(1, "La procedencia es obligatoria"),
    documento: z.string().min(1, "El documento es obligatorio"),
    asunto: z.string().min(1, "El asunto es obligatorio"),
    folios: z.coerce.number().min(1, "Debe haber al menos 1 folio"),
    complejidadId: z.string().min(1, "La complejidad jurídica es obligatoria"),
    abogadoId: z.string().min(1, "El abogado asignado es obligatorio"),
    fechaAsignacion: z.date({ message: "La fecha de asignación es obligatoria" }),
    estado: z.enum(["Pendiente", "Resuelto", "Atendido", "Observado"]),
    numeroResolucion: z.string().optional(),
    documentoAtencion: z.string().optional(),
    cargos: z.string().optional(),
    observaciones: z.string().optional(),
    revisorId: z.string().optional().nullable(),
    fechaAsignacionRevisor: z.date().optional().nullable(),
})

export const apelacionSchema = apelacionBaseSchema.refine((data) => {
    // Si el estado es "Resuelto" o "Atendido", debe tener número de resolución
    if (data.estado === "Resuelto" || data.estado === "Atendido") {
        return !!data.numeroResolucion;
    }
    return true;
}, {
    message: "Cuando el estado es Resuelto o Atendido se requiere el número de resolución",
    path: ["numeroResolucion"],
}).refine((data) => {
    // Si se selecciona un revisor, la fecha de asignación del revisor es obligatoria,
    // excepto para registros anteriores al 02/06/2026 donde el campo puede estar vacío
    if (data.revisorId && !data.fechaAsignacionRevisor) {
        const corte = new Date('2026-06-02T00:00:00')
        return data.fechaIngreso < corte;
    }
    return true;
}, {
    message: "La fecha de asignación del revisor es obligatoria cuando se selecciona un revisor",
    path: ["fechaAsignacionRevisor"],
});

export type ApelacionFormValues = z.infer<typeof apelacionBaseSchema>

// ─────────────────────────────────────────────
// LEY DE TRANSPARENCIA
// ─────────────────────────────────────────────

export const transparenciaSchema = z.object({
    numeroExpediente:   z.string().min(1, "El número de expediente es obligatorio"),
    fechaIngreso:       z.date({ message: "La fecha de ingreso es obligatoria" }),
    documentoIngreso:   z.string().optional().nullable(),
    direccion:          z.array(z.enum(['DPNNA', 'DSLD', 'DA', 'DPE', 'DGNNA'])).min(1, "Seleccione al menos una dirección"),
    estado:             z.enum(['Pendiente', 'En Proceso', 'Atendido']).default('Pendiente'),
    fechaAtencion:      z.date().optional().nullable(),
    asunto:             z.string().min(1, "El asunto es obligatorio"),
    documentoRespuesta: z.string().optional().nullable(),
    categoria:          z.array(z.string()).optional().nullable(),
    plazoInterno:       z.date().optional().nullable(),
    observaciones:      z.string().optional().nullable(),
}).refine(data => {
    // Si está Atendido debe tener fecha de atención
    if (data.estado === 'Atendido') return !!data.fechaAtencion
    return true
}, {
    message: "Cuando el estado es Atendido se requiere la fecha de atención",
    path: ["fechaAtencion"],
})

export type TransparenciaFormValues = z.infer<typeof transparenciaSchema>

