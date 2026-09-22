import openpyxl

wb = openpyxl.load_workbook('/tmp/rene2026.xlsx', read_only=True)
ws = wb['RENE MATRIZ']

total_filas = 0
por_tipo_ing = {}
por_sede = {}
sin_exp = 0
con_fec = 0
filas_mayores_edad = 0

for r in ws.iter_rows(min_row=7, values_only=True):
    if not any(r) or r[0] is None:
        continue
    total_filas += 1
    
    t_ing = str(r[1]).strip().upper() if r[1] else 'VACIO'
    por_tipo_ing[t_ing] = por_tipo_ing.get(t_ing, 0) + 1
    
    sede = str(r[45]).strip().upper() if r[45] else 'SIN SEDE'
    por_sede[sede] = por_sede.get(sede, 0) + 1
    
    if r[2]: con_fec += 1
    if not r[4] or str(r[4]).strip() in ('NO REGISTRA', 'SIN EXPEDIENTE', '-'):
        sin_exp += 1
        
    edad = r[19]
    if edad is not None and str(edad).isdigit() and int(edad) >= 18:
        filas_mayores_edad += 1

print(f"Total filas válidas: {total_filas}")
print(f"Tipo Ingreso: {por_tipo_ing}")
print(f"Con fecha: {con_fec}, Sin expediente: {sin_exp}, Mayores edad: {filas_mayores_edad}")

# Diferencia con 13,392
diff = total_filas - 13392
print(f"Diferencia exacta con 13,392: {diff} registros")

# Ver si alguna categoría suma exactamente 153 o 157
for k, v in por_tipo_ing.items():
    print(f"  Tipo {k}: {v}")

print("Sedes:")
for s, c in sorted(por_sede.items(), key=lambda x: x[1]):
    if c in (diff, diff - 4, diff + 4, 153, 157):
        print(f"  Sede candidata {s}: {c}")
