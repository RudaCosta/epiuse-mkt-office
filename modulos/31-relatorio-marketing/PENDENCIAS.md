# Pendências — Relatório de Marketing

- [ ] **Depois do deploy, abrir `/relatorio`** e conferir a barra de fontes: GA4 deve sair "atualizando" ~1 min após o boot (ele rebusca os 13 meses com o fetch corrigido). Se o build do Docker reclamar do LibreOffice, o resto funciona e só o botão PDF desativa.
- [ ] **(Opcional) Subir o template oficial `.pptx`** pelo rodapé do bloco "Leve o mês em PPT ou PDF" (só aparece pra você). Se os layouts tiverem nomes diferentes de `Title-slide_Elephant` / `Content-slide_white-bg-blank` / `End-slide_Elephant`, o gerador ignora e usa o padrão do guia — me avise os nomes.
- [ ] **Histórico mensal do RD e do Apollo começa agora:** meses anteriores ao deploy mostram "posição em DD/MM" (RD) ou "histórico ainda não cobre o mês" (Apollo). Some sozinho a partir do primeiro mês cheio.
- [ ] **LinkedIn da empresa:** volta pro relatório quando houver API (Community Management API) ou rotina automática no servidor.
- [ ] Faxina: `/api/relatorio/snapshot` (antigo) ficou sem tela; `/executivo` (Diretoria) ainda lê `ga4-snapshot.json` direto (meses trocados até o refresh corrigido rodar) e `/api/rd/canais|performance` (`rd-canais.json` estático). Vale levar a Diretoria pro `/api/relatorio/live`.
