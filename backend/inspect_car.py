import os
import openpyxl
import pandas as pd
import json

DOCS_DIR = r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\docs"

files = [
    "BASE_RENE_CENTROS_2026_CAR (1).xlsx",
    "RENE CAR NNA BÁSICO JUN 2026.xlsx",
    "RENE CAR NNA ESPECIALIZADO ok.xlsx",
    "RENE CAR NNA URGENCIA ok.xlsx"
]

results = {}

for fname in files:
    fpath = os.path.join(DOCS_DIR, fname)
    try:
        wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
        sheet_names = wb.sheetnames
        results[fname] = {"sheets": {}}
        
        for sname in sheet_names:
            ws = wb[sname]
            # Read first 5 rows
            rows = []
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i > 5:
                    break
                rows.append([str(v) if v is not None else "" for v in row[:50]]) # first 50 cols
            results[fname]["sheets"][sname] = {
                "sample_rows": len(rows),
                "headers": rows[0] if rows else []
            }
        wb.close()
    except Exception as e:
        results[fname] = {"error": str(e)}

out_file = r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\backend\inspect_car_summary.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Inspection completed, saved to", out_file)
