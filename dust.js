// Dust motes drifting through the hero's light shafts, disturbed by the cursor like a hand moving through dust.
(function () {
  const hero = document.getElementById("top");
  const canvas = document.getElementById("dust");
  if (!hero || !canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1, motes = [];

  // pre-rendered glow sprites (one white, one dark) so hundreds of motes cost one drawImage each
  function sprite(rgb) {
    const S = 64, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d"), r = S / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, `rgba(${rgb},1)`); grad.addColorStop(0.45, `rgba(${rgb},.35)`); grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
    return c;
  }
  const LIGHT = sprite("255,255,255"), DARK = sprite("28,38,52");

  function make() {
    const depth = Math.random();                       // 0 = far (small, faint), 1 = near (bigger, softer)
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: 0.5 + depth * 2.4,
      depth,
      wx: 0, wy: 0,                                       // own wandering velocity (random walk)
      buoy: (Math.random() - 0.42) * 0.09,                // most hover; some slowly sink, some lift
      px: 0, py: 0,                                       // push from the cursor, decays back to the drift
      a: 0.10 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      wobble: 0.3 + Math.random() * 0.6,
      dark: Math.random() < 0.22,
    };
  }

  function resize() {
    const r = hero.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w === W && h === H && d === dpr) return;
    W = w; H = h; dpr = d;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(900, Math.round((W * H) / 2200));
    motes = Array.from({ length: n }, make);
  }

  // cursor: position in hero space plus a smoothed velocity, so the wake follows the hand's direction
  const cur = { x: -1e4, y: -1e4, vx: 0, vy: 0, active: false };
  let lastMove = 0;
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    if (cur.active) {
      const dt = Math.max(8, now - lastMove);
      cur.vx = cur.vx * 0.6 + ((x - cur.x) / dt) * 16 * 0.4;
      cur.vy = cur.vy * 0.6 + ((y - cur.y) / dt) * 16 * 0.4;
    }
    cur.x = x; cur.y = y; cur.active = true; lastMove = now;
  });
  hero.addEventListener("pointerleave", () => { cur.active = false; cur.x = cur.y = -1e4; });

  // slow, shifting air currents: nearby motes share a direction, the field drifts over tens of seconds
  function flow(x, y, t, out) {
    const s = 0.0022;
    out[0] = (Math.sin(x * s * 1.3 + t * 0.00034) + Math.cos(y * s * 0.9 - t * 0.00028)) * 0.16;
    out[1] = (Math.cos(x * s * 0.7 - t * 0.00022) + Math.sin(y * s * 1.1 + t * 0.00040)) * 0.12;
  }
  const f = [0, 0];

  const R = 150, R2 = R * R;
  let last = 0;
  function frame(t) {
    resize();
    const dt = Math.min(32, t - last) / 16.67; last = t;
    if (t - lastMove > 90) { cur.vx *= 0.8; cur.vy *= 0.8; }  // hand stopped: wake dies down
    const speed = Math.hypot(cur.vx, cur.vy);
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      if (!reduceMotion) {
        if (cur.active) {
          const dx = m.x - cur.x, dy = m.y - cur.y, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1, k = (1 - d / R) ** 2;
            const nx = dx / d, ny = dy / d;
            // carried along with the hand, pushed outward from it, and curled a little around it
            m.px += (cur.vx * 0.45 + nx * (0.9 + speed * 0.25) - ny * speed * 0.12) * k * dt;
            m.py += (cur.vy * 0.45 + ny * (0.9 + speed * 0.25) + nx * speed * 0.12) * k * dt;
          }
        }
        m.px *= 0.93 ** dt; m.py *= 0.93 ** dt;           // cursor push settles out
        // wander: a random nudge each frame, damped, so paths meander and change their minds
        m.wx = (m.wx + (Math.random() - 0.5) * 0.08) * 0.965;
        m.wy = (m.wy + (Math.random() - 0.5) * 0.08) * 0.965;
        flow(m.x, m.y, t, f);
        const near = 0.55 + m.depth * 0.75;                 // nearer motes move more on screen
        m.x += (f[0] * near + m.wx + m.px) * dt;
        m.y += (f[1] * near + m.wy + m.buoy + m.py) * dt;
        if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; } else if (m.y > H + 6) m.y = -6;
        if (m.x < -6) m.x = W + 6; else if (m.x > W + 6) m.x = -6;
      }
      const stir = Math.min(1, Math.hypot(m.px, m.py) * 0.6);                    // disturbed motes catch more light
      const tw = 0.75 + 0.25 * Math.sin(t * 0.0012 * m.wobble + m.phase);
      ctx.globalAlpha = Math.min(1, m.a * tw * (m.dark ? 0.55 : 1) * (1 + stir));
      const s = m.r * 4.4;
      ctx.drawImage(m.dark ? DARK : LIGHT, m.x - s / 2, m.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  let raf = 0, running = false;
  const loop = (t) => { frame(t); if (running) raf = requestAnimationFrame(loop); };
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  new ResizeObserver(resize).observe(hero);
  window.addEventListener("resize", resize);
  resize();
  if (reduceMotion) { frame(0); return; }
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
})();
