// ===== NAVIGATION =====
const loadedChapters = {};

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initDerivations();
  initVisualizations();
  renderMath();
  initProgressBar();
  initMobileMenu();

  // Load chapter from hash or show landing
  const hash = location.hash.replace('#', '');
  if (hash && hash !== 'home') navigateTo(hash);
  else navigateTo('home');
});

function initNavigation() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(el.dataset.nav);
      closeMobileMenu();
    });
  });
}

async function navigateTo(id) {
  document.querySelectorAll('.chapter, .landing').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.chapter-link').forEach(el => el.classList.remove('active'));

  // Try to load chapter from external file if not yet loaded
  const target = document.getElementById(id);
  if (target && id.startsWith('ch') && !loadedChapters[id]) {
    // Check if chapter file exists
    try {
      const resp = await fetch(`chapters/${id}.html`);
      if (resp.ok) {
        const html = await resp.text();
        target.innerHTML = html;
        loadedChapters[id] = true;
        // Re-init derivation toggles for new content
        target.querySelectorAll('.derivation-header').forEach(header => {
          header.addEventListener('click', () => {
            const d = header.parentElement;
            d.classList.toggle('open');
            if (d.classList.contains('open') && window.renderMathInElement) {
              renderMathInElement(d, katexOptions);
            }
          });
        });
      }
    } catch(e) {
      // File not found, use inline content
    }
  }

  if (target) {
    target.classList.add('active');
    const navLink = document.querySelector(`[data-nav="${id}"]`);
    if (navLink) navLink.classList.add('active');
  }

  location.hash = id;
  window.scrollTo(0, 0);

  // Re-render math for newly visible content
  if (window.renderMathInElement && target) {
    renderMathInElement(target, katexOptions);
  }

  // Init any visualizations in this chapter
  initChapterVisualizations(id);
}

// ===== DERIVATIONS =====
function initDerivations() {
  document.querySelectorAll('.derivation-header').forEach(header => {
    header.addEventListener('click', () => {
      const d = header.parentElement;
      d.classList.toggle('open');
      // Render math inside derivation on first open
      if (d.classList.contains('open') && window.renderMathInElement) {
        renderMathInElement(d, katexOptions);
      }
    });
  });
}

// ===== MATH RENDERING =====
const katexOptions = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false }
  ],
  throwOnError: false,
  trust: true,
  macros: {
    '\\avg': '\\langle #1 \\rangle',
    '\\vect': '\\vec{#1}',
    '\\pd': '\\frac{\\partial #1}{\\partial #2}',
    '\\dd': '\\mathrm{d}'
  }
};

function renderMath() {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, katexOptions);
  }
}

// ===== PROGRESS BAR =====
function initProgressBar() {
  window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const pct = docHeight > 0 ? (scrolled / docHeight) * 100 : 0;
    const fill = document.querySelector('.progress-bar .fill');
    if (fill) fill.style.width = pct + '%';
  });
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.overlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }
}

function closeMobileMenu() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.overlay')?.classList.remove('show');
}

// ===== VISUALIZATIONS =====
const activeAnimations = {};

function initVisualizations() {
  // Will be initialized per-chapter
}

function initChapterVisualizations(chapterId) {
  // Stop all running animations
  Object.keys(activeAnimations).forEach(key => {
    cancelAnimationFrame(activeAnimations[key]);
    delete activeAnimations[key];
  });

  switch (chapterId) {
    case 'ch1': initCh1Vis(); break;
    case 'ch2': initCh2Vis(); break;
    case 'ch3': initCh3Vis(); break;
    case 'ch4': initCh4Vis(); break;
    case 'ch5': initCh5Vis(); break;
    case 'ch6': initCh6Vis(); break;
    case 'ch7': initCh7Vis(); break;
    case 'ch8': initCh8Vis(); break;
    case 'ch9': initCh9Vis(); break;
    case 'ch10': initCh10Vis(); break;
    case 'ch11': initCh11Vis(); break;
    case 'ch12': initCh12Vis(); break;
    case 'ch13': initCh13Vis(); break;
    case 'ch14': initCh14Vis(); break;
    case 'ch15': initCh15Vis(); break;
  }
}

// ===== CH1: Probability Distributions =====
function initCh1Vis() {
  // Gaussian explorer
  const c = document.getElementById('vis-gaussian');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 300;

  const sigmaSlider = document.getElementById('gauss-sigma');
  const meanSlider = document.getElementById('gauss-mean');

  function draw() {
    const sigma = parseFloat(sigmaSlider?.value || 1);
    const mean = parseFloat(meanSlider?.value || 0);
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    const xAxis = H - 40;
    ctx.beginPath(); ctx.moveTo(30, xAxis); ctx.lineTo(W - 10, xAxis); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2, xAxis); ctx.stroke();

    // Gaussian
    const xScale = (W - 60) / 8; // -4 to 4
    const maxY = 1 / (sigma * Math.sqrt(2 * Math.PI));
    const yScale = (xAxis - 30) / Math.max(maxY, 0.5);

    // Fill 1-sigma region
    ctx.fillStyle = 'rgba(41, 128, 185, 0.2)';
    ctx.beginPath();
    for (let px = 0; px < W - 40; px++) {
      const x = (px - (W - 60) / 2) / xScale;
      if (Math.abs(x - mean) <= sigma) {
        const y = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
        const py = xAxis - y * yScale;
        if (px === 0 || Math.abs(x - mean - sigma) < 0.05) ctx.moveTo(px + 30, xAxis);
        ctx.lineTo(px + 30, py);
      }
    }
    ctx.lineTo(W / 2 + (mean + sigma) * xScale + 30, xAxis);
    ctx.closePath();
    ctx.fill();

    // Curve
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px < W - 40; px++) {
      const x = (px - (W - 60) / 2) / xScale;
      const y = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
      const py = xAxis - y * yScale;
      px === 0 ? ctx.moveTo(px + 30, py) : ctx.lineTo(px + 30, py);
    }
    ctx.stroke();

    // Mean line
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    const meanPx = W / 2 + mean * xScale;
    ctx.beginPath(); ctx.moveTo(meanPx, 10); ctx.lineTo(meanPx, xAxis); ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`μ = ${mean.toFixed(1)}`, meanPx, xAxis + 18);
    ctx.fillText(`σ = ${sigma.toFixed(2)}`, meanPx + sigma * xScale / 2, xAxis - maxY * yScale / 2);
    ctx.fillStyle = 'rgba(41,128,185,0.7)';
    ctx.fillText('68%', meanPx, xAxis - maxY * yScale * 0.3);

    // Update display
    const sigmaDisp = document.getElementById('gauss-sigma-val');
    const meanDisp = document.getElementById('gauss-mean-val');
    if (sigmaDisp) sigmaDisp.textContent = sigma.toFixed(2);
    if (meanDisp) meanDisp.textContent = mean.toFixed(1);
  }

  sigmaSlider?.addEventListener('input', draw);
  meanSlider?.addEventListener('input', draw);
  draw();

  // CLT visualization
  const c2 = document.getElementById('vis-clt');
  if (!c2) return;
  const ctx2 = c2.getContext('2d');
  c2.width = 600; c2.height = 300;

  const nSlider = document.getElementById('clt-n');

  function drawCLT() {
    const N = parseInt(nSlider?.value || 1);
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    ctx2.fillStyle = '#1b2631';
    ctx2.fillRect(0, 0, W, H);

    // Simulate CLT: convolve uniform distribution N times
    const bins = 200;
    let dist = new Float64Array(bins).fill(1 / bins);

    for (let i = 1; i < N; i++) {
      const newDist = new Float64Array(bins).fill(0);
      for (let j = 0; j < bins; j++) {
        for (let k = 0; k < bins; k++) {
          const target = Math.round((j + k) / 2);
          if (target < bins) newDist[target] += dist[j] * dist[k];
        }
      }
      // Normalize
      let sum = 0;
      for (let j = 0; j < bins; j++) sum += newDist[j];
      for (let j = 0; j < bins; j++) newDist[j] /= sum;
      dist = newDist;
    }

    const maxVal = Math.max(...dist);
    const xAxis = H - 40;
    const barW = (W - 60) / bins;

    // Draw distribution
    ctx2.fillStyle = 'rgba(46, 204, 113, 0.6)';
    ctx2.strokeStyle = '#2ecc71';
    ctx2.lineWidth = 1;
    for (let i = 0; i < bins; i++) {
      const barH = (dist[i] / maxVal) * (xAxis - 20);
      const x = 30 + i * barW;
      ctx2.fillRect(x, xAxis - barH, barW, barH);
    }

    // Overlay Gaussian
    const mean = bins / 2;
    const sigma = (bins / (2 * Math.sqrt(3))) / Math.sqrt(N);
    ctx2.strokeStyle = '#e74c3c';
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    for (let i = 0; i < bins; i++) {
      const gaussVal = Math.exp(-0.5 * ((i - mean) / sigma) ** 2);
      const x = 30 + i * barW + barW / 2;
      const y = xAxis - gaussVal * (xAxis - 20);
      i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
    }
    ctx2.stroke();

    // Labels
    ctx2.fillStyle = '#ecf0f1';
    ctx2.font = '14px Inter, sans-serif';
    ctx2.textAlign = 'center';
    ctx2.fillText(`N = ${N} (average of ${N} uniform draws)`, W / 2, 20);
    ctx2.font = '11px Inter, sans-serif';
    ctx2.fillStyle = '#2ecc71';
    ctx2.fillText('Simulation', W / 2 - 80, 38);
    ctx2.fillStyle = '#e74c3c';
    ctx2.fillText('Gaussian fit', W / 2 + 80, 38);

    const nDisp = document.getElementById('clt-n-val');
    if (nDisp) nDisp.textContent = N;
  }

  nSlider?.addEventListener('input', drawCLT);
  drawCLT();
}

