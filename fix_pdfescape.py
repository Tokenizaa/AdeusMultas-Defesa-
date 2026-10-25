#!/usr/bin/env python3
with open('cloudflare/routes/documents.ts', "r") as f:
    content = f.read()

# Fix line 18: change .replace(/)/g to .replace(/\) /g
# Actually the line is: .replace(/)/g, '\\\\\\\)');
# We need: .replace(/\)/g, '\\\\\\\)');

lines = content.split('\n')
if len(lines) > 18:
    # Replace /)/g with /\) /g on line 18 (0-indexed 17)
    lines[17] = lines[17].replace('/)/g', '/\\)/g')

with open('cloudflare/routes/documents.ts', 'w') as f:
    f.write('\n'.join(lines))
print("Fixed pdfEscape regex")