# Pendências — Área Brand Experience / Voices

- [ ] **Validar o auto-sync do calendário em prod** depois do deploy: abrir `/area/brand` — a barra "Ao vivo" deve mostrar `Calendário editorial · nuvem · há Xh`. Se mostrar "falhou", o erro aparece em "Precisa de atenção" (ex.: 403 = permissão Graph; 404 = link `EDITORIAL_SHARE_URL` mudou).
- [ ] **Voices sem usuário no Office** (a área avisa em "Precisa de atenção"): cadastrar em `/admin/users` pra poder atribuir pauta e creditar cliques.
- [ ] **SSI e seguidores automáticos:** só com API do LinkedIn (ou extensão). Até lá ficam no `/voices`.
- [ ] **Seguidores atribuídos aos Voices (meta 800):** sem fonte. Card fica `⏳ Aguarda integração LinkedIn`.
- [ ] Limpeza: o código específico de Brand dentro do `public/area.html` genérico (painel de Voices, modal de reports) não é mais servido em `/area/brand` — pode ser removido numa faxina.