// ===== CH2: Random Walk & Diffusion =====
function initCh2Vis() {
  const c = document.getElementById('vis-randomwalk');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 400;

  let walkers = [];
  let running = false;
  let steps = 0;

  const nWalkers = 50;
  const stepSize = 4;

  function reset() {
    walkers = [];
    for (let i = 0; i < nWalkers; i++) {
      walkers.push({ x: c.width / 2, y: c.height / 2, trail: [] });
    }
    steps = 0;
  }

  function step() {
    walkers.forEach(w => {
      const angle = Math.random() * 2 * Math.PI;
      w.x += stepSize * Math.cos(angle);
      w.y += stepSize * Math.sin(angle);
      w.trail.push({ x: w.x, y: w.y });
      if (w.trail.length > 200) w.trail.shift();
    });
    steps++;
  }

  function draw() {
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, c.width, c.height);

    // Draw trails
    walkers.forEach((w, i) => {
      const hue = (i * 360 / nWalkers) % 360;
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      w.trail.forEach((p, j) => {
        j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Current position
      ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Origin
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c.width / 2, c.height / 2, 3, 0, 2 * Math.PI);
    ctx.stroke();

    // RMS distance
    let sumR2 = 0;
    walkers.forEach(w => {
      sumR2 += (w.x - c.width / 2) ** 2 + (w.y - c.height / 2) ** 2;
    });
    const rms = Math.sqrt(sumR2 / nWalkers);
    const expected = stepSize * Math.sqrt(steps);

    // RMS circle
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(c.width / 2, c.height / 2, rms, 0, 2 * Math.PI);
    ctx.stroke();

    // Expected circle
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
    ctx.beginPath();
    ctx.arc(c.width / 2, c.height / 2, expected, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Info
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Steps: ${steps}`, 10, 20);
    ctx.fillText(`RMS distance: ${rms.toFixed(1)}`, 10, 38);
    ctx.fillText(`Expected (ℓ√N): ${expected.toFixed(1)}`, 10, 56);
    ctx.fillStyle = '#e74c3c'; ctx.fillText('— Measured RMS', 10, 74);
    ctx.fillStyle = '#2ecc71'; ctx.fillText('— Expected √N', 10, 92);
  }

  function animate() {
    if (!running) return;
    for (let i = 0; i < 3; i++) step();
    draw();
    activeAnimations['randomwalk'] = requestAnimationFrame(animate);
  }

  const startBtn = document.getElementById('rw-start');
  const resetBtn = document.getElementById('rw-reset');

  startBtn?.addEventListener('click', () => {
    running = !running;
    startBtn.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  resetBtn?.addEventListener('click', () => {
    running = false;
    startBtn.textContent = 'Start';
    reset();
    draw();
  });

  reset();
  draw();

  // Diffusion equation visualization
  const c2 = document.getElementById('vis-diffusion');
  if (!c2) return;
  const ctx2 = c2.getContext('2d');
  c2.width = 600; c2.height = 300;

  const diffSlider = document.getElementById('diff-D');
  let diffTime = 0;
  let diffRunning = false;

  function drawDiffusion() {
    const D = parseFloat(diffSlider?.value || 1);
    const W = c2.width, H = c2.height;
    ctx2.fillStyle = '#1b2631';
    ctx2.fillRect(0, 0, W, H);

    const xAxis = H - 40;

    // Draw concentration at different times
    const times = [0.1, 0.5, 1, 2, 5];
    const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'];

    times.forEach((t, idx) => {
      const sigma = Math.sqrt(2 * D * t);
      ctx2.strokeStyle = colors[idx];
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      for (let px = 0; px < W - 40; px++) {
        const x = (px - (W - 60) / 2) / 50;
        const n = (1 / (Math.sqrt(4 * Math.PI * D * t))) * Math.exp(-x * x / (4 * D * t));
        const py = xAxis - n * (xAxis - 20) * 1.5;
        px === 0 ? ctx2.moveTo(px + 30, py) : ctx2.lineTo(px + 30, py);
      }
      ctx2.stroke();

      ctx2.fillStyle = colors[idx];
      ctx2.font = '11px Inter, sans-serif';
      ctx2.fillText(`t=${t}`, W - 60, 20 + idx * 16);
    });

    ctx2.fillStyle = '#ecf0f1';
    ctx2.font = '13px Inter, sans-serif';
    ctx2.textAlign = 'center';
    ctx2.fillText(`Diffusion: n(x,t) = (1/√4πDt) exp(-x²/4Dt), D = ${D.toFixed(1)}`, W / 2, 20);

    const dDisp = document.getElementById('diff-D-val');
    if (dDisp) dDisp.textContent = D.toFixed(1);
  }

  diffSlider?.addEventListener('input', drawDiffusion);
  drawDiffusion();
}

// ===== CH3: Equilibrium - Chaos / Double pendulum =====
function initCh3Vis() {
  const c = document.getElementById('vis-chaos');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 400;

  // Two double pendulums with slightly different initial conditions
  const L1 = 80, L2 = 80, m1 = 1, m2 = 1, g = 9.81;
  let pends = [];

  function initPendulums() {
    const offset = parseFloat(document.getElementById('chaos-offset')?.value || 0.01);
    pends = [
      { th1: Math.PI / 2, th2: Math.PI / 2, w1: 0, w2: 0, trail: [], color: '#3498db' },
      { th1: Math.PI / 2 + offset, th2: Math.PI / 2, w1: 0, w2: 0, trail: [], color: '#e74c3c' }
    ];
  }

  function step(p, dt) {
    const { th1, th2, w1, w2 } = p;
    const dth = th1 - th2;

    const den = 2 * m1 + m2 - m2 * Math.cos(2 * dth);
    const a1 = (-g * (2 * m1 + m2) * Math.sin(th1) - m2 * g * Math.sin(th1 - 2 * th2)
      - 2 * Math.sin(dth) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(dth))) / (L1 * den);
    const a2 = (2 * Math.sin(dth) * (w1 * w1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(th1)
      + w2 * w2 * L2 * m2 * Math.cos(dth))) / (L2 * den);

    p.w1 += a1 * dt;
    p.w2 += a2 * dt;
    p.th1 += p.w1 * dt;
    p.th2 += p.w2 * dt;
  }

  let running = false;

  function draw() {
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, c.width, c.height);

    const ox = c.width / 2, oy = 120;

    pends.forEach(p => {
      const x1 = ox + L1 * Math.sin(p.th1);
      const y1 = oy + L1 * Math.cos(p.th1);
      const x2 = x1 + L2 * Math.sin(p.th2);
      const y2 = y1 + L2 * Math.cos(p.th2);

      p.trail.push({ x: x2, y: y2 });
      if (p.trail.length > 500) p.trail.shift();

      // Trail
      ctx.strokeStyle = p.color + '40';
      ctx.lineWidth = 1;
      ctx.beginPath();
      p.trail.forEach((pt, i) => {
        i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Rods
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

      // Masses
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x1, y1, 6, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, 6, 0, 2 * Math.PI); ctx.fill();
    });

    // Pivot
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Two double pendulums with tiny initial difference', 10, 20);
    ctx.fillStyle = '#3498db'; ctx.fillText('Pendulum 1', 10, 38);
    ctx.fillStyle = '#e74c3c'; ctx.fillText('Pendulum 2', 10, 54);
  }

  function animate() {
    if (!running) return;
    for (let i = 0; i < 5; i++) {
      pends.forEach(p => step(p, 0.01));
    }
    draw();
    activeAnimations['chaos'] = requestAnimationFrame(animate);
  }

  document.getElementById('chaos-start')?.addEventListener('click', function() {
    running = !running;
    this.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  document.getElementById('chaos-reset')?.addEventListener('click', () => {
    running = false;
    document.getElementById('chaos-start').textContent = 'Start';
    initPendulums();
    draw();
  });

  document.getElementById('chaos-offset')?.addEventListener('input', function() {
    const d = document.getElementById('chaos-offset-val');
    if (d) d.textContent = parseFloat(this.value).toFixed(4);
  });

  initPendulums();
  draw();
}

// ===== CH4: Temperature - Gas Particles =====
function initCh4Vis() {
  const c = document.getElementById('vis-equipartition');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 400;

  const tempSlider = document.getElementById('ep-temp');
  let particles = [];
  let running = false;

  function initParticles() {
    const T = parseFloat(tempSlider?.value || 300);
    const v0 = Math.sqrt(T / 100);
    particles = [];
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = v0 * (0.5 + Math.random());
      particles.push({
        x: 50 + Math.random() * (c.width - 100),
        y: 50 + Math.random() * (c.height - 100),
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        r: 3
      });
    }
  }

  function stepParticles() {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < p.r || p.x > c.width - p.r) { p.vx *= -1; p.x = Math.max(p.r, Math.min(c.width - p.r, p.x)); }
      if (p.y < p.r || p.y > c.height - p.r) { p.vy *= -1; p.y = Math.max(p.r, Math.min(c.height - p.r, p.y)); }
    });
  }

  function draw() {
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, c.width, c.height);

    // Box
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, c.width - 2, c.height - 2);

    // Speed histogram
    const speeds = particles.map(p => Math.sqrt(p.vx ** 2 + p.vy ** 2));
    const maxSpeed = Math.max(...speeds) * 1.2;

    particles.forEach((p, i) => {
      const speed = speeds[i];
      const frac = speed / maxSpeed;
      const r = Math.round(255 * frac);
      const b = Math.round(255 * (1 - frac));
      ctx.fillStyle = `rgb(${r}, 80, ${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fill();
    });

    // KE readout
    let totalKE = 0;
    particles.forEach(p => { totalKE += 0.5 * (p.vx ** 2 + p.vy ** 2); });
    const avgKE = totalKE / particles.length;

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'left';
    const T = parseFloat(tempSlider?.value || 300);
    ctx.fillText(`T = ${T} K`, 10, 20);
    ctx.fillText(`⟨KE⟩ = ${avgKE.toFixed(2)} (∝ kT)`, 10, 38);
    ctx.fillText('Color: blue = slow, red = fast', 10, 56);

    const tDisp = document.getElementById('ep-temp-val');
    if (tDisp) tDisp.textContent = T;
  }

  function animate() {
    if (!running) return;
    stepParticles();
    draw();
    activeAnimations['equipartition'] = requestAnimationFrame(animate);
  }

  tempSlider?.addEventListener('input', () => {
    initParticles();
    if (!running) draw();
  });

  document.getElementById('ep-start')?.addEventListener('click', function() {
    running = !running;
    this.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  initParticles();
  draw();
}

// ===== CH5: Thermodynamics - Carnot Cycle =====
function initCh5Vis() {
  const c = document.getElementById('vis-carnot');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 400;

  let phase = 0;
  let t = 0;
  let running = false;

  const TH = 600, TC = 300;

  function draw() {
    const W = c.width, H = c.height;
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    // PV diagram
    const ox = 100, oy = 50, pw = 220, ph = 280;

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    // Axes
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ph); ctx.lineTo(ox + pw, oy + ph); ctx.stroke();
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V', ox + pw / 2, oy + ph + 25);
    ctx.save(); ctx.translate(ox - 25, oy + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('P', 0, 0); ctx.restore();

    // Draw Carnot cycle in PV space
    const points = [];
    const nPts = 100;

    // State points: A(V1, P1), B(V2, P2), C(V3, P3), D(V4, P4)
    const V1 = 1, P1 = 4;
    const V2 = 2.5, P2 = P1 * Math.pow(V1 / V2, 1); // isothermal TH: PV = const
    const gamma = 5 / 3;
    const V3 = 3.5, P3 = P2 * Math.pow(V2 / V3, gamma); // adiabatic
    const V4 = V1 * Math.pow(P1 / (P3 * Math.pow(V3 / V1, 1)), 1); // fix

    function toScreen(V, P) {
      return [ox + (V - 0.5) / 4 * pw, oy + ph - (P - 0) / 5 * ph];
    }

    // Isothermal expansion (A -> B, TH)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const V = V1 + (V2 - V1) * i / nPts;
      const P = P1 * V1 / V;
      const [sx, sy] = toScreen(V, P);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Adiabatic expansion (B -> C)
    ctx.strokeStyle = '#3498db';
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const V = V2 + (V3 - V2) * i / nPts;
      const P = P2 * Math.pow(V2 / V, gamma);
      const [sx, sy] = toScreen(V, P);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Isothermal compression (C -> D, TC)
    const PD = P3 * V3 / V1;
    ctx.strokeStyle = '#2ecc71';
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const V = V3 + (V1 - V3) * i / nPts;
      const P = P3 * V3 / V;
      const [sx, sy] = toScreen(V, P);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Adiabatic compression (D -> A)
    const PD2 = P3 * V3 / V1;
    ctx.strokeStyle = '#f39c12';
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const V = V1 + (V1 - V1) * i / nPts;
      const P = PD2 * Math.pow(V1 / (V1 + 0.001), gamma);
      const [sx, sy] = toScreen(V1, PD2 + (P1 - PD2) * i / nPts);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Moving point
    const phaseT = (t % 400) / 100;
    let currentV, currentP;
    if (phaseT < 1) {
      currentV = V1 + (V2 - V1) * phaseT;
      currentP = P1 * V1 / currentV;
      phase = 0;
    } else if (phaseT < 2) {
      const f = phaseT - 1;
      currentV = V2 + (V3 - V2) * f;
      currentP = P2 * Math.pow(V2 / currentV, gamma);
      phase = 1;
    } else if (phaseT < 3) {
      const f = phaseT - 2;
      currentV = V3 + (V1 - V3) * f;
      currentP = P3 * V3 / currentV;
      phase = 2;
    } else {
      const f = phaseT - 3;
      currentP = PD + (P1 - PD) * f;
      currentV = V1;
      phase = 3;
    }

    const [cx, cy] = toScreen(currentV, currentP);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();

    // Labels for phases
    const phaseLabels = [
      { text: 'Isothermal expansion (TH)', color: '#e74c3c', x: 380, y: 60 },
      { text: 'Adiabatic expansion', color: '#3498db', x: 380, y: 85 },
      { text: 'Isothermal compression (TC)', color: '#2ecc71', x: 380, y: 110 },
      { text: 'Adiabatic compression', color: '#f39c12', x: 380, y: 135 }
    ];

    phaseLabels.forEach((l, i) => {
      ctx.fillStyle = phase === i ? '#fff' : l.color;
      ctx.font = (phase === i ? 'bold ' : '') + '12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((phase === i ? '▸ ' : '  ') + l.text, l.x, l.y);
    });

    // Efficiency
    const eff = 1 - TC / TH;
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`Carnot efficiency: η = 1 - TC/TH = ${(eff * 100).toFixed(1)}%`, 380, 180);
    ctx.fillText(`TH = ${TH} K, TC = ${TC} K`, 380, 200);

    // Engine diagram
    const ex = 460, ey = 240;
    // Hot reservoir
    ctx.fillStyle = '#e74c3c30';
    ctx.fillRect(ex - 50, ey - 40, 100, 30);
    ctx.fillStyle = '#e74c3c';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Hot (TH=${TH}K)`, ex, ey - 18);

    // Engine
    ctx.fillStyle = '#34495e';
    ctx.fillRect(ex - 30, ey + 10, 60, 40);
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Engine', ex, ey + 35);

    // Cold reservoir
    ctx.fillStyle = '#3498db30';
    ctx.fillRect(ex - 50, ey + 70, 100, 30);
    ctx.fillStyle = '#3498db';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`Cold (TC=${TC}K)`, ex, ey + 90);

    // Arrows
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    drawArrow(ctx, ex, ey - 8, ex, ey + 10);
    ctx.strokeStyle = '#3498db';
    drawArrow(ctx, ex, ey + 50, ex, ey + 70);
    ctx.strokeStyle = '#2ecc71';
    drawArrow(ctx, ex + 30, ey + 30, ex + 60, ey + 30);

    ctx.fillStyle = '#e74c3c'; ctx.fillText('QH', ex + 15, ey + 2);
    ctx.fillStyle = '#3498db'; ctx.fillText('QC', ex + 15, ey + 62);
    ctx.fillStyle = '#2ecc71'; ctx.fillText('W', ex + 55, ey + 25);

    t++;
  }

  function animate() {
    if (!running) return;
    draw();
    activeAnimations['carnot'] = requestAnimationFrame(animate);
  }

  document.getElementById('carnot-start')?.addEventListener('click', function() {
    running = !running;
    this.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  draw();
}

function drawArrow(ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - 8 * Math.cos(angle - 0.4), y2 - 8 * Math.sin(angle - 0.4));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 8 * Math.cos(angle + 0.4), y2 - 8 * Math.sin(angle + 0.4));
  ctx.stroke();
}

// ===== CH6: Entropy - Maxwell's Demon =====
function initCh6Vis() {
  const c = document.getElementById('vis-demon');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 350;

  let particles = [];
  let doorOpen = false;
  let demonActive = false;
  let running = false;
  const wallX = c.width / 2;

  function initParticles() {
    particles = [];
    for (let i = 0; i < 60; i++) {
      const speed = 1 + Math.random() * 3;
      const angle = Math.random() * 2 * Math.PI;
      particles.push({
        x: Math.random() * c.width,
        y: 30 + Math.random() * (c.height - 60),
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        fast: speed > 2, // fast = "hot"
        r: 4
      });
    }
  }

  function stepDemon() {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Walls
      if (p.x < p.r) { p.vx = Math.abs(p.vx); p.x = p.r; }
      if (p.x > c.width - p.r) { p.vx = -Math.abs(p.vx); p.x = c.width - p.r; }
      if (p.y < p.r) { p.vy = Math.abs(p.vy); p.y = p.r; }
      if (p.y > c.height - p.r) { p.vy = -Math.abs(p.vy); p.y = c.height - p.r; }

      // Middle wall with door
      const doorY1 = c.height / 2 - 30;
      const doorY2 = c.height / 2 + 30;
      const nearDoor = p.y > doorY1 && p.y < doorY2;

      if (demonActive) {
        // Demon only lets fast particles go right and slow go left
        if (Math.abs(p.x - wallX) < p.r + 2) {
          if (nearDoor) {
            if (p.fast && p.vx > 0) { /* let through */ }
            else if (!p.fast && p.vx < 0) { /* let through */ }
            else {
              // bounce
              if (p.x < wallX) { p.vx = -Math.abs(p.vx); p.x = wallX - p.r - 2; }
              else { p.vx = Math.abs(p.vx); p.x = wallX + p.r + 2; }
            }
          } else {
            if (p.x < wallX) { p.vx = -Math.abs(p.vx); p.x = wallX - p.r - 2; }
            else { p.vx = Math.abs(p.vx); p.x = wallX + p.r + 2; }
          }
        }
      } else {
        // Wall blocks everything except door
        if (Math.abs(p.x - wallX) < p.r + 2 && !nearDoor) {
          if (p.x < wallX) { p.vx = -Math.abs(p.vx); p.x = wallX - p.r - 2; }
          else { p.vx = Math.abs(p.vx); p.x = wallX + p.r + 2; }
        }
      }
    });
  }

  function drawDemon() {
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, c.width, c.height);

    // Box
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, c.width - 2, c.height - 2);

    // Middle wall
    const doorY1 = c.height / 2 - 30;
    const doorY2 = c.height / 2 + 30;
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(wallX, 0); ctx.lineTo(wallX, doorY1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wallX, doorY2); ctx.lineTo(wallX, c.height); ctx.stroke();

    // Door
    ctx.strokeStyle = demonActive ? '#2ecc71' : '#95a5a6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(wallX, doorY1); ctx.lineTo(wallX, doorY2); ctx.stroke();
    ctx.setLineDash([]);

    // Demon icon
    if (demonActive) {
      ctx.fillStyle = '#9b59b6';
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.fillText('👿', wallX, doorY1 - 10);
    }

    // Particles
    particles.forEach(p => {
      ctx.fillStyle = p.fast ? '#e74c3c' : '#3498db';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Temperature readout
    let leftKE = 0, rightKE = 0, leftN = 0, rightN = 0;
    particles.forEach(p => {
      const ke = 0.5 * (p.vx ** 2 + p.vy ** 2);
      if (p.x < wallX) { leftKE += ke; leftN++; }
      else { rightKE += ke; rightN++; }
    });
    const TL = leftN > 0 ? (leftKE / leftN).toFixed(2) : '0';
    const TR = rightN > 0 ? (rightKE / rightN).toFixed(2) : '0';

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Left: ⟨KE⟩ = ${TL}`, wallX / 2, 20);
    ctx.fillText(`Right: ⟨KE⟩ = ${TR}`, wallX + (c.width - wallX) / 2, 20);

    ctx.fillStyle = '#3498db'; ctx.fillText('● slow', 60, c.height - 15);
    ctx.fillStyle = '#e74c3c'; ctx.fillText('● fast', 160, c.height - 15);
  }

  function animate() {
    if (!running) return;
    stepDemon();
    drawDemon();
    activeAnimations['demon'] = requestAnimationFrame(animate);
  }

  document.getElementById('demon-start')?.addEventListener('click', function() {
    running = !running;
    this.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  document.getElementById('demon-toggle')?.addEventListener('click', function() {
    demonActive = !demonActive;
    this.textContent = demonActive ? 'Disable Demon' : 'Enable Demon';
  });

  document.getElementById('demon-reset')?.addEventListener('click', () => {
    running = false;
    demonActive = false;
    document.getElementById('demon-start').textContent = 'Start';
    document.getElementById('demon-toggle').textContent = 'Enable Demon';
    initParticles();
    drawDemon();
  });

  initParticles();
  drawDemon();
}

// ===== CH7: Ensembles =====
function initCh7Vis() {
  const c = document.getElementById('vis-boltzmann');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 350;

  const betaSlider = document.getElementById('boltz-beta');

  function draw() {
    const beta = parseFloat(betaSlider?.value || 1);
    const W = c.width, H = c.height;
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    const xAxis = H - 50;
    const ox = 60;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, 20); ctx.lineTo(ox, xAxis); ctx.lineTo(W - 20, xAxis); ctx.stroke();

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Energy E', W / 2, xAxis + 30);
    ctx.save(); ctx.translate(20, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('P(E) = e^{-βE} / Z', 0, 0); ctx.restore();

    // Boltzmann distribution
    const maxE = 5;
    const eScale = (W - ox - 40) / maxE;
    const Z = 1 / beta; // for continuous case

    // Fill area
    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.beginPath();
    ctx.moveTo(ox, xAxis);
    for (let px = 0; px < W - ox - 40; px++) {
      const E = px / eScale;
      const P = beta * Math.exp(-beta * E);
      const py = xAxis - P * (xAxis - 30) / (beta);
      ctx.lineTo(ox + px, py);
    }
    ctx.lineTo(W - 40, xAxis);
    ctx.closePath();
    ctx.fill();

    // Curve
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px < W - ox - 40; px++) {
      const E = px / eScale;
      const P = beta * Math.exp(-beta * E);
      const py = xAxis - P * (xAxis - 30) / (beta);
      px === 0 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
    }
    ctx.stroke();

    // Mean energy line
    const meanE = 1 / beta;
    const meanPx = ox + meanE * eScale;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(meanPx, 20); ctx.lineTo(meanPx, xAxis); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`⟨E⟩ = 1/β = ${meanE.toFixed(2)}`, meanPx, xAxis + 15);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`β = 1/kT = ${beta.toFixed(2)}  →  T ∝ ${(1/beta).toFixed(2)}`, 80, 30);

    const bDisp = document.getElementById('boltz-beta-val');
    if (bDisp) bDisp.textContent = beta.toFixed(2);
  }

  betaSlider?.addEventListener('input', draw);
  draw();
}

// ===== CH8: Free Energy =====
function initCh8Vis() {
  const c = document.getElementById('vis-freeenergy');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 350;

  const tempSlider = document.getElementById('fe-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 1);
    const W = c.width, H = c.height;
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    const ox = 60, xAxis = H - 50;
    const xRange = W - ox - 40;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, 20); ctx.lineTo(ox, xAxis); ctx.lineTo(W - 20, xAxis); ctx.stroke();

    ctx.fillStyle = '#ecf0f1'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('State parameter x', W / 2, xAxis + 30);

    // E(x) = x^2, S(x) = -|x| + const
    // F = E - TS
    const midY = (xAxis + 20) / 2;
    const scale = (xAxis - 40) / 8;

    // Energy curve (parabola)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px < xRange; px++) {
      const x = (px / xRange - 0.5) * 4;
      const E = x * x;
      const py = midY - E * scale / 4;
      px === 0 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
    }
    ctx.stroke();

    // -TS curve
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px < xRange; px++) {
      const x = (px / xRange - 0.5) * 4;
      const S = 2 - 0.5 * x * x; // entropy
      const nTS = -T * S;
      const py = midY - nTS * scale / 4;
      px === 0 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
    }
    ctx.stroke();

    // Free energy F = E - TS
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let minF = Infinity, minFx = 0;
    for (let px = 0; px < xRange; px++) {
      const x = (px / xRange - 0.5) * 4;
      const E = x * x;
      const S = 2 - 0.5 * x * x;
      const F = E - T * S;
      if (F < minF) { minF = F; minFx = px; }
      const py = midY - F * scale / 4;
      px === 0 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
    }
    ctx.stroke();

    // Minimum marker
    const minPy = midY - minF * scale / 4;
    ctx.fillStyle = '#f39c12';
    ctx.beginPath(); ctx.arc(ox + minFx, minPy, 5, 0, 2 * Math.PI); ctx.fill();

    // Legend
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e74c3c'; ctx.fillText('E (energy)', W - 150, 30);
    ctx.fillStyle = '#2ecc71'; ctx.fillText('-TS', W - 150, 48);
    ctx.fillStyle = '#f39c12'; ctx.fillText('F = E - TS (free energy)', W - 150, 66);

    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(`T = ${T.toFixed(1)}`, 80, 30);
    ctx.fillText('System minimizes F, not E', 80, 48);

    const tDisp = document.getElementById('fe-temp-val');
    if (tDisp) tDisp.textContent = T.toFixed(1);
  }

  tempSlider?.addEventListener('input', draw);
  draw();
}

