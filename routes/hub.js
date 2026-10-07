// ════════════════════════════════════════════════════════════════════════════
// routes/hub.js — Marketing Hub v2 (Módulo 35)
//
// O Hub é a página da EMPRESA TODA (papel 'hub' = qualquer colaborador). Por
// isso ele não lê os JSONs do time direto: esta API monta só os campos que a
// página mostra, numa lista branca. Meta de vendas, SLA do SDR, KPI de CRM,
// número de lead/oportunidade e afins nunca saem daqui, nem se alguém
// acrescentar campo novo nos arquivos de origem.
//
// GET /api/hub/resumo → agenda (calendário oficial), contagem de artigos,
// Voices no programa, campanhas ativas e quem cuida de cada área.
// Tracking "quem viu o quê" fica em routes/analytics.js (AREA_TRACK.hub).
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const API_DIR = path.join(__dirname, '../public/api');

// Cache por mtime: o arquivo só é relido quando muda (sync/commit).
const _cache = {};
function ler(nome) {
  const f = path.join(API_DIR, nome);
  try {
    const m = fs.statSync(f).mtimeMs;
    if (!_cache[nome] || _cache[nome].m !== m) _cache[nome] = { m, d: JSON.parse(fs.readFileSync(f, 'utf8')) };
    return _cache[nome].d;
  } catch (e) { return null; }
}

// "Pra que me procurar", escrito pra quem é de fora do Marketing. O 'foco' do
// team.json é a descrição interna da área (cita ferramenta de CRM, outbound,
// verba de parceiro) e por isso NÃO vai pro Hub. Área nova sem texto aqui sai
// sem descrição — nunca cai no texto interno.
// 🤖 Texto escrito com IA em 07/out/2026 — revisar com a Duda (Módulo 35, PENDENCIAS).
const FALE_SOBRE = {
  head: 'Estratégia de Marketing, prioridades do time e projetos novos.',
  intelligence: 'Dados e inteligência de mercado: listas, segmentação, perfil de cliente ideal e painéis de Marketing.',
  growth: 'Mídia paga, SEO, crescimento no LinkedIn e pautas pro blog.',
  field: 'Eventos e feiras no Brasil e na LATAM, presença da EPI-USE em eventos SAP e ativações.',
  'sales-dev': 'A ponte entre Marketing e Vendas: indicação de contatos e abordagem de contas novas.',
  brand: 'Marca e identidade visual, programa EPI-USE Voices e aprovação de peças antes de publicar.',
};

const str = (v, max = 200) => (v == null ? '' : String(v).slice(0, max));
const pick = (o, campos) => Object.fromEntries(campos.map(k => [k, str(o && o[k])]));

function resumo() {
  const ev = ler('events.json');
  const art = ler('artigos.json');
  const voi = ler('voices.json');
  const cam = ler('campanhas-ativas.json');
  const team = ler('team.json');

  const EV_CAMPOS = ['d', 'n', 'lob', 'who', 'country', 'flag', 'local'];
  const evs = (aba) => ((ev && ev.abas && ev.abas[aba] && ev.abas[aba].eventos) || [])
    .map(e => ({ m: Math.max(1, Math.min(12, parseInt(e.m, 10) || 0)), ...pick(e, EV_CAMPOS) }))
    .filter(e => e.n);

  const prog = (voi && voi.programa) || null;
  const lead = team && Array.isArray(team.lideranca) ? team.lideranca[0] : null;

  return {
    agenda: ev ? {
      ano: parseInt(ev.ano, 10) || null,
      atualizado_em: str(ev.atualizado_em, 30),
      fonte: str(ev.fonte),
      fonte_url: /^https:\/\//.test(ev.fonte_url || '') ? str(ev.fonte_url, 500) : '',
      brasil: evs('brasil'),
      latam: evs('latam'),
    } : null,
    artigos: art && art.agregados ? {
      total: parseInt(art.agregados.total_artigos, 10) || (Array.isArray(art.artigos) ? art.artigos.length : 0),
      atualizado_em: str(art.gerado_em, 30),
    } : null,
    voices: prog ? {
      ativos: Array.isArray(voi.voices) ? voi.voices.length : 0,
      vagas: parseInt(prog.vagas_total, 10) || null,
      atualizado_em: str(prog.atualizado_em, 30),
    } : null,
    campanhas: ((cam && cam.campanhas) || []).filter(c => c && c.ativa !== false).map(c => ({
      ...pick(c, ['id', 'tipo', 'org', 'nome', 'tagline', 'cta']),
      imagem: /^\/img\//.test(c.imagem || '') ? str(c.imagem) : '',
      url: /^https:\/\//.test(c.url || '') ? str(c.url, 2000) : '',
    })),
    time: team ? {
      lideranca: lead ? { ...pick(lead, ['nome', 'cargo', 'icon']), foco: FALE_SOBRE.head } : null,
      areas: (team.areas || []).map(a => ({
        ...pick(a, ['id', 'nome', 'icon']),
        foco: FALE_SOBRE[a.id] || '',
        responsavel: str(a.responsavel && a.responsavel.nome),
      })),
    } : null,
  };
}

router.get('/api/hub/resumo', (req, res) => {
  res.set('Cache-Control', 'private, max-age=60');
  res.json(resumo());
});

module.exports = router;
module.exports.resumo = resumo;
