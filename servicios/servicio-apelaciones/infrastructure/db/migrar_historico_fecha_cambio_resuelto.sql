-- Referencia para ejecución por un DBA con acceso a ambos esquemas.
-- La migración Python equivalente usa conexiones separadas porque APELACIONES_DB
-- no posee SELECT directo sobre AUDITORIA_DB.AUDITORIA_SISTEMA.
MERGE INTO apelaciones_db.apelaciones destino
USING (
    SELECT registroid,
           MIN(createdat) AS fecha_cambio_resuelto
      FROM auditoria_db.auditoria_sistema
     WHERE LOWER(modulo) = 'apelaciones'
       AND JSON_VALUE(valoresnuevos, '$.estado') = 'Resuelto'
       AND (
            valoresprevios IS NULL
            OR JSON_VALUE(valoresprevios, '$.estado') IS NULL
            OR JSON_VALUE(valoresprevios, '$.estado') <> 'Resuelto'
       )
     GROUP BY registroid
) fuente
ON (destino.id = fuente.registroid)
WHEN MATCHED THEN UPDATE SET
    destino.fechacambioresuelto = fuente.fecha_cambio_resuelto
WHERE destino.fechacambioresuelto IS NULL;

COMMIT;
