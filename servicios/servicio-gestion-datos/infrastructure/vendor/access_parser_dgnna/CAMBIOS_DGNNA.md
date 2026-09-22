# access_parser_dgnna: cambios respecto de access-parser 0.0.6

Se incluye esta copia porque la red del MIMP bloquea los repositorios de Debian
y no se puede instalar **mdbtools** en la imagen Docker. La versión original de
access-parser no leía correctamente el DNA.mdb de la DSLD.

Licencia original: Apache 2.0 (archivo LICENSE). Autor original: Uri Katz / Claroty.

## Correcciones (solo en `access_parser.py`)

1. **Columnas de longitud variable desalineadas.** El dato variable se ubicaba por la
   posición de la columna; ahora se usa `variable_column_number`, como indica el
   formato MDB. Sin esto, en la tabla `dna` el campo `ubigeo` recibía el valor de
   `estado_acreditacion`, etc.
2. **Registros desbordados (overflow) recortados mal.** Los offsets de página llevan
   banderas en los bits altos; ahora siempre se enmascaran y el fin del registro es el
   siguiente offset físico de la página. Corrige filas corruptas (p. ej. población de
   Sondor) y campos memo vacíos.
3. **Memo con página inexistente.** Ya no se cae con `TypeError`; el campo queda vacío.
   Error original: "Could not find overflow record data page overflow pointer".

## Validación (16/09/2026, DNA.mdb de la DSLD)

Las 7 tablas usadas (dna, supervisadas, ubigeo, estadodna, modelodna, supervisores,
"Perú población INEI 2015") quedaron **idénticas campo por campo** a la lectura de
mdbtools 1.0, y los registros a cargar (1,892 DEMUNA, 10,983 supervisiones) son iguales.

## Diff

```diff
--- ap/access_parser-0.0.6/access_parser/access_parser.py.orig	2026-09-16 21:33:37.419632426 -0500
+++ ap/access_parser-0.0.6/access_parser/access_parser.py	2026-09-16 21:36:10.239714643 -0500
@@ -394,9 +394,14 @@
         """
         relative_offsets = relative_record_metadata.variable_length_field_offsets
         jump_table_addition = 0
-        for i, column_index in enumerate(relative_records_column_map):
+        for pos, column_index in enumerate(relative_records_column_map):
             column = relative_records_column_map[column_index]
             col_name = column.col_name_str
+            # Corrección DGNNA: el dato variable se ubica por variable_column_number (spec MDB),
+            # no por la posición de la columna (falla en tablas con columnas agregadas/eliminadas).
+            i = column.variable_column_number
+            if i >= len(relative_offsets):
+                i = pos
             has_value = True
             if column.column_id > len(null_table):
                 LOGGER.warning("Invalid null table. null values may be shown in the db.")
@@ -545,15 +550,19 @@
         else:
             LOGGER.debug("LVAL type 2")
             rec_data = self._get_overflow_record(parsed_memo.record_pointer)
-            next_page = struct.unpack("I", rec_data[:4])[0]
-            # LVAL2 has data over multiple pages. The first 4 bytes of the page are the next record, then that data.
-            # Concat the data until we get a 0 next_page.
             memo_data = b""
-            while next_page:
-                memo_data += rec_data[4:]
-                rec_data = self._get_overflow_record(next_page)
+            if rec_data is not None and len(rec_data) >= 4:
                 next_page = struct.unpack("I", rec_data[:4])[0]
-            memo_data += rec_data[4:]
+                # LVAL2 has data over multiple pages. The first 4 bytes of the page are the next record, then that data.
+                # Concat the data until we get a 0 next_page.
+                while next_page:
+                    memo_data += rec_data[4:]
+                    rec_data = self._get_overflow_record(next_page)
+                    if rec_data is None or len(rec_data) < 4:
+                        rec_data = b"\x00\x00\x00\x00"
+                        break
+                    next_page = struct.unpack("I", rec_data[:4])[0]
+                memo_data += rec_data[4:]
         if memo_data:
             if return_raw:
                 return memo_data
@@ -573,19 +582,15 @@
             LOGGER.warning(f"Could not find overflow record data page overflow pointer: {record_pointer}")
             return
         parsed_data = parse_data_page_header(record_page, version=self.version)
-        if record_offset > len(parsed_data.record_offsets):
+        if record_offset >= len(parsed_data.record_offsets):
             LOGGER.warning("Failed parsing overflow record offset")
             return
-        start = parsed_data.record_offsets[record_offset]
-        if start & 0x8000:
-            start = start & 0xfff
-        else:
-            LOGGER.debug(f"Overflow record flag is not present {start}")
-        if record_offset == 0:
-            record = record_page[start:]
-        else:
-            end = parsed_data.record_offsets[record_offset - 1]
-            if end & 0x8000 and (end & 0xff != 0):
-                end = end & 0xfff
-            record = record_page[start: end]
+        # Corrección DGNNA: los offsets llevan banderas en los 4 bits altos (0x8000 borrado/lookup,
+        # 0x4000 overflow); siempre se enmascaran para obtener la posición real en la página.
+        start = parsed_data.record_offsets[record_offset] & 0xfff
+        # El registro termina donde empieza el siguiente registro físico de la página
+        # (el menor offset mayor que start) o al final de la página.
+        posteriores = [o & 0xfff for o in parsed_data.record_offsets if (o & 0xfff) > start]
+        end = min(posteriores) if posteriores else len(record_page)
+        record = record_page[start:end]
         return record
```
