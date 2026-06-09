/* ════════════════════════════════════════════════════════════════════════
   office-utils.js — utilitários compartilhados do EPI-USE Office (v0.34.0)
   Fonte ÚNICA de esc/brl/fmt/fmtDate/scoreCls (antes copiados em 12+ telas).
   Carregar via <script src="/js/office-utils.js"></script> antes do script
   inline da tela. Exposto em window (vanilla, sem módulos).
   ════════════════════════════════════════════════════════════════════════ */
(function (w) {
  // Escapa HTML (defensivo contra injeção em innerHTML)
  w.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // Formata número pt-BR (ou — se null)
  w.fmt = function (n) {
    return n == null ? '—' : Number(n).toLocaleString('pt-BR');
  };

  // Formata moeda compacta: R$ 1.2M / R$ 50k / R$ 320 (símbolo configurável)
  w.brl = function (v, simbolo) {
    var c = simbolo || 'R$';
    if (v == null || v === 0) return c + ' 0';
    if (Math.abs(v) >= 1e6) return c + ' ' + (v / 1e6).toFixed(1) + 'M';
    if (Math.abs(v) >= 1e3) return c + ' ' + (v / 1e3).toFixed(0) + 'k';
    return c + ' ' + Number(v).toLocaleString('pt-BR');
  };

  // Moeda completa: R$ 1.234,56
  w.brlFull = function (v, simbolo) {
    var c = simbolo || 'R$';
    if (v == null) return c + ' 0,00';
    return c + ' ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Data ISO → "Ter 9/6" (dia da semana + dia/mês)
  w.fmtDate = function (iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    var DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    var dow = new Date(iso + 'T12:00:00').getDay();
    return DOW[dow] + ' ' + parseInt(p[2]) + '/' + parseInt(p[1]);
  };

  // Classe de cor por score 0-100 (verde/amarelo/vermelho)
  w.scoreCls = function (s) {
    return s >= 70 ? 's-hi' : s >= 45 ? 's-mid' : 's-lo';
  };

  // Helper de expiração: classe de urgência por data ISO
  w.expCls = function (iso, hojeISO) {
    var hoje = hojeISO || new Date().toISOString().slice(0, 10);
    var em45 = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
    return iso < hoje ? 'd-urgent' : (iso <= em45 ? 'd-soon' : 'd-ok');
  };
})(window);
