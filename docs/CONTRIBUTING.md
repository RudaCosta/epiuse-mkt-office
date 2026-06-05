# Contribuindo — EPI-USE Office

> Padrões e regras para quem trabalha neste repo.
> Ler antes de fazer qualquer commit.

---

## Regras inegociáveis

### Stack
- **Zero frameworks pesados** no frontend — apenas vanilla HTML/CSS/JS
- Backend somente em Node.js/Express com `server.js` como ponto de entrada
- Scripts utilitários em Python (pandas, openpyxl, python-pptx)
- Sem TypeScript, sem React, sem Vue, sem Angular, sem Webpack

### Dados
- **Dados REAIS ou etiqueta clara** — nunca publicar número fictício como real
- Etiquetas obrigatórias: `⏳ Aguardando integração [X]`, `📝 Dado de demonstração`, `⚠️ Estimativa`

### Deploy
- **Nunca fazer `git push origin master` sem ordem explícita do Rudá**
- A ordem precisa ser explícita: "sobe", "deploy", "push pro railway"
- Uma ordem no início da sessão **não** autoriza pushes posteriores

### Conteúdo
- Português do Brasil em toda interface e conteúdo
- Aprovação da Duda antes de qualquer publicação externa
- Sem citação de concorrentes nominalmente em conteúdo público
- Sem citação de clientes nominalmente sem aprovação

---

## Fluxo de trabalho

```
1. Criar branch
   git checkout -b feat/minha-feature

2. Desenvolver localmente (node server.js)

3. Commitar com mensagem padrão

4. Push da branch
   git push origin feat/minha-feature

5. Abrir Pull Request no GitHub

6. Aguardar revisão do Rudá

7. Merge em master (Rudá faz o merge)

8. Deploy no Railway (somente quando Rudá aprovar)
```

---

## Padrão de commits

### Formato
```
<tipo>(<escopo>): <descrição curta> (vX.Y.Z)

- Detalhe opcional 1
- Detalhe opcional 2
```

### Tipos
| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `style` | Ajuste visual (CSS, layout) sem lógica |
| `chore` | Dependências, configs, scripts utilitários |
| `data` | Atualização de dados em `public/api/` |

### Escopos comuns
`area`, `optimizer`, `pipeline`, `painel`, `cowork`, `inbound`, `cases`, `artigos`, `metas`, `relatorio`, `design`, `server`, `scripts`, `docs`

### Exemplos
```
feat(optimizer): V2 com input de transcricao (0.9.3)
fix(server): corrige rota /api/health sem autenticacao
docs(readme): atualiza instrucoes de setup
data(areas): metas FY26 preenchidas no funil
style(area): meta-card com barra de progresso
chore(deps): atualiza better-sqlite3 para 12.x
```

---

## Versionamento

O projeto usa **SemVer informal**:
- `0.X.0` → nova feature significativa (sprint completa)
- `0.X.Y` → fix ou melhoria incremental

Bumpar sempre em `package.json` junto com o commit da feature.

---

## Design System

**Antes de mexer em qualquer CSS:**
1. Ler `vault/00-contexto/DESIGN.md`
2. Usar sempre `var(--color-*)` — nunca hardcodar hex
3. Telas novas: incluir `<link rel="stylesheet" href="/design-tokens.css">` no `<head>`
4. Para mudar tokens: editar `DESIGN.md` → rodar `python scripts/design/gen_tokens.py`

**Paleta oficial:**
```
Navy:        #001844  → var(--brand-epiuse-navy)
Red:         #cd1543  → var(--brand-epiuse-red)
Blue Light:  #869ec3  → var(--brand-epiuse-blue-light)
Grey:        #cfd1d3  → var(--brand-epiuse-grey)
```

---

## Adicionando uma nova página

1. Criar `public/minha-pagina.html`
2. Incluir no `<head>`:
   ```html
   <link rel="stylesheet" href="/design-tokens.css">
   ```
3. Incluir antes do `</body>`:
   ```html
   <script src="/office-nav.js"></script>
   <script src="/office-footer.js"></script>
   ```
4. Se precisar de rota customizada, adicionar em `server.js`
5. Adicionar link na área correspondente em `public/api/areas.json`

---

## Adicionando dados a uma área

Editar `public/api/areas.json`:

```json
{
  "id": "minha-area",
  "ferramentas": [
    {
      "label": "Nome da Ferramenta",
      "href": "/minha-pagina",
      "icon": "📊",
      "desc": "Descrição curta de uma linha"
    }
  ],
  "funil": [
    {
      "estagio": "Nome do Estágio",
      "valor": 1234,
      "fonte": "apollo",
      "meta": 2000
    }
  ]
}
```

**Campos de `valor`:**
- Se real e atualizado → número direto
- Se pendente de integração → `null` (a UI mostra `⏳`)
- Se estimativa → número com observação no campo `"obs"`

---

## .gitignore

Os seguintes arquivos/pastas **nunca são comitados**:
```
.env                          ← secrets
node_modules/                 ← dependências
logs/                         ← logs de runtime
vault/cowork-runs/            ← runs em tempo real
public/api/transcricao-*.txt  ← arquivos de teste
*.migrated                    ← migrations antigas
```

---

## Dúvidas

Abrir issue no GitHub ou falar com Rudá diretamente.

---

*Versão: junho/2026*
