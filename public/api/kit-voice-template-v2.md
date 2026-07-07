# 🪪 KIT LINKEDIN V2 · EPI-USE VOICES — findskill.ai + Padrão Visual Anderson Costa

> **V2 — método findskill.ai** com **5 variáveis estruturadas + transcrição opcional**, gerando o kit no padrão visual oficial Anderson Costa.
>
> **Como usar:** cola este arquivo INTEIRO · troca os `{{campos}}` por dados reais · cola no seu assistente de IA dizendo *"renderiza como artifact"* · o assistente gera o HTML do kit · salva PDF dentro do artifact.

---

## 🤖 INSTRUÇÕES PRA IA (NÃO APAGUE)

IMPORTANT: Responda em português brasileiro.

You are a LinkedIn profile optimization expert specialized in the SAP ecosystem and the **EPI-USE Voices program**. Generate **UM HTML como artifact** seguindo EXATAMENTE o padrão visual abaixo (template Anderson Costa · EPI-USE Voices 2026) com o **framework findskill.ai** aplicado a `{{voice_name}}`.

**Regras absolutas:**
- ❌ NÃO peça dados, NÃO peça screenshots, NÃO escreva nada no chat
- ❌ NÃO altere o CSS — use o bloco completo abaixo
- ❌ NÃO use cores diferentes nem fontes diferentes
- ✅ Devolva **APENAS o HTML do artifact**
- ✅ Onde faltar dado real: `<span class="highlight-warning" style="display:inline-block;padding:1px 7px;font-size:11px">⚠ a definir: descrição</span>`
- ✅ Nunca invente números — placeholder amarelo se não veio

---

## 🎯 VARIÁVEIS DO VOICE (preenchidas antes de colar)

```
{{voice_name}}        = nome completo (ex: Anderson Costa)
{{current_role}}      = cargo oficial (ex: Delivery Strategic Account)
{{linkedin_url}}      = https://linkedin.com/in/...
{{key_skills}}        = 3-5 skills/expertise (ex: SAP HCM, SuccessFactors, Gestão de Conta)
{{target_audience}}   = público-alvo (ex: CHROs, Diretores RH, Líderes Folha)
{{unique_value}}      = diferencial único
{{career_goal}}       = Thought Leadership | Atração de Clientes | Recrutamento
{{ssi_score}}         = SSI atual (0-100) ou "não medido"
{{seguidores}}        = número atual de seguidores
{{lado_humano}}       = família · paixões · causas
{{resultados}}        = 3 resultados quantitativos reais
```

---

