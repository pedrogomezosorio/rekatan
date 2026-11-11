"""Generate the replaceable vector art shipped with Cities & Knights; no external images."""
from pathlib import Path
from html import escape
import json,re
root=Path(__file__).resolve().parents[1]
base=root/'public/assets/cities-knights'
manifest=[]
def svg(path,body,w=128,h=128,label='',transparent=True):
    target=base/path;target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{escape(label)}">{body}</svg>\n')
    manifest.append({'path':f'public/assets/cities-knights/{path}','size':f'{w}×{h}','transparent':transparent,'label':label})
colors={'red':'#ef4444','blue':'#3b82f6','orange':'#f97316','white':'#f1f5f9','green':'#10b981','purple':'#a855f7'}
branches={'science':('#16a34a','Ciencia'),'politics':('#2563eb','Política'),'trade':('#eab308','Comercio')}
icons={
'paper':'<path d="M32 20h60v84H32z" fill="#fff3cf" stroke="#785432" stroke-width="5"/><path d="M44 42h36M44 57h36M44 72h27M44 87h31" stroke="#785432" stroke-width="4"/>',
'cloth':'<path d="M28 25q35 17 72 0v75q-34 17-72 0z" fill="#bb72cb" stroke="#633074" stroke-width="5"/><path d="M43 34v68m18-63v66m18-66v65M29 53h71M29 75h71" stroke="#f0c1ed" stroke-width="3"/>',
'coin':'<circle cx="64" cy="64" r="45" fill="#e8ae32" stroke="#805321" stroke-width="6"/><circle cx="64" cy="64" r="33" fill="none" stroke="#fff0a6" stroke-width="4"/><path d="M79 42Q46 27 43 63q0 39 37 23" fill="none" stroke="#805321" stroke-width="9"/>'}
for key,body in icons.items():
    svg(f'commodities/{key}.svg',body,label=key)
    svg(f'cards/{key}.svg',f'<rect x="5" y="5" width="310" height="470" rx="24" fill="#eee1bc" stroke="#8e7039" stroke-width="8"/><g transform="translate(32 76) scale(2)">{body}</g><text x="160" y="402" text-anchor="middle" font-family="serif" font-size="32">{dict(paper="Papel",cloth="Tela",coin="Moneda")[key]}</text>',320,480,key,False)
for color,fill in colors.items():
    for rank in range(1,4):
        for active in ['active','inactive']:
            rim='#ffd561' if active=='active' else '#627086'
            svg(f'knights/{color}_{rank}_{active}.svg',f'<circle cx="64" cy="67" r="51" fill="#202837" stroke="{rim}" stroke-width="7"/><path d="M29 96V65q0-37 35-42 35 5 35 42v31z" fill="{fill}" stroke="#10151e" stroke-width="5"/><path d="M41 59h46v15H41zM64 25v68" stroke="#263140" stroke-width="7"/><text x="64" y="117" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="29" fill="{rim}">{rank}</text>',label=f'{color} {rank} {active}')
    svg(f'walls/{color}.svg',f'<path d="M8 106V54h18v17h18V54h18v17h20V54h18v17h20v35z" fill="{fill}" stroke="#242c39" stroke-width="6"/><path d="M13 90h102M34 75v30m26-16v16m27-30v30" stroke="#242c39" stroke-width="4"/>',label=f'Muralla {color}')
for key,(color,name) in branches.items():
    svg(f'metropolises/{key}.svg',f'<path d="M12 105V34l18 12 14-28 20 21 20-21 14 28 18-12v71z" fill="#ebbe53" stroke="{color}" stroke-width="7"/><path d="M47 105V70q17-27 34 0v35" fill="{color}"/>',label=f'Metrópolis de {name}')
    svg(f'events/{key}.svg',f'<rect x="5" y="5" width="118" height="118" rx="22" fill="{color}"/><path d="M25 100V35h15v16h16V25h16v26h16V35h15v65z" fill="#fff0d0"/>',label=name)
    svg(f'progress/{key}_back.svg',f'<rect x="5" y="5" width="310" height="470" rx="24" fill="#19232c" stroke="{color}" stroke-width="9"/><path d="M90 270V150h30v25h30v-45h25v45h28v-25h28v120z" fill="{color}"/><text x="160" y="370" text-anchor="middle" fill="#ffedbc" font-family="serif" font-size="30">{name}</text>',320,480,name,False)
    for level in range(1,6):
        svg(f'improvements/{key}_{level}.svg',f'<rect x="5" y="5" width="310" height="190" rx="16" fill="#19232c" stroke="{color}" stroke-width="8"/><text x="160" y="70" text-anchor="middle" fill="#fff0c0" font-family="serif" font-size="25">{name}</text><text x="160" y="145" text-anchor="middle" fill="{color}" font-family="sans-serif" font-size="63">{level}</text>',320,200,f'{name} {level}',False)
