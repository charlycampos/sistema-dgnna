import { z } from "zod"

export const apelacionBaseSchema = z.object({
    numeroExpediente: z.string().min(1, "El número de expediente es obligatorio"),
    fechaIngreso: z.date({ message: "La fecha de ingreso es obligatoria" }),
    fechaIngresoMIMP: z.date().optional().nullable(),
    plazoVencimiento: z.date().optional().nullable(),
    apelante: z.string().min(1, "El apelante es obligatorio"),
    nnaCar: z.string().optional().nullable(),
    procedencia: z.string().min(1, "La procedencia es obligatoria"),
    documento: z.string().min(1, "El documento es obligatorio"),
    asunto: z.string().min(1, "El asunto es obligatorio"),
    folios: z.coerce.number().min(1, "Debe haber al menos 1 folio"),
    complejidadId: z.string().min(1, "La complejidad jurídica es obligatoria"),
    abogadoId: z.string().min(1, "El abogado asignado es obligatorio"),
    fechaAsignacion: z.date({ message: "La fecha de asignación es obligatoria" }),
    estado: z.enum(["Pendiente", "Resuelto", "Atendido"]),
    numeroResolucion: z.string().optional(),
    documentoAtencion: z.string().optional(),
    cargos: z.string().optional(),
    observaciones: z.string().optional(),
    revisorId: z.string().optional().nullable(),
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
});

export type ApelacionFormValues = z.infer<typeof apelacionBaseSchema>

// ─────────────────────────────────────────────
// LEY DE TRANSPARENCIA
// ─────────────────────────────────────────────

export const transparenciaSchema = z.object({
    numeroExpediente:   z.string().min(1, "El número de expediente es obligatorio"),
    fechaIngreso:       z.date({ message: "La fecha de ingreso es obligatoria" }),
    documentoIngreso:   z.string().optional().nullable(),
    direccion:          z.enum(['DPNNA', 'DSLD', 'DA', 'DPE', 'DGNNA'], {
                            message: "Seleccione una dirección válida"
                        }),
    estado:             z.enum(['Pendiente', 'En Proceso', 'Atendido']).default('Pendiente'),
    fechaAtencion:      z.date().optional().nullable(),
    asunto:             z.string().min(1, "El asunto es obligatorio"),
    documentoRespuesta: z.string().optional().nullable(),
    categoria:          z.string().optional().nullable(),
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