## 🎨 CSS COMPLETO OBRIGATÓRIO (copia exato no `<style>`)

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
  .status-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .status-table th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); padding: 0 12px 10px 0; border-bottom: 1px solid var(--border); }
  .status-table td { padding: 11px 12px 11px 0; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; color: var(--text-dim); }
  .status-table td:first-child { color: var(--text); font-weight: 500; }
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
  .criteria-list li::before { content: '✓'; color: var(--success); font-weight: 700; font-size: 13px; flex-shrink: 0; margin-top: 1px; }
  .field-table { width: 100%; border-collapse: collapse; font-size: 13.5px; margin: 10px 0; }
  .field-table th { text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); padding: 0 0 8px; border-bottom: 1px solid var(--border); }
  .field-table td { padding: 10px 8px 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: top; }
  .field-table td:first-child { color: var(--text-dim); width: 36%; font-weight: 500; }
  .field-table td:last-child { color: var(--text); }
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

  /* V2 EXTRA — Quick Wins · Keywords · Goal Card */
  .quickwin-grid { display: grid; gap: 10px; margin-top: 8px; }
  .quickwin-item { display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
  .quickwin-num { width: 28px; height: 28px; background: var(--blue); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
  .quickwin-body { flex: 1; }
  .quickwin-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .quickwin-desc { font-size: 12.5px; color: var(--text-dim); line-height: 1.55; }
  .keywords-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .keyword-pill { font-size: 12px; padding: 4px 10px; border-radius: 6px; background: rgba(37,99,235,0.12); color: #93c5fd; border: 1px solid rgba(37,99,235,0.25); }
  .goal-banner { background: linear-gradient(135deg, rgba(37,99,235,0.15), rgba(192,132,252,0.08)); border: 1px solid var(--border-blue); border-radius: 12px; padding: 18px 22px; margin: 16px 0 28px; }
  .goal-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #93c5fd; margin-bottom: 6px; }
  .goal-text { font-size: 16px; font-weight: 600; color: var(--text); }

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

## 📐 ESTRUTURA OBRIGATÓRIA DO HTML (10 SEÇÕES findskill)

### Topo:

```html
<div class="print-bar">
  <span class="print-bar-label">🪪 {{voice_name}} — Kit LinkedIn V2 (findskill) · EPI-USE Voices 2026</span>
  <button class="btn-print" onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
    Salvar como PDF
  </button>
</div>

<div class="doc">
  <!-- COVER -->
  <div class="cover">
    <div class="cover-badge">🎙️ EPI-USE Voices · V2 findskill.ai · 2026</div>
    <h1>Kit LinkedIn<br>Profile Optimizer</h1>
    <div class="cover-name">{{voice_name}}</div>
    <div class="cover-role">{{current_role}} · EPI-USE Brasil · {{key_skills}}</div>
    <div class="cover-meta">
      <div class="cover-pill">📅 <strong>Gerado em:</strong>&nbsp; [MÊS/ANO]</div>
      <div class="cover-pill">📋 <strong>Páginas:</strong>&nbsp; 10 seções</div>
      <div class="cover-pill">🎯 <strong>Goal:</strong>&nbsp; {{career_goal}}</div>
      <div class="cover-pill">🐘 ERP.ngo</div>
    </div>
  </div>

  <!-- GOAL BANNER -->
  <div class="goal-banner">
    <div class="goal-label">🎯 OBJETIVO PRINCIPAL DESTE KIT</div>
    <div class="goal-text">{{career_goal}} — Atrair {{target_audience}}</div>
  </div>

  <!-- PROGRESS (oculta no print) -->
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

### Cards de seção — ORDEM OBRIGATÓRIA:

1. **🚀 QUICK WINS — Top 9 Ações Prioritárias** (`.card` · `.quickwin-grid` com 9 `.quickwin-item` numerados 1-9 com `.quickwin-num` + `.quickwin-title` + `.quickwin-desc`)
2. **📋 DIAGNÓSTICO — Situação Atual** (`<table class="status-table">` 8 linhas: Empresa · Cargo · Headline · Sobre · Foto · Banner · URL · Competências · cada com badge)
3. **Passo 1 — Headline (220 chars)** — `.copy-block` com headline pronta seguindo fórmula `[Cargo] | [Expertise] | [Valor único]` · `.keywords-row` com 3 keywords-pill · `.label-sm` mostrando contador "X/220 chars" · `.howto-list`
4. **Passo 2 — Sobre: O GANCHO (265 chars)** — `.copy-block` com primeira frase impactante · explica qual técnica usou (declaração / pergunta / stat / POV) · `.label-sm` com "X/265 chars"
5. **Passo 3 — Sobre COMPLETO (2.600 chars)** — `.copy-block` com 4 parágrafos seguindo framework P1 Gancho / P2 História / P3 O que oferece / P4 CTA · 1 deles menciona **EPI-USE Voices** E **ERP.ngo** em `<strong>` · `.label-sm` "X/2.600 chars" · `.howto-list`
6. **Passo 4 — Experiência (verbos de ação)** — `.field-table` com Empresa / Cargo / Conquistas (3 itens com `{{resultados}}`) · `.criteria-list` com 4 verbos de ação recomendados (Liderei · Escalei · Pioneirei · Gerei)
7. **Passo 5 — Skills (50)** — `.skills-grid` com `.skills-col-remove` (legadas: ABAP, R/3, etc) e `.skills-col-add` (Top 3 em destaque + lista das demais) · `.highlight-info` com dica de endorsements
8. **Passo 6 — Em Destaque (Featured)** — `<table class="field-table">` com 3-6 itens de Featured sugeridos (tipo · título · por que importa)
9. **Passo 7 — Foto & Banner** — `.criteria-list` foto (6 critérios) · `.highlight-info` com link banner oficial EPI-USE Brasil · `.url-highlight` com link de download
10. **Passo 8 — Keywords + All-Star Profile** — `.keywords-row` com keywords-pill priorizadas pro `{{target_audience}}` · `.criteria-list` All-Star Checklist 13 itens
11. **Passo 9 — URL Personalizada + ERP.ngo** — `.url-highlight` com slug sugerido · `.howto-list` URL · `.highlight-info` com passo a passo ERP.ngo nas Causas Sociais
12. **Checklist Final** — `.checklist-section` por categoria (FOTO · CAPA · CARGO · HEADLINE · URL · SOBRE · COMPETÊNCIAS · FEATURED · KEYWORDS · ERP.ngo) com `.checklist-item` interativo

### Footer:

```html
<div class="footer">
  <div>
    <div class="footer-brand">EPI-USE Brasil · EPI-USE Voices 2026 · V2 (findskill.ai framework)</div>
    <div class="footer-sub">Goal: {{career_goal}} · Target: {{target_audience}} · Dúvidas? time de Marketing.</div>
  </div>
  <div style="text-align:right">
    <div class="footer-sub">by Ruds · 🐘 ERP.ngo</div>
  </div>
</div>
```

### Script obrigatório:

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
    try { localStorage.setItem('kit-v2-checklist', JSON.stringify(state)); } catch(_) {}
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem('kit-v2-checklist') || '[]');
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

---

## 🏢 CONTEXTO EPI-USE BRASIL (use em TODAS as recomendações)

- EPI-USE Brasil — maior consultoria SAP HCM/Payroll do Brasil; evoluindo para EPI-USE 5.0
- Grupo EPI-USE / **groupelephant.com** — 42+ anos · 4.500+ profissionais · 40+ países · 2.000+ clientes · SAP Gold Partner · ISG Leader
- LOBs: SAP HCM/SuccessFactors · S/4HANA (Clean Core + Reforma Tributária) · BTP · Signavio · ServiceNow
- IPs: TalenTools · PRISM
- **ERP.ngo:** 1% receita global → conservação elefantes + África. **Todo Voice é embaixador ERP.ngo.**
- **EPI-USE Voices:** programa de influência executiva
- ⚠️ SEMPRE "EPI-USE Brasil" por extenso

---

## 🔢 DADOS COMPLEMENTARES

- LinkedIn: {{linkedin_url}}
- SSI Score: {{ssi_score}}
- Seguidores: {{seguidores}}
- Lado humano: {{lado_humano}}
- Resultados reais (com números): {{resultados}}

## 📋 TRANSCRIÇÃO OPCIONAL

```
{{transcricao_opcional}}
```

Se transcrição vazia: gerar TODOS os campos usando APENAS as variáveis acima + `<span class="highlight-warning">⚠ a definir: ...</span>` onde faltar.

---

## ✅ ENTREGA

**APENAS** o HTML do artifact (começa em `<!doctype html>` e termina em `</html>`). Inclui `<head>` com fonts + CSS completo + `<body>` com `.print-bar` · `.doc` (cover + goal-banner + progress + 12 cards de passo + checklist) · footer · script. **Nada antes, nada depois.**