// ===== CH9: Phase Transitions =====
function initCh9Vis() {
  const c = document.getElementById('vis-phase');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 400;

  function draw() {
    const W = c.width, H = c.height;
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    const ox = 80, oy = 30, pw = 450, ph = 320;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ph); ctx.lineTo(ox + pw, oy + ph); ctx.stroke();

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Temperature', ox + pw / 2, oy + ph + 25);
    ctx.save(); ctx.translate(ox - 35, oy + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Pressure', 0, 0); ctx.restore();

    // Phase regions
    // Triple point
    const tp = { x: ox + pw * 0.25, y: oy + ph * 0.65 };
    // Critical point
    const cp = { x: ox + pw * 0.7, y: oy + ph * 0.25 };

    // Solid region
    ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy + ph);
    ctx.lineTo(tp.x, tp.y);
    ctx.lineTo(ox + pw * 0.15, oy);
    ctx.closePath();
    ctx.fill();

    // Liquid region
    ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
    ctx.beginPath();
    ctx.moveTo(ox + pw * 0.15, oy);
    ctx.lineTo(tp.x, tp.y);
    ctx.lineTo(cp.x, cp.y);
    ctx.lineTo(ox + pw * 0.6, oy);
    ctx.closePath();
    ctx.fill();

    // Gas region
    ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y);
    ctx.lineTo(ox + pw, oy + ph);
    ctx.lineTo(ox + pw, oy);
    ctx.lineTo(ox + pw * 0.6, oy);
    ctx.lineTo(cp.x, cp.y);
    ctx.closePath();
    ctx.fill();

    // Phase boundaries
    // Solid-liquid
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y);
    ctx.lineTo(ox + pw * 0.15, oy);
    ctx.stroke();

    // Liquid-gas (ends at critical point)
    ctx.strokeStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y);
    ctx.quadraticCurveTo(ox + pw * 0.5, oy + ph * 0.5, cp.x, cp.y);
    ctx.stroke();

    // Solid-gas (sublimation)
    ctx.strokeStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y);
    ctx.quadraticCurveTo(ox + pw * 0.15, oy + ph * 0.85, ox, oy + ph);
    ctx.stroke();

    // Supercritical dashed line
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y);
    ctx.lineTo(cp.x, oy + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y);
    ctx.lineTo(ox + pw, cp.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Points
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(tp.x, tp.y, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(cp.x, cp.y, 5, 0, 2 * Math.PI); ctx.fill();

    // Labels
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#3498db'; ctx.textAlign = 'center';
    ctx.fillText('SOLID', ox + pw * 0.12, oy + ph * 0.35);
    ctx.fillStyle = '#2ecc71';
    ctx.fillText('LIQUID', ox + pw * 0.4, oy + ph * 0.25);
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('GAS', ox + pw * 0.7, oy + ph * 0.6);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Triple Point', tp.x, tp.y + 18);
    ctx.fillText('Critical Point', cp.x, cp.y - 12);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Supercritical', ox + pw * 0.85, oy + ph * 0.15);
    ctx.fillText('Fluid', ox + pw * 0.85, oy + ph * 0.2);
  }

  // Interactive: show what happens when you click on the diagram
  c.addEventListener('mousemove', (e) => {
    draw();
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(mx, my, 4, 0, 2 * Math.PI); ctx.fill();
  });

  draw();
}

