// live-charts.js · v0.24.0
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

    const randId = Math.random().toString(36).substring(2, 9);
    const gradAreaId = `dk-area-grad-${randId}`;
    const gradLineId = `dk-line-grad-${randId}`;
    const glowId = `dk-glow-${randId}`;

    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="overflow:visible;">
      <defs>
        <linearGradient id="${gradAreaId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="${gradLineId}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#00f2fe"/>
          <stop offset="50%" stop-color="#ec4899"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
        <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComponentTransfer in="blur" result="boost">
            <feFuncA type="linear" slope="0.8"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="boost" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path class="area" d="${area}" fill="url(#${gradAreaId})" opacity="0.75" />
      <path class="line" d="${line}" fill="none" stroke="url(#${gradLineId})" stroke-width="2.5" filter="url(#${glowId})" />
      <circle class="pulse-dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4" fill="#ffffff" stroke="#00f2fe" stroke-width="2" style="filter: drop-shadow(0 0 6px #00f2fe)">
        <animate attributeName="r" values="4;6.5;4" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;.5;1" dur="2s" repeatCount="indefinite"/>
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
