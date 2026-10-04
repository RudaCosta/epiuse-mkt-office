# Changelog — Área Brand Experience / Voices

## v1.0 · 04/out/2026
- `/area/brand` sai do template genérico `area.html` e ganha página própria (pedido Rudá: "reformule toda esta área… corte as integrações que não têm atualização automática… bem visual e atrativo, com animações JS… tracking só pro meu perfil").
- **Calendário editorial virou automático em prod:** o servidor lê a planilha do OneDrive via Microsoft Graph no boot e a cada 6h (Fase 2 do Módulo 25, destravada com `Files.Read.All` em 02/out). Estado do último sync em `app_blobs['editorial.auto']`.
- Entrou (dado vivo): esteira de pautas dos Voices, cliques reais nos links dos Voices, posts publicados, inscrições do `/seja-voice`, Cases com frescor do sync.
- Saiu (virou link): SSI/seguidores/"posts do mês"/kit/pendências chumbados no `voices.json`, digest e inbox do Painel da Duda, `linkedin-routine` como "posts/mês" da área (contava posts da página da empresa, não dos Voices), modal de reports (agora links em Fontes).
- Visual: céu de pontos conectados, constelação dos Voices em órbita (partículas = cliques reais, pulsos = pautas em andamento, cadeiras vazias = vagas), esteira com fluxo animado, contadores, gauges, donut de Cases que filtra, barras, semanas do calendário, paleta viva com cópia do hex, drawers.
- Tracking "quem viu o quê" (`kind='brand'`) + painel owner-only `/admin/brand` + link no nav só pro dono.