text=(root/'src/shared/citiesKnightsConfig.ts').read_text()
for key,name,branch in re.findall(r"  ([A-Z_]+): \{ name: '([^']+)', branch: '([^']+)'",text):
    color=branches[branch.lower()][0]
    words=name.split();lines=[];line=''
    for word in words:
        if len(line+' '+word)>18:lines.append(line);line=word
        else:line=(line+' '+word).strip()
    lines.append(line)
    title=''.join(f'<text x="160" y="{320+i*35}" text-anchor="middle" fill="#fff2d0" font-family="serif" font-size="26">{escape(line)}</text>' for i,line in enumerate(lines))
    svg(f'progress/{key.lower()}.svg',f'<rect x="5" y="5" width="310" height="470" rx="24" fill="#19232c" stroke="{color}" stroke-width="9"/><circle cx="160" cy="170" r="80" fill="{color}"/><path d="M120 220V140h22v20h23v-35h20v35h22v-20h20v80z" fill="#fff2d0"/>{title}',320,480,name,False)
svg('events/barbarian.svg','<rect x="5" y="5" width="118" height="118" rx="22" fill="#19232c"/><path d="M14 80h100L94 108H33zM62 15v65M65 20v52h38z" fill="#ddd4ba" stroke="#ddd4ba" stroke-width="4"/>',label='Barco bárbaro')
svg('barbarians/barbarian_ship.svg','<path d="M10 80h110l-20 31H32z" fill="#795638" stroke="#d6c19b" stroke-width="5"/><path d="M60 12v68M64 17v54h42z" fill="#20232b" stroke="#d6c19b" stroke-width="5"/>',label='Barco bárbaro')
svg('barbarians/defender.svg','<path d="M64 8l49 18v40q-6 38-49 55Q20 105 15 66V26z" fill="#d7ad49" stroke="#72552c" stroke-width="6"/><text x="64" y="83" text-anchor="middle" font-family="serif" font-size="54">+1</text>',label='Campeador de Catán')
svg('barbarians/track.svg','<rect width="960" height="128" rx="20" fill="#19232c"/>'+''.join(f'<circle cx="{60+i*120}" cy="64" r="45" fill="#3e5468" stroke="#ddbc71" stroke-width="3"/><text x="{60+i*120}" y="77" text-anchor="middle" fill="#fff2d0" font-family="sans-serif" font-size="38">{i}</text>' for i in range(8)),960,128,'Ruta de los bárbaros',False)
(base/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
doc=root/'docs/ciudades-caballeros-assets.md'
doc.write_text('# Gráficos de Ciudades y Caballeros\n\nSe incluyen SVG provisionales funcionales. Para sustituirlos por diseños finales, proporciona los archivos de esta lista conservando sus rutas y nombres. SVG es el formato recomendado; admite PNG a doble resolución, pero requiere actualizar el manifiesto de rutas del cliente. Las piezas e iconos necesitan fondo transparente. Las cartas y tableros pueden tener fondo opaco.\n\nLas dimensiones siguientes son las mínimas recomendadas; para PNG usa 2× o 4×. Los 36 caballeros distinguen seis colores, tres rangos y dos estados. El barco ocupa tres caras idénticas del dado de evento. Cada anverso de progreso es un diseño único, repetido en el mazo según el reglamento (18 cartas por rama, 54 en total).\n\n| Ruta exacta | Resolución / viewBox | Transparencia | Diseño |\n|---|---|---|---|\n'+''.join(f"| `{a['path']}` | {a['size']} | {'Sí' if a['transparent'] else 'Opcional'} | {a['label']} |\n" for a in manifest)+'\nEl catálogo legible por código está en `public/assets/cities-knights/manifest.json`. Se regeneran los provisionales con `python3 scripts/generate-cities-knights-assets.py`. No ejecutar el generador encima de ilustraciones finales sustituidas.\n')
print(f'{len(manifest)} assets; catálogo: {doc}')