// ===== CH10: Quantum Statistics =====
function initCh10Vis() {
  const c = document.getElementById('vis-quantum');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 350;

  const tempSlider = document.getElementById('qs-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 1);
    const beta = 1 / T;
    const mu = 0; // chemical potential
    const W = c.width, H = c.height;

    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    const ox = 70, xAxis = H - 50;
    const eRange = W - ox - 40;
    const eMax = 5;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, 20); ctx.lineTo(ox, xAxis); ctx.lineTo(W - 20, xAxis); ctx.stroke();

    ctx.fillStyle = '#ecf0f1'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Energy ε', W / 2, xAxis + 30);

    // Three distributions
    const distributions = [
      { name: 'Bose-Einstein', fn: (e) => 1 / (Math.exp(beta * (e - mu + 0.5)) - 1), color: '#e74c3c' },
      { name: 'Fermi-Dirac', fn: (e) => 1 / (Math.exp(beta * (e - mu)) + 1), color: '#3498db' },
      { name: 'Maxwell-Boltzmann', fn: (e) => Math.exp(-beta * e), color: '#2ecc71' }
    ];

    distributions.forEach((d, idx) => {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let started = false;
      for (let px = 1; px < eRange; px++) {
        const e = px / eRange * eMax;
        let n = d.fn(e);
        if (!isFinite(n) || n < 0) n = 0;
        if (n > 5) n = 5;
        const py = xAxis - (n / 5) * (xAxis - 30);
        if (!started) { ctx.moveTo(ox + px, py); started = true; }
        else ctx.lineTo(ox + px, py);
      }
      ctx.stroke();

      // Legend
      ctx.fillStyle = d.color;
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(d.name, W - 180, 30 + idx * 18);
    });

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`kT = ${T.toFixed(2)}`, 80, 30);

    // Mark n=1 line for Fermi
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([3,3]);
    const n1y = xAxis - (1 / 5) * (xAxis - 30);
    ctx.beginPath(); ctx.moveTo(ox, n1y); ctx.lineTo(W - 20, n1y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('⟨n⟩ = 1', ox + 5, n1y - 5);

    const tDisp = document.getElementById('qs-temp-val');
    if (tDisp) tDisp.textContent = T.toFixed(2);
  }

  tempSlider?.addEventListener('input', draw);
  draw();
}

