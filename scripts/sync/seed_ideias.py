# -*- coding: utf-8 -*-
"""Seed do Mural de Ideias a partir da planilha OneDrive.
Lê 'Repositório de Ideias de Marketing.xlsx' e faz POST /api/ideias.
Uso: python scripts/sync/seed_ideias.py [local|railway|all]
"""
import sys, json, pandas as pd, requests

XLSX = r'C:\Users\Ruds\OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA\MARKETING\Planejamento\Repositório de Ideias de Marketing.xlsx'
TARGETS = {
    'local':   'http://localhost:3000',
    'railway': 'https://epiuse-voices-optimizer.up.railway.app',
}
target = sys.argv[1] if len(sys.argv) > 1 else 'local'
urls = list(TARGETS.values()) if target == 'all' else [TARGETS[target]]

EMOJIS = ['💡','🚀','🎨','📣','🔥','✨','🎯','📈','🎪','🤖','📱','🎬','🧠','💎','🌙','⚡','🎁','🏆','🐘','🦁','🎟️','🍿']
CORES  = ['#fbbf24','#f472b6','#a78bfa','#38bdf8','#34d399','#fb923c','#f87171','#facc15']

def categoria(tema, ideia):
    t = (str(tema) + ' ' + str(ideia)).lower()
    if any(k in t for k in ['webinar','podcast','vídeo','video','série','serie','beabá','beaba','vlog','prompt','animal']): return 'conteudo'
    if any(k in t for k in ['evento','stand','show','f1','grand prix','hackaton','zoológico','zoologico','visita']): return 'evento'
    if any(k in t for k in ['indica','desconto','customer','lover','cartao','streaming','caju']): return 'growth'
    if any(k in t for k in ['pin','anos de casa','reconhecimento','dundies','oscar','elefante','goodies','tempo de casa']): return 'brand'
    return 'geral'

def impacto(tema, ideia):
    t = (str(tema) + ' ' + str(ideia)).lower()
    if any(k in t for k in ['hackaton','customer lover','prompt','série','serie','taylor','f1']): return 'alto'
    return 'medio'

df = pd.read_excel(XLSX, sheet_name='Plan1')
df = df.where(pd.notnull(df), None)

ideias = []
i = 0
for _, r in df.iterrows():
    tema = r['Tema']
    if not tema or not str(tema).strip():
        continue
    titulo = str(tema).strip()[:160]
    desc = '' if r['Ideias'] is None else str(r['Ideias']).strip()[:2000]
    _a = r['Mente brilhante']
    autor = 'Anônimo' if (_a is None or pd.isna(_a) or str(_a).strip().lower() in ('nan','none','')) else str(_a).strip()
    ideias.append({
        'titulo': titulo,
        'descricao': desc,
        'categoria': categoria(tema, r['Ideias']),
        'autor': autor or 'Anônimo',
        'impacto': impacto(tema, r['Ideias']),
        'esforco': 'medio',
        'emoji': EMOJIS[i % len(EMOJIS)],
        'cor': CORES[i % len(CORES)],
    })
    i += 1

print(f'{len(ideias)} ideias lidas da planilha')

for base in urls:
    # dedup: pula se já existe ideia com mesmo título
    try:
        existing = requests.get(base + '/api/ideias', timeout=15).json().get('ideias', [])
        titulos = {x['titulo'] for x in existing}
    except Exception as e:
        print(f'[{base}] ERRO ao ler existentes: {e}')
        titulos = set()
    novas = 0
    for it in ideias:
        if it['titulo'] in titulos:
            continue
        try:
            r = requests.post(base + '/api/ideias', json=it, timeout=20)
            if r.ok and r.json().get('success'):
                novas += 1
            else:
                print(f'  falhou: {it["titulo"][:40]} -> {r.status_code}')
        except Exception as e:
            print(f'  erro: {it["titulo"][:40]} -> {e}')
    print(f'[{base}] {novas} ideias inseridas (puladas {len(ideias)-novas} duplicadas/erro)')
