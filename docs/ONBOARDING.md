# Onboarding — EPI-USE Office

> Guia para novos membros do time. Leia do começo ao fim antes de mexer em qualquer coisa.
> Tempo estimado: 30 minutos.

---

## 1. O que é esse projeto

O **EPI-USE Office** é a plataforma interna do time de RevOps & Marketing da EPI-USE Brasil. Centraliza:

- **Inteligência de mercado** — pipeline Apollo, base de 39k+ contatos
- **Programa Voices** — kit de LinkedIn para consultores (Profile Optimizer)
- **Conteúdo editorial** — pipeline de artigos, 693 artigos no ar
- **Operação Duda** — painel diário da Brand Experience
- **Métricas** — relatório mensal, metas FY26, funis por área

É uma plataforma **interna** — não é pública. Roda em `localhost:3000` (local) e Railway (produção).

---

## 2. Time e papéis

| Pessoa | Papel | O que aprova |
|---|---|---|
| **Rudá Costa** | RevOps & Marketing — estratégia, produto | Qualquer mudança no código ou infra |
| **Duda** | Brand Experience — operação | Qualquer publicação externa, conteúdo |
| **Roberto** | Country Manager Brasil | Aprovações executivas, cases, LOBs |
| **Lisiane de Assis** | CEO Redatoria | Tom de voz dos artigos |

**Regra de ouro:** toda publicação externa (LinkedIn, blog, ads) precisa de aprovação da Duda antes.

---

## 3. Setup local

### Pré-requisitos

```
Node.js 20+    → https://nodejs.org/
Python 3.10+   → https://python.org/
Git            → https://git-scm.com/
```

### Passo a passo

```bash
# 1. Clone o repo
git clone https://github.com/RudaCosta/epiuse-mkt-office.git
cd epiuse-mkt-office

# 2. Instale dependências Node
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# → Solicite ao Rudá os valores reais das chaves

# 4. Inicie o servidor
node server.js

# 5. Acesse no browser
# http://localhost:3000
```

### Windows — inicialização automática (recomendado)

```powershell
# Instala Tarefas Agendadas (sobe no login + healthcheck a cada 5 min)
powershell -ExecutionPolicy Bypass -File scripts/lifecycle/install-task.ps1
```

Após isso o servidor sobe automaticamente ao login. Para controle manual:
```powershell
scripts/lifecycle/start-office.ps1   # iniciar
scripts/lifecycle/stop-office.ps1    # parar
```

---

## 4. Variáveis de ambiente

Solicitar ao Rudá. Nunca commitar o `.env`.

| Variável | Para que serve |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API (Profile Optimizer, Cowork) |
| `APOLLO_API_KEY` | Apollo.io (pipeline, outbound) |
| `RESEND_API_KEY` | E-mails transacionais |
| `EDITOR_TOKEN` | Token interno para sync de cases |
| `SESSION_SECRET` | Express session (qualquer string longa) |
| `PORT` | Porta do servidor (padrão: 3000) |

---

## 5. Entendendo a estrutura

### O que você vai mexer (na maioria das vezes)

```
public/api/areas.json      ← dados das 6 áreas (funil, KPIs, ferramentas)
public/*.html              ← páginas da plataforma
vault/00-contexto/*.md     ← contexto dos agentes de IA
```

### O que você NÃO deve mexer sem entender

```
server.js                  ← backend — mexer com cuidado
public/design-tokens.css   ← gerado automaticamente (não editar direto)
scripts/lifecycle/*.ps1    ← lifecycle do servidor Windows
```

### Design System

**Nunca hardcodar hex no CSS.** Sempre usar variáveis:
```css
/* ✅ Certo */
color: var(--color-text, #e6ebf2);
background: var(--brand-epiuse-navy, #001844);

/* ❌ Errado */
color: #e6ebf2;
background: #001844;
```

Para mudar cores/tipografia: editar `vault/00-contexto/DESIGN.md` e rodar:
```bash
python scripts/design/gen_tokens.py
```

---

## 6. Como trabalhar

### Fluxo de desenvolvimento

```
1. Crie uma branch para sua feature
   git checkout -b feat/minha-feature

2. Faça as mudanças

3. Commit seguindo o padrão:
   git commit -m "feat(modulo): descrição curta (vX.Y.Z)"

4. Push e abra PR para master
   git push origin feat/minha-feature

5. Rudá revisa e aprova antes do merge
```

### Padrão de commits

```
feat(area): nova funcionalidade
fix(server): correção de bug
docs(readme): atualização de documentação
refactor(pipeline): refatoração sem mudança de comportamento
style(design): ajuste visual sem lógica
chore(deps): atualização de dependência
```

### Regra de deploy

**NUNCA fazer `git push origin master` diretamente sem ordem explícita do Rudá.**

O push para master dispara deploy automático no Railway. A ordem tem que vir explicitamente: "sobe", "deploy", "push pro railway", etc.

---

## 7. Dados: real vs placeholder

Esta plataforma trabalha com **dados reais**. Etiquetas obrigatórias quando não for real:

| Etiqueta | Quando usar |
|---|---|
| `📝 Dado de demonstração` | Mock/seed para desenvolvimento |
| `⚠️ Estimativa — premissa: X` | Calculado/projetado |
| `🤖 Gerado por IA — revisar` | Output de Claude |
| `⏳ Aguardando integração [X]` | Placeholder pendente |
| `🔮 Projeção (não realizado)` | Forecast |

**Nunca publicar número fictício como se fosse real.**

---

## 8. Módulos e páginas

Ver [`MODULES.md`](MODULES.md) para mapa completo.

As páginas mais importantes para entender primeiro:
1. `/` → Home (ponto de entrada)
2. `/area?id=voices` → Área de Voices (mais ativa)
3. `/optimizer-v2` → Profile Optimizer V2
4. `/pipeline` → Pipeline Apollo
5. `/painel` → Painel da Duda (em construção)

---

## 9. Ferramentas externas

| Ferramenta | Acesso | Para que serve |
|---|---|---|
| Apollo.io | Solicitar ao Rudá | Base de contatos, sequências de e-mail |
| Railway | Solicitar ao Rudá | Deploy e logs de produção |
| Anthropic Console | Solicitar ao Rudá | Monitorar uso da Claude API |
| Resend | Solicitar ao Rudá | E-mails transacionais |

---

## 10. Dúvidas frequentes

**Q: O servidor não sobe localmente. O que faço?**
A: Verificar se `.env` está preenchido. Verificar se `node -v` é 20+. Ver logs em `logs/office.err.log`.

**Q: Mudei um CSS mas não apareceu no browser.**
A: Verificar se está usando variáveis CSS (`var(--cor)`). Se editou `DESIGN.md`, rodar `gen_tokens.py`.

**Q: Como adicionar uma nova página?**
A: Criar `public/minha-pagina.html`. Incluir no `<head>`: `<link rel="stylesheet" href="/design-tokens.css">` e `<script src="/office-nav.js"></script>`. Adicionar rota em `server.js` se necessário.

**Q: Como atualizar os dados de uma área?**
A: Editar `public/api/areas.json`. Os campos são documentados no próprio arquivo.

**Q: Posso fazer deploy sem perguntar ao Rudá?**
A: Não. Sempre perguntar. O deploy é manual e intencional.

---

## 11. Contatos

- Dúvidas técnicas: abrir issue no GitHub ou falar com Rudá
- Dúvidas de conteúdo/branding: falar com Duda
- Aprovações executivas: Roberto

---

*Versão deste documento: junho/2026*
