# 🪪 Profile Optimizer — Guia Operacional

> **Versão:** 1.0 · 03/jun/2026 · Aplica-se ao Office 0.9.5+
>
> **Pra quem é:** time MKT EPI-USE Brasil (Duda, Rudá, Lisiane) — quem **gera** kits de LinkedIn pros Voices.

---

## ⏱️ Tempo total esperado

- **Trabalho humano:** 3-5 minutos
- **Geração IA (Claude.ai):** 80-120 segundos
- **Total:** ~5-7 minutos por kit

---

## 📋 ANTES DE COMEÇAR — checklist de pré-requisitos

Sem esses 4 itens o kit sai genérico ou trava:

- [ ] **Transcrição da reunião** com o Voice em formato texto (`.docx`, `.txt`, áudio transcrito, ou notas livres — qualquer formato serve)
- [ ] **SSI Score atual** do Voice — pede pra ele abrir [linkedin.com/sales/ssi](https://www.linkedin.com/sales/ssi) e mandar print
- [ ] **3 resultados quantitativos reais** mencionados na reunião (R$, %, # clientes, anos)
- [ ] **Acesso a [claude.ai](https://claude.ai)** logado (plano grátis basta)

> **Não tem reunião feita?** Marca uma de 20-30min usando o roteiro `vault/00-contexto/roteiro-entrevista-voice.md`. Sem entrevista, o kit fica feito de placeholders amarelos.

---

## 🎯 QUAL VERSÃO USAR — V1 ou V2?

| | V1 `/optimizer` | V2 `/optimizer-v2` |
|---|---|---|
| **Quando** | Só tem transcrição, sem objetivo claro de carreira | Sabe o objetivo (Thought Leadership / Atração Clientes / Recrutamento) |
| **Output** | Kit em 7 páginas focado em Voice Index | Kit em 10 páginas com Quick Wins na pág 1 + framework findskill.ai |
| **Esforço** | Cola transcrição → 1 botão | Preenche 5 vars + cola transcrição → 1 botão |
| **Recomendado pra** | Primeiro kit, exploratório | Quando Voice já tem direção (95% dos casos EPI-USE) |

**Padrão sugerido:** sempre V2.

---

## ▶️ FLUXO COMPLETO — 5 GRANDES PASSOS

### PASSO 1 · Preparar a transcrição (1 min)

1. Abre o `.docx` ou `.txt` da reunião
2. **Ctrl+A** para selecionar tudo
3. **Ctrl+C** para copiar

> 💡 **Dica:** se a reunião foi no Teams, baixa a transcrição automática direto pelo botão "Baixar transcrição". Se foi no Zoom/Meet, exporta o `.vtt` e cola — IA limpa o ruído de timestamps sozinha.

---

### PASSO 2 · Abrir o Optimizer e selecionar o Voice (30 s)

1. Abre o Office: `https://epiuse-voices-optimizer.up.railway.app/optimizer-v2` (ou localhost se estiver dev)
2. **Se o Voice já está cadastrado** (Anderson, Furigo, etc):
   - Clica no chip dele no topo
   - Os 8 campos básicos preenchem automaticamente (nome, cargo, LinkedIn, audience, key skills, SSI baseline, lado humano, resultados)
3. **Se é Voice novo** (não cadastrado):
   - Mantém "Voice novo" selecionado
   - Vai preencher os campos manualmente no passo 3

---

### PASSO 3 · Completar/ajustar os 5 campos findskill (2 min)

A IA usa estes 5 campos pra montar TUDO. Capricha:

| Campo | Como preencher | Exemplo bom |
|---|---|---|
| **Nome do Voice** | Nome completo | "Carlos Roberto Furigo Cardoso" |
| **`{{current_role}}`** | Cargo oficial atual na EPI-USE Brasil + data entrada | "Service Line Director — Tech (EPI-USE Brasil, desde 13/abr/2026)" |
| **`{{target_audience}}`** | 2-4 personas específicas | "CTOs, Diretores de TI, Arquitetos SAP, Líderes de Inovação" |
| **`{{key_skills}}`** | 3-5 skills/tecnologias **separadas por vírgula** | "SAP S/4HANA, SAP BTP, Arquitetura de Integração, Liderança Técnica, Inovação SaaS" |
| **`{{unique_value}}`** | 1 frase com **número** que diferencia | "25 anos em tech · tirou ICS do zero a R$ 3-4M/ano de recorrência em 10 anos" |

Depois escolhe **1 dos 3 career goals** (cards roxo/azul):

- 🎓 **Thought Leadership** — Voice quer autoridade técnica · vai postar conteúdo regular
- 💼 **Atração de Clientes** — Voice é commercial-driver · vai usar perfil pra pipeline
- 🤝 **Recrutamento** — Voice é gestor que quer atrair talento · foco em cultura

Campos opcionais (não pula se tem):
- **SSI Score atual** — número inteiro (ex: `34`)
- **Seguidores** — se sabe (ex: `1.247`)
- **Lado humano** — família, paixões, causas (humaniza muito o Sobre)
- **3 resultados quantitativos** — separados por nova linha

---

### PASSO 4 · Colar transcrição + copiar prompt (30 s)

1. Cola a transcrição (Ctrl+V) no textarea grande "Transcrição da reunião"
   - **Mínimo recomendado:** 500 chars
   - **Ideal:** 2.000+ chars (5-10 min de conversa real)
   - Mostra "✓ bom volume" verde quando passa de 500
2. Clica no botão grande roxo **📋 Copiar prompt V2 com variáveis**
3. **Confirma o toast verde:** "✓ Prompt V2 copiado!"
4. Clica **🚀 Abrir Claude.ai**

---

### PASSO 5 · Gerar o artifact no Claude.ai (~2 min)

1. No Claude.ai (nova aba que abriu):
   - Faz login se ainda não tá logado
   - Confirma que tá no **modelo Sonnet 4.6** (canto inferior do input)
2. Clica no input "Como posso ajudar você hoje?"
3. **Ctrl+V** — Claude vai mostrar o conteúdo como **"PASTED"** (chip cinza acima do input). **Não precisa anexar arquivo.**
4. Digita logo abaixo do PASTED:
   ```
   Renderiza como artifact seguindo EXATO o padrão visual e estrutura definidos no documento PASTED acima.
   ```
5. **Enter** ou clica no botão laranja de enviar
6. **Aguarda 80-120 segundos** — você vai ver:
   - "Trabalhando"
   - "Reading frontend-design skill"
   - "Kit linkedin v2 [nome do voice]"
   - HTML aparecendo aos poucos no painel direito

> ⏳ **Se ainda está em "Trabalhando" depois de 3 minutos:** algo travou. Cancela com o quadradinho preto, abre novo chat e cola de novo.

---

### PASSO 6 · Validar e salvar PDF (1 min)

Quando o artifact terminar:

1. **Painel direito mostra o kit renderizado** com:
   - Cover azul com nome do Voice
   - Botão **📥 Salvar como PDF** no topo do artifact
   - Goal banner roxo/azul
   - 10 seções (Quick Wins · Diagnóstico · Headline · Sobre · etc)
2. **Rola TODO o artifact antes de salvar** — confere:
   - ✅ Headline tem 207-220 chars (não estourou)
   - ✅ Sobre menciona "EPI-USE Voices" E "ERP.ngo"
   - ✅ Skills incluem SAP BTP / Clean Core / S/4HANA
   - ✅ Nenhum `[preencher: ...]` amarelo em campo crítico (Headline, Sobre primeira frase)
3. Clica **📥 Salvar como PDF** no topo direito do artifact
4. Diálogo do navegador abre → seleciona "Salvar como PDF" → escolhe pasta
5. Nome sugerido: `Kit-LinkedIn-[Nome do Voice]-AAAA-MM-DD.pdf`

---

## 🔁 SE ALGO SAIU RUIM — quando regenerar

Não precisa refazer do zero. Pede ajuste no mesmo chat:

| Problema | O que digitar pra IA |
|---|---|
| Headline genérica | "Reescreve a headline com mais agressividade técnica, mencionando S/4HANA + número de anos" |
| Sobre frio | "Refaz o Sobre em 1ª pessoa, começando com pergunta provocadora, mantendo EPI-USE Voices + ERP.ngo no mesmo parágrafo" |
| Muito `[preencher]` | "Preenche os placeholders amarelos usando informações da transcrição PASTED, mesmo que aproximadas" |
| Cores erradas | "Verifica que está usando navy #001844 / red #cd1543 / Inter font — refaz se desviou" |
| Quick Wins genéricos | "Reescreve os 9 Quick Wins citando especificidades do [Voice] (LOB, projetos, cases mencionados na transcrição)" |

---

## ❌ ERROS COMUNS — Troubleshooting

| Sintoma | Causa | Fix |
|---|---|---|
| "Template ainda não carregou" | Página antiga em cache | **Ctrl+Shift+R** (hard reload) |
| Toast verde aparece mas Claude não recebe nada | Clipboard perdeu foco entre tabs | Volta no Office, clica de novo no botão Copiar, vai DIRETO pro Claude.ai sem fazer outras ações |
| Claude responde texto em vez de artifact | Faltou "renderiza como artifact" na instrução | Manda no mesmo chat: "Renderiza isso como artifact, não como markdown" |
| Artifact sem cores (branco/preto) | Modo light forçado no claude.ai | No artifact, clica `</>` (código) e copia HTML, abre em Notepad → arquivo `.html` → abre no browser |
| Erro CORS / fetch bloqueado | Aconteceu se você tentou colar URL de localhost no Claude.ai | Sempre use Copy/Paste do prompt completo (não URL) |
| HTML truncado / cortado | Output do Sonnet atingiu limite de tokens | Mesmo chat: "Continue o HTML de onde parou" |
| Pula passos no fluxo | — | Sempre **5 passos completos** — atalho dá kit pior |

---

## 🎁 EXTRAS — pra ficar PRO

### Compartilhar PDF com o Voice

Crie um email-template salvo:
```
Oi [Voice],

Conforme combinamos, segue seu kit de otimização do LinkedIn personalizado a partir
da nossa reunião. São 10 seções com Quick Wins, headline pronta pra colar, sobre
estruturado, skills atualizados e checklist final.

Tempo estimado pra aplicar tudo: ~2 horas.

Qualquer dúvida durante a aplicação, fala comigo.

Forte abraço,
[Você]
```

### Acompanhar evolução do Voice

Depois de 30 dias da aplicação:
1. Pede SSI novo (`linkedin.com/sales/ssi`)
2. Conta seguidores ganhos
3. Gera kit V2 de novo usando o **mesmo** prompt mas atualizando os números
4. Compara SSI: meta era +26 pts (de 34 → 60+) em 90 dias

### Banco de cases

Salva o PDF gerado em:
```
OneDrive/MARKETING/Projetos/EPI-USE Voices/[NomeVoice]/Kit-LinkedIn-AAAA-MM.pdf
```

E o chat do Claude.ai (URL do chat) num bookmark — pra revisitar e ajustar.

---

## 🆘 Não conseguiu? Pede ajuda

- Rudá — `ruda.costa@epiuse.com.br`
- Print do erro + qual passo travou → manda no Teams

---

*by Rudá · EPI-USE Brasil · Programa Voices 2026 · 🐘 ERP.ngo*
