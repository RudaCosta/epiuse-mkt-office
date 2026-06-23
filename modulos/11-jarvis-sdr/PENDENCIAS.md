# PENDÊNCIAS — Módulo 11 (JARVIS)

## 🟡 Limitações conhecidas (v0.1)
- **Captura de áudio do prospect em call remota.** O `Web Speech API` capta só o microfone local. Em
  reunião remota (Teams/Meet/Zoom), as falas do prospect entram pelo **fallback manual** ou viva-voz.
  → Evolução: captura de áudio do sistema (loopback / `getDisplayMedia` com áudio de aba) ou integração
  com bot de reunião.
- **Atribuição de quem fala.** No mic, o operador escolhe manualmente "Prospect/SDR" (segmento). Sem
  diarização automática ainda.
- **Sem persistência.** A sessão de call não é salva (sem histórico, sem log no CRM).

## 🟢 Backlog (não-bloqueado)
- **Pré-call enrich automático** via Apollo/Zoho: puxar cargo, empresa, setor e deals abertos do prospect
  pra pré-preencher o contexto. (MCPs `Apollo_io` / `Zoho_CRM` já disponíveis no Office.)
- **"Deep mode" (Sonnet)** sob demanda: análise pós-call mais rica (resumo, MEDDIC scorecard, e-mail de follow-up).
- **Pós-call:** gerar resumo + próximos passos + draft de e-mail e (opcional) registrar atividade no CRM.
- **Detecção de objeção em tempo real** com match direto no `playbook.json` (resposta instantânea sem round-trip).
- **Histórico de calls** + métricas do SDR (talk-ratio médio, taxa de perguntas, temperatura final).
- **Modo treino:** rodar contra cenários simulados pra onboarding de SDR novo.

## ⚙️ Operacional
- Requer `ANTHROPIC_API_KEY` no `.env` off-repo. Sem ela, `/api/jarvis/coach` e `/brief` retornam 503 claro.
- Funciona melhor no **Chrome** (Web Speech API). Firefox/Safari → usar fallback manual.
- **Deploy Railway:** só sob ordem explícita do Rudá (Regra 3). v0.1 ficou em branch + PR draft.
