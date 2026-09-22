import os
import zipfile
import xml.etree.ElementTree as ET
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
    print(f"Inspecting {fname}...")
    try:
        with zipfile.ZipFile(fpath, 'r') as z:
            # workbook.xml gives sheet names and r:id
            wb_xml = z.read('xl/workbook.xml')
            root = ET.fromstring(wb_xml)
            sheets = []
            for s in root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
                sheets.append(s.attrib.get('name'))
            results[fname] = {"sheet_names": sheets}
    except Exception as e:
        results[fname] = {"error": str(e)}

out_file = r"d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-dgnna\backend\sheets_info.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Done quick inspection!")
