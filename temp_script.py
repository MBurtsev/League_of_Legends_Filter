import json
import re
with open('champion_text_en.js','r',encoding='utf-8') as f:
    text=f.read()
start=text.index('{',text.index('window.LOL_CHAMPIONS_TEXT_EN'))
end=text.rfind('}')
data=json.loads(text[start:end+1])
import itertools
pattern=re.compile(r'\{\{')
with_placeholders=[(champ,spell['tooltip']) for champ,val in data.items() for spell in val.get('spells',[]) if pattern.search(spell.get('tooltip',''))]
print(len(with_placeholders))
print(with_placeholders[:5])
