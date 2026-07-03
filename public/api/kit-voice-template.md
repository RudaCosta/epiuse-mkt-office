# 🪪 KIT LINKEDIN V1 · EPI-USE VOICES — Padrão Visual Anderson Costa

> **Como usar:** copia este arquivo INTEIRO · cola a transcrição da reunião na seção TRANSCRIÇÃO · cola tudo no [claude.ai](https://claude.ai/new) num chat novo dizendo *"renderiza como artifact"* · o assistente gera o HTML do kit no padrão visual oficial · salva PDF dentro do artifact pelo botão "Salvar como PDF" no topo.

---

## 🤖 INSTRUÇÕES PRA IA (NÃO APAGUE)

Você é especialista em personal branding executivo no ecossistema SAP. Sua tarefa é gerar **UM HTML como artifact** seguindo EXATAMENTE o padrão visual abaixo (template Anderson Costa · EPI-USE Voices 2026).

**Regras absolutas:**
- ❌ NÃO peça dados, NÃO peça screenshots, NÃO escreva nada no chat
- ❌ NÃO altere o CSS — use o bloco completo abaixo
- ❌ NÃO use cores diferentes nem fontes diferentes
- ✅ Devolva **APENAS o HTML do artifact** (`<!doctype html>` até `</html>`)
- ✅ Onde faltar dado real na transcrição: `<span class="highlight-warning" style="display:inline-block;padding:1px 7px;font-size:11px">⚠ a definir: descrição</span>`
- ✅ Nunca invente números (SSI, %, seguidores) — use o highlight-warning acima

---

## 🎨 CSS COMPLETO OBRIGATÓRIO (copia exato no `<style>` do artifact)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --radius: 12px; --font: 'Inter', sans-serif;
    --blue: #2563EB; --navy: #0A2342; --success: #059669; --warning: #D97706; --danger: #DC2626;
    --bg: #0d1b2e; --bg2: #0f2034;
    --surface: rgba(255,255,255,0.045); --surface2: rgba(255,255,255,0.075);
    --border: rgba(255,255,255,0.08); --border-blue: rgba(37,99,235,0.35);
    --text: #e2e8f0; --text-muted: #64748b; --text-dim: #94a3b8;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
  }
  body { font-family: var(--font); background: var(--bg); color: var(--text); line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .print-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(10,35,66,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-blue); padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .print-bar-label { font-size: 12px; color: var(--text-dim); letter-spacing: 0.04em; }
  .btn-print { background: var(--blue); color: #fff; border: none; border-radius: 8px; padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font); display: flex; align-items: center; gap: 7px; transition: background 0.2s; }
  .btn-print:hover { background: #1d4ed8; }
  .doc { max-width: 860px; margin: 0 auto; padding: 80px 24px 60px; }
  .cover { padding: 56px 0 48px; border-bottom: 1px solid var(--border); margin-bottom: 48px; }
  .cover-badge { display: inline-flex; align-items: center; gap: 7px; background: rgba(37,99,235,0.15); border: 1px solid var(--border-blue); border-radius: 20px; padding: 5px 14px; font-size: 11px; font-weight: 600; color: #93c5fd; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 24px; }
  .cover h1 { font-size: 32px; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 8px; letter-spacing: -0.02em; }
  .cover-name { font-size: 18px; font-weight: 500; color: #93c5fd; margin-bottom: 6px; }
  .cover-role { font-size: 14px; color: var(--text-dim); margin-bottom: 32px; }
  .cover-meta { display: flex; gap: 24px; flex-wrap: wrap; }
  .cover-pill { display: flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 6px 14px; font-size: 12px; color: var(--text-dim); }
  .cover-pill strong { color: var(--text); }
  .progress-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 40px; }
  .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .progress-header span { font-size: 13px; color: var(--text-dim); }
  .progress-header strong { font-size: 13px; color: var(--text); }
  .progress-bar-bg { background: rgba(255,255,255,0.08); border-radius: 99px; height: 8px; overflow: hidden; }
  .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--blue), #60a5fa); border-radius: 99px; transition: width 0.4s ease; }
  .section-title { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
  .step-num { width: 32px; height: 32px; background: var(--blue); color: #fff; font-size: 13px; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-num.diag { background: rgba(37,99,235,0.2); color: #60a5fa; border: 1px solid var(--border-blue); }
  .section-title h2 { font-size: 18px; font-weight: 700; color: #fff; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; margin-bottom: 24px; position: relative; }
  .card + .card { margin-top: 0; }
  .status-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .status-table th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); padding: 0 12px 10px 0; border-bottom: 1px solid var(--border); }
  .status-table td { padding: 11px 12px 11px 0; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; color: var(--text-dim); }
  .status-table td:first-child { color: var(--text); font-weight: 500; }
  .status-table tr:last-child td { border-bottom: none; }
  .badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .badge-urgent { background: rgba(220,38,38,0.15); color: #f87171; border: 1px solid rgba(220,38,38,0.3); }
  .badge-normal { background: rgba(217,119,6,0.15); color: #fbbf24; border: 1px solid rgba(217,119,6,0.3); }
  .badge-ok { background: rgba(5,150,105,0.15); color: #34d399; border: 1px solid rgba(5,150,105,0.3); }
  .copy-block { background: rgba(37,99,235,0.07); border: 1px solid rgba(37,99,235,0.25); border-radius: 10px; padding: 18px 20px; margin: 16px 0; position: relative; }
  .copy-block p { font-size: 14px; color: var(--text); line-height: 1.7; }
  .copy-block p + p { margin-top: 12px; }
  .copy-block strong { color: #93c5fd; }
  .btn-copy { position: absolute; top: 12px; right: 12px; background: rgba(37,99,235,0.2); border: 1px solid var(--border-blue); color: #93c5fd; border-radius: 6px; padding: 5px 12px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: var(--font); transition: background 0.2s; }
  .btn-copy:hover { background: rgba(37,99,235,0.35); }
  .btn-copy.copied { background: rgba(5,150,105,0.2); border-color: rgba(5,150,105,0.3); color: #34d399; }
  .highlight-urgent { background: rgba(220,38,38,0.1); border-left: 3px solid var(--danger); color: #fca5a5; border-radius: 10px; padding: 14px 18px; font-size: 13px; margin: 14px 0; line-height: 1.6; }
  .highlight-info { background: rgba(37,99,235,0.08); border-left: 3px solid var(--blue); color: #93c5fd; border-radius: 10px; padding: 14px 18px; font-size: 13px; margin: 14px 0; line-height: 1.6; }
  .highlight-warning { background: rgba(217,119,6,0.1); border-left: 3px solid var(--warning); color: #fcd34d; border-radius: 10px; padding: 14px 18px; font-size: 13px; margin: 14px 0; line-height: 1.6; }
  .howto-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); margin: 20px 0 10px; }
  .howto-list { list-style: none; counter-reset: step; }
  .howto-list li { counter-increment: step; display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: var(--text-dim); padding: 5px 0; }
  .howto-list li::before { content: counter(step); background: var(--surface2); border: 1px solid var(--border); color: var(--text); width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .criteria-list { list-style: none; }
  .criteria-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: var(--text-dim); padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
  .criteria-list li:last-child { border-bottom: none; }
  .criteria-list li::before { content: '✓'; color: var(--success); font-weight: 700; font-size: 13px; flex-shrink: 0; margin-top: 1px; }
  .field-table { width: 100%; border-collapse: collapse; font-size: 13.5px; margin: 10px 0; }
  .field-table th { text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); padding: 0 0 8px; border-bottom: 1px solid var(--border); }
  .field-table td { padding: 10px 8px 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: top; }
  .field-table td:first-child { color: var(--text-dim); width: 36%; font-weight: 500; }
  .field-table td:last-child { color: var(--text); }
  .field-table tr:last-child td { border-bottom: none; }
  .field-value-highlight { font-weight: 600; color: #93c5fd !important; }
  .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
  .skills-col { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .skills-col-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .skills-col-remove .skills-col-title { color: #f87171; }
  .skills-col-add .skills-col-title { color: #34d399; }
  .skill-tag { display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 500; margin: 3px; }
  .skill-remove { background: rgba(220,38,38,0.1); color: #fca5a5; border: 1px solid rgba(220,38,38,0.2); }
  .skill-add { background: rgba(5,150,105,0.1); color: #34d399; border: 1px solid rgba(5,150,105,0.2); }
  .checklist-section { margin-bottom: 28px; }
  .checklist-section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px; margin-bottom: 10px; }
  .checklist-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 4px; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; transition: background 0.15s; border-radius: 6px; }
  .checklist-item:hover { background: rgba(255,255,255,0.02); }
  .checklist-item:last-child { border-bottom: none; }
  .checklist-item input[type="checkbox"] { display: none; }
  .check-box { width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 5px; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: transparent; }
  .checklist-item.done .check-box { background: var(--success); border-color: var(--success); }
  .checklist-item.done .check-box::after { content: '✓'; color: white; font-size: 12px; font-weight: 700; }
  .checklist-item.done .check-label { color: var(--text-muted); text-decoration: line-through; }
  .check-label { font-size: 13.5px; color: var(--text-dim); line-height: 1.5; }
  .url-highlight { display: inline-flex; align-items: center; gap: 10px; background: var(--surface2); border: 1px solid var(--border-blue); border-radius: 8px; padding: 10px 16px; font-size: 15px; font-weight: 600; color: #93c5fd; margin: 14px 0; font-family: 'Courier New', monospace; }
  .spacer { height: 8px; }
  .label-sm { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; display: block; }
  .text-muted { color: var(--text-muted); font-size: 12px; }
  .text-body { font-size: 13.5px; color: var(--text-dim); line-height: 1.65; }
  .footer { border-top: 1px solid var(--border); margin-top: 56px; padding-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
  .footer-brand { font-size: 13px; font-weight: 600; color: var(--text-dim); }
  .footer-sub { font-size: 12px; color: var(--text-muted); }

  @media print {
    @page { size: A4; margin: 15mm 14mm 18mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .print-bar, .btn-copy { display: none !important; }
    .progress-wrap { display: none !important; }
    .doc { padding: 0; max-width: 100%; }
    .cover { padding: 20px 0 14px !important; margin-bottom: 16px !important; }
    .cover h1 { font-size: 24px !important; }
    .cover-meta { gap: 8px !important; }
    .card { box-shadow: none !important; break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; }
    .section-title { page-break-after: avoid; }
  }
</style>
```

---

## 📐 ESTRUTURA OBRIGATÓRIA DO HTML (siga EXATO)

### Topo do `<body>`:

```html
<!-- PRINT BAR fixa no topo -->
<div class="print-bar">
  <span class="print-bar-label">🪪 [NOME] — Kit de Atualização LinkedIn · EPI-USE Voices 2026</span>
  <button class="btn-print" onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
    Salvar como PDF
  </button>
</div>

<div class="doc">
  <!-- 1. COVER -->
  <div class="cover">
    <div class="cover-badge">🎙️ EPI-USE Voices &nbsp;·&nbsp; 2026</div>
    <h1>Kit de Atualização<br>de Perfil LinkedIn</h1>
    <div class="cover-name">[NOME DO VOICE]</div>
    <div class="cover-role">[CARGO] · EPI-USE Brasil · [ÁREA SAP]</div>
    <div class="cover-meta">
      <div class="cover-pill">📅 <strong>Gerado em:</strong>&nbsp; [MÊS/ANO]</div>
      <div class="cover-pill">📋 <strong>Passos:</strong>&nbsp; 7 etapas</div>
      <div class="cover-pill">✅ <strong>Checklist:</strong>&nbsp; [N] itens</div>
      <div class="cover-pill">🐘 ERP.ngo</div>
    </div>
  </div>

  <!-- 2. PROGRESS (oculta no print) -->
  <div class="progress-wrap">
    <div class="progress-header">
      <span>Progresso do kit</span>
      <strong id="progress-label">0 / [N] concluídos</strong>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" id="progress-fill" style="width: 0%"></div>
    </div>
  </div>
```

### Cards de seção — use ESSA ORDEM:

1. **DIAGNÓSTICO — Situação Atual** (`.card` com `<table class="status-table">` · 8 linhas: Empresa · Cargo · Sobre · Foto · Capa/Banner · URL · Competências · Publicações · cada uma com `badge-urgent`/`badge-normal`/`badge-ok`)
2. **Passo 1 — Foto de Perfil** (`.criteria-list` com 6 critérios + `.highlight-urgent` se foto fraca + `.howto-list` numerada)
3. **Passo 2 — Capa do Perfil/Banner** (texto + `.highlight-info` com dimensão 1584×396px + `.howto-list`)
4. **Passo 3 — Cargo e Empresa** (`<table class="field-table">` com Empresa/Cargo/Tipo/Data/Posição atual/Empresa anterior)
5. **Passo 4 — Headline** (`.copy-block` com `.btn-copy` + headline pronta em `<strong>` · `.howto-list`)
6. **Passo 5 — URL Personalizada** (`.url-highlight` com `linkedin.com/in/<strong>SLUG</strong>` + `.howto-list`)
7. **Passo 6 — Seção "Sobre"** (`.copy-block` com 5 parágrafos `<p>` em 1ª pessoa · 1 deles menciona **EPI-USE Voices** E **ERP.ngo** em `<strong>` · `.howto-list`)
8. **Passo 7 — Competências** (`.skills-grid` com 2 cols: `.skills-col-remove` e `.skills-col-add` · `.skill-tag.skill-remove`/`.skill-tag.skill-add`)
9. **Checklist Final** (`.checklist-section` por categoria FOTO/CAPA/CARGO/HEADLINE/URL/SOBRE/COMPETÊNCIAS · cada com `.checklist-item` interativo)

### Footer:

```html
<div class="footer">
  <div>
    <div class="footer-brand">EPI-USE Brasil · EPI-USE Voices 2026</div>
    <div class="footer-sub">Programa de Influência Executiva · Dúvidas? Fale com o time de Marketing.</div>
  </div>
  <div style="text-align:right">
    <div class="footer-sub">by Ruds · 🐘 ERP.ngo</div>
  </div>
</div>
```

### Script obrigatório (no final do `<body>`):

```html
<script>
  const TOTAL = [contar checklist-items];
  function toggleCheck(label) { label.classList.toggle('done'); updateProgress(); saveState(); }
  function updateProgress() {
    const done = document.querySelectorAll('.checklist-item.done').length;
    const pct = Math.round((done / TOTAL) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-label').textContent = done + ' / ' + TOTAL + ' concluídos';
  }
  function saveState() {
    const items = document.querySelectorAll('.checklist-item');
    const state = Array.from(items).map(i => i.classList.contains('done'));
    try { localStorage.setItem('kit-checklist', JSON.stringify(state)); } catch(_) {}
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem('kit-checklist') || '[]');
      const items = document.querySelectorAll('.checklist-item');
      items.forEach((item, i) => { if (saved[i]) item.classList.add('done'); });
      updateProgress();
    } catch(_) {}
  }
  function copyText(blockId, btn) {
    const block = document.getElementById(blockId);
    const text = block.innerText.replace(/^Copiar\n/, '').trim();
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✓ Copiado!'; btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 2000);
    });
  }
  loadState();
</script>
```

E cada `.checklist-item` deve ter `onclick="toggleCheck(this)"` e estrutura:

```html
<label class="checklist-item" onclick="toggleCheck(this)">
  <input type="checkbox">
  <div class="check-box"></div>
  <span class="check-label">[Texto do item]</span>
</label>
```

---

## 🏢 CONTEXTO EPI-USE BRASIL (use no Sobre)

- EPI-USE Brasil — maior consultoria SAP HCM/Payroll do Brasil; evoluindo para EPI-USE 5.0
- Grupo EPI-USE / **groupelephant.com** — 42+ anos · 4.500+ profissionais · 40+ países · 2.000+ clientes · SAP Gold Partner · ISG Leader
- Braços no Brasil: EPI-USE Brasil · EPI-USE Labs · Stratview · Valcann
- LOBs: SAP HCM/SuccessFactors · S/4HANA (Clean Core + Reforma Tributária) · BTP · Signavio · ServiceNow · Stratview
- IPs: TalenTools · PRISM
- **ERP.ngo:** 1% receita global → conservação de elefantes + África ([erp.ngo](https://erp.ngo)). **Todo Voice é embaixador ERP.ngo.**
- **EPI-USE Voices:** programa de influência executiva
- ⚠️ SEMPRE "EPI-USE Brasil" por extenso

---

## 📋 TRANSCRIÇÃO DA REUNIÃO COM O VOICE

```
[Cole aqui a transcrição completa da conversa com o Voice. Pode ser:
- Texto de uma reunião Teams/Meet/Zoom
- Notas tomadas durante entrevista
- Áudio transcrito (mesmo bagunçado)
- Respostas do roteiro de 12 perguntas
- Email ou chat WhatsApp com as respostas
- TUDO JUNTO MISTURADO — o assistente separa]

Não precisa formatar nada. Quanto mais natural, melhor a IA captura tom.

Se não tem transcrição ainda → deixa em branco mesmo. A IA vai gerar o
template com <span class="highlight-warning"> em todos os campos.]
```

---

## ✅ ENTREGA

**APENAS** o HTML do artifact (começa em `<!doctype html>` e termina em `</html>`). Inclui `<head>` com fonts + style completo + `<body>` com `.print-bar` · `.doc` (cover + progress + 8 cards de passo + checklist) · footer · script. **Nada antes, nada depois.**
