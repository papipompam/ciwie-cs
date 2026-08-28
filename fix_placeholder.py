from pathlib import Path
import re
p=Path('prisma-schema.dbml.md'); s=Path('prisma/schema.prisma').read_text(encoding='utf-8'); d={}
for mn,b in re.findall(r'(?ms)^model\s+(\w+)\s*\{(.*?)^\}',s):
 tm=re.search(r'@@map\("([^"]+)"\)',b); tn=tm.group(1) if tm else mn
 for l in b.splitlines():
  m=re.match(r'\s*(\w+)\s+\S+.*@default\(([^()]*)\)',l)
  if m:d[(tn,m.group(1))]=m.group(2)
o=[]; t=''
for l in p.read_text(encoding='utf-8').splitlines():
 if l.startswith('Table '):t=l.split()[1]
 m=re.match(r'\s+(\w+)\s+',l)
 if m and "'\\1'" in l and (t,m.group(1)) in d:l=l.replace("'\\1'",d[(t,m.group(1))])
 o.append(l)
p.write_text('\n'.join(o)+'\n',encoding='utf-8')