// ===== CH11: Blackbody Radiation =====
function initCh11Vis() {
  const c = document.getElementById('vis-blackbody');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 350;

  const tempSlider = document.getElementById('bb-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 5000);
    const W = c.width, H = c.height;
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    const ox = 60, xAxis = H - 50;
    const fRange = W - ox - 40;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, 20); ctx.lineTo(ox, xAxis); ctx.lineTo(W - 20, xAxis); ctx.stroke();

    ctx.fillStyle = '#ecf0f1'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Frequency ν (arb. units)', W / 2, xAxis + 30);

    // Planck distribution at different temperatures
    const temps = [T * 0.5, T * 0.75, T, T * 1.5];
    const colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c'];

    const nuMax = 15;
    let globalMax = 0;

    // Find global max for scaling
    temps.forEach(Tk => {
      for (let px = 1; px < fRange; px++) {
        const nu = px / fRange * nuMax;
        const u = nu * nu * nu / (Math.exp(nu / (Tk / 3000)) - 1);
        if (isFinite(u) && u > globalMax) globalMax = u;
      }
    });

    temps.forEach((Tk, idx) => {
      ctx.strokeStyle = colors[idx];
      ctx.lineWidth = idx === 2 ? 3 : 2;
      ctx.beginPath();
      for (let px = 1; px < fRange; px++) {
        const nu = px / fRange * nuMax;
        const x = nu / (Tk / 3000);
        const u = x > 0.01 ? nu * nu * nu / (Math.exp(x) - 1) : 0;
        const py = xAxis - (u / globalMax) * (xAxis - 40);
        px === 1 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
      }
      ctx.stroke();

      ctx.fillStyle = colors[idx];
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`T = ${Tk.toFixed(0)} K`, W - 130, 30 + idx * 16);
    });

    // Wien's law: peak at nu_max ∝ T
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Planck Distribution: u(ν) ∝ ν³/(e^{hν/kT} - 1)`, 80, 30);

    // Color bar
    const peakWavelength = 2898000 / T; // Wien's law in nm
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`Wien peak λ ≈ ${peakWavelength.toFixed(0)} nm`, 80, 48);

    const tDisp = document.getElementById('bb-temp-val');
    if (tDisp) tDisp.textContent = T.toFixed(0);
  }

  tempSlider?.addEventListener('input', draw);
  draw();
}

// ===== CH12: BEC =====
function initCh12Vis() {
  const c = document.getElementById('vis-bec');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 400;

  const tempSlider = document.getElementById('bec-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 1);
    const W = c.width, H = c.height;
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    // BEC: below Tc, macroscopic occupation of ground state
    const Tc = 1.0;
    const N = 200;

    // Left side: energy levels
    const levelsX = 100, levelsW = 200;
    const nLevels = 15;

    for (let i = 0; i < nLevels; i++) {
      const y = H - 50 - i * 22;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(levelsX, y); ctx.lineTo(levelsX + levelsW, y); ctx.stroke();

      // Occupation
      let occ;
      if (T < Tc) {
        if (i === 0) {
          occ = N * (1 - Math.pow(T / Tc, 1.5));
        } else {
          occ = N * Math.pow(T / Tc, 1.5) / nLevels;
        }
      } else {
        occ = N * Math.exp(-i * 0.3 / T);
        occ = occ / (1 + occ / 2);
      }

      const nDots = Math.min(Math.round(occ / 5), 30);
      ctx.fillStyle = i === 0 ? '#e74c3c' : '#3498db';
      for (let d = 0; d < nDots; d++) {
        const dx = levelsX + 10 + d * 6;
        if (dx < levelsX + levelsW - 10) {
          ctx.beginPath();
          ctx.arc(dx, y - 3, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // Right side: condensate fraction vs T
    const gx = 370, gy = 50, gw = 200, gh = 250;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();

    ctx.fillStyle = '#ecf0f1'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('T / Tc', gx + gw / 2, gy + gh + 20);
    ctx.save(); ctx.translate(gx - 20, gy + gh / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('N₀/N', 0, 0); ctx.restore();

    // N0/N = 1 - (T/Tc)^(3/2) for T < Tc
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px < gw; px++) {
      const t = px / gw * 2;
      const frac = t < 1 ? 1 - Math.pow(t, 1.5) : 0;
      const py = gy + gh - frac * gh;
      px === 0 ? ctx.moveTo(gx + px, py) : ctx.lineTo(gx + px, py);
    }
    ctx.stroke();

    // Current T marker
    const markerX = gx + (T / Tc) / 2 * gw;
    const markerFrac = T < Tc ? 1 - Math.pow(T / Tc, 1.5) : 0;
    const markerY = gy + gh - markerFrac * gh;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(markerX, markerY, 5, 0, 2 * Math.PI); ctx.fill();

    // Tc line
    const tcX = gx + gw / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tcX, gy); ctx.lineTo(tcX, gy + gh); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Tc', tcX, gy + gh + 10);

    // Info
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`T/Tc = ${(T / Tc).toFixed(2)}`, 20, 25);
    ctx.fillText(T < Tc ? 'BEC phase: ground state macroscopically occupied' : 'Normal phase', 20, 45);

    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`N₀/N = ${(markerFrac * 100).toFixed(1)}%`, 20, 65);

    const tDisp = document.getElementById('bec-temp-val');
    if (tDisp) tDisp.textContent = (T / Tc).toFixed(2);
  }

  tempSlider?.addEventListener('input', draw);
  draw();
}

// ===== CH13: Metals - Fermi-Dirac =====
function initCh13Vis() {
  const c = document.getElementById('vis-fermi');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 350;

  const tempSlider = document.getElementById('fermi-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 0.1);
    const W = c.width, H = c.height;
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    const ox = 70, xAxis = H - 50;
    const eRange = W - ox - 40;
    const EF = 2; // Fermi energy

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, 20); ctx.lineTo(ox, xAxis); ctx.lineTo(W - 20, xAxis); ctx.stroke();

    ctx.fillStyle = '#ecf0f1'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Energy ε / εF', W / 2, xAxis + 30);

    // Fermi-Dirac distribution
    const eMax = 4;

    // Density of states g(E) ∝ √E
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let px = 1; px < eRange; px++) {
      const e = px / eRange * eMax;
      const g = Math.sqrt(e);
      const py = xAxis - g / Math.sqrt(eMax) * (xAxis - 40);
      px === 1 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // f(E) * g(E) = occupation
    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.beginPath();
    ctx.moveTo(ox + 1, xAxis);
    for (let px = 1; px < eRange; px++) {
      const e = px / eRange * eMax;
      const f = 1 / (Math.exp((e - EF) / Math.max(T, 0.01)) + 1);
      const g = Math.sqrt(e);
      const n = f * g;
      const py = xAxis - n / Math.sqrt(eMax) * (xAxis - 40);
      ctx.lineTo(ox + px, py);
    }
    ctx.lineTo(ox + eRange, xAxis);
    ctx.closePath();
    ctx.fill();

    // f(E) curve
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 1; px < eRange; px++) {
      const e = px / eRange * eMax;
      const f = 1 / (Math.exp((e - EF) / Math.max(T, 0.01)) + 1);
      const g = Math.sqrt(e);
      const n = f * g;
      const py = xAxis - n / Math.sqrt(eMax) * (xAxis - 40);
      px === 1 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
    }
    ctx.stroke();

    // Fermi energy line
    const efPx = ox + EF / eMax * eRange;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(efPx, 20); ctx.lineTo(efPx, xAxis); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#e74c3c';
    ctx.fillText('εF', efPx, xAxis + 15);

    // Labels
    ctx.fillStyle = '#ecf0f1'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`kT/εF = ${(T / EF).toFixed(3)}`, 80, 30);
    ctx.fillStyle = '#3498db'; ctx.fillText('f(ε)·g(ε) = occupied states', W - 220, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('g(ε) ∝ √ε (density of states)', W - 220, 48);

    const tDisp = document.getElementById('fermi-temp-val');
    if (tDisp) tDisp.textContent = (T / EF).toFixed(3);
  }

  tempSlider?.addEventListener('input', draw);
  draw();
}

// ===== CH14: Semiconductors - Band Gap =====
function initCh14Vis() {
  const c = document.getElementById('vis-bands');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 350;

  const tempSlider = document.getElementById('band-temp');
  const gapSlider = document.getElementById('band-gap');

  function draw() {
    const T = parseFloat(tempSlider?.value || 300);
    const Eg = parseFloat(gapSlider?.value || 1);
    const W = c.width, H = c.height;
    ctx.fillStyle = '#1b2631';
    ctx.fillRect(0, 0, W, H);

    const midY = H / 2;
    const bandH = 80;
    const gapPx = Eg * 40;

    // Valence band
    ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.fillRect(50, midY + gapPx / 2, W - 100, bandH);
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, midY + gapPx / 2, W - 100, bandH);

    // Conduction band
    ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
    ctx.fillRect(50, midY - gapPx / 2 - bandH, W - 100, bandH);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, midY - gapPx / 2 - bandH, W - 100, bandH);

    // Band gap
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(50, midY - gapPx / 2, W - 100, gapPx);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(50, midY - gapPx / 2); ctx.lineTo(W - 50, midY - gapPx / 2);
    ctx.moveTo(50, midY + gapPx / 2); ctx.lineTo(W - 50, midY + gapPx / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Electrons in conduction band (thermal excitation)
    const kT = T / 11600; // kT in eV at T K
    const nElectrons = Math.round(30 * Math.exp(-Eg / (2 * kT)));

    ctx.fillStyle = '#e74c3c';
    for (let i = 0; i < nElectrons; i++) {
      const x = 80 + Math.random() * (W - 160);
      const y = midY - gapPx / 2 - 10 - Math.random() * (bandH - 20);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill();
    }

    // Holes in valence band
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < nElectrons; i++) {
      const x = 80 + Math.random() * (W - 160);
      const y = midY + gapPx / 2 + 10 + Math.random() * (bandH - 20);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.stroke();
    }

    // Labels
    ctx.fillStyle = '#ecf0f1'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Conduction Band', W / 2, midY - gapPx / 2 - bandH - 8);
    ctx.fillText('Valence Band', W / 2, midY + gapPx / 2 + bandH + 18);

    // Gap label
    ctx.fillStyle = '#f39c12';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Eg = ${Eg.toFixed(2)} eV`, W - 70, midY + 5);

    // Arrows for gap
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 1;
    drawArrow(ctx, W - 70, midY - gapPx / 2 + 5, W - 70, midY - gapPx / 2);
    drawArrow(ctx, W - 70, midY + gapPx / 2 - 5, W - 70, midY + gapPx / 2);

    ctx.fillStyle = '#ecf0f1'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`T = ${T} K, kT = ${(kT * 1000).toFixed(1)} meV`, 20, 25);
    ctx.fillText(`Excited electrons: ~${nElectrons}`, 20, 45);

    const tDisp = document.getElementById('band-temp-val');
    const gDisp = document.getElementById('band-gap-val');
    if (tDisp) tDisp.textContent = T;
    if (gDisp) gDisp.textContent = Eg.toFixed(2);
  }

  tempSlider?.addEventListener('input', draw);
  gapSlider?.addEventListener('input', draw);
  draw();
}

