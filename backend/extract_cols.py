import os
import pandas as pd
import json

DOCS_DIR = r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\docs"

targets = [
    ("BASE_RENE_CENTROS_2026_CAR (1).xlsx", "New Report 2026"),
    ("RENE CAR NNA BÁSICO JUN 2026.xlsx", "EDNE CAR BÁSICO"),
    ("RENE CAR NNA ESPECIALIZADO ok.xlsx", "EDNE CAR ESP"),
    ("RENE CAR NNA URGENCIA ok.xlsx", "EDNE CAR URGENCIAS")
]

analysis = {}

for fname, sname in targets:
    fpath = os.path.join(DOCS_DIR, fname)
    print(f"Reading {fname} -> {sname}...")
    try:
        # read first 10 rows
        df = pd.read_excel(fpath, sheet_name=sname, nrows=10)
        cols = [str(c).strip() for c in df.columns]
        
        # sample values for first row
        sample_first_row = {}
        if len(df) > 0:
            for c in df.columns:
                val = df.iloc[0][c]
                sample_first_row[str(c).strip()] = str(val) if pd.notna(val) else None
                
        analysis[fname] = {
            "sheet": sname,
            "total_columns": len(cols),
            "columns": cols,
            "sample_row": sample_first_row
        }
    except Exception as e:
        analysis[fname] = {"error": str(e)}

out_file = r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\backend\columns_analysis.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(analysis, f, ensure_ascii=False, indent=2)

print("Columns extracted successfully!")
