# Setup Plausible Analytics — EPI-USE Voices

> Status atual: script `<script defer data-domain=... src="https://plausible.io/js/script.js">` está instalado em **6 HTMLs** do projeto, mas **a conta no plausible.io ainda não foi criada**. Sem conta, não há coleta.

## Por que Plausible (e não Google Analytics)?

- ✅ GDPR-friendly por design (sem cookies, sem consent banner)
- ✅ Dashboard simples e direto
- ✅ Custom events sem setup complicado
- ✅ Free trial 30 dias, depois $9/mês (plano hobby — suficiente)
- ✅ Open source (self-host opcional)

## Setup (5 minutos)

### Passo 1 — Criar conta

1. Acessar **https://plausible.io**
2. Sign up (email + senha — sem cartão pra trial)
3. Confirmar email

### Passo 2 — Adicionar o site

1. No dashboard: **Add a website**
2. Domain: `epiuse-voices-optimizer.up.railway.app`
3. Timezone: `America/Sao_Paulo`
4. Confirmar

### Passo 3 — Verificar que script está rodando

O script **já está instalado** nos seguintes HTMLs (commit v3.0):
- `public/office.html` (game)
- `public/dashboard.html` (war room)
- `public/optimizer.html` (Profile Optimizer)
- `public/painel.html` (Painel da Duda)
- `public/voices.html` (Voice Agents)
- `public/seja-voice.html` (LP recrutamento)

Para verificar coleta:
1. Abrir **janela anônima** (importante — sem AdBlock + sem cache)
2. Acessar `https://epiuse-voices-optimizer.up.railway.app/`
3. Esperar 30 segundos
4. No Plausible dashboard, verificar gráfico de "Visitors" → deve ter +1
5. Verificar "Current visitors" no topo direito

### Passo 4 — Configurar Goals (custom events)

Os seguintes eventos custom **já estão instrumentados no código**:

| Event name | Quando dispara | Página |
|---|---|---|
| `pageview` | toda visita | todas |
| `Voice Page View` | clicar num Voice na galeria | /voices |
| `Voices Gallery View` | abrir galeria | /voices |
| `Painel View` | abrir Painel da Duda | /painel |
| `Voice Prompt Copied` | clicar "Copiar prompt" no Voice Agent | /voices?v=... |
| `Recruitment Form` | enviar form da LP | /seja-voice |

**Para configurar como Goals (no dashboard Plausible):**

1. Menu → **Site Settings**
2. **Goals** (sidebar esquerda)
3. **Add goal** → tipo `Custom event`
4. Goal name: `Recruitment Form` (exatamente como está no código)
5. Salvar
6. Repetir pra cada um da lista acima

### Passo 5 — Funnel de recrutamento (opcional, $9/mês)

Funnels existem no plano Growth ($19/mês). Sugestão:

```
LP visit → Recruitment Form submit
(/seja-voice)   (Custom event)
```

Vai mostrar % de conversão da LP. Não obrigatório pra MVP.

### Passo 6 — Atribuição por Voice (UTM)

O backend já adiciona `?utm_source=linkedin&utm_voice={slug}` no redirect `/v/:slug`. No Plausible:

1. Aba **Sources** → automaticamente mostra `utm_source = linkedin`
2. Aba **Campaigns** → mostra `utm_campaign = voices-mvp`
3. Para filtrar por Voice específico:
   - Click no `+` ao lado de "Filter"
   - Property: `utm_voice`
   - Value: `anderson-costa` (ou outro slug)

Isso permite ver quantas pessoas chegaram via bio do Anderson vs Carlos vs links das vagas.

### Passo 7 — Avisar o Rudá quando coleta começar

Editar `vault/workspaces/ceo/_vt.md` adicionando:

```
## Plausible
- Setup feito em: YYYY-MM-DD
- Account: voices@... (ou conta corporativa)
- URL dashboard: https://plausible.io/epiuse-voices-optimizer.up.railway.app
- Plano: Trial 30d / Hobby $9 / Growth $19
- Goals configurados: ✅ Recruitment Form · Voice Page View · Painel View
```

## Troubleshooting

**"Não aparece nenhum visitor"**
- AdBlock instalado bloqueia plausible.io → testar em anônima
- Script bloqueado por CSP → ver console do browser
- Domain configurado errado → confere se bate exatamente com URL do Railway

**"Custom event não aparece"**
- Janela anônima → executar a ação → esperar 30s
- Console do browser: verificar se `window.plausible` está definido
- Confere se o evento está com mesmo nome (case-sensitive)

## Custo

- Trial: 30 dias grátis (até 10k pageviews/mês)
- Hobby: $9/mês (até 10k pageviews)
- Growth: $19/mês (até 100k pageviews + funnels)
- Para MVP 5 Voices com tráfego baixo: **Trial → Hobby basta**

## Alternativa self-hosted (mais técnica)

Plausible é open source. Dá pra rodar no próprio Railway:
- Imagem oficial: `plausible/analytics`
- Custo: ~$5/mês de container
- Mais setup mas zero custo recorrente Plausible
- Recomendação: deixar pra v4 quando tiver volume

---

*Última atualização: maio/2026 (v3.1) · Responsável: Rudá Costa*
