import zipfile
import re

z = zipfile.ZipFile('docs/DSLD_GENERAL_V3.pbix')

# Let's extract strings from DataModel (Analysis Services database)
data = z.read('DataModel')

# Search for DAX expressions (measures)
# DAX measures typically look like Name = CALCULATE(...) or [Total ...] := ...
# In Analysis Services TMSL/schema, measures are often stored as UTF-16 strings
try:
    text_utf16 = data.decode('utf-16le', errors='ignore')
except:
    text_utf16 = ""

text_utf8 = data.decode('utf-8', errors='ignore')

combined = text_utf16 + "\n" + text_utf8

# find DAX patterns
measures = re.findall(r'(\[[a-zA-Z0-9_\s%]+\]\s*:=\s*[^;\r\n]+)', combined)
print(f"Found {len(measures)} measures by pattern")

with open('docs/pbix_datamodel_strings.txt', 'w', encoding='utf-8') as f:
    for m in set(measures[:100]):
        f.write(m + '\n')

print("Done writing datamodel strings")
