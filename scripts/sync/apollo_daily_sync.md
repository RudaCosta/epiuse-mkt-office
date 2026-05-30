# Apollo Daily Sync — Instruções de execução

> Roteiro pra Claude (ou agente futuro) rodar manualmente até cron estar pronto.
> O Apollo MCP já está conectado: tools `mcp__9eac0979*__apollo_*`.

## Quando rodar
- **Manual:** sob demanda quando Rudá pedir "atualiza pipeline"
- **Agendado (próxima sprint):** Windows Task Scheduler diariamente 6h chama Claude headless com este script

## Sequência de chamadas (use estas MCP tools em ordem)

### 1. Contas ativas
```
mcp__9eac0979*__apollo_accounts_create  (não usar — só pra criar)
```
Usar listagem: pra pegar contas existentes, use search:
```
mcp__9eac0979*__apollo_mixed_companies_search
  filters: { account_stage_id: [stages com "Active"] }
  per_page: 100
```
Salvar: `contas_ativas` = total retornado

### 2. Contatos
```
mcp__9eac0979*__apollo_contacts_search
  per_page: 100
```
Salvar: `contatos_total` = total

### 3. Sequências rodando
```
mcp__9eac0979*__apollo_emailer_campaigns_search
  status: 'active'
```
Salvar: `sequencias_rodando` = count

### 4. Analytics dos últimos 30 dias
```
mcp__9eac0979*__apollo_analytics_sync_report
  date_range_mode: 'custom'
  start_date: <30 dias atrás ISO>
  end_date: <hoje ISO>
```
Salvar:
- `emails_enviados_30d` = num_emails_sent
- `opens_30d` = num_opens
- `replies_30d` = num_replies
- `reunioes_agendadas` = num_meetings_booked (se tiver)

### 5. POST pro endpoint Office

```bash
curl -X POST http://localhost:3000/api/pipeline/sync \
  -H "X-Editor-Token: eubr-voices-edit-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "contas_ativas": 142,
    "contatos_total": 3287,
    "sequencias_rodando": 8,
    "emails_enviados_30d": 1450,
    "opens_30d": 580,
    "replies_30d": 47,
    "reunioes_agendadas": 12,
    "pipeline_R$": 850000
  }'
```

## Endpoint backend (a criar quando 1º sync rodar)

```javascript
// server.js — adicionar quando começar a popular dados reais
app.post('/api/pipeline/sync', editorAuth, (req, res) => {
  const payload = req.body;
  const stmt = db.prepare(`
    INSERT INTO pipeline_snapshots (data, payload_json)
    VALUES (datetime('now'), ?)
  `);
  stmt.run(JSON.stringify(payload));
  res.json({ success: true, salvo_em: new Date().toISOString() });
});
```

## Schema SQLite a criar

```sql
CREATE TABLE IF NOT EXISTS pipeline_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data DATETIME DEFAULT CURRENT_TIMESTAMP,
  payload_json TEXT
);
```

## Notas
- Cron Windows: usar `claude --headless --print "roda apollo_daily_sync"` quando Claude Code CLI suportar
- Alternativa: agente `apollo-sync` em `.claude/agents/` que orquestra tudo
- Backup: salvar JSON da resposta também em `vault/00-contexto/pipeline/snapshots/YYYY-MM-DD.json`
