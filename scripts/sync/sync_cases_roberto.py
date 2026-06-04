import pandas as pd
import json, re, sys, io
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
_user = os.environ.get('USERNAME', 'rudac')
_od = f"C:/Users/{_user}/OneDrive - EPI USE BRASIL SERVICOS EM SISTEMAS LTDA"
f = f"{_od}/MARKETING/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referencia Empresas Transformadoras 2025.xlsx"
# Fallback: tenta caminhos alternativos se o principal nao existir
if not os.path.exists(f):
    _candidates = [
        f"C:/Users/rudac/OneDrive - EPI USE BRASIL SERVICOS EM SISTEMAS LTDA/MARKETING/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referencia Empresas Transformadoras 2025.xlsx",
        f"C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVICOS EM SISTEMAS LTDA/MARKETING/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referencia Empresas Transformadoras 2025.xlsx",
        r"C:/Users/rudac/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referência Empresas Transformadoras 2025.xlsx",
    ]
    for c in _candidates:
        if os.path.exists(c):
            f = c
            break
    else:
        print(json.dumps({"error": f"Arquivo nao encontrado. Candidatos tentados: {_candidates}"}, ensure_ascii=False))
        sys.exit(1)

df_cases = pd.read_excel(f, sheet_name='Cases')
df_perg  = pd.read_excel(f, sheet_name='Perguntas Referência')

status_map = {
    'Publicado':  'case-publicado',
    'Em edição':  'em-edicao',
    'Em edicao':  'em-edicao',
    'Negociação': 'negociacao',
    'Negociacao': 'negociacao',
    'Declinado':  'declinado',
}

def clean(v):
    if pd.isna(v): return ''
    s = str(v).strip()
    if s.lower() in ('nan','none'): return ''
    return s

def slugify(s):
    return re.sub(r'[^a-z0-9]+','-', s.lower()).strip('-')[:60]

respostas = {}
for _, r in df_perg.iterrows():
    emp = clean(r.get('Empresa'))
    if not emp: continue
    parts = []
    for i in [7, 8, 9]:
        v = clean(r.iloc[i])
        if v: parts.append(v)
    respostas[emp] = ' \n\n'.join(parts)[:2000]

items = []
for i, r in df_cases.iterrows():
    emp = clean(r.get('Empresa'))
    if not emp: continue
    status_raw = clean(r.get('Status'))
    status = status_map.get(status_raw, 'em-avaliacao')
    case_pub = 1 if status == 'case-publicado' else 0
    url = clean(r.get('Mais Informações'))
    obs_planilha = clean(r.get('Observações| Controle Marketing'))
    civ = clean(r.get('CIV'))[:300]
    mais_info = url if 'http' in url else ''

    case_resumo_parts = []
    if mais_info: case_resumo_parts.append(f"[Case publicado] {mais_info}")
    if civ: case_resumo_parts.append(f"CIV: {civ}")
    if emp in respostas and respostas[emp]:
        case_resumo_parts.append(f"Resposta de qualificacao:\n{respostas[emp][:600]}...")

    items.append({
        'sharepoint_id': f"roberto-cases-2025-{slugify(emp)}-{i}",
        'conta':        f"EUBR-CR-{i+1:03d}",
        'cliente_nome': emp,
        'contato_principal': clean(r.get('Nome e Cargo do Contato')),
        'contato_email':     clean(r.get('E-mail do Contato')),
        'csm':          clean(r.get('Contato EUBR')),
        'lob':          clean(r.get('Área EUBR'))[:50],
        'status':       status,
        'nps':          None,
        'valor_anual':  None,
        'ultimo_contato': datetime.now().strftime('%Y-%m-%d'),
        'observacoes':  obs_planilha[:2000] if obs_planilha else (civ[:2000] if civ else ''),
        'case_publicavel': case_pub,
        'case_resumo':  '\n\n'.join(case_resumo_parts)[:1000],
    })

print(json.dumps({'items': items}, ensure_ascii=False, indent=2))
