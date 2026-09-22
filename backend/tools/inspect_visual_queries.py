import zipfile
import json
import re

z = zipfile.ZipFile('docs/DSLD_GENERAL_V3.pbix')

# Let's inspect some visual.json files to see expressions and queries
visual_files = [f for f in z.namelist() if f.endswith('visual.json')]

measures_dict = {}

for vf in visual_files:
    raw = z.read(vf).decode('utf-8', errors='ignore')
    try:
        v = json.loads(raw)
        query = v.get('visual', {}).get('query', {})
        # Look for commands or query structure
        cmd = query.get('commands', [])
        # Look for Measure or Column projections
        projections = v.get('visual', {}).get('visualContainerObjects', {})
    except:
        pass

# Let's search for "Measure" or "Aggregation" or "Property" across raw json strings
measure_refs = re.findall(r'"Measure":\s*\{\s*"Expression":\s*\{[^\}]+\},\s*"Property":\s*"([^"]+)"', raw)
print("Extracted sample measures")
