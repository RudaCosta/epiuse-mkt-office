# 🏭 Content Factory OFFLINE — Módulo 08

> Versão offline do `/inbound` do Office. Gera post LinkedIn, carrossel, post único,
> capa de blog e artigo SEO **sem consumir crédito de API** — LLM roda local na máquina.

## Por quê
O `/inbound` do Office usa Claude (Sonnet+Haiku) via API → custa crédito + precisa de saldo.
Este módulo faz a **mesma coisa** com **LLM local** (Ollama + Qwen2.5), ancorado nos
**693 artigos reais** do blog EPI-USE via RAG. Custo recorrente: **R$0**.

## Stack (decisões)
- **LLM:** Ollama `qwen2.5:7b-instruct` (PT-BR forte, cabe na RTX 4070 12GB)
- **Embeddings:** Ollama `nomic-embed-text` (dispensa torch/sentence-transformers — Python 3.14 não tem wheel estável)
- **RAG:** numpy puro (cosseno), índice em `corpus/index.npz` — sem faiss
- **UI/API:** Flask single-file (`app.py`) + `static/index.html`
- **Corpus:** scrape 1x de `epiuse.com.br/artigo/...` (`div.content-post-blog`)

## Pré-requisitos (1x)
```powershell
winget install Ollama.Ollama
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
pip install -r requirements.txt
```

## Rodar
```powershell
powershell -ExecutionPolicy Bypass -File run.ps1
```
Na 1ª vez: raspa os 693 artigos + constrói o índice RAG (alguns minutos). Depois sobe em http://localhost:5000.

Manual:
```powershell
python scrape_corpus.py --delay 0.25   # corpus/corpus.jsonl
python rag.py --build                   # corpus/index.npz
python app.py                           # http://localhost:5000
```

## Pipeline
```
input único
  → RAG: top-4 trechos dos 693 (ancora voz + reduz alucinação)
  → Redator B2B por persona (CFO/CHRO/CIO ou auto) — Qwen2.5
  → Revisor SEO/GEO — Qwen2.5 (meta tags + FAQ citável por LLM + alertas)
  → pacote: post · carrossel · post único · capa blog (canvas) · artigo SEO
```

## Limites honestos (Regra 7)
- Qualidade de copy abaixo do Sonnet 4.6; com RAG no domínio EPI-USE o gap encolhe.
- Roda **só local** (precisa da GPU) — não vai pro Railway.
- Os 693 são scrape público; re-rodar `scrape_corpus.py` atualiza.
- Número só entra se estiver no input/fato público — nunca inventado.

## Arquivos
- `scrape_corpus.py` — baixa corpos dos 693 → `corpus/corpus.jsonl`
- `rag.py` — embeddings + índice + retrieve
- `app.py` — Flask: `/api/factory`, `/api/health`
- `static/index.html` — UI Content Factory (Poppins + navy/red)
- `run.ps1` — sobe tudo (setup 1x + server)
