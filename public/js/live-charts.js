// live-charts.js · v0.23.0
// Real-time sparkline previews · Data-Dense Dashboard pattern
// Renderiza sparkline SVG dentro de qualquer .dk-chart-preview com data-points

(function() {
  'use strict';

  function renderSparkline(el) {
    let pts;
    try {
      pts = JSON.parse(el.dataset.points || '[]');
    } catch { pts = []; }
    if (!Array.isArray(pts) || pts.length < 2) {
      // gera fake plausivel se nao tem data (apenas pra preview visual)
      pts = Array.from({length: 12}, (_, i) => Math.sin(i * .6) * 20 + 50 + Math.random() * 10);
    }
    const w = el.clientWidth || 300;
    const h = el.clientHeight || 80;
    const pad = 4;
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const rng = (max - min) || 1;
    const stepX = (w - 2*pad) / (pts.length - 1);
    const xs = pts.map((_, i) => pad + i * stepX);
    const ys = pts.map(v => h - pad - ((v - min) / rng) * (h - 2*pad));
    const line = pts.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    const area = `${line} L ${xs[xs.length-1].toFixed(1)} ${h} L ${xs[0].toFixed(1)} ${h} Z`;
    const lastX = xs[xs.length-1];
    const lastY = ys[ys.length-1];

    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="dk-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#cd1543" stop-opacity=".5"/>
          <stop offset="100%" stop-color="#cd1543" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="area" d="${area}"/>
      <path class="line" d="${line}"/>
      <circle class="pulse-dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5">
        <animate attributeName="r" values="3.5;6;3.5" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;.4;1" dur="1.6s" repeatCount="indefinite"/>
      </circle>
    </svg>`;
  }

  function initCharts() {
    document.querySelectorAll('.dk-chart-preview').forEach(renderSparkline);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCharts);
  } else {
    initCharts();
  }
  // re-render on resize (debounced)
  let resizeT;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(initCharts, 200); });
})();
