import zipfile
import json
import re
from collections import defaultdict

z = zipfile.ZipFile('docs/DSLD_GENERAL_V3.pbix')

page_map = {}
for p in [f for f in z.namelist() if f.endswith('page.json') and not f.endswith('pages.json')]:
    try:
        pdata = json.loads(z.read(p).decode('utf-8'))
        pname = pdata.get('name')
        pdisplay = pdata.get('displayName')
        page_map[pname] = pdisplay
    except Exception:
        pass

page_entities = defaultdict(set)
page_properties = defaultdict(set)
all_entities = set()
all_properties = set()

for name in z.namelist():
    if name.endswith('visual.json'):
        parts = name.split('/')
        page_id = parts[3]
        page_name = page_map.get(page_id, page_id)
        raw = z.read(name).decode('utf-8')
        
        entities = re.findall(r'"Entity":\s*"([^"]+)"', raw)
        properties = re.findall(r'"Property":\s*"([^"]+)"', raw)
        
        for e in entities:
            page_entities[page_name].add(e)
            all_entities.add(e)
        for pr in properties:
            page_properties[page_name].add(pr)
            all_properties.add(pr)

with open('docs/pbix_analysis.txt', 'w', encoding='utf-8') as out:
    out.write("="*60 + "\n")
    out.write("TODAS LAS TABLAS / ENTIDADES DETECTADAS:\n")
    out.write("="*60 + "\n")
    for e in sorted(all_entities):
        out.write(f" - {e}\n")

    out.write("\n" + "="*60 + "\n")
    out.write("TABLAS Y CAMPOS POR PAGINA:\n")
    out.write("="*60 + "\n")
    for p in sorted(page_entities.keys()):
        out.write(f"\n[PAGINA] {p}\n")
        out.write(f"   Tablas: {sorted(list(page_entities[p]))}\n")
        out.write(f"   Campos/Metricas: {sorted(list(page_properties[p]))}\n")

print("Reporte generado en docs/pbix_analysis.txt")