// ===== CH15: Stars - HR Diagram =====
function initCh15Vis() {
  const c = document.getElementById('vis-hr');
  if (!c) return;
  const ctx = c.getContext('2d');
  c.width = 600; c.height = 400;

  function draw() {
    const W = c.width, H = c.height;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, W, H);

    const ox = 70, oy = 30, pw = W - 100, ph = H - 80;

    // Axes (note: temperature axis is REVERSED)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ph); ctx.lineTo(ox + pw, oy + ph); ctx.stroke();

    ctx.fillStyle = '#ecf0f1'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Temperature (K) →  ← hotter', ox + pw / 2, oy + ph + 25);
    ctx.save(); ctx.translate(ox - 30, oy + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Luminosity (L/L☉)', 0, 0); ctx.restore();

    // Temp axis labels (reversed!)
    const tempLabels = [40000, 20000, 10000, 5000, 3000];
    tempLabels.forEach(T => {
      const x = ox + (1 - (Math.log10(T) - Math.log10(3000)) / (Math.log10(40000) - Math.log10(3000))) * pw;
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px Inter, sans-serif';
      ctx.fillText(T.toString(), x, oy + ph + 12);
    });

    // Luminosity labels
    const lumLabels = [-4, -2, 0, 2, 4, 6];
    lumLabels.forEach(l => {
      const y = oy + ph - (l + 4) / 10 * ph;
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`10^${l}`, ox - 5, y + 4);
    });
    ctx.textAlign = 'center';

    // Star color from temperature
    function starColor(T) {
      if (T > 20000) return '#aabfff';
      if (T > 10000) return '#cad7ff';
      if (T > 7500) return '#f8f7ff';
      if (T > 6000) return '#fff4e8';
      if (T > 5000) return '#ffd2a1';
      if (T > 3500) return '#ffb56c';
      return '#ff6b35';
    }

    function plotStar(T, L, size, label) {
      const x = ox + (1 - (Math.log10(T) - Math.log10(3000)) / (Math.log10(40000) - Math.log10(3000))) * pw;
      const y = oy + ph - (Math.log10(L) + 4) / 10 * ph;
      const col = starColor(T);

      // Glow
      const grd = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      grd.addColorStop(0, col + 'aa');
      grd.addColorStop(1, col + '00');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(x, y, size * 3, 0, 2 * Math.PI); ctx.fill();

      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, size, 0, 2 * Math.PI); ctx.fill();

      if (label) {
        ctx.fillStyle = '#ecf0f1'; ctx.font = '10px Inter, sans-serif';
        ctx.fillText(label, x, y - size - 6);
      }
    }

    // Main sequence
    const msStars = [
      [35000, 200000, 5], [25000, 50000, 4.5], [15000, 5000, 4],
      [10000, 500, 3.5], [7500, 50, 3], [6000, 2, 2.5],
      [5800, 1, 2.5], [5000, 0.5, 2], [4000, 0.1, 1.8], [3000, 0.01, 1.5]
    ];
    // Draw main sequence band
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 30;
    ctx.beginPath();
    msStars.forEach(([T, L], i) => {
      const x = ox + (1 - (Math.log10(T) - Math.log10(3000)) / (Math.log10(40000) - Math.log10(3000))) * pw;
      const y = oy + ph - (Math.log10(L) + 4) / 10 * ph;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    msStars.forEach(([T, L, s]) => plotStar(T, L, s));

    // Named stars
    plotStar(5800, 1, 3, 'Sun');
    plotStar(3500, 100000, 6, 'Betelgeuse');
    plotStar(10000, 10000, 5, 'Rigel');
    plotStar(25000, 0.001, 1.5, 'White Dwarf');

    // Region labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Main Sequence', ox + pw * 0.5, oy + ph * 0.55);
    ctx.fillText('Giants', ox + pw * 0.65, oy + ph * 0.15);
    ctx.fillText('Supergiants', ox + pw * 0.45, oy + ph * 0.08);
    ctx.fillText('White Dwarfs', ox + pw * 0.25, oy + ph * 0.88);
  }

  draw();
}
