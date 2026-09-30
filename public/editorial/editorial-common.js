/* Módulo 25 — helpers compartilhados das telas do Calendário Editorial */
(function () {
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';

  window.edtToast = function (msg, isErr) {
    let t = document.querySelector('.edt-toast');
    if (!t) { t = document.createElement('div'); t.className = 'edt-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), isErr ? 6000 : 3500);
  };

  window.edtFmtSync = function (iso) {
    if (!iso) return 'nunca sincronizado';
    // SQLite datetime('now') é UTC → mostra em horário local
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return iso;
    return 'sincronizado ' + d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Cria o botão de resync e liga no endpoint. onDone(recarrega) após sucesso.
  window.edtWireResync = function (btn, onDone) {
    if (!btn) return;
    btn.innerHTML = ICON + '<span>Resync</span>';
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.classList.add('spinning');
      try {
        const r = await fetch('/api/editorial/resync', { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.success) {
          const c = j.counts || {};
          window.edtToast('Sincronizado ✓' + (c ? '' : ''));
          if (typeof onDone === 'function') await onDone();
        } else {
          window.edtToast(j.error || 'Falha no resync.', true);
        }
      } catch (e) {
        window.edtToast('Erro de rede no resync.', true);
      } finally {
        btn.disabled = false; btn.classList.remove('spinning');
      }
    });
  };

  window.edtEsc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  };
})();
