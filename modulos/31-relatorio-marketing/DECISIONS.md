# Decisões — Relatório de Marketing

- **"Automático" = muda em prod sem ninguém rodar nada.** Fonte que depende de PC ligado, planilha enviada ou digitação vira link (LinkedIn XLS, Zoho, SAP 4 ME, eventos, metas). Cases fica dentro (tarefa diária provada desde jun) mas mostra o frescor.
- **Cortado em vez de linkado:** `rd-canais.json` tinha um toggle "simulado" — número de mentira não tem lugar nem como link (regra 7). `relatorio-outreach.json` era uma foto parada do Apollo; o Apollo ao vivo substitui.
- **GA4 no SQLite, não no arquivo:** `public/api/ga4-snapshot.json` volta ao conteúdo do git a cada deploy. Cada mês buscado vai pra `app_blobs`, que fica no volume. Só vale dado com `fetch_v ≥ 2` (os meses gravados pela versão com bug não entram).
- **Mês parcial não compara:** GA4 do mês aberto sai marcado "parcial" e sem variação. Para as fontes do Office (posts, cliques, inscrições), mês aberto compara com o mesmo pedaço do mês anterior.
- **Apollo do mês = diferença de totais acumulados.** Sem foto anterior ao mês, conta a partir da primeira foto e avisa a data. Sequência arquivada que derruba o total vira aviso, nunca número negativo.
- **RD sem histórico mostra a posição com data**, nunca finge que é o fim do mês.
- **Fluxo "do alcance à conversa" não é funil:** cada etapa vem de uma fonte; a nota diz isso na tela. Partículas em escala log pra caber 3 mil e 7 no mesmo desenho; o número exibido é sempre o real.
- **PDF = o próprio PPTX convertido** (LibreOffice), pra PPT e PDF nunca divergirem. Perfil do LibreOffice por execução; no máx. 2 gerações simultâneas.
- **Template oficial fora do git:** o `.pptx` da marca é ativo da Group Elephant e o repo é público. Upload só do dono, guardado no volume. Sem ele, o gerador desenha o padrão do Brand Guide 2026 (Deep Blue, Verdana, vermelho só acento, rodapé © Group Elephant).
- **Slide sem dado sai do deck** e a fonte aparece em "Fontes e método" com o status — a diretoria não recebe slide vazio nem número inventado.
- **Download gravado no servidor** (não no beacon): conta só arquivo que realmente saiu.
- **Link e chip do tracking pelo e-mail do dono** (`/api/analytics/owner`), não pelo papel de super admin — se um dia houver outro super admin, ele não vê.
