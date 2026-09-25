// ════════════════════════════════════════════════════════════════════════════
// routes/offboarding.js — limpeza de saída de pessoa do time
//
// Por que existe: quando alguém sai, o nome fica espalhado pelo banco de PROD —
// responsável de evento, autor de ideia, autor de pauta, cartão do Cafezinho,
// registro de acesso. Trocar só os JSONs do repo não resolve: quem assume a
// cadeira abre /field-marketing e continua vendo o nome de quem saiu em cada
// evento. Além de desconfortável, é dado errado (a pessoa não responde mais).
//
// Por que por VARIÁVEL DE AMBIENTE e não no código: pra não deixar o nome de
// ninguém cravado no repositório. Quem sai não vira constante no git. O Rudá
// seta a var no Railway, o deploy roda a limpeza uma vez, e depois a var pode
// ser apagada — o marcador no banco impede que rode de novo.
//
// Formato (3 campos separados por |, o terceiro é opcional):
//   OFFBOARD_PESSOA="Nome Completo|email@epiuse.com.br|Nome de Quem Assumiu"
//
// O que faz com cada tipo de campo — a distinção importa:
//   • RESPONSABILIDADE (field_events.responsavel) → passa pra quem assumiu.
//     É handover: a pessoa nova responde por aqueles eventos agora.
//   • AUTORIA (autor de ideia, pauta, post) → vira rótulo neutro, NUNCA o nome
//     de quem assumiu. Atribuir texto dos outros a alguém é falsificar autoria.
//   • ACESSO (users) e CARTÃO PESSOAL (cafe_perfil) → saem do banco.
// ════════════════════════════════════════════════════════════════════════════
const { db } = require('../server-context');

const ROTULO_NEUTRO = 'Field Marketing';

function parsePessoa(raw) {
  const partes = String(raw || '').split('|').map(p => p.trim());
  const [nome, email, substituto] = partes;
  if (!nome && !email) return null;
  return { nome: nome || '', email: (email || '').toLowerCase(), substituto: substituto || '' };
}

// Cada tabela roda no seu try: as do Cafezinho só existem depois que aquele
// router carrega, e em banco novo várias ainda nem foram criadas.
function passo(label, fn) {
  try {
    const n = fn();
    if (n) console.log(`[offboarding] ${label}: ${n} registro(s)`);
    return n;
  } catch (e) {
    if (!/no such table|no such column/i.test(e.message)) {
      console.warn(`[offboarding] ${label} falhou:`, e.message);
    }
    return 0;
  }
}

function rodarOffboarding() {
  const pessoa = parsePessoa(process.env.OFFBOARD_PESSOA);
  if (!pessoa) return; // nada configurado = no-op silencioso (é o caso normal)

  const novo = pessoa.substituto || ROTULO_NEUTRO;

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS users_migrations (
      key TEXT PRIMARY KEY,
      ran_at TEXT DEFAULT (datetime('now'))
    )`);
    // Chave por e-mail: cada pessoa é limpa uma vez, e configurar outra saída
    // depois volta a rodar sem precisar mexer em código.
    const migKey = 'offboard:' + (pessoa.email || pessoa.nome.toLowerCase());
    if (db.prepare(`SELECT 1 FROM users_migrations WHERE key = ? LIMIT 1`).get(migKey)) return;

    console.log('[offboarding] limpando registros de quem saiu do time…');

    // ── Acesso ──────────────────────────────────────────────────────────────
    if (pessoa.email) {
      passo('acesso removido', () =>
        db.prepare(`DELETE FROM users WHERE lower(email) = ?`).run(pessoa.email).changes);
      passo('cartão do Cafezinho removido', () =>
        db.prepare(`DELETE FROM cafe_perfil WHERE lower(email) = ?`).run(pessoa.email).changes);
      passo('reações do Cafezinho removidas', () =>
        db.prepare(`DELETE FROM cafe_reacoes WHERE lower(email) = ?`).run(pessoa.email).changes);
      // O post do mural fica (é conteúdo do time, outros já reagiram), mas
      // desligado da pessoa: sem e-mail no payload que o /cafezinho devolve.
      passo('posts do mural desvinculados', () =>
        db.prepare(`UPDATE cafe_posts SET email = '' WHERE lower(email) = ?`).run(pessoa.email).changes);
    }

    if (pessoa.nome) {
      // ── Responsabilidade: handover de verdade ─────────────────────────────
      passo(`eventos repassados para ${novo}`, () =>
        db.prepare(`UPDATE field_events SET responsavel = ?, updated_at = datetime('now')
                    WHERE responsavel = ?`).run(novo, pessoa.nome).changes);

      // ── Autoria: rótulo neutro, nunca o nome de quem assumiu ──────────────
      for (const [tabela, col] of [['ideias_mkt', 'autor'],
                                   ['editorial_calendar', 'autor'],
                                   ['content_pipeline', 'autor'],
                                   ['cafe_posts', 'autor']]) {
        passo(`autoria neutralizada em ${tabela}`, () =>
          db.prepare(`UPDATE ${tabela} SET ${col} = ? WHERE ${col} = ?`)
            .run(ROTULO_NEUTRO, pessoa.nome).changes);
      }
    }

    db.prepare(`INSERT OR IGNORE INTO users_migrations (key) VALUES (?)`).run(migKey);
    console.log('[offboarding] concluído. A var OFFBOARD_PESSOA já pode ser removida.');
  } catch (e) {
    console.warn('[offboarding] falhou:', e.message);
  }
}

module.exports = { rodarOffboarding, parsePessoa };
