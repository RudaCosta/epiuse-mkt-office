#!/usr/bin/env python3
"""
sync_eventos.py - le a planilha de eventos (aba "Eventos 2026") e regenera a
camada brasil do public/api/events.json (camada "Eventos EPI-USE/SAP" do
Calendario Mestre). PRESERVA a aba latam e o resto do arquivo.

Resolve: o botao "Atualizar" do Calendario Mestre nao refletia edicoes da
planilha porque events.json era estatico e nao tinha sync.

Fonte (uma das):
  - data/eventos/EPI-USE Brasil 2026 - Eventos.xlsx   (copia local versionavel)
  - C:/Users/Ruds/OneDrive .../MARKETING/Planejamento/2026/EPI-USE Brasil 2026 - Eventos.xlsx

Uso:
  python scripts/sync/sync_eventos.py          # dry-run (mostra, nao grava)
  python scripts/sync/sync_eventos.py --apply  # grava events.json (com backup)
"""
import json, sys, datetime, shutil, os, urllib.request
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT  = ROOT / "public" / "api" / "events.json"
PROD = os.environ.get("OFFICE_URL", "https://office.epiuse.com.br")
SOURCES = [
    ROOT / "data" / "eventos" / "EPI-USE Brasil 2026 - Eventos.xlsx",
    Path(r"C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVI" + "Ç" + r"OS EM SISTEMAS LTDA/MARKETING/Planejamento/2026/EPI-USE Brasil 2026 - Eventos.xlsx"),
    Path(r"C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVICOS EM SISTEMAS LTDA/MARKETING/Planejamento/2026/EPI-USE Brasil 2026 - Eventos.xlsx"),
]
SHEET = "Eventos 2026"

US_HINTS = ("eua", "usa", "vegas", "orlando", "phoenix", "arizona", "estados unidos")

def s(v):
    if v is None: return ""
    if isinstance(v, float) and pd.isna(v): return ""
    return str(v).strip()

def resolve_source(custom=None):
    cands = ([Path(custom)] if custom else []) + SOURCES
    for p in cands:
        if p.exists(): return p
    return None

def day_of(v):
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.day, v.month
    return None, None

def country_flag(local):
    lo = local.lower()
    if any(h in lo for h in US_HINTS):
        return "US", "\U0001F1FA\U0001F1F8"  # bandeira US
    return "BR", "\U0001F1E7\U0001F1F7"      # bandeira BR

def parse_eventos(xlsx):
    df = pd.ExcelFile(str(xlsx)).parse(SHEET, header=None)
    out = []
    # header = linha 0; dados a partir da 1
    for i in range(1, df.shape[0]):
        nome = s(df.iat[i, 0])
        if not nome or "teste" in nome.lower():   # pula linhas de teste/vazias
            continue
        data_txt = s(df.iat[i, 1])
        di, mi = day_of(df.iat[i, 2])             # Data Inicio
        de, me = day_of(df.iat[i, 3])             # Data Fim
        mes = mi or me
        if not mes:
            continue                              # sem mes nao entra no grid
        # d = "TBC" se a coluna Data textual diz TBC; senao dia ou faixa "ini-fim"
        if data_txt.upper() == "TBC" or di is None:
            d = "TBC"
        elif de and de != di and me == mi:
            d = f"{di}-{de}"
        else:
            d = str(di)
        lob   = s(df.iat[i, 5])
        who   = s(df.iat[i, 11])
        local = s(df.iat[i, 13])
        country, flag = country_flag(local)
        out.append({
            "m": mes, "d": d, "n": nome,
            "lob": lob or "Cross", "who": who or "EPI-USE",
            "country": country, "flag": flag, "local": local,
        })
    return out

def main():
    apply = "--apply" in sys.argv
    custom = None
    for a in sys.argv[1:]:
        if a.endswith(".xlsx"): custom = a
    src = resolve_source(custom)
    if not src:
        print("[eventos] ERRO: planilha de eventos nao encontrada.")
        print("   Copie para data/eventos/EPI-USE Brasil 2026 - Eventos.xlsx e rode de novo.")
        sys.exit(1)
    print(f"[eventos] fonte: {src}")

    if not OUT.exists():
        print(f"[eventos] ERRO: {OUT} nao existe."); sys.exit(1)
    data = json.loads(OUT.read_text(encoding="utf-8"))

    novos = parse_eventos(src)
    antigos = (data.get("abas", {}).get("brasil", {}) or {}).get("eventos", [])
    print(f"[eventos] aba brasil: {len(antigos)} -> {len(novos)} eventos (latam preservada)")
    for e in novos:
        print(f"   m{e['m']:>2} d{e['d']:>5}  {e['n'][:42]:<44} {e['lob']:<14} {e['local']}")

    if apply:
        bak = OUT.with_suffix(".json.bak-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
        shutil.copy2(OUT, bak)
        data.setdefault("abas", {}).setdefault("brasil", {"label": "\U0001F1E7\U0001F1F7 Brasil", "color": "#34d399"})
        data["abas"]["brasil"]["eventos"] = novos
        data["atualizado_em"] = datetime.date.today().isoformat()
        OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[eventos] backup: {bak.name}")
        print(f"[eventos] GRAVADO -> {OUT}  ({len(novos)} eventos brasil)")
        if "--push" in sys.argv:
            push_prod(data)
    else:
        print("[eventos] DRY-RUN (use --apply para gravar)")

def push_prod(data):
    """POSTa o events.json pro prod (Opcao B) — atualiza ao vivo, sem deploy."""
    tok = os.environ.get("EDITOR_TOKEN")
    if not tok:
        print("[eventos] --push ignorado: defina EDITOR_TOKEN no ambiente.")
        return
    req = urllib.request.Request(
        f"{PROD}/api/events.json",
        data=json.dumps(data, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-editor-token": tok},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"[eventos] PUSH prod {PROD}: {r.status} {r.read().decode()[:120]}")
    except Exception as e:
        print(f"[eventos] PUSH falhou: {e}")

if __name__ == "__main__":
    main()
