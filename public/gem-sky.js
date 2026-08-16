// The GEM night sky — the same fixed field the landing page draws:
// seeded cream dust at density-per-area, plus small violet gem diamonds.
// Mount: <canvas id="page-field" aria-hidden="true"></canvas> with the
// #page-field CSS (fixed, inset 0, z-index -1), then <script src="/gem-sky.js">.
(function () {
  const canvas = document.getElementById('page-field');
  if (!canvas) return;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function draw() {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const area = (w * h) / (1440 * 900) * (w < 900 ? 0.55 : 1);
    const minR = 1 / dpr;
    const rand = mulberry32(7);
    const count = Math.round(11000 * area);
    for (let i = 0; i < count; i++) {
      const x = rand() * w, y = rand() * h;
      const a = 0.03 + rand() * 0.11;
      const r = Math.max(minR, 0.55 + rand() * 0.5);
      ctx.fillStyle = 'rgba(240,235,225,' + a.toFixed(3) + ')';
      ctx.fillRect(x, y, r, r);
    }
    const litRand = mulberry32(5);
    const gemCount = Math.max(10, Math.round(44 * Math.min(1.15, Math.max(0.4, area))));
    for (let i = 0; i < gemCount; i++) {
      const x = litRand() * w, y = litRand() * h;
      const s = (2.8 + litRand() * 3.2) * (w < 700 ? 0.85 : 1);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = 'rgba(167,139,250,0.9)';
      ctx.shadowBlur = 10;
      const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
      g.addColorStop(0, '#A78BFA');
      g.addColorStop(1, '#7C3AED');
      ctx.fillStyle = g;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
  let t, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    t = setTimeout(draw, 150);
  });
  draw();
})();
