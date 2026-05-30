# Integração Claude + Codex + Obsidian

## Ideia central

O Obsidian é a interface visual da memória. Claude e Codex são operadores que leem e escrevem os arquivos Markdown da mesma pasta.

```text
Obsidian
  abre: vault/
  edita: contexto, workspaces, entregas

Claude Code
  abre: G:\Meu Drive\Claude MKT EUBR
  lê: CLAUDE.md + vault/
  escreve: vault/workspaces/ e arquivos do projeto

Codex
  abre: G:\Meu Drive\Claude MKT EUBR
  lê: AGENTS.md + vault/
  escreve: vault/workspaces/ e arquivos do projeto
```

## Como abrir

1. No Obsidian, use **Open folder as vault**.
2. Selecione:

```text
G:\Meu Drive\Claude MKT EUBR\vault
```

3. Abra a nota:

```text
_entrada.md
```

## Como usar no dia a dia

Use a vault como quadro de comando:

- Pedidos novos entram em `workspaces/<agente>/inbox/`.
- Memória de trabalho fica em `workspaces/<agente>/_vt.md`.
- Entregas em revisão ficam em `workspaces/<agente>/outbox/`.
- Versões finais aprovadas vão para `entregas/`.
- Verdades permanentes ficam em `00-contexto/`.

## Como acionar Claude ou Codex

Sempre abra a ferramenta na raiz do projeto:

```text
G:\Meu Drive\Claude MKT EUBR
```

Assim cada ferramenta encontra automaticamente:

- `CLAUDE.md`, para Claude Code.
- `AGENTS.md`, para Codex.
- `vault/`, para memória compartilhada.
- `.claude/` e `.codex/`, para agentes e comandos locais.

## Regra de ouro

Não tente sincronizar por copy/paste. A integração é por arquivo.

Obsidian mostra e organiza. Claude e Codex executam. A vault é a fonte compartilhada.

