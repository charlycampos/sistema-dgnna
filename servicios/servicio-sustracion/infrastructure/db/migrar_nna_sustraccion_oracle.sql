-- Ejecutar una vez despues de que el servicio haya creado NNA_SUSTRACION.
-- Traslada los casos anteriores como un NNA inicial, sin duplicar registros.

INSERT INTO sustracion_db.nna_sustracion (
    id, casoid, nombres, primerapellido, sexo, fechanacimiento, edad, tipoedad
)
SELECT RAWTOHEX(SYS_GUID()), c.id, c.nnanombre, '(PENDIENTE)',
       c.nnasexo, c.nnafechanac, c.nnaedad, c.nnatipoedad
FROM sustracion_db.casos_sustracion c
WHERE NOT EXISTS (
    SELECT 1 FROM sustracion_db.nna_sustracion n WHERE n.casoId = c.id
);
