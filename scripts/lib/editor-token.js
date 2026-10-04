// Resolve o EDITOR_TOKEN dos scripts de sync.
//
// Ordem: variável de ambiente → .env FORA do repositório (o mesmo arquivo que o
// servidor lê em server-context.js). Não existe valor padrão aqui de propósito:
// o repositório é público, e um token escrito no código vale pra qualquer um.
//
// Sem token, devolve '' e avisa uma vez — a chamada ao servidor volta 401 e o
// script mostra a falha. Não lança erro pra não quebrar modos dry-run que nem
// chegam a falar com o servidor.
const fs = require('fs');
const os = require('os');
const path = require('path');

let avisou = false;

module.exports = function editorToken() {
  if (process.env.EDITOR_TOKEN) return process.env.EDITOR_TOKEN;
  const user = os.userInfo().username;
  const candidatos = [
    `C:/Users/${user}/.epiuse-optimizer/.env`,
    'C:/Users/Ruds/.epiuse-optimizer/.env',
    path.resolve(__dirname, '../../.env'),
  ];
  for (const f of candidatos) {
    try {
      const m = fs.readFileSync(f, 'utf8').match(/^EDITOR_TOKEN=(.*)$/m);
      if (m && m[1].trim()) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch (_e) { /* arquivo não existe nesse caminho */ }
  }
  if (!avisou) {
    avisou = true;
    console.warn('[editor-token] EDITOR_TOKEN não encontrado. Defina a variável de ambiente ' +
      'ou adicione EDITOR_TOKEN=... em C:/Users/<você>/.epiuse-optimizer/.env');
  }
  return '';
};
