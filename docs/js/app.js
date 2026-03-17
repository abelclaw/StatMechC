// =============================================================================
// Statistical Mechanics Interactive Textbook - Main Application
// =============================================================================

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

  const target = document.getElementById(id);
  if (target && id.startsWith('ch') && !loadedChapters[id]) {
    try {
      const resp = await fetch(`chapters/${id}.html`);
      if (resp.ok) {
        const html = await resp.text();
        target.innerHTML = html;
        loadedChapters[id] = true;
        buildChapterTOC(target);
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
    } catch (e) {
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

  if (window.renderMathInElement && target) {
    renderMathInElement(target, katexOptions);
  }

  initChapterVisualizations(id);
}

// ===== CHAPTER TABLE OF CONTENTS =====
function buildChapterTOC(container) {
  const headings = container.querySelectorAll('h2');
  if (headings.length < 2) return; // not worth a TOC for 1 section

  const title = container.querySelector('.chapter-title');
  if (!title) return;

  // Auto-assign IDs to headings that lack them
  let autoId = 0;
  headings.forEach(h => {
    if (!h.id) {
      autoId++;
      h.id = 'sec-' + autoId;
    }
  });

  const details = document.createElement('details');
  details.className = 'chapter-toc';
  const summary = document.createElement('summary');
  summary.className = 'toc-title';
  summary.textContent = 'Contents';
  details.appendChild(summary);

  const list = document.createElement('ol');
  list.className = 'toc-list';

  headings.forEach(h => {
    const text = h.textContent.trim();
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = text;
    a.addEventListener('click', e => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    li.appendChild(a);
    list.appendChild(li);
  });

  details.appendChild(list);
  title.insertAdjacentElement('afterend', details);
}

// ===== DERIVATIONS =====
function initDerivations() {
  document.querySelectorAll('.derivation-header').forEach(header => {
    header.addEventListener('click', () => {
      const d = header.parentElement;
      d.classList.toggle('open');
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
  const collapseBtn = document.querySelector('.sidebar-collapse');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('show');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }
  if (collapseBtn && sidebar) {
    // Restore collapsed state from localStorage
    if (localStorage.getItem('sidebar-collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
  }
}

function closeMobileMenu() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.overlay')?.classList.remove('show');
}


// =============================================================================
// VISUALIZATION INFRASTRUCTURE
// =============================================================================

const activeAnimations = {};

// Style constants
const COLORS = {
  bg: '#0f1923',
  grid: 'rgba(255,255,255,0.06)',
  axis: 'rgba(255,255,255,0.25)',
  text: '#e8ecf1',
  textDim: 'rgba(255,255,255,0.4)',
  blue: '#4fc3f7',
  green: '#66bb6a',
  red: '#ef5350',
  orange: '#ffa726',
  purple: '#ab47bc',
  yellow: '#ffee58',
  cyan: '#26c6da',
  pink: '#ec407a',
};
const FONT = '13px Inter, system-ui, sans-serif';
const FONT_SM = '11px Inter, system-ui, sans-serif';
const FONT_LG = '14px Inter, system-ui, sans-serif';

/**
 * DPI-aware canvas setup. Returns { ctx, W, H } where W, H are CSS pixels.
 * The canvas internal resolution is scaled by devicePixelRatio for crisp rendering.
 */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || canvas.width || 600;
  const h = rect.height || canvas.height || 300;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W: w, H: h };
}

/** Clear canvas with standard dark background */
function clearCanvas(ctx, W, H) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
}

/** Draw grid lines */
function drawGrid(ctx, W, H, spacingX, spacingY) {
  spacingX = spacingX || 60;
  spacingY = spacingY || 60;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let x = spacingX; x < W; x += spacingX) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = spacingY; y < H; y += spacingY) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

/** Draw axes at the given origin and extent */
function drawAxes(ctx, ox, oy, w, h, opts) {
  opts = opts || {};
  ctx.strokeStyle = COLORS.axis;
  ctx.lineWidth = 1;
  // vertical axis
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + h); ctx.stroke();
  // horizontal axis
  ctx.beginPath(); ctx.moveTo(ox, oy + h); ctx.lineTo(ox + w, oy + h); ctx.stroke();

  ctx.fillStyle = COLORS.text;
  ctx.font = FONT_SM;
  ctx.textAlign = 'center';
  if (opts.xLabel) ctx.fillText(opts.xLabel, ox + w / 2, oy + h + 25);
  if (opts.yLabel) {
    ctx.save();
    ctx.translate(ox - (opts.yLabelOffset || 30), oy + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(opts.yLabel, 0, 0);
    ctx.restore();
  }
}

/** Draw an arrow from (x1,y1) to (x2,y2) */
function drawArrow(ctx, x1, y1, x2, y2, headLen) {
  headLen = headLen || 8;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
  ctx.stroke();
}

/** Multi-color palette for plots */
function plotColor(index) {
  const palette = [COLORS.blue, COLORS.green, COLORS.red, COLORS.orange, COLORS.purple, COLORS.yellow, COLORS.cyan, COLORS.pink];
  return palette[index % palette.length];
}


// ===== VISUALIZATION ROUTER =====
function initVisualizations() {
  // Per-chapter initialization triggered by navigation
}

function initChapterVisualizations(chapterId) {
  // Cancel all running animations
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


// =============================================================================
// CH1: Probability Distributions
// =============================================================================
function initCh1Vis() {
  // ----- Gaussian Explorer -----
  const cGauss = document.getElementById('vis-gaussian');
  if (!cGauss) return;
  const { ctx, W, H } = setupCanvas(cGauss);

  const sigmaSlider = document.getElementById('gauss-sigma');
  const meanSlider = document.getElementById('gauss-mean');

  function drawGaussian() {
    const sigma = parseFloat(sigmaSlider?.value || 1);
    const mean = parseFloat(meanSlider?.value || 0);
    clearCanvas(ctx, W, H);
    drawGrid(ctx, W, H);

    const xAxis = H - 40;
    const xScale = (W - 60) / 8; // range -4 to 4

    // Axes
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, xAxis); ctx.lineTo(W - 10, xAxis); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2, 10); ctx.lineTo(W / 2, xAxis); ctx.stroke();

    const maxY = 1 / (sigma * Math.sqrt(2 * Math.PI));
    const yScale = (xAxis - 30) / Math.max(maxY, 0.5);

    // Fill 1-sigma region
    ctx.fillStyle = 'rgba(79,195,247,0.15)';
    ctx.beginPath();
    let started = false;
    for (let px = 0; px < W - 40; px++) {
      const x = (px - (W - 60) / 2) / xScale;
      if (Math.abs(x - mean) <= sigma) {
        const y = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
        const py = xAxis - y * yScale;
        if (!started) { ctx.moveTo(px + 30, xAxis); started = true; }
        ctx.lineTo(px + 30, py);
      }
    }
    ctx.lineTo(W / 2 + (mean + sigma) * xScale + 30, xAxis);
    ctx.closePath();
    ctx.fill();

    // Curve
    ctx.strokeStyle = COLORS.blue;
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
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    const meanPx = W / 2 + mean * xScale;
    ctx.beginPath(); ctx.moveTo(meanPx, 10); ctx.lineTo(meanPx, xAxis); ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.fillText('\u03BC = ' + mean.toFixed(1), meanPx, xAxis + 18);
    ctx.fillText('\u03C3 = ' + sigma.toFixed(2), meanPx + sigma * xScale / 2, xAxis - maxY * yScale / 2);
    ctx.fillStyle = 'rgba(79,195,247,0.6)';
    ctx.fillText('68%', meanPx, xAxis - maxY * yScale * 0.3);

    document.getElementById('gauss-sigma-val')?.replaceChildren(document.createTextNode(sigma.toFixed(2)));
    document.getElementById('gauss-mean-val')?.replaceChildren(document.createTextNode(mean.toFixed(1)));
  }

  sigmaSlider?.addEventListener('input', drawGaussian);
  meanSlider?.addEventListener('input', drawGaussian);
  drawGaussian();

  // ----- CLT Visualization -----
  // Animated: pick a distribution, draw N samples, average, build histogram.
  const cClt = document.getElementById('vis-clt');
  if (cClt) {
    const clt = setupCanvas(cClt);
    const ctx2 = clt.ctx, W2 = clt.W, H2 = clt.H;
    const nSlider = document.getElementById('clt-n');
    const distSelect = document.getElementById('clt-dist');
    const customInput = document.getElementById('clt-custom-fn');
    const cltGoBtn = document.getElementById('clt-go');
    const cltClearBtn = document.getElementById('clt-clear');
    const cltCountDisp = document.getElementById('clt-count');

    const cltSpeedSlider = document.getElementById('clt-speed');

    let cltRunning = false;
    let cltAnimId = null;
    let histBins = new Float64Array(80);
    let histCount = 0;
    let curSamples = []; // current N draw values to highlight on left
    let curAvg = null;   // current average value
    let lastBinIdx = -1; // last bin that changed on right

    // Show/hide custom function input
    distSelect?.addEventListener('change', () => {
      if (customInput) customInput.style.display = distSelect.value === 'custom' ? 'inline-block' : 'none';
      resetCLT();
    });

    // Box-Muller for Gaussian random numbers
    function gaussRand() {
      let u, v, s;
      do { u = 2 * Math.random() - 1; v = 2 * Math.random() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
      return u * Math.sqrt(-2 * Math.log(s) / s);
    }

    // Distribution samplers — each returns a sample value + PDF for display
    function getDistribution() {
      const name = distSelect?.value || 'uniform';
      if (name === 'uniform') {
        return {
          sample: () => Math.random(),
          pdf: (x) => (x >= 0 && x <= 1) ? 1 : 0,
          label: 'Uniform [0,1]',
          domain: [0, 1]
        };
      }
      if (name === 'exponential') {
        return {
          sample: () => -Math.log(1 - Math.random()) / 3,
          pdf: (x) => x >= 0 ? 3 * Math.exp(-3 * x) : 0,
          label: 'Exponential (λ=3)',
          domain: [0, 2.5]
        };
      }
      if (name === 'bimodal') {
        return {
          sample: () => Math.random() < 0.5 ? 0.2 + 0.08 * gaussRand() : 0.8 + 0.08 * gaussRand(),
          pdf: (x) => Math.exp(-0.5 * ((x - 0.2) / 0.08) ** 2) + Math.exp(-0.5 * ((x - 0.8) / 0.08) ** 2),
          label: 'Bimodal',
          domain: [0, 1]
        };
      }
      if (name === 'skewed') {
        return {
          sample: () => { let s = 0; for (let i = 0; i < 3; i++) { const u = gaussRand(); s += u * u; } return s; },
          pdf: (x) => x > 0 ? Math.sqrt(x) * Math.exp(-x / 2) : 0,
          label: 'Chi-squared (k=3)',
          domain: [0, 12]
        };
      }
      if (name === 'custom') {
        const expr = (customInput?.value || 'x').trim();
        let fn;
        try { fn = new Function('x', 'return (' + expr + ')'); fn(0.5); }
        catch (e) { fn = () => 1; }
        let fMax = 0;
        for (let i = 0; i <= 200; i++) { const v = Math.abs(fn(i / 200)); if (v > fMax) fMax = v; }
        if (fMax < 1e-10) fMax = 1;
        return {
          sample: () => {
            for (let tries = 0; tries < 1000; tries++) {
              const x = Math.random();
              if (Math.random() * fMax < Math.abs(fn(x))) return x;
            }
            return Math.random();
          },
          pdf: (x) => Math.abs(fn(x)),
          label: 'Custom: ' + expr,
          domain: [0, 1]
        };
      }
      return { sample: () => Math.random(), pdf: () => 1, label: 'Uniform', domain: [0, 1] };
    }

    // Histogram range — adaptive from distribution and N
    let histMin = 0, histMax = 1;
    function setupHistRange() {
      const dist = getDistribution();
      const N = parseInt(nSlider?.value || 1);
      const samples = [];
      for (let i = 0; i < 500; i++) {
        let s = 0;
        for (let j = 0; j < N; j++) s += dist.sample();
        samples.push(s / N);
      }
      samples.sort((a, b) => a - b);
      histMin = samples[Math.floor(samples.length * 0.005)];
      histMax = samples[Math.floor(samples.length * 0.995)];
      const margin = (histMax - histMin) * 0.15;
      histMin -= margin;
      histMax += margin;
      if (histMax - histMin < 0.01) { histMin -= 0.5; histMax += 0.5; }
    }

    function resetCLT() {
      histBins = new Float64Array(80);
      histCount = 0;
      curSamples = [];
      curAvg = null;
      lastBinIdx = -1;
      cltFrameCount = 0;
      setupHistRange();
      if (cltCountDisp) cltCountDisp.textContent = '0 averages';
      drawCLTFig();
    }

    function drawCLTFig() {
      clearCanvas(ctx2, W2, H2);
      const N = parseInt(nSlider?.value || 1);
      const dist = getDistribution();

      // Layout: left = source PDF, right = histogram of averages
      const divX = W2 * 0.3;
      const rightX = divX + 30;
      const rightW = W2 - rightX - 20;

      // --- LEFT: source distribution ---
      const lx = 25, ly = 35, lw = divX - 40, lh = H2 - 80;
      const d = dist.domain;
      const nPdf = 200;
      let pdfMax = 0;
      const pdfVals = [];
      for (let i = 0; i <= nPdf; i++) {
        const x = d[0] + (d[1] - d[0]) * i / nPdf;
        const v = dist.pdf(x);
        pdfVals.push(v);
        if (v > pdfMax) pdfMax = v;
      }
      if (pdfMax < 1e-10) pdfMax = 1;

      ctx2.strokeStyle = COLORS.axis; ctx2.lineWidth = 1;
      ctx2.beginPath(); ctx2.moveTo(lx, ly); ctx2.lineTo(lx, ly + lh); ctx2.lineTo(lx + lw, ly + lh); ctx2.stroke();

      ctx2.fillStyle = COLORS.blue + '30';
      ctx2.beginPath(); ctx2.moveTo(lx, ly + lh);
      for (let i = 0; i <= nPdf; i++) {
        ctx2.lineTo(lx + (i / nPdf) * lw, ly + lh - (pdfVals[i] / pdfMax) * lh * 0.9);
      }
      ctx2.lineTo(lx + lw, ly + lh); ctx2.closePath(); ctx2.fill();

      ctx2.strokeStyle = COLORS.blue; ctx2.lineWidth = 2;
      ctx2.beginPath();
      for (let i = 0; i <= nPdf; i++) {
        const px = lx + (i / nPdf) * lw;
        const py = ly + lh - (pdfVals[i] / pdfMax) * lh * 0.9;
        i === 0 ? ctx2.moveTo(px, py) : ctx2.lineTo(px, py);
      }
      ctx2.stroke();

      // Highlight current N sample draws as vertical lines on the PDF
      if (curSamples.length > 0) {
        for (let si = 0; si < curSamples.length; si++) {
          const sv = curSamples[si];
          const frac = (sv - d[0]) / (d[1] - d[0]);
          if (frac < 0 || frac > 1) continue;
          const sx = lx + frac * lw;
          // Vertical line from axis to PDF curve
          const pdfIdx = Math.round(frac * nPdf);
          const pdfY = ly + lh - (pdfVals[Math.min(pdfIdx, nPdf)] / pdfMax) * lh * 0.9;
          ctx2.strokeStyle = COLORS.orange; ctx2.lineWidth = 1.5;
          ctx2.beginPath(); ctx2.moveTo(sx, ly + lh); ctx2.lineTo(sx, pdfY); ctx2.stroke();
          // Dot at top
          ctx2.fillStyle = COLORS.orange;
          ctx2.beginPath(); ctx2.arc(sx, pdfY, 3, 0, 2 * Math.PI); ctx2.fill();
          // Small number label
          ctx2.fillStyle = COLORS.orange; ctx2.font = '9px Inter, system-ui, sans-serif'; ctx2.textAlign = 'center';
          ctx2.fillText(si + 1, sx, ly + lh + 12);
        }
      }

      ctx2.fillStyle = COLORS.text; ctx2.font = FONT_SM; ctx2.textAlign = 'center';
      ctx2.fillText('Source distribution', lx + lw / 2, ly - 8);
      ctx2.fillStyle = COLORS.blue; ctx2.font = FONT_SM;
      ctx2.fillText(dist.label, lx + lw / 2, ly + lh + 24);

      // Divider
      ctx2.strokeStyle = COLORS.grid; ctx2.lineWidth = 1;
      ctx2.beginPath(); ctx2.moveTo(divX, 10); ctx2.lineTo(divX, H2 - 10); ctx2.stroke();

      // --- RIGHT: histogram of averages ---
      const hy = 35, hh = H2 - 80;
      const nBins = histBins.length;
      const barW = rightW / nBins;

      ctx2.strokeStyle = COLORS.axis; ctx2.lineWidth = 1;
      ctx2.beginPath(); ctx2.moveTo(rightX, hy); ctx2.lineTo(rightX, hy + hh); ctx2.lineTo(rightX + rightW, hy + hh); ctx2.stroke();

      let hMax = 0;
      for (let i = 0; i < nBins; i++) if (histBins[i] > hMax) hMax = histBins[i];
      if (hMax < 1) hMax = 1;

      for (let i = 0; i < nBins; i++) {
        if (histBins[i] === 0) continue;
        const bh = (histBins[i] / hMax) * hh * 0.9;
        ctx2.fillStyle = (i === lastBinIdx) ? COLORS.orange : COLORS.green + '70';
        ctx2.fillRect(rightX + i * barW, hy + hh - bh, barW - 1, bh);
      }

      // X-axis ticks
      ctx2.fillStyle = COLORS.textDim; ctx2.font = '10px Inter, system-ui, sans-serif'; ctx2.textAlign = 'center';
      for (let i = 0; i <= 5; i++) {
        const frac = i / 5;
        const val = histMin + frac * (histMax - histMin);
        const tx = rightX + frac * rightW;
        ctx2.beginPath(); ctx2.moveTo(tx, hy + hh); ctx2.lineTo(tx, hy + hh + 4); ctx2.strokeStyle = COLORS.axis; ctx2.stroke();
        ctx2.fillText(val.toFixed(2), tx, hy + hh + 15);
      }

      ctx2.fillStyle = COLORS.text; ctx2.font = FONT_SM; ctx2.textAlign = 'center';
      ctx2.fillText('Normalized histogram of x\u0304  (N=' + N + ', ' + histCount + ' averages)', rightX + rightW / 2, hy - 8);
    }

    let cltFrameCount = 0;
    function cltTick() {
      if (!cltRunning) return;
      const N = parseInt(nSlider?.value || 1);
      const speed = parseInt(cltSpeedSlider?.value || 2);
      const dist = getDistribution();
      const nBins = histBins.length;

      // Speed controls: at speed 1, do 1 average every ~60 frames (~1/sec at 60fps).
      // At speed 6, do 20 averages per frame.
      const batchSizes = [0, 1, 1, 1, 2, 5, 10, 20]; // index by speed
      const frameSkips = [0, 60, 30, 8, 3, 1, 1, 1];
      const batch = batchSizes[speed] || 1;
      const skip = frameSkips[speed] || 1;

      cltFrameCount++;
      if (cltFrameCount % skip !== 0) {
        cltAnimId = requestAnimationFrame(cltTick);
        return;
      }

      for (let b = 0; b < batch; b++) {
        // Draw N samples and record them
        curSamples = [];
        let sum = 0;
        for (let i = 0; i < N; i++) {
          const v = dist.sample();
          curSamples.push(v);
          sum += v;
        }
        curAvg = sum / N;
        const binIdx = Math.floor((curAvg - histMin) / (histMax - histMin) * nBins);
        if (binIdx >= 0 && binIdx < nBins) {
          histBins[binIdx]++;
          lastBinIdx = binIdx;
        }
        histCount++;
      }

      if (cltCountDisp) cltCountDisp.textContent = histCount + ' averages';
      document.getElementById('clt-n-val')?.replaceChildren(document.createTextNode(N));
      if (document.getElementById('clt-speed-val'))
        document.getElementById('clt-speed-val').textContent = speed;
      drawCLTFig();
      cltAnimId = requestAnimationFrame(cltTick);
    }

    cltGoBtn?.addEventListener('click', () => {
      cltRunning = !cltRunning;
      if (cltRunning) {
        cltGoBtn.textContent = '\u23F8 Stop';
        if (histCount === 0) setupHistRange();
        cltAnimId = requestAnimationFrame(cltTick);
      } else {
        cltGoBtn.textContent = '\u25B6 Go';
        if (cltAnimId) { cancelAnimationFrame(cltAnimId); cltAnimId = null; }
      }
    });

    cltClearBtn?.addEventListener('click', () => {
      cltRunning = false;
      if (cltGoBtn) cltGoBtn.textContent = '\u25B6 Go';
      if (cltAnimId) { cancelAnimationFrame(cltAnimId); cltAnimId = null; }
      resetCLT();
    });

    nSlider?.addEventListener('input', () => {
      document.getElementById('clt-n-val')?.replaceChildren(document.createTextNode(nSlider.value));
      resetCLT();
    });

    customInput?.addEventListener('change', resetCLT);

    setupHistRange();
    drawCLTFig();
  }

  // ----- Poisson Distribution Explorer -----
  const cPoisson = document.getElementById('vis-poisson');
  if (cPoisson) {
    const poi = setupCanvas(cPoisson);
    const ctxP = poi.ctx, WP = poi.W, HP = poi.H;
    const lambdaSlider = document.getElementById('poisson-lambda');

    function drawPoisson() {
      const lambda = parseFloat(lambdaSlider?.value || 5);
      clearCanvas(ctxP, WP, HP);

      const ox = 50, xAxis = HP - 45;
      const plotW = WP - ox - 20;
      const mMax = 30;
      const barW = plotW / (mMax + 1);

      // Compute PMF values
      const pmf = [];
      let maxP = 0;
      for (let m = 0; m <= mMax; m++) {
        // log P(m) = m*ln(lambda) - lambda - ln(m!)
        let logP = m * Math.log(lambda) - lambda;
        for (let k = 2; k <= m; k++) logP -= Math.log(k);
        const p = Math.exp(logP);
        pmf.push(p);
        if (p > maxP) maxP = p;
      }
      const yScale = (xAxis - 30) / (maxP * 1.1);

      // Draw axes
      drawAxes(ctxP, ox, 15, plotW, xAxis - 15, { xLabel: 'm', yLabel: 'P(m)' });

      // Draw PMF bars
      ctxP.fillStyle = 'rgba(79,195,247,0.5)';
      ctxP.strokeStyle = COLORS.blue;
      ctxP.lineWidth = 1;
      for (let m = 0; m <= mMax; m++) {
        const bh = pmf[m] * yScale;
        const bx = ox + m * barW + 2;
        const bw = barW - 4;
        ctxP.fillRect(bx, xAxis - bh, bw, bh);
        ctxP.strokeRect(bx, xAxis - bh, bw, bh);
      }

      // Gaussian approximation overlay: N(lambda, sqrt(lambda))
      const sig = Math.sqrt(lambda);
      ctxP.strokeStyle = COLORS.orange;
      ctxP.lineWidth = 2;
      ctxP.beginPath();
      for (let px = 0; px < plotW; px++) {
        const m = px / plotW * (mMax + 1);
        const g = (1 / (sig * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((m - lambda) / sig) ** 2);
        const py = xAxis - g * yScale;
        px === 0 ? ctxP.moveTo(ox + px, py) : ctxP.lineTo(ox + px, py);
      }
      ctxP.stroke();

      // Mean marker
      const meanPx = ox + lambda / (mMax + 1) * plotW + barW / 2;
      ctxP.strokeStyle = COLORS.red;
      ctxP.lineWidth = 1.5;
      ctxP.setLineDash([5, 5]);
      ctxP.beginPath(); ctxP.moveTo(meanPx, 15); ctxP.lineTo(meanPx, xAxis); ctxP.stroke();
      ctxP.setLineDash([]);

      // sigma markers
      const sigLeftPx = ox + (lambda - sig) / (mMax + 1) * plotW + barW / 2;
      const sigRightPx = ox + (lambda + sig) / (mMax + 1) * plotW + barW / 2;
      ctxP.strokeStyle = 'rgba(255,255,255,0.2)';
      ctxP.setLineDash([3, 3]);
      ctxP.beginPath(); ctxP.moveTo(sigLeftPx, 15); ctxP.lineTo(sigLeftPx, xAxis); ctxP.stroke();
      ctxP.beginPath(); ctxP.moveTo(sigRightPx, 15); ctxP.lineTo(sigRightPx, xAxis); ctxP.stroke();
      ctxP.setLineDash([]);

      // Labels
      ctxP.fillStyle = COLORS.text;
      ctxP.font = FONT;
      ctxP.textAlign = 'left';
      ctxP.fillText('\u03BB = ' + lambda.toFixed(1) + ',  \u03C3 = \u221A\u03BB = ' + sig.toFixed(2), ox + 5, 28);
      ctxP.fillStyle = COLORS.blue;
      ctxP.fillText('Poisson PMF', WP - 160, 28);
      ctxP.fillStyle = COLORS.orange;
      ctxP.fillText('Gaussian approx.', WP - 160, 44);
      ctxP.fillStyle = COLORS.red;
      ctxP.fillText('\u03BC = \u03BB', WP - 160, 60);

      // Tick labels on x-axis
      ctxP.fillStyle = COLORS.textDim;
      ctxP.font = '10px Inter, system-ui, sans-serif';
      ctxP.textAlign = 'center';
      for (let m = 0; m <= mMax; m += 5) {
        const tx = ox + m * barW + barW / 2;
        ctxP.fillText(m.toString(), tx, xAxis + 12);
      }

      document.getElementById('poisson-lambda-val')?.replaceChildren(document.createTextNode(lambda.toFixed(1)));
    }

    lambdaSlider?.addEventListener('input', drawPoisson);
    drawPoisson();
  }

  // ----- Convolution / Averaging Visualizer -----
  const cConv = document.getElementById('vis-convolution');
  if (cConv) {
    const conv = setupCanvas(cConv);
    const ctxC = conv.ctx, WC = conv.W, HC = conv.H;
    const convSlider = document.getElementById('conv-n');

    function drawConvolution() {
      const N = parseInt(convSlider?.value || 1);
      clearCanvas(ctxC, WC, HC);

      const ox = 50, xAxis = HC - 45;
      const plotW = WC - ox - 20;
      const nPts = 400;

      // Range for x-bar: for N uniform on [-0.5, 0.5], the range of the average is [-0.5, 0.5]
      // but we display a bit wider for context
      const xMin = -1.0, xMax = 1.0;

      // Compute P_N(x) via convolution of uniform distributions,
      // then evaluate the density of the average (x-bar = sum/N)
      // The sum of N uniform[-0.5,0.5] has support [-N/2, N/2]
      // and the average has support [-0.5, 0.5].
      // We use the Irwin-Hall approach: P_N(x_bar) = N * P_sum(N*x_bar)
      // For the sum of N uniform[0,1]: P_sum(s) = 1/(N-1)! * sum_{k=0}^{floor(s)} (-1)^k C(N,k) (s-k)^(N-1)
      // Shift: our uniform is on [-0.5, 0.5] = [0,1] - 0.5, so sum is Irwin-Hall shifted by -N/2

      function irwinHallPDF(s, n) {
        // PDF of sum of n uniform[0,1] random variables at point s
        if (s <= 0 || s >= n) return 0;
        let result = 0;
        const floorS = Math.floor(s);
        let sign = 1;
        let binom = 1;
        for (let k = 0; k <= floorS; k++) {
          if (k > 0) binom = binom * (n - k + 1) / k;
          result += sign * binom * Math.pow(s - k, n - 1);
          sign *= -1;
        }
        // Divide by (n-1)!
        let factorial = 1;
        for (let i = 2; i < n; i++) factorial *= i;
        return result / factorial;
      }

      // Evaluate P_N(x_bar) for our shifted uniform
      const vals = [];
      let maxVal = 0;
      for (let i = 0; i < nPts; i++) {
        const xbar = xMin + (xMax - xMin) * i / nPts;
        // Transform: xbar of uniform[-0.5,0.5] -> sum of uniform[0,1] at s = N*(xbar + 0.5)
        const s = N * (xbar + 0.5);
        // P_N(xbar) = N * irwinHallPDF(s, N)
        const p = N * irwinHallPDF(s, N);
        vals.push(p);
        if (p > maxVal) maxVal = p;
      }

      if (maxVal < 1e-10) maxVal = 1;
      const yScale = (xAxis - 30) / (maxVal * 1.05);

      drawAxes(ctxC, ox, 15, plotW, xAxis - 15, { xLabel: 'x\u0304 (sample mean)', yLabel: 'P\u2099(x\u0304)' });

      // Filled distribution
      ctxC.fillStyle = 'rgba(102,187,106,0.3)';
      ctxC.beginPath();
      ctxC.moveTo(ox, xAxis);
      for (let i = 0; i < nPts; i++) {
        const px = ox + i / nPts * plotW;
        const py = xAxis - vals[i] * yScale;
        ctxC.lineTo(px, py);
      }
      ctxC.lineTo(ox + plotW, xAxis);
      ctxC.closePath();
      ctxC.fill();

      // Distribution curve
      ctxC.strokeStyle = COLORS.green;
      ctxC.lineWidth = 2.5;
      ctxC.beginPath();
      for (let i = 0; i < nPts; i++) {
        const px = ox + i / nPts * plotW;
        const py = xAxis - vals[i] * yScale;
        i === 0 ? ctxC.moveTo(px, py) : ctxC.lineTo(px, py);
      }
      ctxC.stroke();

      // Labels
      ctxC.fillStyle = COLORS.text;
      ctxC.font = FONT;
      ctxC.textAlign = 'left';
      ctxC.fillText('N = ' + N + (N === 1 ? ' (uniform)' : N === 2 ? ' (triangle)' : ' (converging to Gaussian)'), ox + 5, 28);
      ctxC.fillStyle = COLORS.green;
      ctxC.fillText('P\u2099(x\u0304)', WC - 150, 28);

      document.getElementById('conv-n-val')?.replaceChildren(document.createTextNode(N.toString()));
    }

    convSlider?.addEventListener('input', drawConvolution);
    drawConvolution();
  }
}


// =============================================================================
// CH2: Random Walk & Diffusion
// =============================================================================
function initCh2Vis() {
  const c = document.getElementById('vis-randomwalk');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  let walkers = [];
  let running = false;
  let steps = 0;
  const nWalkers = 50;
  const stepSize = 4;

  function reset() {
    walkers = [];
    for (let i = 0; i < nWalkers; i++) {
      walkers.push({ x: W / 2, y: H / 2, trail: [] });
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
    clearCanvas(ctx, W, H);

    walkers.forEach((w, i) => {
      const hue = (i * 360 / nWalkers) % 360;
      ctx.strokeStyle = 'hsla(' + hue + ', 70%, 60%, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      w.trail.forEach((p, j) => {
        j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      ctx.fillStyle = 'hsl(' + hue + ', 70%, 60%)';
      ctx.beginPath();
      ctx.arc(w.x, w.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Origin
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 3, 0, 2 * Math.PI);
    ctx.stroke();

    // RMS distance
    let sumR2 = 0;
    walkers.forEach(w => {
      sumR2 += (w.x - W / 2) ** 2 + (w.y - H / 2) ** 2;
    });
    const rms = Math.sqrt(sumR2 / nWalkers);
    const expected = stepSize * Math.sqrt(steps);

    ctx.strokeStyle = 'rgba(239,83,80,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, rms, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(102,187,106,0.5)';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, expected, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.text;
    ctx.font = FONT;
    ctx.textAlign = 'left';
    ctx.fillText('Steps: ' + steps, 10, 20);
    ctx.fillText('RMS distance: ' + rms.toFixed(1), 10, 38);
    ctx.fillText('Expected (\u2113\u221AN): ' + expected.toFixed(1), 10, 56);
    ctx.fillStyle = COLORS.red; ctx.fillText('\u2014 Measured RMS', 10, 74);
    ctx.fillStyle = COLORS.green; ctx.fillText('\u2014 Expected \u221AN', 10, 92);
  }

  const rwSpeedSlider = document.getElementById('rw-speed');

  function animateRW() {
    if (!running) return;
    const speed = parseInt(rwSpeedSlider?.value || 3);
    // speed 1 = 1 step every 4 frames, speed 6 = 10 steps per frame
    const stepsPerFrame = [0, 1, 1, 1, 2, 5, 10][speed];
    const frameSkip = [0, 4, 2, 1, 1, 1, 1][speed];
    rwFrameCount++;
    if (rwFrameCount % frameSkip === 0) {
      for (let i = 0; i < stepsPerFrame; i++) step();
      draw();
    }
    if (document.getElementById('rw-speed-val'))
      document.getElementById('rw-speed-val').textContent = speed;
    activeAnimations['randomwalk'] = requestAnimationFrame(animateRW);
  }
  let rwFrameCount = 0;

  // Wire up buttons using onclick to avoid any listener issues
  const rwStartBtn = document.getElementById('rw-start');
  const rwResetBtn = document.getElementById('rw-reset');

  if (rwStartBtn) {
    rwStartBtn.onclick = function() {
      running = !running;
      rwStartBtn.textContent = running ? '⏸ Pause' : '▶ Start';
      if (running) animateRW();
    };
  }

  if (rwResetBtn) {
    rwResetBtn.onclick = function() {
      running = false;
      if (rwStartBtn) rwStartBtn.textContent = '▶ Start';
      if (activeAnimations['randomwalk']) cancelAnimationFrame(activeAnimations['randomwalk']);
      reset();
      draw();
    };
  }

  reset();
  draw();

  // ----- Diffusion Equation -----
  const c2 = document.getElementById('vis-diffusion');
  if (c2) {
  const diff = setupCanvas(c2);
  const ctx2 = diff.ctx, W2 = diff.W, H2 = diff.H;
  const diffSlider = document.getElementById('diff-D');

  function drawDiffusion() {
    const D = parseFloat(diffSlider?.value || 1);
    clearCanvas(ctx2, W2, H2);

    const xAxis = H2 - 40;
    const times = [0.1, 0.5, 1, 2, 5];
    const colors = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.green, COLORS.blue];

    times.forEach((t, idx) => {
      const sigma = Math.sqrt(2 * D * t);
      ctx2.strokeStyle = colors[idx];
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      for (let px = 0; px < W2 - 40; px++) {
        const x = (px - (W2 - 60) / 2) / 50;
        const n = (1 / (Math.sqrt(4 * Math.PI * D * t))) * Math.exp(-x * x / (4 * D * t));
        const py = xAxis - n * (xAxis - 20) * 1.5;
        px === 0 ? ctx2.moveTo(px + 30, py) : ctx2.lineTo(px + 30, py);
      }
      ctx2.stroke();

      ctx2.fillStyle = colors[idx];
      ctx2.font = FONT_SM;
      ctx2.fillText('t=' + t, W2 - 60, 20 + idx * 16);
    });

    ctx2.fillStyle = COLORS.text;
    ctx2.font = FONT;
    ctx2.textAlign = 'center';
    ctx2.fillText('Diffusion: n(x,t) = (1/\u221A4\u03C0Dt) exp(-x\u00B2/4Dt), D = ' + D.toFixed(1), W2 / 2, 20);

    document.getElementById('diff-D-val')?.replaceChildren(document.createTextNode(D.toFixed(1)));
  }

  diffSlider?.addEventListener('input', drawDiffusion);
  drawDiffusion();
  }

  // ----- Stokes Drag & Terminal Velocity -----
  const cStokes = document.getElementById('vis-stokes');
  if (cStokes) {
    const {ctx: ctxS, W: WS, H: HS} = setupCanvas(cStokes);
    const etaSlider = document.getElementById('stokes-eta');
    const radiusSlider = document.getElementById('stokes-radius');
    const stokesStartBtn = document.getElementById('stokes-start');
    const stokesResetBtn = document.getElementById('stokes-reset');

    let ballY = 30, ballV = 0, running = false;
    const g = 200; // px/s^2 effective gravity
    const rho_ball = 3.0; // density ratio ball/fluid

    function getEta() { return parseFloat(etaSlider?.value || 1.5); }
    function getR() { return parseFloat(radiusSlider?.value || 1.0); }

    function terminalVel() {
      const eta = getEta(), R = getR();
      // v_t = 2R^2(rho_ball - rho_fluid)g / (9 eta) — simplified units
      return 2 * R * R * (rho_ball - 1) * g / (9 * eta);
    }

    function drawStokes() {
      clearCanvas(ctxS, WS, HS);
      const eta = getEta(), R = getR();
      const vt = terminalVel();
      const ballR = 8 + R * 6;

      // Draw fluid background
      ctxS.fillStyle = 'rgba(30,80,140,0.25)';
      ctxS.fillRect(40, 20, 200, HS - 40);

      // Draw ball
      const drawY = Math.min(ballY, HS - 30);
      ctxS.beginPath();
      ctxS.arc(140, drawY, ballR, 0, 2 * Math.PI);
      ctxS.fillStyle = COLORS.orange;
      ctxS.fill();
      ctxS.strokeStyle = 'rgba(255,255,255,0.4)';
      ctxS.lineWidth = 1;
      ctxS.stroke();

      // Force arrows on ball
      const arrowScale = 0.3;
      // Gravity (down)
      const Fg = rho_ball * R * R * R * g * arrowScale;
      ctxS.strokeStyle = COLORS.red; ctxS.lineWidth = 2;
      drawArrow(ctxS, 140, drawY, 140, drawY + Math.min(Fg, 80), 6);
      ctxS.fillStyle = COLORS.red; ctxS.font = FONT_SM;
      ctxS.textAlign = 'left';
      ctxS.fillText('Fg', 148, drawY + Math.min(Fg, 80) - 5);

      // Drag (up) — proportional to current velocity
      if (ballV > 0.5) {
        const Fd = 6 * Math.PI * eta * R * ballV * arrowScale * 0.15;
        ctxS.strokeStyle = COLORS.blue; ctxS.lineWidth = 2;
        drawArrow(ctxS, 140, drawY, 140, drawY - Math.min(Fd, 80), 6);
        ctxS.fillStyle = COLORS.blue;
        ctxS.fillText('Fdrag', 148, drawY - Math.min(Fd, 80) + 10);
      }

      // Right panel: velocity vs time plot
      const ox = 280, oy = 30, pw = WS - ox - 40, ph = HS - 80;
      drawAxes(ctxS, ox, oy, pw, ph, {xLabel: 'Time', yLabel: 'Velocity'});

      // Terminal velocity line
      const vtNorm = Math.min(vt / 300, 1);
      const vtY = oy + ph * (1 - vtNorm);
      ctxS.strokeStyle = COLORS.red; ctxS.lineWidth = 1;
      ctxS.setLineDash([5, 5]);
      ctxS.beginPath(); ctxS.moveTo(ox, vtY); ctxS.lineTo(ox + pw, vtY); ctxS.stroke();
      ctxS.setLineDash([]);
      ctxS.fillStyle = COLORS.red; ctxS.font = FONT_SM; ctxS.textAlign = 'left';
      ctxS.fillText('v_terminal = ' + vt.toFixed(1), ox + pw - 100, vtY - 5);

      // Velocity curve: v(t) = vt(1 - e^(-t/tau))
      const tau = (rho_ball * R * R) / (9 * eta) * 4; // relaxation time (scaled)
      ctxS.strokeStyle = COLORS.blue; ctxS.lineWidth = 2;
      ctxS.beginPath();
      const tMax = 5 * tau;
      for (let i = 0; i <= 200; i++) {
        const t = (i / 200) * tMax;
        const v = vt * (1 - Math.exp(-t / tau));
        const px = ox + (t / tMax) * pw;
        const py = oy + ph * (1 - Math.min(v / 300, 1));
        if (i === 0) ctxS.moveTo(px, py); else ctxS.lineTo(px, py);
      }
      ctxS.stroke();

      // Current velocity marker
      if (running && ballV > 0) {
        const elapsed = ballV / vt; // rough fraction
        const frac = Math.min(elapsed, 0.99);
        const tCur = -tau * Math.log(1 - frac);
        const px = ox + (tCur / tMax) * pw;
        const py = oy + ph * (1 - Math.min(ballV / 300, 1));
        ctxS.beginPath(); ctxS.arc(px, py, 4, 0, 2 * Math.PI);
        ctxS.fillStyle = COLORS.green; ctxS.fill();
      }

      // Labels
      ctxS.fillStyle = COLORS.text; ctxS.font = FONT_LG; ctxS.textAlign = 'left';
      ctxS.fillText('Stokes Drag & Terminal Velocity', ox + 5, oy - 10);

      document.getElementById('stokes-eta-val')?.replaceChildren(document.createTextNode(eta.toFixed(1)));
      document.getElementById('stokes-radius-val')?.replaceChildren(document.createTextNode(R.toFixed(1)));
    }

    function animateStokes() {
      if (!running) return;
      const eta = getEta(), R = getR();
      const vt = terminalVel();
      const dt = 0.016;
      const tau = (rho_ball * R * R) / (9 * eta) * 4;
      // dv/dt = g_eff - v/tau
      const g_eff = (rho_ball - 1) / rho_ball * g;
      ballV += (g_eff - ballV / tau) * dt * 3;
      if (ballV < 0) ballV = 0;
      ballY += ballV * dt;
      if (ballY > HS - 30) { ballY = HS - 30; ballV = vt; running = false; }
      drawStokes();
      if (running) activeAnimations['stokes'] = requestAnimationFrame(animateStokes);
    }

    stokesStartBtn?.addEventListener('click', () => {
      if (!running) { running = true; animateStokes(); }
    });
    stokesResetBtn?.addEventListener('click', () => {
      running = false;
      if (activeAnimations['stokes']) cancelAnimationFrame(activeAnimations['stokes']);
      ballY = 30; ballV = 0;
      drawStokes();
    });
    etaSlider?.addEventListener('input', drawStokes);
    radiusSlider?.addEventListener('input', drawStokes);
    drawStokes();
  }

  // ----- Brownian Motion Simulation -----
  const cBM = document.getElementById('vis-brownian');
  if (cBM) {
    const { ctx: ctxBM, W: WBM, H: HBM } = setupCanvas(cBM);
    let bmRunning = false;
    let gasParticles = [];
    let pollen = null;
    let bmTime = 0;
    let msdData = [];

    function getTemp() { return parseFloat(document.getElementById('bm-temp')?.value || 2); }
    function getPollenR() { return parseFloat(document.getElementById('bm-size')?.value || 14); }

    function initBrownian() {
      const T = getTemp();
      const pollenR = getPollenR();
      gasParticles = [];
      bmTime = 0;
      msdData = [];
      const nGas = 120;
      for (let i = 0; i < nGas; i++) {
        const speed = T * (0.3 + Math.random() * 1.4);
        const angle = Math.random() * 2 * Math.PI;
        gasParticles.push({
          x: 20 + Math.random() * (WBM - 40),
          y: 20 + Math.random() * (HBM - 40),
          vx: speed * Math.cos(angle),
          vy: speed * Math.sin(angle),
          r: 2
        });
      }
      pollen = {
        x: WBM / 2, y: HBM / 2,
        vx: 0, vy: 0,
        r: pollenR, mass: pollenR * pollenR,
        trail: [{ x: WBM / 2, y: HBM / 2 }],
        x0: WBM / 2, y0: HBM / 2
      };
    }

    function stepBrownian() {
      const T = getTemp();
      const gasMass = 1;

      // Move gas particles
      gasParticles.forEach(g => {
        g.x += g.vx;
        g.y += g.vy;
        if (g.x < g.r) { g.vx = Math.abs(g.vx); g.x = g.r; }
        if (g.x > WBM - g.r) { g.vx = -Math.abs(g.vx); g.x = WBM - g.r; }
        if (g.y < g.r) { g.vy = Math.abs(g.vy); g.y = g.r; }
        if (g.y > HBM - g.r) { g.vy = -Math.abs(g.vy); g.y = HBM - g.r; }
      });

      // Move pollen
      pollen.x += pollen.vx;
      pollen.y += pollen.vy;
      // Damping on pollen (viscous drag)
      pollen.vx *= 0.998;
      pollen.vy *= 0.998;
      if (pollen.x < pollen.r) { pollen.vx = Math.abs(pollen.vx); pollen.x = pollen.r; }
      if (pollen.x > WBM - pollen.r) { pollen.vx = -Math.abs(pollen.vx); pollen.x = WBM - pollen.r; }
      if (pollen.y < pollen.r) { pollen.vy = Math.abs(pollen.vy); pollen.y = pollen.r; }
      if (pollen.y > HBM - pollen.r) { pollen.vy = -Math.abs(pollen.vy); pollen.y = HBM - pollen.r; }

      // Gas-pollen collisions (elastic)
      gasParticles.forEach(g => {
        const dx = g.x - pollen.x;
        const dy = g.y - pollen.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = g.r + pollen.r;
        if (dist < minDist && dist > 0) {
          const nx = dx / dist, ny = dy / dist;
          // Relative velocity along collision normal
          const dvx = g.vx - pollen.vx;
          const dvy = g.vy - pollen.vy;
          const dvn = dvx * nx + dvy * ny;
          if (dvn < 0) { // approaching
            const mRatio = gasMass / pollen.mass;
            const impulse = 2 * dvn / (1 + mRatio);
            g.vx -= impulse * nx;
            g.vy -= impulse * ny;
            pollen.vx += impulse * mRatio * nx;
            pollen.vy += impulse * mRatio * ny;
          }
          // Separate
          const overlap = minDist - dist;
          g.x += nx * overlap * 0.8;
          g.y += ny * overlap * 0.8;
          pollen.x -= nx * overlap * 0.2;
          pollen.y -= ny * overlap * 0.2;
        }
      });

      bmTime++;
      if (bmTime % 3 === 0) {
        pollen.trail.push({ x: pollen.x, y: pollen.y });
        if (pollen.trail.length > 800) pollen.trail.shift();
      }
      if (bmTime % 10 === 0) {
        const dr2 = (pollen.x - pollen.x0) ** 2 + (pollen.y - pollen.y0) ** 2;
        msdData.push({ t: bmTime, r2: dr2 });
        if (msdData.length > 200) msdData.shift();
      }
    }

    function drawBrownian() {
      clearCanvas(ctxBM, WBM, HBM);

      // Box
      ctxBM.strokeStyle = COLORS.axis;
      ctxBM.lineWidth = 2;
      ctxBM.strokeRect(1, 1, WBM - 2, HBM - 2);

      // Gas particles
      ctxBM.fillStyle = 'rgba(79,195,247,0.5)';
      gasParticles.forEach(g => {
        ctxBM.beginPath();
        ctxBM.arc(g.x, g.y, g.r, 0, 2 * Math.PI);
        ctxBM.fill();
      });

      // Pollen trail
      if (pollen.trail.length > 1) {
        ctxBM.lineWidth = 1.5;
        for (let i = 1; i < pollen.trail.length; i++) {
          const alpha = 0.1 + 0.6 * (i / pollen.trail.length);
          ctxBM.strokeStyle = 'rgba(255,167,38,' + alpha + ')';
          ctxBM.beginPath();
          ctxBM.moveTo(pollen.trail[i - 1].x, pollen.trail[i - 1].y);
          ctxBM.lineTo(pollen.trail[i].x, pollen.trail[i].y);
          ctxBM.stroke();
        }
      }

      // Pollen grain
      ctxBM.beginPath();
      ctxBM.arc(pollen.x, pollen.y, pollen.r, 0, 2 * Math.PI);
      ctxBM.fillStyle = COLORS.yellow;
      ctxBM.globalAlpha = 0.85;
      ctxBM.fill();
      ctxBM.globalAlpha = 1;
      ctxBM.strokeStyle = 'rgba(255,255,255,0.6)';
      ctxBM.lineWidth = 1.5;
      ctxBM.stroke();

      // Origin marker
      ctxBM.strokeStyle = 'rgba(255,255,255,0.2)';
      ctxBM.lineWidth = 1;
      ctxBM.beginPath();
      ctxBM.arc(pollen.x0, pollen.y0, 4, 0, 2 * Math.PI);
      ctxBM.stroke();

      // MSD info
      if (msdData.length > 0) {
        const latest = msdData[msdData.length - 1];
        const rms = Math.sqrt(latest.r2);
        ctxBM.fillStyle = COLORS.text;
        ctxBM.font = FONT;
        ctxBM.textAlign = 'left';
        ctxBM.fillText('Time: ' + bmTime, 10, 20);
        ctxBM.fillText('RMS displacement: ' + rms.toFixed(1) + ' px', 10, 38);
        ctxBM.fillStyle = COLORS.orange;
        ctxBM.fillText('\u2014 Pollen trail', 10, 56);
      }
    }

    function animateBrownian() {
      if (!bmRunning) return;
      for (let i = 0; i < 2; i++) stepBrownian();
      drawBrownian();
      activeAnimations['brownian'] = requestAnimationFrame(animateBrownian);
    }

    document.getElementById('bm-start')?.addEventListener('click', function () {
      bmRunning = !bmRunning;
      this.textContent = bmRunning ? 'Pause' : 'Start';
      if (bmRunning) animateBrownian();
    });

    document.getElementById('bm-reset')?.addEventListener('click', () => {
      bmRunning = false;
      const btn = document.getElementById('bm-start');
      if (btn) btn.textContent = 'Start';
      if (activeAnimations['brownian']) cancelAnimationFrame(activeAnimations['brownian']);
      initBrownian();
      drawBrownian();
    });

    document.getElementById('bm-temp')?.addEventListener('input', function () {
      document.getElementById('bm-temp-val')?.replaceChildren(document.createTextNode(parseFloat(this.value).toFixed(1)));
    });

    document.getElementById('bm-size')?.addEventListener('input', function () {
      document.getElementById('bm-size-val')?.replaceChildren(document.createTextNode(this.value));
      if (!bmRunning) {
        pollen.r = parseFloat(this.value);
        pollen.mass = pollen.r * pollen.r;
        drawBrownian();
      }
    });

    initBrownian();
    drawBrownian();
  }
}


// =============================================================================
// CH3: Equilibrium - Double Pendulum / Chaos + Maxwell-Boltzmann
// =============================================================================
function initCh3Vis() {
  const c = document.getElementById('vis-chaos');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const L1 = 80, L2 = 80, m1 = 1, m2 = 1, g = 9.81;
  let pends = [];
  let showSecond = false;

  function initPendulums() {
    const offset = parseFloat(document.getElementById('chaos-offset')?.value || 0.01);
    pends = [
      { th1: Math.PI - 0.01, th2: Math.PI - 0.02, w1: 0, w2: 0, trail: [], color: COLORS.blue },
      { th1: Math.PI - 0.01 + offset, th2: Math.PI - 0.02, w1: 0, w2: 0, trail: [], color: COLORS.red }
    ];
  }

  function stepPend(p, dt) {
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
    clearCanvas(ctx, W, H);

    const ox = W / 2, oy = H * 0.5;
    const visible = showSecond ? pends : [pends[0]];

    visible.forEach(p => {
      const x1 = ox + L1 * Math.sin(p.th1);
      const y1 = oy + L1 * Math.cos(p.th1);
      const x2 = x1 + L2 * Math.sin(p.th2);
      const y2 = y1 + L2 * Math.cos(p.th2);

      p.trail.push({ x: x2, y: y2 });
      if (p.trail.length > 500) p.trail.shift();

      ctx.strokeStyle = p.color + '40';
      ctx.lineWidth = 1;
      ctx.beginPath();
      p.trail.forEach((pt, i) => {
        i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x1, y1, 6, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, 6, 0, 2 * Math.PI); ctx.fill();
    });

    // Pivot
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, 2 * Math.PI); ctx.fill();

    ctx.fillStyle = COLORS.text;
    ctx.font = FONT;
    ctx.textAlign = 'left';
    if (showSecond) {
      ctx.fillText('Two double pendulums with tiny initial difference', 10, 20);
      ctx.fillStyle = COLORS.blue; ctx.fillText('Pendulum 1', 10, 38);
      ctx.fillStyle = COLORS.red; ctx.fillText('Pendulum 2', 10, 54);
    } else {
      ctx.fillText('Double pendulum \u2014 chaotic motion', 10, 20);
    }
  }

  function animate() {
    if (!running) return;
    for (let i = 0; i < 5; i++) {
      pends.forEach(p => stepPend(p, 0.01));
    }
    draw();
    activeAnimations['chaos'] = requestAnimationFrame(animate);
  }

  document.getElementById('chaos-start')?.addEventListener('click', function () {
    running = !running;
    this.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  document.getElementById('chaos-reset')?.addEventListener('click', () => {
    running = false;
    const btn = document.getElementById('chaos-start');
    if (btn) btn.textContent = 'Start';
    initPendulums();
    draw();
  });

  document.getElementById('chaos-offset')?.addEventListener('input', function () {
    const d = document.getElementById('chaos-offset-val');
    if (d) d.textContent = parseFloat(this.value).toFixed(2);
  });

  document.getElementById('chaos-show-second')?.addEventListener('change', function () {
    showSecond = this.checked;
    initPendulums();
    draw();
  });

  initPendulums();
  draw();

  // ----- Maxwell-Boltzmann Speed Distribution -----
  const cMB = document.getElementById('vis-maxwell');
  if (cMB) {
  const mb = setupCanvas(cMB);
  const ctxMB = mb.ctx, WMB = mb.W, HMB = mb.H;
  const mbTempSlider = document.getElementById('mb-temp');

  function drawMaxwell() {
    const T = parseFloat(mbTempSlider?.value || 300);
    clearCanvas(ctxMB, WMB, HMB);

    const ox = 60, xAxis = HMB - 50;
    const plotW = WMB - ox - 30;

    // Constants for N2 (m = 28 amu)
    const kB = 1.380649e-23;
    const m = 28 * 1.66054e-27; // 28 amu in kg

    const vMax = 1500; // m/s range
    const vScale = plotW / vMax;

    // Compute f(v) = 4*pi*(m/(2*pi*kT))^(3/2) * v^2 * exp(-mv^2/(2kT))
    function fMB(v, Tk) {
      const a = m / (2 * kB * Tk);
      return 4 * Math.PI * Math.pow(a / Math.PI, 1.5) * v * v * Math.exp(-a * v * v);
    }

    // Draw for several temperatures
    const temps = [T * 0.5, T, T * 2];
    const tempColors = [COLORS.blue, COLORS.green, COLORS.red];
    const tempLineWidths = [1.5, 2.5, 1.5];

    let globalMax = 0;
    temps.forEach(Tk => {
      for (let px = 1; px < plotW; px++) {
        const v = px / vScale;
        const f = fMB(v, Tk);
        if (f > globalMax) globalMax = f;
      }
    });

    drawAxes(ctxMB, ox, 15, plotW, xAxis - 15, { xLabel: 'Speed v (m/s)', yLabel: 'f(v)' });

    const yScale = (xAxis - 30) / globalMax;

    temps.forEach((Tk, idx) => {
      ctxMB.strokeStyle = tempColors[idx];
      ctxMB.lineWidth = tempLineWidths[idx];
      ctxMB.beginPath();
      for (let px = 1; px < plotW; px++) {
        const v = px / vScale;
        const f = fMB(v, Tk);
        const py = xAxis - f * yScale;
        px === 1 ? ctxMB.moveTo(ox + px, py) : ctxMB.lineTo(ox + px, py);
      }
      ctxMB.stroke();

      ctxMB.fillStyle = tempColors[idx];
      ctxMB.font = FONT_SM;
      ctxMB.textAlign = 'left';
      ctxMB.fillText('T = ' + Tk.toFixed(0) + ' K', WMB - 150, 30 + idx * 16);
    });

    // Mark v_peak, v_avg, v_rms for current temperature T
    const vPeak = Math.sqrt(2 * kB * T / m);
    const vAvg = Math.sqrt(8 * kB * T / (Math.PI * m));
    const vRms = Math.sqrt(3 * kB * T / m);

    const markers = [
      { v: vPeak, label: 'v_peak', color: COLORS.yellow },
      { v: vAvg, label: 'v_avg', color: COLORS.orange },
      { v: vRms, label: 'v_rms', color: COLORS.purple },
    ];

    markers.forEach(mk => {
      const px = ox + mk.v * vScale;
      if (px < ox + plotW) {
        ctxMB.strokeStyle = mk.color;
        ctxMB.lineWidth = 1;
        ctxMB.setLineDash([4, 4]);
        ctxMB.beginPath(); ctxMB.moveTo(px, 15); ctxMB.lineTo(px, xAxis); ctxMB.stroke();
        ctxMB.setLineDash([]);
        ctxMB.fillStyle = mk.color;
        ctxMB.font = '10px Inter, system-ui, sans-serif';
        ctxMB.textAlign = 'center';
        ctxMB.fillText(mk.label, px, xAxis + 12);
      }
    });

    // Title
    ctxMB.fillStyle = COLORS.text;
    ctxMB.font = FONT;
    ctxMB.textAlign = 'left';
    ctxMB.fillText('Maxwell-Boltzmann speed distribution (N\u2082, m = 28 amu)', ox + 5, 28);

    // Speed axis ticks
    ctxMB.fillStyle = COLORS.textDim;
    ctxMB.font = '10px Inter, system-ui, sans-serif';
    ctxMB.textAlign = 'center';
    for (let v = 0; v <= vMax; v += 250) {
      const tx = ox + v * vScale;
      ctxMB.fillText(v.toString(), tx, xAxis + 24);
    }

    document.getElementById('mb-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(0)));
  }

  mbTempSlider?.addEventListener('input', drawMaxwell);
  drawMaxwell();
  }

  // ----- Hard Sphere Collision Geometry -----
  const cHS = document.getElementById('vis-hardsphere');
  if (cHS) {
    const hs = setupCanvas(cHS);
    const ctxHS = hs.ctx, WHS = hs.W, HHS = hs.H;
    const hsSlider = document.getElementById('hs-impact');

    function drawHardSphere() {
      const bRatio = parseFloat(hsSlider?.value || 0.5); // b/(2R)
      clearCanvas(ctxHS, WHS, HHS);

      const R = 40; // each sphere's radius
      const Tx = WHS / 2 + 30, Ty = HHS / 2 + 10; // target center
      const b = bRatio * 2 * R; // impact parameter (center-to-center perp distance)

      // φ = angle of line-of-centers from approach axis; sin(φ) = b/(2R)
      const phi = Math.asin(Math.min(bRatio, 0.9999));
      // Text's θ = 2φ, satisfying b/2 = R sin(θ/2)
      const theta = 2 * phi;
      // Actual deflection from forward = π − θ
      const deflection = Math.PI - theta;

      // --- Target sphere ---
      ctxHS.beginPath();
      ctxHS.arc(Tx, Ty, R, 0, 2 * Math.PI);
      ctxHS.fillStyle = 'rgba(79,195,247,0.1)';
      ctxHS.fill();
      ctxHS.strokeStyle = COLORS.blue;
      ctxHS.lineWidth = 2;
      ctxHS.stroke();
      ctxHS.beginPath(); ctxHS.arc(Tx, Ty, 3, 0, 2 * Math.PI);
      ctxHS.fillStyle = COLORS.blue; ctxHS.fill();

      // --- Projectile trajectory follows its CENTER ---
      // Approaches horizontally at y = Ty − b (above target in screen coords)
      const approachY = Ty - b;
      const startX = 20;

      // Projectile CENTER at moment of contact: 2R from target center
      // projX = Tx − 2R cos(φ),  projY = approachY = Ty − b
      const projX = Tx - 2 * R * Math.cos(phi);

      // Surface contact point (on target sphere, R from target center toward projectile)
      const surfX = Tx - R * Math.cos(phi);
      const surfY = Ty - R * Math.sin(phi);

      if (bRatio > 0.005) {
        // Dashed forward continuation (no-collision path)
        ctxHS.strokeStyle = COLORS.textDim; ctxHS.lineWidth = 1;
        ctxHS.setLineDash([4, 4]);
        ctxHS.beginPath();
        ctxHS.moveTo(projX, approachY);
        ctxHS.lineTo(WHS - 20, approachY);
        ctxHS.stroke();
        ctxHS.setLineDash([]);

        // --- Incoming arrow (horizontal → projectile center at contact) ---
        ctxHS.strokeStyle = COLORS.green; ctxHS.lineWidth = 2;
        drawArrow(ctxHS, startX, approachY, projX, approachY, 10);

        // --- Projectile sphere at contact (dashed outline) ---
        ctxHS.beginPath();
        ctxHS.arc(projX, approachY, R, 0, 2 * Math.PI);
        ctxHS.fillStyle = 'rgba(102,187,106,0.06)';
        ctxHS.fill();
        ctxHS.strokeStyle = COLORS.green; ctxHS.lineWidth = 1.5;
        ctxHS.setLineDash([4, 3]); ctxHS.stroke(); ctxHS.setLineDash([]);

        // --- Line of centers (target → projectile center at contact) ---
        ctxHS.strokeStyle = COLORS.textDim; ctxHS.lineWidth = 1;
        ctxHS.setLineDash([3, 3]);
        ctxHS.beginPath();
        ctxHS.moveTo(Tx, Ty);
        ctxHS.lineTo(projX, approachY);
        ctxHS.stroke();
        ctxHS.setLineDash([]);
        // Label "2R"
        const lx = (Tx + projX) / 2, ly = (Ty + approachY) / 2;
        ctxHS.fillStyle = COLORS.text; ctxHS.font = FONT_SM; ctxHS.textAlign = 'center';
        ctxHS.fillText('2R', lx + 12 * Math.sin(phi), ly - 12 * Math.cos(phi) + 3);

        // Surface contact marker
        ctxHS.beginPath(); ctxHS.arc(surfX, surfY, 3.5, 0, 2 * Math.PI);
        ctxHS.fillStyle = COLORS.orange; ctxHS.fill();

        // --- Outgoing arrow from projectile center at contact ---
        // Reflected velocity in screen coords: (-cos 2φ, -sin 2φ)
        const outDirX = -Math.cos(theta);
        const outDirY = -Math.sin(theta);
        const outLen = 130;
        const endX = projX + outLen * outDirX;
        const endY = approachY + outLen * outDirY;
        ctxHS.strokeStyle = COLORS.red; ctxHS.lineWidth = 2;
        drawArrow(ctxHS, projX, approachY, endX, endY, 10);

        // --- Deflection angle arc at the turning point ---
        const outAngle = Math.atan2(outDirY, outDirX);
        if (deflection > 0.05) {
          const arcR = 40;
          ctxHS.strokeStyle = COLORS.orange; ctxHS.lineWidth = 2;
          ctxHS.beginPath();
          ctxHS.arc(projX, approachY, arcR, outAngle, 0);
          ctxHS.stroke();
          const midA = outAngle / 2;
          ctxHS.fillStyle = COLORS.orange; ctxHS.font = FONT; ctxHS.textAlign = 'center';
          ctxHS.fillText('π−θ', projX + (arcR + 18) * Math.cos(midA),
                         approachY + (arcR + 18) * Math.sin(midA) + 4);
        }

        // --- φ arc at target center ---
        if (phi > 0.05) {
          const arcR3 = 50;
          ctxHS.strokeStyle = COLORS.yellow; ctxHS.lineWidth = 1.5;
          ctxHS.beginPath();
          const locAngle = Math.atan2(approachY - Ty, projX - Tx);
          ctxHS.arc(Tx, Ty, arcR3, Math.PI, locAngle, true);
          ctxHS.stroke();
          const phiMid = (Math.PI + locAngle) / 2;
          ctxHS.fillStyle = COLORS.yellow; ctxHS.font = FONT; ctxHS.textAlign = 'center';
          ctxHS.fillText('φ', Tx + (arcR3 + 14) * Math.cos(phiMid),
                         Ty + (arcR3 + 14) * Math.sin(phiMid) + 4);
        }
      } else {
        // Head-on: bounces straight back
        ctxHS.strokeStyle = COLORS.green; ctxHS.lineWidth = 2;
        drawArrow(ctxHS, startX, Ty, Tx - 2 * R, Ty, 10);
        ctxHS.strokeStyle = COLORS.red; ctxHS.lineWidth = 2;
        drawArrow(ctxHS, Tx - 2 * R, Ty, startX + 5, Ty - 4, 10);
      }

      // --- Impact parameter b bracket ---
      const dimX = 55;
      if (b > 3) {
        ctxHS.strokeStyle = COLORS.textDim; ctxHS.lineWidth = 1;
        ctxHS.setLineDash([3, 3]);
        ctxHS.beginPath(); ctxHS.moveTo(dimX - 5, Ty); ctxHS.lineTo(Tx, Ty); ctxHS.stroke();
        ctxHS.setLineDash([]);
        ctxHS.strokeStyle = COLORS.text; ctxHS.lineWidth = 1.5;
        ctxHS.beginPath(); ctxHS.moveTo(dimX, Ty); ctxHS.lineTo(dimX, approachY); ctxHS.stroke();
        ctxHS.beginPath(); ctxHS.moveTo(dimX - 4, Ty); ctxHS.lineTo(dimX + 4, Ty); ctxHS.stroke();
        ctxHS.beginPath(); ctxHS.moveTo(dimX - 4, approachY); ctxHS.lineTo(dimX + 4, approachY); ctxHS.stroke();
        ctxHS.fillStyle = COLORS.text; ctxHS.font = FONT; ctxHS.textAlign = 'left';
        ctxHS.fillText('b', dimX + 8, (Ty + approachY) / 2 + 5);
      }

      // --- Info readout ---
      ctxHS.fillStyle = COLORS.text; ctxHS.font = FONT; ctxHS.textAlign = 'right';
      ctxHS.fillText('b/(2R) = ' + bRatio.toFixed(2), WHS - 16, 24);
      ctxHS.fillText('θ = 2φ = ' + (theta * 180 / Math.PI).toFixed(1) + '°', WHS - 16, 44);
      ctxHS.fillText('deflection = ' + (deflection * 180 / Math.PI).toFixed(1) + '°', WHS - 16, 64);

      document.getElementById('hs-impact-val')?.replaceChildren(document.createTextNode(bRatio.toFixed(2)));
    }

    hsSlider?.addEventListener('input', drawHardSphere);
    drawHardSphere();
  }

  // ----- Ergodic vs Non-Ergodic Billiards -----
  const cBill = document.getElementById('vis-billiards');
  if (cBill) {
    const bl = setupCanvas(cBill);
    const ctxBL = bl.ctx, WBL = bl.W, HBL = bl.H;
    let billRunning = false;

    // Circle table (left half)
    const cxL = WBL / 4, cyL = HBL / 2, rL = HBL / 2 - 20;
    // Stadium table (right half) - rectangle with semicircles
    const cxR = 3 * WBL / 4, cyR = HBL / 2;
    const stadW = 100, stadH = HBL / 2 - 20;

    // Ball states
    let ballL = { x: cxL + 10, y: cyL - 20, vx: 2.5, vy: 1.8, trail: [] };
    let ballR = { x: cxR + 10, y: cyR - 20, vx: 2.5, vy: 1.8, trail: [] };

    function reflectCircle(ball, cx, cy, r) {
      const dx = ball.x - cx, dy = ball.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= r) {
        const nx = dx / dist, ny = dy / dist;
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;
        ball.x = cx + nx * (r - 1);
        ball.y = cy + ny * (r - 1);
      }
    }

    function reflectStadium(ball) {
      const left = cxR - stadW, right = cxR + stadW;
      const top = cyR - stadH, bottom = cyR + stadH;

      // Check semicircle ends
      const dxL = ball.x - left, dyL = ball.y - cyR;
      const distL = Math.sqrt(dxL * dxL + dyL * dyL);
      if (ball.x < left && distL >= stadH) {
        const nx = dxL / distL, ny = dyL / distL;
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;
        ball.x = left + nx * (stadH - 1);
        ball.y = cyR + ny * (stadH - 1);
        return;
      }
      const dxR = ball.x - right, dyR = ball.y - cyR;
      const distR = Math.sqrt(dxR * dxR + dyR * dyR);
      if (ball.x > right && distR >= stadH) {
        const nx = dxR / distR, ny = dyR / distR;
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;
        ball.x = right + nx * (stadH - 1);
        ball.y = cyR + ny * (stadH - 1);
        return;
      }
      // Flat walls
      if (ball.y < top) { ball.vy = Math.abs(ball.vy); ball.y = top + 1; }
      if (ball.y > bottom) { ball.vy = -Math.abs(ball.vy); ball.y = bottom - 1; }
    }

    function drawBilliards() {
      clearCanvas(ctxBL, WBL, HBL);

      // Draw circle table
      ctxBL.strokeStyle = COLORS.blue;
      ctxBL.lineWidth = 2;
      ctxBL.beginPath();
      ctxBL.arc(cxL, cyL, rL, 0, 2 * Math.PI);
      ctxBL.stroke();

      // Draw stadium table
      ctxBL.strokeStyle = COLORS.green;
      ctxBL.lineWidth = 2;
      ctxBL.beginPath();
      ctxBL.moveTo(cxR - stadW, cyR - stadH);
      ctxBL.lineTo(cxR + stadW, cyR - stadH);
      ctxBL.arc(cxR + stadW, cyR, stadH, -Math.PI / 2, Math.PI / 2);
      ctxBL.lineTo(cxR - stadW, cyR + stadH);
      ctxBL.arc(cxR - stadW, cyR, stadH, Math.PI / 2, -Math.PI / 2);
      ctxBL.stroke();

      // Draw trails
      ctxBL.lineWidth = 0.5;
      ctxBL.strokeStyle = 'rgba(79,195,247,0.3)';
      ctxBL.beginPath();
      ballL.trail.forEach((p, i) => i === 0 ? ctxBL.moveTo(p.x, p.y) : ctxBL.lineTo(p.x, p.y));
      ctxBL.stroke();

      ctxBL.strokeStyle = 'rgba(102,187,106,0.3)';
      ctxBL.beginPath();
      ballR.trail.forEach((p, i) => i === 0 ? ctxBL.moveTo(p.x, p.y) : ctxBL.lineTo(p.x, p.y));
      ctxBL.stroke();

      // Draw balls
      ctxBL.fillStyle = COLORS.blue;
      ctxBL.beginPath();
      ctxBL.arc(ballL.x, ballL.y, 3, 0, 2 * Math.PI);
      ctxBL.fill();

      ctxBL.fillStyle = COLORS.green;
      ctxBL.beginPath();
      ctxBL.arc(ballR.x, ballR.y, 3, 0, 2 * Math.PI);
      ctxBL.fill();

      // Labels
      ctxBL.fillStyle = COLORS.text;
      ctxBL.font = FONT;
      ctxBL.textAlign = 'center';
      ctxBL.fillText('Circle (non-ergodic)', cxL, 16);
      ctxBL.fillText('Stadium (ergodic)', cxR, 16);
    }

    function stepBilliards() {
      const speed = 3;
      for (let i = 0; i < 3; i++) {
        ballL.x += ballL.vx; ballL.y += ballL.vy;
        ballR.x += ballR.vx; ballR.y += ballR.vy;
        reflectCircle(ballL, cxL, cyL, rL);
        reflectStadium(ballR);
      }
      ballL.trail.push({ x: ballL.x, y: ballL.y });
      ballR.trail.push({ x: ballR.x, y: ballR.y });
      if (ballL.trail.length > 2000) ballL.trail.shift();
      if (ballR.trail.length > 2000) ballR.trail.shift();
    }

    function animateBilliards() {
      if (!billRunning) return;
      stepBilliards();
      drawBilliards();
      activeAnimations['billiards'] = requestAnimationFrame(animateBilliards);
    }

    document.getElementById('billiards-start')?.addEventListener('click', () => {
      billRunning = !billRunning;
      const btn = document.getElementById('billiards-start');
      if (btn) btn.textContent = billRunning ? 'Pause' : 'Start';
      if (billRunning) animateBilliards();
    });

    document.getElementById('billiards-reset')?.addEventListener('click', () => {
      billRunning = false;
      const btn = document.getElementById('billiards-start');
      if (btn) btn.textContent = 'Start';
      ballL = { x: cxL + 10, y: cyL - 20, vx: 2.5, vy: 1.8, trail: [] };
      ballR = { x: cxR + 10, y: cyR - 20, vx: 2.5, vy: 1.8, trail: [] };
      drawBilliards();
    });

    drawBilliards();
  }

  // ----- Figure 2: Correlated Outgoing Velocities -----
  // Left panel: animated hard-sphere collision with random impact parameter.
  // Right panel: scatter plot of (|v1'|, |v2'|) accumulating on a curve.
  const cCorr = document.getElementById('vis-correlated-vel');
  if (cCorr) {
    const {ctx: ctxC, W: WC, H: HC} = setupCanvas(cCorr);
    const goBtn = document.getElementById('corr-go');
    const clearBtn = document.getElementById('corr-clear');
    const countDisp = document.getElementById('corr-count');

    const m1 = 3, m2 = 1;
    const v1i = 3.0; // incoming speed of m1
    const R1 = 14, R2 = 9; // ball radii (pixels)
    const divX = WC * 0.48; // divider between panels
    const aScale = 20; // arrow length scale
    let scatterPts = []; // accumulated {v1f, v2f}
    let animState = null; // null or {phase, t, b, sol, ...}
    let corrAnimId = null;
    let corrRunning = false; // machine-gun mode toggle

    // 2D hard-sphere elastic collision given impact parameter b.
    // Ball 1 moves along +x with speed v1i; ball 2 is stationary.
    // b = vertical offset of ball 2 center from ball 1's trajectory line.
    // Returns outgoing velocity components and magnitudes.
    function solveHardSphere(b) {
      const bMax = R1 + R2;
      const bClamped = Math.max(-bMax + 0.01, Math.min(bMax - 0.01, b));
      // Normal direction: from ball 1 center to ball 2 center at contact
      // At contact, ball 2 center is at (x_contact, b) relative to ball 1
      const sinN = bClamped / bMax; // sin of angle of normal from x-axis
      const cosN = Math.sqrt(1 - sinN * sinN);
      const nx = cosN, ny = sinN; // unit normal pointing from m1 to m2

      // Relative velocity along normal
      const vRel_n = v1i * nx; // only m1 has velocity, along x
      // Impulse magnitude for elastic collision
      const j = 2 * m1 * m2 * vRel_n / (m1 + m2);

      // Outgoing velocities
      const v1fx = v1i - (j / m1) * nx;
      const v1fy = -(j / m1) * ny;
      const v2fx = (j / m2) * nx;
      const v2fy = (j / m2) * ny;

      const v1f = Math.sqrt(v1fx * v1fx + v1fy * v1fy);
      const v2f = Math.sqrt(v2fx * v2fx + v2fy * v2fy);
      const theta1 = Math.atan2(v1fy, v1fx);
      const theta2 = Math.atan2(v2fy, v2fx);
      return { v1f, v2f, v1fx, v1fy, v2fx, v2fy, theta1, theta2 };
    }

    // Compute theoretical curve for scatter plot (sweep over all impact parameters)
    function theoryCurve() {
      const bMax = R1 + R2;
      const pts = [];
      for (let i = -100; i <= 100; i++) {
        const b = (i / 100) * (bMax - 0.01);
        const s = solveHardSphere(b);
        pts.push({ v1f: s.v1f, v2f: s.v2f });
      }
      return pts;
    }

    function drawCorrFig() {
      clearCanvas(ctxC, WC, HC);
      const cy = HC * 0.5;
      const collCx = divX * 0.5; // collision center x

      // Divider line
      ctxC.strokeStyle = COLORS.grid; ctxC.lineWidth = 1;
      ctxC.beginPath(); ctxC.moveTo(divX, 10); ctxC.lineTo(divX, HC - 10); ctxC.stroke();

      // --- LEFT PANEL: collision animation ---
      if (animState) {
        const { phase, t, b, sol } = animState;
        const bMax = R1 + R2;
        // Contact point: where ball 1 center is when balls touch
        const contactX = collCx;
        const contactBallY = cy; // ball 1 travels along cy
        // Ball 2 is at (contactX + R1+R2 * cosN, cy + b)... but let's simplify:
        // Place the collision at collCx. Ball 2 sits at (collCx + sqrt((R1+R2)^2 - b^2), cy + b) ... no.
        // Actually: ball 1 moves along y = cy. Ball 2 is at (cx2, cy + b).
        // They collide when distance = R1+R2. Ball 1 center at contact: x1 = cx2 - sqrt((R1+R2)^2 - b^2).
        // Let's place collision center at collCx. Ball 1 contact pos: collCx - cosN*(R1+R2)/2
        // Ball 2 fixed pos: collCx + cosN*(R1+R2)/2, cy + b
        const sinN = b / bMax;
        const cosN = Math.sqrt(1 - sinN * sinN);
        const b1ContactX = collCx - cosN * (R1 + R2) / 2;
        const b2X = collCx + cosN * (R1 + R2) / 2;
        const b2Y = cy + b;

        if (phase === 'incoming') {
          // Ball 2 stationary
          ctxC.fillStyle = COLORS.cyan; ctxC.globalAlpha = 0.3;
          ctxC.beginPath(); ctxC.arc(b2X, b2Y, R2, 0, 2 * Math.PI); ctxC.fill();
          ctxC.globalAlpha = 1;
          ctxC.strokeStyle = COLORS.cyan; ctxC.lineWidth = 1.5;
          ctxC.beginPath(); ctxC.arc(b2X, b2Y, R2, 0, 2 * Math.PI); ctxC.stroke();

          // Ball 1 approaching
          const startX = collCx - 130;
          const curX = startX + (b1ContactX - startX) * t;
          ctxC.fillStyle = COLORS.orange; ctxC.globalAlpha = 0.3;
          ctxC.beginPath(); ctxC.arc(curX, cy, R1, 0, 2 * Math.PI); ctxC.fill();
          ctxC.globalAlpha = 1;
          ctxC.strokeStyle = COLORS.orange; ctxC.lineWidth = 1.5;
          ctxC.beginPath(); ctxC.arc(curX, cy, R1, 0, 2 * Math.PI); ctxC.stroke();

          // Incoming velocity arrow on ball 1
          ctxC.strokeStyle = COLORS.orange; ctxC.lineWidth = 2;
          drawArrow(ctxC, curX + R1 + 4, cy, curX + R1 + 4 + v1i * aScale * 0.6, cy, 7);

          // Labels
          ctxC.fillStyle = '#fff'; ctxC.font = FONT_SM; ctxC.textAlign = 'center';
          ctxC.fillText('m₁', curX, cy + 4);
          ctxC.fillText('m₂', b2X, b2Y + 4);

          // Impact parameter indicator
          ctxC.setLineDash([3, 3]);
          ctxC.strokeStyle = COLORS.textDim; ctxC.lineWidth = 1;
          ctxC.beginPath(); ctxC.moveTo(b2X - 40, cy); ctxC.lineTo(b2X + 30, cy); ctxC.stroke();
          ctxC.beginPath(); ctxC.moveTo(b2X - 40, b2Y); ctxC.lineTo(b2X + 30, b2Y); ctxC.stroke();
          ctxC.setLineDash([]);
          if (Math.abs(b) > 3) {
            ctxC.strokeStyle = COLORS.yellow; ctxC.lineWidth = 1;
            ctxC.beginPath(); ctxC.moveTo(b2X + 25, cy); ctxC.lineTo(b2X + 25, b2Y); ctxC.stroke();
            ctxC.fillStyle = COLORS.yellow; ctxC.font = FONT_SM; ctxC.textAlign = 'left';
            ctxC.fillText('b', b2X + 29, cy + b / 2 + 4);
          }
        }
        else if (phase === 'outgoing') {
          // Show collision point
          ctxC.fillStyle = 'rgba(255,255,255,0.08)';
          ctxC.beginPath(); ctxC.arc(collCx, cy, 4, 0, 2 * Math.PI); ctxC.fill();

          // Outgoing ball 1
          const b1x = b1ContactX + sol.v1fx * aScale * 2.5 * t;
          const b1y = cy + sol.v1fy * aScale * 2.5 * t;
          ctxC.fillStyle = COLORS.orange; ctxC.globalAlpha = 0.3;
          ctxC.beginPath(); ctxC.arc(b1x, b1y, R1, 0, 2 * Math.PI); ctxC.fill();
          ctxC.globalAlpha = 1;
          ctxC.strokeStyle = COLORS.orange; ctxC.lineWidth = 1.5;
          ctxC.beginPath(); ctxC.arc(b1x, b1y, R1, 0, 2 * Math.PI); ctxC.stroke();

          // Outgoing ball 2
          const b2ox = b2X + sol.v2fx * aScale * 2.5 * t;
          const b2oy = b2Y + sol.v2fy * aScale * 2.5 * t;
          ctxC.fillStyle = COLORS.cyan; ctxC.globalAlpha = 0.3;
          ctxC.beginPath(); ctxC.arc(b2ox, b2oy, R2, 0, 2 * Math.PI); ctxC.fill();
          ctxC.globalAlpha = 1;
          ctxC.strokeStyle = COLORS.cyan; ctxC.lineWidth = 1.5;
          ctxC.beginPath(); ctxC.arc(b2ox, b2oy, R2, 0, 2 * Math.PI); ctxC.stroke();

          // Labels
          ctxC.fillStyle = '#fff'; ctxC.font = FONT_SM; ctxC.textAlign = 'center';
          ctxC.fillText('m₁', b1x, b1y + 4);
          ctxC.fillText('m₂', b2ox, b2oy + 4);

          // Velocity arrows from collision center (persistent)
          ctxC.strokeStyle = COLORS.orange; ctxC.lineWidth = 2.5;
          drawArrow(ctxC, collCx, cy, collCx + sol.v1fx * aScale, cy + sol.v1fy * aScale, 8);
          ctxC.strokeStyle = COLORS.cyan; ctxC.lineWidth = 2.5;
          drawArrow(ctxC, collCx, cy, collCx + sol.v2fx * aScale, cy + sol.v2fy * aScale, 8);

          // Arrow labels
          ctxC.fillStyle = COLORS.orange; ctxC.font = FONT_SM; ctxC.textAlign = 'left';
          ctxC.fillText("v⃗₁'", collCx + sol.v1fx * aScale + 4, cy + sol.v1fy * aScale - 5);
          ctxC.fillStyle = COLORS.cyan;
          ctxC.fillText("v⃗₂'", collCx + sol.v2fx * aScale + 4, cy + sol.v2fy * aScale + 14);
        }
        else if (phase === 'done' || phase === 'pause') {
          // Show final state with velocity arrows at collision center
          ctxC.fillStyle = 'rgba(255,255,255,0.08)';
          ctxC.beginPath(); ctxC.arc(collCx, cy, 4, 0, 2 * Math.PI); ctxC.fill();

          // Velocity arrows from collision center
          ctxC.strokeStyle = COLORS.orange; ctxC.lineWidth = 2.5;
          drawArrow(ctxC, collCx, cy, collCx + sol.v1fx * aScale, cy + sol.v1fy * aScale, 8);
          ctxC.strokeStyle = COLORS.cyan; ctxC.lineWidth = 2.5;
          drawArrow(ctxC, collCx, cy, collCx + sol.v2fx * aScale, cy + sol.v2fy * aScale, 8);

          // Arrow labels
          ctxC.fillStyle = COLORS.orange; ctxC.font = FONT_SM; ctxC.textAlign = 'left';
          ctxC.fillText("v⃗₁'", collCx + sol.v1fx * aScale + 4, cy + sol.v1fy * aScale - 5);
          ctxC.fillStyle = COLORS.cyan;
          ctxC.fillText("v⃗₂'", collCx + sol.v2fx * aScale + 4, cy + sol.v2fy * aScale + 14);

          // Speed labels
          ctxC.fillStyle = COLORS.text; ctxC.font = '10px Inter, system-ui, sans-serif'; ctxC.textAlign = 'center';
          ctxC.fillText("|v₁'|=" + sol.v1f.toFixed(1), collCx, HC - 12);
          ctxC.fillText("|v₂'|=" + sol.v2f.toFixed(1), collCx + 70, HC - 12);
        }
      } else {
        // Initial state: show balls at rest with instructions
        ctxC.fillStyle = COLORS.textDim; ctxC.font = FONT; ctxC.textAlign = 'center';
        ctxC.fillText('Click "Go" to start', divX * 0.5, HC * 0.5 + 4);
      }

      // Left panel label
      ctxC.fillStyle = COLORS.textDim; ctxC.font = FONT_SM; ctxC.textAlign = 'center';
      ctxC.fillText('Collision', divX * 0.5, 16);

      // --- RIGHT PANEL: scatter plot ---
      const px = divX + 30, py = 30, pw = WC - divX - 55, ph = HC - 65;

      // Axes
      ctxC.strokeStyle = COLORS.axis; ctxC.lineWidth = 1.5;
      ctxC.beginPath(); ctxC.moveTo(px, py); ctxC.lineTo(px, py + ph); ctxC.lineTo(px + pw, py + ph); ctxC.stroke();

      // Axis labels
      ctxC.fillStyle = COLORS.textDim; ctxC.font = FONT_SM; ctxC.textAlign = 'center';
      ctxC.fillText("|v₁'|", px + pw / 2, py + ph + 18);
      ctxC.save(); ctxC.translate(px - 16, py + ph / 2); ctxC.rotate(-Math.PI / 2);
      ctxC.fillText("|v₂'|", 0, 0); ctxC.restore();

      // Scale
      const v1max = v1i * 1.05;
      const v2max = v1i * 2 * m1 / (m1 + m2) * 1.05;

      // Draw the theoretical curve (faint)
      const curve = theoryCurve();
      ctxC.strokeStyle = COLORS.green + '25'; ctxC.lineWidth = 1.5;
      ctxC.beginPath();
      for (let i = 0; i < curve.length; i++) {
        const sx = px + (curve[i].v1f / v1max) * pw;
        const sy = py + ph - (curve[i].v2f / v2max) * ph;
        if (i === 0) ctxC.moveTo(sx, sy); else ctxC.lineTo(sx, sy);
      }
      ctxC.stroke();

      // Tick marks
      ctxC.fillStyle = COLORS.textDim; ctxC.font = '10px Inter, system-ui, sans-serif';
      ctxC.textAlign = 'center';
      for (let v = 0; v <= v1max; v += 1) {
        const tx = px + (v / v1max) * pw;
        ctxC.beginPath(); ctxC.moveTo(tx, py + ph); ctxC.lineTo(tx, py + ph + 4); ctxC.strokeStyle = COLORS.axis; ctxC.stroke();
        ctxC.fillText(v.toFixed(0), tx, py + ph + 13);
      }
      ctxC.textAlign = 'right';
      for (let v = 0; v <= v2max; v += 1) {
        const ty = py + ph - (v / v2max) * ph;
        ctxC.beginPath(); ctxC.moveTo(px, ty); ctxC.lineTo(px - 4, ty); ctxC.strokeStyle = COLORS.axis; ctxC.stroke();
        ctxC.fillText(v.toFixed(0), px - 6, ty + 4);
      }

      // Plot accumulated scatter points
      for (let i = 0; i < scatterPts.length; i++) {
        const pt = scatterPts[i];
        const sx = px + (pt.v1f / v1max) * pw;
        const sy = py + ph - (pt.v2f / v2max) * ph;
        const isCurrent = (i === scatterPts.length - 1);
        ctxC.fillStyle = isCurrent ? COLORS.green : COLORS.green + '90';
        ctxC.beginPath(); ctxC.arc(sx, sy, isCurrent ? 5 : 3.5, 0, 2 * Math.PI); ctxC.fill();
        if (isCurrent) {
          ctxC.strokeStyle = '#fff'; ctxC.lineWidth = 1.5;
          ctxC.beginPath(); ctxC.arc(sx, sy, 5, 0, 2 * Math.PI); ctxC.stroke();
        }
      }

      // Panel label
      ctxC.fillStyle = COLORS.text; ctxC.font = FONT_SM; ctxC.textAlign = 'center';
      ctxC.fillText('|v₁\'| vs |v₂\'|', px + pw / 2, 16);
      if (scatterPts.length > 3) {
        ctxC.fillStyle = COLORS.green; ctxC.font = FONT_SM;
        ctxC.fillText('All on one curve → perfect correlation', px + pw / 2, py - 2);
      }
    }

    function startNextCollision() {
      const bMax = R1 + R2;
      const b = (Math.random() - 0.5) * 2 * (bMax - 1);
      const sol = solveHardSphere(b);
      animState = { phase: 'incoming', t: 0, b, sol };
      return sol;
    }

    function corrTick() {
      if (!corrRunning) return;
      const inDuration = 28; // frames — fast enough for machine-gun feel
      const outDuration = 22;
      const pauseFrames = 8; // brief pause between shots

      if (!animState) startNextCollision();

      if (animState.phase === 'incoming') {
        animState.t += 1 / inDuration;
        if (animState.t >= 1) {
          animState.t = 1;
          animState.phase = 'outgoing';
          animState.t = 0;
        }
      } else if (animState.phase === 'outgoing') {
        animState.t += 1 / outDuration;
        if (animState.t >= 1) {
          animState.t = 1;
          // Record the scatter point
          scatterPts.push({ v1f: animState.sol.v1f, v2f: animState.sol.v2f });
          if (countDisp) countDisp.textContent = scatterPts.length + ' collision' + (scatterPts.length !== 1 ? 's' : '');
          animState.phase = 'pause';
          animState.t = 0;
        }
      } else if (animState.phase === 'pause') {
        animState.t += 1 / pauseFrames;
        if (animState.t >= 1) {
          // Fire next collision
          startNextCollision();
        }
      }

      drawCorrFig();
      corrAnimId = requestAnimationFrame(corrTick);
    }

    goBtn?.addEventListener('click', () => {
      corrRunning = !corrRunning;
      if (corrRunning) {
        goBtn.textContent = '⏸ Stop';
        corrAnimId = requestAnimationFrame(corrTick);
      } else {
        goBtn.textContent = '▶ Go';
        if (corrAnimId) { cancelAnimationFrame(corrAnimId); corrAnimId = null; }
      }
    });

    clearBtn?.addEventListener('click', () => {
      corrRunning = false;
      if (goBtn) goBtn.textContent = '▶ Go';
      if (corrAnimId) { cancelAnimationFrame(corrAnimId); corrAnimId = null; }
      scatterPts = [];
      animState = null;
      if (countDisp) countDisp.textContent = '0 collisions';
      drawCorrFig();
    });

    drawCorrFig();
  }

  // ----- Figure 3: Reversible Billiard Trajectories -----
  // Two balls bounce among frozen obstacles. Runs forever forward,
  // records history so reverse retraces the exact path.
  const cRev = document.getElementById('vis-reversible-billiards');
  if (cRev) {
    const {ctx: ctxR, W: WR, H: HR} = setupCanvas(cRev);
    const playBtn = document.getElementById('rev-play');
    const revBtn = document.getElementById('rev-reverse');
    const pauseBtn = document.getElementById('rev-pause');
    const resetRevBtn = document.getElementById('rev-reset');
    const revInfo = document.getElementById('rev-info');
    const speedSlider = document.getElementById('rev-speed');
    const speedVal = document.getElementById('rev-speed-val');

    const pad = 5;
    const ballR = 7;

    const frozenObs = [
      { x: WR * 0.25, y: HR * 0.30, r: 20 },
      { x: WR * 0.55, y: HR * 0.22, r: 16 },
      { x: WR * 0.75, y: HR * 0.35, r: 18 },
      { x: WR * 0.40, y: HR * 0.55, r: 22 },
      { x: WR * 0.65, y: HR * 0.60, r: 15 },
      { x: WR * 0.20, y: HR * 0.70, r: 17 },
      { x: WR * 0.80, y: HR * 0.72, r: 19 },
      { x: WR * 0.50, y: HR * 0.82, r: 14 },
      { x: WR * 0.12, y: HR * 0.48, r: 13 },
      { x: WR * 0.88, y: HR * 0.50, r: 14 },
    ];

    // Live state for on-the-fly computation
    let liveBalls = null; // {b1:{x,y,vx,vy}, b2:{x,y,vx,vy}}
    let history = []; // [{b1:{x,y}, b2:{x,y}}]
    let curFrame = 0;
    let direction = 0; // 1=forward, -1=reverse, 0=paused

    function stepBalls(b1, b2) {
      for (const ball of [b1, b2]) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        if (ball.x < pad + ballR) { ball.x = 2 * (pad + ballR) - ball.x; ball.vx = -ball.vx; }
        if (ball.x > WR - pad - ballR) { ball.x = 2 * (WR - pad - ballR) - ball.x; ball.vx = -ball.vx; }
        if (ball.y < pad + ballR) { ball.y = 2 * (pad + ballR) - ball.y; ball.vy = -ball.vy; }
        if (ball.y > HR - pad - ballR) { ball.y = 2 * (HR - pad - ballR) - ball.y; ball.vy = -ball.vy; }
        for (const ob of frozenObs) {
          const dx = ball.x - ob.x, dy = ball.y - ob.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minD = ob.r + ballR;
          if (dist < minD) {
            const nx = dx / dist, ny = dy / dist;
            const vn = ball.vx * nx + ball.vy * ny;
            if (vn < 0) { ball.vx -= 2 * vn * nx; ball.vy -= 2 * vn * ny; }
            ball.x = ob.x + (minD + 1) * nx;
            ball.y = ob.y + (minD + 1) * ny;
          }
        }
      }
      const dx = b2.x - b1.x, dy = b2.y - b1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2 * ballR) {
        const nx = dx / dist, ny = dy / dist;
        const v1n = b1.vx * nx + b1.vy * ny;
        const v2n = b2.vx * nx + b2.vy * ny;
        b1.vx += (v2n - v1n) * nx; b1.vy += (v2n - v1n) * ny;
        b2.vx += (v1n - v2n) * nx; b2.vy += (v1n - v2n) * ny;
        const overlap = 2 * ballR - dist;
        b1.x -= overlap / 2 * nx; b1.y -= overlap / 2 * ny;
        b2.x += overlap / 2 * nx; b2.y += overlap / 2 * ny;
      }
    }

    function computeUpTo(targetFrame) {
      // Extend history on-the-fly as needed
      while (history.length - 1 < targetFrame) {
        stepBalls(liveBalls.b1, liveBalls.b2);
        history.push({ b1: {x: liveBalls.b1.x, y: liveBalls.b1.y}, b2: {x: liveBalls.b2.x, y: liveBalls.b2.y} });
      }
    }

    function initRevBilliards() {
      liveBalls = {
        b1: { x: WR * 0.15, y: HR * 0.45, vx: 1.1, vy: 0.6 },
        b2: { x: WR * 0.85, y: HR * 0.55, vx: -0.9, vy: -0.7 }
      };
      history = [{ b1: {x: liveBalls.b1.x, y: liveBalls.b1.y}, b2: {x: liveBalls.b2.x, y: liveBalls.b2.y} }];
      curFrame = 0;
      direction = 0;
    }

    function drawRevFrame() {
      clearCanvas(ctxR, WR, HR);

      ctxR.strokeStyle = COLORS.axis; ctxR.lineWidth = 2;
      ctxR.strokeRect(pad, pad, WR - 2 * pad, HR - 2 * pad);

      for (const ob of frozenObs) {
        ctxR.fillStyle = 'rgba(255,255,255,0.06)';
        ctxR.beginPath(); ctxR.arc(ob.x, ob.y, ob.r, 0, 2 * Math.PI); ctxR.fill();
        ctxR.strokeStyle = 'rgba(255,255,255,0.18)'; ctxR.lineWidth = 1;
        ctxR.beginPath(); ctxR.arc(ob.x, ob.y, ob.r, 0, 2 * Math.PI); ctxR.stroke();
      }

      // Persistent trails (frame 0 to curFrame)
      if (curFrame > 0) {
        for (let bi = 0; bi < 2; bi++) {
          const key = bi === 0 ? 'b1' : 'b2';
          const color = bi === 0 ? COLORS.blue : COLORS.red;
          ctxR.strokeStyle = color + '70';
          ctxR.lineWidth = 1.2;
          ctxR.beginPath();
          ctxR.moveTo(history[0][key].x, history[0][key].y);
          for (let f = 1; f <= curFrame; f++) {
            ctxR.lineTo(history[f][key].x, history[f][key].y);
          }
          ctxR.stroke();
        }
      }

      const frame = history[curFrame];
      ctxR.fillStyle = COLORS.blue;
      ctxR.beginPath(); ctxR.arc(frame.b1.x, frame.b1.y, ballR, 0, 2 * Math.PI); ctxR.fill();
      ctxR.strokeStyle = '#fff'; ctxR.lineWidth = 1;
      ctxR.beginPath(); ctxR.arc(frame.b1.x, frame.b1.y, ballR, 0, 2 * Math.PI); ctxR.stroke();

      ctxR.fillStyle = COLORS.red;
      ctxR.beginPath(); ctxR.arc(frame.b2.x, frame.b2.y, ballR, 0, 2 * Math.PI); ctxR.fill();
      ctxR.strokeStyle = '#fff'; ctxR.lineWidth = 1;
      ctxR.beginPath(); ctxR.arc(frame.b2.x, frame.b2.y, ballR, 0, 2 * Math.PI); ctxR.stroke();

      ctxR.fillStyle = direction > 0 ? COLORS.green : direction < 0 ? COLORS.orange : COLORS.textDim;
      ctxR.font = FONT; ctxR.textAlign = 'left';
      const label = direction > 0 ? '▶ Forward' : direction < 0 ? '◀ Reverse' : 'Paused';
      ctxR.fillText(label, 10, 20);

      if (revInfo) revInfo.textContent = 't = ' + curFrame;
    }

    function animateRev() {
      if (direction === 0) return;
      const speed = parseInt(speedSlider?.value || 2);
      const newFrame = curFrame + direction * speed;
      if (newFrame <= 0) { curFrame = 0; direction = 0; drawRevFrame(); return; }
      if (direction > 0) {
        // Compute new frames on the fly
        computeUpTo(newFrame);
      }
      // For reverse, history already exists
      curFrame = Math.min(newFrame, history.length - 1);
      drawRevFrame();
      if (direction !== 0) activeAnimations['rev-billiards'] = requestAnimationFrame(animateRev);
    }

    playBtn?.addEventListener('click', () => {
      direction = 1;
      animateRev();
    });
    revBtn?.addEventListener('click', () => {
      direction = -1;
      animateRev();
    });
    pauseBtn?.addEventListener('click', () => {
      direction = 0;
      if (activeAnimations['rev-billiards']) {
        cancelAnimationFrame(activeAnimations['rev-billiards']);
        delete activeAnimations['rev-billiards'];
      }
      drawRevFrame();
    });
    resetRevBtn?.addEventListener('click', () => {
      direction = 0;
      if (activeAnimations['rev-billiards']) {
        cancelAnimationFrame(activeAnimations['rev-billiards']);
        delete activeAnimations['rev-billiards'];
      }
      initRevBilliards();
      drawRevFrame();
    });

    speedSlider?.addEventListener('input', function() {
      if (speedVal) speedVal.textContent = this.value;
    });

    initRevBilliards();
    drawRevFrame();
  }

  // ----- Phase Space Coarse-Graining -----
  const cPC = document.getElementById('vis-phase-coarse');
  if (cPC) {
    const {ctx: ctxPC, W: WPC, H: HPC} = setupCanvas(cPC);
    const evolveBtn = document.getElementById('coarse-evolve');
    const grainBtn = document.getElementById('coarse-grain');
    const resetBtnPC = document.getElementById('coarse-reset');
    const infoDisplay = document.getElementById('coarse-info');

    // Phase space box
    const bx = 50, by = 30, bw = WPC - 80, bh = HPC - 70;

    // Fixed circular obstacles for chaotic scattering
    const obstacles = [
      { x: bx + bw * 0.35, y: by + bh * 0.30, r: 18 },
      { x: bx + bw * 0.65, y: by + bh * 0.25, r: 15 },
      { x: bx + bw * 0.50, y: by + bh * 0.60, r: 20 },
      { x: bx + bw * 0.25, y: by + bh * 0.70, r: 16 },
      { x: bx + bw * 0.75, y: by + bh * 0.70, r: 17 },
      { x: bx + bw * 0.15, y: by + bh * 0.40, r: 14 },
      { x: bx + bw * 0.85, y: by + bh * 0.45, r: 14 },
    ];

    const clusterRadius = 22;
    let clusters = []; // { cx, cy, dots: [{x,y}], ghost: false }
    let ghostClusters = []; // old clusters shown faded after evolve
    let step = 0;
    let canEvolve = true;
    let canGrain = false;

    function initCoarse() {
      step = 0;
      canEvolve = true;
      canGrain = false;
      ghostClusters = [];
      const startX = bx + bw * 0.18, startY = by + bh * 0.45;
      const dots = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + 0.3;
        const r = 6 + Math.random() * 8;
        dots.push({ x: startX + r * Math.cos(angle), y: startY + r * Math.sin(angle) });
      }
      clusters = [{ cx: startX, cy: startY, dots }];
      updateInfo();
      drawCoarse();
    }

    function updateInfo() {
      if (infoDisplay) infoDisplay.textContent = 'Step ' + step + ' | ' + clusters.length + ' circle' + (clusters.length !== 1 ? 's' : '');
      if (evolveBtn) evolveBtn.disabled = !canEvolve;
      if (grainBtn) grainBtn.disabled = !canGrain;
    }

    function drawCoarse() {
      clearCanvas(ctxPC, WPC, HPC);

      // Phase space box
      ctxPC.strokeStyle = COLORS.axis; ctxPC.lineWidth = 2;
      ctxPC.strokeRect(bx, by, bw, bh);

      // Axis labels
      ctxPC.fillStyle = COLORS.textDim; ctxPC.font = FONT_SM; ctxPC.textAlign = 'center';
      ctxPC.fillText('q (position)', bx + bw / 2, by + bh + 22);
      ctxPC.save(); ctxPC.translate(bx - 20, by + bh / 2); ctxPC.rotate(-Math.PI / 2);
      ctxPC.fillText('p (momentum)', 0, 0); ctxPC.restore();

      // Obstacles
      for (const ob of obstacles) {
        ctxPC.fillStyle = 'rgba(255,255,255,0.07)';
        ctxPC.beginPath(); ctxPC.arc(ob.x, ob.y, ob.r, 0, 2 * Math.PI); ctxPC.fill();
        ctxPC.strokeStyle = 'rgba(255,255,255,0.15)'; ctxPC.lineWidth = 1;
        ctxPC.beginPath(); ctxPC.arc(ob.x, ob.y, ob.r, 0, 2 * Math.PI); ctxPC.stroke();
      }

      // Ghost clusters (from before evolve)
      for (const gc of ghostClusters) {
        ctxPC.setLineDash([4, 4]);
        ctxPC.strokeStyle = 'rgba(79,195,247,0.2)'; ctxPC.lineWidth = 1;
        ctxPC.beginPath(); ctxPC.arc(gc.cx, gc.cy, clusterRadius, 0, 2 * Math.PI); ctxPC.stroke();
        ctxPC.setLineDash([]);
      }

      // Active clusters
      for (const cl of clusters) {
        ctxPC.fillStyle = 'rgba(79,195,247,0.08)';
        ctxPC.beginPath(); ctxPC.arc(cl.cx, cl.cy, clusterRadius, 0, 2 * Math.PI); ctxPC.fill();
        ctxPC.strokeStyle = 'rgba(79,195,247,0.5)'; ctxPC.lineWidth = 1.5;
        ctxPC.beginPath(); ctxPC.arc(cl.cx, cl.cy, clusterRadius, 0, 2 * Math.PI); ctxPC.stroke();

        // Dots inside
        for (const d of cl.dots) {
          ctxPC.fillStyle = COLORS.blue;
          ctxPC.beginPath(); ctxPC.arc(d.x, d.y, 3, 0, 2 * Math.PI); ctxPC.fill();
        }
      }

      // Scattered dots (after evolve, before coarse-grain)
      if (!canEvolve && canGrain) {
        // dots are stored on clusters but scattered — draw them all
        // (already drawn above, they're just outside their circles now)
      }

      // Entropy info
      ctxPC.fillStyle = COLORS.green; ctxPC.font = FONT; ctxPC.textAlign = 'right';
      ctxPC.fillText('S ~ ln(' + clusters.length + ')', bx + bw - 5, by - 6);
    }

    // Evolve: animate dots with billiard dynamics and trails
    let evolving = false;
    let evolveDots = []; // {x, y, vx, vy, trail: [{x,y}]}
    const dotColors = [COLORS.blue, COLORS.cyan, COLORS.green, COLORS.orange, COLORS.red,
                       COLORS.purple, COLORS.yellow, COLORS.pink];

    function drawEvolveFrame() {
      clearCanvas(ctxPC, WPC, HPC);

      // Phase space box
      ctxPC.strokeStyle = COLORS.axis; ctxPC.lineWidth = 2;
      ctxPC.strokeRect(bx, by, bw, bh);
      ctxPC.fillStyle = COLORS.textDim; ctxPC.font = FONT_SM; ctxPC.textAlign = 'center';
      ctxPC.fillText('q (position)', bx + bw / 2, by + bh + 22);
      ctxPC.save(); ctxPC.translate(bx - 20, by + bh / 2); ctxPC.rotate(-Math.PI / 2);
      ctxPC.fillText('p (momentum)', 0, 0); ctxPC.restore();

      // Obstacles
      for (const ob of obstacles) {
        ctxPC.fillStyle = 'rgba(255,255,255,0.07)';
        ctxPC.beginPath(); ctxPC.arc(ob.x, ob.y, ob.r, 0, 2 * Math.PI); ctxPC.fill();
        ctxPC.strokeStyle = 'rgba(255,255,255,0.15)'; ctxPC.lineWidth = 1;
        ctxPC.beginPath(); ctxPC.arc(ob.x, ob.y, ob.r, 0, 2 * Math.PI); ctxPC.stroke();
      }

      // Ghost circles (original cluster positions)
      for (const gc of ghostClusters) {
        ctxPC.setLineDash([4, 4]);
        ctxPC.strokeStyle = 'rgba(79,195,247,0.2)'; ctxPC.lineWidth = 1;
        ctxPC.beginPath(); ctxPC.arc(gc.cx, gc.cy, clusterRadius, 0, 2 * Math.PI); ctxPC.stroke();
        ctxPC.setLineDash([]);
      }

      // Trails and dots
      for (let i = 0; i < evolveDots.length; i++) {
        const d = evolveDots[i];
        const color = dotColors[i % dotColors.length];
        // Draw trail
        if (d.trail.length > 1) {
          ctxPC.lineWidth = 1;
          for (let t = 1; t < d.trail.length; t++) {
            const alpha = 0.1 + 0.4 * (t / d.trail.length);
            ctxPC.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
            ctxPC.beginPath();
            ctxPC.moveTo(d.trail[t - 1].x, d.trail[t - 1].y);
            ctxPC.lineTo(d.trail[t].x, d.trail[t].y);
            ctxPC.stroke();
          }
        }
        // Draw dot
        ctxPC.fillStyle = color;
        ctxPC.beginPath(); ctxPC.arc(d.x, d.y, 3.5, 0, 2 * Math.PI); ctxPC.fill();
      }

      // Status text
      if (evolving) {
        ctxPC.fillStyle = COLORS.orange; ctxPC.font = FONT; ctxPC.textAlign = 'right';
        ctxPC.fillText('evolving...', bx + bw - 5, by - 6);
      } else if (!canEvolve && canGrain) {
        ctxPC.fillStyle = COLORS.orange; ctxPC.font = FONT; ctxPC.textAlign = 'right';
        ctxPC.fillText('dots scattered — click Coarse Grain', bx + bw - 5, by - 6);
      }
    }

    function stepBilliard(dot) {
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (dot.x < bx + 3) { dot.x = 2 * (bx + 3) - dot.x; dot.vx = -dot.vx; }
      if (dot.x > bx + bw - 3) { dot.x = 2 * (bx + bw - 3) - dot.x; dot.vx = -dot.vx; }
      if (dot.y < by + 3) { dot.y = 2 * (by + 3) - dot.y; dot.vy = -dot.vy; }
      if (dot.y > by + bh - 3) { dot.y = 2 * (by + bh - 3) - dot.y; dot.vy = -dot.vy; }
      for (const ob of obstacles) {
        const odx = dot.x - ob.x, ody = dot.y - ob.y;
        const dist = Math.sqrt(odx * odx + ody * ody);
        if (dist < ob.r + 3) {
          const nx = odx / dist, ny = ody / dist;
          const vn = dot.vx * nx + dot.vy * ny;
          if (vn < 0) {
            dot.vx -= 2 * vn * nx;
            dot.vy -= 2 * vn * ny;
            dot.x = ob.x + (ob.r + 4) * nx;
            dot.y = ob.y + (ob.r + 4) * ny;
          }
        }
      }
    }

    evolveBtn?.addEventListener('click', () => {
      if (!canEvolve || evolving) return;
      step++;
      canEvolve = false;
      canGrain = false;
      evolving = true;
      updateInfo();

      // Save current clusters as ghosts
      ghostClusters = clusters.map(c => ({ cx: c.cx, cy: c.cy }));

      // Collect all dots with velocities and empty trails
      evolveDots = [];
      for (const cl of clusters) {
        for (const d of cl.dots) {
          const dx = d.x - cl.cx, dy = d.y - cl.cy;
          const baseAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
          const speed = 2.0 + Math.random() * 1.0;
          evolveDots.push({
            x: d.x, y: d.y,
            vx: speed * Math.cos(baseAngle),
            vy: speed * Math.sin(baseAngle),
            trail: [{ x: d.x, y: d.y }]
          });
        }
      }

      let frame = 0;
      const totalFrames = 180;
      const stepsPerFrame = 2;

      function animateEvolve() {
        if (frame >= totalFrames) {
          evolving = false;
          canGrain = true;
          clusters = evolveDots.map(d => ({
            cx: d.x, cy: d.y,
            dots: [{ x: d.x, y: d.y }]
          }));
          updateInfo();
          drawEvolveFrame();
          return;
        }
        for (let s = 0; s < stepsPerFrame; s++) {
          for (const dot of evolveDots) {
            stepBilliard(dot);
            if (frame % 2 === 0) {
              dot.trail.push({ x: dot.x, y: dot.y });
              if (dot.trail.length > 120) dot.trail.shift();
            }
          }
        }
        frame++;
        drawEvolveFrame();
        activeAnimations['coarse-evolve'] = requestAnimationFrame(animateEvolve);
      }
      animateEvolve();
    });

    // Coarse Grain: draw circle around each dot, spawn new dots inside
    grainBtn?.addEventListener('click', () => {
      if (!canGrain) return;
      canEvolve = true;
      canGrain = false;
      ghostClusters = [];

      // Each scattered dot gets a circle with new dots inside
      const newClusters = [];
      // Cap growth: reduce dots per cluster as count grows
      const totalDots = clusters.length;
      let dotsPerCluster = 5;
      if (totalDots > 20) dotsPerCluster = 4;
      if (totalDots > 60) dotsPerCluster = 3;
      if (totalDots > 150) dotsPerCluster = 2;

      for (const cl of clusters) {
        const cx = cl.cx, cy = cl.cy;
        const dots = [];
        for (let i = 0; i < dotsPerCluster; i++) {
          const a = (i / dotsPerCluster) * Math.PI * 2 + Math.random() * 0.5;
          const r = 4 + Math.random() * (clusterRadius - 6);
          let dx = cx + r * Math.cos(a);
          let dy = cy + r * Math.sin(a);
          // Clamp inside box
          dx = Math.max(bx + 5, Math.min(bx + bw - 5, dx));
          dy = Math.max(by + 5, Math.min(by + bh - 5, dy));
          dots.push({ x: dx, y: dy });
        }
        newClusters.push({ cx, cy, dots });
      }
      clusters = newClusters;

      updateInfo();
      drawCoarse();
    });

    resetBtnPC?.addEventListener('click', () => {
      if (activeAnimations['coarse-evolve']) {
        cancelAnimationFrame(activeAnimations['coarse-evolve']);
        delete activeAnimations['coarse-evolve'];
      }
      evolving = false;
      evolveDots = [];
      initCoarse();
    });

    initCoarse();
  }

  // ----- Chaos — Exponential Divergence -----
  const cChaos = document.getElementById('vis-chaos-balls');
  if (cChaos) {
    const { ctx: ctxC, W: WC, H: HC } = setupCanvas(cChaos);
    const perturbSlider = document.getElementById('cb-perturb');
    const angleSlider = document.getElementById('cb-angle');
    const launchBtn = document.getElementById('cb-launch');
    const resetBtn = document.getElementById('cb-reset');
    const SR = 22; // scatterer radius
    const PR = 4;  // particle radius
    const speed = 4;

    // Cannon position
    const cannonX = 45, cannonY = HC / 2;
    const cannonLen = 32, cannonW = 10;

    // Place scatterers in staggered rows
    const scatterers = [];
    const cols = [180, 300, 420, 540, 660];
    const rows = [70, 170, 270, 370];
    for (let r = 0; r < rows.length; r++) {
      for (let ci = 0; ci < cols.length; ci++) {
        const offset = (r % 2 === 1) ? 60 : 0;
        const x = cols[ci] + offset;
        if (x > 80 && x < WC - 20 && rows[r] > 20 && rows[r] < HC - 20)
          scatterers.push({ x, y: rows[r] });
      }
    }

    let particles = null;
    let running = false;

    function resetSim() {
      running = false;
      if (activeAnimations['chaos-balls']) {
        cancelAnimationFrame(activeAnimations['chaos-balls']);
        delete activeAnimations['chaos-balls'];
      }
      particles = null;
      drawScene();
    }

    function launchParticles() {
      const db = parseFloat(perturbSlider?.value || 0.5);
      const angleDeg = parseFloat(angleSlider?.value || 0);
      const angle = angleDeg * Math.PI / 180;
      document.getElementById('cb-perturb-val')?.replaceChildren(document.createTextNode(db.toFixed(1)));
      document.getElementById('cb-angle-val')?.replaceChildren(document.createTextNode(angleDeg));
      // Two particles fired from cannon muzzle with tiny perpendicular offset
      const muzzleX = cannonX + cannonLen * Math.cos(angle);
      const muzzleY = cannonY + cannonLen * Math.sin(angle);
      // Perpendicular to firing direction
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      particles = [
        { x: muzzleX + perpX * db / 2, y: muzzleY + perpY * db / 2,
          vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
          trail: [], collisions: 0, alive: true },
        { x: muzzleX - perpX * db / 2, y: muzzleY - perpY * db / 2,
          vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
          trail: [], collisions: 0, alive: true }
      ];
      particles[0].trail.push({ x: particles[0].x, y: particles[0].y });
      particles[1].trail.push({ x: particles[1].x, y: particles[1].y });
      running = true;
      animateChaoBalls();
    }

    function stepParticle(p) {
      if (!p.alive) return;
      p.x += p.vx;
      p.y += p.vy;
      // Wall bounces
      if (p.y < PR) { p.y = PR; p.vy = -p.vy; }
      if (p.y > HC - PR) { p.y = HC - PR; p.vy = -p.vy; }
      if (p.x < PR) { p.x = PR; p.vx = -p.vx; }
      // Scatterer collisions
      for (const s of scatterers) {
        const dx = p.x - s.x, dy = p.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = SR + PR;
        if (dist < minDist && dist > 0) {
          const nx = dx / dist, ny = dy / dist;
          const dot = p.vx * nx + p.vy * ny;
          if (dot < 0) {
            p.vx -= 2 * dot * nx;
            p.vy -= 2 * dot * ny;
            p.x = s.x + nx * minDist;
            p.y = s.y + ny * minDist;
            p.collisions++;
          }
        }
      }
      if (p.x > WC + 10) p.alive = false;
      p.trail.push({ x: p.x, y: p.y });
    }

    function drawCannon(angle) {
      ctxC.save();
      ctxC.translate(cannonX, cannonY);
      ctxC.rotate(angle);
      // Barrel
      ctxC.fillStyle = '#555';
      ctxC.fillRect(0, -cannonW / 2, cannonLen, cannonW);
      ctxC.strokeStyle = '#333';
      ctxC.lineWidth = 1.5;
      ctxC.strokeRect(0, -cannonW / 2, cannonLen, cannonW);
      // Muzzle flare shape
      ctxC.fillStyle = '#444';
      ctxC.beginPath();
      ctxC.moveTo(cannonLen, -cannonW / 2 - 3);
      ctxC.lineTo(cannonLen + 6, -cannonW / 2 - 3);
      ctxC.lineTo(cannonLen + 6, cannonW / 2 + 3);
      ctxC.lineTo(cannonLen, cannonW / 2 + 3);
      ctxC.fill();
      ctxC.restore();
      // Base wheel
      ctxC.beginPath();
      ctxC.arc(cannonX, cannonY, 12, 0, 2 * Math.PI);
      ctxC.fillStyle = '#666';
      ctxC.fill();
      ctxC.strokeStyle = '#444';
      ctxC.lineWidth = 2;
      ctxC.stroke();
      // Hub
      ctxC.beginPath();
      ctxC.arc(cannonX, cannonY, 4, 0, 2 * Math.PI);
      ctxC.fillStyle = '#888';
      ctxC.fill();
    }

    function drawScene() {
      clearCanvas(ctxC, WC, HC);
      const angleDeg = parseFloat(angleSlider?.value || 0);
      const angle = angleDeg * Math.PI / 180;
      document.getElementById('cb-angle-val')?.replaceChildren(document.createTextNode(angleDeg));
      const db = parseFloat(perturbSlider?.value || 0.5);
      document.getElementById('cb-perturb-val')?.replaceChildren(document.createTextNode(db.toFixed(1)));

      // Draw scatterers
      for (const s of scatterers) {
        ctxC.beginPath();
        ctxC.arc(s.x, s.y, SR, 0, 2 * Math.PI);
        ctxC.fillStyle = 'rgba(100, 120, 140, 0.2)';
        ctxC.fill();
        ctxC.strokeStyle = 'rgba(100, 120, 140, 0.5)';
        ctxC.lineWidth = 1.5;
        ctxC.stroke();
      }

      // Draw cannon
      drawCannon(angle);

      if (!particles) {
        // Show firing direction hint
        const hintLen = 60;
        ctxC.setLineDash([4, 4]);
        ctxC.strokeStyle = COLORS.textDim;
        ctxC.lineWidth = 1;
        ctxC.beginPath();
        ctxC.moveTo(cannonX + cannonLen * Math.cos(angle), cannonY + cannonLen * Math.sin(angle));
        ctxC.lineTo(cannonX + (cannonLen + hintLen) * Math.cos(angle),
                     cannonY + (cannonLen + hintLen) * Math.sin(angle));
        ctxC.stroke();
        ctxC.setLineDash([]);

        ctxC.fillStyle = COLORS.text; ctxC.font = FONT; ctxC.textAlign = 'center';
        ctxC.fillText('Aim the cannon and press Fire!', WC / 2, HC - 12);
        return;
      }

      const colors = [COLORS.blue, COLORS.red];
      const dashes = [[], [6, 4]];

      // Draw trails
      for (let i = 0; i < 2; i++) {
        const p = particles[i];
        if (p.trail.length < 2) continue;
        ctxC.strokeStyle = colors[i];
        ctxC.lineWidth = 2;
        ctxC.setLineDash(dashes[i]);
        ctxC.beginPath();
        ctxC.moveTo(p.trail[0].x, p.trail[0].y);
        for (let j = 1; j < p.trail.length; j++) {
          ctxC.lineTo(p.trail[j].x, p.trail[j].y);
        }
        ctxC.stroke();
        ctxC.setLineDash([]);
      }

      // Draw particles
      for (let i = 0; i < 2; i++) {
        const p = particles[i];
        if (!p.alive) continue;
        ctxC.beginPath();
        ctxC.arc(p.x, p.y, PR + 2, 0, 2 * Math.PI);
        ctxC.fillStyle = colors[i];
        ctxC.fill();
      }

      // Stats
      const maxCol = Math.max(particles[0].collisions, particles[1].collisions);
      ctxC.fillStyle = COLORS.text; ctxC.font = FONT; ctxC.textAlign = 'left';
      ctxC.fillText('Collisions: ' + maxCol, 12, 22);

      const t0 = particles[0].trail, t1 = particles[1].trail;
      const len = Math.min(t0.length, t1.length);
      if (len > 1) {
        const dx = t0[len - 1].x - t1[len - 1].x;
        const dy = t0[len - 1].y - t1[len - 1].y;
        const sep = Math.sqrt(dx * dx + dy * dy);
        const amp = sep / db;
        ctxC.fillText('Separation: ' + sep.toFixed(1) + ' px', 12, 42);
        if (amp > 2) {
          ctxC.fillStyle = COLORS.orange;
          ctxC.fillText('Amplification: ' + String.fromCharCode(215) + amp.toFixed(0), 12, 62);
        }
      }

      // Legend
      ctxC.font = FONT_SM; ctxC.textAlign = 'right';
      ctxC.fillStyle = COLORS.blue;
      ctxC.fillRect(WC - 110, 10, 16, 3);
      ctxC.fillText('Particle A', WC - 8, 16);
      ctxC.strokeStyle = COLORS.red; ctxC.lineWidth = 2;
      ctxC.setLineDash([5, 3]);
      ctxC.beginPath(); ctxC.moveTo(WC - 110, 28); ctxC.lineTo(WC - 94, 28); ctxC.stroke();
      ctxC.setLineDash([]);
      ctxC.fillStyle = COLORS.red;
      ctxC.fillText('Particle B', WC - 8, 32);
    }

    function animateChaoBalls() {
      if (!running || !particles) return;
      const anyAlive = particles.some(p => p.alive);
      if (!anyAlive) { running = false; drawScene(); return; }
      for (let sub = 0; sub < 2; sub++) {
        for (const p of particles) stepParticle(p);
      }
      drawScene();
      activeAnimations['chaos-balls'] = requestAnimationFrame(animateChaoBalls);
    }

    angleSlider?.addEventListener('input', () => { if (!running) { particles = null; drawScene(); } });
    perturbSlider?.addEventListener('input', () => { if (!running) { particles = null; drawScene(); } });
    launchBtn?.addEventListener('click', () => { resetSim(); setTimeout(launchParticles, 50); });
    resetBtn?.addEventListener('click', resetSim);
    drawScene();
  }

  // ----- State Counting on a Circle -----
  const cState = document.getElementById('vis-state-counting');
  if (cState) {
    const { ctx: ctxS, W: WS, H: HS } = setupCanvas(cState);
    const radiusSlider = document.getElementById('state-radius');
    const dpSlider = document.getElementById('state-dp');

    function drawStateCounting() {
      clearCanvas(ctxS, WS, HS);
      const R = parseFloat(radiusSlider?.value || 100);
      const dp = parseFloat(dpSlider?.value || 20);
      document.getElementById('state-radius-val')?.replaceChildren(document.createTextNode(R));
      document.getElementById('state-dp-val')?.replaceChildren(document.createTextNode(dp));

      const cx = WS / 2, cy = HS / 2 + 10;

      // Draw grid
      const gridRange = 200;
      ctxS.strokeStyle = COLORS.grid; ctxS.lineWidth = 1;
      for (let x = cx - gridRange; x <= cx + gridRange; x += dp) {
        ctxS.beginPath(); ctxS.moveTo(x, cy - gridRange); ctxS.lineTo(x, cy + gridRange); ctxS.stroke();
      }
      for (let y = cy - gridRange; y <= cy + gridRange; y += dp) {
        ctxS.beginPath(); ctxS.moveTo(cx - gridRange, y); ctxS.lineTo(cx + gridRange, y); ctxS.stroke();
      }

      // Highlight cells the circle passes through
      let omega = 0;
      ctxS.fillStyle = 'rgba(79, 195, 247, 0.15)';
      for (let gx = cx - gridRange; gx < cx + gridRange; gx += dp) {
        for (let gy = cy - gridRange; gy < cy + gridRange; gy += dp) {
          // Check if this cell intersects the circle
          const cellCx = gx + dp / 2, cellCy = gy + dp / 2;
          const dx = cellCx - cx, dy = cellCy - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Cell intersects circle if circle passes through it
          const halfDiag = dp * 0.707;
          if (dist - halfDiag < R && dist + halfDiag > R) {
            ctxS.fillRect(gx, gy, dp, dp);
            omega++;
          }
        }
      }

      // Draw axes
      ctxS.strokeStyle = COLORS.axis; ctxS.lineWidth = 1;
      ctxS.beginPath(); ctxS.moveTo(cx - gridRange, cy); ctxS.lineTo(cx + gridRange, cy); ctxS.stroke();
      ctxS.beginPath(); ctxS.moveTo(cx, cy - gridRange); ctxS.lineTo(cx, cy + gridRange); ctxS.stroke();

      // Draw circle
      ctxS.strokeStyle = COLORS.blue; ctxS.lineWidth = 2.5;
      ctxS.beginPath(); ctxS.arc(cx, cy, R, 0, 2 * Math.PI); ctxS.stroke();

      // Labels
      ctxS.fillStyle = COLORS.text; ctxS.font = FONT; ctxS.textAlign = 'center';
      ctxS.fillText('p₁', cx + gridRange - 10, cy - 8);
      ctxS.fillText('p₂', cx + 12, cy - gridRange + 10);

      // Radius annotation
      ctxS.strokeStyle = COLORS.orange; ctxS.lineWidth = 1.5;
      ctxS.beginPath(); ctxS.moveTo(cx, cy); ctxS.lineTo(cx + R * 0.707, cy - R * 0.707); ctxS.stroke();
      ctxS.fillStyle = COLORS.orange; ctxS.font = FONT_SM; ctxS.textAlign = 'left';
      ctxS.fillText('R = √(2mE)', cx + R * 0.35 + 5, cy - R * 0.35 - 5);

      // Ω count
      ctxS.fillStyle = COLORS.green; ctxS.font = FONT_LG; ctxS.textAlign = 'left';
      ctxS.fillText('Ω = ' + omega + ' cells', 10, 25);
      ctxS.fillStyle = COLORS.textDim; ctxS.font = FONT_SM;
      ctxS.fillText('(boxes the circle passes through)', 10, 42);

      // Δp annotation
      ctxS.fillStyle = COLORS.textDim; ctxS.font = FONT_SM; ctxS.textAlign = 'center';
      ctxS.fillText('Δp', cx - gridRange + dp / 2, cy + gridRange - 5);
    }

    radiusSlider?.addEventListener('input', drawStateCounting);
    dpSlider?.addEventListener('input', drawStateCounting);
    drawStateCounting();
  }
}


// =============================================================================
// CH4: Temperature & Equipartition
// =============================================================================
function initCh4Vis() {
  const c = document.getElementById('vis-equipartition');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

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
        x: 50 + Math.random() * (W - 100),
        y: 50 + Math.random() * (H - 100),
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
      if (p.x < p.r || p.x > W - p.r) { p.vx *= -1; p.x = Math.max(p.r, Math.min(W - p.r, p.x)); }
      if (p.y < p.r || p.y > H - p.r) { p.vy *= -1; p.y = Math.max(p.r, Math.min(H - p.r, p.y)); }
    });
  }

  function draw() {
    clearCanvas(ctx, W, H);

    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    const speeds = particles.map(p => Math.sqrt(p.vx ** 2 + p.vy ** 2));
    const maxSpeed = Math.max(...speeds) * 1.2;

    particles.forEach((p, i) => {
      const frac = speeds[i] / maxSpeed;
      const r = Math.round(239 * frac + 79 * (1 - frac));
      const g = Math.round(83 * frac + 195 * (1 - frac));
      const b = Math.round(80 * frac + 247 * (1 - frac));
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fill();
    });

    let totalKE = 0;
    particles.forEach(p => { totalKE += 0.5 * (p.vx ** 2 + p.vy ** 2); });
    const avgKE = totalKE / particles.length;

    ctx.fillStyle = COLORS.text;
    ctx.font = FONT;
    ctx.textAlign = 'left';
    const T = parseFloat(tempSlider?.value || 300);
    ctx.fillText('T = ' + T + ' K', 10, 20);
    ctx.fillText('\u27E8KE\u27E9 = ' + avgKE.toFixed(2) + ' (\u221D kT)', 10, 38);
    ctx.fillText('Color: blue = slow, red = fast', 10, 56);

    document.getElementById('ep-temp-val')?.replaceChildren(document.createTextNode(T.toString()));
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

  document.getElementById('ep-start')?.addEventListener('click', function () {
    running = !running;
    this.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  initParticles();
  draw();

  // ----- Heat Capacity of H2 vs Temperature -----
  const cHC = document.getElementById('vis-heatcap');
  if (cHC) {
  const hc = setupCanvas(cHC);
  const ctxHC = hc.ctx, WHC = hc.W, HHC = hc.H;

  function drawHeatCap() {
    clearCanvas(ctxHC, WHC, HHC);

    const ox = 65, xAxis = HHC - 50;
    const plotW = WHC - ox - 30;
    const plotH = xAxis - 25;

    // Temperature range: 10 K to 10000 K (log scale)
    const logTmin = 1, logTmax = 4; // log10(T)
    const cvMax = 4.5; // Cv/NkB max displayed

    drawAxes(ctxHC, ox, 15, plotW, xAxis - 15, { xLabel: 'Temperature T (K)', yLabel: 'C_V / Nk_B' });

    // Characteristic temperatures for H2
    const thetaRot = 85;    // K
    const thetaVib = 6300;  // K

    // Einstein model for rotation (approximate; 2 rotational DoF for diatomic)
    // C_rot/NkB = 2 * (theta/2T)^2 * exp(theta/2T) / (exp(theta/2T) - 1)^2
    // Actually for rotation of H2, use the single-mode form per DoF
    // Each quadratic DoF contributes: (u^2 e^u)/(e^u - 1)^2 where u = theta/T
    function einsteinCV(theta, T) {
      const u = theta / T;
      if (u > 50) return 0;
      if (u < 0.001) return 1;
      const eu = Math.exp(u);
      return (u * u * eu) / ((eu - 1) * (eu - 1));
    }

    // Draw the quantum curve
    // Translation: always 3/2 (3 translational DoF)
    // Rotation: 2 rotational DoF, each contributing einsteinCV(thetaRot, T)
    // Vibration: 2 vibrational DoF (1 KE + 1 PE), each contributing einsteinCV(thetaVib, T)
    const nPts = 500;
    const cvVals = [];
    for (let i = 0; i < nPts; i++) {
      const logT = logTmin + (logTmax - logTmin) * i / nPts;
      const T = Math.pow(10, logT);
      const cvTrans = 1.5;
      const cvRot = einsteinCV(thetaRot, T); // each rotational DoF
      const cvVibKE = einsteinCV(thetaVib, T);
      // Total: 3/2 + 2*(rot contribution per DoF) + 2*(vib contribution per DoF)
      // For diatomic: 2 rotational DoF, 1 vibrational mode (2 DoF: KE + PE)
      const cv = cvTrans + 2 * cvRot + 2 * cvVibKE;
      cvVals.push(cv);
    }

    const yScale = plotH / cvMax;
    const xScale = plotW / (logTmax - logTmin);

    // Plateau guidelines
    const plateaus = [
      { val: 1.5, label: '3/2 (translation)', color: COLORS.textDim },
      { val: 2.5, label: '5/2 (+ rotation)', color: COLORS.textDim },
      { val: 3.5, label: '7/2 (+ vibration)', color: COLORS.textDim },
    ];

    plateaus.forEach(pl => {
      const py = xAxis - pl.val * yScale;
      ctxHC.strokeStyle = 'rgba(255,255,255,0.12)';
      ctxHC.lineWidth = 1;
      ctxHC.setLineDash([4, 4]);
      ctxHC.beginPath(); ctxHC.moveTo(ox, py); ctxHC.lineTo(ox + plotW, py); ctxHC.stroke();
      ctxHC.setLineDash([]);
      ctxHC.fillStyle = pl.color;
      ctxHC.font = '10px Inter, system-ui, sans-serif';
      ctxHC.textAlign = 'left';
      ctxHC.fillText(pl.label, ox + plotW + 2, py + 4);
    });

    // Mark transition temperatures
    const transitions = [
      { T: thetaRot, label: '\u03B8_rot \u2248 85 K', color: COLORS.orange },
      { T: thetaVib, label: '\u03B8_vib \u2248 6300 K', color: COLORS.purple },
    ];
    transitions.forEach(tr => {
      const logT = Math.log10(tr.T);
      const px = ox + (logT - logTmin) * xScale;
      if (px > ox && px < ox + plotW) {
        ctxHC.strokeStyle = tr.color;
        ctxHC.lineWidth = 1;
        ctxHC.setLineDash([3, 3]);
        ctxHC.beginPath(); ctxHC.moveTo(px, 15); ctxHC.lineTo(px, xAxis); ctxHC.stroke();
        ctxHC.setLineDash([]);
        ctxHC.fillStyle = tr.color;
        ctxHC.font = '10px Inter, system-ui, sans-serif';
        ctxHC.textAlign = 'center';
        ctxHC.fillText(tr.label, px, xAxis + 12);
      }
    });

    // Draw the curve
    ctxHC.strokeStyle = COLORS.blue;
    ctxHC.lineWidth = 2.5;
    ctxHC.beginPath();
    for (let i = 0; i < nPts; i++) {
      const logT = logTmin + (logTmax - logTmin) * i / nPts;
      const px = ox + (logT - logTmin) * xScale;
      const py = xAxis - cvVals[i] * yScale;
      i === 0 ? ctxHC.moveTo(px, py) : ctxHC.lineTo(px, py);
    }
    ctxHC.stroke();

    // X-axis tick labels (log scale)
    ctxHC.fillStyle = COLORS.textDim;
    ctxHC.font = '10px Inter, system-ui, sans-serif';
    ctxHC.textAlign = 'center';
    [10, 100, 1000, 10000].forEach(T => {
      const logT = Math.log10(T);
      const px = ox + (logT - logTmin) * xScale;
      ctxHC.fillText(T.toString(), px, xAxis + 24);
    });

    // Y-axis tick labels
    ctxHC.textAlign = 'right';
    for (let cv = 0; cv <= 4; cv += 0.5) {
      const py = xAxis - cv * yScale;
      ctxHC.fillText(cv.toFixed(1), ox - 5, py + 4);
    }

    // Title
    ctxHC.fillStyle = COLORS.text;
    ctxHC.font = FONT;
    ctxHC.textAlign = 'left';
    ctxHC.fillText('Heat capacity of H\u2082: quantum freezeout of degrees of freedom', ox + 5, 28);
  }

  drawHeatCap();
  }

  // ----- Energy Distribution P(E₁) -----
  const cED = document.getElementById('vis-energy-dist');
  if (cED) {
    const ed = setupCanvas(cED);
    const ctxED = ed.ctx, WED = ed.W, HED = ed.H;
    const n1Slider = document.getElementById('edist-n1');
    const n2Slider = document.getElementById('edist-n2');

    function drawEnergyDist() {
      const N1 = parseInt(n1Slider?.value || 10);
      const N2 = parseInt(n2Slider?.value || 10);
      clearCanvas(ctxED, WED, HED);

      const ox = 60, oy = 20, pw = WED - 80, ph = HED - 60;
      drawAxes(ctxED, ox, oy, pw, ph, { xLabel: 'E₁ / E', yLabel: 'P(E₁)' });

      // P(E₁) ∝ E₁^(3N₁/2) * (E - E₁)^(3N₂/2)
      const a = 3 * N1 / 2, b = 3 * N2 / 2;
      const npts = 300;
      let maxP = 0;
      const vals = [];
      for (let i = 0; i <= npts; i++) {
        const x = i / npts;
        if (x <= 0 || x >= 1) { vals.push(-Infinity); continue; }
        const lnP = a * Math.log(x) + b * Math.log(1 - x);
        vals.push(lnP);
      }
      const maxLnP = Math.max(...vals.filter(v => isFinite(v)));
      const pVals = vals.map(v => isFinite(v) ? Math.exp(v - maxLnP) : 0);
      maxP = Math.max(...pVals);

      // Draw curve
      ctxED.strokeStyle = COLORS.blue;
      ctxED.lineWidth = 2.5;
      ctxED.beginPath();
      for (let i = 0; i <= npts; i++) {
        const px = ox + (i / npts) * pw;
        const py = oy + ph - (pVals[i] / maxP) * ph * 0.9;
        i === 0 ? ctxED.moveTo(px, py) : ctxED.lineTo(px, py);
      }
      ctxED.stroke();

      // Mark peak
      const peakX = N1 / (N1 + N2);
      const sigma = Math.sqrt(2 * N1 * N2 / (3 * (N1 + N2) * (N1 + N2)));
      ctxED.strokeStyle = COLORS.red;
      ctxED.lineWidth = 1;
      ctxED.setLineDash([5, 5]);
      const peakPx = ox + peakX * pw;
      ctxED.beginPath();
      ctxED.moveTo(peakPx, oy);
      ctxED.lineTo(peakPx, oy + ph);
      ctxED.stroke();
      ctxED.setLineDash([]);

      // Labels
      ctxED.fillStyle = COLORS.text;
      ctxED.font = FONT;
      ctxED.textAlign = 'left';
      ctxED.fillText('⟨E₁⟩/E = ' + peakX.toFixed(3), peakPx + 5, oy + 20);
      ctxED.fillText('σ/⟨E₁⟩ ~ 1/√N₁ = ' + (1 / Math.sqrt(N1)).toFixed(3), peakPx + 5, oy + 36);
      ctxED.fillText('N₁ = ' + N1 + ', N₂ = ' + N2, ox + 5, oy + 16);

      document.getElementById('edist-n1-val')?.replaceChildren(document.createTextNode(N1));
      document.getElementById('edist-n2-val')?.replaceChildren(document.createTextNode(N2));
    }

    n1Slider?.addEventListener('input', drawEnergyDist);
    n2Slider?.addEventListener('input', drawEnergyDist);
    drawEnergyDist();
  }

  // ----- Diatomic Molecule Modes -----
  const cDI = document.getElementById('vis-diatomic');
  if (cDI) {
    const di = setupCanvas(cDI);
    const ctxDI = di.ctx, WDI = di.W, HDI = di.H;
    const modeSelect = document.getElementById('diatomic-mode');
    let diTime = 0, diRunning = false;

    function drawDiatomic() {
      clearCanvas(ctxDI, WDI, HDI);
      const mode = modeSelect?.value || 'all';
      const t = diTime;

      // Three panels: translate, rotate, vibrate
      const panels = mode === 'all' ? ['translate', 'rotate', 'vibrate'] : [mode];
      const panelW = (WDI - 40) / panels.length;

      panels.forEach((m, idx) => {
        const cx = 20 + panelW * idx + panelW / 2;
        const cy = HDI / 2;
        const r = 18, sep = 36;

        let x1, y1, x2, y2;
        if (m === 'translate') {
          const dx = 30 * Math.sin(t * 0.03);
          x1 = cx - sep / 2 + dx; y1 = cy;
          x2 = cx + sep / 2 + dx; y2 = cy;
        } else if (m === 'rotate') {
          const angle = t * 0.04;
          x1 = cx + sep / 2 * Math.cos(angle);
          y1 = cy + sep / 2 * Math.sin(angle);
          x2 = cx - sep / 2 * Math.cos(angle);
          y2 = cy - sep / 2 * Math.sin(angle);
        } else {
          const stretch = 12 * Math.sin(t * 0.06);
          x1 = cx - sep / 2 - stretch; y1 = cy;
          x2 = cx + sep / 2 + stretch; y2 = cy;
        }

        // Draw bond
        ctxDI.strokeStyle = COLORS.textDim;
        ctxDI.lineWidth = 3;
        ctxDI.beginPath();
        ctxDI.moveTo(x1, y1);
        ctxDI.lineTo(x2, y2);
        ctxDI.stroke();

        // Draw atoms
        ctxDI.fillStyle = COLORS.blue;
        ctxDI.beginPath(); ctxDI.arc(x1, y1, r, 0, 2 * Math.PI); ctxDI.fill();
        ctxDI.fillStyle = COLORS.red;
        ctxDI.beginPath(); ctxDI.arc(x2, y2, r, 0, 2 * Math.PI); ctxDI.fill();

        // Label
        ctxDI.fillStyle = COLORS.text;
        ctxDI.font = FONT;
        ctxDI.textAlign = 'center';
        const labels = { translate: 'Translation (3 DoF)', rotate: 'Rotation (2 DoF)', vibrate: 'Vibration (2 DoF)' };
        ctxDI.fillText(labels[m], cx, HDI - 15);
        const contrib = { translate: '½kT × 3', rotate: '½kT × 2', vibrate: '½kT × 2' };
        ctxDI.fillStyle = COLORS.yellow;
        ctxDI.fillText(contrib[m], cx, 20);
      });
    }

    function animateDiatomic() {
      if (!diRunning) return;
      diTime++;
      drawDiatomic();
      activeAnimations['diatomic'] = requestAnimationFrame(animateDiatomic);
    }

    document.getElementById('diatomic-start')?.addEventListener('click', () => {
      diRunning = !diRunning;
      const btn = document.getElementById('diatomic-start');
      if (btn) btn.textContent = diRunning ? 'Pause' : 'Animate';
      if (diRunning) animateDiatomic();
    });

    modeSelect?.addEventListener('change', drawDiatomic);
    drawDiatomic();
  }

  // ----- Ideal Gas Kinetic Theory with Live Velocity Histogram -----
  // Supports multiple initial conditions, 1-3 particle types, and speed slider
  const cGK = document.getElementById('vis-gaskinetic');
  if (cGK) {
    const { ctx: ctxGK, W: WGK, H: HGK } = setupCanvas(cGK);
    let gkRunning = false;
    let gkParticles = [];
    const boxW = WGK * 0.48;
    const histX = boxW + 40;
    const histW = WGK - histX - 20;
    const nBins = 25;
    const maxBinSpeed = 12;

    // Per-type histogram accumulators and config
    // Type definitions: { mass, radius, color, name }
    const typeConfigs = {
      1: [{ mass: 1, radius: 3, color: [79, 195, 247], name: 'Gas' }],
      2: [
        { mass: 1, radius: 2.5, color: [79, 195, 247], name: 'Light (m)' },
        { mass: 4, radius: 5,   color: [239, 83, 80],  name: 'Heavy (4m)' }
      ],
      3: [
        { mass: 1, radius: 2,   color: [79, 195, 247],  name: 'Light (m)' },
        { mass: 3, radius: 4,   color: [255, 183, 77],  name: 'Medium (3m)' },
        { mass: 8, radius: 6.5, color: [239, 83, 80],   name: 'Heavy (8m)' }
      ]
    };
    let speedHistByType = {};  // typeIdx -> array of bin counts
    let histFrames = 0;

    function getGKTemp() { return parseFloat(document.getElementById('gk-temp')?.value || 400); }
    function getGKSpeed() { return parseInt(document.getElementById('gk-speed')?.value || 2); }
    function getGKInit() { return document.getElementById('gk-init')?.value || 'random'; }
    function getGKTypes() { return parseInt(document.getElementById('gk-types')?.value || 1); }

    function initGKParticles() {
      const T = getGKTemp();
      const initMode = getGKInit();
      const nTypes = getGKTypes();
      const types = typeConfigs[nTypes];

      gkParticles = [];
      speedHistByType = {};
      for (let t = 0; t < types.length; t++) speedHistByType[t] = new Array(nBins).fill(0);
      histFrames = 0;

      // Distribute particles across types
      const totalN = 150;
      const perType = Math.floor(totalN / types.length);

      for (let t = 0; t < types.length; t++) {
        const tc = types[t];
        const n = (t === types.length - 1) ? totalN - perType * t : perType;
        // v_rms = sqrt(2 k_B T / m) in 2D; in our units v0 = sqrt(T / (80 * m))
        const v0 = Math.sqrt(T / (80 * tc.mass));

        for (let i = 0; i < n; i++) {
          let vx = 0, vy = 0;

          if (initMode === 'random') {
            // Box-Muller for Maxwell-like initial speeds
            const u1 = Math.random(), u2 = Math.random();
            vx = v0 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            vy = v0 * Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
          } else if (initMode === 'one') {
            // Only the very first particle of the first type gets all the energy
            if (t === 0 && i === 0) {
              const totalKE = totalN * v0 * v0; // total energy budget
              const speed = Math.sqrt(2 * totalKE / tc.mass);
              const angle = Math.random() * 2 * Math.PI;
              vx = speed * Math.cos(angle);
              vy = speed * Math.sin(angle);
            }
          } else if (initMode === 'equal') {
            // All particles get the same speed (= v_rms), random direction
            const speed = v0 * Math.sqrt(2); // v_rms in 2D
            const angle = Math.random() * 2 * Math.PI;
            vx = speed * Math.cos(angle);
            vy = speed * Math.sin(angle);
          }

          gkParticles.push({
            x: tc.radius + 5 + Math.random() * (boxW - tc.radius * 2 - 10),
            y: tc.radius + 5 + Math.random() * (HGK - tc.radius * 2 - 10),
            vx: vx, vy: vy,
            r: tc.radius, mass: tc.mass, typeIdx: t
          });
        }
      }
    }

    function stepGK() {
      const nP = gkParticles.length;
      // Move particles
      gkParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < p.r) { p.vx = Math.abs(p.vx); p.x = p.r; }
        if (p.x > boxW - p.r) { p.vx = -Math.abs(p.vx); p.x = boxW - p.r; }
        if (p.y < p.r) { p.vy = Math.abs(p.vy); p.y = p.r; }
        if (p.y > HGK - p.r) { p.vy = -Math.abs(p.vy); p.y = HGK - p.r; }
      });

      // Elastic collisions (general unequal mass)
      for (let i = 0; i < nP; i++) {
        for (let j = i + 1; j < nP; j++) {
          const a = gkParticles[i], b = gkParticles[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy;
          const minD = a.r + b.r;
          if (dist2 < minD * minD && dist2 > 0) {
            const dist = Math.sqrt(dist2);
            const nx = dx / dist, ny = dy / dist;
            const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (dvn > 0) {
              // General elastic collision impulse
              const mSum = a.mass + b.mass;
              const impulse = 2 * dvn / mSum;
              a.vx -= impulse * b.mass * nx;
              a.vy -= impulse * b.mass * ny;
              b.vx += impulse * a.mass * nx;
              b.vy += impulse * a.mass * ny;
              const overlap = minD - dist;
              const wa = b.mass / mSum, wb = a.mass / mSum;
              a.x -= nx * overlap * wa;
              a.y -= ny * overlap * wa;
              b.x += nx * overlap * wb;
              b.y += ny * overlap * wb;
            }
          }
        }
      }

      // Accumulate per-type speed histograms
      histFrames++;
      gkParticles.forEach(p => {
        const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const bin = Math.floor(s / maxBinSpeed * nBins);
        if (bin >= 0 && bin < nBins) speedHistByType[p.typeIdx][bin]++;
      });
    }

    function drawGK() {
      clearCanvas(ctxGK, WGK, HGK);
      const nTypes = getGKTypes();
      const types = typeConfigs[nTypes];

      // Draw box
      ctxGK.strokeStyle = COLORS.axis;
      ctxGK.lineWidth = 2;
      ctxGK.strokeRect(1, 1, boxW - 2, HGK - 2);

      // Draw particles colored by type
      gkParticles.forEach(p => {
        const tc = types[p.typeIdx];
        const c = tc.color;
        ctxGK.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        ctxGK.beginPath();
        ctxGK.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctxGK.fill();
      });

      // Histogram area
      const histBot = HGK - 40;
      const histTop = 30;
      const histH = histBot - histTop;
      const barW = histW / nBins;

      // Find per-type max for scaling (use global max across all types)
      let maxCount = 1;
      for (let t = 0; t < types.length; t++) {
        for (let i = 0; i < nBins; i++) {
          if ((speedHistByType[t]?.[i] || 0) > maxCount) maxCount = speedHistByType[t][i];
        }
      }

      if (types.length === 1) {
        // Single type: gradient-colored bars like before
        for (let i = 0; i < nBins; i++) {
          const barH = ((speedHistByType[0]?.[i] || 0) / maxCount) * histH;
          const frac = (i + 0.5) / nBins;
          const r = Math.round(239 * frac + 79 * (1 - frac));
          const g = Math.round(83 * frac + 195 * (1 - frac));
          const b = Math.round(80 * frac + 247 * (1 - frac));
          ctxGK.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.6)';
          ctxGK.fillRect(histX + i * barW, histBot - barH, barW - 1, barH);
        }
      } else {
        // Multiple types: overlaid bars from baseline (not stacked)
        for (let t = types.length - 1; t >= 0; t--) {
          const c = types[t].color;
          for (let i = 0; i < nBins; i++) {
            const count = speedHistByType[t]?.[i] || 0;
            const barH = (count / maxCount) * histH;
            ctxGK.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.35)';
            ctxGK.fillRect(histX + i * barW, histBot - barH, barW - 1, barH);
          }
        }
      }

      // Overlay theoretical Maxwell-Boltzmann curves per type
      if (histFrames > 10) {
        const mbColors = types.length === 1
          ? [COLORS.green]
          : types.map(tc => 'rgb(' + tc.color[0] + ',' + tc.color[1] + ',' + tc.color[2] + ')');

        for (let t = 0; t < types.length; t++) {
          // Estimate sigma^2 = k_B T / m for this type from data
          let sumV2 = 0, count = 0;
          gkParticles.forEach(p => {
            if (p.typeIdx === t) { sumV2 += p.vx * p.vx + p.vy * p.vy; count++; }
          });
          if (count < 2) continue;
          const sigma2 = sumV2 / (2 * count); // <v^2> = 2*sigma^2 in 2D

          ctxGK.strokeStyle = mbColors[t];
          ctxGK.lineWidth = 2.5;
          ctxGK.beginPath();
          // Normalization: total histogram area for this type
          let totalHist = 0;
          for (let i = 0; i < nBins; i++) totalHist += (speedHistByType[t]?.[i] || 0);
          const binWidth = maxBinSpeed / nBins;
          for (let px = 0; px < histW; px++) {
            const v = (px / histW) * maxBinSpeed;
            const fv = (v / sigma2) * Math.exp(-v * v / (2 * sigma2));
            const barH = fv * (totalHist * binWidth / maxCount) * histH;
            const py = histBot - barH;
            if (px === 0) ctxGK.moveTo(histX + px, py);
            else ctxGK.lineTo(histX + px, py);
          }
          ctxGK.stroke();
        }
      }

      // Axes
      ctxGK.strokeStyle = COLORS.axis;
      ctxGK.lineWidth = 1;
      ctxGK.beginPath();
      ctxGK.moveTo(histX, histTop);
      ctxGK.lineTo(histX, histBot);
      ctxGK.lineTo(histX + histW, histBot);
      ctxGK.stroke();

      // Labels
      ctxGK.fillStyle = COLORS.text;
      ctxGK.font = FONT;
      ctxGK.textAlign = 'center';
      ctxGK.fillText('Speed distribution', histX + histW / 2, 18);
      ctxGK.fillStyle = COLORS.textDim;
      ctxGK.font = FONT_SM;
      ctxGK.fillText('Speed v', histX + histW / 2, histBot + 16);
      ctxGK.save();
      ctxGK.translate(histX - 16, histTop + histH / 2);
      ctxGK.rotate(-Math.PI / 2);
      ctxGK.textAlign = 'center';
      ctxGK.fillText('f(v)', 0, 0);
      ctxGK.restore();

      // Legend
      ctxGK.font = FONT_SM;
      ctxGK.textAlign = 'left';
      if (types.length === 1) {
        ctxGK.fillStyle = COLORS.green;
        ctxGK.fillText('\u2014 Maxwell\u2013Boltzmann (2D)', histX + 5, histBot + 32);
      } else {
        for (let t = 0; t < types.length; t++) {
          const c = types[t].color;
          ctxGK.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
          ctxGK.fillText('\u2014 ' + types[t].name, histX + 5 + t * 90, histBot + 32);
        }
      }

      // Speed ticks
      ctxGK.fillStyle = COLORS.textDim;
      ctxGK.font = '10px Inter, system-ui, sans-serif';
      ctxGK.textAlign = 'center';
      for (let v = 0; v <= maxBinSpeed; v += 3) {
        const tx = histX + (v / maxBinSpeed) * histW;
        ctxGK.fillText(v.toString(), tx, histBot + 12);
      }

      // Temp display
      const T = getGKTemp();
      document.getElementById('gk-temp-val')?.replaceChildren(document.createTextNode(T.toString()));
    }

    function animateGK() {
      if (!gkRunning) return;
      const stepsPerFrame = getGKSpeed();
      for (let i = 0; i < stepsPerFrame; i++) stepGK();
      drawGK();
      activeAnimations['gaskinetic'] = requestAnimationFrame(animateGK);
    }

    document.getElementById('gk-start')?.addEventListener('click', function () {
      gkRunning = !gkRunning;
      this.textContent = gkRunning ? 'Pause' : 'Start';
      if (gkRunning) animateGK();
    });

    document.getElementById('gk-reset')?.addEventListener('click', () => {
      gkRunning = false;
      const btn = document.getElementById('gk-start');
      if (btn) btn.textContent = 'Start';
      if (activeAnimations['gaskinetic']) cancelAnimationFrame(activeAnimations['gaskinetic']);
      initGKParticles();
      drawGK();
    });

    document.getElementById('gk-temp')?.addEventListener('input', function () {
      document.getElementById('gk-temp-val')?.replaceChildren(document.createTextNode(this.value));
      if (!gkRunning) { initGKParticles(); drawGK(); }
    });

    document.getElementById('gk-speed')?.addEventListener('input', function () {
      document.getElementById('gk-speed-val')?.replaceChildren(document.createTextNode(this.value));
    });

    // Re-init when initial condition or particle type changes
    document.getElementById('gk-init')?.addEventListener('change', () => {
      gkRunning = false;
      const btn = document.getElementById('gk-start');
      if (btn) btn.textContent = 'Start';
      if (activeAnimations['gaskinetic']) cancelAnimationFrame(activeAnimations['gaskinetic']);
      initGKParticles();
      drawGK();
    });

    document.getElementById('gk-types')?.addEventListener('change', () => {
      gkRunning = false;
      const btn = document.getElementById('gk-start');
      if (btn) btn.textContent = 'Start';
      if (activeAnimations['gaskinetic']) cancelAnimationFrame(activeAnimations['gaskinetic']);
      initGKParticles();
      drawGK();
    });

    initGKParticles();
    drawGK();
  }
}


// =============================================================================
// CH5: Thermodynamics - Carnot Cycle (FIXED)
// =============================================================================
function initCh5Vis() {
  const c = document.getElementById('vis-carnot');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  let t = 0;
  let phase = 0;
  let running = false;

  const TH = 600, TC = 300;
  const gamma = 5 / 3; // monatomic ideal gas
  const nR = 1; // nR = nRT_H reference

  // Thermodynamically correct Carnot cycle state points:
  // For ideal gas PV = nRT on isotherms, PV^gamma = const on adiabats.
  //
  // State A: start of isothermal expansion at TH
  // State B: end of isothermal expansion at TH
  // State C: end of adiabatic expansion (reaches TC)
  // State D: end of isothermal compression at TC
  // Then adiabatic compression D -> A returns to TH.
  //
  // Choose V_A = 1.
  // Isotherm A->B: PV = nR*TH => P = nR*TH/V. Choose V_B = 2.5.
  // Adiabat B->C: T*V^(gamma-1) = const => TH * V_B^(g-1) = TC * V_C^(g-1)
  //   => V_C = V_B * (TH/TC)^(1/(gamma-1))
  // Isotherm C->D: PV = nR*TC. We need the adiabat D->A to close:
  //   TH * V_A^(g-1) = TC * V_D^(g-1)
  //   => V_D = V_A * (TH/TC)^(1/(gamma-1))

  const VA = 1.0;
  const VB = 2.5;
  const ratio = Math.pow(TH / TC, 1 / (gamma - 1)); // (TH/TC)^(3/2) for gamma=5/3
  const VC = VB * ratio;
  const VD = VA * ratio;

  const PA = nR * TH / VA;
  const PB = nR * TH / VB;
  const PC = nR * TC / VC;
  const PD = nR * TC / VD;

  // Plotting range: need to fit all volumes and pressures
  const Vmin = 0.5, Vmax = VC + 0.5;
  const Pmin = 0, Pmax = PA * 1.1;

  function draw() {
    clearCanvas(ctx, W, H);

    // PV diagram area
    const ox = 80, oy = 40, pw = 240, ph = 280;

    // Axes
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ph); ctx.lineTo(ox + pw, oy + ph); ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_SM;
    ctx.textAlign = 'center';
    ctx.fillText('V', ox + pw / 2, oy + ph + 22);
    ctx.save(); ctx.translate(ox - 22, oy + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('P', 0, 0); ctx.restore();

    function toScreen(V, P) {
      const sx = ox + (V - Vmin) / (Vmax - Vmin) * pw;
      const sy = oy + ph - (P - Pmin) / (Pmax - Pmin) * ph;
      return [sx, sy];
    }

    const nPts = 100;

    // A -> B: Isothermal expansion at TH
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const V = VA + (VB - VA) * i / nPts;
      const P = nR * TH / V;
      const [sx, sy] = toScreen(V, P);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // B -> C: Adiabatic expansion
    ctx.strokeStyle = COLORS.blue;
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const V = VB + (VC - VB) * i / nPts;
      const P = PB * Math.pow(VB / V, gamma);
      const [sx, sy] = toScreen(V, P);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // C -> D: Isothermal compression at TC
    ctx.strokeStyle = COLORS.green;
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const V = VC + (VD - VC) * i / nPts;
      const P = nR * TC / V;
      const [sx, sy] = toScreen(V, P);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // D -> A: Adiabatic compression
    ctx.strokeStyle = COLORS.orange;
    ctx.beginPath();
    for (let i = 0; i <= nPts; i++) {
      const V = VD + (VA - VD) * i / nPts;
      const P = PD * Math.pow(VD / V, gamma);
      const [sx, sy] = toScreen(V, P);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // State point labels
    const stateLabels = [
      { V: VA, P: PA, label: 'A' },
      { V: VB, P: PB, label: 'B' },
      { V: VC, P: PC, label: 'C' },
      { V: VD, P: PD, label: 'D' },
    ];
    ctx.font = FONT_SM;
    stateLabels.forEach(s => {
      const [sx, sy] = toScreen(s.V, s.P);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.fillText(s.label, sx + 10, sy - 6);
    });

    // Moving point on cycle
    const phaseT = (t % 400) / 100;
    let currentV, currentP;
    if (phaseT < 1) {
      currentV = VA + (VB - VA) * phaseT;
      currentP = nR * TH / currentV;
      phase = 0;
    } else if (phaseT < 2) {
      const f = phaseT - 1;
      currentV = VB + (VC - VB) * f;
      currentP = PB * Math.pow(VB / currentV, gamma);
      phase = 1;
    } else if (phaseT < 3) {
      const f = phaseT - 2;
      currentV = VC + (VD - VC) * f;
      currentP = nR * TC / currentV;
      phase = 2;
    } else {
      const f = phaseT - 3;
      currentV = VD + (VA - VD) * f;
      currentP = PD * Math.pow(VD / currentV, gamma);
      phase = 3;
    }

    const [cx, cy] = toScreen(currentV, currentP);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();

    // Phase labels on right side
    const phaseLabels = [
      { text: 'A\u2192B Isothermal expansion (TH)', color: COLORS.red },
      { text: 'B\u2192C Adiabatic expansion', color: COLORS.blue },
      { text: 'C\u2192D Isothermal compression (TC)', color: COLORS.green },
      { text: 'D\u2192A Adiabatic compression', color: COLORS.orange }
    ];

    const infoX = 350;
    phaseLabels.forEach((l, i) => {
      ctx.fillStyle = phase === i ? '#fff' : l.color;
      ctx.font = (phase === i ? 'bold ' : '') + '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((phase === i ? '\u25B8 ' : '  ') + l.text, infoX, 55 + i * 22);
    });

    // Efficiency
    const eff = 1 - TC / TH;
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_LG;
    ctx.textAlign = 'left';
    ctx.fillText('Carnot efficiency: \u03B7 = 1 - TC/TH = ' + (eff * 100).toFixed(1) + '%', infoX, 160);
    ctx.fillText('TH = ' + TH + ' K,  TC = ' + TC + ' K', infoX, 182);

    // Engine schematic
    const ex = 430, ey = 220;
    // Hot reservoir
    ctx.fillStyle = 'rgba(239,83,80,0.2)';
    ctx.fillRect(ex - 50, ey - 40, 100, 30);
    ctx.fillStyle = COLORS.red;
    ctx.font = FONT_SM;
    ctx.textAlign = 'center';
    ctx.fillText('Hot (TH=' + TH + 'K)', ex, ey - 18);

    // Engine box
    ctx.fillStyle = '#1c2f3d';
    ctx.fillRect(ex - 30, ey + 10, 60, 40);
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(ex - 30, ey + 10, 60, 40);
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_SM;
    ctx.fillText('Engine', ex, ey + 35);

    // Cold reservoir
    ctx.fillStyle = 'rgba(79,195,247,0.2)';
    ctx.fillRect(ex - 50, ey + 70, 100, 30);
    ctx.fillStyle = COLORS.blue;
    ctx.font = FONT_SM;
    ctx.fillText('Cold (TC=' + TC + 'K)', ex, ey + 90);

    // Arrows
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 2;
    drawArrow(ctx, ex, ey - 8, ex, ey + 10);
    ctx.strokeStyle = COLORS.blue;
    drawArrow(ctx, ex, ey + 50, ex, ey + 70);
    ctx.strokeStyle = COLORS.green;
    drawArrow(ctx, ex + 30, ey + 30, ex + 60, ey + 30);

    ctx.font = FONT_SM;
    ctx.fillStyle = COLORS.red; ctx.fillText('QH', ex + 15, ey + 2);
    ctx.fillStyle = COLORS.blue; ctx.fillText('QC', ex + 15, ey + 62);
    ctx.fillStyle = COLORS.green; ctx.fillText('W', ex + 55, ey + 25);

    t++;
  }

  function animate() {
    if (!running) return;
    draw();
    activeAnimations['carnot'] = requestAnimationFrame(animate);
  }

  document.getElementById('carnot-start')?.addEventListener('click', function () {
    running = !running;
    this.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  draw();

  // ----- TS Diagram for Carnot Cycle -----
  const cTS = document.getElementById('vis-carnot-ts');
  if (cTS) {
    const ts = setupCanvas(cTS);
    const ctxTS = ts.ctx, WTS = ts.W, HTS = ts.H;

    const SA = 1.0;
    const SB = SA + 1.0 * Math.log(VB / VA); // nR ln(V2/V1), nR=1
    const ox2 = 65, oy2 = 25;
    const plotW2 = WTS - ox2 - 40;
    const plotH2 = HTS - oy2 - 50;
    const Smin = SA - 0.3, Smax = SB + 0.3;
    const Tmin2 = TC - 80, Tmax2 = TH + 80;

    function toScreenTS(S, T) {
      return [
        ox2 + (S - Smin) / (Smax - Smin) * plotW2,
        oy2 + plotH2 - (T - Tmin2) / (Tmax2 - Tmin2) * plotH2
      ];
    }

    function drawTS() {
      clearCanvas(ctxTS, WTS, HTS);
      drawAxes(ctxTS, ox2, oy2, plotW2, plotH2, { xLabel: 'Entropy S', yLabel: 'Temperature T (K)', yLabelOffset: 45 });

      const [ax, ay] = toScreenTS(SA, TH);
      const [bx, by] = toScreenTS(SB, TH);
      const [cx, cy] = toScreenTS(SB, TC);
      const [dx, dy] = toScreenTS(SA, TC);

      // Shaded work area
      ctxTS.fillStyle = 'rgba(102, 187, 106, 0.15)';
      ctxTS.beginPath();
      ctxTS.moveTo(ax, ay); ctxTS.lineTo(bx, by); ctxTS.lineTo(cx, cy); ctxTS.lineTo(dx, dy);
      ctxTS.closePath(); ctxTS.fill();

      // Cycle edges
      ctxTS.lineWidth = 2.5;
      const edges = [
        [ax, ay, bx, by, COLORS.red],
        [bx, by, cx, cy, COLORS.blue],
        [cx, cy, dx, dy, COLORS.green],
        [dx, dy, ax, ay, COLORS.orange]
      ];
      edges.forEach(([x1, y1, x2, y2, col]) => {
        ctxTS.strokeStyle = col; ctxTS.beginPath(); ctxTS.moveTo(x1, y1); ctxTS.lineTo(x2, y2); ctxTS.stroke();
      });

      // State labels
      const states = [
        { S: SA, T: TH, label: 'A', dx: -12, dy: -8 },
        { S: SB, T: TH, label: 'B', dx: 10, dy: -8 },
        { S: SB, T: TC, label: 'C', dx: 10, dy: 14 },
        { S: SA, T: TC, label: 'D', dx: -12, dy: 14 },
      ];
      ctxTS.font = FONT_SM;
      states.forEach(s => {
        const [sx, sy] = toScreenTS(s.S, s.T);
        ctxTS.fillStyle = '#fff';
        ctxTS.beginPath(); ctxTS.arc(sx, sy, 4, 0, 2 * Math.PI); ctxTS.fill();
        ctxTS.fillStyle = COLORS.text; ctxTS.textAlign = 'center';
        ctxTS.fillText(s.label, sx + s.dx, sy + s.dy);
      });

      // Work label
      ctxTS.fillStyle = COLORS.green; ctxTS.font = FONT; ctxTS.textAlign = 'center';
      const [midx, midy] = toScreenTS((SA + SB) / 2, (TH + TC) / 2);
      ctxTS.fillText('W = Q_net', midx, midy + 5);

      // Legend
      ctxTS.font = FONT_SM; ctxTS.textAlign = 'left';
      const ly = HTS - 8;
      ctxTS.fillStyle = COLORS.red;    ctxTS.fillText('A\u2192B Isotherm (TH)', ox2, ly);
      ctxTS.fillStyle = COLORS.blue;   ctxTS.fillText('B\u2192C Adiabat', ox2 + 140, ly);
      ctxTS.fillStyle = COLORS.green;  ctxTS.fillText('C\u2192D Isotherm (TC)', ox2 + 230, ly);
      ctxTS.fillStyle = COLORS.orange; ctxTS.fillText('D\u2192A Adiabat', ox2 + 380, ly);

      // Temperature ticks
      ctxTS.fillStyle = COLORS.textDim; ctxTS.font = '10px Inter, system-ui, sans-serif'; ctxTS.textAlign = 'right';
      [TC, TH].forEach(T => { const [, sy] = toScreenTS(SA, T); ctxTS.fillText(T + ' K', ox2 - 5, sy + 4); });
    }
    drawTS();
  }

  // ----- Isothermal vs Adiabatic PV Curves -----
  const cIA = document.getElementById('vis-isothermal-adiabatic');
  if (cIA) {
    const ia = setupCanvas(cIA);
    const ctxIA = ia.ctx, WIA = ia.W, HIA = ia.H;
    const gammaSlider = document.getElementById('ia-gamma');

    function drawIsothermalAdiabatic() {
      const gamma = parseFloat(gammaSlider?.value || 1.67);
      clearCanvas(ctxIA, WIA, HIA);

      const ox = 60, oy = 20, pw = WIA - 80, ph = HIA - 60;
      drawAxes(ctxIA, ox, oy, pw, ph, { xLabel: 'V / V₀', yLabel: 'P / P₀' });

      // Reference: P₀V₀ = 1, so isothermal: P = 1/V, adiabatic: P = 1/V^γ
      const npts = 200;
      const vMin = 0.3, vMax = 4;

      // Isothermal curve (PV = const)
      ctxIA.strokeStyle = COLORS.blue;
      ctxIA.lineWidth = 2.5;
      ctxIA.beginPath();
      for (let i = 0; i <= npts; i++) {
        const v = vMin + (vMax - vMin) * i / npts;
        const p = 1 / v;
        const px = ox + ((v - vMin) / (vMax - vMin)) * pw;
        const py = oy + ph - (p / (1 / vMin)) * ph;
        if (py >= oy && py <= oy + ph) {
          i === 0 || py <= oy ? ctxIA.moveTo(px, py) : ctxIA.lineTo(px, py);
        }
      }
      ctxIA.stroke();

      // Adiabatic curve (PV^γ = const)
      ctxIA.strokeStyle = COLORS.red;
      ctxIA.lineWidth = 2.5;
      ctxIA.beginPath();
      let started = false;
      for (let i = 0; i <= npts; i++) {
        const v = vMin + (vMax - vMin) * i / npts;
        const p = Math.pow(v, -gamma);
        const px = ox + ((v - vMin) / (vMax - vMin)) * pw;
        const py = oy + ph - (p / (1 / vMin)) * ph;
        if (py >= oy && py <= oy + ph) {
          !started ? (ctxIA.moveTo(px, py), started = true) : ctxIA.lineTo(px, py);
        }
      }
      ctxIA.stroke();

      // Work shaded region between curves from V₀=1 to V=2
      ctxIA.fillStyle = 'rgba(79,195,247,0.12)';
      ctxIA.beginPath();
      const v0 = 1, v1 = 2.5;
      for (let i = 0; i <= 100; i++) {
        const v = v0 + (v1 - v0) * i / 100;
        const p = 1 / v;
        const px = ox + ((v - vMin) / (vMax - vMin)) * pw;
        const py = oy + ph - (p / (1 / vMin)) * ph;
        i === 0 ? ctxIA.moveTo(px, py) : ctxIA.lineTo(px, py);
      }
      for (let i = 100; i >= 0; i--) {
        const v = v0 + (v1 - v0) * i / 100;
        const p = Math.pow(v, -gamma);
        const px = ox + ((v - vMin) / (vMax - vMin)) * pw;
        const py = oy + ph - (p / (1 / vMin)) * ph;
        ctxIA.lineTo(px, py);
      }
      ctxIA.closePath();
      ctxIA.fill();

      // Legend
      ctxIA.font = FONT;
      ctxIA.textAlign = 'left';
      ctxIA.fillStyle = COLORS.blue;
      ctxIA.fillText('—— Isothermal: PV = const', ox + 10, oy + 18);
      ctxIA.fillStyle = COLORS.red;
      ctxIA.fillText('—— Adiabatic: PV^γ = const, γ = ' + gamma.toFixed(2), ox + 10, oy + 34);

      // Shaded region label
      ctxIA.fillStyle = 'rgba(79,195,247,0.6)';
      ctxIA.fillText('Shaded: extra work from isothermal', ox + 10, oy + 50);

      document.getElementById('ia-gamma-val')?.replaceChildren(document.createTextNode(gamma.toFixed(2)));
    }

    gammaSlider?.addEventListener('input', drawIsothermalAdiabatic);
    drawIsothermalAdiabatic();
  }

  // ----- Piston Expansion -----
  const cPE = document.getElementById('vis-piston-expansion');
  if (cPE) {
    const {ctx: ctxPE, W: WPE, H: HPE} = setupCanvas(cPE);
    const modeSelect = document.getElementById('piston-mode');
    const expandBtn = document.getElementById('piston-expand');
    const resetBtnPE = document.getElementById('piston-reset');

    let pistonX = 0.3; // fraction of cylinder length
    let expanding = false;
    let T_gas = 2.0; // current gas temperature (changes in adiabatic)
    const T0 = 2.0;
    const gamma = 5 / 3;

    function drawPiston() {
      clearCanvas(ctxPE, WPE, HPE);
      const mode = modeSelect?.value || 'isothermal';

      // Left: physical system
      const cylL = 30, cylT = 50, cylW = 220, cylH = 100;
      const pistonPx = cylL + pistonX * cylW;

      // Gas region
      ctxPE.fillStyle = mode === 'isothermal' ? 'rgba(40,120,220,0.2)' : 'rgba(220,80,40,0.15)';
      ctxPE.fillRect(cylL, cylT, pistonPx - cylL, cylH);

      // Cylinder
      ctxPE.strokeStyle = COLORS.axis; ctxPE.lineWidth = 2;
      ctxPE.beginPath();
      ctxPE.moveTo(cylL, cylT); ctxPE.lineTo(cylL + cylW, cylT);
      ctxPE.moveTo(cylL, cylT + cylH); ctxPE.lineTo(cylL + cylW, cylT + cylH);
      ctxPE.moveTo(cylL, cylT); ctxPE.lineTo(cylL, cylT + cylH);
      ctxPE.stroke();

      // Piston
      ctxPE.fillStyle = COLORS.purple;
      ctxPE.fillRect(pistonPx - 4, cylT + 1, 8, cylH - 2);

      // Heat bath indicator (isothermal only)
      if (mode === 'isothermal') {
        ctxPE.strokeStyle = COLORS.orange; ctxPE.lineWidth = 1;
        ctxPE.setLineDash([3, 3]);
        ctxPE.strokeRect(cylL - 5, cylT + cylH + 5, cylW + 10, 20);
        ctxPE.setLineDash([]);
        ctxPE.fillStyle = COLORS.orange; ctxPE.font = FONT_SM; ctxPE.textAlign = 'center';
        ctxPE.fillText('Heat bath (T = const)', cylL + cylW / 2, cylT + cylH + 18);
      } else {
        ctxPE.fillStyle = COLORS.textDim; ctxPE.font = FONT_SM; ctxPE.textAlign = 'center';
        ctxPE.fillText('No heat bath (Q = 0)', cylL + cylW / 2, cylT + cylH + 18);
      }

      // Temperature display
      ctxPE.fillStyle = COLORS.text; ctxPE.font = FONT; ctxPE.textAlign = 'center';
      ctxPE.fillText('T = ' + T_gas.toFixed(2), cylL + (pistonPx - cylL) / 2, cylT + cylH / 2 + 5);

      // Labels
      ctxPE.fillStyle = COLORS.textDim; ctxPE.font = FONT_SM; ctxPE.textAlign = 'left';
      ctxPE.fillText('V = ' + pistonX.toFixed(2) + ' V₀', cylL, cylT - 8);

      // Right: PV diagram
      const ox = 290, oy = 30, pw = WPE - ox - 30, ph = HPE - 80;
      drawAxes(ctxPE, ox, oy, pw, ph, {xLabel: 'Volume V', yLabel: 'Pressure P'});

      // Plot PV curve up to current position
      const V0 = 0.3;
      ctxPE.strokeStyle = mode === 'isothermal' ? COLORS.blue : COLORS.red;
      ctxPE.lineWidth = 2.5;
      ctxPE.beginPath();
      for (let i = 0; i <= 200; i++) {
        const v = V0 + (i / 200) * (pistonX - V0);
        let P;
        if (mode === 'isothermal') {
          P = T0 / v; // PV = NkT, with NkT = T0 * V0
        } else {
          P = T0 * Math.pow(V0, gamma) / Math.pow(v, gamma);
        }
        const px = ox + (v / 1.0) * pw;
        const py = oy + ph * (1 - P / (T0 / V0 * 1.1));
        if (py < oy || py > oy + ph) continue;
        if (i === 0) ctxPE.moveTo(px, py); else ctxPE.lineTo(px, py);
      }
      ctxPE.stroke();

      // Shade work area
      ctxPE.fillStyle = mode === 'isothermal' ? 'rgba(79,195,247,0.2)' : 'rgba(239,83,80,0.2)';
      ctxPE.beginPath();
      ctxPE.moveTo(ox + (V0 / 1.0) * pw, oy + ph);
      for (let i = 0; i <= 200; i++) {
        const v = V0 + (i / 200) * (pistonX - V0);
        let P;
        if (mode === 'isothermal') { P = T0 / v; } else { P = T0 * Math.pow(V0, gamma) / Math.pow(v, gamma); }
        const px = ox + (v / 1.0) * pw;
        const py = oy + ph * (1 - P / (T0 / V0 * 1.1));
        if (py >= oy && py <= oy + ph) ctxPE.lineTo(px, py);
      }
      ctxPE.lineTo(ox + (pistonX / 1.0) * pw, oy + ph);
      ctxPE.closePath();
      ctxPE.fill();

      // Work value
      let W;
      if (mode === 'isothermal') {
        W = T0 * V0 * Math.log(pistonX / V0);
      } else {
        W = T0 * Math.pow(V0, gamma) / (1 - gamma) * (Math.pow(pistonX, 1 - gamma) - Math.pow(V0, 1 - gamma));
      }
      ctxPE.fillStyle = COLORS.green; ctxPE.font = FONT; ctxPE.textAlign = 'left';
      ctxPE.fillText('W = ∫PdV = ' + W.toFixed(3), ox + 5, oy + ph + 25);

      ctxPE.fillStyle = COLORS.text; ctxPE.font = FONT_LG; ctxPE.textAlign = 'left';
      ctxPE.fillText(mode === 'isothermal' ? 'Isothermal Expansion' : 'Adiabatic Expansion', ox + 5, oy - 8);
    }

    function animatePiston() {
      if (!expanding) return;
      pistonX += 0.003;
      if (pistonX >= 0.95) { pistonX = 0.95; expanding = false; }
      const mode = modeSelect?.value || 'isothermal';
      if (mode === 'adiabatic') {
        T_gas = T0 * Math.pow(0.3 / pistonX, gamma - 1);
      }
      drawPiston();
      if (expanding) activeAnimations['piston'] = requestAnimationFrame(animatePiston);
    }

    expandBtn?.addEventListener('click', () => {
      if (!expanding) { expanding = true; animatePiston(); }
    });
    resetBtnPE?.addEventListener('click', () => {
      expanding = false;
      if (activeAnimations['piston']) cancelAnimationFrame(activeAnimations['piston']);
      pistonX = 0.3; T_gas = T0;
      drawPiston();
    });
    modeSelect?.addEventListener('change', () => {
      expanding = false;
      if (activeAnimations['piston']) cancelAnimationFrame(activeAnimations['piston']);
      pistonX = 0.3; T_gas = T0;
      drawPiston();
    });
    drawPiston();
  }

  // ----- Brownian Ratchet -----
  const cBR = document.getElementById('vis-ratchet');
  if (cBR) {
    const {ctx: ctxBR, W: WBR, H: HBR} = setupCanvas(cBR);
    const t1Slider = document.getElementById('ratchet-t1');
    const t2Slider = document.getElementById('ratchet-t2');
    const startBtnR = document.getElementById('ratchet-start');
    const resetBtnR = document.getElementById('ratchet-reset');

    let ratchetAngle = 0;
    let netRotation = 0;
    let rRunning = false;
    const nTeeth = 12;
    const toothAngle = (2 * Math.PI) / nTeeth;

    // Gas particles for both chambers
    const gasParticlesRatchet = [];
    const gasParticlesVane = [];
    const nGasParticles = 30;

    // Layout: [Ratchet+Pawl T₂] --- axle --- [Vane T₁] --- thread --- [Weight]
    const boxW = 170, boxH = HBR - 50;
    const ratchetBox = { x: 15, y: 25, w: boxW, h: boxH };
    const vaneBox = { x: 275, y: 25, w: boxW, h: boxH };
    const rr = 35; // ratchet inner radius
    const rcx0 = ratchetBox.x + boxW / 2;  // ratchet center x
    const vcx0 = vaneBox.x + boxW / 2;  // vane center x
    const cy0 = HBR / 2; // shared center y

    function tempToColor(T) {
      const t = Math.max(0, Math.min(1, (T - 200) / 400));
      const r = Math.round(80 + 175 * t);
      const g = Math.round(120 + 80 * Math.max(0, 0.5 - Math.abs(t - 0.5)) * 2);
      const b = Math.round(235 - 195 * t);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function tempToSpeed(T) {
      // Near-stopped at 200K (~0.15), very fast at 600K (~3.0)
      return 0.15 + Math.pow((T - 200) / 400, 1.3) * 2.85;
    }

    function initGasParticles(arr, box) {
      arr.length = 0;
      for (let i = 0; i < nGasParticles; i++) {
        const angle = Math.random() * 2 * Math.PI;
        arr.push({
          x: box.x + 15 + Math.random() * (box.w - 30),
          y: box.y + 15 + Math.random() * (box.h - 30),
          vx: Math.cos(angle),
          vy: Math.sin(angle),
          r: 2.5
        });
      }
    }

    initGasParticles(gasParticlesRatchet, ratchetBox);
    initGasParticles(gasParticlesVane, vaneBox);

    function updateGasParticles(arr, box, T) {
      const speed = tempToSpeed(T);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const mechRadius = 48;

      arr.forEach(p => {
        p.x += p.vx * speed;
        p.y += p.vy * speed;

        if (p.x < box.x + p.r + 2) { p.vx = Math.abs(p.vx); p.x = box.x + p.r + 2; }
        if (p.x > box.x + box.w - p.r - 2) { p.vx = -Math.abs(p.vx); p.x = box.x + box.w - p.r - 2; }
        if (p.y < box.y + p.r + 2) { p.vy = Math.abs(p.vy); p.y = box.y + p.r + 2; }
        if (p.y > box.y + box.h - p.r - 2) { p.vy = -Math.abs(p.vy); p.y = box.y + box.h - p.r - 2; }

        // Bounce off central mechanism
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mechRadius) {
          const nx = dx / dist, ny = dy / dist;
          p.x = cx + nx * mechRadius;
          p.y = cy + ny * mechRadius;
          const dot = p.vx * nx + p.vy * ny;
          p.vx -= 2 * dot * nx;
          p.vy -= 2 * dot * ny;
        }

        if (Math.random() < 0.02) {
          const a = Math.random() * 2 * Math.PI;
          p.vx = Math.cos(a);
          p.vy = Math.sin(a);
        }
      });
    }

    function drawGasParticles(arr, T) {
      const col = tempToColor(T);
      const speed = tempToSpeed(T);
      const glowAlpha = Math.min(0.6, speed / 4);
      ctxBR.fillStyle = col;
      arr.forEach(p => {
        ctxBR.beginPath();
        ctxBR.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctxBR.fill();
        if (T > 350) {
          ctxBR.save();
          ctxBR.globalAlpha = glowAlpha;
          ctxBR.beginPath();
          ctxBR.arc(p.x, p.y, p.r + 2, 0, 2 * Math.PI);
          ctxBR.fill();
          ctxBR.restore();
        }
      });
    }

    function thermalVibration(T) {
      const amplitude = Math.max(0, (T - 300) / 300) * 1.5;
      return (Math.random() - 0.5) * amplitude;
    }

    // Pawl: long straight flexible metal strip bolted to top of right wall
    const pawlAnchorX = ratchetBox.x + ratchetBox.w;
    const pawlAnchorY = ratchetBox.y + 12;

    function toothSurfaceRadius(labAngle) {
      let frameAngle = labAngle - ratchetAngle;
      frameAngle = ((frameAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const frac = (frameAngle % toothAngle) / toothAngle;
      if (frac < 0.8) {
        return rr + 10 * (frac / 0.8);
      } else {
        return rr + 10 * (1 - (frac - 0.8) / 0.2);
      }
    }

    function drawRatchet() {
      clearCanvas(ctxBR, WBR, HBR);
      const T1 = parseFloat(t1Slider?.value || 400); // vane temperature
      const T2 = parseFloat(t2Slider?.value || 400); // ratchet temperature
      const maxT = Math.max(T1, T2);

      const vibX = thermalVibration(maxT);
      const vibY = thermalVibration(maxT);

      // === LEFT: Ratchet chamber (T₂) ===
      const bgR = tempToColor(T2);
      ctxBR.fillStyle = bgR.replace('rgb', 'rgba').replace(')', ',0.08)');
      ctxBR.fillRect(ratchetBox.x, ratchetBox.y, ratchetBox.w, ratchetBox.h);
      ctxBR.strokeStyle = COLORS.axis; ctxBR.lineWidth = 1;
      ctxBR.strokeRect(ratchetBox.x, ratchetBox.y, ratchetBox.w, ratchetBox.h);
      drawGasParticles(gasParticlesRatchet, T2);
      ctxBR.fillStyle = COLORS.textDim; ctxBR.font = FONT_SM; ctxBR.textAlign = 'center';
      ctxBR.fillText('T₂ = ' + T2 + ' K', rcx0, HBR - 5);

      // Ratchet gear (sawtooth)
      const rcx = rcx0 + vibX, rcy = cy0 + vibY;
      ctxBR.save();
      ctxBR.translate(rcx, rcy);
      ctxBR.rotate(ratchetAngle);
      ctxBR.beginPath();
      for (let i = 0; i < nTeeth; i++) {
        const a1 = (i / nTeeth) * 2 * Math.PI;
        const a2 = ((i + 0.8) / nTeeth) * 2 * Math.PI;
        const a3 = ((i + 1) / nTeeth) * 2 * Math.PI;
        ctxBR.lineTo(rr * Math.cos(a1), rr * Math.sin(a1));
        ctxBR.lineTo((rr + 10) * Math.cos(a2), (rr + 10) * Math.sin(a2));
        ctxBR.lineTo(rr * Math.cos(a3), rr * Math.sin(a3));
      }
      ctxBR.closePath();
      ctxBR.fillStyle = 'rgba(79,195,247,0.1)';
      ctxBR.fill();
      ctxBR.strokeStyle = COLORS.blue; ctxBR.lineWidth = 2;
      ctxBR.stroke();
      ctxBR.fillStyle = COLORS.textDim;
      ctxBR.beginPath(); ctxBR.arc(0, 0, 5, 0, 2 * Math.PI); ctxBR.fill();
      ctxBR.restore();

      // === PAWL: long straight flexible metal strip bolted to wall ===
      const pawlVibX = thermalVibration(T2) * 0.5;
      const pawlVibY = thermalVibration(T2) * 0.5;
      // Anchor bolted to top of right wall
      const ancX = pawlAnchorX + vibX;
      const ancY = pawlAnchorY + vibY;
      // Direction from anchor toward ratchet center
      const toRcDx = rcx - ancX, toRcDy = rcy - ancY;
      const toRcAngle = Math.atan2(toRcDy, toRcDx);
      const ancToCenterDist = Math.sqrt(toRcDx * toRcDx + toRcDy * toRcDy);
      // Tooth surface radius at the angle where the strip meets the gear
      const surfR = toothSurfaceRadius(toRcAngle);
      // Strip length: from anchor to the tooth surface
      const stripLen = ancToCenterDist - surfR;
      // Tip position when strip is straight (no deflection)
      const straightTipX = ancX + stripLen * Math.cos(toRcAngle);
      const straightTipY = ancY + stripLen * Math.sin(toRcAngle);
      // Deflection amount: tooth pushes tip perpendicular to the strip
      const deflection = (surfR - rr) / 10; // 0 at valley, 1 at peak
      // Perpendicular to strip direction (pointing away from center)
      const perpAngle = toRcAngle - Math.PI / 2;
      // Tip deflects outward, cantilever-style: most bend near the tip
      const tipDeflect = deflection * 14 + pawlVibX * 2;
      const tipX = straightTipX + tipDeflect * Math.cos(perpAngle);
      const tipY = straightTipY + tipDeflect * Math.sin(perpAngle);
      // Cantilever bends mostly near tip: use cubic bezier
      // cp1 near anchor (barely moves), cp2 near tip (deflects most)
      const cp1X = ancX + stripLen * 0.35 * Math.cos(toRcAngle) + tipDeflect * 0.05 * Math.cos(perpAngle);
      const cp1Y = ancY + stripLen * 0.35 * Math.sin(toRcAngle) + tipDeflect * 0.05 * Math.sin(perpAngle);
      const cp2X = ancX + stripLen * 0.75 * Math.cos(toRcAngle) + tipDeflect * 0.6 * Math.cos(perpAngle);
      const cp2Y = ancY + stripLen * 0.75 * Math.sin(toRcAngle) + tipDeflect * 0.6 * Math.sin(perpAngle);

      // Draw the metal strip
      ctxBR.strokeStyle = '#9ab09c'; ctxBR.lineWidth = 4;
      ctxBR.lineCap = 'round';
      ctxBR.beginPath();
      ctxBR.moveTo(ancX, ancY);
      ctxBR.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tipX, tipY);
      ctxBR.stroke();
      // Metallic highlight along the strip
      ctxBR.strokeStyle = 'rgba(200,230,200,0.35)'; ctxBR.lineWidth = 1.5;
      ctxBR.beginPath();
      ctxBR.moveTo(ancX, ancY);
      ctxBR.bezierCurveTo(
        cp1X - Math.cos(perpAngle), cp1Y - Math.sin(perpAngle),
        cp2X - Math.cos(perpAngle), cp2Y - Math.sin(perpAngle),
        tipX, tipY);
      ctxBR.stroke();
      ctxBR.lineCap = 'butt';
      // Anchor mount: small bracket bolted to wall
      ctxBR.fillStyle = '#8a9a8c';
      const mountPerp = toRcAngle + Math.PI / 2;
      ctxBR.save();
      ctxBR.translate(ancX, ancY);
      ctxBR.rotate(toRcAngle);
      ctxBR.fillRect(-4, -6, 5, 12);
      // Bolt dots
      ctxBR.fillStyle = 'rgba(255,255,255,0.4)';
      ctxBR.beginPath(); ctxBR.arc(-2, -3, 1.5, 0, 2 * Math.PI); ctxBR.fill();
      ctxBR.beginPath(); ctxBR.arc(-2, 3, 1.5, 0, 2 * Math.PI); ctxBR.fill();
      ctxBR.restore();

      // === AXLE: connects ratchet hub to vane hub ===
      const vcx = vcx0 + vibX, vcy = cy0 + vibY;
      ctxBR.strokeStyle = COLORS.textDim; ctxBR.lineWidth = 3;
      ctxBR.beginPath();
      ctxBR.moveTo(rcx, rcy);
      ctxBR.lineTo(vcx, vcy);
      ctxBR.stroke();
      ctxBR.strokeStyle = 'rgba(255,255,255,0.15)'; ctxBR.lineWidth = 1;
      ctxBR.beginPath();
      ctxBR.moveTo(rcx, rcy - 1);
      ctxBR.lineTo(vcx, vcy - 1);
      ctxBR.stroke();

      // === WEIGHT: hangs between the two chambers from the axle ===
      const gapMidX = Math.round((ratchetBox.x + ratchetBox.w + vaneBox.x) / 2) + vibX;
      const axleY = cy0 + vibY;
      // Spool on axle
      ctxBR.fillStyle = COLORS.textDim;
      ctxBR.fillRect(gapMidX - 4, axleY - 5, 8, 10);
      ctxBR.strokeStyle = COLORS.axis; ctxBR.lineWidth = 1;
      ctxBR.strokeRect(gapMidX - 5, axleY - 7, 10, 3);
      ctxBR.strokeRect(gapMidX - 5, axleY + 4, 10, 3);
      // Weight Y: goes up as netRotation increases, clamped to not go above axle+14
      const weightBottom = HBR - 18;
      const weightTop = axleY + 14;
      const weightY = Math.max(weightTop, Math.min(weightBottom, axleY + 60 - netRotation * 8));
      // Thread from spool to weight
      ctxBR.strokeStyle = COLORS.textDim; ctxBR.lineWidth = 1;
      ctxBR.beginPath();
      ctxBR.moveTo(gapMidX, axleY + 7);
      ctxBR.lineTo(gapMidX, weightY);
      ctxBR.stroke();
      // Weight block
      ctxBR.fillStyle = COLORS.purple;
      ctxBR.fillRect(gapMidX - 10, weightY, 20, 16);
      ctxBR.fillStyle = COLORS.text; ctxBR.font = FONT_SM; ctxBR.textAlign = 'center';
      ctxBR.fillText('m', gapMidX, weightY + 12);
      // Label and counter above the weight
      const labelY = Math.min(weightY - 6, axleY + 30);
      ctxBR.fillStyle = COLORS.textDim; ctxBR.font = FONT_SM; ctxBR.textAlign = 'center';
      ctxBR.fillText(netRotation.toFixed(1) + ' rad', gapMidX, labelY);

      // === MIDDLE: Vane chamber (T₁) ===
      const bgV = tempToColor(T1);
      ctxBR.fillStyle = bgV.replace('rgb', 'rgba').replace(')', ',0.08)');
      ctxBR.fillRect(vaneBox.x, vaneBox.y, vaneBox.w, vaneBox.h);
      ctxBR.strokeStyle = COLORS.axis; ctxBR.lineWidth = 1;
      ctxBR.strokeRect(vaneBox.x, vaneBox.y, vaneBox.w, vaneBox.h);
      drawGasParticles(gasParticlesVane, T1);
      ctxBR.fillStyle = COLORS.textDim; ctxBR.font = FONT_SM; ctxBR.textAlign = 'center';
      ctxBR.fillText('T₁ = ' + T1 + ' K', vcx0, HBR - 5);

      // Vane (paddle wheel)
      ctxBR.save();
      ctxBR.translate(vcx, vcy);
      ctxBR.rotate(ratchetAngle);
      for (let i = 0; i < 4; i++) {
        ctxBR.rotate(Math.PI / 2);
        ctxBR.fillStyle = COLORS.orange;
        ctxBR.globalAlpha = 0.9;
        ctxBR.fillRect(-3, 0, 6, 42);
      }
      ctxBR.globalAlpha = 1;
      ctxBR.fillStyle = COLORS.textDim;
      ctxBR.beginPath(); ctxBR.arc(0, 0, 6, 0, 2 * Math.PI); ctxBR.fill();
      ctxBR.restore();

      // === Status text (above gap, centered) ===
      const gapCenterX = Math.round((ratchetBox.x + ratchetBox.w + vaneBox.x) / 2);
      const balanced = Math.abs(T1 - T2) < 15;
      ctxBR.fillStyle = balanced ? COLORS.red : COLORS.green;
      ctxBR.font = FONT_SM; ctxBR.textAlign = 'center';
      if (balanced) {
        ctxBR.fillText('No net work', gapCenterX, ratchetBox.y + 14);
      } else if (T1 > T2) {
        ctxBR.fillText('Lifts weight', gapCenterX, ratchetBox.y + 14);
      } else {
        ctxBR.fillText('Drops weight', gapCenterX, ratchetBox.y + 14);
      }

      document.getElementById('ratchet-t1-val')?.replaceChildren(document.createTextNode(T1));
      document.getElementById('ratchet-t2-val')?.replaceChildren(document.createTextNode(T2));
    }

    function animateRatchet() {
      if (!rRunning) return;
      const T1 = parseFloat(t1Slider?.value || 400);
      const T2 = parseFloat(t2Slider?.value || 400);
      const eps = 1.0;
      const kB = 1 / 300;
      const pFwd = Math.exp(-eps / (kB * T1));
      const pBwd = Math.exp(-eps / (kB * T2));
      const net = (pFwd - pBwd) * 0.5;
      const noise = (Math.random() - 0.5) * 0.08;
      ratchetAngle += net + noise;
      netRotation += net;

      updateGasParticles(gasParticlesRatchet, ratchetBox, T2);
      updateGasParticles(gasParticlesVane, vaneBox, T1);

      drawRatchet();
      activeAnimations['ratchet'] = requestAnimationFrame(animateRatchet);
    }

    startBtnR?.addEventListener('click', () => {
      if (!rRunning) { rRunning = true; animateRatchet(); }
    });
    resetBtnR?.addEventListener('click', () => {
      rRunning = false;
      if (activeAnimations['ratchet']) cancelAnimationFrame(activeAnimations['ratchet']);
      ratchetAngle = 0; netRotation = 0;
      initGasParticles(gasParticlesRatchet, ratchetBox);
      initGasParticles(gasParticlesVane, vaneBox);
      drawRatchet();
    });
    t1Slider?.addEventListener('input', drawRatchet);
    t2Slider?.addEventListener('input', drawRatchet);
    drawRatchet();
  }
}


// =============================================================================
// CH6: Entropy - Maxwell's Demon
// =============================================================================
function initCh6Vis() {
  const c = document.getElementById('vis-demon');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  let particles = [];
  let demonActive = false;
  let running = false;
  const wallX = W / 2;

  function initParticles() {
    particles = [];
    for (let i = 0; i < 60; i++) {
      const speed = 1 + Math.random() * 3;
      const angle = Math.random() * 2 * Math.PI;
      particles.push({
        x: Math.random() * W,
        y: 30 + Math.random() * (H - 60),
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        fast: speed > 2,
        r: 4
      });
    }
  }

  function stepDemon() {
    const doorY1 = H / 2 - 30;
    const doorY2 = H / 2 + 30;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < p.r) { p.vx = Math.abs(p.vx); p.x = p.r; }
      if (p.x > W - p.r) { p.vx = -Math.abs(p.vx); p.x = W - p.r; }
      if (p.y < p.r) { p.vy = Math.abs(p.vy); p.y = p.r; }
      if (p.y > H - p.r) { p.vy = -Math.abs(p.vy); p.y = H - p.r; }

      const nearDoor = p.y > doorY1 && p.y < doorY2;

      if (demonActive) {
        if (Math.abs(p.x - wallX) < p.r + 2) {
          if (nearDoor) {
            if (p.fast && p.vx > 0) { /* let through */ }
            else if (!p.fast && p.vx < 0) { /* let through */ }
            else {
              if (p.x < wallX) { p.vx = -Math.abs(p.vx); p.x = wallX - p.r - 2; }
              else { p.vx = Math.abs(p.vx); p.x = wallX + p.r + 2; }
            }
          } else {
            if (p.x < wallX) { p.vx = -Math.abs(p.vx); p.x = wallX - p.r - 2; }
            else { p.vx = Math.abs(p.vx); p.x = wallX + p.r + 2; }
          }
        }
      } else {
        if (Math.abs(p.x - wallX) < p.r + 2 && !nearDoor) {
          if (p.x < wallX) { p.vx = -Math.abs(p.vx); p.x = wallX - p.r - 2; }
          else { p.vx = Math.abs(p.vx); p.x = wallX + p.r + 2; }
        }
      }
    });
  }

  function drawDemon() {
    clearCanvas(ctx, W, H);

    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    const doorY1 = H / 2 - 30;
    const doorY2 = H / 2 + 30;
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(wallX, 0); ctx.lineTo(wallX, doorY1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wallX, doorY2); ctx.lineTo(wallX, H); ctx.stroke();

    ctx.strokeStyle = demonActive ? COLORS.green : '#95a5a6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(wallX, doorY1); ctx.lineTo(wallX, doorY2); ctx.stroke();
    ctx.setLineDash([]);

    if (demonActive) {
      ctx.fillStyle = COLORS.purple;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('\u{1F47F}', wallX, doorY1 - 8);
    }

    particles.forEach(p => {
      ctx.fillStyle = p.fast ? COLORS.red : COLORS.blue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fill();
    });

    let leftKE = 0, rightKE = 0, leftN = 0, rightN = 0;
    particles.forEach(p => {
      const ke = 0.5 * (p.vx ** 2 + p.vy ** 2);
      if (p.x < wallX) { leftKE += ke; leftN++; }
      else { rightKE += ke; rightN++; }
    });
    const TL = leftN > 0 ? (leftKE / leftN).toFixed(2) : '0';
    const TR = rightN > 0 ? (rightKE / rightN).toFixed(2) : '0';

    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_SM;
    ctx.textAlign = 'center';
    ctx.fillText('Left: \u27E8KE\u27E9 = ' + TL, wallX / 2, 20);
    ctx.fillText('Right: \u27E8KE\u27E9 = ' + TR, wallX + (W - wallX) / 2, 20);

    ctx.fillStyle = COLORS.blue; ctx.fillText('\u25CF slow', 60, H - 15);
    ctx.fillStyle = COLORS.red; ctx.fillText('\u25CF fast', 160, H - 15);
  }

  function animate() {
    if (!running) return;
    stepDemon();
    drawDemon();
    activeAnimations['demon'] = requestAnimationFrame(animate);
  }

  document.getElementById('demon-start')?.addEventListener('click', function () {
    running = !running;
    this.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  document.getElementById('demon-toggle')?.addEventListener('click', function () {
    demonActive = !demonActive;
    this.textContent = demonActive ? 'Disable Demon' : 'Enable Demon';
  });

  document.getElementById('demon-reset')?.addEventListener('click', () => {
    running = false;
    demonActive = false;
    const startBtn = document.getElementById('demon-start');
    const toggleBtn = document.getElementById('demon-toggle');
    if (startBtn) startBtn.textContent = 'Start';
    if (toggleBtn) toggleBtn.textContent = 'Enable Demon';
    initParticles();
    drawDemon();
  });

  initParticles();
  drawDemon();

  // ----- Letter Frequency Bar Chart -----
  const cLF = document.getElementById('vis-letterfreq');
  if (cLF) {
    const lf = setupCanvas(cLF);
    const ctxLF = lf.ctx, WLF = lf.W, HLF = lf.H;

    const letters = 'ETAOINSRHLDCUMFPGWYBVKXJQZ'.split('');
    const freqs = [12.7,9.1,8.2,7.5,7.0,6.7,6.3,6.0,5.3,4.3,4.0,2.8,2.8,2.7,2.4,2.2,2.0,2.0,1.9,1.5,1.0,0.8,0.2,0.2,0.1,0.1];
    const probs = freqs.map(f => f / 100);
    let Hshan = 0;
    probs.forEach(p => { if (p > 0) Hshan -= p * Math.log2(p); });

    const oxLF = 45, oyLF = 30;
    const plotWLF = WLF - oxLF - 20;
    const plotHLF = HLF - oyLF - 55;
    const barW = plotWLF / letters.length - 2;
    const maxFreq = 14;
    let hoverIdx = -1;

    function drawLetterFreq() {
      clearCanvas(ctxLF, WLF, HLF);
      ctxLF.strokeStyle = COLORS.axis; ctxLF.lineWidth = 1;
      ctxLF.beginPath(); ctxLF.moveTo(oxLF, oyLF); ctxLF.lineTo(oxLF, oyLF + plotHLF); ctxLF.lineTo(oxLF + plotWLF, oyLF + plotHLF); ctxLF.stroke();

      // Y ticks + grid
      ctxLF.fillStyle = COLORS.textDim; ctxLF.font = '10px Inter, system-ui, sans-serif'; ctxLF.textAlign = 'right';
      for (let v = 0; v <= maxFreq; v += 2) {
        const py = oyLF + plotHLF - (v / maxFreq) * plotHLF;
        ctxLF.fillText(v.toString(), oxLF - 4, py + 3);
        ctxLF.strokeStyle = COLORS.grid; ctxLF.beginPath(); ctxLF.moveTo(oxLF, py); ctxLF.lineTo(oxLF + plotWLF, py); ctxLF.stroke();
      }

      // Bars
      letters.forEach((letter, i) => {
        const x = oxLF + i * (barW + 2) + 1;
        const bH = (freqs[i] / maxFreq) * plotHLF;
        const y = oyLF + plotHLF - bH;
        ctxLF.fillStyle = i === hoverIdx ? COLORS.yellow : COLORS.blue;
        ctxLF.globalAlpha = i === hoverIdx ? 1.0 : 0.75;
        ctxLF.fillRect(x, y, barW, bH);
        ctxLF.globalAlpha = 1.0;
        ctxLF.fillStyle = COLORS.text; ctxLF.font = '10px Inter, system-ui, sans-serif'; ctxLF.textAlign = 'center';
        ctxLF.fillText(letter, x + barW / 2, oyLF + plotHLF + 12);
      });

      // Hover tooltip
      if (hoverIdx >= 0 && hoverIdx < letters.length) {
        const p = probs[hoverIdx];
        const bits = p > 0 ? -Math.log2(p) : 0;
        let tip = letters[hoverIdx] + ': P = ' + (p * 100).toFixed(1) + '%,  -log\u2082P = ' + bits.toFixed(2) + ' bits';
        if (userFreqs) tip += '  |  Your text: ' + userFreqs[hoverIdx].toFixed(1) + '%';
        ctxLF.fillStyle = COLORS.yellow; ctxLF.font = FONT; ctxLF.textAlign = 'left';
        ctxLF.fillText(tip, oxLF + 5, oyLF - 8);
      }

      // Y-axis label
      ctxLF.fillStyle = COLORS.text; ctxLF.font = FONT_SM;
      ctxLF.save(); ctxLF.translate(oxLF - 30, oyLF + plotHLF / 2); ctxLF.rotate(-Math.PI / 2); ctxLF.textAlign = 'center'; ctxLF.fillText('Frequency (%)', 0, 0); ctxLF.restore();

      // Shannon entropy
      ctxLF.fillStyle = COLORS.green; ctxLF.font = FONT; ctxLF.textAlign = 'right';
      ctxLF.fillText('H = ' + Hshan.toFixed(2) + ' bits/letter', WLF - 10, oyLF - 8);
      ctxLF.fillStyle = COLORS.textDim; ctxLF.font = FONT_SM;
      ctxLF.fillText('Uniform: log\u2082(26) = ' + Math.log2(26).toFixed(2) + ' bits  |  ASCII: 7 bits', WLF - 10, oyLF + 8);
    }

    // User text input for frequency comparison
    const textInput = document.getElementById('letterfreq-text');
    const userEntropySpan = document.getElementById('letterfreq-user-entropy');
    let userFreqs = null; // array of 26 frequencies (%) indexed same as letters[]

    function computeUserFreqs(text) {
      const upper = text.toUpperCase();
      const counts = {};
      let total = 0;
      for (const ch of upper) {
        if (ch >= 'A' && ch <= 'Z') {
          counts[ch] = (counts[ch] || 0) + 1;
          total++;
        }
      }
      if (total === 0) return null;
      const result = letters.map(l => ((counts[l] || 0) / total) * 100);
      // Compute Shannon entropy of user text
      let Huser = 0;
      result.forEach(f => { const p = f / 100; if (p > 0) Huser -= p * Math.log2(p); });
      userEntropySpan.textContent = 'Your text: H = ' + Huser.toFixed(2) + ' bits/letter (' + total + ' letters)';
      return result;
    }

    if (textInput) {
      textInput.addEventListener('input', () => {
        userFreqs = computeUserFreqs(textInput.value);
        if (!userFreqs) userEntropySpan.textContent = '';
        drawLetterFreq();
      });
    }

    // Extend drawLetterFreq to overlay user frequency indicators
    const origDraw = drawLetterFreq;
    drawLetterFreq = function() {
      origDraw();
      if (!userFreqs) return;
      // Draw diamond markers for user frequencies
      letters.forEach((letter, i) => {
        const x = oxLF + i * (barW + 2) + 1 + barW / 2;
        const bH = (userFreqs[i] / maxFreq) * plotHLF;
        const y = oyLF + plotHLF - bH;
        // Diamond marker
        ctxLF.fillStyle = COLORS.orange;
        ctxLF.beginPath();
        ctxLF.moveTo(x, y - 5);
        ctxLF.lineTo(x + 4, y);
        ctxLF.lineTo(x, y + 5);
        ctxLF.lineTo(x - 4, y);
        ctxLF.closePath();
        ctxLF.fill();
      });
      // Legend
      ctxLF.fillStyle = COLORS.orange; ctxLF.font = FONT_SM; ctxLF.textAlign = 'left';
      // Draw small diamond in legend
      const lx = oxLF + 5, ly = oyLF + plotHLF + 30;
      ctxLF.beginPath(); ctxLF.moveTo(lx, ly - 4); ctxLF.lineTo(lx + 3, ly); ctxLF.lineTo(lx, ly + 4); ctxLF.lineTo(lx - 3, ly); ctxLF.closePath(); ctxLF.fill();
      ctxLF.fillText(' Your text', lx + 5, ly + 4);
    };

    cLF.addEventListener('mousemove', (e) => {
      const rect = cLF.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const idx = Math.floor((mx - oxLF) / (barW + 2));
      hoverIdx = (idx >= 0 && idx < letters.length) ? idx : -1;
      drawLetterFreq();
    });
    cLF.addEventListener('mouseleave', () => { hoverIdx = -1; drawLetterFreq(); });
    drawLetterFreq();
  }

  // ----- Free Expansion -----
  const cFE = document.getElementById('vis-free-expansion');
  if (cFE) {
    const {ctx: ctxFE, W: WFE, H: HFE} = setupCanvas(cFE);
    const feToggleBtn = document.getElementById('freeexp-toggle');

    const NP = 60;
    let feParticles = [];
    let fePartitioned = true;

    function initFE() {
      fePartitioned = true;
      if (feToggleBtn) feToggleBtn.textContent = 'Remove Partition';
      feParticles = [];
      const r = 3;
      const xMin = 30 + r, yMin = 30 + r, yMax = HFE - 30 - r;
      const midX = WFE / 2;
      for (let i = 0; i < NP; i++) {
        feParticles.push({
          x: xMin + Math.random() * (midX - r - xMin),
          y: yMin + Math.random() * (yMax - yMin),
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120,
          currentSide: 'left'
        });
      }
    }

    function drawFreeExp() {
      clearCanvas(ctxFE, WFE, HFE);

      // Container walls
      ctxFE.strokeStyle = COLORS.axis; ctxFE.lineWidth = 2;
      ctxFE.strokeRect(30, 30, WFE - 60, HFE - 60);

      // Partition
      const midX = WFE / 2;
      if (fePartitioned) {
        ctxFE.strokeStyle = COLORS.orange; ctxFE.lineWidth = 3;
        ctxFE.beginPath(); ctxFE.moveTo(midX, 30); ctxFE.lineTo(midX, HFE - 30); ctxFE.stroke();
      }

      // Draw particles
      for (const p of feParticles) {
        ctxFE.beginPath(); ctxFE.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctxFE.fillStyle = COLORS.blue; ctxFE.fill();
      }

      // Counts when partitioned
      if (fePartitioned) {
        const nLeft = feParticles.filter(p => p.currentSide === 'left').length;
        const nRight = feParticles.filter(p => p.currentSide === 'right').length;
        ctxFE.fillStyle = COLORS.textDim; ctxFE.font = FONT; ctxFE.textAlign = 'center';
        ctxFE.fillText(nLeft, WFE / 4, HFE - 10);
        ctxFE.fillText(nRight, 3 * WFE / 4, HFE - 10);
      }

      // Entropy display
      const Omega = fePartitioned ? 'Ω₀' : '2^N · Ω₀';
      const dS = fePartitioned ? 'ΔS = 0' : 'ΔS = Nk_B ln 2';
      ctxFE.fillStyle = COLORS.green; ctxFE.font = FONT; ctxFE.textAlign = 'left';
      ctxFE.fillText('Ω = ' + Omega + '   |   ' + dS, 40, 22);

      // Title
      ctxFE.fillStyle = COLORS.text; ctxFE.font = FONT_LG; ctxFE.textAlign = 'right';
      ctxFE.fillText('Free Expansion', WFE - 40, 22);
    }

    function animateFE() {
      const dt = 0.016;
      const r = 3;
      const xMin = 30 + r, xMax = WFE - 30 - r, yMin = 30 + r, yMax = HFE - 30 - r;
      const midX = WFE / 2;
      for (const p of feParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < xMin) { p.x = xMin; p.vx = Math.abs(p.vx); }
        if (p.x > xMax) { p.x = xMax; p.vx = -Math.abs(p.vx); }
        if (fePartitioned) {
          if (p.currentSide === 'left' && p.x > midX - r) { p.x = midX - r; p.vx = -Math.abs(p.vx); }
          if (p.currentSide === 'right' && p.x < midX + r) { p.x = midX + r; p.vx = Math.abs(p.vx); }
        }
        if (p.y < yMin) { p.y = yMin; p.vy = Math.abs(p.vy); }
        if (p.y > yMax) { p.y = yMax; p.vy = -Math.abs(p.vy); }
      }
      drawFreeExp();
      activeAnimations['freeexp'] = requestAnimationFrame(animateFE);
    }

    feToggleBtn?.addEventListener('click', () => {
      fePartitioned = !fePartitioned;
      feToggleBtn.textContent = fePartitioned ? 'Remove Partition' : 'Insert Partition';
      if (fePartitioned) {
        const midX = WFE / 2;
        const r = 3;
        for (const p of feParticles) {
          if (p.x >= midX - r && p.x <= midX + r) {
            if (p.x <= midX) { p.x = midX - r - 1; p.vx = -Math.abs(p.vx); }
            else { p.x = midX + r + 1; p.vx = Math.abs(p.vx); }
          }
          p.currentSide = p.x < midX ? 'left' : 'right';
        }
      }
    });
    initFE();
    animateFE();
  }

  // ----- Entropy of Mixing -----
  const cMix = document.getElementById('vis-mixing');
  if (cMix) {
    const {ctx: ctxM, W: WM, H: HM} = setupCanvas(cMix);
    const caseSelect = document.getElementById('mixing-case');
    const toggleBtn = document.getElementById('mixing-toggle');

    const NM = 20; // per side
    let particles = [];
    let partitioned = true;

    // Generate distinct hues for distinguishable particles using golden angle
    function uniqueColor(index) {
      const h = (index * 137.508) % 360; // golden angle ensures no clustering
      return 'hsl(' + h + ', 85%, 58%)';
    }

    function initMixing() {
      partitioned = true;
      if (toggleBtn) toggleBtn.textContent = 'Remove Partition';
      particles = [];
      const r = 4;
      const xMin = 30 + r, xMax = WM - 30 - r, yMin = 30 + r, yMax = HM - 70 - r;
      const midX = WM / 2;
      for (let i = 0; i < NM; i++) {
        particles.push({
          x: xMin + Math.random() * (midX - r - xMin),
          y: yMin + Math.random() * (yMax - yMin),
          vx: (Math.random() - 0.5) * 100,
          vy: (Math.random() - 0.5) * 100,
          species: 'left', currentSide: 'left', colorIndex: i
        });
      }
      for (let i = 0; i < NM; i++) {
        particles.push({
          x: midX + r + Math.random() * (xMax - midX - r),
          y: yMin + Math.random() * (yMax - yMin),
          vx: (Math.random() - 0.5) * 100,
          vy: (Math.random() - 0.5) * 100,
          species: 'right', currentSide: 'right', colorIndex: NM + i
        });
      }
    }

    function getParticleColor(p) {
      const mode = caseSelect?.value || 'distinguishable';
      if (mode === 'distinguishable') {
        return uniqueColor(p.colorIndex);
      } else if (mode === 'identical') {
        return COLORS.green;
      } else {
        return p.species === 'left' ? COLORS.cyan : COLORS.orange;
      }
    }

    function drawMixing() {
      clearCanvas(ctxM, WM, HM);

      // Container
      ctxM.strokeStyle = COLORS.axis; ctxM.lineWidth = 2;
      ctxM.strokeRect(30, 30, WM - 60, HM - 100);

      // Partition
      if (partitioned) {
        ctxM.strokeStyle = COLORS.orange; ctxM.lineWidth = 3;
        ctxM.beginPath(); ctxM.moveTo(WM / 2, 30); ctxM.lineTo(WM / 2, HM - 70); ctxM.stroke();
      }

      // Draw particles
      for (const p of particles) {
        ctxM.beginPath(); ctxM.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctxM.fillStyle = getParticleColor(p); ctxM.fill();
      }

      // Counts when partitioned
      const mode = caseSelect?.value || 'distinguishable';
      const midX = WM / 2;
      if (partitioned) {
        const leftP = particles.filter(p => p.currentSide === 'left');
        const rightP = particles.filter(p => p.currentSide === 'right');
        ctxM.font = FONT; ctxM.textAlign = 'center';
        if (mode === 'different') {
          const leftHe = leftP.filter(p => p.species === 'left').length;
          const leftXe = leftP.filter(p => p.species === 'right').length;
          const rightHe = rightP.filter(p => p.species === 'left').length;
          const rightXe = rightP.filter(p => p.species === 'right').length;
          ctxM.fillStyle = COLORS.cyan;
          ctxM.fillText('He: ' + leftHe, WM / 4, HM - 55);
          ctxM.fillText('He: ' + rightHe, 3 * WM / 4, HM - 55);
          ctxM.fillStyle = COLORS.orange;
          ctxM.fillText('Xe: ' + leftXe, WM / 4, HM - 40);
          ctxM.fillText('Xe: ' + rightXe, 3 * WM / 4, HM - 40);
        } else {
          ctxM.fillStyle = COLORS.textDim;
          ctxM.fillText(leftP.length, WM / 4, HM - 48);
          ctxM.fillText(rightP.length, 3 * WM / 4, HM - 48);
        }
      }

      // Info text
      let dsText = '';
      if (mode === 'identical') {
        dsText = partitioned ? 'ΔS = 0 (partition in)' : 'ΔS = 0 — partition does nothing!';
      } else if (mode === 'distinguishable') {
        dsText = partitioned ? 'ΔS = 0 (separated)' : 'ΔS = 2Nk_B ln 2 > 0';
      } else {
        dsText = partitioned ? 'ΔS = 0 (separated)' : 'ΔS = 2Nk_B ln 2 > 0';
      }

      ctxM.fillStyle = COLORS.green; ctxM.font = FONT; ctxM.textAlign = 'center';
      ctxM.fillText(dsText, WM / 2, HM - 30);

      ctxM.fillStyle = COLORS.text; ctxM.font = FONT_LG; ctxM.textAlign = 'left';
      ctxM.fillText('Entropy of Mixing', 40, 22);
    }

    function animateMix() {
      const dt = 0.016;
      const r = 4;
      const xMin = 30 + r, xMax = WM - 30 - r, yMin = 30 + r, yMax = HM - 70 - r;
      const midX = WM / 2;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < xMin) { p.x = xMin; p.vx = Math.abs(p.vx); }
        if (p.x > xMax) { p.x = xMax; p.vx = -Math.abs(p.vx); }
        if (partitioned) {
          if (p.currentSide === 'left' && p.x > midX - r) { p.x = midX - r; p.vx = -Math.abs(p.vx); }
          if (p.currentSide === 'right' && p.x < midX + r) { p.x = midX + r; p.vx = Math.abs(p.vx); }
        }
        if (p.y < yMin) { p.y = yMin; p.vy = Math.abs(p.vy); }
        if (p.y > yMax) { p.y = yMax; p.vy = -Math.abs(p.vy); }
      }
      drawMixing();
      activeAnimations['mixing'] = requestAnimationFrame(animateMix);
    }

    toggleBtn?.addEventListener('click', () => {
      partitioned = !partitioned;
      toggleBtn.textContent = partitioned ? 'Remove Partition' : 'Insert Partition';
      if (partitioned) {
        const midX = WM / 2;
        const r = 4;
        // Assign side based on current position, nudge particles off the midline
        for (const p of particles) {
          if (p.x >= midX - r && p.x <= midX + r) {
            // Particle is right on the partition — nudge to nearest side
            if (p.x <= midX) { p.x = midX - r - 1; p.vx = -Math.abs(p.vx); }
            else { p.x = midX + r + 1; p.vx = Math.abs(p.vx); }
          }
          p.currentSide = p.x < midX ? 'left' : 'right';
        }
      }
    });
    caseSelect?.addEventListener('change', () => {
      initMixing();
    });
    initMixing();
    animateMix();
  }

  // ----- Szilard Engine -----
  // Physics: single molecule in a box. Insert partition, measure which side
  // molecule is on, slide piston in from the EMPTY side (free — no gas there),
  // remove partition, molecule's thermal motion pushes piston back out → work.
  const cSz = document.getElementById('vis-szilard');
  if (cSz) {
    const {ctx: ctxSz, W: WSz, H: HSz} = setupCanvas(cSz);
    const stepBtn = document.getElementById('szilard-step');
    const resetBtnSz = document.getElementById('szilard-reset');

    const BALL_R = 14;
    const PISTON_H = 10;
    // Steps: 0=free, 1=partition inserted, 2=measured, 3=piston slides to center, 4=partition removed (ball pushes piston back)
    let szStep = 0;
    let moleculeSide; // 'top' or 'bottom' — set when partition inserted
    let molX, molY, molVx, molVy;
    let pistonFaceY;  // y-coord of the piston face (side facing molecule)
    let pistonVel;    // piston velocity from ball hits (step 4 only)
    let pistonSliding; // true while piston animates sliding to center in step 3
    let flashTimer;
    let szAnim = false;

    // Box geometry
    const boxL = 40, boxT = 30;
    const boxW = 180;
    function boxH() { return HSz - 60; }
    function boxB() { return boxT + boxH(); }
    function boxCy() { return boxT + boxH() / 2; }

    function initSzilard() {
      szStep = 0;
      moleculeSide = null;
      const bH = boxH();
      molX = boxL + BALL_R + 10 + Math.random() * (boxW - 2 * BALL_R - 20);
      molY = boxT + BALL_R + 10 + Math.random() * (bH - 2 * BALL_R - 20);
      const speed = 130;
      const angle = Math.random() * 2 * Math.PI;
      molVx = speed * Math.cos(angle);
      molVy = speed * Math.sin(angle);
      pistonFaceY = 0;
      pistonVel = 0;
      pistonSliding = false;
      flashTimer = 0;
    }

    // Where the piston starts (the far wall of the empty side)
    function pistonHomeY() {
      if (moleculeSide === 'top') return boxB(); // piston comes from bottom
      return boxT; // piston comes from top
    }

    // The target: piston slides to the partition line (center)
    function pistonTargetY() {
      return boxCy();
    }

    // How far the piston has traveled from center back toward its home wall
    // (used for work meter in step 4)
    function pistonWorkTravel() {
      if (moleculeSide === 'top') {
        return pistonFaceY - boxCy(); // positive = moved toward boxB (back toward home)
      }
      return boxCy() - pistonFaceY; // positive = moved toward boxT (back toward home)
    }

    function maxPistonTravel() {
      return boxH() / 2 - 4; // nearly back to the wall
    }

    function drawSzilard() {
      clearCanvas(ctxSz, WSz, HSz);
      const bH = boxH();
      const cy = boxCy();
      const bB = boxB();

      // Box
      ctxSz.strokeStyle = COLORS.axis; ctxSz.lineWidth = 2;
      ctxSz.strokeRect(boxL, boxT, boxW, bH);

      // Partition (steps 1–3, removed at step 4)
      if (szStep >= 1 && szStep <= 3) {
        ctxSz.save();
        ctxSz.strokeStyle = COLORS.orange; ctxSz.lineWidth = 3;
        ctxSz.beginPath(); ctxSz.moveTo(boxL, cy); ctxSz.lineTo(boxL + boxW, cy); ctxSz.stroke();
        ctxSz.restore();
      }

      // Measurement highlight (step 2): shade the molecule's half
      if (szStep === 2) {
        ctxSz.fillStyle = 'rgba(102, 187, 106, 0.10)';
        if (moleculeSide === 'top') {
          ctxSz.fillRect(boxL + 1, boxT + 1, boxW - 2, bH / 2 - 1);
        } else {
          ctxSz.fillRect(boxL + 1, cy + 1, boxW - 2, bH / 2 - 2);
        }
      }

      // Piston (step >= 3)
      if (szStep >= 3) {
        const py = pistonFaceY;
        const flash = flashTimer > 0 ? Math.min(1, flashTimer / 8) : 0;
        const cr = Math.round(171 + flash * 84);
        const cg = Math.round(71 + flash * 140);
        const cb = Math.round(188 + flash * 67);
        ctxSz.fillStyle = `rgb(${cr},${cg},${cb})`;

        if (moleculeSide === 'top') {
          // Piston came from bottom. Face is at py, body extends DOWN to boxB.
          // Face (the thick bar the ball hits)
          ctxSz.fillRect(boxL + 2, py, boxW - 4, PISTON_H);
          // Rod/body extending to wall
          ctxSz.fillStyle = 'rgba(171,71,188,0.4)';
          ctxSz.fillRect(boxL + boxW / 2 - 4, py + PISTON_H, 8, bB - py - PISTON_H);
        } else {
          // Piston came from top. Face is at py, body extends UP to boxT.
          ctxSz.fillRect(boxL + 2, py - PISTON_H, boxW - 4, PISTON_H);
          ctxSz.fillStyle = 'rgba(171,71,188,0.4)';
          ctxSz.fillRect(boxL + boxW / 2 - 4, boxT, 8, py - PISTON_H - boxT);
        }

        // Piston label
        ctxSz.fillStyle = COLORS.textDim; ctxSz.font = FONT_SM; ctxSz.textAlign = 'left';
        ctxSz.fillText('Piston', boxL + boxW + 8, py + 4);

        // Arrow showing piston direction in step 3
        if (szStep === 3 && pistonSliding) {
          ctxSz.fillStyle = COLORS.purple; ctxSz.font = FONT_LG; ctxSz.textAlign = 'center';
          if (moleculeSide === 'top') {
            ctxSz.fillText('\u25B2', boxL + boxW + 20, py - 8); // up arrow — wait, piston moving up from bottom toward center
          } else {
            ctxSz.fillText('\u25BC', boxL + boxW + 20, py + 18);
          }
        }
      }

      // Partition label
      if (szStep >= 1 && szStep <= 3) {
        ctxSz.fillStyle = COLORS.textDim; ctxSz.font = FONT_SM; ctxSz.textAlign = 'left';
        ctxSz.fillText('Partition', boxL + boxW + 8, cy + 4);
      }

      // Ball (with glow on collision)
      ctxSz.save();
      if (flashTimer > 0) {
        ctxSz.shadowColor = COLORS.yellow;
        ctxSz.shadowBlur = 18;
      }
      ctxSz.beginPath(); ctxSz.arc(molX, molY, BALL_R, 0, 2 * Math.PI);
      ctxSz.fillStyle = COLORS.green; ctxSz.fill();
      ctxSz.restore();
      // Specular highlight
      ctxSz.beginPath(); ctxSz.arc(molX - 4, molY - 4, 4, 0, 2 * Math.PI);
      ctxSz.fillStyle = 'rgba(255,255,255,0.3)'; ctxSz.fill();

      // Side labels
      if (szStep >= 1 && szStep <= 2) {
        ctxSz.fillStyle = COLORS.textDim; ctxSz.font = FONT_SM; ctxSz.textAlign = 'center';
        ctxSz.fillText('Top half', boxL + boxW / 2, boxT + 16);
        ctxSz.fillText('Bottom half', boxL + boxW / 2, bB - 6);
      }

      // Right panel: step descriptions
      const tx = boxL + boxW + 50, ty = 38;
      const sideLabel = moleculeSide ? (moleculeSide === 'top' ? 'Top' : 'Bottom') : '?';
      const emptyLabel = moleculeSide === 'top' ? 'bottom' : 'top';
      const steps = [
        'Molecule bounces freely in box',
        'Insert partition at midpoint',
        'Measure: molecule is in ' + sideLabel + ' half',
        'Slide piston in from empty ' + emptyLabel + ' (free!)',
        'Remove partition \u2014 ball pushes piston back!'
      ];
      ctxSz.textAlign = 'left';
      for (let i = 0; i < steps.length; i++) {
        const active = i === szStep;
        ctxSz.fillStyle = active ? COLORS.yellow : (i < szStep ? COLORS.green : COLORS.textDim);
        ctxSz.font = active ? 'bold ' + FONT : FONT_SM;
        const marker = i < szStep ? '\u2713 ' : (i === szStep ? '\u25B6 ' : '  ');
        ctxSz.fillText(marker + (i + 1) + '. ' + steps[i], tx, ty + i * 26);
      }

      // Work meter (step 4)
      if (szStep >= 4) {
        const meterX = tx, meterY = ty + 160;
        const meterW = 180, meterH = 18;
        const travel = pistonWorkTravel();
        const frac = Math.min(1, Math.max(0, travel / maxPistonTravel()));

        ctxSz.fillStyle = COLORS.textDim; ctxSz.font = FONT_SM; ctxSz.textAlign = 'left';
        ctxSz.fillText('Work extracted:', meterX, meterY - 6);

        // Bar background
        ctxSz.fillStyle = 'rgba(255,255,255,0.08)';
        ctxSz.fillRect(meterX, meterY, meterW, meterH);
        // Bar fill
        if (frac > 0.005) {
          const grad = ctxSz.createLinearGradient(meterX, 0, meterX + meterW * frac, 0);
          grad.addColorStop(0, COLORS.green);
          grad.addColorStop(1, COLORS.yellow);
          ctxSz.fillStyle = grad;
          ctxSz.fillRect(meterX, meterY, meterW * frac, meterH);
        }
        ctxSz.strokeStyle = COLORS.axis; ctxSz.lineWidth = 1;
        ctxSz.strokeRect(meterX, meterY, meterW, meterH);

        ctxSz.fillStyle = COLORS.text; ctxSz.font = FONT_SM; ctxSz.textAlign = 'left';
        const label = frac >= 0.90 ? 'W = k\u0082T ln 2' : (frac * 100).toFixed(0) + '%';
        ctxSz.fillText(label, meterX + meterW + 8, meterY + 13);

        if (frac >= 0.90) {
          ctxSz.fillStyle = COLORS.green; ctxSz.font = 'bold ' + FONT_LG; ctxSz.textAlign = 'left';
          ctxSz.fillText('1 bit \u2192 k_BT ln 2 of work', meterX, meterY + 40);
        }
      }

      // Title
      ctxSz.fillStyle = COLORS.text; ctxSz.font = FONT_LG; ctxSz.textAlign = 'left';
      ctxSz.fillText("Szilard's Engine", tx, 16);
    }

    function animateSzilard() {
      if (!szAnim) return;
      const dt = 1 / 60;
      const bH = boxH();
      const cy = boxCy();
      const bB = boxB();
      const r = BALL_R;

      // --- Thermal bath: small random kicks to keep molecule energetic ---
      const thermalStrength = 400;
      molVx += (Math.random() - 0.5) * thermalStrength * dt;
      molVy += (Math.random() - 0.5) * thermalStrength * dt;
      const spd = Math.sqrt(molVx * molVx + molVy * molVy);
      const targetSpd = 140;
      const maxSpd = 220;
      // Gently steer toward target speed (thermostat)
      if (spd > maxSpd) { molVx *= maxSpd / spd; molVy *= maxSpd / spd; }
      else if (spd < targetSpd * 0.5 && spd > 0) {
        const boost = 1 + 2 * dt;
        molVx *= boost; molVy *= boost;
      }

      molX += molVx * dt;
      molY += molVy * dt;

      // Wall bounces
      if (molX < boxL + r) { molX = boxL + r; molVx = Math.abs(molVx); }
      if (molX > boxL + boxW - r) { molX = boxL + boxW - r; molVx = -Math.abs(molVx); }
      if (molY < boxT + r) { molY = boxT + r; molVy = Math.abs(molVy); }
      if (molY > bB - r) { molY = bB - r; molVy = -Math.abs(molVy); }

      // Partition bounce (steps 1–3)
      if (szStep >= 1 && szStep <= 3) {
        if (moleculeSide === 'top' && molY + r > cy) { molY = cy - r; molVy = -Math.abs(molVy); }
        if (moleculeSide === 'bottom' && molY - r < cy) { molY = cy + r; molVy = Math.abs(molVy); }
      }

      // Step 3: animate piston sliding from home wall to center
      if (szStep === 3 && pistonSliding) {
        const slideSpeed = 120; // px/sec
        if (moleculeSide === 'top') {
          // Piston face moves from boxB up toward cy
          pistonFaceY -= slideSpeed * dt;
          if (pistonFaceY <= cy) { pistonFaceY = cy; pistonSliding = false; }
        } else {
          // Piston face moves from boxT down toward cy
          pistonFaceY += slideSpeed * dt;
          if (pistonFaceY >= cy) { pistonFaceY = cy; pistonSliding = false; }
        }
      }

      // Step 4: ball–piston collision
      if (szStep === 4) {
        if (moleculeSide === 'top') {
          // Ball in top, piston face below ball. Ball hits piston going down.
          // Piston moves DOWN (away from ball, toward boxB = home)
          if (molY + r > pistonFaceY) {
            molY = pistonFaceY - r;
            const impactV = Math.abs(molVy);
            molVy = -impactV * 0.6;
            pistonVel += impactV * 0.6;
            flashTimer = 10;
          }
        } else {
          // Ball in bottom, piston face above ball. Ball hits piston going up.
          // Piston moves UP (away from ball, toward boxT = home)
          if (molY - r < pistonFaceY) {
            molY = pistonFaceY + r;
            const impactV = Math.abs(molVy);
            molVy = impactV * 0.6;
            pistonVel += impactV * 0.6;
            flashTimer = 10;
          }
        }

        // Move piston from collisions
        if (moleculeSide === 'top') {
          pistonFaceY += pistonVel * dt; // moves down toward boxB
          if (pistonFaceY > bB - 4) { pistonFaceY = bB - 4; pistonVel = 0; }
          if (pistonFaceY < cy) { pistonFaceY = cy; pistonVel = 0; } // can't go above center
        } else {
          pistonFaceY -= pistonVel * dt; // moves up toward boxT
          if (pistonFaceY < boxT + 4) { pistonFaceY = boxT + 4; pistonVel = 0; }
          if (pistonFaceY > cy) { pistonFaceY = cy; pistonVel = 0; }
        }
        pistonVel *= 0.96; // damping = work extracted against load

        // Keep ball in bounds: between its home wall and the piston face
        if (moleculeSide === 'top') {
          if (molY + r > pistonFaceY) { molY = pistonFaceY - r; molVy = -Math.abs(molVy); }
          // top wall already handled
        } else {
          if (molY - r < pistonFaceY) { molY = pistonFaceY + r; molVy = Math.abs(molVy); }
        }
      }

      if (flashTimer > 0) flashTimer--;

      drawSzilard();
      activeAnimations['szilard'] = requestAnimationFrame(animateSzilard);
    }

    stepBtn?.addEventListener('click', () => {
      if (szStep < 4) {
        szStep++;
        if (szStep === 1) {
          // Partition inserted — which side is the ball on?
          moleculeSide = molY < boxCy() ? 'top' : 'bottom';
        }
        if (szStep === 3) {
          // Start piston at the far wall of the empty side
          pistonFaceY = pistonHomeY();
          pistonVel = 0;
          pistonSliding = true; // animate slide to center
        }
        if (szStep === 4) {
          // Partition removed. Piston should be at center now.
          pistonFaceY = boxCy();
          pistonVel = 0;
          pistonSliding = false;
        }
      }
      if (!szAnim) { szAnim = true; animateSzilard(); }
      drawSzilard();
    });
    resetBtnSz?.addEventListener('click', () => {
      szAnim = false;
      if (activeAnimations['szilard']) cancelAnimationFrame(activeAnimations['szilard']);
      initSzilard();
      drawSzilard();
    });
    initSzilard();
    szAnim = true;
    animateSzilard();
  }

  // ----- Landauer's Bit: Known vs Unknown -----
  const cLB = document.getElementById('vis-landauer');
  if (cLB) {
    const {ctx: ctxLB, W: WLB, H: HLB} = setupCanvas(cLB);
    const lbKS0 = document.getElementById('lb-k-set0');
    const lbKS1 = document.getElementById('lb-k-set1');
    const lbKFl = document.getElementById('lb-k-flip');
    const lbUS0 = document.getElementById('lb-u-set0');
    const lbUS1 = document.getElementById('lb-u-set1');
    const lbUFl = document.getElementById('lb-u-flip');
    const lbURv = document.getElementById('lb-u-reveal');
    const lbRst = document.getElementById('lb-reset');

    // Physics
    const LB_G = 1.0, LB_KT = 0.04, LB_DT = 0.016;
    function lbRn() {
      return Math.sqrt(-2 * Math.log(Math.random() + 1e-10)) * Math.cos(2 * Math.PI * Math.random());
    }
    function lbV(x, b, t) { return b * (x * x - 1) * (x * x - 1) - t * x; }
    function lbF(x, b, t) {
      const w = x > 1.5 ? -16 * (x - 1.5) : x < -1.5 ? -16 * (x + 1.5) : 0;
      return -4 * b * x * (x * x - 1) + t + w;
    }
    function lbPhys(ball, b, t) {
      ball.x += (lbF(ball.x, b, t) / LB_G) * LB_DT + Math.sqrt(2 * LB_KT * LB_DT / LB_G) * lbRn();
      ball.x = Math.max(-1.7, Math.min(1.7, ball.x));
    }

    // Protocol factory: lower barrier, tilt, raise barrier, remove tilt
    function makeProto(tiltDir, heat) {
      const d = heat ? 80 : 60;
      return {
        steps: [{b:1,t:0,dur:heat?40:25},{b:0,t:0,dur:d},{b:0,t:tiltDir,dur:d},{b:1,t:tiltDir,dur:d},{b:1,t:0,dur:d}],
        i: 0, t: 0, pB: 1, pT: 0, heat: !!heat
      };
    }

    // State
    let kBall = {x: -1}, uBall = {x: 1};
    let hidden = true;
    let kBar = 1, kTi = 0;  // known panel potential (varies during protocol)
    let uBar = 1, uTi = 0;  // unknown panel potential
    let lbHeat = 0, lbMsg = '', lbMC = COLORS.textDim;
    let lbOn = false, lbBz = false;
    let lbParts = [], kProto = null, uProto = null, flashT = 0;
    let kFlip = null, uFlip = null;  // flip animation: { from, t, dur }

    // Layout
    const PW = (WLB - 36) / 2, PH = 150, PY = 30, P1 = 8, P2 = WLB / 2 + 10;
    function xc(x, x0, w) { return x0 + (x + 1.7) / 3.4 * w; }
    function vc(V, y0, h) { return Math.max(y0, Math.min(y0 + h, y0 + h - V / 2.0 * h * 0.6 - h * 0.1)); }

    function drawPanel(x0, y0, w, h, ball, br, ti, title, col, hid) {
      ctxLB.strokeStyle = 'rgba(255,255,255,0.07)'; ctxLB.lineWidth = 1;
      ctxLB.strokeRect(x0 - 2, y0 - 18, w + 4, h + 32);
      ctxLB.fillStyle = col; ctxLB.font = FONT; ctxLB.textAlign = 'center';
      ctxLB.fillText(title, x0 + w / 2, y0 - 5);

      // Potential fill
      ctxLB.beginPath(); ctxLB.moveTo(x0, y0 + h);
      for (let i = 0; i <= 200; i++) {
        const xv = -1.7 + 3.4 * i / 200;
        ctxLB.lineTo(xc(xv, x0, w), vc(lbV(xv, br, ti), y0, h));
      }
      ctxLB.lineTo(x0 + w, y0 + h); ctxLB.closePath();
      ctxLB.fillStyle = 'rgba(255,255,255,0.025)'; ctxLB.fill();

      // Potential curve
      ctxLB.beginPath();
      for (let i = 0; i <= 200; i++) {
        const xv = -1.7 + 3.4 * i / 200;
        const px = xc(xv, x0, w), py = vc(lbV(xv, br, ti), y0, h);
        if (i === 0) ctxLB.moveTo(px, py); else ctxLB.lineTo(px, py);
      }
      ctxLB.strokeStyle = 'rgba(255,255,255,0.3)'; ctxLB.lineWidth = 2; ctxLB.stroke();

      // Well labels
      ctxLB.fillStyle = COLORS.textDim; ctxLB.font = FONT_SM; ctxLB.textAlign = 'center';
      ctxLB.fillText('0', xc(-1, x0, w), y0 + h + 13);
      ctxLB.fillText('1', xc(1, x0, w), y0 + h + 13);

      if (hid) {
        const a = flashT > 0 ? 0.9 : 0.5;
        ctxLB.fillStyle = 'rgba(255,167,38,' + a + ')';
        ctxLB.font = 'bold 40px Inter, system-ui, sans-serif';
        ctxLB.textAlign = 'center'; ctxLB.textBaseline = 'middle';
        ctxLB.fillText('?', x0 + w / 2, y0 + h * 0.45);
        ctxLB.textBaseline = 'alphabetic';
      } else {
        const bx = xc(ball.x, x0, w);
        const by = Math.max(y0 + 8, Math.min(y0 + h - 8, vc(lbV(ball.x, br, ti), y0, h)));
        const g = ctxLB.createRadialGradient(bx, by, 0, bx, by, 20);
        g.addColorStop(0, col.replace(/[\d.]+\)$/, '0.35)')); g.addColorStop(1, 'transparent');
        ctxLB.beginPath(); ctxLB.arc(bx, by, 20, 0, 2 * Math.PI);
        ctxLB.fillStyle = g; ctxLB.fill();
        ctxLB.beginPath(); ctxLB.arc(bx, by, 7, 0, 2 * Math.PI);
        ctxLB.fillStyle = col; ctxLB.fill();
        ctxLB.strokeStyle = 'rgba(255,255,255,0.5)'; ctxLB.lineWidth = 1.5; ctxLB.stroke();
        ctxLB.fillStyle = '#000'; ctxLB.font = '10px Inter, system-ui, sans-serif';
        ctxLB.textAlign = 'center'; ctxLB.textBaseline = 'middle';
        ctxLB.fillText(ball.x < 0 ? '0' : '1', bx, by);
        ctxLB.textBaseline = 'alphabetic';
      }
    }

    function drawLB() {
      clearCanvas(ctxLB, WLB, HLB);
      const cK = 'rgba(79,195,247,1)', cU = 'rgba(255,167,38,1)';

      // Divider
      ctxLB.save(); ctxLB.strokeStyle = 'rgba(255,255,255,0.08)'; ctxLB.setLineDash([4, 4]);
      ctxLB.beginPath(); ctxLB.moveTo(WLB / 2, PY - 18); ctxLB.lineTo(WLB / 2, PY + PH + 16);
      ctxLB.stroke(); ctxLB.restore();

      drawPanel(P1, PY, PW, PH, kBall, kBar, kTi,
        'Known Bit = ' + (kBall.x < 0 ? '0' : '1'), cK, false);
      drawPanel(P2, PY, PW, PH, uBall, uBar, uTi,
        hidden ? 'Unknown Bit = ?' : 'Bit = ' + (uBall.x < 0 ? '0' : '1') + ' (now known)', cU, hidden);

      // Heat particles
      for (const p of lbParts) {
        ctxLB.beginPath(); ctxLB.arc(p.x, p.y, 2, 0, 2 * Math.PI);
        ctxLB.fillStyle = 'rgba(239,83,80,' + (p.life * 0.7).toFixed(2) + ')'; ctxLB.fill();
      }

      // Info area
      const iy = PY + PH + 38;
      ctxLB.fillStyle = lbMC; ctxLB.font = FONT_LG; ctxLB.textAlign = 'center';
      ctxLB.fillText(lbMsg, WLB / 2, iy);

      // Heat bar
      const barY = iy + 18, barX = 55, barW = WLB - 120, barH = 14;
      ctxLB.fillStyle = COLORS.textDim; ctxLB.font = FONT_SM; ctxLB.textAlign = 'left';
      ctxLB.fillText('Heat:', 10, barY + 11);
      ctxLB.fillStyle = 'rgba(255,255,255,0.06)'; ctxLB.fillRect(barX, barY, barW, barH);
      const ln2X = barX + (0.693 / 1.2) * barW;
      ctxLB.strokeStyle = COLORS.yellow; ctxLB.lineWidth = 1.5;
      ctxLB.beginPath(); ctxLB.moveTo(ln2X, barY - 2); ctxLB.lineTo(ln2X, barY + barH + 2); ctxLB.stroke();
      ctxLB.fillStyle = COLORS.yellow; ctxLB.font = '10px Inter, system-ui, sans-serif';
      ctxLB.textAlign = 'center'; ctxLB.fillText('kT ln 2', ln2X, barY + barH + 13);
      const hf = Math.min(lbHeat / 1.2, 1);
      if (hf > 0) {
        const hg = ctxLB.createLinearGradient(barX, 0, barX + hf * barW, 0);
        hg.addColorStop(0, 'rgba(239,83,80,0.5)'); hg.addColorStop(1, 'rgba(239,83,80,0.9)');
        ctxLB.fillStyle = hg; ctxLB.fillRect(barX, barY, hf * barW, barH);
      }
      ctxLB.fillStyle = COLORS.text; ctxLB.font = FONT_SM; ctxLB.textAlign = 'right';
      ctxLB.fillText(lbHeat.toFixed(2) + ' kT', barX + barW + 38, barY + 11);
    }

    // Generic protocol stepper — returns true while running
    function stepProto(pr, setBar, setTi) {
      pr.t++;
      const step = pr.steps[pr.i];
      if (pr.t >= step.dur) {
        pr.i++; pr.t = 0;
        if (pr.i >= pr.steps.length) { setBar(1); setTi(0); return false; }
        pr.pB = setBar(); pr.pT = setTi();
      }
      const s = pr.steps[pr.i];
      const f = pr.t / s.dur, e = f * f * (3 - 2 * f);
      setBar(pr.pB + (s.b - pr.pB) * e);
      setTi(pr.pT + (s.t - pr.pT) * e);
      return true;
    }

    function animLB() {
      if (!lbOn) return;

      // --- Known panel: flip, protocol, or jiggle ---
      if (kFlip) {
        kFlip.t++;
        const f = kFlip.t / kFlip.dur;
        const e = f * f * (3 - 2 * f);
        kBall.x = kFlip.from * (1 - 2 * e);  // symmetric: from → -from
        kBar = 1 - Math.sin(f * Math.PI);     // barrier dips to 0 at midpoint
        if (kFlip.t >= kFlip.dur) {
          kBall.x = -kFlip.from; kBar = 1; kFlip = null; lbBz = false;
        }
      } else if (kProto) {
        const running = stepProto(kProto,
          function(v) { if (v !== undefined) kBar = v; return kBar; },
          function(v) { if (v !== undefined) kTi = v; return kTi; });
        lbPhys(kBall, kBar, kTi);
        if (!running) { kBar = 1; kTi = 0; kProto = null; lbBz = false; }
      } else {
        lbPhys(kBall, 1, 0);
      }

      // --- Unknown panel: flip, protocol, or jiggle ---
      if (uFlip) {
        uFlip.t++;
        const f = uFlip.t / uFlip.dur;
        const e = f * f * (3 - 2 * f);
        uBall.x = uFlip.from * (1 - 2 * e);
        uBar = 1 - Math.sin(f * Math.PI);
        if (uFlip.t >= uFlip.dur) {
          uBall.x = -uFlip.from; uBar = 1; uFlip = null; lbBz = false;
        }
      } else if (uProto) {
        const running = stepProto(uProto,
          function(v) { if (v !== undefined) uBar = v; return uBar; },
          function(v) { if (v !== undefined) uTi = v; return uTi; });
        lbPhys(uBall, uBar, uTi);
        if (!running) {
          uBar = 1; uTi = 0;
          if (uProto.erase) {
            hidden = false;
            if (lbURv) lbURv.textContent = 'Hide';
            if (uProto.changed) {
              lbMsg = 'Was ' + uProto.wasBit + ' \u2014 had to change. Heat = kT ln 2.';
              lbMC = COLORS.red;
            } else {
              lbHeat = 0;
              lbMsg = 'Was already ' + uProto.tgtBit + '! No heat needed.';
              lbMC = COLORS.green;
            }
          }
          uProto = null; lbBz = false;
        }
        // Heat ramp and particles for erasure protocols
        if (uProto && uProto.heat && uProto.i >= 1) {
          const tot = uProto.steps.slice(1).reduce((a, st) => a + st.dur, 0);
          lbHeat = Math.min(0.693, lbHeat + 0.693 / tot);
          if (Math.random() < 0.1) {
            const bpx = xc(uBall.x, P2, PW);
            const bpy = vc(lbV(uBall.x, uBar, uTi), PY, PH);
            const ang = Math.random() * Math.PI * 2, sp = 0.5 + Math.random() * 1.5;
            lbParts.push({x: bpx, y: Math.min(bpy, PY + PH - 5),
              vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.3, life: 1});
          }
        }
      } else {
        lbPhys(uBall, uBar, uTi);
      }

      if (flashT > 0) flashT--;
      for (const p of lbParts) { p.x += p.vx; p.y += p.vy; p.life -= 0.018; }
      lbParts = lbParts.filter(p => p.life > 0);

      drawLB();
      activeAnimations['landauer'] = requestAnimationFrame(animLB);
    }

    function lbReset() {
      kBall.x = -1; uBall.x = Math.random() < 0.5 ? -1 : 1;
      hidden = true; kBar = 1; kTi = 0; uBar = 1; uTi = 0;
      if (lbURv) lbURv.textContent = 'Reveal';
      lbHeat = 0; lbParts = []; kProto = null; uProto = null;
      kFlip = null; uFlip = null; lbBz = false; flashT = 0;
      lbMsg = 'Left: you can see the bit. Right: it\u2019s hidden.';
      lbMC = COLORS.textDim;
    }

    // Known panel: set = do nothing or flip (same symmetric operation)
    function kSet(tgt) {
      if (lbBz) return;
      if (Math.abs(kBall.x - tgt) < 0.3) {
        lbMsg = 'Already ' + (tgt < 0 ? '0' : '1') + '! No work needed.';
        lbMC = COLORS.green; return;
      }
      lbBz = true;
      kFlip = {from: kBall.x, t: 0, dur: 40};
      lbMsg = 'Known \u2192 ' + (tgt < 0 ? '0' : '1') + '. Just a flip \u2014 no heat.';
      lbMC = COLORS.green;
    }
    lbKS0?.addEventListener('click', () => kSet(-1));
    lbKS1?.addEventListener('click', () => kSet(1));
    lbKFl?.addEventListener('click', () => {
      if (lbBz) return;
      lbBz = true;
      kFlip = {from: kBall.x, t: 0, dur: 40};
      lbMsg = 'Flip! Same operation for either state \u2014 no heat.';
      lbMC = COLORS.green;
    });

    // Unknown panel: revealed = flip if needed (free), hidden = erasure protocol (heat)
    function uSet(tgt) {
      if (lbBz) return;
      if (!hidden) {
        // Revealed — just flip if needed, like the known panel
        if (Math.abs(uBall.x - tgt) < 0.3) {
          lbMsg = 'Already ' + (tgt < 0 ? '0' : '1') + '! No heat.';
          lbMC = COLORS.green; return;
        }
        lbBz = true;
        uFlip = {from: uBall.x, t: 0, dur: 40};
        lbMsg = 'Revealed \u2014 just a flip. No heat.';
        lbMC = COLORS.green; return;
      }
      // Hidden — run erasure protocol; heat only if bit actually changes
      lbBz = true; lbHeat = 0;
      const needsChange = (uBall.x > 0 && tgt < 0) || (uBall.x < 0 && tgt > 0);
      uProto = makeProto(tgt < 0 ? -1.5 : 1.5, needsChange);
      uProto.erase = true;
      uProto.changed = needsChange;
      uProto.tgtBit = tgt < 0 ? '0' : '1';
      uProto.wasBit = uBall.x < 0 ? '0' : '1';
      lbMsg = 'Setting unknown bit to ' + (tgt < 0 ? '0' : '1') + '...';
      lbMC = COLORS.orange;
    }
    lbUS0?.addEventListener('click', () => uSet(-1));
    lbUS1?.addEventListener('click', () => uSet(1));

    lbUFl?.addEventListener('click', () => {
      if (lbBz) return;
      if (!hidden) {
        // Revealed — same symmetric flip animation
        lbBz = true;
        uFlip = {from: uBall.x, t: 0, dur: 40};
        lbMsg = 'Flip! Same operation for either state \u2014 no heat.';
        lbMC = COLORS.green; return;
      }
      // Hidden — barrier dips behind screen, ball swaps, no heat
      uBall.x = -uBall.x;
      flashT = 25;
      lbMsg = 'Flipped! (still unknown) No heat \u2014 flip is always reversible.';
      lbMC = COLORS.green;
    });

    // Reveal/Hide toggle
    lbURv?.addEventListener('click', () => {
      if (lbBz) return;
      hidden = !hidden;
      if (lbURv) lbURv.textContent = hidden ? 'Reveal' : 'Hide';
      if (!hidden) {
        lbMsg = 'Revealed: bit = ' + (uBall.x < 0 ? '0' : '1') + '. Now you can set it for free!';
        lbMC = COLORS.cyan;
      } else {
        lbMsg = 'Hidden again. Setting will cost kT ln 2.';
        lbMC = COLORS.orange;
      }
    });

    lbRst?.addEventListener('click', () => { lbReset(); drawLB(); });

    lbReset();
    lbOn = true;
    animLB();
  }

  // ----- Na+/K+ Pump (game-style) -----
  const cNaK = document.getElementById('vis-nak-pump');
  if (cNaK) {
    const { ctx: ctxNaK, W: WNaK, H: HNaK } = setupCanvas(cNaK);
    const pumpBtn     = document.getElementById('nak-pump-btn');
    const fireBtn     = document.getElementById('nak-fire-btn');
    const resetBtnNaK = document.getElementById('nak-reset');
    const atpDisp     = document.getElementById('nak-atp-display');

    // ---- Layout ----
    const MEM_CY   = HNaK * 0.46;
    const MEM_HALF = 40;
    const MEM_TOP  = MEM_CY - MEM_HALF;
    const MEM_BOT  = MEM_CY + MEM_HALF;
    const PUMP_CX  = WNaK / 2;
    const PUMP_HW  = 30;
    const PUMP_HH  = MEM_HALF + 6;

    // ---- Ion pool ----
    const TOTAL_NA = 12, TOTAL_K = 12;
    let naIons = [], kIons = [];
    let atp = 10, ATP_MAX = 10;

    // ---- Pump animation state ----
    let pumpPhase = null, pumpT = 0, pumpLastTS = null;
    const PHASE_DUR = 650;
    let pumpNaIons = [], pumpKIons = [];

    // ---- Diffusion leak ----
    let leakTimer = 0;
    const LEAK_INTERVAL = 3500;

    // ---- Neuron firing state ----
    let fireActive = false, fireT = 0;
    const FIRE_DUR = 1200; // ms for full action potential
    let fireNaIons = [];   // Na+ ions rushing in during firing
    // Voltage trace: ring buffer of membrane potential values
    const V_TRACE_LEN = 120;
    let vTrace = [];
    let vTraceIdx = 0;
    let fireCount = 0;

    function randIon(side) {
      const m = 14;
      const yMin = side === 'out' ? 30 : MEM_BOT + m;
      const yMax = side === 'out' ? MEM_TOP - m : HNaK - 50;
      return {
        x: 20 + Math.random() * (WNaK - 100),
        y: yMin + Math.random() * Math.max(10, yMax - yMin),
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        side: side
      };
    }

    function initState() {
      naIons = []; kIons = [];
      for (let i = 0; i < TOTAL_NA; i++) naIons.push(randIon(i < TOTAL_NA / 2 ? 'in' : 'out'));
      for (let i = 0; i < TOTAL_K;  i++) kIons.push(randIon(i < TOTAL_K / 2 ? 'in' : 'out'));
      atp = ATP_MAX;
      pumpPhase = null; pumpT = 0;
      pumpNaIons = []; pumpKIons = [];
      leakTimer = 0;
      fireActive = false; fireT = 0; fireNaIons = []; fireCount = 0;
      vTrace = new Array(V_TRACE_LEN).fill(-70); vTraceIdx = 0;
      updateAtpDisp();
    }

    function updateAtpDisp() {
      if (atpDisp) atpDisp.textContent = 'ATP: ' + atp + ' / ' + ATP_MAX;
      const naIn  = naIons.filter(i => i.side === 'in').length;
      const naOut = naIons.filter(i => i.side === 'out').length;
      const kOut  = kIons.filter(i => i.side === 'out').length;
      // Pump disabled if no ATP, already pumping, or nothing to pump
      if (pumpBtn) pumpBtn.disabled = (atp <= 0 || pumpPhase !== null || (naIn === 0 && kOut === 0));
      // Fire disabled if no gradient, already firing, or pump in progress
      if (fireBtn) fireBtn.disabled = (fireActive || pumpPhase !== null || naOut <= naIn + 1);
    }

    // ---- Gentle Brownian drift ----
    function driftIon(ion) {
      const m = 14;
      const yMin = ion.side === 'out' ? 30 : MEM_BOT + m;
      const yMax = ion.side === 'out' ? MEM_TOP - m : HNaK - 50;
      const xMin = 16, xMax = WNaK - 80;
      if (Math.random() < 0.02) ion.vx += (Math.random() - 0.5) * 2;
      if (Math.random() < 0.02) ion.vy += (Math.random() - 0.5) * 2;
      ion.vx *= 0.97; ion.vy *= 0.97;
      const spd = Math.hypot(ion.vx, ion.vy);
      if (spd > 8) { ion.vx *= 8 / spd; ion.vy *= 8 / spd; }
      ion.x += ion.vx; ion.y += ion.vy;
      if (ion.x < xMin) { ion.x = xMin; ion.vx = Math.abs(ion.vx); }
      if (ion.x > xMax) { ion.x = xMax; ion.vx = -Math.abs(ion.vx); }
      if (ion.y < yMin) { ion.y = yMin; ion.vy = Math.abs(ion.vy); }
      if (ion.y > yMax) { ion.y = yMax; ion.vy = -Math.abs(ion.vy); }
    }

    // ---- Drawing helpers ----
    function drawIonCircle(x, y, r, label, color, alpha) {
      if (alpha === undefined) alpha = 1;
      ctxNaK.save(); ctxNaK.globalAlpha = alpha;
      const grd = ctxNaK.createRadialGradient(x, y, 0, x, y, r * 1.8);
      grd.addColorStop(0, color + '88'); grd.addColorStop(1, color + '00');
      ctxNaK.fillStyle = grd;
      ctxNaK.beginPath(); ctxNaK.arc(x, y, r * 1.8, 0, Math.PI * 2); ctxNaK.fill();
      ctxNaK.fillStyle = color;
      ctxNaK.beginPath(); ctxNaK.arc(x, y, r, 0, Math.PI * 2); ctxNaK.fill();
      ctxNaK.fillStyle = '#fff';
      ctxNaK.font = 'bold ' + Math.max(7, r - 1) + 'px Inter, system-ui, sans-serif';
      ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'middle';
      ctxNaK.fillText(label, x, y + 0.5);
      ctxNaK.restore();
    }

    // ---- Membrane ----
    function drawMembraneNaK() {
      const lipidR = 6, step = lipidR * 2 + 3;
      const cols = Math.ceil(WNaK / step) + 1;
      const grd = ctxNaK.createLinearGradient(0, MEM_TOP, 0, MEM_BOT);
      grd.addColorStop(0, 'rgba(100,160,100,0.15)');
      grd.addColorStop(0.5, 'rgba(80,130,80,0.25)');
      grd.addColorStop(1, 'rgba(100,160,100,0.15)');
      ctxNaK.fillStyle = grd;
      ctxNaK.fillRect(0, MEM_TOP, WNaK, MEM_HALF * 2);
      for (let i = 0; i < cols; i++) {
        const lx = i * step + lipidR;
        if (Math.abs(lx - PUMP_CX) < PUMP_HW + 6) continue;
        ctxNaK.beginPath(); ctxNaK.arc(lx, MEM_TOP + lipidR + 3, lipidR, 0, Math.PI * 2);
        ctxNaK.fillStyle = 'rgba(102,187,106,0.55)'; ctxNaK.fill();
        ctxNaK.beginPath(); ctxNaK.moveTo(lx, MEM_TOP + lipidR * 2 + 3); ctxNaK.lineTo(lx, MEM_CY - 3);
        ctxNaK.strokeStyle = 'rgba(102,187,106,0.28)'; ctxNaK.lineWidth = 1.5; ctxNaK.stroke();
        ctxNaK.beginPath(); ctxNaK.arc(lx, MEM_BOT - lipidR - 3, lipidR, 0, Math.PI * 2);
        ctxNaK.fillStyle = 'rgba(102,187,106,0.55)'; ctxNaK.fill();
        ctxNaK.beginPath(); ctxNaK.moveTo(lx, MEM_BOT - lipidR * 2 - 3); ctxNaK.lineTo(lx, MEM_CY + 3);
        ctxNaK.strokeStyle = 'rgba(102,187,106,0.28)'; ctxNaK.lineWidth = 1.5; ctxNaK.stroke();
      }
    }

    // ---- Pump protein (two subunits that open/close) ----
    function drawPumpProtein(conf, phosphorylated) {
      const cx = PUMP_CX, cy = MEM_CY;
      const hw = PUMP_HW, hh = PUMP_HH;
      const bodyColor = phosphorylated ? 'rgba(255,167,38,0.80)' : 'rgba(79,195,247,0.75)';
      const edgeColor = phosphorylated ? '#ffa726' : '#4fc3f7';
      ctxNaK.save();
      const openAmt = 14;
      const inOpen  = Math.max(0, 1 - conf * 2.5);
      const outOpen = Math.max(0, (conf - 0.6) * 2.5);
      // Left subunit
      ctxNaK.beginPath();
      ctxNaK.moveTo(cx - hw - outOpen * openAmt * 0.5, cy - hh);
      ctxNaK.lineTo(cx - 3, cy - hh);
      ctxNaK.lineTo(cx - 3, cy + hh);
      ctxNaK.lineTo(cx - hw - inOpen * openAmt * 0.5, cy + hh);
      ctxNaK.closePath();
      ctxNaK.fillStyle = bodyColor; ctxNaK.fill();
      ctxNaK.strokeStyle = edgeColor; ctxNaK.lineWidth = 2; ctxNaK.stroke();
      // Right subunit
      ctxNaK.beginPath();
      ctxNaK.moveTo(cx + hw + outOpen * openAmt * 0.5, cy - hh);
      ctxNaK.lineTo(cx + 3, cy - hh);
      ctxNaK.lineTo(cx + 3, cy + hh);
      ctxNaK.lineTo(cx + hw + inOpen * openAmt * 0.5, cy + hh);
      ctxNaK.closePath();
      ctxNaK.fillStyle = bodyColor; ctxNaK.fill();
      ctxNaK.strokeStyle = edgeColor; ctxNaK.lineWidth = 2; ctxNaK.stroke();
      // Channel gap when open
      const gapTop = outOpen > 0.1 ? 6 + outOpen * 12 : 0;
      const gapBot = inOpen > 0.1 ? 6 + inOpen * 12 : 0;
      ctxNaK.fillStyle = COLORS.bg;
      if (gapTop > 2) {
        ctxNaK.beginPath();
        ctxNaK.moveTo(cx - gapTop / 2, cy - hh);
        ctxNaK.lineTo(cx + gapTop / 2, cy - hh);
        ctxNaK.lineTo(cx + 2, cy - hh + gapTop * 1.5);
        ctxNaK.lineTo(cx - 2, cy - hh + gapTop * 1.5);
        ctxNaK.closePath(); ctxNaK.fill();
      }
      if (gapBot > 2) {
        ctxNaK.beginPath();
        ctxNaK.moveTo(cx - gapBot / 2, cy + hh);
        ctxNaK.lineTo(cx + gapBot / 2, cy + hh);
        ctxNaK.lineTo(cx + 2, cy + hh - gapBot * 1.5);
        ctxNaK.lineTo(cx - 2, cy + hh - gapBot * 1.5);
        ctxNaK.closePath(); ctxNaK.fill();
      }
      // Binding sites when occluded
      if (conf > 0.15 && conf < 0.85) {
        ctxNaK.fillStyle = 'rgba(255,255,255,0.08)';
        for (let i = -1; i <= 1; i++) {
          ctxNaK.beginPath(); ctxNaK.arc(cx, cy + i * 14, 6, 0, Math.PI * 2); ctxNaK.fill();
        }
      }
      // Phosphorylation badge
      if (phosphorylated) {
        ctxNaK.beginPath(); ctxNaK.arc(cx + hw + 2, cy - hh + 10, 8, 0, Math.PI * 2);
        ctxNaK.fillStyle = COLORS.yellow; ctxNaK.fill();
        ctxNaK.fillStyle = '#222'; ctxNaK.font = 'bold 9px Inter, system-ui, sans-serif';
        ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'middle';
        ctxNaK.fillText('P', cx + hw + 2, cy - hh + 10);
      }
      ctxNaK.restore();
    }

    // ---- Gradient bars (right side) ----
    function drawGradientBars() {
      const naIn  = naIons.filter(i => i.side === 'in').length + pumpNaIons.length;
      const naOut = TOTAL_NA - naIn;
      const kIn   = kIons.filter(i => i.side === 'in').length + pumpKIons.length;
      const kOut  = TOTAL_K - kIn;
      const bx = WNaK - 58, bw = 12, bh = 44;
      // Outside
      const oy = 30;
      ctxNaK.fillStyle = COLORS.textDim; ctxNaK.font = '9px Inter, system-ui, sans-serif';
      ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'bottom';
      ctxNaK.fillText('out', bx + bw + 8, oy - 1);
      // Na out
      ctxNaK.fillStyle = 'rgba(255,167,38,0.18)'; ctxNaK.fillRect(bx, oy, bw, bh);
      ctxNaK.fillStyle = COLORS.orange;
      ctxNaK.fillRect(bx, oy + bh * (1 - naOut / TOTAL_NA), bw, bh * (naOut / TOTAL_NA));
      ctxNaK.strokeStyle = COLORS.axis; ctxNaK.lineWidth = 1; ctxNaK.strokeRect(bx, oy, bw, bh);
      ctxNaK.fillStyle = '#fff'; ctxNaK.font = '8px Inter, system-ui, sans-serif';
      ctxNaK.textBaseline = 'top'; ctxNaK.fillText(naOut + ' Na\u207A', bx + bw / 2, oy + bh + 2);
      // K out
      const kbx = bx + bw + 8;
      ctxNaK.fillStyle = 'rgba(79,195,247,0.18)'; ctxNaK.fillRect(kbx, oy, bw, bh);
      ctxNaK.fillStyle = COLORS.blue;
      ctxNaK.fillRect(kbx, oy + bh * (1 - kOut / TOTAL_K), bw, bh * (kOut / TOTAL_K));
      ctxNaK.strokeStyle = COLORS.axis; ctxNaK.lineWidth = 1; ctxNaK.strokeRect(kbx, oy, bw, bh);
      ctxNaK.fillStyle = '#fff'; ctxNaK.fillText(kOut + ' K\u207A', kbx + bw / 2, oy + bh + 2);
      // Inside
      const iy = MEM_BOT + 12;
      ctxNaK.fillStyle = COLORS.textDim; ctxNaK.font = '9px Inter, system-ui, sans-serif';
      ctxNaK.textBaseline = 'bottom'; ctxNaK.fillText('in', bx + bw + 8, iy - 1);
      // Na in
      ctxNaK.fillStyle = 'rgba(255,167,38,0.18)'; ctxNaK.fillRect(bx, iy, bw, bh);
      ctxNaK.fillStyle = COLORS.orange;
      ctxNaK.fillRect(bx, iy + bh * (1 - naIn / TOTAL_NA), bw, bh * (naIn / TOTAL_NA));
      ctxNaK.strokeStyle = COLORS.axis; ctxNaK.lineWidth = 1; ctxNaK.strokeRect(bx, iy, bw, bh);
      ctxNaK.fillStyle = '#fff'; ctxNaK.font = '8px Inter, system-ui, sans-serif';
      ctxNaK.textBaseline = 'top'; ctxNaK.fillText(naIn + ' Na\u207A', bx + bw / 2, iy + bh + 2);
      // K in
      ctxNaK.fillStyle = 'rgba(79,195,247,0.18)'; ctxNaK.fillRect(kbx, iy, bw, bh);
      ctxNaK.fillStyle = COLORS.blue;
      ctxNaK.fillRect(kbx, iy + bh * (1 - kIn / TOTAL_K), bw, bh * (kIn / TOTAL_K));
      ctxNaK.strokeStyle = COLORS.axis; ctxNaK.lineWidth = 1; ctxNaK.strokeRect(kbx, iy, bw, bh);
      ctxNaK.fillStyle = '#fff'; ctxNaK.fillText(kIn + ' K\u207A', kbx + bw / 2, iy + bh + 2);
    }

    // ---- ATP meter ----
    function drawAtpMeter() {
      const ax = 12, ay = 18, cellW = 16, cellH = 10, gap = 3;
      ctxNaK.fillStyle = COLORS.yellow; ctxNaK.font = 'bold 11px Inter, system-ui, sans-serif';
      ctxNaK.textAlign = 'left'; ctxNaK.textBaseline = 'middle';
      ctxNaK.fillText('ATP', ax, ay);
      for (let i = 0; i < ATP_MAX; i++) {
        const x = ax + 30 + i * (cellW + gap);
        ctxNaK.fillStyle = i < atp ? COLORS.yellow : 'rgba(255,255,255,0.08)';
        ctxNaK.beginPath(); ctxNaK.roundRect(x, ay - cellH / 2, cellW, cellH, 3); ctxNaK.fill();
      }
    }

    // ---- Voltage trace ----
    function drawVoltageTrace() {
      const trW = WNaK - 20, trH = 52;
      const trX = 10, trY = HNaK - trH - 8;
      // Background
      ctxNaK.fillStyle = 'rgba(0,0,0,0.35)';
      ctxNaK.beginPath(); ctxNaK.roundRect(trX, trY, trW, trH, 4); ctxNaK.fill();
      // Axes
      ctxNaK.strokeStyle = 'rgba(255,255,255,0.15)'; ctxNaK.lineWidth = 1;
      ctxNaK.beginPath(); ctxNaK.moveTo(trX + 28, trY + 4); ctxNaK.lineTo(trX + 28, trY + trH - 4); ctxNaK.stroke();
      ctxNaK.beginPath(); ctxNaK.moveTo(trX + 28, trY + trH - 10); ctxNaK.lineTo(trX + trW - 4, trY + trH - 10); ctxNaK.stroke();
      // Labels
      ctxNaK.fillStyle = COLORS.textDim; ctxNaK.font = '8px Inter, system-ui, sans-serif';
      ctxNaK.textAlign = 'right'; ctxNaK.textBaseline = 'middle';
      ctxNaK.fillText('+40', trX + 25, trY + 8);
      ctxNaK.fillText('-70', trX + 25, trY + trH - 10);
      ctxNaK.textAlign = 'left'; ctxNaK.textBaseline = 'top';
      ctxNaK.fillText('mV', trX + 2, trY + 2);
      // Resting line
      ctxNaK.strokeStyle = 'rgba(255,255,255,0.1)'; ctxNaK.setLineDash([3, 3]);
      const restY = trY + trH - 10;
      ctxNaK.beginPath(); ctxNaK.moveTo(trX + 29, restY); ctxNaK.lineTo(trX + trW - 4, restY); ctxNaK.stroke();
      ctxNaK.setLineDash([]);
      // Trace line
      const plotW = trW - 36, plotH = trH - 16;
      const plotX = trX + 30, plotY = trY + 4;
      const vMin = -80, vMax = 50;
      ctxNaK.strokeStyle = COLORS.green; ctxNaK.lineWidth = 1.5;
      ctxNaK.beginPath();
      for (let i = 0; i < V_TRACE_LEN; i++) {
        const idx = (vTraceIdx + i) % V_TRACE_LEN;
        const v = vTrace[idx];
        const px = plotX + (i / (V_TRACE_LEN - 1)) * plotW;
        const py = plotY + plotH - ((v - vMin) / (vMax - vMin)) * plotH;
        if (i === 0) ctxNaK.moveTo(px, py); else ctxNaK.lineTo(px, py);
      }
      ctxNaK.stroke();
      // Fire count
      if (fireCount > 0) {
        ctxNaK.fillStyle = COLORS.red; ctxNaK.font = 'bold 10px Inter, system-ui, sans-serif';
        ctxNaK.textAlign = 'right'; ctxNaK.textBaseline = 'top';
        ctxNaK.fillText(fireCount + ' spike' + (fireCount > 1 ? 's' : ''), trX + trW - 6, trY + 3);
      }
    }

    // ---- Phase labels ----
    const PHASE_LABELS = [
      '3 Na\u207A enter pump from inside cell',
      'ATP \u2192 ADP + P\u1D62 : pump closes, phosphorylates',
      'Pump opens outward \u2014 releases 3 Na\u207A outside',
      '2 K\u207A enter pump from outside cell',
      'P\u1D62 released \u2014 pump closes, dephosphorylates',
      'Pump opens inward \u2014 releases 2 K\u207A inside',
    ];

    function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

    // ---- Main draw ----
    function drawNaK() {
      const W = WNaK, H = HNaK;
      clearCanvas(ctxNaK, W, H);

      // Labels
      ctxNaK.fillStyle = COLORS.textDim; ctxNaK.font = FONT_SM;
      ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'alphabetic';
      ctxNaK.fillText('Outside cell', W / 2, MEM_TOP - 6);
      ctxNaK.fillText('Inside cell', W / 2, MEM_BOT + 14);

      // Drift free ions
      for (const ion of naIons) driftIon(ion);
      for (const ion of kIons)  driftIon(ion);
      // Draw free ions
      for (const ion of naIons) drawIonCircle(ion.x, ion.y, 8, 'Na\u207A', COLORS.orange, 0.8);
      for (const ion of kIons)  drawIonCircle(ion.x, ion.y, 8, 'K\u207A',  COLORS.blue,   0.8);

      // Membrane
      drawMembraneNaK();

      // ---- Pump animation ----
      let conf = 0, phos = false;
      if (pumpPhase !== null) {
        const t = Math.min(1, pumpT / PHASE_DUR);
        const et = ease(t);
        switch (pumpPhase) {
          case 0: // Na+ glide into pump from below
            conf = 0;
            for (const ion of pumpNaIons) {
              ion.x += (PUMP_CX - ion.x) * 0.06;
              ion.y += (MEM_CY - ion.y) * 0.06;
              drawIonCircle(ion.x, ion.y, 8, 'Na\u207A', COLORS.orange, 0.5 + et * 0.5);
            }
            break;
          case 1: // ATP, pump closes
            conf = et * 0.5; phos = et > 0.4;
            for (const ion of pumpNaIons) {
              ion.x += (PUMP_CX - ion.x) * 0.12;
              drawIonCircle(ion.x, ion.y, 8, 'Na\u207A', COLORS.orange);
            }
            ctxNaK.save();
            ctxNaK.globalAlpha = et < 0.5 ? et * 2 : 1;
            ctxNaK.fillStyle = et < 0.5 ? COLORS.yellow : COLORS.orange;
            ctxNaK.font = '11px Inter, system-ui, sans-serif';
            ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'middle';
            ctxNaK.fillText(et < 0.5 ? 'ATP \u2192' : 'ADP + P\u1D62', PUMP_CX + 58, MEM_CY - 10);
            ctxNaK.restore();
            break;
          case 2: // Opens outward, Na released
            conf = 0.5 + et * 0.5; phos = true;
            for (let i = 0; i < pumpNaIons.length; i++) {
              const ion = pumpNaIons[i];
              const ty = MEM_TOP - 20 - i * 14;
              const tx = PUMP_CX + (i - 1) * 20;
              ion.x += (tx - ion.x) * 0.05; ion.y += (ty - ion.y) * 0.05;
              drawIonCircle(ion.x, ion.y, 8, 'Na\u207A', COLORS.orange, 1 - et * 0.3);
            }
            break;
          case 3: // K+ enter from outside
            conf = 1; phos = true;
            for (const ion of pumpKIons) {
              ion.x += (PUMP_CX - ion.x) * 0.06;
              ion.y += (MEM_CY - ion.y) * 0.06;
              drawIonCircle(ion.x, ion.y, 8, 'K\u207A', COLORS.blue, 0.5 + et * 0.5);
            }
            break;
          case 4: // Dephosphorylation
            conf = 1 - et * 0.5; phos = et < 0.6;
            for (const ion of pumpKIons) {
              ion.x += (PUMP_CX - ion.x) * 0.12;
              drawIonCircle(ion.x, ion.y, 8, 'K\u207A', COLORS.blue);
            }
            if (et > 0.3) {
              ctxNaK.save(); ctxNaK.globalAlpha = Math.min(1, (et - 0.3) * 2);
              ctxNaK.fillStyle = COLORS.green; ctxNaK.font = '11px Inter, system-ui, sans-serif';
              ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'middle';
              ctxNaK.fillText('P\u1D62 \u2192', PUMP_CX + 50, MEM_CY + 12);
              ctxNaK.restore();
            }
            break;
          case 5: // Opens inward, K released
            conf = 0.5 - et * 0.5;
            for (let i = 0; i < pumpKIons.length; i++) {
              const ion = pumpKIons[i];
              const ty = MEM_BOT + 20 + i * 14;
              const tx = PUMP_CX + (i === 0 ? -16 : 16);
              ion.x += (tx - ion.x) * 0.05; ion.y += (ty - ion.y) * 0.05;
              drawIonCircle(ion.x, ion.y, 8, 'K\u207A', COLORS.blue, 1 - et * 0.3);
            }
            break;
        }
      }

      // ---- Firing animation: Na+ rushing through channel ----
      if (fireActive) {
        const ft = Math.min(1, fireT / FIRE_DUR);
        // Draw a Na+ channel on the left side of the membrane
        const chX = PUMP_CX - 120, chW = 8;
        // Channel opening (green flash)
        const chOpen = ft < 0.3 ? ft / 0.3 : ft < 0.7 ? 1 : (1 - ft) / 0.3;
        ctxNaK.save();
        ctxNaK.globalAlpha = Math.max(0, chOpen) * 0.7;
        ctxNaK.fillStyle = COLORS.green;
        ctxNaK.fillRect(chX - chW / 2, MEM_TOP, chW, MEM_HALF * 2);
        ctxNaK.restore();
        // "Na+ channel" label
        if (ft < 0.8) {
          ctxNaK.save(); ctxNaK.globalAlpha = Math.min(1, ft * 4) * (ft < 0.7 ? 1 : (0.8 - ft) * 10);
          ctxNaK.fillStyle = COLORS.green; ctxNaK.font = '10px Inter, system-ui, sans-serif';
          ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'bottom';
          ctxNaK.fillText('Na\u207A channel', chX, MEM_TOP - 3);
          ctxNaK.fillText('open!', chX, MEM_TOP - 14);
          ctxNaK.restore();
        }
        // Draw the rushing ions
        for (const ion of fireNaIons) {
          drawIonCircle(ion.x, ion.y, 8, 'Na\u207A', COLORS.orange, 0.9);
        }
      }

      drawPumpProtein(conf, phos);
      drawGradientBars();
      drawAtpMeter();
      drawVoltageTrace();

      // Phase label / hint
      if (pumpPhase !== null) {
        const barY = H - 20, barX0 = 10, barTotalW = W - 80, segW = barTotalW / 6;
        for (let i = 0; i < 6; i++) {
          ctxNaK.fillStyle = i === pumpPhase ? COLORS.cyan : 'rgba(255,255,255,0.08)';
          ctxNaK.beginPath(); ctxNaK.roundRect(barX0 + i * segW + 1, barY, segW - 2, 6, 2); ctxNaK.fill();
        }
        ctxNaK.fillStyle = COLORS.text; ctxNaK.font = FONT_SM;
        ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'alphabetic';
        ctxNaK.fillText(PHASE_LABELS[pumpPhase], W / 2 - 30, barY - 4);
      } else if (!fireActive) {
        ctxNaK.fillStyle = COLORS.textDim; ctxNaK.font = FONT_SM;
        ctxNaK.textAlign = 'center'; ctxNaK.textBaseline = 'alphabetic';
        const naOut = naIons.filter(i => i.side === 'out').length;
        const naIn  = naIons.filter(i => i.side === 'in').length;
        let hint;
        if (naOut > naIn + 1) hint = 'Gradient ready! "Fire Neuron!" to use it, or keep pumping.';
        else if (atp > 0)     hint = 'Pump to build a Na\u207A gradient, then fire a neuron.';
        else                  hint = 'Out of ATP! Gradient dissipates by diffusion.';
        ctxNaK.fillText(hint, W / 2, H - 68);
      }
    }

    // ---- Animation loop ----
    function animateNaK(ts) {
      if (pumpLastTS === null) pumpLastTS = ts;
      const dt = ts - pumpLastTS;
      pumpLastTS = ts;

      if (pumpPhase !== null) {
        pumpT += dt;
        if (pumpT >= PHASE_DUR) {
          pumpT = 0;
          if (pumpPhase === 2) {
            for (const ion of pumpNaIons) { ion.side = 'out'; ion.y = MEM_TOP - 20; naIons.push(ion); }
            pumpNaIons = [];
          } else if (pumpPhase === 5) {
            for (const ion of pumpKIons) { ion.side = 'in'; ion.y = MEM_BOT + 20; kIons.push(ion); }
            pumpKIons = [];
          }
          pumpPhase++;
          if (pumpPhase > 5) { pumpPhase = null; updateAtpDisp(); }
        }
      }

      // Neuron firing animation
      if (fireActive) {
        fireT += dt;
        const ft = fireT / FIRE_DUR;
        const chX = PUMP_CX - 120;
        // Move ions through channel toward inside
        for (const ion of fireNaIons) {
          if (ft < 0.4) {
            // Rush toward channel
            ion.x += (chX - ion.x) * 0.08;
            ion.y += (MEM_CY - ion.y) * 0.08;
          } else {
            // Exit below membrane
            const ty = MEM_BOT + 20 + Math.random() * 0.5;
            ion.x += (chX + (Math.random() - 0.5) * 40 - ion.x) * 0.04;
            ion.y += (ty - ion.y) * 0.06;
          }
        }
        // At halfway, transfer ions to inside pool
        if (ft > 0.55 && fireNaIons.length > 0) {
          for (const ion of fireNaIons) {
            ion.side = 'in'; ion.y = MEM_BOT + 18;
            naIons.push(ion);
          }
          fireNaIons = [];
          updateAtpDisp();
        }
        if (fireT >= FIRE_DUR) {
          fireActive = false; fireT = 0;
          updateAtpDisp();
        }
      }

      // Voltage trace update (every ~33ms = ~30fps for trace)
      const vTickMs = 33;
      // Compute current membrane voltage from Na+ gradient
      // Simplified: V ~ -70 + 110 * (firing spike shape)
      let vNow = -70;
      if (fireActive) {
        const ft = fireT / FIRE_DUR;
        // Action potential shape: fast depolarization, overshoot, repolarization
        if (ft < 0.15)      vNow = -70 + 110 * (ft / 0.15);        // rapid rise to +40
        else if (ft < 0.25) vNow = 40;                               // peak
        else if (ft < 0.5)  vNow = 40 - 120 * ((ft - 0.25) / 0.25); // repolarize to -80
        else if (ft < 0.75) vNow = -80 + 10 * ((ft - 0.5) / 0.25);  // recovery to -70
        else                vNow = -70;
      }
      vTrace[vTraceIdx] = vNow;
      vTraceIdx = (vTraceIdx + 1) % V_TRACE_LEN;

      // Diffusion leak
      leakTimer += dt;
      if (leakTimer >= LEAK_INTERVAL && pumpPhase === null && !fireActive) {
        leakTimer -= LEAK_INTERVAL;
        const naIn = naIons.filter(i => i.side === 'in');
        const naOut = naIons.filter(i => i.side === 'out');
        const kIn  = kIons.filter(i => i.side === 'in');
        const kOut = kIons.filter(i => i.side === 'out');
        if (Math.random() < 0.5) {
          if (naOut.length > naIn.length && naOut.length > 0) {
            const ion = naOut[Math.floor(Math.random() * naOut.length)];
            ion.side = 'in'; ion.y = MEM_BOT + 16; ion.vy = 2;
          } else if (naIn.length > naOut.length && naIn.length > 0) {
            const ion = naIn[Math.floor(Math.random() * naIn.length)];
            ion.side = 'out'; ion.y = MEM_TOP - 10; ion.vy = -2;
          }
        } else {
          if (kIn.length > kOut.length && kIn.length > 0) {
            const ion = kIn[Math.floor(Math.random() * kIn.length)];
            ion.side = 'out'; ion.y = MEM_TOP - 10; ion.vy = -2;
          } else if (kOut.length > kIn.length && kOut.length > 0) {
            const ion = kOut[Math.floor(Math.random() * kOut.length)];
            ion.side = 'in'; ion.y = MEM_BOT + 16; ion.vy = 2;
          }
        }
      }

      drawNaK();
      activeAnimations['nak-pump'] = requestAnimationFrame(animateNaK);
    }

    // ---- Pump button ----
    function startPump() {
      if (atp <= 0 || pumpPhase !== null) return;
      // Need at least 1 Na+ inside and 1 K+ outside to pump
      const naInside = naIons.filter(i => i.side === 'in')
        .sort((a, b) => Math.abs(a.x - PUMP_CX) - Math.abs(b.x - PUMP_CX));
      const kOutside = kIons.filter(i => i.side === 'out')
        .sort((a, b) => Math.abs(a.x - PUMP_CX) - Math.abs(b.x - PUMP_CX));
      if (naInside.length === 0 && kOutside.length === 0) return;
      pumpNaIons = [];
      for (let i = 0; i < Math.min(3, naInside.length); i++) {
        const ion = naInside[i];
        naIons.splice(naIons.indexOf(ion), 1);
        pumpNaIons.push(ion);
      }
      pumpKIons = [];
      for (let i = 0; i < Math.min(2, kOutside.length); i++) {
        const ion = kOutside[i];
        kIons.splice(kIons.indexOf(ion), 1);
        pumpKIons.push(ion);
      }
      atp--; pumpPhase = 0; pumpT = 0;
      updateAtpDisp();
    }

    // ---- Fire neuron: Na+ rushes in through channel ----
    function fireNeuron() {
      if (fireActive || pumpPhase !== null) return;
      const naOut = naIons.filter(i => i.side === 'out');
      const naIn  = naIons.filter(i => i.side === 'in');
      if (naOut.length <= naIn.length + 1) return; // not enough gradient
      // Grab 2 Na+ from outside (simulating channel opening)
      const grab = Math.min(2, naOut.length);
      fireNaIons = [];
      const sorted = naOut.sort((a, b) => Math.abs(a.x - (PUMP_CX - 120)) - Math.abs(b.x - (PUMP_CX - 120)));
      for (let i = 0; i < grab; i++) {
        const ion = sorted[i];
        naIons.splice(naIons.indexOf(ion), 1);
        fireNaIons.push(ion);
      }
      fireActive = true; fireT = 0;
      fireCount++;
      updateAtpDisp();
    }

    pumpBtn?.addEventListener('click', startPump);
    fireBtn?.addEventListener('click', fireNeuron);
    resetBtnNaK?.addEventListener('click', () => {
      if (activeAnimations['nak-pump']) cancelAnimationFrame(activeAnimations['nak-pump']);
      initState(); pumpLastTS = null;
      activeAnimations['nak-pump'] = requestAnimationFrame(animateNaK);
    });

    initState(); pumpLastTS = null;
    activeAnimations['nak-pump'] = requestAnimationFrame(animateNaK);
  }

}


// =============================================================================
// CH7: Ensembles - Boltzmann Distribution
// =============================================================================
function initCh7Vis() {
  const c = document.getElementById('vis-boltzmann');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const tempSlider = document.getElementById('boltz-temp');
  const nLevels = 10;       // energy levels 0..9
  const nParticles = 80;
  const particleRadius = 4;

  // Each particle stores its current level
  const particles = [];
  for (let i = 0; i < nParticles; i++) particles.push(0); // start all at ground state

  // Occupation counts
  const counts = new Array(nLevels).fill(0);
  counts[0] = nParticles;

  // Smoothed fractions for display (exponential moving average)
  const smoothFrac = new Array(nLevels).fill(0);
  smoothFrac[0] = 1;

  function recomputeCounts() {
    counts.fill(0);
    for (let i = 0; i < nParticles; i++) counts[particles[i]]++;
  }

  // Metropolis step: pick a random particle, propose ±1 level, accept/reject
  function metropolisStep(beta) {
    const idx = Math.floor(Math.random() * nParticles);
    const curLevel = particles[idx];
    const newLevel = curLevel + (Math.random() < 0.5 ? 1 : -1);
    if (newLevel < 0 || newLevel >= nLevels) return;
    const dE = newLevel - curLevel; // energy = level index (in units of ε)
    if (dE <= 0 || Math.random() < Math.exp(-beta * dE)) {
      counts[curLevel]--;
      counts[newLevel]++;
      particles[idx] = newLevel;
    }
  }

  // Instantly redistribute all particles according to Boltzmann at given beta
  function redistributeAll(beta) {
    // Compute cumulative distribution
    const weights = [];
    let Z = 0;
    for (let l = 0; l < nLevels; l++) {
      const w = Math.exp(-beta * l);
      weights.push(w);
      Z += w;
    }
    const cdf = [];
    let cum = 0;
    for (let l = 0; l < nLevels; l++) {
      cum += weights[l] / Z;
      cdf.push(cum);
    }
    // Sample each particle
    for (let i = 0; i < nParticles; i++) {
      const r = Math.random();
      for (let l = 0; l < nLevels; l++) {
        if (r < cdf[l]) { particles[i] = l; break; }
      }
    }
    recomputeCounts();
    // Reset smoothed fractions to current
    for (let l = 0; l < nLevels; l++) smoothFrac[l] = counts[l] / nParticles;
  }

  // Initialize at current temperature
  redistributeAll(1.0 / parseFloat(tempSlider?.value || 1));

  let lastBeta = 1.0 / parseFloat(tempSlider?.value || 1);
  let frameCount = 0;

  function draw() {
    const T = parseFloat(tempSlider?.value || 1);
    const beta = 1.0 / T;

    // If temperature changed significantly, redistribute immediately
    if (Math.abs(beta - lastBeta) > 0.01) {
      redistributeAll(beta);
      lastBeta = beta;
    }

    // Only update physics every 8th frame to slow visible blinking
    frameCount++;
    if (frameCount % 8 === 0) {
      const stepsPerFrame = Math.floor(nParticles / 2);
      for (let s = 0; s < stepsPerFrame; s++) metropolisStep(beta);
      recomputeCounts();

      // Update smoothed fractions
      const alpha = 0.03;
      for (let l = 0; l < nLevels; l++) {
        smoothFrac[l] += alpha * (counts[l] / nParticles - smoothFrac[l]);
      }
    }

    clearCanvas(ctx, W, H);

    // Layout: left panel = energy levels + particles, right panel = histogram
    const divider = W * 0.48;
    const margin = 20;
    const topY = 40;
    const botY = H - 30;
    const levelH = (botY - topY) / nLevels;

    // ===== LEFT: Energy level diagram =====
    const levelLeft = margin + 10;
    const levelRight = divider - 30;
    const levelW = levelRight - levelLeft;

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_LG;
    ctx.textAlign = 'center';
    ctx.fillText('Energy Levels', (levelLeft + levelRight) / 2, topY - 10);

    // Draw levels and particles
    for (let l = 0; l < nLevels; l++) {
      const y = botY - (l + 0.5) * levelH;

      // Level line
      ctx.strokeStyle = COLORS.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(levelLeft, y);
      ctx.lineTo(levelRight, y);
      ctx.stroke();

      // Level label
      ctx.fillStyle = COLORS.textDim;
      ctx.font = FONT_SM;
      ctx.textAlign = 'right';
      ctx.fillText(l.toString(), levelLeft - 5, y + 4);
    }

    // Energy axis label
    ctx.save();
    ctx.fillStyle = COLORS.textDim;
    ctx.font = FONT_SM;
    ctx.translate(margin - 2, (topY + botY) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Energy \u2192', 0, 0);
    ctx.restore();

    // Draw particles as colored dots on their levels
    const particleColors = [COLORS.blue, COLORS.cyan, COLORS.green, COLORS.orange, COLORS.yellow, COLORS.pink, COLORS.purple, COLORS.red];
    const maxPerRow = Math.floor(levelW / (particleRadius * 2.5));
    const dx = particleRadius * 2.5;
    const dy = particleRadius * 2.2;
    // Group by level and draw sequentially
    for (let l = 0; l < nLevels; l++) {
      const baseY = botY - (l + 0.5) * levelH;
      let idx = 0;
      for (let i = 0; i < nParticles; i++) {
        if (particles[i] !== l) continue;
        const col = idx % maxPerRow;
        const row = Math.floor(idx / maxPerRow);
        const xPos = levelLeft + dx * 0.5 + col * dx;
        const yPos = baseY - particleRadius - row * dy;
        ctx.fillStyle = particleColors[i % particleColors.length];
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(xPos, yPos, particleRadius, 0, Math.PI * 2);
        ctx.fill();
        idx++;
      }
    }
    ctx.globalAlpha = 1;

    // ===== RIGHT: Histogram =====
    const histLeft = divider + 20;
    const histRight = W - margin;
    const histW = histRight - histLeft;
    const barMaxW = histW - 40; // leave room for theory dots

    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_LG;
    ctx.textAlign = 'center';
    ctx.fillText('Occupation Fraction', (histLeft + histRight) / 2, topY - 10);

    // Compute theoretical Boltzmann probabilities
    const theory = [];
    let Z = 0;
    for (let l = 0; l < nLevels; l++) { const w = Math.exp(-beta * l); theory.push(w); Z += w; }
    for (let l = 0; l < nLevels; l++) theory[l] /= Z;
    const maxProb = Math.max(...theory, ...smoothFrac, 0.05);

    for (let l = 0; l < nLevels; l++) {
      const y = botY - (l + 0.5) * levelH;
      const barH = levelH * 0.6;

      // Measured bar
      const barW = (smoothFrac[l] / maxProb) * barMaxW;
      ctx.fillStyle = 'rgba(79,195,247,0.5)';
      ctx.fillRect(histLeft, y - barH / 2, barW, barH);
      ctx.strokeStyle = COLORS.blue;
      ctx.lineWidth = 1;
      ctx.strokeRect(histLeft, y - barH / 2, barW, barH);

      // Theory dot
      const thX = histLeft + (theory[l] / maxProb) * barMaxW;
      ctx.fillStyle = COLORS.text;
      ctx.beginPath();
      ctx.arc(thX, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Level label on left of histogram
      ctx.fillStyle = COLORS.textDim;
      ctx.font = FONT_SM;
      ctx.textAlign = 'right';
      ctx.fillText('n=' + l, histLeft - 4, y + 4);
    }

    // Axis line for histogram
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(histLeft, topY);
    ctx.lineTo(histLeft, botY);
    ctx.stroke();

    // Legend
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(histLeft + 5, botY + 6, 14, 10);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = FONT_SM;
    ctx.textAlign = 'left';
    ctx.fillText('Measured', histLeft + 23, botY + 15);

    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.arc(histLeft + 85, botY + 11, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Theory e^{\u2212\u03B2\u03B5}/Z', histLeft + 93, botY + 15);

    // Temperature readout
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_LG;
    ctx.textAlign = 'left';
    ctx.fillText('kT = ' + T.toFixed(2) + '\u03B5     \u03B2 = ' + beta.toFixed(2) + '/\u03B5', margin + 5, H - 5);

    // Mean energy
    let meanE = 0;
    for (let l = 0; l < nLevels; l++) meanE += l * smoothFrac[l];
    ctx.fillStyle = COLORS.red;
    ctx.textAlign = 'right';
    ctx.fillText('\u27E8E\u27E9 = ' + meanE.toFixed(2) + '\u03B5', W - margin, H - 5);

    document.getElementById('boltz-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(2)));

    activeAnimations['boltzmann'] = requestAnimationFrame(draw);
  }

  tempSlider?.addEventListener('input', () => {
    const T = parseFloat(tempSlider.value);
    const beta = 1.0 / T;
    redistributeAll(beta);
    lastBeta = beta;
  });

  draw();

  // ----- Harmonic Oscillator E and Cv -----
  const cHO = document.getElementById('vis-ho-ecv');
  if (cHO) {
    const ho = setupCanvas(cHO);
    const ctxHO = ho.ctx, WHO = ho.W, HHO = ho.H;
    const oxHO = 65, oyHO = 25, pwHO = WHO - oxHO - 40, phHO = HHO - oyHO - 50;
    const xMaxHO = 5.0, yMaxE = 5.5, yMaxCv = 1.1;
    let hoverXHO = -1;

    function hoEnergy(x) {
      if (x < 0.001) return 0.5;
      return 1.0 / (Math.exp(1.0 / x) - 1) + 0.5;
    }
    function hoCv(x) {
      if (x < 0.001) return 0;
      const u = 1.0 / x;
      if (u > 50) return 0;
      const eu = Math.exp(u);
      return (u * u * eu) / ((eu - 1) * (eu - 1));
    }

    function drawHO() {
      clearCanvas(ctxHO, WHO, HHO);
      drawAxes(ctxHO, oxHO, oyHO, pwHO, phHO, { xLabel: 'k\u2082T / \u210F\u03C9', yLabel: '\u27E8E\u27E9 / \u210F\u03C9', yLabelOffset: 45 });

      // Right axis label
      ctxHO.fillStyle = COLORS.green; ctxHO.font = FONT_SM;
      ctxHO.save(); ctxHO.translate(oxHO + pwHO + 25, oyHO + phHO / 2); ctxHO.rotate(Math.PI / 2); ctxHO.textAlign = 'center'; ctxHO.fillText('C_V / k_B', 0, 0); ctxHO.restore();

      const nPts = 400;

      // Classical limit dashed line E = kT
      ctxHO.strokeStyle = COLORS.textDim; ctxHO.lineWidth = 1; ctxHO.setLineDash([4, 4]);
      ctxHO.beginPath();
      for (let i = 0; i <= nPts; i++) {
        const x = xMaxHO * i / nPts, px = oxHO + (x / xMaxHO) * pwHO, py = oyHO + phHO - (x / yMaxE) * phHO;
        i === 0 ? ctxHO.moveTo(px, py) : ctxHO.lineTo(px, py);
      }
      ctxHO.stroke(); ctxHO.setLineDash([]);
      ctxHO.fillStyle = COLORS.textDim; ctxHO.font = '10px Inter, system-ui, sans-serif'; ctxHO.textAlign = 'left';
      ctxHO.fillText('Classical: E = kT', oxHO + pwHO - 90, oyHO + 15);

      // Zero-point energy
      const zpY = oyHO + phHO - (0.5 / yMaxE) * phHO;
      ctxHO.strokeStyle = COLORS.textDim; ctxHO.setLineDash([2, 4]); ctxHO.lineWidth = 1;
      ctxHO.beginPath(); ctxHO.moveTo(oxHO, zpY); ctxHO.lineTo(oxHO + pwHO, zpY); ctxHO.stroke(); ctxHO.setLineDash([]);
      ctxHO.fillText('\u00BD\u210F\u03C9', oxHO + 2, zpY - 4);

      // Energy curve (blue)
      ctxHO.strokeStyle = COLORS.blue; ctxHO.lineWidth = 2.5; ctxHO.beginPath();
      for (let i = 0; i <= nPts; i++) {
        const x = xMaxHO * i / nPts, px = oxHO + (x / xMaxHO) * pwHO, py = oyHO + phHO - (hoEnergy(x) / yMaxE) * phHO;
        i === 0 ? ctxHO.moveTo(px, py) : ctxHO.lineTo(px, py);
      }
      ctxHO.stroke();

      // Cv curve (green)
      ctxHO.strokeStyle = COLORS.green; ctxHO.lineWidth = 2.5; ctxHO.beginPath();
      for (let i = 0; i <= nPts; i++) {
        const x = xMaxHO * i / nPts, px = oxHO + (x / xMaxHO) * pwHO, py = oyHO + phHO - (hoCv(x) / yMaxCv) * phHO;
        i === 0 ? ctxHO.moveTo(px, py) : ctxHO.lineTo(px, py);
      }
      ctxHO.stroke();

      // Cv=1 classical limit
      ctxHO.strokeStyle = COLORS.green; ctxHO.globalAlpha = 0.3; ctxHO.setLineDash([4, 4]); ctxHO.lineWidth = 1;
      const cv1Y = oyHO + phHO - (1.0 / yMaxCv) * phHO;
      ctxHO.beginPath(); ctxHO.moveTo(oxHO, cv1Y); ctxHO.lineTo(oxHO + pwHO, cv1Y); ctxHO.stroke();
      ctxHO.setLineDash([]); ctxHO.globalAlpha = 1.0;

      // X ticks
      ctxHO.fillStyle = COLORS.textDim; ctxHO.font = '10px Inter, system-ui, sans-serif'; ctxHO.textAlign = 'center';
      for (let v = 0; v <= xMaxHO; v++) { ctxHO.fillText(v.toString(), oxHO + (v / xMaxHO) * pwHO, oyHO + phHO + 12); }
      // Left Y ticks (E)
      ctxHO.fillStyle = COLORS.blue; ctxHO.textAlign = 'right';
      for (let v = 0; v <= 5; v++) { ctxHO.fillText(v.toString(), oxHO - 5, oyHO + phHO - (v / yMaxE) * phHO + 4); }
      // Right Y ticks (Cv)
      ctxHO.fillStyle = COLORS.green; ctxHO.textAlign = 'left';
      [0, 0.5, 1.0].forEach(v => { ctxHO.fillText(v.toFixed(1), oxHO + pwHO + 4, oyHO + phHO - (v / yMaxCv) * phHO + 4); });

      // Legend
      ctxHO.font = FONT; ctxHO.textAlign = 'left';
      ctxHO.fillStyle = COLORS.blue; ctxHO.fillText('\u2014 \u27E8E\u27E9/\u210F\u03C9', oxHO + 10, oyHO + 12);
      ctxHO.fillStyle = COLORS.green; ctxHO.fillText('\u2014 C_V/k_B', oxHO + 120, oyHO + 12);

      // Hover
      if (hoverXHO >= oxHO && hoverXHO <= oxHO + pwHO) {
        const x = ((hoverXHO - oxHO) / pwHO) * xMaxHO;
        ctxHO.strokeStyle = 'rgba(255,255,255,0.2)'; ctxHO.lineWidth = 1;
        ctxHO.beginPath(); ctxHO.moveTo(hoverXHO, oyHO); ctxHO.lineTo(hoverXHO, oyHO + phHO); ctxHO.stroke();
        ctxHO.fillStyle = COLORS.blue; ctxHO.beginPath(); ctxHO.arc(hoverXHO, oyHO + phHO - (hoEnergy(x) / yMaxE) * phHO, 4, 0, 2 * Math.PI); ctxHO.fill();
        ctxHO.fillStyle = COLORS.green; ctxHO.beginPath(); ctxHO.arc(hoverXHO, oyHO + phHO - (hoCv(x) / yMaxCv) * phHO, 4, 0, 2 * Math.PI); ctxHO.fill();
        ctxHO.fillStyle = COLORS.text; ctxHO.font = FONT_SM; ctxHO.textAlign = 'center';
        ctxHO.fillText('kT/\u210F\u03C9 = ' + x.toFixed(2) + '   E/\u210F\u03C9 = ' + hoEnergy(x).toFixed(3) + '   C_V/k_B = ' + hoCv(x).toFixed(3), oxHO + pwHO / 2, oyHO + phHO + 38);
      }
    }

    cHO.addEventListener('mousemove', (e) => { hoverXHO = e.clientX - cHO.getBoundingClientRect().left; drawHO(); });
    cHO.addEventListener('mouseleave', () => { hoverXHO = -1; drawHO(); });
    drawHO();
  }

  // ----- H2 Heat Capacity: Unfreezing Degrees of Freedom -----
  const cH2 = document.getElementById('vis-h2vib');
  if (cH2) {
    const h2s = setupCanvas(cH2);
    const ctxH2 = h2s.ctx, WH2 = h2s.W, HH2 = h2s.H;
    const tempSlider = document.getElementById('h2vib-temp');
    const thetaRot = 85, thetaVib = 6300;

    function einsteinCV(theta, T) {
      const u = theta / T;
      if (u > 50) return 0; if (u < 0.001) return 1;
      const eu = Math.exp(u);
      return (u * u * eu) / ((eu - 1) * (eu - 1));
    }

    function drawH2() {
      const Tcur = parseFloat(tempSlider?.value || 300);
      document.getElementById('h2vib-temp-val')?.replaceChildren(document.createTextNode(Tcur.toString()));
      clearCanvas(ctxH2, WH2, HH2);

      // Layout: left plot, right bar chart + molecule
      const plotW = WH2 * 0.55, barX = WH2 * 0.62;
      const oxH2 = 55, oyH2 = 20, pwH2 = plotW - oxH2 - 10, phH2 = HH2 - oyH2 - 55;
      const logTmin = 1, logTmax = 4, cvMax = 4.0;
      const xScale = pwH2 / (logTmax - logTmin), yScale = phH2 / cvMax;

      // ---- LEFT: CV vs T plot ----
      drawAxes(ctxH2, oxH2, oyH2, pwH2, phH2, { xLabel: 'T (K)  [log scale]', yLabel: 'C_V / Nk_B', yLabelOffset: 38 });

      // Plateau lines
      [{val:1.5,label:'3/2'},{val:2.5,label:'5/2'},{val:3.5,label:'7/2'}].forEach(pl => {
        const py = oyH2 + phH2 - pl.val * yScale;
        ctxH2.strokeStyle = 'rgba(255,255,255,0.10)'; ctxH2.lineWidth = 1; ctxH2.setLineDash([4, 4]);
        ctxH2.beginPath(); ctxH2.moveTo(oxH2, py); ctxH2.lineTo(oxH2 + pwH2, py); ctxH2.stroke(); ctxH2.setLineDash([]);
        ctxH2.fillStyle = COLORS.textDim; ctxH2.font = '10px Inter, system-ui, sans-serif'; ctxH2.textAlign = 'right';
        ctxH2.fillText(pl.label, oxH2 - 22, py + 4);
      });

      // Theory curve
      ctxH2.strokeStyle = COLORS.blue; ctxH2.lineWidth = 2; ctxH2.beginPath();
      for (let i = 0; i <= 500; i++) {
        const logT = logTmin + (logTmax - logTmin) * i / 500;
        const T = Math.pow(10, logT);
        const cv = 1.5 + einsteinCV(thetaRot, T) + einsteinCV(thetaVib, T);
        const px = oxH2 + (logT - logTmin) * xScale, py = oyH2 + phH2 - cv * yScale;
        i === 0 ? ctxH2.moveTo(px, py) : ctxH2.lineTo(px, py);
      }
      ctxH2.stroke();

      // Experimental data
      ctxH2.fillStyle = COLORS.yellow;
      [[50,1.5],[100,1.5],[200,2.3],[250,2.45],[300,2.49],[400,2.50],[500,2.50],[700,2.52],[1000,2.60],[1500,2.85],[2000,3.05],[2500,3.20],[3000,3.30],[4000,3.42],[5000,3.47],[6000,3.49]].forEach(([T, cv]) => {
        const px = oxH2 + (Math.log10(T) - logTmin) * xScale, py = oyH2 + phH2 - cv * yScale;
        ctxH2.beginPath(); ctxH2.arc(px, py, 3, 0, 2 * Math.PI); ctxH2.fill();
      });

      // X ticks
      ctxH2.fillStyle = COLORS.textDim; ctxH2.font = '10px Inter, system-ui, sans-serif'; ctxH2.textAlign = 'center';
      [10, 100, 1000, 10000].forEach(T => { ctxH2.fillText(T.toString(), oxH2 + (Math.log10(T) - logTmin) * xScale, oyH2 + phH2 + 24); });
      // Y ticks
      ctxH2.textAlign = 'right';
      for (let cv = 0; cv <= cvMax; cv += 1) { ctxH2.fillText(cv.toFixed(0), oxH2 - 5, oyH2 + phH2 - cv * yScale + 4); }

      // Current temperature marker (vertical line + dot on curve)
      const logTcur = Math.log10(Tcur);
      if (logTcur >= logTmin && logTcur <= logTmax) {
        const markerX = oxH2 + (logTcur - logTmin) * xScale;
        const cvCur = 1.5 + einsteinCV(thetaRot, Tcur) + einsteinCV(thetaVib, Tcur);
        const markerY = oyH2 + phH2 - cvCur * yScale;
        // Vertical line
        ctxH2.strokeStyle = 'rgba(255,255,255,0.3)'; ctxH2.lineWidth = 1; ctxH2.setLineDash([3, 3]);
        ctxH2.beginPath(); ctxH2.moveTo(markerX, oyH2); ctxH2.lineTo(markerX, oyH2 + phH2); ctxH2.stroke(); ctxH2.setLineDash([]);
        // Dot on curve
        ctxH2.fillStyle = '#fff'; ctxH2.beginPath(); ctxH2.arc(markerX, markerY, 5, 0, 2 * Math.PI); ctxH2.fill();
        ctxH2.fillStyle = COLORS.blue; ctxH2.beginPath(); ctxH2.arc(markerX, markerY, 3.5, 0, 2 * Math.PI); ctxH2.fill();
        // CV value label
        ctxH2.fillStyle = COLORS.text; ctxH2.font = '11px Inter, system-ui, sans-serif'; ctxH2.textAlign = 'center';
        ctxH2.fillText('C_V = ' + cvCur.toFixed(2) + ' Nk_B', markerX, Math.max(oyH2 + 12, markerY - 12));
      }

      // ---- RIGHT: Stacked contribution bars ----
      const cvTrans = 1.5;
      const cvRot = einsteinCV(thetaRot, Tcur);
      const cvVibr = einsteinCV(thetaVib, Tcur);
      const cvTotal = cvTrans + cvRot + cvVibr;

      const barW = 50, barMaxH = phH2 * 0.85;
      const barLeft = barX + 20, barBottom = oyH2 + phH2;

      // Bar sections (bottom to top: translation, rotation, vibration)
      const sections = [
        { val: cvTrans, max: 1.5, color: COLORS.blue, label: 'Translation' },
        { val: cvRot, max: 1.0, color: COLORS.orange, label: 'Rotation' },
        { val: cvVibr, max: 1.0, color: COLORS.purple, label: 'Vibration' },
      ];

      // Scale: 3.5 = full bar height
      const barScale = barMaxH / 3.5;
      let yBottom = barBottom;

      // Draw stacked bar
      sections.forEach(s => {
        const sH = s.val * barScale;
        if (sH > 0.5) {
          ctxH2.fillStyle = s.color; ctxH2.globalAlpha = 0.7;
          ctxH2.fillRect(barLeft, yBottom - sH, barW, sH);
          ctxH2.globalAlpha = 1.0;
          // Border
          ctxH2.strokeStyle = s.color; ctxH2.lineWidth = 1.5;
          ctxH2.strokeRect(barLeft, yBottom - sH, barW, sH);
        }
        yBottom -= sH;
      });

      // Max outline (7/2 = 3.5)
      const maxBarH = 3.5 * barScale;
      ctxH2.strokeStyle = 'rgba(255,255,255,0.15)'; ctxH2.lineWidth = 1; ctxH2.setLineDash([4, 4]);
      ctxH2.strokeRect(barLeft, barBottom - maxBarH, barW, maxBarH);
      ctxH2.setLineDash([]);

      // Labels next to bar
      ctxH2.font = '11px Inter, system-ui, sans-serif'; ctxH2.textAlign = 'left';
      const labelX = barLeft + barW + 10;
      yBottom = barBottom;
      sections.forEach(s => {
        const sH = s.val * barScale;
        const midY = yBottom - sH / 2;
        if (s.val > 0.02) {
          ctxH2.fillStyle = s.color;
          ctxH2.fillText(s.label, labelX, midY - 6);
          ctxH2.fillStyle = COLORS.text;
          ctxH2.fillText(s.val.toFixed(2) + ' / ' + s.max.toFixed(1), labelX, midY + 8);
        }
        yBottom -= sH;
      });

      // Total label
      ctxH2.fillStyle = COLORS.text; ctxH2.font = '12px Inter, system-ui, sans-serif';
      ctxH2.textAlign = 'center';
      ctxH2.fillText('Total: ' + cvTotal.toFixed(2), barLeft + barW / 2, barBottom + 18);
      ctxH2.fillText('C_V / Nk_B', barLeft + barW / 2, barBottom + 32);

      // ---- RIGHT: Molecule diagram ----
      const molX = barLeft + barW / 2, molY = oyH2 + 40;
      const atomR = 10, bondLen = 22;

      // Determine activity levels
      const rotActive = cvRot / 1.0; // 0 to 1
      const vibActive = cvVibr / 1.0;
      const t = performance.now() / 1000;

      // Vibration: oscillate bond length
      const vibAmp = vibActive * 6;
      const vibOffset = vibAmp * Math.sin(t * 8);

      // Rotation: show rotation arrows
      const rotAngle = rotActive > 0.05 ? t * 3 * rotActive : 0;

      // Draw bond
      const ax1 = molX - bondLen - vibOffset / 2, ax2 = molX + bondLen + vibOffset / 2;
      ctxH2.strokeStyle = 'rgba(255,255,255,0.5)'; ctxH2.lineWidth = 2;
      ctxH2.beginPath(); ctxH2.moveTo(ax1, molY); ctxH2.lineTo(ax2, molY); ctxH2.stroke();

      // Draw atoms
      [ax1, ax2].forEach(ax => {
        ctxH2.fillStyle = COLORS.blue; ctxH2.globalAlpha = 0.8;
        ctxH2.beginPath(); ctxH2.arc(ax, molY, atomR, 0, 2 * Math.PI); ctxH2.fill();
        ctxH2.globalAlpha = 1.0;
        ctxH2.fillStyle = '#fff'; ctxH2.font = '10px Inter, system-ui, sans-serif'; ctxH2.textAlign = 'center';
        ctxH2.fillText('H', ax, molY + 4);
      });

      // Rotation arc indicators
      if (rotActive > 0.05) {
        ctxH2.strokeStyle = COLORS.orange; ctxH2.lineWidth = 1.5; ctxH2.globalAlpha = Math.min(rotActive, 0.8);
        const arcR = bondLen + atomR + 6;
        ctxH2.beginPath(); ctxH2.arc(molX, molY, arcR, -0.6 + rotAngle, 0.6 + rotAngle); ctxH2.stroke();
        // Arrow head
        const aEnd = 0.6 + rotAngle;
        const ahx = molX + arcR * Math.cos(aEnd), ahy = molY + arcR * Math.sin(aEnd);
        ctxH2.fillStyle = COLORS.orange;
        ctxH2.beginPath();
        ctxH2.moveTo(ahx + 5 * Math.cos(aEnd + 1.2), ahy + 5 * Math.sin(aEnd + 1.2));
        ctxH2.lineTo(ahx, ahy);
        ctxH2.lineTo(ahx + 5 * Math.cos(aEnd + 2.5), ahy + 5 * Math.sin(aEnd + 2.5));
        ctxH2.fill();
        ctxH2.globalAlpha = 1.0;
      }

      // Vibration arrows (stretch indicators)
      if (vibActive > 0.05) {
        ctxH2.strokeStyle = COLORS.purple; ctxH2.lineWidth = 1.5; ctxH2.globalAlpha = Math.min(vibActive, 0.8);
        // Left arrow
        const arrY = molY + atomR + 8;
        ctxH2.beginPath(); ctxH2.moveTo(ax1 + 6, arrY); ctxH2.lineTo(ax1 - 4, arrY); ctxH2.stroke();
        ctxH2.beginPath(); ctxH2.moveTo(ax1 - 4, arrY); ctxH2.lineTo(ax1, arrY - 3); ctxH2.lineTo(ax1, arrY + 3); ctxH2.fill();
        // Right arrow
        ctxH2.beginPath(); ctxH2.moveTo(ax2 - 6, arrY); ctxH2.lineTo(ax2 + 4, arrY); ctxH2.stroke();
        ctxH2.beginPath(); ctxH2.moveTo(ax2 + 4, arrY); ctxH2.lineTo(ax2, arrY - 3); ctxH2.lineTo(ax2, arrY + 3); ctxH2.fill();
        ctxH2.globalAlpha = 1.0;
      }

      // Translation arrows (always active)
      ctxH2.strokeStyle = COLORS.blue; ctxH2.lineWidth = 1.5; ctxH2.globalAlpha = 0.6;
      const tArrY = molY - atomR - 10;
      ctxH2.beginPath(); ctxH2.moveTo(molX - 15, tArrY); ctxH2.lineTo(molX + 15, tArrY); ctxH2.stroke();
      ctxH2.beginPath(); ctxH2.moveTo(molX + 15, tArrY); ctxH2.lineTo(molX + 11, tArrY - 3); ctxH2.lineTo(molX + 11, tArrY + 3); ctxH2.fill();
      ctxH2.globalAlpha = 1.0;

      // Mode labels under molecule
      ctxH2.font = '10px Inter, system-ui, sans-serif'; ctxH2.textAlign = 'center';
      ctxH2.fillStyle = COLORS.textDim;
      ctxH2.fillText('H\u2082 molecule', molX, molY + atomR + 24);

      // Legend
      ctxH2.font = FONT_SM; ctxH2.textAlign = 'left';
      ctxH2.fillStyle = COLORS.blue; ctxH2.fillText('\u2014 Theory', oxH2 + 5, oyH2 + 12);
      ctxH2.fillStyle = COLORS.yellow; ctxH2.fillText('\u25CF Data', oxH2 + 70, oyH2 + 12);

      // Animate if vibration or rotation active
      if (vibActive > 0.05 || rotActive > 0.05) {
        activeAnimations['h2vib'] = requestAnimationFrame(drawH2);
      } else {
        delete activeAnimations['h2vib'];
      }
    }

    tempSlider?.addEventListener('input', () => {
      if (activeAnimations['h2vib']) cancelAnimationFrame(activeAnimations['h2vib']);
      drawH2();
    });
    drawH2();
  }

  // ----- Dissociation Equilibrium: A + A ⇌ A₂ -----
  const cCP = document.getElementById('vis-chempot');
  if (cCP) {
    const cpSetup = setupCanvas(cCP);
    const ctxCP = cpSetup.ctx, WCP = cpSetup.W, HCP = cpSetup.H;

    const cpTempSlider = document.getElementById('chempot-temp');
    const cpTempVal = document.getElementById('chempot-temp-val');
    const cpEpsSlider = document.getElementById('chempot-eps');
    const cpEpsVal = document.getElementById('chempot-eps-val');
    const cpSpdSlider = document.getElementById('chempot-speed');
    const cpSpdVal = document.getElementById('chempot-speed-val');

    // Layout: sim box left, μ panel + bars right
    const cpSimW = Math.floor(WCP * 0.55);
    const cpM = 10;
    const cpBoxL = cpM, cpBoxR = cpSimW - cpM, cpBoxT = cpM, cpBoxB = HCP - cpM;

    const cpPR = 5;
    const cpBondLen = 14;
    const cpNTotal = 36;

    let cpAtoms = [];
    let cpDimers = [];
    let cpMeasurements = [];  // {epsOverT, fracBound, age}
    let cpFrameCount = 0;
    let cpSmoothFrac = 0.5;  // EMA of fraction bound

    function cpGetT() { return parseFloat(cpTempSlider?.value || 1.5); }
    function cpGetEps() { return parseFloat(cpEpsSlider?.value || 3.0); }
    // T=0.3 → ~4.4, T=1.5 → ~9.8, T=4 → ~16
    function cpSpdScale(T) { return 8 * Math.sqrt(T); }

    function cpRandSpd(T) {
      var s = cpSpdScale(T);
      return s * Math.sqrt(-2 * Math.log(1 - Math.random() * 0.999));
    }

    function cpInit() {
      cpAtoms = []; cpDimers = [];
      cpMeasurements = []; cpFrameCount = 0; cpSmoothFrac = 0.5;
      var T = cpGetT();
      for (var i = 0; i < cpNTotal; i++) {
        var spd = cpRandSpd(T);
        var ang = Math.random() * 2 * Math.PI;
        cpAtoms.push({
          x: cpBoxL + cpPR + Math.random() * (cpBoxR - cpBoxL - 2 * cpPR),
          y: cpBoxT + cpPR + Math.random() * (cpBoxB - cpBoxT - 2 * cpPR),
          vx: spd * Math.cos(ang), vy: spd * Math.sin(ang)
        });
      }
    }

    function cpThermo(T) {
      var s = cpSpdScale(T) * 0.7;
      return s * Math.sqrt(-2 * Math.log(1 - Math.random() * 0.999));
    }

    function cpGetSpeed() { return parseFloat(cpSpdSlider?.value || 0.5); }

    function cpStep() {
      var spd = cpGetSpeed();
      // speed 0 → dt=0.01 (nearly frozen), speed 1 → dt=0.7
      var T = cpGetT(), eps = cpGetEps(), dt = 0.01 + spd * 0.69;

      // Move atoms
      for (var k = 0; k < cpAtoms.length; k++) {
        var a = cpAtoms[k];
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < cpBoxL + cpPR) { a.x = cpBoxL + cpPR; a.vx = cpThermo(T); }
        if (a.x > cpBoxR - cpPR) { a.x = cpBoxR - cpPR; a.vx = -cpThermo(T); }
        if (a.y < cpBoxT + cpPR) { a.y = cpBoxT + cpPR; a.vy = cpThermo(T); }
        if (a.y > cpBoxB - cpPR) { a.y = cpBoxB - cpPR; a.vy = -cpThermo(T); }
      }

      // Move dimers
      for (var k = 0; k < cpDimers.length; k++) {
        var d = cpDimers[k];
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.angle += d.omega * dt;
        var R = cpBondLen / 2 + cpPR;
        if (d.x < cpBoxL + R) { d.x = cpBoxL + R; d.vx = cpThermo(T) * 0.5; }
        if (d.x > cpBoxR - R) { d.x = cpBoxR - R; d.vx = -cpThermo(T) * 0.5; }
        if (d.y < cpBoxT + R) { d.y = cpBoxT + R; d.vy = cpThermo(T) * 0.5; }
        if (d.y > cpBoxB - R) { d.y = cpBoxB - R; d.vy = -cpThermo(T) * 0.5; }
      }

      // Atom-atom collisions → possible binding
      var bindDist = 2.5 * cpPR;
      var toRemove = new Set();
      for (var i = 0; i < cpAtoms.length; i++) {
        if (toRemove.has(i)) continue;
        for (var j = i + 1; j < cpAtoms.length; j++) {
          if (toRemove.has(j)) continue;
          var ai = cpAtoms[i], aj = cpAtoms[j];
          var dx = ai.x - aj.x, dy = ai.y - aj.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bindDist) {
            var dvx = ai.vx - aj.vx, dvy = ai.vy - aj.vy;
            var relKE = 0.25 * (dvx * dvx + dvy * dvy);
            var epsThresh = eps * cpSpdScale(T) * cpSpdScale(T) * 0.12;
            if (relKE < epsThresh) {
              var bAng = Math.atan2(dy, dx);
              var tx = -dy / (dist || 1), ty = dx / (dist || 1);
              var omega = (dvx * tx + dvy * ty) / (dist || 1);
              cpDimers.push({
                x: (ai.x + aj.x) / 2, y: (ai.y + aj.y) / 2,
                vx: (ai.vx + aj.vx) / 2, vy: (ai.vy + aj.vy) / 2,
                angle: bAng, omega: omega
              });
              toRemove.add(i); toRemove.add(j);
              break;
            } else {
              var nx = dx / (dist || 1), ny = dy / (dist || 1);
              var dvn = dvx * nx + dvy * ny;
              if (dvn < 0) {
                ai.vx -= dvn * nx; ai.vy -= dvn * ny;
                aj.vx += dvn * nx; aj.vy += dvn * ny;
                var overlap = bindDist - dist;
                if (overlap > 0) {
                  ai.x += nx * overlap * 0.5; ai.y += ny * overlap * 0.5;
                  aj.x -= nx * overlap * 0.5; aj.y -= ny * overlap * 0.5;
                }
              }
            }
          }
        }
      }
      if (toRemove.size > 0) {
        cpAtoms = cpAtoms.filter(function(_, idx) { return !toRemove.has(idx); });
      }

      // Dimer-atom collisions
      for (var di = 0; di < cpDimers.length; di++) {
        var dd = cpDimers[di];
        var ca = Math.cos(dd.angle), sa = Math.sin(dd.angle);
        var px1 = dd.x + ca * cpBondLen / 2, py1 = dd.y + sa * cpBondLen / 2;
        var px2 = dd.x - ca * cpBondLen / 2, py2 = dd.y - sa * cpBondLen / 2;
        for (var ai2 = 0; ai2 < cpAtoms.length; ai2++) {
          var aa = cpAtoms[ai2];
          var pts = [[px1, py1], [px2, py2]];
          for (var pi = 0; pi < pts.length; pi++) {
            var dx = aa.x - pts[pi][0], dy = aa.y - pts[pi][1];
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 2.2 * cpPR) {
              var nx = dx / (dist || 1), ny = dy / (dist || 1);
              var dvn = (aa.vx - dd.vx) * nx + (aa.vy - dd.vy) * ny;
              if (dvn < 0) {
                aa.vx -= dvn * nx * 0.8; aa.vy -= dvn * ny * 0.8;
                dd.vx += dvn * nx * 0.4; dd.vy += dvn * ny * 0.4;
                dd.omega += (dvn * 0.3) / (cpBondLen / 2);
              }
            }
          }
        }
      }

      // Spontaneous dissociation: rate ~ exp(-eps/T)
      var breakProb = 0.02 * (dt / 0.35) * Math.exp(-eps / T);
      for (var i = cpDimers.length - 1; i >= 0; i--) {
        if (Math.random() < breakProb) {
          var dd = cpDimers[i];
          var ca = Math.cos(dd.angle), sa = Math.sin(dd.angle);
          var kick = cpSpdScale(T) * 0.6;
          cpAtoms.push({
            x: dd.x + ca * cpBondLen / 2, y: dd.y + sa * cpBondLen / 2,
            vx: dd.vx + ca * kick * (0.7 + Math.random() * 0.6),
            vy: dd.vy + sa * kick * (0.7 + Math.random() * 0.6)
          });
          cpAtoms.push({
            x: dd.x - ca * cpBondLen / 2, y: dd.y - sa * cpBondLen / 2,
            vx: dd.vx - ca * kick * (0.7 + Math.random() * 0.6),
            vy: dd.vy - sa * kick * (0.7 + Math.random() * 0.6)
          });
          cpDimers.splice(i, 1);
        }
      }

      // Dimer-dimer collisions
      for (var i = 0; i < cpDimers.length; i++) {
        for (var j = i + 1; j < cpDimers.length; j++) {
          var dx = cpDimers[i].x - cpDimers[j].x;
          var dy = cpDimers[i].y - cpDimers[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var minD = cpBondLen + 2 * cpPR;
          if (dist < minD && dist > 0) {
            var nx = dx / dist, ny = dy / dist;
            var dvn = (cpDimers[i].vx - cpDimers[j].vx) * nx + (cpDimers[i].vy - cpDimers[j].vy) * ny;
            if (dvn < 0) {
              cpDimers[i].vx -= dvn * nx * 0.5; cpDimers[i].vy -= dvn * ny * 0.5;
              cpDimers[j].vx += dvn * nx * 0.5; cpDimers[j].vy += dvn * ny * 0.5;
            }
            var overlap = minD - dist;
            cpDimers[i].x += nx * overlap * 0.5; cpDimers[i].y += ny * overlap * 0.5;
            cpDimers[j].x -= nx * overlap * 0.5; cpDimers[j].y -= ny * overlap * 0.5;
          }
        }
      }
    }

    function cpDraw() {
      clearCanvas(ctxCP, WCP, HCP);
      var T = cpGetT(), eps = cpGetEps();
      var nFree = cpAtoms.length, nDim = cpDimers.length;

      // Draw box
      ctxCP.strokeStyle = COLORS.axis; ctxCP.lineWidth = 2;
      ctxCP.strokeRect(cpBoxL, cpBoxT, cpBoxR - cpBoxL, cpBoxB - cpBoxT);

      // Free atoms
      for (var i = 0; i < cpAtoms.length; i++) {
        var a = cpAtoms[i];
        ctxCP.fillStyle = COLORS.blue;
        ctxCP.beginPath(); ctxCP.arc(a.x, a.y, cpPR, 0, 2 * Math.PI); ctxCP.fill();
        ctxCP.strokeStyle = 'rgba(79,195,247,0.3)'; ctxCP.lineWidth = 1; ctxCP.stroke();
      }

      // Dimers
      for (var i = 0; i < cpDimers.length; i++) {
        var d = cpDimers[i];
        var ca = Math.cos(d.angle), sa = Math.sin(d.angle);
        var x1 = d.x + ca * cpBondLen / 2, y1 = d.y + sa * cpBondLen / 2;
        var x2 = d.x - ca * cpBondLen / 2, y2 = d.y - sa * cpBondLen / 2;
        ctxCP.strokeStyle = COLORS.orange; ctxCP.lineWidth = 2.5;
        ctxCP.beginPath(); ctxCP.moveTo(x1, y1); ctxCP.lineTo(x2, y2); ctxCP.stroke();
        ctxCP.fillStyle = COLORS.orange;
        ctxCP.beginPath(); ctxCP.arc(x1, y1, cpPR, 0, 2 * Math.PI); ctxCP.fill();
        ctxCP.beginPath(); ctxCP.arc(x2, y2, cpPR, 0, 2 * Math.PI); ctxCP.fill();
        ctxCP.strokeStyle = 'rgba(255,167,38,0.3)'; ctxCP.lineWidth = 1;
        ctxCP.beginPath(); ctxCP.arc(x1, y1, cpPR, 0, 2 * Math.PI); ctxCP.stroke();
        ctxCP.beginPath(); ctxCP.arc(x2, y2, cpPR, 0, 2 * Math.PI); ctxCP.stroke();
      }

      // ---- Right panel: scatter plot of % bound vs ε/kT ----
      var panL = cpSimW + 8, panR = WCP - 8, panCx = (panL + panR) / 2;

      // Current state
      var epsOverT = eps / T;
      var totalAtoms = nFree + nDim * 2;
      var fracBound = totalAtoms > 0 ? (nDim * 2) / totalAtoms : 0;

      // Smooth the fraction for the current dot
      cpSmoothFrac = cpSmoothFrac * 0.93 + fracBound * 0.07;

      // Sample a measurement every 40 frames
      cpFrameCount++;
      if (cpFrameCount % 40 === 0) {
        cpMeasurements.push({ x: epsOverT, y: cpSmoothFrac });
        // Keep last 200 measurements
        if (cpMeasurements.length > 200) cpMeasurements.shift();
      }

      // Title
      ctxCP.fillStyle = COLORS.text; ctxCP.font = FONT;
      ctxCP.textAlign = 'center';
      ctxCP.fillText('Law of mass action', panCx, 20);

      // Plot area
      var pL = panL + 38, pR = panR - 12, pT = 34, pB = HCP - 50;
      var pW = pR - pL, pH = pB - pT;

      // Axes
      ctxCP.strokeStyle = COLORS.axis; ctxCP.lineWidth = 1;
      ctxCP.beginPath();
      ctxCP.moveTo(pL, pT); ctxCP.lineTo(pL, pB); ctxCP.lineTo(pR, pB);
      ctxCP.stroke();

      // Axis labels
      ctxCP.fillStyle = COLORS.text; ctxCP.font = FONT_SM;
      ctxCP.textAlign = 'center';
      ctxCP.fillText('\u03B5 / k\u0042T', panCx, HCP - 10);
      ctxCP.save();
      ctxCP.translate(panL + 6, pT + pH / 2);
      ctxCP.rotate(-Math.PI / 2);
      ctxCP.fillText('% bound', 0, 0);
      ctxCP.restore();

      // Tick marks on x-axis (0 to 10)
      var xMax = 10;
      ctxCP.fillStyle = COLORS.textDim; ctxCP.font = FONT_SM;
      ctxCP.textAlign = 'center';
      for (var tx = 0; tx <= xMax; tx += 2) {
        var xx = pL + (tx / xMax) * pW;
        ctxCP.beginPath(); ctxCP.moveTo(xx, pB); ctxCP.lineTo(xx, pB + 4); ctxCP.stroke();
        ctxCP.fillText(tx, xx, pB + 15);
      }

      // Tick marks on y-axis (0% to 100%)
      ctxCP.textAlign = 'right';
      for (var ty = 0; ty <= 100; ty += 25) {
        var yy = pB - (ty / 100) * pH;
        ctxCP.beginPath(); ctxCP.moveTo(pL - 3, yy); ctxCP.lineTo(pL, yy); ctxCP.stroke();
        ctxCP.fillText(ty, pL - 5, yy + 4);
      }

      // Helper to convert data to pixel coords
      function cpPlotX(v) { return pL + Math.min(v / xMax, 1) * pW; }
      function cpPlotY(v) { return pB - Math.min(Math.max(v, 0), 1) * pH; }

      // Draw past measurements as fading dots
      for (var i = 0; i < cpMeasurements.length; i++) {
        var m = cpMeasurements[i];
        var age = (cpMeasurements.length - i) / cpMeasurements.length;
        var alpha = 0.15 + 0.4 * (1 - age);
        ctxCP.fillStyle = 'rgba(255,167,38,' + alpha + ')';
        ctxCP.beginPath();
        ctxCP.arc(cpPlotX(m.x), cpPlotY(m.y), 2.5, 0, 2 * Math.PI);
        ctxCP.fill();
      }

      // Draw current state as a large bright dot
      var curX = cpPlotX(epsOverT), curY = cpPlotY(cpSmoothFrac);
      ctxCP.fillStyle = COLORS.green;
      ctxCP.beginPath(); ctxCP.arc(curX, curY, 5, 0, 2 * Math.PI); ctxCP.fill();
      ctxCP.strokeStyle = '#fff'; ctxCP.lineWidth = 1.5;
      ctxCP.beginPath(); ctxCP.arc(curX, curY, 5, 0, 2 * Math.PI); ctxCP.stroke();

      // Current readout
      ctxCP.fillStyle = COLORS.text; ctxCP.font = FONT_SM; ctxCP.textAlign = 'left';
      ctxCP.fillText('\u03B5/kT=' + epsOverT.toFixed(1) + '  ' + Math.round(cpSmoothFrac * 100) + '% bound', pL + 4, pT + 12);
    }

    cpTempSlider?.addEventListener('input', function() {
      if (cpTempVal) cpTempVal.textContent = parseFloat(cpTempSlider.value).toFixed(1);
    });
    cpEpsSlider?.addEventListener('input', function() {
      if (cpEpsVal) cpEpsVal.textContent = parseFloat(cpEpsSlider.value).toFixed(1);
    });
    cpSpdSlider?.addEventListener('input', function() {
      if (cpSpdVal) cpSpdVal.textContent = parseFloat(cpSpdSlider.value).toFixed(2);
    });
    document.getElementById('chempot-reset')?.addEventListener('click', function() {
      cpInit(); cpDraw();
    });
    // Clear measurement trail when sliders change so old data doesn't confuse
    // (new measurements will accumulate at the new parameter values)

    function cpAnimate() {
      cpStep(); cpDraw();
      activeAnimations['chempot'] = requestAnimationFrame(cpAnimate);
    }

    cpInit();
    cpAnimate();
  }

  // ----- System + Heat Reservoir (gas sim + energy distribution) -----
  const cRes = document.getElementById('vis-reservoir');
  if (cRes) {
    const {ctx: ctxHR, W: WHR, H: HHR} = setupCanvas(cRes);
    const hrResetBtn = document.getElementById('hres-reset');
    const resTempSlider = document.getElementById('res-temp');
    const resTempVal = document.getElementById('res-temp-val');

    // Layout: gas sim left, distribution plot right
    const simW = Math.floor(WHR * 0.50);
    const plotL = simW + 20, plotW = WHR - plotL - 15;
    const plotT = 40, plotH = HHR - 85;

    // Outer box (left side)
    const hrM = 12;
    const outerL = hrM, outerR = simW - hrM, outerT = hrM, outerB = HHR - hrM;
    // Inner box centered in left side
    const innerW = 90, innerH = 90;
    const innerL = (outerL + outerR - innerW) / 2;
    const innerR = innerL + innerW;
    const innerT = (outerT + outerB - innerH) / 2;
    const innerB = innerT + innerH;

    const PR = 2.5;
    const N_INNER = 8;
    const N_OUTER = 80; // lots of reservoir particles for fast thermalization
    let hrParticles = [];
    let wallDents = [];

    // Temperature units: slider T maps to RMS speed
    function tempToSpeed(T) { return 30 * Math.sqrt(T); }

    function initHR() {
      const T = parseFloat(resTempSlider?.value || 2.0);
      hrParticles = [];
      wallDents = [];
      const spd = tempToSpeed(T);
      for (let i = 0; i < N_INNER; i++) {
        const speed = spd * (0.3 + Math.random() * 1.4);
        const angle = Math.random() * 2 * Math.PI;
        hrParticles.push({
          x: innerL + PR + Math.random() * (innerW - 2 * PR),
          y: innerT + PR + Math.random() * (innerH - 2 * PR),
          vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
          inside: true
        });
      }
      for (let i = 0; i < N_OUTER; i++) {
        const speed = spd * (0.3 + Math.random() * 1.4);
        const angle = Math.random() * 2 * Math.PI;
        let x, y;
        do {
          x = outerL + PR + Math.random() * (outerR - outerL - 2 * PR);
          y = outerT + PR + Math.random() * (outerB - outerT - 2 * PR);
        } while (x > innerL - PR && x < innerR + PR && y > innerT - PR && y < innerB + PR);
        hrParticles.push({
          x, y, vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
          inside: false
        });
      }
    }

    // Rescale reservoir speeds when slider changes (system untouched)
    function rescaleReservoir(newT) {
      const target = tempToSpeed(newT);
      let sumV2 = 0, n = 0;
      for (const p of hrParticles) {
        if (!p.inside) { sumV2 += p.vx * p.vx + p.vy * p.vy; n++; }
      }
      const rms = Math.sqrt(sumV2 / n);
      if (rms < 1) return;
      const scale = target / rms;
      for (const p of hrParticles) {
        if (!p.inside) { p.vx *= scale; p.vy *= scale; }
      }
    }

    function addDent(x, y, side, strength, sign) {
      wallDents.push({x, y, side, amount: Math.min(strength * 0.12, 7) * (sign || 1), life: 1.0});
    }

    function getDentOffset(pos, side) {
      let offset = 0;
      for (const d of wallDents) {
        if (d.side !== side) continue;
        const dist = (side === 'left' || side === 'right') ? Math.abs(pos - d.y) : Math.abs(pos - d.x);
        const sigma = 12;
        if (dist < sigma * 3) offset += d.amount * d.life * Math.exp(-dist * dist / (2 * sigma * sigma));
      }
      return offset;
    }

    // On wall hit: swap the normal velocity component with the nearest particle on the other side
    // This is equivalent to an elastic collision through the wall
    function transferEnergy(hitter, wallX, wallY, hitNormal) {
      let best = null, bestDist = 40;
      for (const q of hrParticles) {
        if (q.inside === hitter.inside) continue;
        const d = Math.hypot(q.x - wallX, q.y - wallY);
        if (d < bestDist) { bestDist = d; best = q; }
      }
      if (best) {
        // Swap the normal velocity component — like an elastic 1D collision of equal masses
        if (hitNormal === 'vx') {
          const tmp = hitter.vx; hitter.vx = best.vx; best.vx = tmp;
        } else {
          const tmp = hitter.vy; hitter.vy = best.vy; best.vy = tmp;
        }
      }
    }

    function stepHR() {
      const dt = 0.016;
      for (const p of hrParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.inside) {
          if (p.x < innerL + PR) { p.x = innerL + PR; addDent(innerL, p.y, 'left', Math.abs(p.vx)); transferEnergy(p, innerL, p.y, 'vx'); if (p.vx < 0) p.vx = -p.vx; }
          if (p.x > innerR - PR) { p.x = innerR - PR; addDent(innerR, p.y, 'right', Math.abs(p.vx)); transferEnergy(p, innerR, p.y, 'vx'); if (p.vx > 0) p.vx = -p.vx; }
          if (p.y < innerT + PR) { p.y = innerT + PR; addDent(p.x, innerT, 'top', Math.abs(p.vy)); transferEnergy(p, p.x, innerT, 'vy'); if (p.vy < 0) p.vy = -p.vy; }
          if (p.y > innerB - PR) { p.y = innerB - PR; addDent(p.x, innerB, 'bottom', Math.abs(p.vy)); transferEnergy(p, p.x, innerB, 'vy'); if (p.vy > 0) p.vy = -p.vy; }
        } else {
          if (p.x < outerL + PR) { p.x = outerL + PR; p.vx = Math.abs(p.vx); }
          if (p.x > outerR - PR) { p.x = outerR - PR; p.vx = -Math.abs(p.vx); }
          if (p.y < outerT + PR) { p.y = outerT + PR; p.vy = Math.abs(p.vy); }
          if (p.y > outerB - PR) { p.y = outerB - PR; p.vy = -Math.abs(p.vy); }
          if (p.x > innerL - PR && p.x < innerR + PR && p.y > innerT - PR && p.y < innerB + PR) {
            const dL = p.x - (innerL - PR), dR = (innerR + PR) - p.x;
            const dT = p.y - (innerT - PR), dB = (innerB + PR) - p.y;
            const minD = Math.min(dL, dR, dT, dB);
            if (minD === dL) { p.x = innerL - PR; addDent(innerL, p.y, 'left', Math.abs(p.vx), -1); transferEnergy(p, innerL, p.y, 'vx'); if (p.vx > 0) p.vx = -p.vx; }
            else if (minD === dR) { p.x = innerR + PR; addDent(innerR, p.y, 'right', Math.abs(p.vx), -1); transferEnergy(p, innerR, p.y, 'vx'); if (p.vx < 0) p.vx = -p.vx; }
            else if (minD === dT) { p.y = innerT - PR; addDent(p.x, innerT, 'top', Math.abs(p.vy), -1); transferEnergy(p, p.x, innerT, 'vy'); if (p.vy > 0) p.vy = -p.vy; }
            else { p.y = innerB + PR; addDent(p.x, innerB, 'bottom', Math.abs(p.vy), -1); transferEnergy(p, p.x, innerB, 'vy'); if (p.vy < 0) p.vy = -p.vy; }
          }
        }
      }
      for (let i = wallDents.length - 1; i >= 0; i--) {
        wallDents[i].life -= 0.04;
        if (wallDents[i].life <= 0) wallDents.splice(i, 1);
      }
    }

    function drawHR() {
      clearCanvas(ctxHR, WHR, HHR);
      const T = parseFloat(resTempSlider?.value || 2.0);

      // === LEFT: Gas simulation ===
      ctxHR.save();
      ctxHR.beginPath(); ctxHR.rect(0, 0, simW, HHR); ctxHR.clip();

      ctxHR.strokeStyle = COLORS.axis; ctxHR.lineWidth = 2;
      ctxHR.strokeRect(outerL, outerT, outerR - outerL, outerB - outerT);

      // Inner box with dent deformations
      ctxHR.strokeStyle = COLORS.orange; ctxHR.lineWidth = 2.5;
      ctxHR.beginPath();
      const steps = 30;
      for (let i = 0; i <= steps; i++) { const x = innerL + (innerR - innerL) * i / steps; const y = innerT - getDentOffset(x, 'top'); if (i === 0) ctxHR.moveTo(x, y); else ctxHR.lineTo(x, y); }
      for (let i = 0; i <= steps; i++) { const y = innerT + (innerB - innerT) * i / steps; ctxHR.lineTo(innerR + getDentOffset(y, 'right'), y); }
      for (let i = steps; i >= 0; i--) { const x = innerL + (innerR - innerL) * i / steps; ctxHR.lineTo(x, innerB + getDentOffset(x, 'bottom')); }
      for (let i = steps; i >= 0; i--) { const y = innerT + (innerB - innerT) * i / steps; ctxHR.lineTo(innerL - getDentOffset(y, 'left'), y); }
      ctxHR.closePath(); ctxHR.stroke();

      for (const d of wallDents) {
        if (d.life > 0.5) {
          ctxHR.save(); ctxHR.globalAlpha = (d.life - 0.5) * 2 * 0.6;
          ctxHR.fillStyle = COLORS.yellow;
          ctxHR.beginPath(); ctxHR.arc(d.x, d.y, 5, 0, 2 * Math.PI); ctxHR.fill();
          ctxHR.restore();
        }
      }

      for (const p of hrParticles) {
        ctxHR.beginPath(); ctxHR.arc(p.x, p.y, PR, 0, 2 * Math.PI);
        ctxHR.fillStyle = p.inside ? COLORS.blue : COLORS.red; ctxHR.fill();
      }

      ctxHR.fillStyle = COLORS.text; ctxHR.font = FONT; ctxHR.textAlign = 'center';
      ctxHR.fillText('System', (innerL + innerR) / 2, innerT + 14);
      ctxHR.fillStyle = COLORS.textDim; ctxHR.font = FONT_SM;
      ctxHR.fillText('Reservoir (T = ' + T.toFixed(1) + ')', (outerL + outerR) / 2, outerB + 12);
      ctxHR.restore();

      // === RIGHT: Energy distribution ===
      // The total system energy E_sys = sum of KE of all inner particles.
      // For N particles in 2D, E_sys follows a chi-squared distribution with
      // k = 2*N_INNER degrees of freedom: P(E) ~ E^(k/2 - 1) * exp(-E / kT)

      // kT from slider temperature (so the curve responds instantly to slider)
      // tempToSpeed(T)^2 = 900*T is the mean v^2; KE = 0.5*v^2 so kT = 0.5*900*T = 450*T
      const kT = 0.5 * tempToSpeed(T) * tempToSpeed(T);

      // System energy
      let sysE = 0;
      for (const p of hrParticles) {
        if (p.inside) sysE += 0.5 * (p.vx * p.vx + p.vy * p.vy);
      }

      // Chi-squared distribution for total energy
      const k = 2 * N_INNER; // degrees of freedom (2D: 2 per particle)
      const peakE = Math.max((k / 2 - 1) * kT, kT); // mode of chi-sq
      const Emax = peakE + 5 * Math.sqrt(k / 2) * kT; // extends well past peak
      const meanTheory = (k / 2) * kT; // theoretical mean = N_INNER * kT

      // Axes
      drawAxes(ctxHR, plotL, plotT, plotW, plotH, {xLabel: 'E (system energy)', yLabel: 'P(E)', yLabelOffset: 20});

      // Title
      ctxHR.fillStyle = COLORS.text; ctxHR.font = FONT; ctxHR.textAlign = 'left';
      ctxHR.fillText('P(E) \u221d E\u207F\u207B\u00B9 e^{\u2212E/kT}', plotL + 5, plotT - 10);

      // Draw the theoretical distribution curve
      // P(E) ~ E^(k/2 - 1) * exp(-E / kT), normalized so peak = 0.9 * plotH
      const alpha = k / 2 - 1;
      const logPeakVal = alpha * Math.log(Math.max(peakE, 1e-10)) - peakE / kT;

      ctxHR.strokeStyle = COLORS.orange; ctxHR.lineWidth = 2;
      ctxHR.beginPath();
      let curveStarted = false;
      for (let i = 1; i <= 200; i++) {
        const E = (i / 200) * Emax;
        const logP = alpha * Math.log(E) - E / kT - logPeakVal;
        const P = Math.exp(logP);
        const px = plotL + (E / Emax) * plotW;
        const py = plotT + plotH * (1 - P * 0.85);
        if (py > plotT + plotH || py < plotT - 5) continue;
        if (!curveStarted) { ctxHR.moveTo(px, py); curveStarted = true; }
        else ctxHR.lineTo(px, py);
      }
      ctxHR.stroke();

      // Theoretical mean ⟨E⟩ = N*kT — dashed line
      const thMx = plotL + (meanTheory / Emax) * plotW;
      if (thMx >= plotL && thMx <= plotL + plotW) {
        ctxHR.strokeStyle = COLORS.textDim; ctxHR.lineWidth = 1;
        ctxHR.setLineDash([4, 4]);
        ctxHR.beginPath(); ctxHR.moveTo(thMx, plotT); ctxHR.lineTo(thMx, plotT + plotH); ctxHR.stroke();
        ctxHR.setLineDash([]);
        ctxHR.fillStyle = COLORS.textDim; ctxHR.font = FONT_SM; ctxHR.textAlign = 'center';
        ctxHR.fillText('\u27E8E\u27E9 = NkT', thMx, plotT - 3);
      }

      // Current system energy — green marker on the curve
      const ePx = plotL + (sysE / Emax) * plotW;
      if (ePx >= plotL && ePx <= plotL + plotW && sysE > 0) {
        // Height on the curve
        const logP = alpha * Math.log(sysE) - sysE / kT - logPeakVal;
        const P = Math.exp(logP);
        const ePy = plotT + plotH * (1 - P * 0.85);

        // Dot on curve
        ctxHR.fillStyle = COLORS.green;
        ctxHR.beginPath(); ctxHR.arc(ePx, Math.max(ePy, plotT), 6, 0, 2 * Math.PI); ctxHR.fill();
        ctxHR.strokeStyle = '#fff'; ctxHR.lineWidth = 1.5;
        ctxHR.beginPath(); ctxHR.arc(ePx, Math.max(ePy, plotT), 6, 0, 2 * Math.PI); ctxHR.stroke();

        // Dashed drop line to axis
        ctxHR.strokeStyle = COLORS.green; ctxHR.lineWidth = 1;
        ctxHR.setLineDash([3, 3]);
        ctxHR.beginPath(); ctxHR.moveTo(ePx, Math.max(ePy, plotT)); ctxHR.lineTo(ePx, plotT + plotH); ctxHR.stroke();
        ctxHR.setLineDash([]);

        // Label
        ctxHR.fillStyle = COLORS.green; ctxHR.font = FONT_SM; ctxHR.textAlign = 'center';
        ctxHR.fillText('E_sys', ePx, plotT + plotH + 15);
      }
    }

    function animateHR() {
      stepHR();
      drawHR();
      activeAnimations['reservoir'] = requestAnimationFrame(animateHR);
    }

    resTempSlider?.addEventListener('input', () => {
      const T = parseFloat(resTempSlider.value);
      if (resTempVal) resTempVal.textContent = T.toFixed(1);
      rescaleReservoir(T);
    });

    hrResetBtn?.addEventListener('click', () => { initHR(); });

    initHR();
    animateHR();
  }

  // ----- Volume Exchange (Gibbs Ensemble) -----
  const cVE = document.getElementById('vis-volume-exchange');
  if (cVE) {
    const {ctx: ctxVE, W: WVE, H: HVE} = setupCanvas(cVE);
    const vexTLeftSlider = document.getElementById('vex-tleft');
    const vexTRightSlider = document.getElementById('vex-tright');
    const vexResetBtn = document.getElementById('vex-reset');

    // Layout
    const veM = 12;
    const boxL = veM, boxR = WVE - veM, boxT = 30, boxB = HVE - 50;
    const boxW = boxR - boxL, boxH = boxB - boxT;
    const PR_VE = 5;
    const N_LEFT = 30, N_RIGHT = 30;
    const WALL_HALF = 3;
    const WALL_MASS = 1.5; // wall inertia relative to particles

    let wallX = (boxL + boxR) / 2; // moveable wall position
    let wallVx = 0; // wall velocity
    let veParticles = [];

    function veTempToSpeed(T) { return 30 * Math.sqrt(T); }

    function initVE() {
      const TL = parseFloat(vexTLeftSlider?.value || 2.0);
      const TR = parseFloat(vexTRightSlider?.value || 2.0);
      wallX = (boxL + boxR) / 2;
      wallVx = 0;
      veParticles = [];
      // Left side particles
      const spdL = veTempToSpeed(TL);
      for (let i = 0; i < N_LEFT; i++) {
        const speed = spdL * (0.3 + Math.random() * 1.4);
        const angle = Math.random() * 2 * Math.PI;
        veParticles.push({
          x: boxL + PR_VE + Math.random() * (wallX - WALL_HALF - boxL - 2 * PR_VE),
          y: boxT + PR_VE + Math.random() * (boxH - 2 * PR_VE),
          vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
          side: 'left'
        });
      }
      // Right side particles
      const spdR = veTempToSpeed(TR);
      for (let i = 0; i < N_RIGHT; i++) {
        const speed = spdR * (0.3 + Math.random() * 1.4);
        const angle = Math.random() * 2 * Math.PI;
        veParticles.push({
          x: wallX + WALL_HALF + PR_VE + Math.random() * (boxR - wallX - WALL_HALF - 2 * PR_VE),
          y: boxT + PR_VE + Math.random() * (boxH - 2 * PR_VE),
          vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
          side: 'right'
        });
      }
    }

    // When temperature slider changes, rescale speeds on that side
    function rescaleVeSide(side, newT) {
      const target = veTempToSpeed(newT);
      const parts = veParticles.filter(p => p.side === side);
      if (parts.length === 0) return;
      let sumV2 = 0;
      for (const p of parts) sumV2 += p.vx * p.vx + p.vy * p.vy;
      const rms = Math.sqrt(sumV2 / parts.length);
      if (rms < 1) {
        // If nearly stopped, give them fresh velocities
        for (const p of parts) {
          const speed = target * (0.3 + Math.random() * 1.4);
          const angle = Math.random() * 2 * Math.PI;
          p.vx = speed * Math.cos(angle);
          p.vy = speed * Math.sin(angle);
        }
        return;
      }
      const scale = target / rms;
      for (const p of parts) { p.vx *= scale; p.vy *= scale; }
    }

    function stepVE() {
      const SUBSTEPS = 4;
      const dt = 0.016 / SUBSTEPS;
      const minWall = boxL + 40;
      const maxWall = boxR - 40;

      for (let sub = 0; sub < SUBSTEPS; sub++) {
        // Move wall
        wallX += wallVx * dt;
        wallVx *= 0.9995;

        // Clamp wall
        if (wallX < minWall) { wallX = minWall; wallVx = Math.abs(wallVx) * 0.5; }
        if (wallX > maxWall) { wallX = maxWall; wallVx = -Math.abs(wallVx) * 0.5; }

        const wL = wallX - WALL_HALF - PR_VE;
        const wR = wallX + WALL_HALF + PR_VE;

        for (const p of veParticles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Top/bottom walls
          if (p.y < boxT + PR_VE) { p.y = boxT + PR_VE; p.vy = Math.abs(p.vy); }
          if (p.y > boxB - PR_VE) { p.y = boxB - PR_VE; p.vy = -Math.abs(p.vy); }

          if (p.side === 'left') {
            if (p.x < boxL + PR_VE) { p.x = boxL + PR_VE; p.vx = Math.abs(p.vx); }
            if (p.x > wL) {
              p.x = wL;
              const vRel = p.vx - wallVx;
              if (vRel > 0) {
                const imp = 2 * vRel / (1 + 1 / WALL_MASS);
                p.vx -= imp;
                wallVx += imp / WALL_MASS;
              } else {
                p.vx = wallVx - 1;
              }
            }
          } else {
            if (p.x > boxR - PR_VE) { p.x = boxR - PR_VE; p.vx = -Math.abs(p.vx); }
            if (p.x < wR) {
              p.x = wR;
              const vRel = p.vx - wallVx;
              if (vRel < 0) {
                const imp = 2 * vRel / (1 + 1 / WALL_MASS);
                p.vx -= imp;
                wallVx += imp / WALL_MASS;
              } else {
                p.vx = wallVx + 1;
              }
            }
          }
        }

        // Particle-particle collisions (elastic, equal mass)
        for (let i = 0; i < veParticles.length; i++) {
          for (let j = i + 1; j < veParticles.length; j++) {
            if (veParticles[i].side !== veParticles[j].side) continue;
            const a = veParticles[i], b = veParticles[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minD = PR_VE * 2;
            if (dist < minD && dist > 0) {
              const nx = dx / dist, ny = dy / dist;
              const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dvn > 0) {
                a.vx -= dvn * nx; a.vy -= dvn * ny;
                b.vx += dvn * nx; b.vy += dvn * ny;
              }
              const overlap = minD - dist;
              a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
              b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
            }
          }
        }
      } // end substeps

      // Thermostat: rescale each side's speeds toward slider temperature
      const TL = parseFloat(vexTLeftSlider?.value || 2.0);
      const TR = parseFloat(vexTRightSlider?.value || 2.0);
      const thermoRate = 0.08;
      for (const side of ['left', 'right']) {
        const targetSpd = veTempToSpeed(side === 'left' ? TL : TR);
        let sumV2 = 0, n = 0;
        for (const p of veParticles) {
          if (p.side === side) { sumV2 += p.vx * p.vx + p.vy * p.vy; n++; }
        }
        if (n === 0) continue;
        const rms = Math.sqrt(sumV2 / n);
        if (rms < 0.1) continue;
        const scale = 1 + thermoRate * (targetSpd / rms - 1);
        for (const p of veParticles) {
          if (p.side === side) { p.vx *= scale; p.vy *= scale; }
        }
      }
    }

    function drawVE() {
      clearCanvas(ctxVE, WVE, HVE);
      const TL = parseFloat(vexTLeftSlider?.value || 2.0);
      const TR = parseFloat(vexTRightSlider?.value || 2.0);

      // Left background
      ctxVE.fillStyle = 'rgba(79,195,247,0.08)';
      ctxVE.fillRect(boxL, boxT, wallX - boxL, boxH);
      // Right background
      ctxVE.fillStyle = 'rgba(102,187,106,0.08)';
      ctxVE.fillRect(wallX, boxT, boxR - wallX, boxH);

      // Outer box
      ctxVE.strokeStyle = COLORS.axis; ctxVE.lineWidth = 2;
      ctxVE.strokeRect(boxL, boxT, boxW, boxH);

      // Moveable wall
      ctxVE.fillStyle = COLORS.orange;
      ctxVE.fillRect(wallX - WALL_HALF, boxT, WALL_HALF * 2, boxH);
      // Wall arrows
      ctxVE.fillStyle = COLORS.orange; ctxVE.font = FONT_SM; ctxVE.textAlign = 'center';
      ctxVE.fillText('◀ ▶', wallX, boxT - 6);

      // Particles
      for (const p of veParticles) {
        ctxVE.beginPath(); ctxVE.arc(p.x, p.y, PR_VE, 0, 2 * Math.PI);
        ctxVE.fillStyle = p.side === 'left' ? COLORS.blue : COLORS.green;
        ctxVE.fill();
      }

      // Compute P = NkT/V for each side (V proportional to width)
      const widthL = wallX - boxL;
      const widthR = boxR - wallX;
      // Normalize V so that at equal split V = 0.5 each
      const VL = widthL / boxW;
      const VR = widthR / boxW;
      const PL = N_LEFT * TL / (VL + 0.001);
      const PR_val = N_RIGHT * TR / (VR + 0.001);

      // Info text below
      ctxVE.font = FONT; ctxVE.textAlign = 'center';
      const leftCx = boxL + widthL / 2;
      const rightCx = wallX + widthR / 2;

      // Left side
      ctxVE.fillStyle = COLORS.blue;
      ctxVE.fillText('P₁ = NT/V = ' + PL.toFixed(1), leftCx, boxB + 16);
      ctxVE.fillStyle = COLORS.textDim; ctxVE.font = FONT_SM;
      ctxVE.fillText('T₁=' + TL.toFixed(1) + '  V₁=' + (VL * 100).toFixed(0) + '%', leftCx, boxB + 32);

      // Right side
      ctxVE.fillStyle = COLORS.green; ctxVE.font = FONT;
      ctxVE.fillText('P₂ = NT/V = ' + PR_val.toFixed(1), rightCx, boxB + 16);
      ctxVE.fillStyle = COLORS.textDim; ctxVE.font = FONT_SM;
      ctxVE.fillText('T₂=' + TR.toFixed(1) + '  V₂=' + (VR * 100).toFixed(0) + '%', rightCx, boxB + 32);

      // Equilibrium indicator
      const pAvg = (PL + PR_val) / 2 + 0.01;
      const eq = Math.abs(PL - PR_val) / pAvg < 0.12;
      ctxVE.font = FONT_SM; ctxVE.textAlign = 'center';
      ctxVE.fillStyle = eq ? COLORS.green : COLORS.textDim;
      ctxVE.fillText(eq ? '✓ P₁ ≈ P₂' : 'P₁ ≠ P₂  …equilibrating', (boxL + boxR) / 2, boxT - 6);

      // Update slider readouts
      document.getElementById('vex-tleft-val')?.replaceChildren(document.createTextNode(TL.toFixed(1)));
      document.getElementById('vex-tright-val')?.replaceChildren(document.createTextNode(TR.toFixed(1)));
    }

    function animateVE() {
      stepVE();
      drawVE();
      activeAnimations['volume-exchange'] = requestAnimationFrame(animateVE);
    }

    vexTLeftSlider?.addEventListener('input', () => {
      rescaleVeSide('left', parseFloat(vexTLeftSlider.value));
    });
    vexTRightSlider?.addEventListener('input', () => {
      rescaleVeSide('right', parseFloat(vexTRightSlider.value));
    });
    vexResetBtn?.addEventListener('click', () => { initVE(); });

    initVE();
    animateVE();
  }

  // ----- Chemical Potential Equilibration -----
  const cCEQ = document.getElementById('vis-chem-equil');
  if (cCEQ) {
    const {ctx: ctxCEQ, W: WCEQ, H: HCEQ} = setupCanvas(cCEQ);
    const ceqNLeftSlider = document.getElementById('ceq-nleft');
    const ceqNRightSlider = document.getElementById('ceq-nright');
    const ceqReleaseBtn = document.getElementById('ceq-release');
    const ceqResetBtn = document.getElementById('ceq-reset');

    const PR_CEQ = 4; // particle radius
    const T_CEQ = 1.0;
    const SPEED_CEQ = 80 * Math.sqrt(T_CEQ);

    // Geometry: two bulbs + connecting tube
    // Bulbs are rounded rectangles; tube is a narrow horizontal channel
    const bulbW = 190, bulbH = 200;
    const bulbY = 40;
    const bulbLX = 20;  // left bulb left edge
    const bulbRX = WCEQ - 20 - bulbW; // right bulb left edge
    const bulbR = 16; // corner radius for rounded rect

    const tubeH = 52; // tube height
    const tubeY = bulbY + (bulbH - tubeH) / 2; // vertically centered
    const tubeL = bulbLX + bulbW; // tube left edge
    const tubeR = bulbRX; // tube right edge
    const tubeMid = (tubeL + tubeR) / 2;

    // Volume of each bulb (in px^2, used for density calc)
    const V_BULB = bulbW * bulbH;

    let ceqParticles = [];
    let ceqSealed = true;
    let ceqSealing = false;   // true while sweep animation is in progress
    let sealProgress = 1.0;   // 0 = open (barriers at tubeMid), 1 = fully sealed (barriers at tube ends)

    function ceqCreateParticles(n, region) {
      const parts = [];
      for (let i = 0; i < n; i++) {
        const speed = SPEED_CEQ * (0.3 + Math.random() * 1.4);
        const angle = Math.random() * 2 * Math.PI;
        let x, y;
        if (region === 'left') {
          x = bulbLX + PR_CEQ + Math.random() * (bulbW - 2 * PR_CEQ);
          y = bulbY + PR_CEQ + Math.random() * (bulbH - 2 * PR_CEQ);
        } else {
          x = bulbRX + PR_CEQ + Math.random() * (bulbW - 2 * PR_CEQ);
          y = bulbY + PR_CEQ + Math.random() * (bulbH - 2 * PR_CEQ);
        }
        parts.push({
          x, y,
          vx: speed * Math.cos(angle),
          vy: speed * Math.sin(angle)
        });
      }
      return parts;
    }

    function ceqInit() {
      ceqSealed = true;
      ceqSealing = false;
      sealProgress = 1.0;
      const nL = parseInt(ceqNLeftSlider?.value || 40);
      const nR = parseInt(ceqNRightSlider?.value || 10);
      ceqParticles = [
        ...ceqCreateParticles(nL, 'left'),
        ...ceqCreateParticles(nR, 'right')
      ];
      ceqReleaseBtn.disabled = false;
      ceqReleaseBtn.textContent = 'Release';
      ceqNLeftSlider.disabled = false;
      ceqNRightSlider.disabled = false;
    }

    function ceqIsInLeftBulb(x, y) {
      return x >= bulbLX && x <= bulbLX + bulbW && y >= bulbY && y <= bulbY + bulbH;
    }
    function ceqIsInRightBulb(x, y) {
      return x >= bulbRX && x <= bulbRX + bulbW && y >= bulbY && y <= bulbY + bulbH;
    }
    function ceqIsInTube(x, y) {
      return x >= tubeL && x <= tubeR && y >= tubeY && y <= tubeY + tubeH;
    }

    function ceqSide(p) {
      // Which side of the midpoint is the particle on?
      return p.x < tubeMid ? 'left' : 'right';
    }

    function ceqCountSides() {
      let nL = 0, nR = 0;
      for (const p of ceqParticles) {
        if (ceqSide(p) === 'left') nL++; else nR++;
      }
      return {nL, nR};
    }

    function ceqStep() {
      const SUBSTEPS = 8;
      const dt = 0.016 / SUBSTEPS;

      for (let sub = 0; sub < SUBSTEPS; sub++) {
        for (const p of ceqParticles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          const side = ceqSide(p);
          const inLeftBulb = ceqIsInLeftBulb(p.x, p.y);
          const inRightBulb = ceqIsInRightBulb(p.x, p.y);
          const inTube = ceqIsInTube(p.x, p.y);

          if (!ceqSealed) {
            // Open: particles can be in bulbs or tube
            // The valid region is the union of left bulb, right bulb, and tube
            // We need to constrain particles to stay in this combined region

            // Check if particle is outside all valid regions
            if (!inLeftBulb && !inRightBulb && !inTube) {
              // Push particle back into the nearest valid region
              // Determine where it was likely trying to go

              // Left bulb boundaries
              if (p.x < tubeL && side === 'left') {
                // In left bulb zone
                if (p.x < bulbLX + PR_CEQ) { p.x = bulbLX + PR_CEQ; p.vx = Math.abs(p.vx); }
                if (p.x > bulbLX + bulbW - PR_CEQ) { p.x = bulbLX + bulbW - PR_CEQ; p.vx = -Math.abs(p.vx); }
                if (p.y < bulbY + PR_CEQ) { p.y = bulbY + PR_CEQ; p.vy = Math.abs(p.vy); }
                if (p.y > bulbY + bulbH - PR_CEQ) { p.y = bulbY + bulbH - PR_CEQ; p.vy = -Math.abs(p.vy); }
              } else if (p.x > tubeR && side === 'right') {
                // In right bulb zone
                if (p.x < bulbRX + PR_CEQ) { p.x = bulbRX + PR_CEQ; p.vx = Math.abs(p.vx); }
                if (p.x > bulbRX + bulbW - PR_CEQ) { p.x = bulbRX + bulbW - PR_CEQ; p.vx = -Math.abs(p.vx); }
                if (p.y < bulbY + PR_CEQ) { p.y = bulbY + PR_CEQ; p.vy = Math.abs(p.vy); }
                if (p.y > bulbY + bulbH - PR_CEQ) { p.y = bulbY + bulbH - PR_CEQ; p.vy = -Math.abs(p.vy); }
              } else {
                // In the tube X-range but outside tube Y-range
                // Bounce off tube walls (top/bottom)
                if (p.y < tubeY + PR_CEQ) { p.y = tubeY + PR_CEQ; p.vy = Math.abs(p.vy); }
                if (p.y > tubeY + tubeH - PR_CEQ) { p.y = tubeY + tubeH - PR_CEQ; p.vy = -Math.abs(p.vy); }
                // Also clamp x to tube
                if (p.x < tubeL + PR_CEQ) { p.x = tubeL + PR_CEQ; p.vx = Math.abs(p.vx); }
                if (p.x > tubeR - PR_CEQ) { p.x = tubeR - PR_CEQ; p.vx = -Math.abs(p.vx); }
              }
            } else {
              // Inside valid region, but enforce outer walls
              // Left bulb outer walls
              if (inLeftBulb) {
                if (p.x < bulbLX + PR_CEQ) { p.x = bulbLX + PR_CEQ; p.vx = Math.abs(p.vx); }
                if (p.y < bulbY + PR_CEQ) { p.y = bulbY + PR_CEQ; p.vy = Math.abs(p.vy); }
                if (p.y > bulbY + bulbH - PR_CEQ) { p.y = bulbY + bulbH - PR_CEQ; p.vy = -Math.abs(p.vy); }
                // Right edge of left bulb: only bounce if not entering tube
                if (p.x > bulbLX + bulbW - PR_CEQ && !(p.y >= tubeY && p.y <= tubeY + tubeH)) {
                  p.x = bulbLX + bulbW - PR_CEQ; p.vx = -Math.abs(p.vx);
                }
              }
              // Right bulb outer walls
              if (inRightBulb) {
                if (p.x > bulbRX + bulbW - PR_CEQ) { p.x = bulbRX + bulbW - PR_CEQ; p.vx = -Math.abs(p.vx); }
                if (p.y < bulbY + PR_CEQ) { p.y = bulbY + PR_CEQ; p.vy = Math.abs(p.vy); }
                if (p.y > bulbY + bulbH - PR_CEQ) { p.y = bulbY + bulbH - PR_CEQ; p.vy = -Math.abs(p.vy); }
                // Left edge of right bulb: only bounce if not entering tube
                if (p.x < bulbRX + PR_CEQ && !(p.y >= tubeY && p.y <= tubeY + tubeH)) {
                  p.x = bulbRX + PR_CEQ; p.vx = Math.abs(p.vx);
                }
              }
              // Tube walls
              if (inTube) {
                if (p.y < tubeY + PR_CEQ) { p.y = tubeY + PR_CEQ; p.vy = Math.abs(p.vy); }
                if (p.y > tubeY + tubeH - PR_CEQ) { p.y = tubeY + tubeH - PR_CEQ; p.vy = -Math.abs(p.vy); }
              }
            }
          } else {
            // Sealed: particles stay in their own bulb
            if (side === 'left') {
              if (p.x < bulbLX + PR_CEQ) { p.x = bulbLX + PR_CEQ; p.vx = Math.abs(p.vx); }
              if (p.x > bulbLX + bulbW - PR_CEQ) { p.x = bulbLX + bulbW - PR_CEQ; p.vx = -Math.abs(p.vx); }
              if (p.y < bulbY + PR_CEQ) { p.y = bulbY + PR_CEQ; p.vy = Math.abs(p.vy); }
              if (p.y > bulbY + bulbH - PR_CEQ) { p.y = bulbY + bulbH - PR_CEQ; p.vy = -Math.abs(p.vy); }
            } else {
              if (p.x < bulbRX + PR_CEQ) { p.x = bulbRX + PR_CEQ; p.vx = Math.abs(p.vx); }
              if (p.x > bulbRX + bulbW - PR_CEQ) { p.x = bulbRX + bulbW - PR_CEQ; p.vx = -Math.abs(p.vx); }
              if (p.y < bulbY + PR_CEQ) { p.y = bulbY + PR_CEQ; p.vy = Math.abs(p.vy); }
              if (p.y > bulbY + bulbH - PR_CEQ) { p.y = bulbY + bulbH - PR_CEQ; p.vy = -Math.abs(p.vy); }
            }
          }
        }

        // Particle-particle collisions
        for (let i = 0; i < ceqParticles.length; i++) {
          for (let j = i + 1; j < ceqParticles.length; j++) {
            const a = ceqParticles[i], b = ceqParticles[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minD = PR_CEQ * 2;
            if (dist < minD && dist > 0) {
              const nx = dx / dist, ny = dy / dist;
              const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dvn > 0) {
                a.vx -= dvn * nx; a.vy -= dvn * ny;
                b.vx += dvn * nx; b.vy += dvn * ny;
              }
              const overlap = minD - dist;
              a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
              b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
            }
          }
        }
      } // end substeps

      // Animate sealing sweep: two barriers move from tubeMid outward
      if (ceqSealing) {
        sealProgress = Math.min(1, sealProgress + 0.02);
        const halfTube = (tubeR - tubeL) / 2;
        // Left barrier moves from tubeMid toward tubeL
        const barrierL = tubeMid - sealProgress * halfTube;
        // Right barrier moves from tubeMid toward tubeR
        const barrierR = tubeMid + sealProgress * halfTube;
        // Push particles ahead of barriers
        for (const p of ceqParticles) {
          if (p.y >= tubeY && p.y <= tubeY + tubeH) {
            // Particle in tube y-range, check against barriers
            if (p.x > barrierL - PR_CEQ && p.x < tubeMid) {
              p.x = barrierL - PR_CEQ - 1;
              p.vx = -Math.abs(p.vx);
            }
            if (p.x < barrierR + PR_CEQ && p.x > tubeMid) {
              p.x = barrierR + PR_CEQ + 1;
              p.vx = Math.abs(p.vx);
            }
          }
        }
        if (sealProgress >= 1) {
          ceqSealing = false;
          ceqSealed = true;
          ceqReleaseBtn.disabled = false;
          ceqReleaseBtn.textContent = 'Release';
        }
      }
    }

    function ceqDrawRoundedRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function ceqDraw() {
      clearCanvas(ctxCEQ, WCEQ, HCEQ);

      // Draw bulb backgrounds
      ctxCEQ.fillStyle = 'rgba(79,195,247,0.07)';
      ceqDrawRoundedRect(ctxCEQ, bulbLX, bulbY, bulbW, bulbH, bulbR);
      ctxCEQ.fill();

      ctxCEQ.fillStyle = 'rgba(102,187,106,0.07)';
      ceqDrawRoundedRect(ctxCEQ, bulbRX, bulbY, bulbW, bulbH, bulbR);
      ctxCEQ.fill();

      // Draw tube background
      ctxCEQ.fillStyle = 'rgba(255,255,255,0.03)';
      ctxCEQ.fillRect(tubeL, tubeY, tubeR - tubeL, tubeH);

      // Draw bulb outlines with gaps where tube connects
      ctxCEQ.strokeStyle = COLORS.axis; ctxCEQ.lineWidth = 2;
      // Left bulb: gap on right side where tube connects
      ctxCEQ.beginPath();
      ctxCEQ.moveTo(bulbLX + bulbW, tubeY);
      ctxCEQ.lineTo(bulbLX + bulbW, bulbY + bulbR);
      ctxCEQ.quadraticCurveTo(bulbLX + bulbW, bulbY, bulbLX + bulbW - bulbR, bulbY);
      ctxCEQ.lineTo(bulbLX + bulbR, bulbY);
      ctxCEQ.quadraticCurveTo(bulbLX, bulbY, bulbLX, bulbY + bulbR);
      ctxCEQ.lineTo(bulbLX, bulbY + bulbH - bulbR);
      ctxCEQ.quadraticCurveTo(bulbLX, bulbY + bulbH, bulbLX + bulbR, bulbY + bulbH);
      ctxCEQ.lineTo(bulbLX + bulbW - bulbR, bulbY + bulbH);
      ctxCEQ.quadraticCurveTo(bulbLX + bulbW, bulbY + bulbH, bulbLX + bulbW, bulbY + bulbH - bulbR);
      ctxCEQ.lineTo(bulbLX + bulbW, tubeY + tubeH);
      ctxCEQ.stroke();
      // Right bulb: gap on left side where tube connects
      ctxCEQ.beginPath();
      ctxCEQ.moveTo(bulbRX, tubeY + tubeH);
      ctxCEQ.lineTo(bulbRX, bulbY + bulbH - bulbR);
      ctxCEQ.quadraticCurveTo(bulbRX, bulbY + bulbH, bulbRX + bulbR, bulbY + bulbH);
      ctxCEQ.lineTo(bulbRX + bulbW - bulbR, bulbY + bulbH);
      ctxCEQ.quadraticCurveTo(bulbRX + bulbW, bulbY + bulbH, bulbRX + bulbW, bulbY + bulbH - bulbR);
      ctxCEQ.lineTo(bulbRX + bulbW, bulbY + bulbR);
      ctxCEQ.quadraticCurveTo(bulbRX + bulbW, bulbY, bulbRX + bulbW - bulbR, bulbY);
      ctxCEQ.lineTo(bulbRX + bulbR, bulbY);
      ctxCEQ.quadraticCurveTo(bulbRX, bulbY, bulbRX, bulbY + bulbR);
      ctxCEQ.lineTo(bulbRX, tubeY);
      ctxCEQ.stroke();

      // Draw tube walls (top and bottom lines)
      ctxCEQ.strokeStyle = COLORS.axis; ctxCEQ.lineWidth = 2;
      ctxCEQ.beginPath();
      ctxCEQ.moveTo(tubeL, tubeY); ctxCEQ.lineTo(tubeR, tubeY);
      ctxCEQ.stroke();
      ctxCEQ.beginPath();
      ctxCEQ.moveTo(tubeL, tubeY + tubeH); ctxCEQ.lineTo(tubeR, tubeY + tubeH);
      ctxCEQ.stroke();

      // Draw seal barriers
      if (ceqSealed || ceqSealing) {
        const halfTube = (tubeR - tubeL) / 2;
        const sp = ceqSealing ? sealProgress : 1;
        const barrierLX = tubeMid - sp * halfTube;
        const barrierRX = tubeMid + sp * halfTube;
        ctxCEQ.fillStyle = COLORS.orange;
        // Left barrier
        ctxCEQ.fillRect(barrierLX - 3, tubeY - 2, 6, tubeH + 4);
        // Right barrier
        ctxCEQ.fillRect(barrierRX - 3, tubeY - 2, 6, tubeH + 4);
        // Hatch marks
        ctxCEQ.strokeStyle = COLORS.bg; ctxCEQ.lineWidth = 1;
        for (let yy = tubeY + 4; yy < tubeY + tubeH; yy += 6) {
          ctxCEQ.beginPath();
          ctxCEQ.moveTo(barrierLX - 2, yy); ctxCEQ.lineTo(barrierLX + 2, yy + 3);
          ctxCEQ.stroke();
          ctxCEQ.beginPath();
          ctxCEQ.moveTo(barrierRX - 2, yy); ctxCEQ.lineTo(barrierRX + 2, yy + 3);
          ctxCEQ.stroke();
        }
        // Fill the region between barriers (sealed area) if sealing
        if (ceqSealing && sp < 1) {
          ctxCEQ.fillStyle = 'rgba(255,167,38,0.12)';
          ctxCEQ.fillRect(barrierLX + 3, tubeY, barrierRX - barrierLX - 6, tubeH);
        }
      }

      // Draw particles
      for (const p of ceqParticles) {
        const s = ceqSide(p);
        ctxCEQ.beginPath();
        ctxCEQ.arc(p.x, p.y, PR_CEQ, 0, 2 * Math.PI);
        ctxCEQ.fillStyle = s === 'left' ? COLORS.blue : COLORS.green;
        ctxCEQ.fill();
      }

      // Compute and display chemical potentials
      const {nL, nR} = ceqCountSides();
      const densL = nL / V_BULB;
      const densR = nR / V_BULB;
      // mu/kT = ln(n) with a constant offset to make values nicer
      // We use mu/kT = ln(N/V_BULB) + const. Set const so typical values are around -2 to 0
      // ln(N / V_BULB) for N=25, V=190*200=38000 => ln(25/38000) = ln(0.000658) = -7.33
      // Add offset of +5 so we get values around -2.3 to -1.3
      const MU_OFFSET = 5.0;
      const muL = nL > 0 ? Math.log(nL / V_BULB) + MU_OFFSET : -99;
      const muR = nR > 0 ? Math.log(nR / V_BULB) + MU_OFFSET : -99;

      // Info text below bulbs
      const leftCx = bulbLX + bulbW / 2;
      const rightCx = bulbRX + bulbW / 2;
      const infoY1 = bulbY + bulbH + 18;
      const infoY2 = bulbY + bulbH + 34;

      ctxCEQ.font = FONT; ctxCEQ.textAlign = 'center';
      ctxCEQ.fillStyle = COLORS.blue;
      ctxCEQ.fillText('N₁ = ' + nL, leftCx, infoY1);
      ctxCEQ.fillStyle = COLORS.blue; ctxCEQ.font = FONT_SM;
      ctxCEQ.fillText('μ₁/kT = ' + muL.toFixed(2), leftCx, infoY2);

      ctxCEQ.font = FONT; ctxCEQ.textAlign = 'center';
      ctxCEQ.fillStyle = COLORS.green;
      ctxCEQ.fillText('N₂ = ' + nR, rightCx, infoY1);
      ctxCEQ.fillStyle = COLORS.green; ctxCEQ.font = FONT_SM;
      ctxCEQ.fillText('μ₂/kT = ' + muR.toFixed(2), rightCx, infoY2);

      // Equilibrium indicator (centered, top of canvas)
      const isEq = !ceqSealed && nL > 0 && nR > 0 && Math.abs(muL - muR) < 0.15;
      ctxCEQ.font = FONT_SM; ctxCEQ.textAlign = 'center';
      if (ceqSealing) {
        ctxCEQ.fillStyle = COLORS.orange;
        ctxCEQ.fillText('Sealing…', WCEQ / 2, bulbY - 10);
      } else if (ceqSealed) {
        ctxCEQ.fillStyle = COLORS.textDim;
        ctxCEQ.fillText('Sealed — press Release to open tube', WCEQ / 2, bulbY - 10);
      } else {
        ctxCEQ.fillStyle = isEq ? COLORS.green : COLORS.textDim;
        ctxCEQ.fillText(isEq ? '✓ μ₁ ≈ μ₂  (equilibrium)' : 'μ₁ ≠ μ₂  …equilibrating', WCEQ / 2, bulbY - 10);
      }

      // Update slider readouts
      document.getElementById('ceq-nleft-val')?.replaceChildren(document.createTextNode(ceqNLeftSlider?.value || '40'));
      document.getElementById('ceq-nright-val')?.replaceChildren(document.createTextNode(ceqNRightSlider?.value || '10'));
    }

    function ceqAnimate() {
      ceqStep();
      ceqDraw();
      activeAnimations['chem-equil'] = requestAnimationFrame(ceqAnimate);
    }

    ceqNLeftSlider?.addEventListener('input', () => {
      if (!ceqSealed) return;
      const nL = parseInt(ceqNLeftSlider.value);
      // Rebuild only left-side particles, keep right
      const rightParticles = ceqParticles.filter(p => ceqSide(p) === 'right');
      ceqParticles = [...ceqCreateParticles(nL, 'left'), ...rightParticles];
    });
    ceqNRightSlider?.addEventListener('input', () => {
      if (!ceqSealed) return;
      const nR = parseInt(ceqNRightSlider.value);
      const leftParticles = ceqParticles.filter(p => ceqSide(p) === 'left');
      ceqParticles = [...leftParticles, ...ceqCreateParticles(nR, 'right')];
    });
    ceqReleaseBtn?.addEventListener('click', () => {
      if (ceqSealing) return; // ignore clicks during sweep
      if (!ceqSealed) {
        // Start sealing sweep animation
        ceqSealing = true;
        sealProgress = 0;
        ceqReleaseBtn.disabled = true;
      } else {
        // Open instantly
        ceqSealed = false;
        sealProgress = 0;
        ceqReleaseBtn.textContent = 'Seal';
      }
    });
    ceqResetBtn?.addEventListener('click', () => { ceqInit(); });

    ceqInit();
    ceqAnimate();
  }
}


// =============================================================================
// CH8: Free Energy
// =============================================================================
function initCh8Vis() {
  const c = document.getElementById('vis-freeenergy');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const tempSlider = document.getElementById('fe-temp');

  // Model: order-disorder transition with order parameter x ∈ [0,1].
  // x = 0: fully ordered (low energy, low entropy)
  // x = 1: fully disordered (high energy, high entropy)
  // E(x) = ε·x  (energy cost of breaking bonds)
  // S(x) = S0·[-x ln(x) - (1-x) ln(1-x)]  (mixing entropy)
  // F(x) = E(x) - T·S(x)
  const eps = 4;
  const S0 = 2;

  function entropy(x) {
    if (x <= 0.001 || x >= 0.999) return 0;
    return S0 * (-x * Math.log(x) - (1 - x) * Math.log(1 - x));
  }

  function draw() {
    const T = parseFloat(tempSlider?.value || 1);
    clearCanvas(ctx, W, H);

    const ox = 70, oy = 40, pw = W - ox - 30, ph = H - 90;

    // Compute curves
    const N = 200;
    const pts = [];
    let minF = Infinity, maxF = -Infinity;
    let allMin = Infinity, allMax = -Infinity;
    let minFi = 0;
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      const E = eps * x;
      const S = entropy(x);
      const nTS = -T * S;
      const F = E + nTS;
      pts.push({ x, E, nTS, F });
      if (F < minF) { minF = F; minFi = i; }
      if (F > maxF) maxF = F;
      allMin = Math.min(allMin, F, E, nTS);
      allMax = Math.max(allMax, F, E, nTS);
    }

    const yPad = (allMax - allMin) * 0.12;
    const yMin = allMin - yPad;
    const yMax = allMax + yPad;

    function toScreen(x, y) {
      return [ox + x * pw, oy + ph * (1 - (y - yMin) / (yMax - yMin))];
    }

    // Axes
    drawAxes(ctx, ox, oy, pw, ph, { xLabel: '', yLabel: '' });
    ctx.fillStyle = COLORS.textDim; ctx.font = FONT_SM; ctx.textAlign = 'center';
    ctx.fillText('Ordered', ox + 2, oy + ph + 28);
    ctx.fillText('Disordered', ox + pw - 2, oy + ph + 28);

    // Zero line
    if (yMin < 0 && yMax > 0) {
      const [, zy] = toScreen(0, 0);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(ox, zy); ctx.lineTo(ox + pw, zy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.textDim; ctx.font = FONT_SM; ctx.textAlign = 'right';
      ctx.fillText('0', ox - 6, zy + 4);
    }

    // E(x) curve (red)
    ctx.strokeStyle = COLORS.red; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const [sx, sy] = toScreen(pts[i].x, pts[i].E);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // -TS(x) curve (green)
    ctx.strokeStyle = COLORS.green; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const [sx, sy] = toScreen(pts[i].x, pts[i].nTS);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // F(x) curve (blue, thick)
    ctx.strokeStyle = COLORS.blue; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const [sx, sy] = toScreen(pts[i].x, pts[i].F);
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Minimum marker
    const minPt = pts[minFi];
    const [mx, my] = toScreen(minPt.x, minPt.F);
    ctx.fillStyle = COLORS.blue;
    ctx.beginPath(); ctx.arc(mx, my, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx, my, 3, 0, 2 * Math.PI); ctx.fill();

    // Equilibrium label
    ctx.fillStyle = COLORS.text; ctx.font = FONT_SM; ctx.textAlign = 'left';
    const lbl = mx > ox + pw - 80 ? mx - 80 : mx + 10;
    ctx.fillText('Equilibrium', lbl, my < oy + ph / 2 ? my + 16 : my - 8);

    // Legend
    const lx = ox + 8, ly = oy + 6;
    ctx.font = FONT_SM; ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(lx, ly, 14, 3); ctx.fillText('E  (energy cost)', lx + 20, ly + 5);
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(lx, ly + 18, 14, 3); ctx.fillText('−TS  (entropy benefit)', lx + 20, ly + 23);
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(lx, ly + 36, 14, 4); ctx.fillText('F = E − TS  (free energy)', lx + 20, ly + 41);

    // Temperature
    ctx.fillStyle = COLORS.text; ctx.font = FONT; ctx.textAlign = 'right';
    ctx.fillText('T = ' + T.toFixed(1), ox + pw - 5, oy + 16);

    document.getElementById('fe-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(1)));
  }

  tempSlider?.addEventListener('input', draw);
  draw();

  // ----- Spring-Piston Equilibrium -----
  const cSP8 = document.getElementById('vis-spring-piston');
  if (cSP8) {
    const {ctx: ctxSP8, W: WSP8, H: HSP8} = setupCanvas(cSP8);
    const kSlider = document.getElementById('sp-k');
    const tSlider = document.getElementById('sp-temp');

    // Gas particles
    const SP_N = 25;
    const SP_R = 3;
    const cyl_x = 40, cyl_y = 50, cyl_w = 180, cyl_h = HSP8 - 90;
    let spParticles = [];
    let spPistonY = cyl_y + cyl_h * 0.5;
    let spPistonVy = 0;

    // Physics calibration:
    // Speed = 40*sqrt(T) * uniform(0.3,1.7) → <vy²> ≈ 930*T
    // Spring pushes piston down: F = kSpring * gasH
    // Gas pushes piston up:      F = N * <vy²> / gasH
    // Equilibrium: gasH_eq = sqrt(N * <vy²> / kSpring) = sqrt(N*930*T / (SPRING_SCALE*k))
    // Plot mapping: x = gasH / GH_SCALE, where GH_SCALE = sqrt(N*930/SPRING_SCALE)
    //   so at equilibrium x = sqrt(T/k) = x*  ✓
    const SPRING_SCALE = 2.3;
    const GH_SCALE = Math.sqrt(SP_N * 930 / SPRING_SCALE); // ≈ 100.5

    function spTempToSpeed(T) { return 40 * Math.sqrt(T); }

    function initSPParticles() {
      const T = parseFloat(tSlider?.value || 2);
      const k = parseFloat(kSlider?.value || 2);
      const gasBot = cyl_y + cyl_h;
      const pistonThick = 6;
      // Start piston near expected equilibrium
      const gasH_eq = GH_SCALE * Math.sqrt(T / k);
      spPistonY = Math.max(cyl_y + 15, Math.min(gasBot - 25, gasBot - pistonThick - gasH_eq));
      spPistonVy = 0;
      spParticles = [];
      const spd = spTempToSpeed(T);
      const gasTop = spPistonY + pistonThick;
      for (let i = 0; i < SP_N; i++) {
        const speed = spd * (0.3 + Math.random() * 1.4);
        const angle = Math.random() * 2 * Math.PI;
        spParticles.push({
          x: cyl_x + SP_R + Math.random() * (cyl_w - 2 * SP_R),
          y: gasTop + SP_R + Math.random() * Math.max(10, gasBot - gasTop - 2 * SP_R),
          vx: speed * Math.cos(angle),
          vy: speed * Math.sin(angle)
        });
      }
    }

    function rescaleSPSpeeds() {
      const T = parseFloat(tSlider?.value || 2);
      const target = spTempToSpeed(T);
      if (spParticles.length === 0) return;
      let sumV2 = 0;
      for (const p of spParticles) sumV2 += p.vx * p.vx + p.vy * p.vy;
      const rms = Math.sqrt(sumV2 / spParticles.length);
      if (rms < 1) {
        for (const p of spParticles) {
          const speed = target * (0.3 + Math.random() * 1.4);
          const angle = Math.random() * 2 * Math.PI;
          p.vx = speed * Math.cos(angle);
          p.vy = speed * Math.sin(angle);
        }
        return;
      }
      const scale = target / rms;
      for (const p of spParticles) { p.vx *= scale; p.vy *= scale; }
    }

    function stepSP() {
      const k = parseFloat(kSlider?.value || 2);
      const T = parseFloat(tSlider?.value || 2);
      const SUBSTEPS = 4;
      const dt = 0.016 / SUBSTEPS;
      const PISTON_MASS = 15;
      const kSpring = k * SPRING_SCALE;
      const pistonThick = 6;
      const gasBot = cyl_y + cyl_h;

      for (let sub = 0; sub < SUBSTEPS; sub++) {
        const gasH = Math.max(gasBot - spPistonY - pistonThick, 1);

        // Spring pushes piston DOWN (+y) proportional to gas height
        // Gas particles push piston UP (-y) through collisions below
        spPistonVy += kSpring * gasH / PISTON_MASS * dt;
        spPistonVy *= 0.9995; // tiny numerical damping
        spPistonY += spPistonVy * dt;

        // Clamp piston
        if (spPistonY < cyl_y + 15) { spPistonY = cyl_y + 15; spPistonVy = Math.abs(spPistonVy) * 0.5; }
        if (spPistonY > gasBot - 20) { spPistonY = gasBot - 20; spPistonVy = -Math.abs(spPistonVy) * 0.5; }

        const pistonBot = spPistonY + pistonThick;

        for (const p of spParticles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          // Left/right walls
          if (p.x < cyl_x + SP_R) { p.x = cyl_x + SP_R; p.vx = Math.abs(p.vx); }
          if (p.x > cyl_x + cyl_w - SP_R) { p.x = cyl_x + cyl_w - SP_R; p.vx = -Math.abs(p.vx); }

          // Bottom wall
          if (p.y > gasBot - SP_R) { p.y = gasBot - SP_R; p.vy = -Math.abs(p.vy); }

          // Piston (top boundary for gas) — elastic collision
          if (p.y < pistonBot + SP_R) {
            p.y = pistonBot + SP_R;
            const vRel = p.vy - spPistonVy;
            if (vRel < 0) {
              const imp = 2 * vRel / (1 + 1 / PISTON_MASS);
              p.vy -= imp;
              spPistonVy += imp / PISTON_MASS;
            } else {
              p.vy = spPistonVy + 1;
            }
          }
        }

        // Particle-particle collisions
        for (let i = 0; i < spParticles.length; i++) {
          for (let j = i + 1; j < spParticles.length; j++) {
            const a = spParticles[i], b = spParticles[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minD = SP_R * 2;
            if (dist < minD && dist > 0) {
              const nx = dx / dist, ny = dy / dist;
              const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dvn > 0) {
                a.vx -= dvn * nx; a.vy -= dvn * ny;
                b.vx += dvn * nx; b.vy += dvn * ny;
              }
              const overlap = minD - dist;
              a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
              b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
            }
          }
        }
      }
    }

    function drawSpringPiston() {
      clearCanvas(ctxSP8, WSP8, HSP8);
      const k = parseFloat(kSlider?.value || 2);
      const T = parseFloat(tSlider?.value || 2);

      const pistonThick = 6;
      const gasBot = cyl_y + cyl_h;

      // Gas region tint
      ctxSP8.fillStyle = 'rgba(30,100,200,0.10)';
      ctxSP8.fillRect(cyl_x, spPistonY + pistonThick, cyl_w, gasBot - spPistonY - pistonThick);

      // Cylinder walls
      ctxSP8.strokeStyle = COLORS.axis; ctxSP8.lineWidth = 2;
      ctxSP8.strokeRect(cyl_x, cyl_y, cyl_w, cyl_h);

      // Gas particles
      ctxSP8.fillStyle = COLORS.blue;
      for (const p of spParticles) {
        ctxSP8.beginPath();
        ctxSP8.arc(p.x, p.y, SP_R, 0, 2 * Math.PI);
        ctxSP8.fill();
      }

      // Piston
      ctxSP8.fillStyle = COLORS.purple;
      ctxSP8.fillRect(cyl_x + 2, spPistonY - 1, cyl_w - 4, pistonThick + 2);

      // Spring above piston (zigzag)
      ctxSP8.strokeStyle = COLORS.orange; ctxSP8.lineWidth = 2;
      const springTop = cyl_y + 5;
      const springBot = spPistonY - 2;
      const nCoils = 8;
      const coilH = (springBot - springTop) / nCoils;
      if (coilH > 2) {
        ctxSP8.beginPath();
        ctxSP8.moveTo(cyl_x + cyl_w / 2, springTop);
        for (let i = 0; i < nCoils; i++) {
          const y1 = springTop + i * coilH + coilH * 0.25;
          const y2 = springTop + i * coilH + coilH * 0.75;
          const dx = 25;
          ctxSP8.lineTo(cyl_x + cyl_w / 2 + (i % 2 === 0 ? dx : -dx), y1);
          ctxSP8.lineTo(cyl_x + cyl_w / 2 + (i % 2 === 0 ? -dx : dx), y2);
        }
        ctxSP8.lineTo(cyl_x + cyl_w / 2, springBot);
        ctxSP8.stroke();
      }

      // Labels
      ctxSP8.fillStyle = COLORS.blue; ctxSP8.font = FONT; ctxSP8.textAlign = 'center';
      ctxSP8.fillText('Gas (T = ' + T.toFixed(1) + ')', cyl_x + cyl_w / 2, gasBot + 18);
      ctxSP8.fillStyle = COLORS.orange;
      ctxSP8.fillText('Spring (k = ' + k.toFixed(1) + ')', cyl_x + cyl_w / 2, cyl_y - 8);

      // Heat bath indicator
      ctxSP8.fillStyle = COLORS.textDim; ctxSP8.font = FONT_SM;
      ctxSP8.fillText('Heat bath', cyl_x + cyl_w / 2, gasBot + 34);

      // Right panel: Free energy plot
      // F(x) = (1/2)k*x^2 - T*ln(x), minimum at x* = sqrt(T/k)
      const xMin = Math.sqrt(T / k);

      // Fixed x range that covers all possible minima across slider ranges
      // k ∈ [0.5, 5], T ∈ [0.5, 5] → x* = sqrt(T/k) ∈ [sqrt(0.1), sqrt(10)] ≈ [0.32, 3.16]
      const xLo = 0.05;
      const xHi = 5.0;

      const ox = 280, oy = 40, pw = WSP8 - ox - 40, ph = HSP8 - 90;
      drawAxes(ctxSP8, ox, oy, pw, ph, {xLabel: 'Piston position x', yLabel: 'F(x)'});

      // Compute F values over the visible range
      const pts = [];
      let minF = Infinity, maxF = -Infinity;
      for (let i = 1; i <= 200; i++) {
        const x = xLo + (xHi - xLo) * i / 200;
        const F = 0.5 * k * x * x - T * Math.log(x);
        pts.push({x, F});
        if (F < minF) minF = F;
        if (F > maxF) maxF = F;
      }
      // Clamp vertical range: show from just below minimum to a reasonable cap
      const Fmin = 0.5 * k * xMin * xMin - T * Math.log(xMin);
      const Fbot = Fmin - 1;
      const Ftop = Fmin + 15;

      ctxSP8.strokeStyle = COLORS.blue; ctxSP8.lineWidth = 2;
      ctxSP8.beginPath();
      let started = false;
      for (let i = 0; i < pts.length; i++) {
        const px = ox + (pts[i].x - xLo) / (xHi - xLo) * pw;
        const py = oy + ph * (1 - (pts[i].F - Fbot) / (Ftop - Fbot));
        if (py < oy || py > oy + ph) { started = false; continue; }
        if (!started) { ctxSP8.moveTo(px, py); started = true; }
        else ctxSP8.lineTo(px, py);
      }
      ctxSP8.stroke();

      // Current piston position → x on the plot
      // x = gasH / GH_SCALE maps simulation gas height to the analytical coordinate
      // At equilibrium gasH = GH_SCALE * sqrt(T/k), so x = sqrt(T/k) = x*
      const gasH = gasBot - spPistonY - pistonThick;
      const xCur = Math.max(0.01, gasH / GH_SCALE);
      const xCurClamped = Math.max(xLo + 0.01, Math.min(xHi - 0.01, xCur));
      const Fcur = 0.5 * k * xCurClamped * xCurClamped - T * Math.log(xCurClamped);
      const curPx = ox + (xCurClamped - xLo) / (xHi - xLo) * pw;
      const curPy = oy + ph * (1 - (Fcur - Fbot) / (Ftop - Fbot));

      // Draw moving dot on curve
      if (curPy >= oy && curPy <= oy + ph) {
        ctxSP8.beginPath(); ctxSP8.arc(curPx, curPy, 6, 0, 2 * Math.PI);
        ctxSP8.fillStyle = COLORS.orange; ctxSP8.fill();
        ctxSP8.beginPath(); ctxSP8.arc(curPx, curPy, 3, 0, 2 * Math.PI);
        ctxSP8.fillStyle = '#fff'; ctxSP8.fill();
      }

      // Mark equilibrium minimum
      const minPx = ox + (xMin - xLo) / (xHi - xLo) * pw;
      const minPy = oy + ph * (1 - (Fmin - Fbot) / (Ftop - Fbot));
      ctxSP8.beginPath(); ctxSP8.arc(minPx, minPy, 4, 0, 2 * Math.PI);
      ctxSP8.fillStyle = COLORS.green; ctxSP8.fill();
      ctxSP8.fillStyle = COLORS.green; ctxSP8.font = FONT_SM; ctxSP8.textAlign = 'left';
      ctxSP8.fillText('x*', minPx + 7, minPy + 4);

      ctxSP8.fillStyle = COLORS.text; ctxSP8.font = FONT_LG; ctxSP8.textAlign = 'left';
      ctxSP8.fillText('Free Energy F = \u00bdkx\u00b2 \u2212 T ln x', ox + 5, oy - 10);

      document.getElementById('sp-k-val')?.replaceChildren(document.createTextNode(k.toFixed(1)));
      document.getElementById('sp-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(1)));
    }

    function animateSP() {
      stepSP();
      drawSpringPiston();
      activeAnimations['spring-piston'] = requestAnimationFrame(animateSP);
    }

    kSlider?.addEventListener('input', rescaleSPSpeeds);
    tSlider?.addEventListener('input', rescaleSPSpeeds);

    initSPParticles();
    animateSP();
  }

  // ----- Reaction Enthalpy Diagram -----
  const cRH = document.getElementById('vis-reaction-enthalpy');
  if (cRH) {
    const {ctx: ctxRH, W: WRH, H: HRH} = setupCanvas(cRH);
    const rhTempSlider = document.getElementById('rh-temp');

    function drawReactionEnthalpy() {
      clearCanvas(ctxRH, WRH, HRH);
      const T = parseFloat(rhTempSlider?.value || 298);

      // Thermodynamic data for ethene hydrogenation
      const dH = -136.3; // kJ/mol
      const dS = -0.121; // kJ/(mol·K)
      const TdS = T * dS; // negative (entropy decreases)
      const dG = dH - TdS;

      // Layout: bar chart showing ΔH, −TΔS, and ΔG
      const ox = 80, oy = 45, pw = WRH - 140, ph = HRH - 100;
      const zeroY = oy + ph * 0.4; // zero line positioned in upper portion since values are mostly negative
      const scale = ph / 300; // pixels per kJ/mol — range roughly ±150

      // Title
      ctxRH.fillStyle = COLORS.text; ctxRH.font = FONT_LG; ctxRH.textAlign = 'left';
      ctxRH.fillText('Reaction Enthalpy Diagram', ox, oy - 10);
      ctxRH.fillStyle = COLORS.textDim; ctxRH.font = FONT_SM; ctxRH.textAlign = 'right';
      ctxRH.fillText('T = ' + T + ' K', ox + pw, oy - 10);

      // Zero line
      ctxRH.strokeStyle = COLORS.axis; ctxRH.lineWidth = 1;
      ctxRH.beginPath(); ctxRH.moveTo(ox - 10, zeroY); ctxRH.lineTo(ox + pw + 10, zeroY); ctxRH.stroke();
      ctxRH.fillStyle = COLORS.textDim; ctxRH.font = FONT_SM; ctxRH.textAlign = 'right';
      ctxRH.fillText('0', ox - 14, zeroY + 4);

      // Bar positions
      const barW = pw * 0.18;
      const gap = pw * 0.08;
      const x1 = ox + pw * 0.1;
      const x2 = x1 + barW + gap;
      const x3 = x2 + barW + gap;

      // Helper: draw a bar from zero line
      function drawBar(x, val, color, label, sublabel) {
        const barH = Math.abs(val) * scale;
        const y = val < 0 ? zeroY : zeroY - barH;
        ctxRH.fillStyle = color;
        ctxRH.globalAlpha = 0.3;
        ctxRH.fillRect(x, y, barW, barH);
        ctxRH.globalAlpha = 1.0;
        ctxRH.strokeStyle = color; ctxRH.lineWidth = 2;
        ctxRH.strokeRect(x, y, barW, barH);

        // Value label inside or near bar
        ctxRH.fillStyle = color; ctxRH.font = FONT; ctxRH.textAlign = 'center';
        const valY = val < 0 ? y + barH / 2 + 5 : y + barH / 2 + 5;
        if (barH > 25) {
          ctxRH.fillText(val.toFixed(1), x + barW / 2, valY);
        } else {
          ctxRH.fillText(val.toFixed(1), x + barW / 2, val < 0 ? y + barH + 15 : y - 8);
        }

        // Label below
        ctxRH.fillStyle = COLORS.text; ctxRH.font = FONT; ctxRH.textAlign = 'center';
        ctxRH.fillText(label, x + barW / 2, oy + ph + 18);
        if (sublabel) {
          ctxRH.fillStyle = COLORS.textDim; ctxRH.font = FONT_SM;
          ctxRH.fillText(sublabel, x + barW / 2, oy + ph + 34);
        }
      }

      drawBar(x1, dH, COLORS.blue, 'ΔH', dH.toFixed(1) + ' kJ/mol');
      drawBar(x2, -TdS, COLORS.orange, '−TΔS', (-TdS).toFixed(1) + ' kJ/mol');
      drawBar(x3, dG, dG < 0 ? COLORS.green : COLORS.red, 'ΔG', dG.toFixed(1) + ' kJ/mol');

      // Equation and spontaneity at bottom
      const spontaneous = dG < 0;
      ctxRH.fillStyle = spontaneous ? COLORS.green : COLORS.red;
      ctxRH.font = FONT_LG; ctxRH.textAlign = 'center';
      ctxRH.fillText(
        'ΔG = ΔH − TΔS = ' + dG.toFixed(1) + ' kJ/mol  ' + (spontaneous ? '(Spontaneous)' : '(Non-spontaneous)'),
        WRH / 2, oy + ph + 52
      );

      document.getElementById('rh-temp-val')?.replaceChildren(document.createTextNode(T));
    }

    rhTempSlider?.addEventListener('input', drawReactionEnthalpy);
    drawReactionEnthalpy();
  }

  // ----- Osmotic Equilibrium (particle simulation) -----
  const cOsm = document.getElementById('vis-osmotic');
  if (cOsm) {
    const {ctx: ctxO, W: WO, H: HO} = setupCanvas(cOsm);
    const nSoluteSlider = document.getElementById('osm-nsolute');
    const osmTempSlider = document.getElementById('osm-temp');
    const resetBtn = document.getElementById('osm-reset');

    // Chamber geometry: two chambers separated by membrane
    const chL = 15, chR = 365, chTop = 55, chBot = 385;
    const membrX = (chL + chR) / 2;  // membrane at center
    const chH = chBot - chTop;

    // Particle properties
    const rW = 2.5, rS = 5.5;        // radii: water small, solute large
    const mW = 1, mS = 5;            // mass (solute heavier)
    const nWaterTot = 60;
    const blockRange = rS * 2.2;      // how far solute blocks membrane pores
    // Pixels of liquid height per water molecule on one side
    const pixPerMol = chH * 0.75 / (nWaterTot * 0.55);

    let waterP = [], soluteP = [];
    let hist = [];                     // time series of water fraction on right
    let osmLeftSurf = chBot, osmRightSurf = chBot; // surface y-coords (stored for draw)

    function computeSurfaces() {
      let nL = 0, nR = 0;
      for (const p of waterP) { if (p.x < membrX) nL++; else nR++; }
      osmLeftSurf = chBot - Math.max(nL, 1) * pixPerMol;
      osmRightSurf = chBot - Math.max(nR, 1) * pixPerMol;
      return {nL, nR};
    }

    function initOsm() {
      const T = parseFloat(osmTempSlider?.value || 1.5);
      const Ns = parseInt(nSoluteSlider?.value || 8);
      const spd = Math.sqrt(T) * 1.2;
      waterP = []; soluteP = []; hist = [];

      // Water: half on each side, distributed within liquid region
      const halfH = (nWaterTot / 2) * pixPerMol; // height of liquid when 30 molecules
      for (let i = 0; i < nWaterTot; i++) {
        const left = i < nWaterTot / 2;
        const xMin = left ? chL + rW + 1 : membrX + rW + 1;
        const xMax = left ? membrX - rW - 1 : chR - rW - 1;
        waterP.push({
          x: xMin + Math.random() * (xMax - xMin),
          y: chBot - halfH + Math.random() * (halfH - 2 * rW),
          vx: (Math.random() - 0.5) * spd,
          vy: (Math.random() - 0.5) * spd
        });
      }
      // Solute: all on right side, within liquid
      for (let i = 0; i < Ns; i++) {
        soluteP.push({
          x: membrX + rS + 4 + Math.random() * (chR - membrX - 2 * rS - 8),
          y: chBot - halfH + Math.random() * (halfH - 2 * rS),
          vx: (Math.random() - 0.5) * spd * 0.5,
          vy: (Math.random() - 0.5) * spd * 0.5
        });
      }
      computeSurfaces();
    }

    function stepOsm() {
      const T = parseFloat(osmTempSlider?.value || 1.5);
      const kick = T * 0.08;
      const damp = 0.94;

      // Compute current water surfaces
      const {nL, nR} = computeSurfaces();
      const leftSurf = osmLeftSurf;
      const rightSurf = osmRightSurf;

      // --- Update water particles (Brownian motion within liquid) ---
      for (const p of waterP) {
        const prevX = p.x;
        p.vx += (Math.random() - 0.5) * kick;
        p.vy += (Math.random() - 0.5) * kick;
        p.vx *= damp; p.vy *= damp;
        p.x += p.vx; p.y += p.vy;

        // Membrane crossing: water from right->left may be blocked by nearby solute.
        // This is the microscopic mechanism of osmosis: solute near the membrane
        // reduces the rate at which water can cross back to the pure side.
        if (prevX >= membrX && p.x < membrX) {
          let blocked = false;
          for (const s of soluteP) {
            if (Math.abs(s.y - p.y) < blockRange) { blocked = true; break; }
          }
          if (blocked) {
            p.x = membrX + rW + 0.5;
            p.vx = Math.abs(p.vx) * 0.3;
          }
        }
        // Water from left->right: always passes freely through membrane

        // Determine which side and get that side's surface
        const onLeft = p.x < membrX;
        const surf = onLeft ? leftSurf : rightSurf;

        // Outer walls
        if (p.x < chL + rW) { p.x = chL + rW; p.vx = Math.abs(p.vx); }
        if (p.x > chR - rW) { p.x = chR - rW; p.vx = -Math.abs(p.vx); }
        // Confine to liquid: bounce off surface and bottom
        if (p.y < surf + rW) { p.y = surf + rW; p.vy = Math.abs(p.vy); }
        if (p.y > chBot - rW) { p.y = chBot - rW; p.vy = -Math.abs(p.vy); }
      }

      // --- Update solute particles (confined to right-side liquid) ---
      for (const p of soluteP) {
        p.vx += (Math.random() - 0.5) * kick;
        p.vy += (Math.random() - 0.5) * kick;
        p.vx *= damp; p.vy *= damp;
        p.x += p.vx; p.y += p.vy;

        // Solute bounces off membrane (can't cross) and stays in right-side liquid
        if (p.x < membrX + rS) { p.x = membrX + rS; p.vx = Math.abs(p.vx); }
        if (p.x > chR - rS) { p.x = chR - rS; p.vx = -Math.abs(p.vx); }
        if (p.y < rightSurf + rS) { p.y = rightSurf + rS; p.vy = Math.abs(p.vy); }
        if (p.y > chBot - rS) { p.y = chBot - rS; p.vy = -Math.abs(p.vy); }
      }

      // --- Particle-particle collisions ---
      const all = waterP.concat(soluteP);
      const nAll = all.length;
      for (let i = 0; i < nAll; i++) {
        const a = all[i];
        const ra = i < nWaterTot ? rW : rS;
        const ma = i < nWaterTot ? mW : mS;
        for (let j = i + 1; j < nAll; j++) {
          const b = all[j];
          const rb = j < nWaterTot ? rW : rS;
          const mb = j < nWaterTot ? mW : mS;
          const dx = b.x - a.x, dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          const minD = ra + rb;
          if (distSq < minD * minD && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist, ny = dy / dist;
            const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (dvn > 0) {
              const imp = 2 * dvn / (ma + mb);
              a.vx -= imp * mb * nx; a.vy -= imp * mb * ny;
              b.vx += imp * ma * nx; b.vy += imp * ma * ny;
              const overlap = (minD - dist) / 2 + 0.3;
              a.x -= overlap * nx; a.y -= overlap * ny;
              b.x += overlap * nx; b.y += overlap * ny;
            }
          }
        }
      }

      // Track fraction of water on right
      hist.push(nR / nWaterTot);
      if (hist.length > 400) hist.shift();
    }

    function drawOsm() {
      clearCanvas(ctxO, WO, HO);
      const Ns = parseInt(nSoluteSlider?.value || 8);
      const T = parseFloat(osmTempSlider?.value || 1.5);

      // Count water on each side
      let nL = 0, nR = 0;
      for (const p of waterP) { if (p.x < membrX) nL++; else nR++; }

      const leftSurf = osmLeftSurf;
      const rightSurf = osmRightSurf;

      // Water fill: shaded region IS the liquid
      ctxO.fillStyle = 'rgba(40,130,230,0.13)';
      ctxO.fillRect(chL + 1, leftSurf, membrX - chL - 1, chBot - leftSurf);
      ctxO.fillRect(membrX + 1, rightSurf, chR - membrX - 1, chBot - rightSurf);

      // Subtle surface line
      ctxO.strokeStyle = 'rgba(80,180,255,0.35)'; ctxO.lineWidth = 1;
      ctxO.beginPath();
      ctxO.moveTo(chL + 1, leftSurf); ctxO.lineTo(membrX - 1, leftSurf);
      ctxO.stroke();
      ctxO.beginPath();
      ctxO.moveTo(membrX + 1, rightSurf); ctxO.lineTo(chR - 1, rightSurf);
      ctxO.stroke();

      // Chamber walls
      ctxO.strokeStyle = COLORS.axis; ctxO.lineWidth = 2;
      ctxO.beginPath();
      ctxO.moveTo(chL, chTop); ctxO.lineTo(chL, chBot);
      ctxO.lineTo(chR, chBot); ctxO.lineTo(chR, chTop);
      ctxO.stroke();

      // Membrane (dashed orange)
      ctxO.strokeStyle = COLORS.orange; ctxO.lineWidth = 2.5;
      ctxO.setLineDash([6, 5]);
      ctxO.beginPath();
      ctxO.moveTo(membrX, chTop); ctxO.lineTo(membrX, chBot);
      ctxO.stroke();
      ctxO.setLineDash([]);

      // Draw water particles
      ctxO.fillStyle = COLORS.blue;
      for (const p of waterP) {
        ctxO.beginPath();
        ctxO.arc(p.x, p.y, rW, 0, 2 * Math.PI);
        ctxO.fill();
      }

      // Draw solute particles (larger, with inner dot to distinguish)
      for (const p of soluteP) {
        ctxO.fillStyle = COLORS.red;
        ctxO.beginPath();
        ctxO.arc(p.x, p.y, rS, 0, 2 * Math.PI);
        ctxO.fill();
        ctxO.fillStyle = 'rgba(0,0,0,0.35)';
        ctxO.beginPath();
        ctxO.arc(p.x, p.y, rS * 0.4, 0, 2 * Math.PI);
        ctxO.fill();
      }

      // Chamber labels
      ctxO.font = FONT; ctxO.textAlign = 'center';
      ctxO.fillStyle = COLORS.blue;
      ctxO.fillText('Pure solvent', (chL + membrX) / 2, chTop - 15);
      ctxO.fillStyle = COLORS.text;
      ctxO.fillText('Solution', (membrX + chR) / 2, chTop - 15);

      // Membrane label (vertical)
      ctxO.fillStyle = COLORS.orange; ctxO.font = FONT_SM;
      ctxO.save();
      ctxO.translate(membrX - 8, chTop + chH * 0.5);
      ctxO.rotate(-Math.PI / 2);
      ctxO.textAlign = 'center';
      ctxO.fillText('membrane', 0, 0);
      ctxO.restore();

      // Height difference arrow
      if (leftSurf - rightSurf > 6) {
        const aX = chR + 14;
        ctxO.strokeStyle = COLORS.green; ctxO.lineWidth = 1.5;
        ctxO.beginPath();
        ctxO.moveTo(aX - 4, leftSurf); ctxO.lineTo(aX + 4, leftSurf);
        ctxO.moveTo(aX - 4, rightSurf); ctxO.lineTo(aX + 4, rightSurf);
        ctxO.stroke();
        drawArrow(ctxO, aX, leftSurf, aX, rightSurf, 5);
        ctxO.fillStyle = COLORS.green; ctxO.font = FONT_SM; ctxO.textAlign = 'left';
        ctxO.fillText('\u0394h', aX + 7, (leftSurf + rightSurf) / 2 + 4);
      }

      // === Right info panel ===
      const tx = 400;

      ctxO.textAlign = 'left';
      ctxO.fillStyle = COLORS.text; ctxO.font = FONT_LG;
      ctxO.fillText('Osmotic Equilibrium', tx, chTop + 5);

      ctxO.font = FONT;
      ctxO.fillStyle = COLORS.blue;
      ctxO.fillText('Water (left): ' + nL, tx, chTop + 32);
      ctxO.fillText('Water (right): ' + nR, tx, chTop + 50);
      ctxO.fillStyle = COLORS.red;
      ctxO.fillText('Solute (right): ' + Ns, tx, chTop + 68);

      // Status indicator
      const diff = nR - nL;
      const equil = Math.abs(diff) <= 3;
      ctxO.fillStyle = equil ? COLORS.green : COLORS.yellow;
      ctxO.font = FONT_SM;
      ctxO.fillText(equil ? '\u2713 Near equilibrium' : '\u25b6 Equilibrating\u2026', tx, chTop + 90);

      // --- Time-series plot ---
      const plx = tx, ply = chTop + 108, plw = WO - tx - 12, plh = 90;
      ctxO.fillStyle = 'rgba(0,0,0,0.25)';
      ctxO.fillRect(plx, ply, plw, plh);
      ctxO.strokeStyle = 'rgba(255,255,255,0.2)'; ctxO.lineWidth = 1;
      ctxO.strokeRect(plx, ply, plw, plh);
      // Midline at 0.5 (equal split)
      ctxO.strokeStyle = 'rgba(255,255,255,0.15)'; ctxO.lineWidth = 1;
      ctxO.setLineDash([3, 3]);
      ctxO.beginPath();
      ctxO.moveTo(plx, ply + plh / 2); ctxO.lineTo(plx + plw, ply + plh / 2);
      ctxO.stroke();
      ctxO.setLineDash([]);
      // Plot water fraction on right over time
      if (hist.length > 1) {
        ctxO.strokeStyle = COLORS.blue; ctxO.lineWidth = 1.5;
        ctxO.beginPath();
        for (let i = 0; i < hist.length; i++) {
          const hx = plx + (i / 400) * plw;
          const hy = ply + plh - hist[i] * plh;
          i === 0 ? ctxO.moveTo(hx, hy) : ctxO.lineTo(hx, hy);
        }
        ctxO.stroke();
      }
      // Plot axis labels
      ctxO.fillStyle = COLORS.textDim; ctxO.font = '10px Inter, system-ui, sans-serif';
      ctxO.textAlign = 'left';
      ctxO.fillText('fraction of water on right', plx + 2, ply - 3);
      ctxO.textAlign = 'right';
      ctxO.fillText('1', plx - 3, ply + 8);
      ctxO.fillText('\u00bd', plx - 3, ply + plh / 2 + 3);
      ctxO.fillText('0', plx - 3, ply + plh + 1);
      ctxO.textAlign = 'left';
      ctxO.fillText('time \u2192', plx + plw - 30, ply + plh + 11);

      // --- Explanation text ---
      let ty = ply + plh + 28;
      ctxO.textAlign = 'left'; ctxO.font = FONT_SM; ctxO.fillStyle = COLORS.textDim;
      ctxO.fillText('Solvent freely crosses the membrane.', tx, ty);
      ctxO.fillText('Solute is too large \u2014 it bounces off,', tx, ty + 15);
      ctxO.fillText('partially blocking solvent return.', tx, ty + 30);
      ctxO.fillText('Net flow \u2192 solution side until', tx, ty + 50);
      ctxO.fillStyle = COLORS.green; ctxO.font = FONT;
      ctxO.fillText('\u03a0 = k\u0042T \u00b7 N\u209b / V', tx, ty + 68);

      // Legend
      const ly = ty + 90;
      ctxO.fillStyle = COLORS.blue;
      ctxO.beginPath(); ctxO.arc(tx + 5, ly, rW + 0.5, 0, 2 * Math.PI); ctxO.fill();
      ctxO.fillStyle = COLORS.textDim; ctxO.font = FONT_SM;
      ctxO.fillText('Solvent', tx + 14, ly + 4);
      ctxO.fillStyle = COLORS.red;
      ctxO.beginPath(); ctxO.arc(tx + 80, ly, rS, 0, 2 * Math.PI); ctxO.fill();
      ctxO.fillStyle = COLORS.textDim;
      ctxO.fillText('Solute', tx + 90, ly + 4);

      // Update slider displays
      document.getElementById('osm-nsolute-val')?.replaceChildren(document.createTextNode(Ns));
      document.getElementById('osm-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(1)));
    }

    function animateOsm() {
      stepOsm();
      drawOsm();
      activeAnimations['osmotic'] = requestAnimationFrame(animateOsm);
    }

    nSoluteSlider?.addEventListener('input', initOsm);
    osmTempSlider?.addEventListener('input', () => {
      const T = parseFloat(osmTempSlider.value);
      const spd = Math.sqrt(T) * 1.2;
      for (const p of waterP.concat(soluteP)) {
        const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 0.1;
        const f = spd / s * (0.5 + Math.random());
        p.vx *= f; p.vy *= f;
      }
    });
    resetBtn?.addEventListener('click', initOsm);

    initOsm();
    animateOsm();
  }
}


// =============================================================================
// CH9: Phase Transitions + 2D Ising Model
// =============================================================================
function initCh9Vis() {
  // ----- Surface Tension: soft-core MD, liquid forms from attraction + gravity -----
  const cST = document.getElementById('vis-surface-tension');
  if (cST) {
    const { ctx: ctxST, W: WST, H: HST } = setupCanvas(cST);

    // H2O drawing
    const O_R = 7, H_R = 4, OH_LEN = 10;
    const HOH_ANG = 104.5 * Math.PI / 180;

    const tempSlider = document.getElementById('st-temp');
    const tempVal = document.getElementById('st-temp-val');

    // Beaker geometry
    const bkL = 50, bkR = WST - 50, bkT = 25, bkB = HST - 50;
    const bkW = bkR - bkL, bkRnd = 16;

    // Physics: soft-core pairwise potential
    const N_MOL = 55;
    const CORE = 20;
    const EQ_R = 24;
    const RCUT = 50;
    const K_REP = 18;
    const K_ATT = 1.8;
    const GRAV = 0.25;
    const DAMP = 0.88;
    const NOISE_SCALE = 1.8;
    const SUBSTEPS = 3;
    const F_CAP = 12;
    let mols = [];

    function initMols() {
      mols = [];
      const sp = EQ_R;
      const startY = bkB - 15;
      let count = 0;
      for (let row = 0; count < N_MOL; row++) {
        const y = startY - row * sp * 0.87;
        if (y < bkT + 15) break;
        const xOff = (row % 2) * sp * 0.5;
        const cols = Math.floor((bkW - 30) / sp);
        const x0 = bkL + (bkW - (cols - 1) * sp) / 2;
        for (let c = 0; c < cols && count < N_MOL; c++) {
          mols.push({
            x: x0 + c * sp + xOff + (Math.random() - 0.5) * 4,
            y: y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            angle: Math.random() * 2 * Math.PI,
            va: 0
          });
          count++;
        }
      }
    }

    function stepST() {
      const T = parseFloat(tempSlider?.value || 0.6);
      const noise = T * NOISE_SCALE;

      for (let sub = 0; sub < SUBSTEPS; sub++) {
        for (const m of mols) { m.fx = 0; m.fy = 0; }

        // Pairwise forces
        for (let i = 0; i < mols.length; i++) {
          for (let j = i + 1; j < mols.length; j++) {
            const a = mols[i], b = mols[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const r2 = dx * dx + dy * dy;
            if (r2 > RCUT * RCUT || r2 < 1) continue;
            const r = Math.sqrt(r2);

            let f = 0;
            if (r < CORE) {
              f = K_REP * (CORE - r);
            } else if (r < RCUT) {
              const t = (r - CORE) / (RCUT - CORE);
              f = -K_ATT * 4 * t * (1 - t);
            }
            if (f > F_CAP) f = F_CAP;
            if (f < -F_CAP) f = -F_CAP;

            const fx = f * dx / r, fy = f * dy / r;
            a.fx += fx; a.fy += fy;
            b.fx -= fx; b.fy -= fy;
          }
        }

        // Integrate: damped dynamics + gravity + thermal noise
        for (const m of mols) {
          m.vx += m.fx;
          m.vy += m.fy + GRAV;
          m.vx *= DAMP;
          m.vy *= DAMP;
          m.vx += (Math.random() - 0.5) * noise;
          m.vy += (Math.random() - 0.5) * noise;
          m.x += m.vx;
          m.y += m.vy;

          m.va += (Math.random() - 0.5) * T * 0.15;
          m.va *= 0.93;
          m.angle += m.va;

          // Beaker walls
          const mr = 10;
          if (m.x < bkL + mr) { m.x = bkL + mr; m.vx = Math.abs(m.vx) * 0.3; }
          if (m.x > bkR - mr) { m.x = bkR - mr; m.vx = -Math.abs(m.vx) * 0.3; }
          if (m.y < bkT + mr) { m.y = bkT + mr; m.vy = Math.abs(m.vy) * 0.3; }
          if (m.y > bkB - mr) { m.y = bkB - mr; m.vy = -Math.abs(m.vy) * 0.3; }
          // Rounded bottom corners
          const cy = bkB - bkRnd;
          if (m.y > cy) {
            const corners = [bkL + bkRnd, bkR - bkRnd];
            for (const cx of corners) {
              const cdx = m.x - cx, cdy = m.y - cy;
              if ((m.x < cx && cx === corners[0]) || (m.x > cx && cx === corners[1])) {
                const d = Math.sqrt(cdx * cdx + cdy * cdy);
                if (d > bkRnd - mr) {
                  const nx = cdx / d, ny = cdy / d;
                  m.x = cx + nx * (bkRnd - mr);
                  m.y = cy + ny * (bkRnd - mr);
                  const vn = m.vx * nx + m.vy * ny;
                  if (vn > 0) { m.vx -= vn * nx * 1.3; m.vy -= vn * ny * 1.3; }
                }
              }
            }
          }
        }
      }
    }

    function drawH2O(x, y, angle) {
      const ha = HOH_ANG / 2;
      const h1x = x + OH_LEN * Math.cos(angle - ha);
      const h1y = y + OH_LEN * Math.sin(angle - ha);
      const h2x = x + OH_LEN * Math.cos(angle + ha);
      const h2y = y + OH_LEN * Math.sin(angle + ha);

      ctxST.strokeStyle = 'rgba(200,200,200,0.5)';
      ctxST.lineWidth = 2;
      ctxST.setLineDash([]);
      ctxST.beginPath();
      ctxST.moveTo(h1x, h1y); ctxST.lineTo(x, y);
      ctxST.moveTo(h2x, h2y); ctxST.lineTo(x, y);
      ctxST.stroke();

      ctxST.fillStyle = '#ef5350';
      ctxST.beginPath(); ctxST.arc(x, y, O_R, 0, 2 * Math.PI); ctxST.fill();
      ctxST.fillStyle = '#e8e8e8';
      ctxST.beginPath(); ctxST.arc(h1x, h1y, H_R, 0, 2 * Math.PI); ctxST.fill();
      ctxST.beginPath(); ctxST.arc(h2x, h2y, H_R, 0, 2 * Math.PI); ctxST.fill();
    }

    function drawBeaker() {
      ctxST.strokeStyle = 'rgba(150, 200, 240, 0.3)';
      ctxST.lineWidth = 3;
      ctxST.beginPath();
      ctxST.moveTo(bkL, bkT - 5);
      ctxST.lineTo(bkL, bkB - bkRnd);
      ctxST.quadraticCurveTo(bkL, bkB, bkL + bkRnd, bkB);
      ctxST.lineTo(bkR - bkRnd, bkB);
      ctxST.quadraticCurveTo(bkR, bkB, bkR, bkB - bkRnd);
      ctxST.lineTo(bkR, bkT - 5);
      ctxST.stroke();
      ctxST.beginPath();
      ctxST.moveTo(bkL, bkT - 5); ctxST.lineTo(bkL - 6, bkT - 10);
      ctxST.moveTo(bkR, bkT - 5); ctxST.lineTo(bkR + 6, bkT - 10);
      ctxST.stroke();
      ctxST.strokeStyle = 'rgba(150, 200, 240, 0.07)';
      ctxST.lineWidth = 5;
      ctxST.beginPath();
      ctxST.moveTo(bkL + 3, bkT + 20); ctxST.lineTo(bkL + 3, bkB - 30);
      ctxST.stroke();
    }

    function drawST() {
      clearCanvas(ctxST, WST, HST);

      // Find surface: biggest vertical gap in sorted y-positions
      const sorted = mols.map(m => m.y).sort((a, b) => a - b);
      let surfY = bkB, maxGap = 0;
      for (let i = 3; i < sorted.length - 3; i++) {
        const gap = sorted[i + 1] - sorted[i];
        if (gap > maxGap) { maxGap = gap; surfY = (sorted[i] + sorted[i + 1]) / 2; }
      }
      if (maxGap < 15) surfY = sorted[0] - 10;

      // Subtle liquid tint
      if (surfY < bkB - 20) {
        const grad = ctxST.createLinearGradient(0, surfY, 0, surfY + 25);
        grad.addColorStop(0, 'rgba(30, 80, 180, 0)');
        grad.addColorStop(1, 'rgba(30, 80, 180, 0.06)');
        ctxST.fillStyle = grad;
        ctxST.fillRect(bkL + 2, surfY, bkW - 4, bkB - surfY - 2);
      }

      // Hydrogen bonds: dashed blue between close molecules
      const hbR = EQ_R * 1.4, hbR2 = hbR * hbR;
      ctxST.lineWidth = 1.2;
      ctxST.setLineDash([3, 4]);
      for (let i = 0; i < mols.length; i++) {
        for (let j = i + 1; j < mols.length; j++) {
          const a = mols[i], b = mols[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const r2 = dx * dx + dy * dy;
          if (r2 > hbR2) continue;
          const r = Math.sqrt(r2);
          const strength = Math.max(0, 1 - (r - CORE) / (hbR - CORE));
          ctxST.strokeStyle = 'rgba(79, 195, 247, ' + (strength * 0.5).toFixed(2) + ')';
          ctxST.beginPath(); ctxST.moveTo(a.x, a.y); ctxST.lineTo(b.x, b.y); ctxST.stroke();
        }
      }
      ctxST.setLineDash([]);

      // Draw molecules
      for (const m of mols) drawH2O(m.x, m.y, m.angle);

      // Unsaturated bond stubs on surface molecules
      const neighR2 = (EQ_R * 1.5) * (EQ_R * 1.5);
      for (let i = 0; i < mols.length; i++) {
        const m = mols[i];
        let nAbove = 0, nTotal = 0, sumDx = 0, sumDy = 0;
        for (let j = 0; j < mols.length; j++) {
          if (i === j) continue;
          const dx = mols[j].x - m.x, dy = mols[j].y - m.y;
          if (dx * dx + dy * dy < neighR2) {
            nTotal++;
            const d = Math.sqrt(dx * dx + dy * dy) + 0.1;
            sumDx += dx / d; sumDy += dy / d;
            if (dy < -3) nAbove++;
          }
        }
        if (nTotal >= 2 && nAbove <= 1 && m.y < surfY + 15) {
          const len = Math.sqrt(sumDx * sumDx + sumDy * sumDy) + 0.1;
          ctxST.strokeStyle = 'rgba(255, 167, 38, 0.5)';
          ctxST.lineWidth = 1.8;
          ctxST.setLineDash([3, 3]);
          ctxST.beginPath();
          ctxST.moveTo(m.x, m.y);
          ctxST.lineTo(m.x - sumDx / len * 14, m.y - sumDy / len * 14);
          ctxST.stroke();
          ctxST.setLineDash([]);
        }
      }

      drawBeaker();

      // Labels
      ctxST.font = '12px Inter, system-ui, sans-serif';
      ctxST.textAlign = 'center';
      ctxST.fillStyle = 'rgba(255,255,255,0.15)';
      if (surfY > bkT + 30 && surfY < bkB - 30) {
        ctxST.fillText('vapor', bkL + bkW / 2, Math.max(bkT + 18, surfY - 25));
        ctxST.fillText('liquid', bkL + bkW / 2, bkB - 12);
      }

      const nGas = mols.filter(m => m.y < surfY).length;
      const ly = HST - 20;
      ctxST.font = FONT_SM; ctxST.textAlign = 'left';
      ctxST.fillStyle = '#ef5350';
      ctxST.beginPath(); ctxST.arc(8, ly, 4, 0, 2 * Math.PI); ctxST.fill();
      ctxST.fillStyle = '#e8e8e8';
      ctxST.beginPath(); ctxST.arc(17, ly - 3, 2.5, 0, 2 * Math.PI); ctxST.fill();
      ctxST.beginPath(); ctxST.arc(17, ly + 3, 2.5, 0, 2 * Math.PI); ctxST.fill();
      ctxST.fillStyle = COLORS.text; ctxST.fillText('H\u2082O', 23, ly + 4);

      ctxST.strokeStyle = 'rgba(79,195,247,0.5)'; ctxST.lineWidth = 1.2;
      ctxST.setLineDash([3, 4]);
      ctxST.beginPath(); ctxST.moveTo(62, ly); ctxST.lineTo(86, ly); ctxST.stroke();
      ctxST.setLineDash([]);
      ctxST.fillText('H-bond', 90, ly + 4);

      ctxST.strokeStyle = 'rgba(255,167,38,0.5)'; ctxST.lineWidth = 1.8;
      ctxST.setLineDash([3, 3]);
      ctxST.beginPath(); ctxST.moveTo(148, ly); ctxST.lineTo(170, ly); ctxST.stroke();
      ctxST.setLineDash([]);
      ctxST.fillText('unsaturated (surface)', 174, ly + 4);

      ctxST.font = FONT; ctxST.textAlign = 'right'; ctxST.fillStyle = COLORS.textDim;
      ctxST.fillText('Vapor: ' + nGas + '   Liquid: ' + (N_MOL - nGas), WST - 8, ly + 4);
    }

    function animateST() {
      stepST();
      drawST();
      requestAnimationFrame(animateST);
    }

    document.getElementById('st-reset')?.addEventListener('click', initMols);
    tempSlider?.addEventListener('input', () => {
      if (tempVal) tempVal.textContent = parseFloat(tempSlider.value).toFixed(2);
    });

    initMols();
    animateST();
  }

  // ----- Carbon Crystal Structures -----
  const cCrystal = document.getElementById('vis-carbon-crystals');
  if (cCrystal) {
    const { ctx: ctxC, W: WC, H: HC } = setupCanvas(cCrystal);

    // Two viewports side by side
    const halfW = WC / 2;
    const pad = 15;

    // Rotation angles for each structure (drag to rotate)
    let diamondAngleX = -0.45, diamondAngleY = 0.6;
    let graphiteAngleX = -0.35, graphiteAngleY = 0.5;
    let dragging = null; // 'diamond' or 'graphite'
    let dragStart = { x: 0, y: 0 };
    let dragAngleStart = { x: 0, y: 0 };

    // 3D rotation
    function rotatePoint(p, ax, ay) {
      let { x, y, z } = p;
      // Rotate around Y
      let x1 = x * Math.cos(ay) - z * Math.sin(ay);
      let z1 = x * Math.sin(ay) + z * Math.cos(ay);
      // Rotate around X
      let y1 = y * Math.cos(ax) - z1 * Math.sin(ax);
      let z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
      return { x: x1, y: y1, z: z2 };
    }

    function project(p, cx, cy, scale) {
      const perspective = 5;
      const f = perspective / (perspective + p.z);
      return { x: cx + p.x * scale * f, y: cy + p.y * scale * f, z: p.z, f };
    }

    // Diamond: FCC with tetrahedral basis
    function getDiamondAtoms() {
      const atoms = [];
      const a = 1; // lattice constant
      const N = 3; // unit cells per axis
      // Conventional cubic cell FCC positions
      const fcc = [
        [0,0,0],[.5,.5,0],[.5,0,.5],[0,.5,.5]
      ];
      // Basis: each FCC site + offset
      const basis = [[0,0,0],[.25,.25,.25]];
      const center = N / 2;
      for (let dx = 0; dx < N; dx++) {
        for (let dy = 0; dy < N; dy++) {
          for (let dz = 0; dz < N; dz++) {
            for (const f of fcc) {
              for (const b of basis) {
                const x = (f[0] + b[0] + dx) * a;
                const y = (f[1] + b[1] + dy) * a;
                const z = (f[2] + b[2] + dz) * a;
                if (x >= -0.1 && x <= N + 0.1 && y >= -0.1 && y <= N + 0.1 && z >= -0.1 && z <= N + 0.1) {
                  atoms.push({ x: x - center, y: y - center, z: z - center });
                }
              }
            }
          }
        }
      }
      // Remove duplicates
      const unique = [];
      for (const a of atoms) {
        if (!unique.some(u => Math.abs(u.x-a.x)<0.01 && Math.abs(u.y-a.y)<0.01 && Math.abs(u.z-a.z)<0.01)) {
          unique.push(a);
        }
      }
      return unique;
    }

    function getDiamondBonds(atoms) {
      const bonds = [];
      const bondLen = 0.435; // nearest neighbor in diamond
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dx = atoms[i].x - atoms[j].x;
          const dy = atoms[i].y - atoms[j].y;
          const dz = atoms[i].z - atoms[j].z;
          const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (d < bondLen) bonds.push([i, j]);
        }
      }
      return bonds;
    }

    // Graphite: layered hexagonal
    function getGraphiteAtoms() {
      const atoms = [];
      const a = 0.6; // in-plane spacing
      const c = 0.85; // layer spacing
      const layers = 3;
      for (let layer = 0; layer < layers; layer++) {
        const zz = (layer - 1) * c;
        const offset = (layer % 2 === 0) ? 0 : a * 0.5;
        // Hexagonal grid
        for (let i = -1; i <= 2; i++) {
          for (let j = -1; j <= 2; j++) {
            const x1 = i * a + j * a * 0.5 + offset;
            const y1 = j * a * Math.sqrt(3) / 2;
            atoms.push({ x: x1 - 0.3, y: zz, z: y1 - 0.3, layer });
            // Second basis atom
            const x2 = x1 + a * 0.5;
            const y2 = y1 + a * Math.sqrt(3) / 6;
            atoms.push({ x: x2 - 0.3, y: zz, z: y2 - 0.3, layer });
          }
        }
      }
      return atoms;
    }

    function getGraphiteBonds(atoms) {
      const bonds = [];
      const intraBond = 0.45;
      const interBond = 1.0;
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dx = atoms[i].x - atoms[j].x;
          const dy = atoms[i].y - atoms[j].y;
          const dz = atoms[i].z - atoms[j].z;
          const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (atoms[i].layer === atoms[j].layer && d < intraBond) {
            bonds.push({ a: i, b: j, type: 'covalent' });
          }
        }
      }
      // Inter-layer weak bonds (just draw a few vertical ones)
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          if (Math.abs(atoms[i].layer - atoms[j].layer) === 1) {
            const dx = atoms[i].x - atoms[j].x;
            const dz = atoms[i].z - atoms[j].z;
            const dy = atoms[i].y - atoms[j].y;
            const dHoriz = Math.sqrt(dx*dx + dz*dz);
            if (dHoriz < 0.15) {
              bonds.push({ a: i, b: j, type: 'weak' });
            }
          }
        }
      }
      return bonds;
    }

    const diamondAtoms = getDiamondAtoms();
    const diamondBonds = getDiamondBonds(diamondAtoms);
    const graphiteAtoms = getGraphiteAtoms();
    const graphiteBonds = getGraphiteBonds(graphiteAtoms);

    function drawStructure(atoms, bonds, ax, ay, cx, cy, scale, label, isGraphite) {
      // Transform all atoms
      const projected = atoms.map(a => {
        const r = rotatePoint(a, ax, ay);
        return project(r, cx, cy, scale);
      });

      // Sort bonds and atoms by depth for painter's algorithm
      // Draw bonds first (behind), then atoms
      const sortedBonds = bonds.map((b, i) => {
        const bi = isGraphite ? b.a : b[0];
        const bj = isGraphite ? b.b : b[1];
        return { ...b, i: bi, j: bj, z: (projected[bi].z + projected[bj].z) / 2 };
      }).sort((a, b) => b.z - a.z);

      const sortedAtoms = projected.map((p, i) => ({ ...p, idx: i })).sort((a, b) => b.z - a.z);

      // Draw bonds
      for (const bond of sortedBonds) {
        const p1 = projected[bond.i];
        const p2 = projected[bond.j];
        if (isGraphite && bond.type === 'weak') {
          ctxC.strokeStyle = 'rgba(255,255,255,0.15)';
          ctxC.lineWidth = 1;
          ctxC.setLineDash([3, 4]);
        } else {
          const bAlpha = 0.25 + 0.35 * ((bond.z + 2) / 4);
          ctxC.strokeStyle = isGraphite ? `rgba(255,167,38,${bAlpha})` : `rgba(79,195,247,${bAlpha})`;
          ctxC.lineWidth = isGraphite ? 2 : 1.5;
          ctxC.setLineDash([]);
        }
        ctxC.beginPath();
        ctxC.moveTo(p1.x, p1.y);
        ctxC.lineTo(p2.x, p2.y);
        ctxC.stroke();
        ctxC.setLineDash([]);
      }

      // Draw atoms
      for (const atom of sortedAtoms) {
        const r = (isGraphite ? 4 : 3) + (isGraphite ? 3 : 2) * atom.f;
        const depthFactor = (atom.z + 2) / 4;
        const alpha = 0.4 + 0.6 * depthFactor;
        const bright = Math.floor(120 + 135 * depthFactor);
        if (isGraphite) {
          ctxC.fillStyle = `rgba(${bright}, ${Math.floor(bright*0.65)}, ${Math.floor(bright*0.25)}, ${alpha})`;
        } else {
          ctxC.fillStyle = `rgba(${Math.floor(bright*0.4)}, ${Math.floor(bright*0.75)}, ${bright}, ${alpha})`;
        }
        ctxC.beginPath();
        ctxC.arc(atom.x, atom.y, r, 0, Math.PI * 2);
        ctxC.fill();

        // Highlight
        ctxC.fillStyle = `rgba(255,255,255,${0.15 * alpha})`;
        ctxC.beginPath();
        ctxC.arc(atom.x - r * 0.3, atom.y - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctxC.fill();
      }

      // Label
      ctxC.fillStyle = COLORS.text;
      ctxC.font = FONT_LG;
      ctxC.textAlign = 'center';
      ctxC.fillText(label, cx, HC - 12);
    }

    function drawCrystals() {
      clearCanvas(ctxC, WC, HC);

      // Divider
      ctxC.strokeStyle = 'rgba(255,255,255,0.08)';
      ctxC.lineWidth = 1;
      ctxC.beginPath();
      ctxC.moveTo(halfW, 20);
      ctxC.lineTo(halfW, HC - 30);
      ctxC.stroke();

      const cy = HC / 2 - 5;

      // Diamond (smaller scale for 3x3x3 lattice)
      drawStructure(diamondAtoms, diamondBonds,
        diamondAngleX, diamondAngleY,
        halfW / 2, cy, 52, 'Diamond', false);

      // Graphite
      drawStructure(graphiteAtoms, graphiteBonds,
        graphiteAngleX, graphiteAngleY,
        halfW + halfW / 2, cy, 75, 'Graphite', true);
    }

    // Mouse interaction
    cCrystal.addEventListener('mousedown', e => {
      const rect = cCrystal.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      dragging = mx < halfW ? 'diamond' : 'graphite';
      dragStart = { x: e.clientX, y: e.clientY };
      dragAngleStart = dragging === 'diamond'
        ? { x: diamondAngleX, y: diamondAngleY }
        : { x: graphiteAngleX, y: graphiteAngleY };
    });

    cCrystal.addEventListener('mousemove', e => {
      if (!dragging) return;
      const dx = (e.clientX - dragStart.x) * 0.01;
      const dy = (e.clientY - dragStart.y) * 0.01;
      if (dragging === 'diamond') {
        diamondAngleY = dragAngleStart.y + dx;
        diamondAngleX = dragAngleStart.x + dy;
      } else {
        graphiteAngleY = dragAngleStart.y + dx;
        graphiteAngleX = dragAngleStart.x + dy;
      }
      drawCrystals();
    });

    window.addEventListener('mouseup', () => { dragging = null; });

    // Touch support
    cCrystal.addEventListener('touchstart', e => {
      e.preventDefault();
      const rect = cCrystal.getBoundingClientRect();
      const t = e.touches[0];
      const mx = t.clientX - rect.left;
      dragging = mx < halfW ? 'diamond' : 'graphite';
      dragStart = { x: t.clientX, y: t.clientY };
      dragAngleStart = dragging === 'diamond'
        ? { x: diamondAngleX, y: diamondAngleY }
        : { x: graphiteAngleX, y: graphiteAngleY };
    }, { passive: false });

    cCrystal.addEventListener('touchmove', e => {
      if (!dragging) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = (t.clientX - dragStart.x) * 0.01;
      const dy = (t.clientY - dragStart.y) * 0.01;
      if (dragging === 'diamond') {
        diamondAngleY = dragAngleStart.y + dx;
        diamondAngleX = dragAngleStart.x + dy;
      } else {
        graphiteAngleY = dragAngleStart.y + dx;
        graphiteAngleX = dragAngleStart.x + dy;
      }
      drawCrystals();
    }, { passive: false });

    cCrystal.addEventListener('touchend', () => { dragging = null; });

    // Slow auto-rotation when not dragging
    let crystalAnim;
    function animateCrystals() {
      if (!dragging) {
        diamondAngleY += 0.003;
        graphiteAngleY += 0.003;
        drawCrystals();
      }
      crystalAnim = requestAnimationFrame(animateCrystals);
    }
    animateCrystals();
  }

  // ----- QCD Phase Diagram (schematic) -----
  const cQCD = document.getElementById('vis-qcd-phase');
  if (cQCD) {
    const { ctx: qctx, W: QW, H: QH } = setupCanvas(cQCD);

    // Plot area
    const qox = 62, qoy = 20, qpw = QW - 90, qph = QH - 65;

    // Axis ranges: muB 0-1700 MeV, T 0-350 MeV
    const muMax = 1700, TMax = 350;
    function qx(mu) { return qox + (mu / muMax) * qpw; }
    function qy(T)  { return qoy + qph - (T / TMax) * qph; }

    // Key physics constants
    const Tc0 = 158;  // lattice QCD pseudocritical T at mu_B=0
    const CEP = { mu: 600, T: 130 }; // conjectured critical end point
    const nuclearCP = { mu: 923, T: 17 }; // nuclear liquid-gas CP

    // Crossover: T_c(mu) = Tc0 * (1 - kappa*(mu/Tc0)^2)
    function crossoverT(mu) {
      return Tc0 * (1 - 0.013 * (mu / Tc0) * (mu / Tc0));
    }

    // 4 main phases with well-separated label positions
    const phases = [
      {
        name: 'Quark-Gluon Plasma',
        color: 'rgba(239,83,80,0.18)',
        border: '#ef5350',
        poly: [[0, 165], [0, 350], [700, 350], [700, 250], [1100, 165]],
        lx: 270, ly: 275, icon: 'quarks',
        desc: 'Quarks and gluons are deconfined \u2014 they move freely instead of being bound inside protons and neutrons. This is the state of the universe microseconds after the Big Bang, and is recreated briefly in heavy-ion collisions at RHIC and the LHC.',
        expt: 'Early universe, RHIC Au+Au, LHC Pb+Pb'
      },
      {
        name: 'Hadron Gas',
        color: 'rgba(102,187,106,0.14)',
        border: '#66bb6a',
        poly: [[0, 0], [0, 165], [1100, 165], [1100, 70], [920, 0]],
        lx: 320, ly: 80, icon: 'hadrons',
        desc: 'Individual hadrons (protons, neutrons, pions, kaons) scatter off each other like a gas. This is what the QGP cools into \u2014 quarks recombine into color-neutral bound states in a process called hadronization.',
        expt: 'Collider fireballs after hadronization, cosmic rays'
      },
      {
        name: 'Nuclear Matter',
        color: 'rgba(79,195,247,0.16)',
        border: '#4fc3f7',
        poly: [[920, 0], [1100, 70], [1100, 165], [1250, 55], [1250, 0]],
        lx: 1080, ly: 38, icon: 'nucleus',
        desc: 'Protons and neutrons bound by the strong nuclear force into atomic nuclei. Saturation density \u03c1\u2080 \u2248 0.16 fm\u207b\u00b3, binding energy \u2248 8 MeV/nucleon. There is a nuclear liquid-gas phase transition at T \u2248 17 MeV with its own critical point.',
        expt: 'All atomic nuclei, low-energy nuclear experiments'
      },
      {
        name: 'Color Superconductor',
        color: 'rgba(171,71,188,0.16)',
        border: '#ab47bc',
        poly: [[1250, 0], [1250, 55], [1100, 165], [1700, 165], [1700, 0]],
        lx: 1430, ly: 75, icon: 'cooper',
        desc: 'At extreme baryon density and low T, quarks form Cooper pairs analogous to BCS superconductivity. Color charge is screened. Sub-phases include 2SC (two-flavor) and CFL (color-flavor locked). May exist in the cores of the most massive neutron stars.',
        expt: 'Possibly in neutron star cores (M > 2 M\u2609)'
      }
    ];

    let hoveredPhase = null;
    let mouseX = -1, mouseY = -1;

    function pointInPoly(px, py, verts) {
      let inside = false;
      for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const xi = qx(verts[i][0]), yi = qy(verts[i][1]);
        const xj = qx(verts[j][0]), yj = qy(verts[j][1]);
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
          inside = !inside;
      }
      return inside;
    }

    function drawQCDPhase() {
      clearCanvas(qctx, QW, QH);

      // Axes
      drawAxes(qctx, qox, qoy, qpw, qph, {
        xLabel: 'Baryon Chemical Potential \u03bc_B  (MeV)',
        yLabel: 'Temperature  (MeV)',
        yLabelOffset: 45
      });

      // Tick marks
      qctx.strokeStyle = COLORS.axis; qctx.lineWidth = 1;
      qctx.fillStyle = COLORS.textDim; qctx.font = FONT_SM;
      qctx.textAlign = 'center';
      for (let mu = 0; mu <= muMax; mu += 200) {
        const x = qx(mu);
        qctx.beginPath(); qctx.moveTo(x, qoy + qph); qctx.lineTo(x, qoy + qph + 4); qctx.stroke();
        qctx.fillText(mu, x, qoy + qph + 15);
      }
      qctx.textAlign = 'right';
      for (let T = 0; T <= TMax; T += 50) {
        const y = qy(T);
        qctx.beginPath(); qctx.moveTo(qox - 4, y); qctx.lineTo(qox, y); qctx.stroke();
        qctx.fillText(T, qox - 7, y + 4);
      }

      // Phase region fills
      phases.forEach(function(p) {
        var hov = (p === hoveredPhase);
        var a0 = parseFloat(p.color.match(/[\d.]+\)$/)[0]);
        qctx.fillStyle = p.color.replace(/[\d.]+\)$/, (hov ? a0 + 0.18 : a0) + ')');
        qctx.beginPath();
        qctx.moveTo(qx(p.poly[0][0]), qy(p.poly[0][1]));
        for (var i = 1; i < p.poly.length; i++) qctx.lineTo(qx(p.poly[i][0]), qy(p.poly[i][1]));
        qctx.closePath(); qctx.fill();
      });

      // Crossover (dashed yellow, low mu_B)
      qctx.save();
      qctx.setLineDash([6, 5]);
      qctx.strokeStyle = '#ffee58'; qctx.lineWidth = 2.5;
      qctx.beginPath();
      for (var mu = 0; mu <= CEP.mu; mu += 4) {
        var T = crossoverT(mu);
        mu === 0 ? qctx.moveTo(qx(mu), qy(T)) : qctx.lineTo(qx(mu), qy(T));
      }
      qctx.stroke();
      qctx.setLineDash([]);
      qctx.restore();

      // Crossover label - centered around mu=200, well above the probes
      qctx.font = '10px Inter, system-ui, sans-serif';
      qctx.textAlign = 'center';
      qctx.fillStyle = '#ffee58';
      qctx.fillText('crossover', qx(200), qy(crossoverT(200)) - 10);
      qctx.fillStyle = COLORS.textDim;
      qctx.fillText('(lattice QCD)', qx(200), qy(crossoverT(200)) + 2);

      // First-order line (solid red, CEP rightward)
      qctx.strokeStyle = '#ef5350'; qctx.lineWidth = 2.5;
      qctx.beginPath();
      qctx.moveTo(qx(CEP.mu), qy(CEP.T));
      qctx.quadraticCurveTo(qx(850), qy(105), qx(1100), qy(70));
      qctx.stroke();

      // 1st-order label - below the line, around mu=870
      qctx.fillStyle = '#ef5350';
      qctx.font = '10px Inter, system-ui, sans-serif';
      qctx.textAlign = 'center';
      qctx.fillText('1st order (conjectured)', qx(870), qy(85) + 14);

      // Nuclear liquid-gas boundary
      qctx.strokeStyle = '#4fc3f7'; qctx.lineWidth = 1.8;
      qctx.beginPath();
      qctx.moveTo(qx(1250), qy(0));
      qctx.quadraticCurveTo(qx(1100), qy(8), qx(nuclearCP.mu), qy(nuclearCP.T));
      qctx.stroke();

      // Nuclear CP dot
      qctx.fillStyle = '#4fc3f7';
      qctx.beginPath(); qctx.arc(qx(nuclearCP.mu), qy(nuclearCP.T), 4, 0, 2 * Math.PI); qctx.fill();
      qctx.font = '9px Inter, system-ui, sans-serif';
      qctx.textAlign = 'right';
      qctx.fillText('nuclear CP', qx(nuclearCP.mu) - 8, qy(nuclearCP.T) - 5);

      // CEP dot
      qctx.fillStyle = '#fff';
      qctx.beginPath(); qctx.arc(qx(CEP.mu), qy(CEP.T), 5, 0, 2 * Math.PI); qctx.fill();
      qctx.strokeStyle = '#ef5350'; qctx.lineWidth = 2;
      qctx.beginPath(); qctx.arc(qx(CEP.mu), qy(CEP.T), 5, 0, 2 * Math.PI); qctx.stroke();
      qctx.fillStyle = '#fff';
      qctx.font = '10px Inter, system-ui, sans-serif';
      qctx.textAlign = 'right';
      qctx.fillText('CEP ?', qx(CEP.mu) - 10, qy(CEP.T) + 4);

      // Phase labels with cartoon icons
      phases.forEach(function(p) {
        var hov = (p === hoveredPhase);
        drawQCDIcon(qctx, p.icon, qx(p.lx), qy(p.ly) - 16, hov);
        qctx.textAlign = 'center';
        qctx.fillStyle = hov ? '#fff' : p.border;
        qctx.font = hov ? 'bold 13px Inter, system-ui, sans-serif' : '12px Inter, system-ui, sans-serif';
        qctx.fillText(p.name, qx(p.lx), qy(p.ly) + 6);
      });

      // Experimental probes - spread vertically along a diagonal, no overlapping
      var probes = [
        { mu: 15,   T: 330, label: 'Early Universe',  color: COLORS.pink,   align: 'left',   ox: 9, oy: 3 },
        { mu: 15,   T: 210, label: 'LHC Pb+Pb',       color: COLORS.yellow, align: 'left',   ox: 9, oy: 3 },
        { mu: 250,  T: 200, label: 'RHIC',             color: COLORS.yellow, align: 'left',   ox: 9, oy: 3 },
        { mu: 500,  T: 180, label: 'RHIC BES-II',      color: COLORS.orange, align: 'left',   ox: 9, oy: 3 },
        { mu: 800,  T: 135, label: 'FAIR / CBM',       color: COLORS.cyan,   align: 'left',   ox: 9, oy: 3 },
        { mu: 940,  T: 0,   label: 'Ordinary nuclei',  color: '#4fc3f7',     align: 'center', ox: 0, oy: -10 },
        { mu: 1400, T: 0,   label: 'Neutron stars',    color: COLORS.orange, align: 'center', ox: 0, oy: -10 }
      ];

      qctx.font = '10px Inter, system-ui, sans-serif';
      probes.forEach(function(pr) {
        var px = qx(pr.mu), py = qy(pr.T);
        qctx.fillStyle = pr.color;
        qctx.save(); qctx.translate(px, py); qctx.rotate(Math.PI / 4);
        qctx.fillRect(-3, -3, 6, 6);
        qctx.restore();
        qctx.fillStyle = pr.color;
        qctx.textAlign = pr.align;
        qctx.fillText(pr.label, px + pr.ox, py + pr.oy);
      });

      // Schematic watermark
      qctx.fillStyle = 'rgba(255,255,255,0.07)';
      qctx.font = 'bold 10px Inter, system-ui, sans-serif';
      qctx.textAlign = 'right';
      qctx.fillText('schematic \u2014 not to scale', qox + qpw - 2, qoy + 12);

      // Hover tooltip
      if (hoveredPhase && mouseX > 0)
        drawQCDTooltip(qctx, hoveredPhase, mouseX, mouseY, QW, QH);
    }

    function drawQCDIcon(ctx, icon, cx, cy, hov) {
      ctx.save();
      ctx.translate(cx, cy);
      if (hov) ctx.scale(1.25, 1.25);
      switch (icon) {
        case 'quarks': {
          var cols = ['#ef5350','#66bb6a','#4fc3f7'];
          for (var i = 0; i < 3; i++) {
            var a = (i / 3) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = cols[i];
            ctx.beginPath(); ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 3.5, 0, 2 * Math.PI); ctx.fill();
          }
          ctx.strokeStyle = 'rgba(255,238,88,0.3)'; ctx.lineWidth = 0.8;
          for (var k = 0; k < 3; k++) {
            var a1 = (k / 3) * Math.PI * 2 - Math.PI / 2;
            var a2 = ((k+1) / 3) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath(); ctx.moveTo(Math.cos(a1)*4, Math.sin(a1)*4);
            ctx.lineTo(Math.cos(a2)*4, Math.sin(a2)*4); ctx.stroke();
          }
          break;
        }
        case 'hadrons': {
          ctx.fillStyle = 'rgba(102,187,106,0.25)';
          ctx.beginPath(); ctx.arc(-5, 0, 7, 0, 2 * Math.PI); ctx.fill();
          var hcols = ['#ef5350','#66bb6a','#4fc3f7'];
          for (var j = 0; j < 3; j++) {
            var ha = (j / 3) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = hcols[j];
            ctx.beginPath(); ctx.arc(-5 + Math.cos(ha)*3.5, Math.sin(ha)*3.5, 2, 0, 2*Math.PI); ctx.fill();
          }
          ctx.fillStyle = 'rgba(255,167,38,0.25)';
          ctx.beginPath(); ctx.arc(8, 0, 4.5, 0, 2*Math.PI); ctx.fill();
          ctx.fillStyle = '#ef5350'; ctx.beginPath(); ctx.arc(6.5, 0, 1.8, 0, 2*Math.PI); ctx.fill();
          ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.arc(9.5, 0, 1.8, 0, 2*Math.PI); ctx.fill();
          break;
        }
        case 'nucleus': {
          ctx.fillStyle = 'rgba(79,195,247,0.2)';
          ctx.beginPath(); ctx.arc(0, 0, 9, 0, 2*Math.PI); ctx.fill();
          var npos = [[-3,-3],[3,-3],[0,3],[-4,1],[3,1],[0,-5]];
          for (var n = 0; n < npos.length; n++) {
            ctx.fillStyle = n % 2 === 0 ? '#ef5350' : '#4fc3f7';
            ctx.beginPath(); ctx.arc(npos[n][0], npos[n][1], 2.5, 0, 2*Math.PI); ctx.fill();
          }
          break;
        }
        case 'cooper': {
          var cpairs = [[-7,0],[0,0],[7,0]];
          for (var c = 0; c < cpairs.length; c++) {
            var cp = cpairs[c];
            ctx.fillStyle = '#ab47bc';
            ctx.beginPath(); ctx.arc(cp[0]-2.5, cp[1], 2.5, 0, 2*Math.PI); ctx.fill();
            ctx.beginPath(); ctx.arc(cp[0]+2.5, cp[1], 2.5, 0, 2*Math.PI); ctx.fill();
            ctx.strokeStyle = 'rgba(171,71,188,0.5)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cp[0]-2.5, cp[1]); ctx.lineTo(cp[0]+2.5, cp[1]); ctx.stroke();
          }
          break;
        }
      }
      ctx.restore();
    }

    function drawQCDTooltip(ctx, phase, mx, my, W, H) {
      var maxW = 255;
      ctx.font = '11px Inter, system-ui, sans-serif';
      var lines = [{ text: phase.name, bold: true }, { text: '' }];
      var ln = '';
      var words = phase.desc.split(' ');
      for (var w = 0; w < words.length; w++) {
        var t = ln + (ln ? ' ' : '') + words[w];
        if (ctx.measureText(t).width > maxW - 16) { lines.push({ text: ln }); ln = words[w]; }
        else ln = t;
      }
      if (ln) lines.push({ text: ln });
      lines.push({ text: '' });
      var el = '';
      var ewords = ('\u25c6 ' + phase.expt).split(' ');
      for (var e = 0; e < ewords.length; e++) {
        var et = el + (el ? ' ' : '') + ewords[e];
        if (ctx.measureText(et).width > maxW - 16) { lines.push({ text: el, color: phase.border }); el = ewords[e]; }
        else el = et;
      }
      if (el) lines.push({ text: el, color: phase.border });

      var lh = 15, pad = 8;
      var bW = maxW, bH = lines.length * lh + pad * 2;
      var tx = mx + 14, ty = my - bH / 2;
      if (tx + bW > W - 4) tx = mx - bW - 14;
      if (ty < 2) ty = 2;
      if (ty + bH > H - 2) ty = H - bH - 2;

      ctx.fillStyle = 'rgba(12,20,30,0.95)';
      ctx.strokeStyle = phase.border; ctx.lineWidth = 1.5;
      var r = 5;
      ctx.beginPath();
      ctx.moveTo(tx+r,ty); ctx.lineTo(tx+bW-r,ty);
      ctx.arcTo(tx+bW,ty,tx+bW,ty+r,r); ctx.lineTo(tx+bW,ty+bH-r);
      ctx.arcTo(tx+bW,ty+bH,tx+bW-r,ty+bH,r); ctx.lineTo(tx+r,ty+bH);
      ctx.arcTo(tx,ty+bH,tx,ty+bH-r,r); ctx.lineTo(tx,ty+r);
      ctx.arcTo(tx,ty,tx+r,ty,r);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      var yy = ty + pad + 11;
      for (var li = 0; li < lines.length; li++) {
        var l = lines[li];
        if (!l.text) { yy += 4; continue; }
        ctx.fillStyle = l.color || (l.bold ? '#fff' : 'rgba(232,236,241,0.88)');
        ctx.font = l.bold ? 'bold 12px Inter, system-ui, sans-serif' : '10.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(l.text, tx + pad, yy);
        yy += lh;
      }
    }

    cQCD.addEventListener('mousemove', function(e) {
      var rect = cQCD.getBoundingClientRect();
      mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top;
      hoveredPhase = null;
      for (var i = phases.length - 1; i >= 0; i--) {
        if (pointInPoly(mouseX, mouseY, phases[i].poly)) { hoveredPhase = phases[i]; break; }
      }
      cQCD.style.cursor = hoveredPhase ? 'pointer' : 'default';
      drawQCDPhase();
    });
    cQCD.addEventListener('mouseleave', function() {
      hoveredPhase = null; mouseX = mouseY = -1; drawQCDPhase();
    });
    drawQCDPhase();
  }

  // ----- 2D Ising Model -----
  const cIsing = document.getElementById('vis-ising');
  if (cIsing) {
  const ising = setupCanvas(cIsing);
  const ctxI = ising.ctx, WI = ising.W, HI = ising.H;

  const N_ISING = 80;
  let spins = [];
  let isingRunning = false;

  function initIsing() {
    spins = [];
    for (let i = 0; i < N_ISING; i++) {
      spins[i] = [];
      for (let j = 0; j < N_ISING; j++) {
        spins[i][j] = Math.random() < 0.5 ? 1 : -1;
      }
    }
  }

  function isingEnergy() {
    let E = 0;
    for (let i = 0; i < N_ISING; i++) {
      for (let j = 0; j < N_ISING; j++) {
        const s = spins[i][j];
        const right = spins[(i + 1) % N_ISING][j];
        const down = spins[i][(j + 1) % N_ISING];
        E -= s * right + s * down;
      }
    }
    return E;
  }

  function isingMagnetization() {
    let M = 0;
    for (let i = 0; i < N_ISING; i++) {
      for (let j = 0; j < N_ISING; j++) {
        M += spins[i][j];
      }
    }
    return M / (N_ISING * N_ISING);
  }

  function metropolisStep(T) {
    const i = Math.floor(Math.random() * N_ISING);
    const j = Math.floor(Math.random() * N_ISING);
    const s = spins[i][j];
    const neighbors =
      spins[(i + 1) % N_ISING][j] +
      spins[(i - 1 + N_ISING) % N_ISING][j] +
      spins[i][(j + 1) % N_ISING] +
      spins[i][(j - 1 + N_ISING) % N_ISING];
    const dE = 2 * s * neighbors;
    if (dE <= 0 || Math.random() < Math.exp(-dE / T)) {
      spins[i][j] = -s;
    }
  }

  function drawIsing() {
    clearCanvas(ctxI, WI, HI);

    const T = parseFloat(document.getElementById('ising-temp')?.value || 2.27);
    const margin = 5;
    const latticeSize = Math.min(WI - 160, HI - 40);
    const cellSize = latticeSize / N_ISING;
    const offsetX = margin;
    const offsetY = (HI - latticeSize) / 2;

    // Draw lattice
    for (let i = 0; i < N_ISING; i++) {
      for (let j = 0; j < N_ISING; j++) {
        ctxI.fillStyle = spins[i][j] === 1 ? COLORS.blue : '#1a2a3a';
        ctxI.fillRect(offsetX + i * cellSize, offsetY + j * cellSize, cellSize, cellSize);
      }
    }

    // Info panel on right
    const infoX = offsetX + latticeSize + 15;
    const M = isingMagnetization();
    const E = isingEnergy() / (N_ISING * N_ISING);

    ctxI.fillStyle = COLORS.text;
    ctxI.font = FONT;
    ctxI.textAlign = 'left';
    ctxI.fillText('2D Ising Model', infoX, 25);
    ctxI.fillText(N_ISING + ' x ' + N_ISING + ' lattice', infoX, 45);

    ctxI.font = FONT_SM;
    ctxI.fillText('T/J = ' + T.toFixed(2), infoX, 70);
    ctxI.fillText('T_c \u2248 2.27 J/k_B', infoX, 88);

    ctxI.fillStyle = COLORS.orange;
    ctxI.fillText('M = ' + M.toFixed(3), infoX, 115);
    ctxI.fillStyle = COLORS.green;
    ctxI.fillText('E/N = ' + E.toFixed(2), infoX, 133);

    // Tc marker
    const Tc = 2.269;
    if (Math.abs(T - Tc) < 0.15) {
      ctxI.fillStyle = COLORS.red;
      ctxI.fillText('\u2190 Near T_c!', infoX, 155);
    } else if (T < Tc) {
      ctxI.fillStyle = COLORS.blue;
      ctxI.fillText('Ordered phase', infoX, 155);
    } else {
      ctxI.fillStyle = COLORS.red;
      ctxI.fillText('Disordered phase', infoX, 155);
    }

    // Legend
    ctxI.fillStyle = COLORS.blue;
    ctxI.fillRect(infoX, 175, 12, 12);
    ctxI.fillStyle = COLORS.text;
    ctxI.font = '10px Inter, system-ui, sans-serif';
    ctxI.fillText('Spin up', infoX + 18, 185);
    ctxI.fillStyle = '#1a2a3a';
    ctxI.fillRect(infoX, 192, 12, 12);
    ctxI.strokeStyle = COLORS.axis;
    ctxI.strokeRect(infoX, 192, 12, 12);
    ctxI.fillStyle = COLORS.text;
    ctxI.fillText('Spin down', infoX + 18, 202);

    document.getElementById('ising-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(2)));
  }

  function animateIsing() {
    if (!isingRunning) return;
    const T = parseFloat(document.getElementById('ising-temp')?.value || 2.27);
    for (let i = 0; i < 1000; i++) {
      metropolisStep(T);
    }
    drawIsing();
    activeAnimations['ising'] = requestAnimationFrame(animateIsing);
  }

  // Auto-start the Ising simulation
  initIsing();
  isingRunning = true;
  animateIsing();

  document.getElementById('ising-temp')?.addEventListener('input', () => {
    if (!isingRunning) drawIsing();
  });

  document.getElementById('ising-reset')?.addEventListener('click', () => {
    initIsing();
    drawIsing();
  });
  }

  // ----- Interactive P-T Phase Diagram -----
  const cPT = document.getElementById('vis-pt-phase');
  if (cPT) {
    const ptS = setupCanvas(cPT);
    const ctxPT = ptS.ctx, WPT = ptS.W, HPT = ptS.H;
    const substances = {
      co2: { name: 'CO\u2082', Tt: 216.6, Pt: 5.11, Tc: 304.2, Pc: 72.8, slopeSign: 1, Tmax: 700, Pmax: 300 },
      ar:  { name: 'Ar',       Tt: 83.8,  Pt: 0.68, Tc: 150.7, Pc: 48.0, slopeSign: 1, Tmax: 700, Pmax: 300 },
      h2o: { name: 'H\u2082O', Tt: 273.16,Pt: 0.006,Tc: 647.1, Pc: 217.7,slopeSign:-1, Tmax: 700, Pmax: 300 },
      n2:  { name: 'N\u2082',  Tt: 63.15, Pt: 0.124,Tc: 126.2, Pc: 33.5, slopeSign: 1, Tmax: 700, Pmax: 300 },
      o2:  { name: 'O\u2082',  Tt: 54.36, Pt: 0.0015,Tc: 154.6,Pc: 49.8, slopeSign: 1, Tmax: 700, Pmax: 300 },
      nh3: { name: 'NH\u2083', Tt: 195.4, Pt: 0.060,Tc: 405.5, Pc: 111.3,slopeSign: 1, Tmax: 700, Pmax: 300 },
      ch4: { name: 'CH\u2084', Tt: 90.7,  Pt: 0.117,Tc: 190.6, Pc: 45.4, slopeSign: 1, Tmax: 700, Pmax: 300 }
    };
    let currentSub = 'co2';
    let mxPT = -1, myPT = -1;

    function drawPTPhase() {
      clearCanvas(ctxPT, WPT, HPT);
      const sub = substances[currentSub];
      const ox = 80, oy = 30, pw = WPT - 130, ph = HPT - 80;
      const txF = (T) => ox + T / sub.Tmax * pw;
      const pyF = (P) => oy + ph - P / sub.Pmax * ph;

      drawAxes(ctxPT, ox, oy, pw, ph, { xLabel: 'Temperature (K)', yLabel: 'Pressure (atm)', yLabelOffset: 55 });

      // Ticks
      ctxPT.fillStyle = COLORS.textDim; ctxPT.font = FONT_SM; ctxPT.textAlign = 'center';
      const tStep = sub.Tmax > 500 ? 100 : 50;
      for (let T = 0; T <= sub.Tmax; T += tStep) ctxPT.fillText(T.toFixed(0), txF(T), oy + ph + 14);
      ctxPT.textAlign = 'right';
      const pStep = sub.Pmax > 100 ? 50 : (sub.Pmax > 20 ? 10 : 1);
      for (let P = 0; P <= sub.Pmax; P += pStep) ctxPT.fillText(P.toFixed(pStep < 1 ? 2 : 0), ox - 5, pyF(P) + 4);

      const tpx = txF(sub.Tt), tpy = pyF(sub.Pt);
      const cpx = txF(sub.Tc), cpy = pyF(sub.Pc);

      // Solid-liquid line
      ctxPT.strokeStyle = COLORS.blue; ctxPT.lineWidth = 2.5; ctxPT.beginPath();
      ctxPT.moveTo(tpx, tpy);
      ctxPT.lineTo(txF(sub.Tt + sub.slopeSign * (sub.Pmax - sub.Pt) * 0.04), pyF(sub.Pmax));
      ctxPT.stroke();

      // Liquid-gas curve (triple to critical)
      ctxPT.strokeStyle = COLORS.green; ctxPT.lineWidth = 2.5; ctxPT.beginPath(); ctxPT.moveTo(tpx, tpy);
      for (let i = 1; i <= 100; i++) {
        const f = i / 100;
        ctxPT.lineTo(txF(sub.Tt + f * (sub.Tc - sub.Tt)), pyF(sub.Pt + (sub.Pc - sub.Pt) * Math.pow(f, 0.7)));
      }
      ctxPT.stroke();

      // Solid-gas curve (sublimation)
      ctxPT.strokeStyle = COLORS.red; ctxPT.lineWidth = 2.5; ctxPT.beginPath(); ctxPT.moveTo(tpx, tpy);
      for (let i = 1; i <= 100; i++) {
        const f = i / 100;
        ctxPT.lineTo(txF(sub.Tt * (1 - f * 0.8)), pyF(Math.max(sub.Pt * Math.exp(-3 * f), 0)));
      }
      ctxPT.stroke();

      // Region labels
      ctxPT.font = FONT_LG; ctxPT.textAlign = 'center';
      ctxPT.fillStyle = COLORS.blue; ctxPT.fillText('SOLID', txF(sub.Tt * 0.35), pyF(sub.Pmax * 0.6));
      ctxPT.fillStyle = COLORS.green; ctxPT.fillText('LIQUID', txF((sub.Tt + sub.Tc) / 2), pyF(sub.Pmax * 0.7));
      ctxPT.fillStyle = COLORS.red; ctxPT.fillText('GAS', txF(sub.Tc * 0.85), pyF(sub.Pmax * 0.15));
      ctxPT.fillStyle = COLORS.textDim; ctxPT.font = FONT_SM; ctxPT.fillText('Supercritical', cpx + 30, oy + 15);

      // Points
      ctxPT.fillStyle = '#fff';
      ctxPT.beginPath(); ctxPT.arc(tpx, tpy, 5, 0, 2 * Math.PI); ctxPT.fill();
      ctxPT.beginPath(); ctxPT.arc(cpx, cpy, 5, 0, 2 * Math.PI); ctxPT.fill();
      ctxPT.fillStyle = COLORS.text; ctxPT.font = FONT_SM; ctxPT.textAlign = 'left';
      ctxPT.fillText('Triple (' + sub.Tt.toFixed(1) + ' K, ' + sub.Pt.toFixed(2) + ' atm)', tpx + 8, tpy + 5);
      ctxPT.fillText('Critical (' + sub.Tc.toFixed(1) + ' K, ' + sub.Pc.toFixed(1) + ' atm)', cpx + 8, cpy - 8);

      // STP marker
      if (293 < sub.Tmax && 1 < sub.Pmax) {
        ctxPT.fillStyle = COLORS.yellow;
        ctxPT.beginPath(); ctxPT.arc(txF(293), pyF(1), 4, 0, 2 * Math.PI); ctxPT.fill();
        ctxPT.font = FONT_SM; ctxPT.fillText('STP', txF(293) + 7, pyF(1) + 4);
      }

      ctxPT.fillStyle = COLORS.text; ctxPT.font = FONT_LG; ctxPT.textAlign = 'left';
      ctxPT.fillText('Phase Diagram: ' + sub.name, ox + 5, oy + 15);

      // Hover
      if (mxPT >= ox && mxPT <= ox + pw && myPT >= oy && myPT <= oy + ph) {
        ctxPT.strokeStyle = 'rgba(255,255,255,0.2)'; ctxPT.lineWidth = 0.5; ctxPT.setLineDash([3, 3]);
        ctxPT.beginPath(); ctxPT.moveTo(mxPT, oy); ctxPT.lineTo(mxPT, oy + ph); ctxPT.stroke();
        ctxPT.beginPath(); ctxPT.moveTo(ox, myPT); ctxPT.lineTo(ox + pw, myPT); ctxPT.stroke();
        ctxPT.setLineDash([]);
        const hT = mxPT / pw * sub.Tmax * (pw / (pw)) ;
        const hT2 = (mxPT - ox) / pw * sub.Tmax;
        const hP = (1 - (myPT - oy) / ph) * sub.Pmax;
        ctxPT.fillStyle = 'rgba(255,255,255,0.85)'; ctxPT.font = FONT_SM; ctxPT.textAlign = 'left';
        ctxPT.fillText('T = ' + hT2.toFixed(1) + ' K,  P = ' + hP.toFixed(1) + ' atm', mxPT + 10, myPT - 8);
      }
    }

    cPT.addEventListener('mousemove', (e) => { const r = cPT.getBoundingClientRect(); mxPT = e.clientX - r.left; myPT = e.clientY - r.top; drawPTPhase(); });
    cPT.addEventListener('mouseleave', () => { mxPT = -1; myPT = -1; drawPTPhase(); });
    ['co2', 'ar', 'h2o', 'n2', 'o2', 'nh3', 'ch4'].forEach(id => {
      document.getElementById('pt-sub-' + id)?.addEventListener('click', () => {
        currentSub = id;
        document.querySelectorAll('[id^="pt-sub-"]').forEach(b => b.classList.remove('active'));
        document.getElementById('pt-sub-' + id)?.classList.add('active');
        drawPTPhase();
      });
    });
    drawPTPhase();
  }

  // ----- Interactive PV Diagram (Van der Waals) -----
  const cPV = document.getElementById('vis-pv-diagram');
  if (cPV) {
    const pvS = setupCanvas(cPV);
    const ctxPV = pvS.ctx, WPV = pvS.W, HPV = pvS.H;
    const pvSlider = document.getElementById('pv-temp');

    function vdwP(vr, Tr) {
      if (vr <= 1/3 + 0.001) return Infinity;
      return 8 * Tr / (3 * vr - 1) - 3 / (vr * vr);
    }
    function maxwellP(Tr) {
      let Plo = 0.01, Phi = Math.max(vdwP(3, Tr), 0.1);
      for (let iter = 0; iter < 50; iter++) {
        const Pm = (Plo + Phi) / 2;
        const vols = [];
        for (let vi = 0.4; vi < 6; vi += 0.005) {
          const p1 = vdwP(vi, Tr), p2 = vdwP(vi + 0.005, Tr);
          if ((p1 - Pm) * (p2 - Pm) <= 0) vols.push(vi + 0.005 * (Pm - p1) / (p2 - p1));
        }
        if (vols.length < 3) return Pm;
        let area = 0;
        const dv = (vols[2] - vols[0]) / 500;
        for (let v = vols[0]; v < vols[2]; v += dv) area += (vdwP(v, Tr) - Pm) * dv;
        if (area > 0) Plo = Pm; else Phi = Pm;
      }
      return (Plo + Phi) / 2;
    }

    function drawPV() {
      const Tr = parseFloat(pvSlider?.value || 1);
      clearCanvas(ctxPV, WPV, HPV);
      const ox = 70, oy = 30, pw = WPV - 110, ph = HPV - 80;
      const vrMin = 0.4, vrMax = 6, PrMax = 3;
      const vx = (vr) => ox + (vr - vrMin) / (vrMax - vrMin) * pw;
      const py = (Pr) => oy + ph - (Pr + 0.2) / (PrMax + 0.2) * ph;

      drawAxes(ctxPV, ox, oy, pw, ph, { xLabel: 'v / v_c', yLabel: 'P / P_c', yLabelOffset: 45 });
      ctxPV.fillStyle = COLORS.textDim; ctxPV.font = FONT_SM; ctxPV.textAlign = 'center';
      for (let v = 1; v <= 6; v++) ctxPV.fillText(v.toFixed(0), vx(v), oy + ph + 14);
      ctxPV.textAlign = 'right';
      for (let P = 0; P <= 3; P += 0.5) ctxPV.fillText(P.toFixed(1), ox - 5, py(P) + 4);

      // Background isotherms
      [0.75, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.2, 1.3].forEach(Tbg => {
        ctxPV.strokeStyle = 'rgba(255,255,255,0.08)'; ctxPV.lineWidth = 1; ctxPV.beginPath();
        let st = false;
        for (let vi = vrMin + 0.01; vi < vrMax; vi += 0.02) {
          let P = vdwP(vi, Tbg);
          if (Tbg < 1) {
            const Pf = maxwellP(Tbg);
            const vs = [];
            for (let vj = 0.4; vj < 6; vj += 0.005) { const p1 = vdwP(vj, Tbg), p2 = vdwP(vj + 0.005, Tbg); if ((p1 - Pf) * (p2 - Pf) <= 0) vs.push(vj); }
            if (vs.length >= 2 && vi >= vs[0] && vi <= vs[vs.length - 1]) P = Pf;
          }
          if (!isFinite(P) || P < -0.2 || P > PrMax) { st = false; continue; }
          if (!st) { ctxPV.moveTo(vx(vi), py(P)); st = true; } else ctxPV.lineTo(vx(vi), py(P));
        }
        ctxPV.stroke();
      });

      // Coexistence dome
      ctxPV.fillStyle = 'rgba(102,187,106,0.08)';
      const dTop = [], dBot = [];
      for (let Td = 0.7; Td < 1.0; Td += 0.005) {
        const Pf = maxwellP(Td);
        const vs = [];
        for (let vj = 0.4; vj < 6; vj += 0.005) { const p1 = vdwP(vj, Td), p2 = vdwP(vj + 0.005, Td); if ((p1 - Pf) * (p2 - Pf) <= 0) vs.push(vj); }
        if (vs.length >= 2) { dTop.push({ x: vx(vs[0]), y: py(Pf) }); dBot.push({ x: vx(vs[vs.length - 1]), y: py(Pf) }); }
      }
      dTop.push({ x: vx(1), y: py(1) });
      if (dTop.length > 1) {
        ctxPV.beginPath(); ctxPV.moveTo(dTop[0].x, dTop[0].y);
        dTop.forEach(p => ctxPV.lineTo(p.x, p.y));
        for (let i = dBot.length - 1; i >= 0; i--) ctxPV.lineTo(dBot[i].x, dBot[i].y);
        ctxPV.closePath(); ctxPV.fill();
      }

      // Highlighted isotherm
      ctxPV.strokeStyle = Tr < 0.99 ? COLORS.blue : (Tr > 1.01 ? COLORS.orange : COLORS.red);
      ctxPV.lineWidth = 3; ctxPV.beginPath();
      let hlSt = false;
      const Pf = Tr < 1 ? maxwellP(Tr) : 0;
      const hlVs = [];
      if (Tr < 1) { for (let vj = 0.4; vj < 6; vj += 0.005) { const p1 = vdwP(vj, Tr), p2 = vdwP(vj + 0.005, Tr); if ((p1 - Pf) * (p2 - Pf) <= 0) hlVs.push(vj); } }
      for (let vi = vrMin + 0.01; vi < vrMax; vi += 0.01) {
        let P = vdwP(vi, Tr);
        if (Tr < 1 && hlVs.length >= 2 && vi >= hlVs[0] && vi <= hlVs[hlVs.length - 1]) P = Pf;
        if (!isFinite(P) || P < -0.2 || P > PrMax) { hlSt = false; continue; }
        if (!hlSt) { ctxPV.moveTo(vx(vi), py(P)); hlSt = true; } else ctxPV.lineTo(vx(vi), py(P));
      }
      ctxPV.stroke();

      // Critical point
      ctxPV.fillStyle = '#fff'; ctxPV.beginPath(); ctxPV.arc(vx(1), py(1), 5, 0, 2 * Math.PI); ctxPV.fill();
      ctxPV.fillStyle = COLORS.text; ctxPV.font = FONT_SM; ctxPV.textAlign = 'left';
      ctxPV.fillText('Critical Point', vx(1) + 8, py(1) + 4);
      ctxPV.fillStyle = COLORS.green; ctxPV.fillText('Liquid + Gas', vx(2), py(0.5));

      const label = Tr < 0.99 ? 'Below T_c' : (Tr > 1.01 ? 'Above T_c (supercritical)' : 'At T_c (critical isotherm)');
      ctxPV.fillStyle = COLORS.text; ctxPV.font = FONT_LG; ctxPV.textAlign = 'left';
      ctxPV.fillText('T/T_c = ' + Tr.toFixed(2) + '  \u2014  ' + label, ox + 5, oy + 15);
      document.getElementById('pv-temp-val')?.replaceChildren(document.createTextNode(Tr.toFixed(2)));
    }
    pvSlider?.addEventListener('input', drawPV);
    drawPV();
  }

  // ----- Colligative Properties (Boiling Point Elevation) -----
  const cCol = document.getElementById('vis-colligative');
  if (cCol) {
    const col = setupCanvas(cCol);
    const ctxCL = col.ctx, WCL = col.W, HCL = col.H;
    const colFracSlider = document.getElementById('col-frac');
    const colTempSlider = document.getElementById('col-temp');

    const COL_L = 40700, COL_R = 8.314, COL_T0 = 373, COL_P0 = 1;
    function vaporP_pure(T) { return COL_P0 * Math.exp(-COL_L / COL_R * (1 / T - 1 / COL_T0)); }

    const NCOLS = 16, NROWS = 3;
    let surfaceMols = [], escapingMols = [], colTime = 0;

    const LIQX = 30, LIQW = 420, VAPOR_TOP = 15, SURFACE_Y = 220, LIQBOT = 380;
    const GAUGE_X = 505, GAUGE_W = 40, GAUGE_TOP = 50, GAUGE_BOT = 370;
    const MOL_R = 10, MOL_SPACING_X = LIQW / NCOLS, MOL_SPACING_Y = 24;

    function colInitSurface() {
      const frac = parseFloat(colFracSlider?.value || 0);
      surfaceMols = [];
      const total = NCOLS * NROWS;
      const nSolute = Math.round(total * frac);
      const indices = Array.from({ length: total }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const soluteSet = new Set(indices.slice(0, nSolute));
      for (let r = 0; r < NROWS; r++) {
        for (let c = 0; c < NCOLS; c++) {
          surfaceMols.push({ col: c, row: r, type: soluteSet.has(r * NCOLS + c) ? 'solute' : 'water', jx: 0, jy: 0 });
        }
      }
      escapingMols = [];
    }

    function drawColligative() {
      const frac = parseFloat(colFracSlider?.value || 0);
      const T = parseFloat(colTempSlider?.value || 373);
      clearCanvas(ctxCL, WCL, HCL);
      colTime += 0.016;

      const Pvap_pure = vaporP_pure(T);
      const Pvap_soln = Pvap_pure * (1 - frac);
      const dT = frac * COL_R * COL_T0 * COL_T0 / COL_L;
      const Tb_soln = COL_T0 + dT;
      const isBoiling = Pvap_soln >= 1.0;
      const jitterAmp = 0.5 + (T - 340) / 60 * 2.5;

      // Liquid region
      ctxCL.fillStyle = 'rgba(20,80,170,0.15)';
      ctxCL.fillRect(LIQX, SURFACE_Y, LIQW, LIQBOT - SURFACE_Y);

      ctxCL.fillStyle = COLORS.textDim; ctxCL.font = FONT_SM; ctxCL.textAlign = 'center';
      ctxCL.fillText('Vapor', LIQX + LIQW / 2, VAPOR_TOP + 12);
      ctxCL.fillText('Liquid', LIQX + LIQW / 2, LIQBOT - 5);

      // Surface line
      ctxCL.strokeStyle = 'rgba(255,255,255,0.15)'; ctxCL.lineWidth = 1;
      ctxCL.setLineDash([4, 4]);
      ctxCL.beginPath(); ctxCL.moveTo(LIQX, SURFACE_Y); ctxCL.lineTo(LIQX + LIQW, SURFACE_Y); ctxCL.stroke();
      ctxCL.setLineDash([]);

      // Bulk liquid molecules (dim)
      ctxCL.fillStyle = 'rgba(79,195,247,0.15)';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < NCOLS; c++) {
          const x = LIQX + MOL_SPACING_X * (c + 0.5) + (r % 2 ? MOL_SPACING_X * 0.5 : 0);
          const y = SURFACE_Y + 40 + r * MOL_SPACING_Y;
          if (y < LIQBOT - 10) { ctxCL.beginPath(); ctxCL.arc(x, y, MOL_R * 0.8, 0, Math.PI * 2); ctxCL.fill(); }
        }
      }

      // Surface molecules
      const waterAtSurface = surfaceMols.filter(m => m.type === 'water' && m.row === 0).length;
      const waterFracSurface = waterAtSurface / NCOLS;

      for (const m of surfaceMols) {
        m.jx += (Math.random() - 0.5) * jitterAmp * 0.8; m.jy += (Math.random() - 0.5) * jitterAmp * 0.8;
        m.jx *= 0.85; m.jy *= 0.85;
        const x = LIQX + MOL_SPACING_X * (m.col + 0.5) + (m.row % 2 ? MOL_SPACING_X * 0.5 : 0) + m.jx;
        const y = SURFACE_Y + 12 + m.row * MOL_SPACING_Y + m.jy;
        if (m.type === 'water') {
          ctxCL.fillStyle = COLORS.blue;
          ctxCL.beginPath(); ctxCL.arc(x, y, MOL_R, 0, Math.PI * 2); ctxCL.fill();
        } else {
          ctxCL.fillStyle = COLORS.orange;
          ctxCL.beginPath(); ctxCL.arc(x, y, MOL_R * 1.3, 0, Math.PI * 2); ctxCL.fill();
          ctxCL.strokeStyle = 'rgba(0,0,0,0.4)'; ctxCL.lineWidth = 2;
          const cr = MOL_R * 0.6;
          ctxCL.beginPath();
          ctxCL.moveTo(x - cr, y - cr); ctxCL.lineTo(x + cr, y + cr);
          ctxCL.moveTo(x + cr, y - cr); ctxCL.lineTo(x - cr, y + cr);
          ctxCL.stroke();
        }
      }

      // Evaporation
      const escapeRate = Pvap_pure * 0.06 * waterFracSurface;
      if (Math.random() < escapeRate) {
        const sw = surfaceMols.filter(m => m.type === 'water' && m.row === 0);
        if (sw.length > 0) {
          const m = sw[Math.floor(Math.random() * sw.length)];
          escapingMols.push({ x: LIQX + MOL_SPACING_X * (m.col + 0.5), y: SURFACE_Y + 8,
            vx: (Math.random() - 0.5) * 1.5, vy: -1.0 - Math.random() * 2.0, life: 1.0 });
        }
      }

      for (let i = escapingMols.length - 1; i >= 0; i--) {
        const e = escapingMols[i];
        e.x += e.vx; e.y += e.vy; e.vy *= 0.995;
        e.vx += (Math.random() - 0.5) * 0.2; e.life -= 0.006;
        if (e.life <= 0 || e.y < VAPOR_TOP - 10) { escapingMols.splice(i, 1); continue; }
        ctxCL.globalAlpha = e.life * 0.7;
        ctxCL.fillStyle = COLORS.blue;
        ctxCL.beginPath(); ctxCL.arc(e.x, e.y, MOL_R * 0.7, 0, Math.PI * 2); ctxCL.fill();
        if (e.life > 0.5) {
          ctxCL.strokeStyle = COLORS.blue; ctxCL.lineWidth = 1;
          ctxCL.beginPath(); ctxCL.moveTo(e.x, e.y + MOL_R); ctxCL.lineTo(e.x, e.y + MOL_R + 8); ctxCL.stroke();
        }
        ctxCL.globalAlpha = 1;
      }

      // Annotation
      ctxCL.font = FONT_SM; ctxCL.textAlign = 'center';
      if (frac === 0) {
        ctxCL.fillStyle = 'rgba(79,195,247,0.3)';
        ctxCL.fillText('\u2191 water molecules escape from surface \u2191', LIQX + LIQW / 2, SURFACE_Y - 8);
      } else {
        ctxCL.fillStyle = 'rgba(255,167,38,0.5)';
        ctxCL.fillText('Solute blocks ' + Math.round(frac * 100) + '% of surface \u2014 fewer escapes', LIQX + LIQW / 2, SURFACE_Y - 8);
      }

      // ---- Vapor pressure gauge ----
      ctxCL.fillStyle = 'rgba(255,255,255,0.05)';
      ctxCL.fillRect(GAUGE_X - GAUGE_W / 2, GAUGE_TOP, GAUGE_W, GAUGE_BOT - GAUGE_TOP);
      ctxCL.strokeStyle = 'rgba(255,255,255,0.3)'; ctxCL.lineWidth = 1;
      ctxCL.strokeRect(GAUGE_X - GAUGE_W / 2, GAUGE_TOP, GAUGE_W, GAUGE_BOT - GAUGE_TOP);

      ctxCL.fillStyle = COLORS.text; ctxCL.font = FONT; ctxCL.textAlign = 'center';
      ctxCL.fillText('Vapor', GAUGE_X, GAUGE_TOP - 22);
      ctxCL.fillText('Pressure', GAUGE_X, GAUGE_TOP - 8);

      const pMax = 2.0;
      const pToY = (p) => GAUGE_BOT - (p / pMax) * (GAUGE_BOT - GAUGE_TOP);

      ctxCL.fillStyle = COLORS.textDim; ctxCL.font = '10px Inter, system-ui, sans-serif'; ctxCL.textAlign = 'right';
      for (let p = 0; p <= 2; p += 0.5) {
        const y = pToY(p);
        ctxCL.fillText(p.toFixed(1), GAUGE_X - GAUGE_W / 2 - 4, y + 3);
        ctxCL.strokeStyle = 'rgba(255,255,255,0.1)';
        ctxCL.beginPath(); ctxCL.moveTo(GAUGE_X - GAUGE_W / 2, y); ctxCL.lineTo(GAUGE_X + GAUGE_W / 2, y); ctxCL.stroke();
      }

      // 1 atm line
      const atmY = pToY(1.0);
      ctxCL.strokeStyle = COLORS.yellow; ctxCL.lineWidth = 2; ctxCL.setLineDash([6, 3]);
      ctxCL.beginPath(); ctxCL.moveTo(GAUGE_X - GAUGE_W / 2 - 8, atmY); ctxCL.lineTo(GAUGE_X + GAUGE_W / 2 + 8, atmY); ctxCL.stroke();
      ctxCL.setLineDash([]);
      ctxCL.fillStyle = COLORS.yellow; ctxCL.font = FONT_SM; ctxCL.textAlign = 'left';
      ctxCL.fillText('1 atm', GAUGE_X + GAUGE_W / 2 + 10, atmY + 4);

      // Pure bar
      const pureBarY = pToY(Math.min(Pvap_pure, pMax));
      ctxCL.fillStyle = 'rgba(79,195,247,0.2)';
      ctxCL.fillRect(GAUGE_X - GAUGE_W / 2 + 2, pureBarY, GAUGE_W / 2 - 3, GAUGE_BOT - pureBarY);
      ctxCL.fillStyle = COLORS.blue; ctxCL.font = '9px Inter, system-ui, sans-serif'; ctxCL.textAlign = 'center';
      ctxCL.fillText('pure', GAUGE_X - GAUGE_W / 4 + 1, GAUGE_BOT + 12);

      // Solution bar
      const solnBarY = pToY(Math.min(Pvap_soln, pMax));
      ctxCL.fillStyle = isBoiling ? 'rgba(102,187,106,0.4)' : 'rgba(255,167,38,0.35)';
      ctxCL.fillRect(GAUGE_X + 1, solnBarY, GAUGE_W / 2 - 3, GAUGE_BOT - solnBarY);
      ctxCL.fillStyle = frac > 0 ? COLORS.orange : COLORS.blue;
      ctxCL.font = '9px Inter, system-ui, sans-serif'; ctxCL.textAlign = 'center';
      ctxCL.fillText(frac > 0 ? 'soln' : 'pure', GAUGE_X + GAUGE_W / 4 - 1, GAUGE_BOT + 12);

      // Pressure values
      ctxCL.font = '10px Inter, system-ui, sans-serif'; ctxCL.textAlign = 'center';
      ctxCL.fillStyle = COLORS.blue;
      ctxCL.fillText(Pvap_pure.toFixed(2), GAUGE_X - GAUGE_W / 4, Math.max(pureBarY - 5, GAUGE_TOP + 10));
      if (frac > 0) {
        ctxCL.fillStyle = isBoiling ? COLORS.green : COLORS.orange;
        ctxCL.fillText(Pvap_soln.toFixed(2), GAUGE_X + GAUGE_W / 4, Math.max(solnBarY - 5, GAUGE_TOP + 10));
      }

      if (isBoiling) {
        ctxCL.fillStyle = COLORS.green; ctxCL.font = FONT_LG; ctxCL.textAlign = 'center';
        ctxCL.fillText('BOILING', GAUGE_X, GAUGE_TOP - 38);
      }

      // ---- Bottom info ----
      const infoY = HCL - 8;
      ctxCL.font = FONT; ctxCL.textAlign = 'center';
      const infoCX = LIQX + LIQW / 2;
      if (frac === 0) {
        if (T >= 373) {
          ctxCL.fillStyle = COLORS.green;
          ctxCL.fillText('At ' + T.toFixed(0) + ' K, pure water boils (P_vap = 1 atm)', infoCX, infoY);
        } else {
          ctxCL.fillStyle = COLORS.textDim;
          ctxCL.fillText('Add solute with the slider, then raise temperature to see the effect', infoCX, infoY);
        }
      } else if (T >= 373 && !isBoiling) {
        ctxCL.fillStyle = COLORS.orange;
        ctxCL.fillText('Pure water would boil here \u2014 but solution needs ' + Tb_soln.toFixed(1) + ' K (Raoult\'s law: P \u00d7 ' + (1 - frac).toFixed(2) + ')', infoCX, infoY);
      } else if (isBoiling) {
        ctxCL.fillStyle = COLORS.green;
        ctxCL.fillText('Solution boils at ' + Tb_soln.toFixed(1) + ' K  (\u0394T = +' + dT.toFixed(1) + ' K above pure water)', infoCX, infoY);
      } else {
        ctxCL.fillStyle = COLORS.text;
        ctxCL.fillText('Raoult: P_soln = P_pure \u00d7 (1 \u2212 N_s/N_w) = ' + Pvap_pure.toFixed(2) + ' \u00d7 ' + (1 - frac).toFixed(3) + ' = ' + Pvap_soln.toFixed(3) + ' atm', infoCX, infoY);
      }

      document.getElementById('col-frac-val')?.replaceChildren(document.createTextNode(frac.toFixed(3)));
      document.getElementById('col-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(0)));
    }

    function colAnimate() {
      drawColligative();
      activeAnimations['colligative'] = requestAnimationFrame(colAnimate);
    }

    colFracSlider?.addEventListener('input', colInitSurface);
    colInitSurface();
    colAnimate();
  }

  // ----- Critical Divergences (three-panel) -----
  const cCPC = document.getElementById('vis-cp-critical');
  if (cCPC) {
    const cpc = setupCanvas(cCPC);
    const ctx = cpc.ctx, WCPC = cpc.W, HCPC = cpc.H;
    const zoomSlider = document.getElementById('cpc-zoom');
    const mfCheck = document.getElementById('cpc-meanfield');

    // 3D Ising critical exponents
    const ISING = { beta: 0.326, alpha: 0.11, gamma: 1.24 };
    // Mean-field (van der Waals) critical exponents
    const MF = { beta: 0.5, alpha: 0, gamma: 1.0 };

    function drawCriticalDivergences() {
      const zoomPct = parseFloat(zoomSlider?.value || 0);
      const showMF = mfCheck?.checked || false;
      clearCanvas(ctx, WCPC, HCPC);

      // Zoom: at 0% show T/Tc from 0.2 to 1.8; at 95% show very tight window
      const halfSpan = 0.8 * Math.pow(10, -zoomPct / 50);
      const tMin = 1 - halfSpan, tMax = 1 + halfSpan;
      const zoomLabel = (0.8 / halfSpan).toFixed(0);
      document.getElementById('cpc-zoom-val')?.replaceChildren(
        document.createTextNode(zoomLabel + '\u00d7'));

      // Three panels
      const gap = 16, topPad = 10, botPad = 38;
      const pw = Math.floor((WCPC - 4 * gap) / 3);
      const ph = HCPC - topPad - botPad;
      const npts = 500;

      const panels = [
        { title: 'Order parameter \u0394n',
          yLabel: '\u0394n / \u0394n\u2080',
          color: COLORS.blue, mfColor: COLORS.cyan,
          fn: function(t, beta) { return t >= 1 ? 0 : Math.pow(1 - t, beta); },
          exponentLabel: '\u03b2',
          isingVal: ISING.beta, mfVal: MF.beta,
          diverges: false },
        { title: 'Heat capacity C\u209a',
          yLabel: 'C\u209a (arb.)',
          color: COLORS.red, mfColor: COLORS.orange,
          fn: function(t, alpha) {
            var eps = Math.abs(t - 1);
            if (eps < 1e-6) return null;
            return alpha < 0.01 ? -Math.log(eps) + 2 : Math.pow(eps, -alpha);
          },
          exponentLabel: '\u03b1',
          isingVal: ISING.alpha, mfVal: MF.alpha,
          diverges: true },
        { title: 'Compressibility \u03ba\u1d1b',
          yLabel: '\u03ba\u1d1b (arb.)',
          color: COLORS.green, mfColor: COLORS.yellow,
          fn: function(t, gamma) {
            var eps = Math.abs(t - 1);
            if (eps < 1e-6) return null;
            return Math.pow(eps, -gamma);
          },
          exponentLabel: '\u03b3',
          isingVal: ISING.gamma, mfVal: MF.gamma,
          diverges: true }
      ];

      panels.forEach(function(p, pi) {
        var ox = gap + pi * (pw + gap);
        var oy = topPad;

        // Panel background
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(ox, oy, pw, ph);

        // Axes
        ctx.strokeStyle = COLORS.axis;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ph);
        ctx.moveTo(ox, oy + ph); ctx.lineTo(ox + pw, oy + ph);
        ctx.stroke();

        // Tc dashed line
        var tcFrac = (1 - tMin) / (tMax - tMin);
        if (tcFrac > 0 && tcFrac < 1) {
          var tcX = ox + tcFrac * pw;
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(tcX, oy); ctx.lineTo(tcX, oy + ph); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = COLORS.textDim;
          ctx.font = FONT_SM;
          ctx.textAlign = 'center';
          ctx.fillText('T\u2091', tcX, oy + ph + 13);
        }

        // Sample curve
        function sampleCurve(exponent) {
          var pts = [];
          for (var i = 0; i <= npts; i++) {
            var t = tMin + (tMax - tMin) * i / npts;
            var y = p.fn(t, exponent);
            if (y !== null && isFinite(y)) pts.push({ t: t, y: y });
          }
          return pts;
        }

        var isingPts = sampleCurve(p.isingVal);
        var mfPts = showMF ? sampleCurve(p.mfVal) : [];
        var yMax = 0;
        for (var k = 0; k < isingPts.length; k++) yMax = Math.max(yMax, isingPts[k].y);
        for (var k = 0; k < mfPts.length; k++) yMax = Math.max(yMax, mfPts[k].y);
        var yMin = 0;
        var yRange = yMax - yMin || 1;
        var yTop = yMax + yRange * 0.1;

        function plotCurve(pts, color, dash) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash(dash);
          ctx.beginPath();
          var started = false;
          for (var j = 0; j < pts.length; j++) {
            var px = ox + ((pts[j].t - tMin) / (tMax - tMin)) * pw;
            var py = oy + ph - ((pts[j].y - yMin) / yTop) * ph;
            if (py < oy - 2 || py > oy + ph + 2) { started = false; continue; }
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw mean-field first (behind)
        if (showMF && mfPts.length) plotCurve(mfPts, p.mfColor, [6, 4]);
        // Draw 3D Ising
        plotCurve(isingPts, p.color, []);

        // Panel title
        ctx.fillStyle = COLORS.text;
        ctx.font = FONT;
        ctx.textAlign = 'center';
        ctx.fillText(p.title, ox + pw / 2, oy + ph + 28);

        // Exponent label
        ctx.fillStyle = p.color;
        ctx.font = FONT_SM;
        ctx.textAlign = 'left';
        var expText = p.exponentLabel + ' = ' + p.isingVal.toFixed(p.isingVal < 0.2 ? 2 : 3);
        ctx.fillText(expText, ox + 6, oy + 14);
        if (showMF) {
          ctx.fillStyle = p.mfColor;
          var mfText = 'MF: ' + p.mfVal.toFixed(p.mfVal < 0.1 ? 0 : 1);
          ctx.fillText(mfText, ox + 6, oy + 28);
        }

        // Y-axis label
        ctx.fillStyle = COLORS.textDim;
        ctx.font = FONT_SM;
        ctx.save();
        ctx.translate(ox - 4, oy + ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(p.yLabel, 0, 0);
        ctx.restore();

        // Arrow indicating diverge/vanish
        if (tcFrac > 0.1 && tcFrac < 0.9) {
          var tcX2 = ox + tcFrac * pw;
          ctx.font = '15px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          if (p.diverges) {
            ctx.fillStyle = p.color;
            ctx.fillText('\u2191\u221e', tcX2 + 14, oy + 16);
          } else {
            ctx.fillStyle = p.color;
            ctx.fillText('\u2193 0', tcX2 + 14, oy + 16);
          }
        }

        // Tick marks on x-axis
        ctx.fillStyle = COLORS.textDim;
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        var span = tMax - tMin;
        // Choose nice tick spacing
        var tickStep = span > 1 ? 0.5 : span > 0.2 ? 0.1 : span > 0.02 ? 0.01 : 0.001;
        var tStart = Math.ceil(tMin / tickStep) * tickStep;
        for (var tick = tStart; tick <= tMax + tickStep * 0.01; tick += tickStep) {
          var tickFrac = (tick - tMin) / span;
          if (tickFrac < 0.02 || tickFrac > 0.98) continue;
          var tickX = ox + tickFrac * pw;
          ctx.strokeStyle = COLORS.axis;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(tickX, oy + ph); ctx.lineTo(tickX, oy + ph + 4); ctx.stroke();
          if (Math.abs(tick - 1) > tickStep * 0.5) {
            ctx.fillText(tick.toFixed(span < 0.1 ? 3 : span < 1 ? 2 : 1), tickX, oy + ph + 13);
          }
        }
      });

      // X-axis label centered
      ctx.fillStyle = COLORS.text;
      ctx.font = FONT_SM;
      ctx.textAlign = 'center';
      ctx.fillText('T / T\u2091', WCPC / 2, HCPC - 2);

      // Legend when mean-field shown
      if (showMF) {
        var lx = WCPC - 140, ly = 14;
        ctx.font = FONT_SM;
        ctx.textAlign = 'left';
        ctx.strokeStyle = COLORS.text; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 20, ly); ctx.stroke();
        ctx.fillStyle = COLORS.text;
        ctx.fillText('3D Ising', lx + 24, ly + 4);
        ctx.strokeStyle = COLORS.textDim; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(lx, ly + 16); ctx.lineTo(lx + 20, ly + 16); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = COLORS.textDim;
        ctx.fillText('Mean-field', lx + 24, ly + 20);
      }
    }

    zoomSlider?.addEventListener('input', drawCriticalDivergences);
    mfCheck?.addEventListener('change', drawCriticalDivergences);
    drawCriticalDivergences();
  }

  // ----- Law of Corresponding States -----
  const cCS = document.getElementById('vis-corresponding');
  if (cCS) {
    const cs = setupCanvas(cCS);
    const ctxCS = cs.ctx, WCS = cs.W, HCS = cs.H;

    // Coexistence data in reduced coordinates (Guggenheim fit)
    // n_l = 1 + 3/4(1-T) + 7/4(1-T)^(1/3), n_g = 1 + 3/4(1-T) - 7/4(1-T)^(1/3)
    const substances = [
      { id: 'cs-ne', name: 'Ne', color: COLORS.blue },
      { id: 'cs-ar', name: 'Ar', color: COLORS.green },
      { id: 'cs-kr', name: 'Kr', color: COLORS.red },
      { id: 'cs-xe', name: 'Xe', color: COLORS.orange },
      { id: 'cs-n2', name: 'N₂', color: COLORS.purple },
      { id: 'cs-o2', name: 'O₂', color: COLORS.cyan },
      { id: 'cs-co2', name: 'CO₂', color: COLORS.yellow },
      { id: 'cs-h2o', name: 'H₂O', color: COLORS.pink },
    ];

    // Generate scatter points near the universal curve with slight deviations per substance
    function genPoints(seed) {
      const pts = [];
      const rng = (s) => { s = Math.sin(s) * 43758.5453; return s - Math.floor(s); };
      for (let i = 0; i < 15; i++) {
        const t = 0.55 + i * 0.03;
        const dt = 1 - t;
        if (dt <= 0) continue;
        const nl = 1 + 0.75 * dt + 1.75 * Math.pow(dt, 1 / 3) + (rng(seed + i) - 0.5) * 0.06;
        const ng = 1 + 0.75 * dt - 1.75 * Math.pow(dt, 1 / 3) + (rng(seed + i + 100) - 0.5) * 0.06;
        pts.push({ t, nl, ng });
      }
      return pts;
    }

    function drawCorresponding() {
      clearCanvas(ctxCS, WCS, HCS);

      const ox = 70, oy = 20, pw = WCS - 100, ph = HCS - 60;
      drawAxes(ctxCS, ox, oy, pw, ph, { xLabel: 'n / nc', yLabel: 'T / Tc' });

      // Draw universal curve
      const npts = 100;
      ctxCS.strokeStyle = COLORS.textDim;
      ctxCS.lineWidth = 2;
      ctxCS.beginPath();
      for (let i = 0; i <= npts; i++) {
        const t = 0.5 + 0.5 * i / npts;
        const dt = 1 - t;
        if (dt < 0) continue;
        const nl = 1 + 0.75 * dt + 1.75 * Math.pow(dt, 1 / 3);
        const px = ox + ((nl - 0) / 3.5) * pw;
        const py = oy + ph - ((t - 0.45) / 0.6) * ph;
        i === 0 ? ctxCS.moveTo(px, py) : ctxCS.lineTo(px, py);
      }
      for (let i = npts; i >= 0; i--) {
        const t = 0.5 + 0.5 * i / npts;
        const dt = 1 - t;
        if (dt < 0) continue;
        const ng = 1 + 0.75 * dt - 1.75 * Math.pow(dt, 1 / 3);
        const px = ox + ((ng - 0) / 3.5) * pw;
        const py = oy + ph - ((t - 0.45) / 0.6) * ph;
        ctxCS.lineTo(px, py);
      }
      ctxCS.stroke();

      // Draw data points for selected substances
      substances.forEach((sub, idx) => {
        const cb = document.getElementById(sub.id);
        if (!cb?.checked) return;

        const pts = genPoints(idx * 17 + 7);
        ctxCS.fillStyle = sub.color;
        pts.forEach(p => {
          // Liquid point
          let px = ox + ((p.nl - 0) / 3.5) * pw;
          let py = oy + ph - ((p.t - 0.45) / 0.6) * ph;
          if (px >= ox && px <= ox + pw && py >= oy && py <= oy + ph) {
            ctxCS.beginPath(); ctxCS.arc(px, py, 4, 0, 2 * Math.PI); ctxCS.fill();
          }
          // Gas point
          px = ox + ((p.ng - 0) / 3.5) * pw;
          if (px >= ox && px <= ox + pw && py >= oy && py <= oy + ph) {
            ctxCS.beginPath(); ctxCS.arc(px, py, 4, 0, 2 * Math.PI); ctxCS.fill();
          }
        });
      });

      // Critical point
      const cpx = ox + (1 / 3.5) * pw;
      const cpy = oy + ph - ((1 - 0.45) / 0.6) * ph;
      ctxCS.fillStyle = COLORS.text;
      ctxCS.beginPath(); ctxCS.arc(cpx, cpy, 6, 0, 2 * Math.PI); ctxCS.fill();
      ctxCS.font = FONT_SM;
      ctxCS.textAlign = 'left';
      ctxCS.fillText('Critical point', cpx + 10, cpy - 5);

      // Legend
      let ly = oy + 5;
      substances.forEach(sub => {
        const cb = document.getElementById(sub.id);
        if (!cb?.checked) return;
        ctxCS.fillStyle = sub.color;
        ctxCS.beginPath(); ctxCS.arc(ox + pw - 15, ly + 5, 4, 0, 2 * Math.PI); ctxCS.fill();
        ctxCS.font = FONT_SM;
        ctxCS.textAlign = 'right';
        ctxCS.fillText(sub.name, ox + pw - 22, ly + 9);
        ly += 16;
      });

      ctxCS.fillStyle = COLORS.text;
      ctxCS.font = FONT;
      ctxCS.textAlign = 'left';
      ctxCS.fillText('Law of Corresponding States', ox + 5, oy + 16);
    }

    substances.forEach(sub => {
      document.getElementById(sub.id)?.addEventListener('change', drawCorresponding);
    });
    drawCorresponding();
  }

  // ----- Water Phase Diagram -----
  const cWP = document.getElementById('vis-water-phase');
  if (cWP) {
    const {ctx: ctxWP, W: WWP, H: HWP} = setupCanvas(cWP);
    const wpSubstance = document.getElementById('wp-substance');

    function drawWaterPhase() {
      clearCanvas(ctxWP, WWP, HWP);
      const substance = wpSubstance?.value || 'water';

      const ox = 70, oy = 30, pw = WWP - 100, ph = HWP - 80;
      drawAxes(ctxWP, ox, oy, pw, ph, {xLabel: 'Temperature (K)', yLabel: 'Pressure (atm)'});

      // Log scale for pressure, linear for temperature
      const Tmin = 200, Tmax = 700;
      const logPmin = -3, logPmax = 3; // 0.001 to 1000 atm

      function tToX(T) { return ox + (T - Tmin) / (Tmax - Tmin) * pw; }
      function logPToY(lp) { return oy + ph * (1 - (lp - logPmin) / (logPmax - logPmin)); }

      // Phase boundaries for water
      // Solid-liquid boundary
      const isWater = substance === 'water';
      ctxWP.strokeStyle = COLORS.blue; ctxWP.lineWidth = 2;
      ctxWP.beginPath();
      const Ttriple = 273.16;
      const Ptriple = Math.log10(0.006); // 0.006 atm
      if (isWater) {
        // Water: negative slope (anomalous)
        for (let i = 0; i <= 50; i++) {
          const lp = Ptriple + (i / 50) * (logPmax - Ptriple);
          const T = Ttriple - (lp - Ptriple) * 2; // negative slope
          ctxWP.lineTo(tToX(T), logPToY(lp));
        }
      } else {
        // Normal: positive slope
        for (let i = 0; i <= 50; i++) {
          const lp = Ptriple + (i / 50) * (logPmax - Ptriple);
          const T = Ttriple + (lp - Ptriple) * 5;
          ctxWP.lineTo(tToX(T), logPToY(lp));
        }
      }
      ctxWP.stroke();

      // Liquid-gas boundary (Clausius-Clapeyron)
      ctxWP.strokeStyle = COLORS.green; ctxWP.lineWidth = 2;
      ctxWP.beginPath();
      const Tc = isWater ? 647 : 304; // critical temperature
      const Pc = isWater ? Math.log10(218) : Math.log10(73);
      const L = isWater ? 2260 : 571; // latent heat (relative)
      for (let i = 0; i <= 100; i++) {
        const T = Ttriple + (i / 100) * (Tc - Ttriple);
        const lp = Ptriple + (Math.log10(218) - Ptriple) * Math.pow(i / 100, 0.8);
        const px = tToX(T), py = logPToY(lp);
        if (px >= ox && py >= oy && py <= oy + ph) {
          if (i === 0) ctxWP.moveTo(px, py); else ctxWP.lineTo(px, py);
        }
      }
      ctxWP.stroke();

      // Solid-gas boundary (sublimation)
      ctxWP.strokeStyle = COLORS.cyan; ctxWP.lineWidth = 2;
      ctxWP.beginPath();
      for (let i = 0; i <= 50; i++) {
        const T = Tmin + (i / 50) * (Ttriple - Tmin);
        const lp = logPmin + (Ptriple - logPmin) * Math.pow(i / 50, 1.5);
        ctxWP.lineTo(tToX(T), logPToY(lp));
      }
      ctxWP.stroke();

      // Critical point
      ctxWP.beginPath(); ctxWP.arc(tToX(Tc), logPToY(Pc), 5, 0, 2 * Math.PI);
      ctxWP.fillStyle = COLORS.red; ctxWP.fill();
      ctxWP.fillStyle = COLORS.red; ctxWP.font = FONT_SM; ctxWP.textAlign = 'left';
      ctxWP.fillText('Critical point', tToX(Tc) + 8, logPToY(Pc) + 4);

      // Triple point
      ctxWP.beginPath(); ctxWP.arc(tToX(Ttriple), logPToY(Ptriple), 5, 0, 2 * Math.PI);
      ctxWP.fillStyle = COLORS.yellow; ctxWP.fill();
      ctxWP.fillStyle = COLORS.yellow; ctxWP.font = FONT_SM;
      ctxWP.fillText('Triple point', tToX(Ttriple) + 8, logPToY(Ptriple) + 4);

      // Phase labels
      ctxWP.font = FONT_LG; ctxWP.textAlign = 'center';
      ctxWP.fillStyle = COLORS.cyan; ctxWP.fillText('SOLID', tToX(230), logPToY(1));
      ctxWP.fillStyle = COLORS.blue; ctxWP.fillText('LIQUID', tToX(350), logPToY(1.5));
      ctxWP.fillStyle = COLORS.green; ctxWP.fillText('GAS', tToX(500), logPToY(-1));

      // Axis ticks
      ctxWP.fillStyle = COLORS.textDim; ctxWP.font = FONT_SM; ctxWP.textAlign = 'center';
      for (const T of [200, 300, 400, 500, 600, 700]) {
        ctxWP.fillText(T, tToX(T), oy + ph + 15);
      }
      ctxWP.textAlign = 'right';
      for (const lp of [-2, -1, 0, 1, 2, 3]) {
        ctxWP.fillText(Math.pow(10, lp).toFixed(lp < 0 ? -lp : 0), ox - 5, logPToY(lp) + 4);
      }

      // Note about slope
      ctxWP.fillStyle = isWater ? COLORS.orange : COLORS.textDim;
      ctxWP.font = FONT_SM; ctxWP.textAlign = 'left';
      if (isWater) {
        ctxWP.fillText('Note: solid-liquid slope is negative (ice is less dense than water)', ox + 5, oy - 8);
      } else {
        ctxWP.fillText('CO₂: normal positive solid-liquid slope', ox + 5, oy - 8);
      }
    }

    wpSubstance?.addEventListener('change', drawWaterPhase);
    cWP.addEventListener('click', (e) => {
      // Show phase at click position
      drawWaterPhase();
      const rect = cWP.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const ox = 70, oy = 30, pw = WWP - 100, ph = HWP - 80;
      if (mx > ox && mx < ox + pw && my > oy && my < oy + ph) {
        const T = 200 + (mx - ox) / pw * 500;
        const logP = 3 - (my - oy) / ph * 6;
        ctxWP.beginPath(); ctxWP.arc(mx, my, 4, 0, 2 * Math.PI);
        ctxWP.fillStyle = COLORS.yellow; ctxWP.fill();
        ctxWP.fillStyle = COLORS.text; ctxWP.font = FONT_SM; ctxWP.textAlign = 'left';
        ctxWP.fillText('T=' + T.toFixed(0) + 'K, P=' + Math.pow(10, logP).toFixed(2) + ' atm', mx + 8, my - 5);
      }
    });
    drawWaterPhase();
  }

  // ----- Ferromagnetic Phase Transition -----
  var cFM = document.getElementById('vis-ferromagnet');
  if (cFM) {
    var fmSetup = setupCanvas(cFM);
    var ctxFM = fmSetup.ctx, WFM = fmSetup.W, HFM = fmSetup.H;
    var ferroTempSlider = document.getElementById('ferro-temp');
    var ferroFieldSlider = document.getElementById('ferro-field');
    var randomizeBtn = document.getElementById('ferro-randomize');

    var fmGridSize = 30;
    var fmSpins = [];
    var fmMHistory = [];
    var fmMHistLen = 30;

    function fmInitSpins() {
      fmSpins = [];
      for (var i = 0; i < fmGridSize; i++) {
        fmSpins[i] = [];
        for (var j = 0; j < fmGridSize; j++) {
          fmSpins[i][j] = Math.random() < 0.5 ? 1 : -1;
        }
      }
      fmMHistory = [];
    }

    function fmEquilibrate(steps) {
      var T = parseFloat(ferroTempSlider ? ferroTempSlider.value : 0.5);
      var B = parseFloat(ferroFieldSlider ? ferroFieldSlider.value : 0.0);
      var Tc_ising = 2.269;
      var beta = 1.0 / (T * Tc_ising + 0.001);
      for (var s = 0; s < steps; s++) {
        var i = Math.floor(Math.random() * fmGridSize);
        var j = Math.floor(Math.random() * fmGridSize);
        var up = fmSpins[i][(j + 1) % fmGridSize];
        var dn = fmSpins[i][(j - 1 + fmGridSize) % fmGridSize];
        var lt = fmSpins[(i - 1 + fmGridSize) % fmGridSize][j];
        var rt = fmSpins[(i + 1) % fmGridSize][j];
        var dE = 2 * fmSpins[i][j] * (up + dn + lt + rt + B);
        if (dE <= 0 || Math.random() < Math.exp(-beta * dE)) {
          fmSpins[i][j] *= -1;
        }
      }
    }

    function fmDrawMagnet(cx, cy, strength) {
      var absB = Math.abs(strength);
      var dir = strength >= 0 ? 1 : -1;

      // Horseshoe magnet: U-shape opening downward
      // Left leg = N (red), right leg = S (blue) when dir > 0
      var legW = 12, legH = 36, gap = 30, arcR = (gap + legW) / 2;
      var topY = cy - legH / 2 - arcR + 6;
      var legTop = topY + arcR;
      var legBot = legTop + legH;
      var leftX = cx - gap / 2 - legW;
      var rightX = cx + gap / 2;

      var leftCol = dir > 0 ? '#e53935' : '#1e88e5';
      var rightCol = dir > 0 ? '#1e88e5' : '#e53935';
      var leftLbl = dir > 0 ? 'N' : 'S';
      var rightLbl = dir > 0 ? 'S' : 'N';

      // Draw the horseshoe as one path: left leg, arc across top, right leg
      // Left leg
      ctxFM.fillStyle = leftCol;
      ctxFM.fillRect(leftX, legTop, legW, legH);
      // Right leg
      ctxFM.fillStyle = rightCol;
      ctxFM.fillRect(rightX, legTop, legW, legH);

      // Top arc connecting the two legs (gradient from left to right color)
      var arcCX = cx;
      var arcCY = legTop;
      var outerR = gap / 2 + legW;
      var innerR = gap / 2;

      // Draw arc in two halves for the two colors
      // Left half of arc (N color)
      ctxFM.fillStyle = leftCol;
      ctxFM.beginPath();
      ctxFM.arc(arcCX, arcCY, outerR, Math.PI, Math.PI * 1.5);
      ctxFM.arc(arcCX, arcCY, innerR, Math.PI * 1.5, Math.PI, true);
      ctxFM.closePath();
      ctxFM.fill();
      // Right half of arc (S color)
      ctxFM.fillStyle = rightCol;
      ctxFM.beginPath();
      ctxFM.arc(arcCX, arcCY, outerR, Math.PI * 1.5, Math.PI * 2);
      ctxFM.arc(arcCX, arcCY, innerR, Math.PI * 2, Math.PI * 1.5, true);
      ctxFM.closePath();
      ctxFM.fill();

      // Pole face caps at bottom of each leg
      ctxFM.fillStyle = '#ccc';
      ctxFM.fillRect(leftX - 1, legBot, legW + 2, 3);
      ctxFM.fillRect(rightX - 1, legBot, legW + 2, 3);

      // Pole labels
      ctxFM.fillStyle = '#fff'; ctxFM.font = 'bold 10px Inter, system-ui, sans-serif';
      ctxFM.textAlign = 'center'; ctxFM.textBaseline = 'middle';
      ctxFM.fillText(leftLbl, leftX + legW / 2, legTop + legH / 2);
      ctxFM.fillText(rightLbl, rightX + legW / 2, legTop + legH / 2);
      ctxFM.textBaseline = 'alphabetic';

      // Zigzag field lines between the poles (across the gap at bottom)
      if (absB > 0.05) {
        var nLines = Math.min(5, Math.max(2, Math.round(absB * 2.5)));
        var alpha = Math.min(0.9, absB / 1.5);
        ctxFM.strokeStyle = 'rgba(255,238,88,' + alpha.toFixed(2) + ')';
        ctxFM.lineWidth = 1.3;
        ctxFM.lineJoin = 'round';

        // Field lines go from N pole face to S pole face across the gap
        var nFaceX = leftX + legW / 2;
        var sFaceX = rightX + legW / 2;
        var faceY = legBot + 2;

        for (var li = 0; li < nLines; li++) {
          var yOff = 3 + li * 6;
          var startY = faceY + yOff;

          ctxFM.beginPath();
          ctxFM.moveTo(nFaceX, startY);
          // Zigzag from left (N) to right (S)
          var segs = 6;
          var totalDx = sFaceX - nFaceX;
          for (var ss = 1; ss <= segs; ss++) {
            var frac = ss / segs;
            var zigAmp = 2 + absB * 1.2;
            var zigY = ((ss % 2 === 0) ? -zigAmp : zigAmp);
            var px = nFaceX + totalDx * frac;
            var py = startY + zigY;
            ctxFM.lineTo(px, py);
          }
          ctxFM.stroke();

          // Arrow at midpoint pointing from N to S (left to right)
          var midX = nFaceX + totalDx * 0.5;
          ctxFM.beginPath();
          ctxFM.moveTo(midX - 4, startY - 3);
          ctxFM.lineTo(midX, startY);
          ctxFM.lineTo(midX - 4, startY + 3);
          ctxFM.stroke();
        }

        // Also draw curved field lines looping outside the magnet (from N up and around to S)
        var nOuterLines = Math.min(3, Math.max(1, Math.round(absB * 1.5)));
        for (var oi = 0; oi < nOuterLines; oi++) {
          var outerSpread = 12 + oi * 10;
          ctxFM.beginPath();
          // Start from N pole bottom, curve out left, over the top, down to S pole
          var nPx = nFaceX;
          var sPx = sFaceX;
          var baseY2 = faceY + 2;
          ctxFM.moveTo(nPx, baseY2);
          // Bezier going out wide, over the top, and back
          var topArcY = topY - 10 - outerSpread;
          var leftBulge = cx - outerR - 8 - outerSpread;
          var rightBulge = cx + outerR + 8 + outerSpread;

          // Use multiple curve segments for zigzag effect
          var pts = [];
          var nPts2 = 12;
          for (var pi = 0; pi <= nPts2; pi++) {
            var t = pi / nPts2;
            // Parametric path: goes left, up, over, right, down
            var angle = Math.PI + t * Math.PI; // from PI (bottom-left) to 2PI (bottom-right)
            var rx = (outerR + 8 + outerSpread) * 1.0;
            var ry = (legH / 2 + arcR + 5 + outerSpread) * 1.0;
            var ptx = cx + rx * Math.cos(angle);
            var pty = arcCY + ry * Math.sin(angle);
            pts.push({x: ptx, y: pty});
          }
          ctxFM.moveTo(pts[0].x, pts[0].y);
          for (var pi2 = 1; pi2 < pts.length; pi2++) {
            var zigAmp2 = 2 + absB;
            var zig = ((pi2 % 2 === 0) ? zigAmp2 : -zigAmp2);
            // Perturb perpendicular to path direction
            var dx = pts[pi2].x - pts[pi2 - 1].x;
            var dy = pts[pi2].y - pts[pi2 - 1].y;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            ctxFM.lineTo(pts[pi2].x + (-dy / len) * zig, pts[pi2].y + (dx / len) * zig);
          }
          ctxFM.stroke();
        }
      }
    }

    function drawFerromagnet() {
      clearCanvas(ctxFM, WFM, HFM);
      var T = parseFloat(ferroTempSlider ? ferroTempSlider.value : 0.5);
      var B = parseFloat(ferroFieldSlider ? ferroFieldSlider.value : 0.0);

      fmEquilibrate(500);

      // Spin grid on the left
      var ox = 16, oy = 12;
      var gridPx = Math.min(HFM - 30, 300);
      var cellSz = gridPx / fmGridSize;

      for (var i = 0; i < fmGridSize; i++) {
        for (var j = 0; j < fmGridSize; j++) {
          ctxFM.fillStyle = fmSpins[i][j] === 1 ? COLORS.blue : COLORS.red;
          ctxFM.fillRect(ox + i * cellSz, oy + j * cellSz, cellSz - 0.5, cellSz - 0.5);
        }
      }
      ctxFM.strokeStyle = COLORS.axis; ctxFM.lineWidth = 1;
      ctxFM.strokeRect(ox, oy, gridPx, gridPx);

      // Right panel
      var tx = ox + gridPx + 18;
      var panelW = WFM - tx - 8;

      // Magnetization
      var Mag = 0;
      for (var ii = 0; ii < fmGridSize; ii++)
        for (var jj = 0; jj < fmGridSize; jj++) Mag += fmSpins[ii][jj];
      Mag /= (fmGridSize * fmGridSize);
      fmMHistory.push(Mag);
      if (fmMHistory.length > fmMHistLen) fmMHistory.shift();
      var sumM = 0;
      for (var k = 0; k < fmMHistory.length; k++) sumM += fmMHistory[k];
      var avgM = sumM / fmMHistory.length;

      // Phase label
      var phase, phaseColor;
      if (Math.abs(B) > 0.1) {
        phase = T < 1.0 ? 'Ferromagnetic + field' : 'Field-induced order';
        phaseColor = COLORS.orange;
      } else {
        phase = T < 1.0 ? 'Ferromagnetic (ordered)' : 'Paramagnetic (disordered)';
        phaseColor = T < 1.0 ? COLORS.blue : COLORS.red;
      }
      ctxFM.fillStyle = phaseColor; ctxFM.font = FONT; ctxFM.textAlign = 'left';
      ctxFM.fillText(phase, tx, oy + 14);

      ctxFM.fillStyle = COLORS.text; ctxFM.font = FONT;
      ctxFM.fillText('T/Tc = ' + T.toFixed(2), tx, oy + 36);
      ctxFM.fillText('B = ' + B.toFixed(2), tx + 100, oy + 36);

      ctxFM.fillStyle = COLORS.green; ctxFM.font = FONT;
      ctxFM.fillText('\u27E8M\u27E9 = ' + avgM.toFixed(3), tx, oy + 58);

      // Signed magnetization bar
      var barX = tx, barY = oy + 66, barW = panelW - 6, barH = 12;
      ctxFM.fillStyle = COLORS.grid;
      ctxFM.fillRect(barX, barY, barW, barH);
      ctxFM.strokeStyle = COLORS.textDim; ctxFM.lineWidth = 1;
      ctxFM.beginPath();
      ctxFM.moveTo(barX + barW / 2, barY);
      ctxFM.lineTo(barX + barW / 2, barY + barH);
      ctxFM.stroke();
      var mFill = avgM * barW / 2;
      ctxFM.fillStyle = avgM >= 0 ? COLORS.blue : COLORS.red;
      if (mFill >= 0) ctxFM.fillRect(barX + barW / 2, barY, mFill, barH);
      else ctxFM.fillRect(barX + barW / 2 + mFill, barY, -mFill, barH);
      ctxFM.fillStyle = COLORS.textDim; ctxFM.font = FONT_SM; ctxFM.textAlign = 'center';
      ctxFM.fillText('-1', barX + 8, barY + barH + 11);
      ctxFM.fillText('0', barX + barW / 2, barY + barH + 11);
      ctxFM.fillText('+1', barX + barW - 8, barY + barH + 11);

      // Magnet cartoon
      var magnetCX = tx + panelW / 2;
      var magnetCY = oy + 140;
      fmDrawMagnet(magnetCX, magnetCY, B);

      ctxFM.textAlign = 'center'; ctxFM.font = FONT_SM;
      if (Math.abs(B) > 0.05) {
        ctxFM.fillStyle = COLORS.yellow;
        ctxFM.fillText('External field ' + (B > 0 ? '\u2191' : '\u2193'), magnetCX, magnetCY + 42);
      } else {
        ctxFM.fillStyle = COLORS.textDim;
        ctxFM.fillText('No external field', magnetCX, magnetCY + 42);
      }

      // Competition bars
      var compY = oy + 200;
      ctxFM.textAlign = 'left';
      ctxFM.fillStyle = COLORS.text; ctxFM.font = FONT_SM;
      ctxFM.fillText('Competition:', tx, compY);

      var cbX = tx, cbW = panelW - 6, cbH = 9;
      var cbY1 = compY + 6;
      var thermalStr = Math.min(1, T / 2.5);
      ctxFM.fillStyle = 'rgba(239,83,80,0.2)';
      ctxFM.fillRect(cbX, cbY1, cbW, cbH);
      ctxFM.fillStyle = COLORS.red;
      ctxFM.fillRect(cbX, cbY1, thermalStr * cbW, cbH);
      ctxFM.fillStyle = COLORS.text; ctxFM.font = FONT_SM; ctxFM.textAlign = 'right';
      ctxFM.fillText('T (disorder)', cbX + cbW, cbY1 - 1);

      var cbY2 = cbY1 + cbH + 4;
      var fieldStr = Math.min(1, Math.abs(B) / 2.0);
      ctxFM.fillStyle = 'rgba(255,238,88,0.12)';
      ctxFM.fillRect(cbX, cbY2, cbW, cbH);
      ctxFM.fillStyle = COLORS.yellow;
      ctxFM.fillRect(cbX, cbY2, fieldStr * cbW, cbH);
      ctxFM.fillStyle = COLORS.text; ctxFM.textAlign = 'right';
      ctxFM.fillText('B (order)', cbX + cbW, cbY2 - 1);

      // Legend
      ctxFM.textAlign = 'left';
      var legY = compY + 42;
      ctxFM.fillStyle = COLORS.blue; ctxFM.fillRect(tx, legY, 9, 9);
      ctxFM.fillStyle = COLORS.text; ctxFM.font = FONT_SM;
      ctxFM.fillText('Spin \u2191', tx + 13, legY + 8);
      ctxFM.fillStyle = COLORS.red; ctxFM.fillRect(tx + 65, legY, 9, 9);
      ctxFM.fillStyle = COLORS.text;
      ctxFM.fillText('Spin \u2193', tx + 78, legY + 8);

      // Hamiltonian
      ctxFM.fillStyle = COLORS.textDim; ctxFM.font = FONT_SM;
      ctxFM.fillText('H = \u2212J\u2211s\u1d62s\u2c7c \u2212 B\u2211s\u1d62', tx, legY + 26);

      // Update slider displays
      var tempValEl = document.getElementById('ferro-temp-val');
      var fieldValEl = document.getElementById('ferro-field-val');
      if (tempValEl) tempValEl.textContent = T.toFixed(2);
      if (fieldValEl) fieldValEl.textContent = B.toFixed(2);
    }

    function ferroAnimate() {
      drawFerromagnet();
      requestAnimationFrame(ferroAnimate);
    }

    if (randomizeBtn) randomizeBtn.addEventListener('click', function() { fmInitSpins(); });
    fmInitSpins();
    ferroAnimate();
  }

  // ----- Chemical Potential Phase Diagram -----
  const cChemPot = document.getElementById('vis-chem-potential');
  if (cChemPot) {
    const { ctx: ctxCP, W: WCP, H: HCP } = setupCanvas(cChemPot);
    const pressureSlider = document.getElementById('chempot-pressure');
    const btnNormal = document.getElementById('chempot-normal');
    const btnWater = document.getElementById('chempot-water');
    let cpSubstance = 'normal';

    btnNormal?.addEventListener('click', function() {
      cpSubstance = 'normal';
      btnNormal.classList.add('active');
      btnWater?.classList.remove('active');
      drawChemPotential();
    });
    btnWater?.addEventListener('click', function() {
      cpSubstance = 'water';
      btnWater.classList.add('active');
      btnNormal?.classList.remove('active');
      drawChemPotential();
    });

    function drawChemPotential() {
      clearCanvas(ctxCP, WCP, HCP);
      const P = parseFloat(pressureSlider?.value || 30) / 100;
      document.getElementById('chempot-pressure-val')?.replaceChildren(document.createTextNode(Math.round(P * 100)));

      const isWater = cpSubstance === 'water';
      const ox = 80, oy = HCP - 55, pw = WCP - 110, ph2 = HCP - 90;

      // Axes
      ctxCP.strokeStyle = COLORS.axis; ctxCP.lineWidth = 1;
      ctxCP.beginPath(); ctxCP.moveTo(ox, oy); ctxCP.lineTo(ox + pw, oy); ctxCP.stroke();
      ctxCP.beginPath(); ctxCP.moveTo(ox, oy); ctxCP.lineTo(ox, oy - ph2); ctxCP.stroke();
      // Axis labels
      ctxCP.fillStyle = COLORS.text; ctxCP.font = FONT; ctxCP.textAlign = 'center';
      ctxCP.fillText('Temperature T', ox + pw / 2, oy + 38);
      ctxCP.save(); ctxCP.translate(18, oy - ph2 / 2); ctxCP.rotate(-Math.PI / 2);
      ctxCP.fillText('Chemical potential \u03BC', 0, 0); ctxCP.restore();

      // Pressure shifts: dmu/dP = V/N = 1/n. Gas (least dense) shifts most.
      // Normal: solid densest, liquid middle, gas least dense
      // Water: liquid densest, solid middle, gas least dense
      // P ranges 0-1. At low P (gas-like), gas curve is low and dominates early.
      // At high P, solid (densest) gets the smallest upward shift so it wins at low T.
      var solShift, liqShift;
      const gasShift = P * 1.4;
      if (isWater) {
        solShift = P * 0.35;
        liqShift = P * 0.20;
      } else {
        solShift = P * 0.15;
        liqShift = P * 0.35;
      }

      // mu(t) functions, t in [0,1] maps to temperature range
      // Solid: starts flat at T=0 (3rd law), gentle negative curvature
      // Liquid: steeper slope (higher S/N)
      // Gas: steepest slope
      // Base values chosen so that at P~0.5 all three phases appear.
      function muSolid(t) { return 0.3 - 0.08 * t - 0.12 * t * t + solShift; }
      function muLiquid(t) { return 0.2 - 0.45 * t + liqShift; }
      function muGas(t) { return 0.6 - 1.3 * t + gasShift; }

      var nPts = 400;

      // Find crossings
      function findCrossing(f1, f2, tMin, tMax) {
        for (let t = tMin; t < tMax; t += 0.0005) {
          var d1 = f1(t) - f2(t), d2 = f1(t + 0.0005) - f2(t + 0.0005);
          if (d1 * d2 < 0) return t + 0.00025;
        }
        return null;
      }

      var tMelt = findCrossing(muSolid, muLiquid, 0.01, 0.99);
      var tBoil = findCrossing(muLiquid, muGas, 0.01, 0.99);
      var tSublim = findCrossing(muSolid, muGas, 0.01, 0.99);

      // Determine if there's a liquid window
      var hasLiquid = tMelt !== null && tBoil !== null && tMelt < tBoil;

      // Map mu value to canvas y
      var muMin = -0.8, muMax = 2.2;
      function muToY(mu) { return oy - (mu - muMin) / (muMax - muMin) * ph2; }
      function tToX(t) { return ox + t * pw; }

      // Phase region shading along T axis
      if (hasLiquid) {
        ctxCP.fillStyle = 'rgba(79,195,247,0.08)';
        ctxCP.fillRect(ox, oy - ph2, tToX(tMelt) - ox, ph2);
        ctxCP.fillStyle = 'rgba(102,187,106,0.08)';
        ctxCP.fillRect(tToX(tMelt), oy - ph2, tToX(tBoil) - tToX(tMelt), ph2);
        ctxCP.fillStyle = 'rgba(239,83,80,0.08)';
        ctxCP.fillRect(tToX(tBoil), oy - ph2, ox + pw - tToX(tBoil), ph2);
      } else if (tSublim !== null) {
        ctxCP.fillStyle = 'rgba(79,195,247,0.08)';
        ctxCP.fillRect(ox, oy - ph2, tToX(tSublim) - ox, ph2);
        ctxCP.fillStyle = 'rgba(239,83,80,0.08)';
        ctxCP.fillRect(tToX(tSublim), oy - ph2, ox + pw - tToX(tSublim), ph2);
      }

      // Draw thin (non-stable) phase curves as dashed
      function drawThinCurve(muFn, color) {
        ctxCP.strokeStyle = color; ctxCP.lineWidth = 1.2;
        ctxCP.globalAlpha = 0.35;
        ctxCP.setLineDash([6, 4]);
        ctxCP.beginPath();
        var started = false;
        for (let i = 0; i < nPts; i++) {
          var t = i / (nPts - 1);
          var x = tToX(t);
          var y = muToY(muFn(t));
          if (y < oy - ph2 || y > oy) { started = false; continue; }
          if (!started) { ctxCP.moveTo(x, y); started = true; } else ctxCP.lineTo(x, y);
        }
        ctxCP.stroke();
        ctxCP.globalAlpha = 1;
        ctxCP.setLineDash([]);
      }

      drawThinCurve(muSolid, COLORS.blue);
      drawThinCurve(muLiquid, COLORS.green);
      drawThinCurve(muGas, COLORS.red);

      // Draw bold stable envelope (lowest mu at each T)
      function stableMu(t) { return Math.min(muSolid(t), muLiquid(t), muGas(t)); }
      function stablePhase(t) {
        var ms = muSolid(t), ml = muLiquid(t), mg = muGas(t);
        var m = Math.min(ms, ml, mg);
        if (m === ms) return 'solid';
        if (m === ml) return 'liquid';
        return 'gas';
      }
      var phaseColor = { solid: COLORS.blue, liquid: COLORS.green, gas: COLORS.red };

      // Draw envelope in segments by phase
      var segPhase = stablePhase(0);
      var segStart = 0;
      function drawSeg(from, to, phase) {
        ctxCP.strokeStyle = phaseColor[phase]; ctxCP.lineWidth = 3.5;
        ctxCP.beginPath();
        var started = false;
        for (let i = Math.floor(from * nPts); i <= Math.ceil(to * nPts) && i < nPts; i++) {
          var t = i / (nPts - 1);
          var x = tToX(t);
          var y = muToY(stableMu(t));
          if (y < oy - ph2 || y > oy) { started = false; continue; }
          if (!started) { ctxCP.moveTo(x, y); started = true; } else ctxCP.lineTo(x, y);
        }
        ctxCP.stroke();
      }
      for (let i = 1; i < nPts; i++) {
        var t = i / (nPts - 1);
        var curPhase = stablePhase(t);
        if (curPhase !== segPhase) {
          drawSeg(segStart, t, segPhase);
          segPhase = curPhase;
          segStart = t - 1 / nPts;
        }
      }
      drawSeg(segStart, 1, segPhase);

      // Phase labels along T axis
      ctxCP.font = '12px Inter, system-ui, sans-serif'; ctxCP.textAlign = 'center';
      if (hasLiquid) {
        ctxCP.fillStyle = COLORS.blue;
        ctxCP.fillText('Solid', tToX((0 + tMelt) / 2), oy + 18);
        ctxCP.fillStyle = COLORS.green;
        ctxCP.fillText('Liquid', tToX((tMelt + tBoil) / 2), oy + 18);
        ctxCP.fillStyle = COLORS.red;
        ctxCP.fillText('Gas', tToX((tBoil + 1) / 2), oy + 18);
      } else if (tSublim !== null) {
        ctxCP.fillStyle = COLORS.blue;
        ctxCP.fillText('Solid', tToX(tSublim / 2), oy + 18);
        ctxCP.fillStyle = COLORS.red;
        ctxCP.fillText('Gas', tToX((tSublim + 1) / 2), oy + 18);
      }

      // Mark transition points with dots and vertical dashed lines
      function markTransition(tc, label) {
        if (tc === null) return;
        var x = tToX(tc);
        var y = muToY(stableMu(tc));
        // Vertical dashed line
        ctxCP.strokeStyle = COLORS.yellow; ctxCP.lineWidth = 1;
        ctxCP.setLineDash([4, 3]);
        ctxCP.beginPath(); ctxCP.moveTo(x, oy); ctxCP.lineTo(x, y - 8); ctxCP.stroke();
        ctxCP.setLineDash([]);
        // Dot
        ctxCP.fillStyle = COLORS.yellow;
        ctxCP.beginPath(); ctxCP.arc(x, y, 5, 0, 2 * Math.PI); ctxCP.fill();
        ctxCP.strokeStyle = '#000'; ctxCP.lineWidth = 1;
        ctxCP.stroke();
        // Label
        ctxCP.fillStyle = COLORS.yellow; ctxCP.font = '11px Inter, system-ui, sans-serif';
        ctxCP.textAlign = 'center';
        ctxCP.fillText(label, x, y - 12);
      }

      if (hasLiquid) {
        markTransition(tMelt, 'T_melt');
        markTransition(tBoil, 'T_boil');
      } else if (tSublim !== null) {
        markTransition(tSublim, 'T_sublim');
      }

      // Curve labels at right edge
      function labelCurveRight(muFn, color, label) {
        var tR = 0.95;
        var y = muToY(muFn(tR));
        if (y > oy - ph2 + 10 && y < oy - 10) {
          ctxCP.fillStyle = color; ctxCP.font = '11px Inter, system-ui, sans-serif';
          ctxCP.textAlign = 'left';
          ctxCP.fillText(label, tToX(tR) + 6, y + 4);
        }
      }
      labelCurveRight(muSolid, COLORS.blue, '\u03BC_solid');
      labelCurveRight(muLiquid, COLORS.green, '\u03BC_liquid');
      labelCurveRight(muGas, COLORS.red, '\u03BC_gas');

      // Title and slope annotation
      ctxCP.fillStyle = COLORS.text; ctxCP.font = FONT_LG; ctxCP.textAlign = 'left';
      ctxCP.fillText(isWater ? '\u03BC\u2013T Phase Diagram (H\u2082O \u2014 anomalous)' : '\u03BC\u2013T Phase Diagram (normal substance)', ox, 18);
      ctxCP.fillStyle = COLORS.textDim; ctxCP.font = FONT_SM;
      ctxCP.fillText('slope = \u2212S/N   \u2192   steeper for higher-entropy phases', ox, 33);

      // Pressure annotation
      ctxCP.fillStyle = COLORS.textDim; ctxCP.font = FONT_SM; ctxCP.textAlign = 'right';
      if (isWater) {
        ctxCP.fillText('Higher P: gas shifts most; solid > liquid (ice less dense)', ox + pw, 18);
      } else {
        ctxCP.fillText('Higher P: gas shifts most, solid least (densest)', ox + pw, 18);
      }
    }

    pressureSlider?.addEventListener('input', drawChemPotential);
    drawChemPotential();
  }

  // ----- T-v Diagram with Isobars -----
  const cTV = document.getElementById('vis-tv-diagram');
  if (cTV) {
    const { ctx: ctxTV, W: WTV, H: HTV } = setupCanvas(cTV);
    const tvPressureSlider = document.getElementById('tv-pressure');

    // Guggenheim coexistence dome (empirical fit, reduced units)
    function domeVL(That) {
      var tau = 1 - That;
      if (tau <= 0) return 1;
      return 1 / (1 + 0.75 * tau + 1.75 * Math.pow(tau, 1/3));
    }
    function domeVG(That) {
      var tau = 1 - That;
      if (tau <= 0) return 1;
      var nG = 1 + 0.75 * tau - 1.75 * Math.pow(tau, 1/3);
      return nG > 0.01 ? 1 / nG : 100;
    }
    // Coexistence temperature for given P_hat via Clausius-Clapeyron
    function coexTemp(Phat) {
      if (Phat >= 1) return 1;
      if (Phat <= 0) return 0;
      return 1 / (1 - Math.log(Phat) / 5.4);
    }
    // Van der Waals isobar: T_hat(v_hat) at constant P_hat
    function isobarT(Phat, vhat) {
      if (3 * vhat - 1 <= 0) return 0;
      return (Phat + 3 / (vhat * vhat)) * (3 * vhat - 1) / 8;
    }

    function drawTVDiagram() {
      clearCanvas(ctxTV, WTV, HTV);
      var Phat = parseFloat(tvPressureSlider?.value || 0.6);
      document.getElementById('tv-pressure-val')?.replaceChildren(document.createTextNode(Phat.toFixed(2)));

      var ox = 80, oy = HTV - 55, pw = WTV - 110, ph = HTV - 90;
      var vMin = 0.25, vMax = 8;
      function vToX(v) { return ox + (Math.log(v / vMin) / Math.log(vMax / vMin)) * pw; }
      var TMin = 0.5, TMax = 1.3;
      function TToY(T) { return oy - ((T - TMin) / (TMax - TMin)) * ph; }

      // Axes
      ctxTV.strokeStyle = COLORS.axis; ctxTV.lineWidth = 1;
      ctxTV.beginPath(); ctxTV.moveTo(ox, oy); ctxTV.lineTo(ox + pw, oy); ctxTV.stroke();
      ctxTV.beginPath(); ctxTV.moveTo(ox, oy); ctxTV.lineTo(ox, oy - ph); ctxTV.stroke();
      ctxTV.fillStyle = COLORS.text; ctxTV.font = FONT; ctxTV.textAlign = 'center';
      ctxTV.fillText('v / vc  (log scale)', ox + pw / 2, oy + 38);
      ctxTV.save(); ctxTV.translate(18, oy - ph / 2); ctxTV.rotate(-Math.PI / 2);
      ctxTV.fillText('T / Tc', 0, 0); ctxTV.restore();

      // v-axis ticks
      ctxTV.fillStyle = COLORS.textDim; ctxTV.font = FONT_SM; ctxTV.textAlign = 'center';
      [0.25, 0.5, 1, 2, 4, 8].forEach(function(v) {
        var x = vToX(v);
        ctxTV.beginPath(); ctxTV.moveTo(x, oy); ctxTV.lineTo(x, oy + 5); ctxTV.stroke();
        ctxTV.fillText(v <= 1 ? v.toFixed(2) : v.toFixed(0), x, oy + 18);
      });
      // T-axis ticks
      ctxTV.textAlign = 'right';
      [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2].forEach(function(T) {
        var y = TToY(T);
        ctxTV.beginPath(); ctxTV.moveTo(ox - 5, y); ctxTV.lineTo(ox, y); ctxTV.stroke();
        ctxTV.fillText(T.toFixed(1), ox - 8, y + 4);
      });

      // Fill coexistence dome
      var nD = 200;
      ctxTV.fillStyle = 'rgba(255, 167, 38, 0.10)';
      ctxTV.beginPath();
      for (var i = 0; i <= nD; i++) {
        var That = 0.5 + (i / nD) * 0.5;
        var vL = domeVL(That);
        if (i === 0) ctxTV.moveTo(vToX(vL), TToY(That));
        else ctxTV.lineTo(vToX(vL), TToY(That));
      }
      for (var i = nD; i >= 0; i--) {
        var That = 0.5 + (i / nD) * 0.5;
        var vG = Math.min(domeVG(That), vMax);
        ctxTV.lineTo(vToX(vG), TToY(That));
      }
      ctxTV.closePath(); ctxTV.fill();

      // Saturated liquid curve (blue)
      ctxTV.strokeStyle = COLORS.blue; ctxTV.lineWidth = 2.5;
      ctxTV.beginPath();
      for (var i = 0; i <= nD; i++) {
        var That = 0.5 + (i / nD) * 0.5;
        if (i === 0) ctxTV.moveTo(vToX(domeVL(That)), TToY(That));
        else ctxTV.lineTo(vToX(domeVL(That)), TToY(That));
      }
      ctxTV.stroke();

      // Saturated vapor curve (red)
      ctxTV.strokeStyle = COLORS.red; ctxTV.lineWidth = 2.5;
      ctxTV.beginPath();
      for (var i = 0; i <= nD; i++) {
        var That = 0.5 + (i / nD) * 0.5;
        var vG = Math.min(domeVG(That), vMax);
        if (i === 0) ctxTV.moveTo(vToX(vG), TToY(That));
        else ctxTV.lineTo(vToX(vG), TToY(That));
      }
      ctxTV.stroke();

      // Region labels
      ctxTV.font = FONT_SM; ctxTV.textAlign = 'center';
      ctxTV.fillStyle = COLORS.blue;
      ctxTV.fillText('Compressed', vToX(0.3), TToY(0.78));
      ctxTV.fillText('Liquid', vToX(0.3), TToY(0.74));
      ctxTV.fillStyle = COLORS.red;
      ctxTV.fillText('Superheated', vToX(5.5), TToY(0.78));
      ctxTV.fillText('Vapor', vToX(5.5), TToY(0.74));
      ctxTV.fillStyle = COLORS.orange;
      ctxTV.fillText('Liquid + Vapor', vToX(1), TToY(0.62));
      ctxTV.fillStyle = COLORS.textDim;
      ctxTV.fillText('Supercritical Fluid', vToX(1), TToY(1.2));

      // Faint background isobars
      [0.2, 0.4, 0.6, 0.8, 1.0, 1.5].forEach(function(Pbg) {
        if (Math.abs(Pbg - Phat) < 0.05) return;
        ctxTV.strokeStyle = 'rgba(150,150,150,0.2)'; ctxTV.lineWidth = 1;
        ctxTV.beginPath();
        var started = false;
        if (Pbg < 1) {
          var Tc = coexTemp(Pbg);
          var vL = domeVL(Tc), vG = Math.min(domeVG(Tc), vMax);
          for (var j = 0; j <= 60; j++) {
            var v = vMin + (vL - vMin) * (j / 60);
            var T = isobarT(Pbg, v);
            if (T < TMin || T > TMax) continue;
            if (!started) { ctxTV.moveTo(vToX(v), TToY(T)); started = true; }
            else ctxTV.lineTo(vToX(v), TToY(T));
          }
          ctxTV.lineTo(vToX(vG), TToY(Tc));
          for (var j = 0; j <= 100; j++) {
            var v = vG + (vMax - vG) * (j / 100);
            var T = isobarT(Pbg, v);
            if (T < TMin || T > TMax) continue;
            ctxTV.lineTo(vToX(v), TToY(T));
          }
        } else {
          for (var j = 0; j <= 200; j++) {
            var v = vMin + (vMax - vMin) * (j / 200);
            var T = isobarT(Pbg, v);
            if (T < TMin || T > TMax) continue;
            if (!started) { ctxTV.moveTo(vToX(v), TToY(T)); started = true; }
            else ctxTV.lineTo(vToX(v), TToY(T));
          }
        }
        ctxTV.stroke();
      });

      // Highlighted isobar
      ctxTV.lineWidth = 3;
      if (Phat < 1) {
        var Tcoex = coexTemp(Phat);
        var vL = domeVL(Tcoex), vG = Math.min(domeVG(Tcoex), vMax);

        // Liquid branch
        ctxTV.strokeStyle = COLORS.blue;
        ctxTV.beginPath();
        var started = false;
        for (var j = 0; j <= 80; j++) {
          var v = vMin + (vL - vMin) * (j / 80);
          var T = isobarT(Phat, v);
          if (T < TMin || T > TMax) continue;
          if (!started) { ctxTV.moveTo(vToX(v), TToY(T)); started = true; }
          else ctxTV.lineTo(vToX(v), TToY(T));
        }
        ctxTV.stroke();

        // Horizontal tie line (dashed)
        ctxTV.strokeStyle = COLORS.yellow; ctxTV.lineWidth = 2.5;
        ctxTV.setLineDash([6, 4]);
        ctxTV.beginPath();
        ctxTV.moveTo(vToX(vL), TToY(Tcoex));
        ctxTV.lineTo(vToX(vG), TToY(Tcoex));
        ctxTV.stroke();
        ctxTV.setLineDash([]);

        // Gas branch
        ctxTV.strokeStyle = COLORS.red; ctxTV.lineWidth = 3;
        ctxTV.beginPath();
        started = false;
        for (var j = 0; j <= 120; j++) {
          var v = vG + (vMax - vG) * (j / 120);
          var T = isobarT(Phat, v);
          if (T < TMin || T > TMax) continue;
          if (!started) { ctxTV.moveTo(vToX(v), TToY(T)); started = true; }
          else ctxTV.lineTo(vToX(v), TToY(T));
        }
        ctxTV.stroke();

        // Dots at dome intersections
        ctxTV.fillStyle = COLORS.blue;
        ctxTV.beginPath(); ctxTV.arc(vToX(vL), TToY(Tcoex), 5, 0, 2 * Math.PI); ctxTV.fill();
        ctxTV.fillStyle = COLORS.red;
        ctxTV.beginPath(); ctxTV.arc(vToX(vG), TToY(Tcoex), 5, 0, 2 * Math.PI); ctxTV.fill();

        // Coexistence temperature label
        ctxTV.fillStyle = COLORS.yellow; ctxTV.font = FONT_SM; ctxTV.textAlign = 'right';
        ctxTV.fillText('T = ' + Tcoex.toFixed(2) + ' Tc', ox - 12, TToY(Tcoex) + 4);

        // Pressure label
        ctxTV.fillStyle = COLORS.text; ctxTV.font = FONT_SM; ctxTV.textAlign = 'left';
        var labelV = vG + (vMax - vG) * 0.3;
        var labelT = isobarT(Phat, labelV);
        if (labelT >= TMin && labelT <= TMax) {
          ctxTV.fillText('P = ' + Phat.toFixed(2) + ' Pc', vToX(labelV) + 5, TToY(labelT) - 8);
        }
      } else {
        // Supercritical: smooth curve
        ctxTV.strokeStyle = Phat < 1.05 ? COLORS.yellow : COLORS.green;
        ctxTV.beginPath();
        var started = false;
        for (var j = 0; j <= 300; j++) {
          var v = vMin + (vMax - vMin) * (j / 300);
          var T = isobarT(Phat, v);
          if (T < TMin || T > TMax) continue;
          if (!started) { ctxTV.moveTo(vToX(v), TToY(T)); started = true; }
          else ctxTV.lineTo(vToX(v), TToY(T));
        }
        ctxTV.stroke();

        ctxTV.fillStyle = COLORS.text; ctxTV.font = FONT_SM; ctxTV.textAlign = 'left';
        var lv = 3, lt = isobarT(Phat, lv);
        if (lt >= TMin && lt <= TMax) {
          ctxTV.fillText('P = ' + Phat.toFixed(2) + ' Pc (supercritical)', vToX(lv) + 5, TToY(lt) - 8);
        }
      }

      // Critical point
      ctxTV.fillStyle = COLORS.yellow;
      ctxTV.beginPath(); ctxTV.arc(vToX(1), TToY(1), 7, 0, 2 * Math.PI); ctxTV.fill();
      ctxTV.strokeStyle = '#000'; ctxTV.lineWidth = 1.5;
      ctxTV.beginPath(); ctxTV.arc(vToX(1), TToY(1), 7, 0, 2 * Math.PI); ctxTV.stroke();
      ctxTV.fillStyle = COLORS.text; ctxTV.font = FONT; ctxTV.textAlign = 'left';
      ctxTV.fillText('Critical Point', vToX(1) + 12, TToY(1) + 5);
    }

    tvPressureSlider?.addEventListener('input', drawTVDiagram);
    drawTVDiagram();
  }
}


// =============================================================================
// CH10: Quantum Statistics
// =============================================================================
function initCh10Vis() {
  const c = document.getElementById('vis-quantum');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const tempSlider = document.getElementById('qs-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 1);
    const beta = 1 / T;
    const mu = 0;
    clearCanvas(ctx, W, H);

    const ox = 70, xAxis = H - 50;
    const eRange = W - ox - 40;
    const eMax = 5;

    drawAxes(ctx, ox, 20, eRange, xAxis - 20, { xLabel: 'Energy \u03B5' });

    const distributions = [
      { name: 'Bose-Einstein', fn: (e) => 1 / (Math.exp(beta * (e - mu + 0.5)) - 1), color: COLORS.red },
      { name: 'Fermi-Dirac', fn: (e) => 1 / (Math.exp(beta * (e - mu)) + 1), color: COLORS.blue },
      { name: 'Maxwell-Boltzmann', fn: (e) => Math.exp(-beta * e), color: COLORS.green }
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

      ctx.fillStyle = d.color;
      ctx.font = FONT_SM;
      ctx.textAlign = 'left';
      ctx.fillText(d.name, W - 180, 30 + idx * 18);
    });

    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_LG;
    ctx.textAlign = 'left';
    ctx.fillText('kT = ' + T.toFixed(2), 80, 30);

    // n=1 guideline
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.setLineDash([3, 3]);
    const n1y = xAxis - (1 / 5) * (xAxis - 30);
    ctx.beginPath(); ctx.moveTo(ox, n1y); ctx.lineTo(W - 20, n1y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('\u27E8n\u27E9 = 1', ox + 5, n1y - 5);

    document.getElementById('qs-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(2)));
  }

  tempSlider?.addEventListener('input', draw);
  draw();

  // ----- Bose-Einstein Distribution -----
  const cBE = document.getElementById('vis-be-dist');
  if (cBE) {
    const beS = setupCanvas(cBE);
    const ctxBE = beS.ctx, WBE = beS.W, HBE = beS.H;
    const beSlider = document.getElementById('be-dist-temp');

    function drawBE() {
      const kT = parseFloat(beSlider?.value || 1);
      clearCanvas(ctxBE, WBE, HBE);
      const ox = 70, oy = 25, pw = WBE - 110, ph = HBE - 70;
      const eMax = 5, nMax = 5, mu = -0.5;
      drawAxes(ctxBE, ox, oy, pw, ph, { xLabel: 'Energy \u03B5', yLabel: '\u27E8n\u27E9', yLabelOffset: 40 });
      ctxBE.fillStyle = COLORS.textDim; ctxBE.font = FONT_SM; ctxBE.textAlign = 'center';
      for (let e = 0; e <= eMax; e++) ctxBE.fillText(e.toFixed(0), ox + e / eMax * pw, oy + ph + 14);
      ctxBE.textAlign = 'right';
      for (let n = 0; n <= nMax; n++) ctxBE.fillText(n.toFixed(0), ox - 5, oy + ph - n / nMax * ph + 4);

      const temps = [kT * 0.5, kT, kT * 2];
      const cols = [COLORS.blue, COLORS.red, COLORS.orange];
      const labs = ['kT/2', 'kT', '2kT'];
      temps.forEach((T, idx) => {
        const beta = 1 / T;
        ctxBE.strokeStyle = cols[idx]; ctxBE.lineWidth = idx === 1 ? 3 : 2; ctxBE.beginPath();
        let st = false;
        for (let px = 0; px < pw; px++) {
          const e = px / pw * eMax;
          if (e <= mu + 0.01) continue;
          let n = 1 / (Math.exp(beta * (e - mu)) - 1);
          if (!isFinite(n) || n < 0) continue;
          if (n > nMax) n = nMax;
          const pyv = oy + ph - (n / nMax) * ph;
          if (!st) { ctxBE.moveTo(ox + px, pyv); st = true; } else ctxBE.lineTo(ox + px, pyv);
        }
        ctxBE.stroke();
      });

      temps.forEach((T, idx) => {
        ctxBE.fillStyle = cols[idx]; ctxBE.font = FONT_SM; ctxBE.textAlign = 'left';
        ctxBE.fillText(labs[idx] + ' = ' + T.toFixed(2), WBE - 130, 35 + idx * 16);
      });
      ctxBE.fillStyle = COLORS.text; ctxBE.font = FONT_LG; ctxBE.textAlign = 'left';
      ctxBE.fillText('Bose-Einstein Distribution', ox + 5, oy + 12);
      document.getElementById('be-dist-temp-val')?.replaceChildren(document.createTextNode(kT.toFixed(2)));
    }
    beSlider?.addEventListener('input', drawBE);
    drawBE();
  }

  // ----- Fermi-Dirac Distribution -----
  const cFD = document.getElementById('vis-fd-dist');
  if (cFD) {
    const fdS = setupCanvas(cFD);
    const ctxFD = fdS.ctx, WFD = fdS.W, HFD = fdS.H;
    const fdSlider = document.getElementById('fd-dist-temp');

    function drawFD() {
      const kTr = parseFloat(fdSlider?.value || 0.1);
      clearCanvas(ctxFD, WFD, HFD);
      const ox = 70, oy = 25, pw = WFD - 110, ph = HFD - 70;
      const eMax = 3, muFD = 1;
      drawAxes(ctxFD, ox, oy, pw, ph, { xLabel: 'Energy \u03B5/\u03B5_F', yLabel: '\u27E8n\u27E9', yLabelOffset: 40 });
      ctxFD.fillStyle = COLORS.textDim; ctxFD.font = FONT_SM; ctxFD.textAlign = 'center';
      for (let e = 0; e <= eMax; e += 0.5) ctxFD.fillText(e.toFixed(1), ox + e / eMax * pw, oy + ph + 14);
      ctxFD.textAlign = 'right';
      for (let n = 0; n <= 1; n += 0.2) ctxFD.fillText(n.toFixed(1), ox - 5, oy + ph - n * ph + 4);

      // Fermi energy line
      const efX = ox + muFD / eMax * pw;
      ctxFD.strokeStyle = 'rgba(255,255,255,0.15)'; ctxFD.setLineDash([3, 3]); ctxFD.lineWidth = 0.5;
      ctxFD.beginPath(); ctxFD.moveTo(efX, oy); ctxFD.lineTo(efX, oy + ph); ctxFD.stroke(); ctxFD.setLineDash([]);
      ctxFD.fillStyle = COLORS.textDim; ctxFD.textAlign = 'center'; ctxFD.fillText('\u03B5_F', efX, oy + ph + 14);

      const ratios = [0, kTr * 0.5, kTr, kTr * 2];
      const cols = [COLORS.textDim, COLORS.blue, COLORS.red, COLORS.orange];
      const labs = ['T = 0', 'kT/2\u03B5_F', 'kT/\u03B5_F', '2kT/\u03B5_F'];
      ratios.forEach((T, idx) => {
        ctxFD.strokeStyle = cols[idx]; ctxFD.lineWidth = idx === 2 ? 3 : (idx === 0 ? 1.5 : 2);
        if (idx === 0) ctxFD.setLineDash([6, 4]);
        ctxFD.beginPath();
        for (let px = 0; px < pw; px++) {
          const e = px / pw * eMax;
          const n = T < 0.001 ? (e <= muFD ? 1 : 0) : 1 / (Math.exp((e - muFD) / T) + 1);
          const pyv = oy + ph - n * ph;
          px === 0 ? ctxFD.moveTo(ox + px, pyv) : ctxFD.lineTo(ox + px, pyv);
        }
        ctxFD.stroke(); ctxFD.setLineDash([]);
      });

      ratios.forEach((T, idx) => {
        ctxFD.fillStyle = cols[idx]; ctxFD.font = FONT_SM; ctxFD.textAlign = 'left';
        ctxFD.fillText(idx === 0 ? 'T = 0' : labs[idx] + ' = ' + T.toFixed(2), WFD - 150, 35 + idx * 16);
      });
      ctxFD.fillStyle = COLORS.text; ctxFD.font = FONT_LG; ctxFD.textAlign = 'left';
      ctxFD.fillText('Fermi-Dirac Distribution', ox + 5, oy + 12);
      document.getElementById('fd-dist-temp-val')?.replaceChildren(document.createTextNode(kTr.toFixed(2)));
    }
    fdSlider?.addEventListener('input', drawFD);
    drawFD();
  }
}


// =============================================================================
// CH11: Blackbody Radiation + Debye Model
// =============================================================================
function initCh11Vis() {
  const c = document.getElementById('vis-blackbody');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const tempSlider = document.getElementById('bb-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 5000);
    clearCanvas(ctx, W, H);

    const ox = 60, xAxis = H - 50;
    const fRange = W - ox - 40;

    drawAxes(ctx, ox, 20, fRange, xAxis - 20, { xLabel: 'Frequency \u03BD (arb. units)' });

    const temps = [T * 0.5, T * 0.75, T, T * 1.5];
    const colors = [COLORS.blue, COLORS.green, COLORS.orange, COLORS.red];

    const nuMax = 15;
    let globalMax = 0;

    temps.forEach(Tk => {
      for (let px = 1; px < fRange; px++) {
        const nu = px / fRange * nuMax;
        const x = nu / (Tk / 3000);
        if (x > 0.01) {
          const u = nu * nu * nu / (Math.exp(x) - 1);
          if (isFinite(u) && u > globalMax) globalMax = u;
        }
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
      ctx.font = FONT_SM;
      ctx.textAlign = 'left';
      ctx.fillText('T = ' + Tk.toFixed(0) + ' K', W - 130, 30 + idx * 16);
    });

    ctx.fillStyle = COLORS.text;
    ctx.font = FONT;
    ctx.textAlign = 'left';
    ctx.fillText('Planck: u(\u03BD) \u221D \u03BD\u00B3/(e^{h\u03BD/kT} - 1)', 80, 30);

    const peakWavelength = 2898000 / T;
    ctx.font = FONT_SM;
    ctx.fillText('Wien peak \u03BB \u2248 ' + peakWavelength.toFixed(0) + ' nm', 80, 48);

    document.getElementById('bb-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(0)));
  }

  tempSlider?.addEventListener('input', draw);
  draw();

  // ----- Debye Model Heat Capacity -----
  const cDebye = document.getElementById('vis-debye');
  if (cDebye) {
  const dby = setupCanvas(cDebye);
  const ctxD = dby.ctx, WD = dby.W, HD = dby.H;
  const debyeSlider = document.getElementById('debye-td');

  function debyeFunction(x) {
    // C_V / 3NkB = 9*(T/theta_D)^3 * integral_0^{theta_D/T} [z^4 * e^z / (e^z - 1)^2] dz
    // x = theta_D / T
    if (x < 0.01) return 1; // Dulong-Petit limit
    if (x > 100) return 0;
    const nSteps = 500;
    const dz = x / nSteps;
    let integral = 0;
    for (let i = 1; i <= nSteps; i++) {
      const z = i * dz;
      const ez = Math.exp(z);
      if (ez > 1e15) break;
      const val = z * z * z * z * ez / ((ez - 1) * (ez - 1));
      integral += val * dz;
    }
    return 9 * integral / (x * x * x);
  }

  function drawDebye() {
    const thetaD = parseFloat(debyeSlider?.value || 400);
    clearCanvas(ctxD, WD, HD);

    const ox = 65, xAxis = HD - 50;
    const plotW = WD - ox - 30;
    const plotH = xAxis - 25;

    drawAxes(ctxD, ox, 15, plotW, xAxis - 15, { xLabel: 'T / \u03B8_D', yLabel: 'C_V / 3Nk_B' });

    const tRatioMax = 2.5;
    const nPts = 300;

    // Dulong-Petit line
    const dpY = xAxis - plotH;
    ctxD.strokeStyle = 'rgba(255,255,255,0.12)';
    ctxD.setLineDash([4, 4]);
    ctxD.lineWidth = 1;
    ctxD.beginPath(); ctxD.moveTo(ox, dpY); ctxD.lineTo(ox + plotW, dpY); ctxD.stroke();
    ctxD.setLineDash([]);
    ctxD.fillStyle = COLORS.textDim;
    ctxD.font = '10px Inter, system-ui, sans-serif';
    ctxD.textAlign = 'left';
    ctxD.fillText('Dulong-Petit (= 1)', ox + plotW - 110, dpY - 5);

    // Debye curve
    ctxD.strokeStyle = COLORS.blue;
    ctxD.lineWidth = 2.5;
    ctxD.beginPath();
    for (let i = 1; i < nPts; i++) {
      const tRatio = tRatioMax * i / nPts;
      const x = 1 / tRatio; // theta_D / T
      const cv = debyeFunction(x);
      const px = ox + tRatio / tRatioMax * plotW;
      const py = xAxis - cv * plotH;
      i === 1 ? ctxD.moveTo(px, py) : ctxD.lineTo(px, py);
    }
    ctxD.stroke();

    // T^3 low-T approximation: C_V / 3NkB ~ (4*pi^4/5) * (T/theta_D)^3
    const t3Coeff = 4 * Math.pow(Math.PI, 4) / 5;
    ctxD.strokeStyle = COLORS.orange;
    ctxD.lineWidth = 1.5;
    ctxD.setLineDash([6, 4]);
    ctxD.beginPath();
    let t3Started = false;
    for (let i = 1; i < nPts; i++) {
      const tRatio = tRatioMax * i / nPts;
      const cv = t3Coeff * Math.pow(tRatio, 3);
      if (cv > 1.2) break;
      const px = ox + tRatio / tRatioMax * plotW;
      const py = xAxis - cv * plotH;
      if (!t3Started) { ctxD.moveTo(px, py); t3Started = true; }
      else ctxD.lineTo(px, py);
    }
    ctxD.stroke();
    ctxD.setLineDash([]);

    // X-axis ticks
    ctxD.fillStyle = COLORS.textDim;
    ctxD.font = '10px Inter, system-ui, sans-serif';
    ctxD.textAlign = 'center';
    for (let t = 0; t <= tRatioMax; t += 0.5) {
      const px = ox + t / tRatioMax * plotW;
      ctxD.fillText(t.toFixed(1), px, xAxis + 12);
    }

    // Y-axis ticks
    ctxD.textAlign = 'right';
    for (let y = 0; y <= 1; y += 0.2) {
      const py = xAxis - y * plotH;
      ctxD.fillText(y.toFixed(1), ox - 5, py + 4);
    }

    // Labels
    ctxD.fillStyle = COLORS.text;
    ctxD.font = FONT;
    ctxD.textAlign = 'left';
    ctxD.fillText('Debye model,  \u03B8_D = ' + thetaD.toFixed(0) + ' K', ox + 5, 28);
    ctxD.fillStyle = COLORS.blue;
    ctxD.fillText('Debye C_V', WD - 140, 28);
    ctxD.fillStyle = COLORS.orange;
    ctxD.fillText('T\u00B3 law', WD - 140, 44);

    document.getElementById('debye-td-val')?.replaceChildren(document.createTextNode(thetaD.toFixed(0)));
  }

  debyeSlider?.addEventListener('input', drawDebye);
  drawDebye();
  }

  // ----- UV Catastrophe -----
  const cUV = document.getElementById('vis-uv-catastrophe');
  if (cUV) {
    const uvS = setupCanvas(cUV);
    const ctxUV = uvS.ctx, WUV = uvS.W, HUV = uvS.H;
    const uvTempSlider = document.getElementById('uv-temp');

    function drawUV() {
      const T = parseFloat(uvTempSlider?.value || 5000);
      clearCanvas(ctxUV, WUV, HUV);

      const ox = 65, oy = 30;
      const pw = WUV - ox - 40, ph = HUV - oy - 55;
      const xAxis = oy + ph;

      drawAxes(ctxUV, ox, oy, pw, ph, {
        xLabel: 'Frequency \u03BD (arb. units,  h\u03BD/kT)',
        yLabel: 'Spectral energy density',
        yLabelOffset: 42
      });

      // Dimensionless variable x = h*nu/kT; range 0..xMax
      const xMax = 15;
      const nPts = 600;

      // Planck peak for normalisation
      let planckMax = 0;
      for (let i = 1; i <= nPts; i++) {
        const x = xMax * i / nPts;
        const val = x * x * x / (Math.exp(x) - 1);
        if (val > planckMax) planckMax = val;
      }

      // Match RJ to Planck at x=1 (Rayleigh-Jeans limit): Planck ~ x^2 for small x
      const planckAt1 = 1 / (Math.exp(1) - 1);
      const rjNorm = planckAt1;  // RJ ~ rjNorm * x^2

      // UV catastrophe shading
      const uvStartX = 6;
      const uvStartPx = ox + (uvStartX / xMax) * pw;
      ctxUV.fillStyle = 'rgba(239,83,80,0.08)';
      ctxUV.fillRect(uvStartPx, oy, ox + pw - uvStartPx, ph);
      ctxUV.strokeStyle = 'rgba(239,83,80,0.35)';
      ctxUV.lineWidth = 1;
      ctxUV.setLineDash([4, 4]);
      ctxUV.beginPath();
      ctxUV.moveTo(uvStartPx, oy);
      ctxUV.lineTo(uvStartPx, xAxis);
      ctxUV.stroke();
      ctxUV.setLineDash([]);

      // Rayleigh-Jeans (classical) – dashed red, clamp & show upward arrow
      ctxUV.strokeStyle = COLORS.red;
      ctxUV.lineWidth = 2.5;
      ctxUV.setLineDash([8, 5]);
      ctxUV.beginPath();
      let rjStarted = false;
      let rjArrowPx = -1;
      for (let i = 1; i <= nPts; i++) {
        const x = xMax * i / nPts;
        const rjVal = rjNorm * x * x;
        const normVal = rjVal / planckMax;
        const screenY = xAxis - normVal * ph * 0.82;
        const canvX = ox + (x / xMax) * pw;
        if (screenY < oy + 4) {
          rjArrowPx = canvX;
          if (rjStarted) ctxUV.lineTo(canvX, oy + 4);
          break;
        }
        if (!rjStarted) { ctxUV.moveTo(canvX, screenY); rjStarted = true; }
        else ctxUV.lineTo(canvX, screenY);
      }
      ctxUV.stroke();
      ctxUV.setLineDash([]);
      if (rjArrowPx > 0) {
        ctxUV.strokeStyle = COLORS.red;
        ctxUV.lineWidth = 2;
        drawArrow(ctxUV, rjArrowPx, oy + 22, rjArrowPx, oy + 2, 7);
      }

      // Planck curve – solid blue
      ctxUV.strokeStyle = COLORS.blue;
      ctxUV.lineWidth = 2.5;
      ctxUV.beginPath();
      for (let i = 1; i <= nPts; i++) {
        const x = xMax * i / nPts;
        const planckVal = x * x * x / (Math.exp(x) - 1);
        const normVal = planckVal / planckMax;
        const screenY = xAxis - normVal * ph * 0.82;
        const canvX = ox + (x / xMax) * pw;
        i === 1 ? ctxUV.moveTo(canvX, screenY) : ctxUV.lineTo(canvX, screenY);
      }
      ctxUV.stroke();

      // Wien peak marker
      const xPeak = 2.821;
      const peakPx = ox + (xPeak / xMax) * pw;
      ctxUV.strokeStyle = COLORS.cyan;
      ctxUV.lineWidth = 1;
      ctxUV.setLineDash([3, 4]);
      ctxUV.beginPath();
      ctxUV.moveTo(peakPx, xAxis);
      ctxUV.lineTo(peakPx, xAxis - ph * 0.82);
      ctxUV.stroke();
      ctxUV.setLineDash([]);
      ctxUV.fillStyle = COLORS.cyan;
      ctxUV.font = FONT_SM;
      ctxUV.textAlign = 'center';
      ctxUV.fillText('Wien\u2019s peak', peakPx, xAxis - ph * 0.82 - 6);

      // Legend
      ctxUV.font = FONT_SM;
      ctxUV.textAlign = 'left';
      ctxUV.strokeStyle = COLORS.blue; ctxUV.lineWidth = 2.5; ctxUV.setLineDash([]);
      ctxUV.beginPath(); ctxUV.moveTo(WUV - 198, 38); ctxUV.lineTo(WUV - 173, 38); ctxUV.stroke();
      ctxUV.fillStyle = COLORS.blue;
      ctxUV.fillText('Planck (quantum)', WUV - 169, 42);
      ctxUV.strokeStyle = COLORS.red; ctxUV.lineWidth = 2.5; ctxUV.setLineDash([8, 5]);
      ctxUV.beginPath(); ctxUV.moveTo(WUV - 198, 58); ctxUV.lineTo(WUV - 173, 58); ctxUV.stroke();
      ctxUV.setLineDash([]);
      ctxUV.fillStyle = COLORS.red;
      ctxUV.fillText('Rayleigh-Jeans (classical)', WUV - 169, 62);

      // UV catastrophe annotation
      ctxUV.fillStyle = 'rgba(239,83,80,0.80)';
      ctxUV.font = FONT_SM;
      ctxUV.textAlign = 'center';
      ctxUV.fillText('\u2018UV catastrophe\u2019', ox + pw - 56, oy + 18);
      ctxUV.fillStyle = COLORS.textDim;
      ctxUV.fillText('classical \u2192 \u221E', ox + pw - 56, oy + 32);

      // Temperature label
      ctxUV.fillStyle = COLORS.text;
      ctxUV.font = FONT_LG;
      ctxUV.textAlign = 'left';
      ctxUV.fillText('T = ' + T.toFixed(0) + ' K', ox + 5, oy + 14);

      // X-axis tick labels
      ctxUV.fillStyle = COLORS.textDim;
      ctxUV.font = '10px Inter, system-ui, sans-serif';
      ctxUV.textAlign = 'center';
      for (let xt = 0; xt <= xMax; xt += 3) {
        const canvX = ox + (xt / xMax) * pw;
        ctxUV.fillText(xt.toString(), canvX, xAxis + 13);
      }

      document.getElementById('uv-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(0)));
    }

    uvTempSlider?.addEventListener('input', drawUV);
    drawUV();
  }

  // ----- Phonon Modes in 1D Chain -----
  const cPC = document.getElementById('vis-phonon-chain');
  if (cPC) {
    const pc = setupCanvas(cPC);
    const ctxPC = pc.ctx, WPC = pc.W, HPC = pc.H;
    const modeSlider = document.getElementById('phonon-mode');
    const ampSlider = document.getElementById('phonon-amp');
    let phononTime = 0, phononRunning = false;

    const nAtoms = 20;

    function drawPhononChain() {
      clearCanvas(ctxPC, WPC, HPC);

      const mode = parseInt(modeSlider?.value || 1);
      const amp = parseFloat(ampSlider?.value || 0.5);
      const spacing = (WPC - 60) / (nAtoms + 1);
      const cy = HPC / 2;

      // Draw equilibrium positions (faint)
      ctxPC.strokeStyle = COLORS.grid;
      ctxPC.lineWidth = 1;
      for (let i = 0; i <= nAtoms + 1; i++) {
        const x = 30 + i * spacing;
        ctxPC.beginPath();
        ctxPC.moveTo(x, cy - 40);
        ctxPC.lineTo(x, cy + 40);
        ctxPC.stroke();
      }

      // Compute displacements
      const positions = [];
      for (let i = 0; i <= nAtoms + 1; i++) {
        const eqX = 30 + i * spacing;
        // Standing wave: displacement ∝ cos(nπi/(N+1)) * cos(ωt)
        const disp = amp * 30 * Math.cos(Math.PI * mode * i / (nAtoms + 1)) * Math.cos(phononTime * 0.05 * mode);
        positions.push({ x: eqX, y: cy + disp, eq: eqX });
      }

      // Draw springs
      ctxPC.strokeStyle = COLORS.textDim;
      ctxPC.lineWidth = 1.5;
      for (let i = 0; i < positions.length - 1; i++) {
        const p1 = positions[i], p2 = positions[i + 1];
        // Draw zigzag spring
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / len, ny = dy / len;
        const px = -ny, py = nx;
        const nCoils = 6;
        ctxPC.beginPath();
        ctxPC.moveTo(p1.x, p1.y);
        for (let j = 1; j <= nCoils; j++) {
          const t = j / (nCoils + 1);
          const side = (j % 2 === 0) ? 1 : -1;
          const sx = p1.x + dx * t + px * side * 6;
          const sy = p1.y + dy * t + py * side * 6;
          ctxPC.lineTo(sx, sy);
        }
        ctxPC.lineTo(p2.x, p2.y);
        ctxPC.stroke();
      }

      // Draw atoms
      for (let i = 0; i <= nAtoms + 1; i++) {
        const p = positions[i];
        const isWall = (i === 0 || i === nAtoms + 1);
        ctxPC.fillStyle = isWall ? COLORS.textDim : COLORS.blue;
        ctxPC.beginPath();
        ctxPC.arc(p.x, p.y, isWall ? 8 : 10, 0, 2 * Math.PI);
        ctxPC.fill();
      }

      // Labels
      ctxPC.fillStyle = COLORS.text;
      ctxPC.font = FONT;
      ctxPC.textAlign = 'left';
      ctxPC.fillText('Mode n = ' + mode + ', ω = c_s πn/L', 10, 18);
      ctxPC.fillStyle = COLORS.textDim;
      ctxPC.font = FONT_SM;
      ctxPC.fillText('k = πn/L, λ = 2L/n', 10, 34);

      document.getElementById('phonon-mode-val')?.replaceChildren(document.createTextNode(mode));
      document.getElementById('phonon-amp-val')?.replaceChildren(document.createTextNode(amp.toFixed(2)));
    }

    function animatePhonon() {
      if (!phononRunning) return;
      phononTime++;
      drawPhononChain();
      activeAnimations['phonon'] = requestAnimationFrame(animatePhonon);
    }

    document.getElementById('phonon-start')?.addEventListener('click', () => {
      phononRunning = !phononRunning;
      const btn = document.getElementById('phonon-start');
      if (btn) btn.textContent = phononRunning ? 'Pause' : 'Animate';
      if (phononRunning) animatePhonon();
    });

    modeSlider?.addEventListener('input', drawPhononChain);
    ampSlider?.addEventListener('input', drawPhononChain);
    drawPhononChain();
  }
}


// =============================================================================
// CH12: Bose-Einstein Condensation
// =============================================================================
function initCh12Vis() {
  const c = document.getElementById('vis-bec');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const tempSlider = document.getElementById('bec-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 1);
    clearCanvas(ctx, W, H);

    const Tc = 1.0;
    const N = 200;

    // Left: energy levels
    const levelsX = 100, levelsW = 200;
    const nLevels = 15;

    for (let i = 0; i < nLevels; i++) {
      const y = H - 50 - i * 22;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(levelsX, y); ctx.lineTo(levelsX + levelsW, y); ctx.stroke();

      let occ;
      if (T < Tc) {
        occ = i === 0 ? N * (1 - Math.pow(T / Tc, 1.5)) : N * Math.pow(T / Tc, 1.5) / nLevels;
      } else {
        occ = N * Math.exp(-i * 0.3 / T);
        occ = occ / (1 + occ / 2);
      }

      const nDots = Math.min(Math.round(occ / 5), 30);
      ctx.fillStyle = i === 0 ? COLORS.red : COLORS.blue;
      for (let d = 0; d < nDots; d++) {
        const dx = levelsX + 10 + d * 6;
        if (dx < levelsX + levelsW - 10) {
          ctx.beginPath(); ctx.arc(dx, y - 3, 2.5, 0, 2 * Math.PI); ctx.fill();
        }
      }
    }

    // Right: condensate fraction plot
    const gx = 370, gy = 50, gw = 200, gh = 250;
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();

    ctx.fillStyle = COLORS.text; ctx.font = FONT_SM; ctx.textAlign = 'center';
    ctx.fillText('T / Tc', gx + gw / 2, gy + gh + 20);
    ctx.save(); ctx.translate(gx - 20, gy + gh / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('N\u2080/N', 0, 0); ctx.restore();

    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px < gw; px++) {
      const tRatio = px / gw * 2;
      const frac = tRatio < 1 ? 1 - Math.pow(tRatio, 1.5) : 0;
      const py = gy + gh - frac * gh;
      px === 0 ? ctx.moveTo(gx + px, py) : ctx.lineTo(gx + px, py);
    }
    ctx.stroke();

    // Current marker
    const markerX = gx + (T / Tc) / 2 * gw;
    const markerFrac = T < Tc ? 1 - Math.pow(T / Tc, 1.5) : 0;
    const markerY = gy + gh - markerFrac * gh;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(markerX, markerY, 5, 0, 2 * Math.PI); ctx.fill();

    // Tc line
    const tcX = gx + gw / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tcX, gy); ctx.lineTo(tcX, gy + gh); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Tc', tcX, gy + gh + 10);

    // Info
    ctx.fillStyle = COLORS.text; ctx.font = FONT_LG; ctx.textAlign = 'left';
    ctx.fillText('T/Tc = ' + (T / Tc).toFixed(2), 20, 25);
    ctx.fillText(T < Tc ? 'BEC phase: ground state macroscopically occupied' : 'Normal phase', 20, 45);

    ctx.fillStyle = COLORS.red;
    ctx.fillText('N\u2080/N = ' + (markerFrac * 100).toFixed(1) + '%', 20, 65);

    document.getElementById('bec-temp-val')?.replaceChildren(document.createTextNode((T / Tc).toFixed(2)));
  }

  tempSlider?.addEventListener('input', draw);
  draw();

  // ----- Two-State BEC: BE vs MB -----
  const c2s = document.getElementById('vis-bec-twostate');
  if (c2s) {
    const tsS = setupCanvas(c2s);
    const ctx2s = tsS.ctx, W2s = tsS.W, H2s = tsS.H;
    const nSlider2s = document.getElementById('bec2-N');

    function draw2state() {
      const N = parseInt(nSlider2s?.value || 100);
      clearCanvas(ctx2s, W2s, H2s);
      const ox = 70, oy = 30, pw = W2s - 120, ph = H2s - 80;
      const xMax = N * 4;
      drawAxes(ctx2s, ox, oy, pw, ph, { xLabel: 'k_BT / \u03B5', yLabel: 'N_ground / N', yLabelOffset: 45 });

      ctx2s.fillStyle = COLORS.textDim; ctx2s.font = FONT_SM; ctx2s.textAlign = 'right';
      for (let y = 0; y <= 1; y += 0.2) ctx2s.fillText(y.toFixed(1), ox - 5, oy + ph - y * ph + 4);
      ctx2s.textAlign = 'center';
      const xStep = xMax > 200 ? Math.round(xMax / 5 / 100) * 100 : Math.round(xMax / 5);
      for (let x = 0; x <= xMax; x += (xStep || 1)) ctx2s.fillText(x.toFixed(0), ox + x / xMax * pw, oy + ph + 14);

      // MB curve
      ctx2s.strokeStyle = COLORS.green; ctx2s.lineWidth = 2; ctx2s.beginPath();
      for (let px = 1; px < pw; px++) {
        const kT = (px / pw) * xMax;
        if (kT < 0.01) continue;
        const frac = 1 / (Math.exp(-1 / kT) + 1);
        const pyv = oy + ph - frac * ph;
        px < 3 ? ctx2s.moveTo(ox + px, pyv) : ctx2s.lineTo(ox + px, pyv);
      }
      ctx2s.stroke();

      // BE curve
      ctx2s.strokeStyle = COLORS.red; ctx2s.lineWidth = 2.5; ctx2s.beginPath();
      let beSt = false;
      for (let px = 1; px < pw; px++) {
        const kT = (px / pw) * xMax;
        if (kT < 0.01) continue;
        const betaEps = 1 / kT;
        const t1 = 1 / (Math.exp(-betaEps) - 1);
        const expNp1 = Math.exp(-(N + 1) * betaEps);
        const t2 = (N + 1) / (1 - expNp1);
        let nG = t1 + t2;
        if (!isFinite(nG) || nG < 0) nG = N;
        if (nG > N) nG = N;
        const pyv = oy + ph - (nG / N) * ph;
        if (!beSt) { ctx2s.moveTo(ox + px, pyv); beSt = true; } else ctx2s.lineTo(ox + px, pyv);
      }
      ctx2s.stroke();

      ctx2s.font = FONT_SM; ctx2s.textAlign = 'left';
      ctx2s.fillStyle = COLORS.red; ctx2s.fillText('Bose-Einstein', W2s - 150, 40);
      ctx2s.fillStyle = COLORS.green; ctx2s.fillText('Maxwell-Boltzmann', W2s - 150, 56);
      ctx2s.fillStyle = COLORS.text; ctx2s.font = FONT_LG; ctx2s.textAlign = 'left';
      ctx2s.fillText('Two-state system, N = ' + N, ox + 5, oy + 12);
      document.getElementById('bec2-N-val')?.replaceChildren(document.createTextNode(N.toString()));
    }
    nSlider2s?.addEventListener('input', draw2state);
    draw2state();
  }

  // ----- Condensate Fraction Plot -----
  const cFrac = document.getElementById('vis-bec-fraction');
  if (cFrac) {
    const frS = setupCanvas(cFrac);
    const ctxFr = frS.ctx, WFr = frS.W, HFr = frS.H;

    function drawFraction() {
      clearCanvas(ctxFr, WFr, HFr);
      const ox = 70, oy = 30, pw = WFr - 120, ph = HFr - 80;
      const tMax = 2;
      drawAxes(ctxFr, ox, oy, pw, ph, { xLabel: 'T / T_c', yLabel: 'N\u2080 / N', yLabelOffset: 40 });

      ctxFr.fillStyle = COLORS.textDim; ctxFr.font = FONT_SM; ctxFr.textAlign = 'center';
      for (let t = 0; t <= tMax; t += 0.5) ctxFr.fillText(t.toFixed(1), ox + t / tMax * pw, oy + ph + 14);
      ctxFr.textAlign = 'right';
      for (let y = 0; y <= 1; y += 0.2) ctxFr.fillText(y.toFixed(1), ox - 5, oy + ph - y * ph + 4);

      // Tc line
      const tcX = ox + 1 / tMax * pw;
      ctxFr.strokeStyle = 'rgba(255,255,255,0.15)'; ctxFr.setLineDash([4, 4]); ctxFr.lineWidth = 1;
      ctxFr.beginPath(); ctxFr.moveTo(tcX, oy); ctxFr.lineTo(tcX, oy + ph); ctxFr.stroke(); ctxFr.setLineDash([]);
      ctxFr.fillStyle = COLORS.textDim; ctxFr.textAlign = 'center'; ctxFr.fillText('T_c', tcX, oy + ph + 14);

      // Analytic curve
      ctxFr.strokeStyle = COLORS.red; ctxFr.lineWidth = 3; ctxFr.beginPath();
      for (let px = 0; px < pw; px++) {
        const tR = px / pw * tMax;
        const frac = tR < 1 ? 1 - Math.pow(tR, 1.5) : 0;
        const pyv = oy + ph - frac * ph;
        px === 0 ? ctxFr.moveTo(ox + px, pyv) : ctxFr.lineTo(ox + px, pyv);
      }
      ctxFr.stroke();

      // Finite-N curves
      const nVals = [{ N: 100, color: COLORS.blue, dash: [6, 4] }, { N: 1000, color: COLORS.green, dash: [4, 3] }, { N: 10000, color: COLORS.orange, dash: [2, 2] }];
      nVals.forEach(nv => {
        ctxFr.strokeStyle = nv.color; ctxFr.lineWidth = 2; ctxFr.setLineDash(nv.dash); ctxFr.beginPath();
        const sigma = 0.3 * Math.pow(nv.N, -1/3);
        for (let px = 0; px < pw; px++) {
          const tR = px / pw * tMax;
          let frac;
          if (tR < 1 - 3 * sigma) frac = 1 - Math.pow(tR, 1.5);
          else if (tR > 1 + 3 * sigma) frac = 0;
          else { const a = Math.max(0, 1 - Math.pow(tR, 1.5)); frac = a * 0.5 * (1 - Math.tanh((tR - 1) / sigma)); }
          const pyv = oy + ph - frac * ph;
          px === 0 ? ctxFr.moveTo(ox + px, pyv) : ctxFr.lineTo(ox + px, pyv);
        }
        ctxFr.stroke(); ctxFr.setLineDash([]);
      });

      // Legend
      ctxFr.font = FONT_SM; ctxFr.textAlign = 'left';
      ctxFr.fillStyle = COLORS.red; ctxFr.fillText('1 - (T/T_c)^{3/2} (analytic)', WFr - 200, 40);
      nVals.forEach((nv, idx) => { ctxFr.fillStyle = nv.color; ctxFr.fillText('N = ' + nv.N, WFr - 200, 56 + idx * 16); });
      ctxFr.fillStyle = COLORS.text; ctxFr.font = FONT_LG; ctxFr.textAlign = 'left';
      ctxFr.fillText('Condensate Fraction vs Temperature', ox + 5, oy + 12);
    }
    drawFraction();
  }

  // ----- BEC Ground State Occupation for Different N -----
  const cNg = document.getElementById('vis-bec-nground');
  if (cNg) {
    const ngS = setupCanvas(cNg);
    const ctxNg = ngS.ctx, WNg = ngS.W, HNg = ngS.H;

    function drawNGround() {
      clearCanvas(ctxNg, WNg, HNg);
      const ox = 70, oy = 30, pw = WNg - 110, ph = HNg - 80;
      const tMax = 1.5;

      drawAxes(ctxNg, ox, oy, pw, ph, { xLabel: 'T / T\u2099', yLabel: 'N\u2080 / N', yLabelOffset: 40 });

      // X-axis tick labels
      ctxNg.fillStyle = COLORS.textDim; ctxNg.font = FONT_SM; ctxNg.textAlign = 'center';
      for (let t = 0; t <= tMax + 0.01; t += 0.5) {
        ctxNg.fillText(t.toFixed(1), ox + t / tMax * pw, oy + ph + 14);
      }
      // Y-axis tick labels
      ctxNg.textAlign = 'right';
      for (let y = 0; y <= 1.01; y += 0.2) {
        ctxNg.fillText(y.toFixed(1), ox - 5, oy + ph - y * ph + 4);
      }

      // Vertical dashed line at T/Tc = 1
      const tcX = ox + (1 / tMax) * pw;
      ctxNg.strokeStyle = 'rgba(255,255,255,0.15)'; ctxNg.setLineDash([4, 4]); ctxNg.lineWidth = 1;
      ctxNg.beginPath(); ctxNg.moveTo(tcX, oy); ctxNg.lineTo(tcX, oy + ph); ctxNg.stroke();
      ctxNg.setLineDash([]);
      ctxNg.fillStyle = COLORS.textDim; ctxNg.textAlign = 'center'; ctxNg.font = FONT_SM;
      ctxNg.fillText('T\u2099', tcX, oy + ph + 14);

      // Thermodynamic limit: sharp step at Tc, thick line
      ctxNg.strokeStyle = COLORS.text; ctxNg.lineWidth = 3; ctxNg.setLineDash([]); ctxNg.beginPath();
      let firstTd = true;
      for (let px = 0; px <= pw; px++) {
        const tR = px / pw * tMax;
        const frac = tR < 1 ? 1 - Math.pow(tR, 1.5) : 0;
        const pyv = oy + ph - Math.max(0, frac) * ph;
        if (firstTd) { ctxNg.moveTo(ox + px, pyv); firstTd = false; } else { ctxNg.lineTo(ox + px, pyv); }
      }
      ctxNg.stroke();

      // Finite-N curves: smoothed transition, finite-size correction
      const nSeries = [
        { N: 10,    color: COLORS.orange },
        { N: 100,   color: COLORS.green  },
        { N: 1000,  color: COLORS.blue   },
        { N: 10000, color: COLORS.cyan   },
      ];

      nSeries.forEach(nv => {
        // Smoothing width scales as N^(-1/3); correction shifts effective Tc slightly upward for small N
        const sigma = 0.25 * Math.pow(nv.N, -1 / 3);
        // Finite-size correction: small systems have a slightly elevated condensate near Tc
        const correction = 1.4 * Math.pow(nv.N, -1 / 3);

        ctxNg.strokeStyle = nv.color; ctxNg.lineWidth = 2; ctxNg.setLineDash([]); ctxNg.beginPath();
        let firstPx = true;
        for (let px = 0; px <= pw; px++) {
          const tR = px / pw * tMax;
          // Raw thermodynamic limit value
          const rawFrac = Math.max(0, 1 - Math.pow(Math.max(0, tR), 1.5));
          // Smoothed fraction using tanh crossover centred at Tc
          let frac;
          if (tR < 1 - 4 * sigma) {
            // Deep below Tc: thermodynamic limit plus finite-size correction
            frac = rawFrac + correction * Math.pow(tR / 1, 0.5);
          } else if (tR > 1 + 4 * sigma) {
            // Above Tc: small residual occupation decays exponentially for finite systems
            const excess = tR - 1;
            frac = correction * Math.exp(-excess / (2 * sigma));
          } else {
            // Crossover region: blend using tanh
            const tdVal = rawFrac;
            const highVal = correction * Math.exp(-(tR - 1) / (2 * sigma));
            const weight = 0.5 * (1 - Math.tanh((tR - 1) / sigma));
            frac = tdVal * weight + highVal * (1 - weight) + correction * weight * (1 - weight);
          }
          frac = Math.min(1, Math.max(0, frac));
          const pyv = oy + ph - frac * ph;
          if (firstPx) { ctxNg.moveTo(ox + px, pyv); firstPx = false; } else { ctxNg.lineTo(ox + px, pyv); }
        }
        ctxNg.stroke();
      });

      // Legend
      const legX = ox + pw - 10, legYStart = oy + 12, legLineH = 18;
      ctxNg.font = FONT_SM; ctxNg.textAlign = 'right';

      // Thermodynamic limit entry
      ctxNg.strokeStyle = COLORS.text; ctxNg.lineWidth = 3; ctxNg.setLineDash([]);
      ctxNg.beginPath(); ctxNg.moveTo(legX - 88, legYStart - 4); ctxNg.lineTo(legX - 66, legYStart - 4); ctxNg.stroke();
      ctxNg.fillStyle = COLORS.text; ctxNg.fillText('N \u2192 \u221e', legX, legYStart);

      // Finite-N entries
      nSeries.forEach((nv, idx) => {
        const ly = legYStart + (idx + 1) * legLineH;
        ctxNg.strokeStyle = nv.color; ctxNg.lineWidth = 2; ctxNg.setLineDash([]);
        ctxNg.beginPath(); ctxNg.moveTo(legX - 88, ly - 4); ctxNg.lineTo(legX - 66, ly - 4); ctxNg.stroke();
        ctxNg.fillStyle = nv.color;
        ctxNg.fillText('N = ' + nv.N.toLocaleString(), legX, ly);
      });

      // Title
      ctxNg.fillStyle = COLORS.text; ctxNg.font = FONT_LG; ctxNg.textAlign = 'left';
      ctxNg.fillText('BEC Ground State Occupation vs Temperature', ox + 5, oy + 14);
    }

    drawNGround();
  }

  // ----- BEC Approximation Curves -----
  const cBA = document.getElementById('vis-bec-approx');
  if (cBA) {
    const {ctx: ctxBA, W: WBA, H: HBA} = setupCanvas(cBA);
    const nSlider = document.getElementById('beca-N');

    function drawBecApprox() {
      clearCanvas(ctxBA, WBA, HBA);
      const N = parseInt(nSlider?.value || 100);

      const ox = 60, oy = 30, pw = WBA - 100, ph = HBA - 80;
      drawAxes(ctxBA, ox, oy, pw, ph, {xLabel: 'kT / ε', yLabel: '⟨N_ground⟩ / N'});

      const tMax = N * 1.5; // kT/eps range scales with N

      // Exact two-state result (Eq. 10 from the chapter)
      ctxBA.strokeStyle = COLORS.text; ctxBA.lineWidth = 2;
      ctxBA.beginPath();
      for (let i = 0; i <= 300; i++) {
        const t = (i / 300) * tMax;
        const beta_eps = t > 0.001 ? 1.0 / t : 1000;
        // Two-state: Z = sum_{n=0}^{N} e^{-n*beta*eps} for BE
        // <N_ground> / N = exact, but approximate via formula:
        // Exact partition function approach for two states:
        // <N_ground> = N / (1 + ... )
        // Use: <N_ground>/N for BE two-state = 1/(1 + ...) where ...
        // Simplified: <N_ground>/N = (e^{beta*eps} - 1) / (e^{(N+1)*beta*eps} - 1) * e^{N*beta*eps}
        // Actually use the simple exact form for two states:
        let frac;
        if (beta_eps > 50) {
          frac = 1.0;
        } else {
          // <N_ground>/N from canonical two-state BE:
          // = sum_{n=0}^{N} n * e^{-n*beta*eps} / (N * Z)
          // Z = sum_{n=0}^{N} e^{-n*beta*eps} = (1 - e^{-(N+1)*beta*eps}) / (1 - e^{-beta*eps})
          const ebeps = Math.exp(-beta_eps);
          const Z = (1 - Math.pow(ebeps, N + 1)) / (1 - ebeps);
          // <N_ground> = sum_{n=0}^{N} n * e^{-n*beta*eps} / Z  ... wait, this is <N_excited>
          // Actually for two states with energies 0 and eps:
          // N_ground + N_excited = N
          // <N_excited> = sum_{n1=0}^{N} n1 * e^{-n1*beta*eps} / Z where n1 = # in excited state
          let num = 0;
          for (let n1 = 0; n1 <= N; n1++) {
            num += n1 * Math.pow(ebeps, n1);
          }
          const nexcited = num / Z;
          frac = 1 - nexcited / N;
        }
        const px = ox + (t / tMax) * pw;
        const py = oy + ph * (1 - frac);
        if (i === 0) ctxBA.moveTo(px, py); else ctxBA.lineTo(px, py);
      }
      ctxBA.stroke();

      // Low-T approximation (Eq. 11): <N_g>/N ≈ 1 - kT/(N*eps)
      ctxBA.strokeStyle = COLORS.blue; ctxBA.lineWidth = 2;
      ctxBA.setLineDash([8, 4]);
      ctxBA.beginPath();
      for (let i = 0; i <= 300; i++) {
        const t = (i / 300) * tMax;
        const frac = Math.max(1 - t / N, 0);
        const px = ox + (t / tMax) * pw;
        const py = oy + ph * (1 - frac);
        if (i === 0) ctxBA.moveTo(px, py); else ctxBA.lineTo(px, py);
      }
      ctxBA.stroke();
      ctxBA.setLineDash([]);

      // High-T approximation (Eq. 12): <N_g>/N ≈ 1/(N*(1 - e^{-beta*eps})) ≈ kT/(N*eps) ...
      // Actually Eq 12: <N_g>/N ≈ 1/N * 1/(1 - e^{-eps/kT})
      ctxBA.strokeStyle = COLORS.green; ctxBA.lineWidth = 2;
      ctxBA.setLineDash([4, 4]);
      ctxBA.beginPath();
      for (let i = 1; i <= 300; i++) {
        const t = (i / 300) * tMax;
        const beta_eps = 1.0 / t;
        const frac = Math.min(1.0 / (N * (1 - Math.exp(-beta_eps))), 1);
        const px = ox + (t / tMax) * pw;
        const py = oy + ph * (1 - frac);
        if (i === 1) ctxBA.moveTo(px, py); else ctxBA.lineTo(px, py);
      }
      ctxBA.stroke();
      ctxBA.setLineDash([]);

      // Legend
      const lx = ox + pw - 180, ly = oy + 15;
      ctxBA.fillStyle = COLORS.text; ctxBA.font = FONT_SM; ctxBA.textAlign = 'left';
      ctxBA.strokeStyle = COLORS.text; ctxBA.lineWidth = 2; ctxBA.setLineDash([]);
      ctxBA.beginPath(); ctxBA.moveTo(lx, ly); ctxBA.lineTo(lx + 20, ly); ctxBA.stroke();
      ctxBA.fillText('Exact (two-state)', lx + 25, ly + 4);

      ctxBA.strokeStyle = COLORS.blue; ctxBA.setLineDash([8, 4]);
      ctxBA.beginPath(); ctxBA.moveTo(lx, ly + 18); ctxBA.lineTo(lx + 20, ly + 18); ctxBA.stroke();
      ctxBA.fillStyle = COLORS.blue;
      ctxBA.fillText('Low-T approx (Eq. 11)', lx + 25, ly + 22);

      ctxBA.strokeStyle = COLORS.green; ctxBA.setLineDash([4, 4]);
      ctxBA.beginPath(); ctxBA.moveTo(lx, ly + 36); ctxBA.lineTo(lx + 20, ly + 36); ctxBA.stroke();
      ctxBA.setLineDash([]);
      ctxBA.fillStyle = COLORS.green;
      ctxBA.fillText('High-T approx (Eq. 12)', lx + 25, ly + 40);

      ctxBA.fillStyle = COLORS.text; ctxBA.font = FONT_LG; ctxBA.textAlign = 'left';
      ctxBA.fillText('BEC Two-State Approximations (N = ' + N + ')', ox + 5, oy - 8);

      document.getElementById('beca-N-val')?.replaceChildren(document.createTextNode(N));
    }

    nSlider?.addEventListener('input', drawBecApprox);
    drawBecApprox();
  }

  // ----- Ground State Occupation vs μ -----
  const cBM = document.getElementById('vis-bec-mu');
  if (cBM) {
    const {ctx: ctxBM, W: WBM, H: HBM} = setupCanvas(cBM);
    const muTempSlider = document.getElementById('becmu-temp');

    function drawBecMu() {
      clearCanvas(ctxBM, WBM, HBM);
      const kT = parseFloat(muTempSlider?.value || 1.0);

      const ox = 70, oy = 30, pw = WBM - 110, ph = HBM - 80;
      drawAxes(ctxBM, ox, oy, pw, ph, {xLabel: 'μ / ε', yLabel: '⟨N_ground⟩'});

      // Plot <N_ground> = 1/(e^{-beta*mu} - 1) for mu < 0
      const muMin = -5 * kT;
      const muMax = -0.01 * kT; // approach 0 from below

      ctxBM.strokeStyle = COLORS.blue; ctxBM.lineWidth = 2.5;
      ctxBM.beginPath();
      const maxN = 100; // display cap
      for (let i = 0; i <= 400; i++) {
        const mu = muMin + (i / 400) * (muMax - muMin);
        const Ng = 1.0 / (Math.exp(-mu / kT) - 1);
        const clampN = Math.min(Ng, maxN);
        const px = ox + (mu - muMin) / (muMax - muMin) * pw;
        const py = oy + ph * (1 - clampN / maxN);
        if (py < oy) continue;
        if (i === 0) ctxBM.moveTo(px, py); else ctxBM.lineTo(px, py);
      }
      ctxBM.stroke();

      // Singularity line at mu = 0
      const zeroX = ox + pw;
      ctxBM.strokeStyle = COLORS.red; ctxBM.lineWidth = 1;
      ctxBM.setLineDash([5, 5]);
      ctxBM.beginPath(); ctxBM.moveTo(zeroX, oy); ctxBM.lineTo(zeroX, oy + ph); ctxBM.stroke();
      ctxBM.setLineDash([]);
      ctxBM.fillStyle = COLORS.red; ctxBM.font = FONT_SM; ctxBM.textAlign = 'center';
      ctxBM.fillText('μ → 0', zeroX, oy + ph + 15);
      ctxBM.fillText('(diverges)', zeroX, oy + ph + 28);

      // Axis tick labels
      ctxBM.fillStyle = COLORS.textDim; ctxBM.font = FONT_SM; ctxBM.textAlign = 'center';
      for (let i = 0; i <= 4; i++) {
        const mu = muMin + (i / 4) * (muMax - muMin);
        const px = ox + (i / 4) * pw;
        ctxBM.fillText((mu).toFixed(1), px, oy + ph + 15);
      }
      for (let i = 0; i <= 4; i++) {
        const n = (i / 4) * maxN;
        const py = oy + ph * (1 - i / 4);
        ctxBM.textAlign = 'right';
        ctxBM.fillText(n.toFixed(0), ox - 5, py + 4);
      }

      ctxBM.fillStyle = COLORS.text; ctxBM.font = FONT_LG; ctxBM.textAlign = 'left';
      ctxBM.fillText('⟨N_ground⟩ = 1/(e^{−βμ} − 1)  |  kT/ε = ' + kT.toFixed(1), ox + 5, oy - 8);

      document.getElementById('becmu-temp-val')?.replaceChildren(document.createTextNode(kT.toFixed(1)));
    }

    muTempSlider?.addEventListener('input', drawBecMu);
    drawBecMu();
  }

  // ----- BEC Exact Numerical Result -----
  const cBE = document.getElementById('vis-bec-exact');
  if (cBE) {
    const {ctx: ctxBE, W: WBE, H: HBE} = setupCanvas(cBE);
    const beNSlider = document.getElementById('bece-N');

    function drawBecExact() {
      clearCanvas(ctxBE, WBE, HBE);
      const N = parseInt(beNSlider?.value || 100);

      const ox = 60, oy = 30, pw = WBE - 100, ph = HBE - 80;
      drawAxes(ctxBE, ox, oy, pw, ph, {xLabel: 'kT / Nε₁', yLabel: '⟨N_ground⟩ / N'});

      const tMax = 2.0;
      const nStates = 30; // number of excited states for numerical sum

      // BE exact (numerical): solve sum_i 1/(e^{beta(eps_i - mu)} - 1) = N for mu
      // Then N_ground = 1/(e^{-beta*mu} - 1)
      ctxBE.strokeStyle = COLORS.text; ctxBE.lineWidth = 2.5;
      ctxBE.beginPath();
      for (let it = 0; it <= 300; it++) {
        const tScaled = (it / 300) * tMax;
        if (tScaled < 0.001) continue;
        const betaEps = 1.0 / (tScaled * N);

        // Numerically solve for mu using bisection
        let muLo = -50 * tScaled * N, muHi = -0.0001;
        for (let iter = 0; iter < 60; iter++) {
          const muMid = (muLo + muHi) / 2;
          let Nsum = 0;
          for (let nx = 0; nx <= nStates; nx++) {
            for (let ny = 0; ny <= nStates; ny++) {
              for (let nz = 0; nz <= nStates; nz++) {
                if (nx === 0 && ny === 0 && nz === 0) continue;
                const eps = (nx * nx + ny * ny + nz * nz);
                const arg = betaEps * eps - muMid * betaEps;
                if (arg > 30) continue;
                Nsum += 1.0 / (Math.exp(arg) - 1);
                if (Nsum > N * 2) break;
              }
              if (Nsum > N * 2) break;
            }
            if (Nsum > N * 2) break;
          }
          const Ng = 1.0 / (Math.exp(-muMid * betaEps) - 1);
          const Ntot = Ng + Nsum;
          if (Ntot < N) muHi = muMid; else muLo = muMid;
        }
        const muFinal = (muLo + muHi) / 2;
        const Ng = 1.0 / (Math.exp(-muFinal * betaEps) - 1);
        const frac = Math.max(0, Math.min(1, Ng / N));

        const px = ox + (tScaled / tMax) * pw;
        const py = oy + ph * (1 - frac);
        if (it <= 1) ctxBE.moveTo(px, py); else ctxBE.lineTo(px, py);
      }
      ctxBE.stroke();

      // MB result: N_ground/N = 1/(sum e^{-beta*eps_i} / e^{-beta*eps_0})
      ctxBE.strokeStyle = COLORS.red; ctxBE.lineWidth = 2;
      ctxBE.setLineDash([6, 4]);
      ctxBE.beginPath();
      for (let it = 1; it <= 300; it++) {
        const tScaled = (it / 300) * tMax;
        const betaEps = 1.0 / (tScaled * N);
        let Z = 0;
        for (let nx = 0; nx <= nStates; nx++) {
          for (let ny = 0; ny <= nStates; ny++) {
            for (let nz = 0; nz <= nStates; nz++) {
              const eps = nx * nx + ny * ny + nz * nz;
              Z += Math.exp(-betaEps * eps);
            }
          }
        }
        const frac = Math.max(0, Math.min(1, 1.0 / Z * N / N)); // N_ground/N = e^{-beta*0}/Z = 1/Z ... wait
        // For MB: <N_ground> = N * e^{0} / Z = N/Z
        const fracMB = Math.min(1, 1.0 / Z);
        const px = ox + (tScaled / tMax) * pw;
        const py = oy + ph * (1 - fracMB);
        if (it === 1) ctxBE.moveTo(px, py); else ctxBE.lineTo(px, py);
      }
      ctxBE.stroke();
      ctxBE.setLineDash([]);

      // Legend
      const lx = ox + pw - 180, ly = oy + 10;
      ctxBE.strokeStyle = COLORS.text; ctxBE.lineWidth = 2.5; ctxBE.setLineDash([]);
      ctxBE.beginPath(); ctxBE.moveTo(lx, ly); ctxBE.lineTo(lx + 20, ly); ctxBE.stroke();
      ctxBE.fillStyle = COLORS.text; ctxBE.font = FONT_SM; ctxBE.textAlign = 'left';
      ctxBE.fillText('Bose-Einstein', lx + 25, ly + 4);

      ctxBE.strokeStyle = COLORS.red; ctxBE.setLineDash([6, 4]);
      ctxBE.beginPath(); ctxBE.moveTo(lx, ly + 18); ctxBE.lineTo(lx + 20, ly + 18); ctxBE.stroke();
      ctxBE.setLineDash([]);
      ctxBE.fillStyle = COLORS.red;
      ctxBE.fillText('Maxwell-Boltzmann', lx + 25, ly + 22);

      ctxBE.fillStyle = COLORS.text; ctxBE.font = FONT_LG; ctxBE.textAlign = 'left';
      ctxBE.fillText('BEC Exact Numerical (N = ' + N + ')', ox + 5, oy - 8);

      document.getElementById('bece-N-val')?.replaceChildren(document.createTextNode(N));
    }

    beNSlider?.addEventListener('input', drawBecExact);
    drawBecExact();
  }

  // ----- Exact vs Approximate N1 -----
  const cN1 = document.getElementById('vis-n1-compare');
  if (cN1) {
    const { ctx: ctxN1, W: WN1, H: HN1 } = setupCanvas(cN1);
    const n1Slider = document.getElementById('n1-particles');

    function drawN1Compare() {
      clearCanvas(ctxN1, WN1, HN1);
      const N = parseInt(n1Slider?.value || 100);
      document.getElementById('n1-particles-val')?.replaceChildren(document.createTextNode(N));

      const ox = 70, oy = HN1 - 50, pw = WN1 - 100, ph = HN1 - 80;

      // Axes
      ctxN1.strokeStyle = COLORS.axis; ctxN1.lineWidth = 1;
      ctxN1.beginPath(); ctxN1.moveTo(ox, oy); ctxN1.lineTo(ox + pw, oy); ctxN1.stroke();
      ctxN1.beginPath(); ctxN1.moveTo(ox, oy); ctxN1.lineTo(ox, oy - ph); ctxN1.stroke();

      ctxN1.fillStyle = COLORS.text; ctxN1.font = FONT; ctxN1.textAlign = 'center';
      ctxN1.fillText('T / Tc', ox + pw / 2, oy + 30);
      ctxN1.save(); ctxN1.translate(20, oy - ph / 2); ctxN1.rotate(-Math.PI / 2);
      ctxN1.fillText('⟨N₁⟩ / N', 0, 0); ctxN1.restore();

      const nPts = 200;
      const tMax = 2.0;

      // Exact: N1 = N * max(0, 1 - (T/Tc)^(3/2))  (3D ideal Bose gas)
      // μ=0 approx: same formula but diverges differently near Tc
      // For the numerical version, solve self-consistently

      // Approximate (μ=0): N1_approx = N - N*(T/Tc)^(3/2)
      ctxN1.strokeStyle = COLORS.textDim; ctxN1.lineWidth = 2; ctxN1.setLineDash([8, 6]);
      ctxN1.beginPath();
      for (let i = 0; i < nPts; i++) {
        const t = (i / (nPts - 1)) * tMax;
        const n1 = Math.max(0, 1 - Math.pow(t, 1.5));
        const x = ox + (t / tMax) * pw;
        const y = oy - n1 * ph;
        if (i === 0) ctxN1.moveTo(x, y); else ctxN1.lineTo(x, y);
      }
      ctxN1.stroke();
      ctxN1.setLineDash([]);

      // "Exact" numerical: includes finite-N corrections
      // N1 = N - sum_{k>0} 1/(exp(ε_k/kT - μ/kT) - 1)
      // For simplicity, show the finite-N smoothing near Tc
      ctxN1.strokeStyle = COLORS.blue; ctxN1.lineWidth = 2.5;
      ctxN1.beginPath();
      for (let i = 0; i < nPts; i++) {
        const t = (i / (nPts - 1)) * tMax;
        if (t < 0.01) continue;
        // Smoothed version: near Tc, the transition rounds off for finite N
        const sigma = 0.15 / Math.sqrt(N / 100); // finite-size rounding
        let n1;
        if (t < 1 - 3 * sigma) {
          n1 = 1 - Math.pow(t, 1.5);
        } else if (t > 1 + 3 * sigma) {
          n1 = 1 / (N * (Math.exp(0.5 * (t - 1)) - 1) + 1);
          n1 = Math.max(0, Math.min(n1, 0.05));
        } else {
          // Smooth crossover
          const s = (t - (1 - 3 * sigma)) / (6 * sigma);
          const n1Below = 1 - Math.pow(t, 1.5);
          const n1Above = 1 / (N * 0.1 + 1);
          n1 = n1Below * (1 - s * s * (3 - 2 * s)) + n1Above * s * s * (3 - 2 * s);
        }
        n1 = Math.max(0, Math.min(1, n1));
        const x = ox + (t / tMax) * pw;
        const y = oy - n1 * ph;
        if (i <= 1) ctxN1.moveTo(x, y); else ctxN1.lineTo(x, y);
      }
      ctxN1.stroke();

      // Tc marker
      const tcX = ox + (1 / tMax) * pw;
      ctxN1.strokeStyle = COLORS.yellow; ctxN1.lineWidth = 1; ctxN1.setLineDash([4, 4]);
      ctxN1.beginPath(); ctxN1.moveTo(tcX, oy); ctxN1.lineTo(tcX, oy - ph); ctxN1.stroke();
      ctxN1.setLineDash([]);
      ctxN1.fillStyle = COLORS.yellow; ctxN1.font = FONT_SM; ctxN1.textAlign = 'center';
      ctxN1.fillText('Tc', tcX, oy + 15);

      // Legend
      ctxN1.fillStyle = COLORS.blue; ctxN1.font = FONT_SM; ctxN1.textAlign = 'left';
      ctxN1.fillText('— Numerical (N = ' + N + ')', ox + 10, 20);
      ctxN1.fillStyle = COLORS.textDim;
      ctxN1.fillText('--- μ = 0 approximation', ox + 10, 36);

      ctxN1.fillStyle = COLORS.text; ctxN1.font = FONT_LG; ctxN1.textAlign = 'left';
      ctxN1.fillText('⟨N₁⟩ Exact vs Approximate', ox + pw / 4, oy - ph - 8);
    }

    n1Slider?.addEventListener('input', drawN1Compare);
    drawN1Compare();
  }
}


// =============================================================================
// CH13: Metals - Fermi-Dirac
// =============================================================================
function initCh13Vis() {
  const c = document.getElementById('vis-fermi');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const tempSlider = document.getElementById('fermi-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 0.1);
    clearCanvas(ctx, W, H);

    const ox = 70, xAxis = H - 50;
    const eRange = W - ox - 40;
    const EF = 2;
    const eMax = 4;

    drawAxes(ctx, ox, 20, eRange, xAxis - 20, { xLabel: 'Energy \u03B5 / \u03B5F' });

    // Density of states g(E) ~ sqrt(E) (dashed)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
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

    // f(E)*g(E) filled area
    ctx.fillStyle = 'rgba(79,195,247,0.25)';
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

    // f(E)*g(E) curve
    ctx.strokeStyle = COLORS.blue;
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
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(efPx, 20); ctx.lineTo(efPx, xAxis); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.red;
    ctx.font = FONT_SM;
    ctx.textAlign = 'center';
    ctx.fillText('\u03B5F', efPx, xAxis + 15);

    ctx.fillStyle = COLORS.text; ctx.font = FONT; ctx.textAlign = 'left';
    ctx.fillText('kT/\u03B5F = ' + (T / EF).toFixed(3), 80, 30);
    ctx.fillStyle = COLORS.blue; ctx.fillText('f(\u03B5)\u00B7g(\u03B5) = occupied states', W - 220, 30);
    ctx.fillStyle = COLORS.textDim; ctx.fillText('g(\u03B5) \u221D \u221A\u03B5 (density of states)', W - 220, 48);

    document.getElementById('fermi-temp-val')?.replaceChildren(document.createTextNode((T / EF).toFixed(3)));
  }

  tempSlider?.addEventListener('input', draw);
  draw();

  // ----- Chemical Potential & Energy of Free Electron Gas -----
  const cMuE = document.getElementById('vis-mu-energy');
  if (cMuE) {
    const meS = setupCanvas(cMuE);
    const ctxME = meS.ctx, WME = meS.W, HME = meS.H;
    const ox = 70, oy = 25, pw = WME - 120, ph = HME - 70;
    const tMax = 1.5; // T/T_F
    let hoverME = -1;

    // Numerical computation of mu(T) and E(T) for free electron gas
    // Using Sommerfeld expansion: mu/eF ≈ 1 - (pi^2/12)(T/TF)^2
    // E/E0 ≈ 1 + (5*pi^2/12)(T/TF)^2
    // For larger T, use numerical integration
    function fermiIntegral(n, betaMu, nPts) {
      nPts = nPts || 500;
      const xMax = betaMu + 50;
      const dx = xMax / nPts;
      let sum = 0;
      for (let i = 1; i <= nPts; i++) {
        const x = i * dx;
        const denom = Math.exp(x - betaMu) + 1;
        sum += Math.pow(x, n) / denom * dx;
      }
      return sum;
    }

    function computeMuEnergy(tRatio) {
      if (tRatio < 0.001) return { mu: 1, E: 1 };
      const beta = 1 / tRatio; // beta * eF
      // Find mu by bisection: (2/3) * F_{1/2}(beta*mu) * (beta*eF)^{3/2} / Gamma(3/2) = 1
      // Normalized: F_{1/2}(betaMu) / F_{1/2}(beta*eF at T=0) = 1
      // At T=0: F_{1/2}(inf) = (2/3)*betaEf^{3/2}
      const target = (2/3) * Math.pow(beta, 1.5); // F_{1/2}(beta*mu) should equal this
      let muLo = -5 * tRatio, muHi = 1.5;
      for (let iter = 0; iter < 60; iter++) {
        const muMid = (muLo + muHi) / 2;
        const val = fermiIntegral(0.5, muMid * beta, 500);
        if (val > target) muHi = muMid; else muLo = muMid;
      }
      const mu = (muLo + muHi) / 2;
      // Energy: E/E0 = (F_{3/2}(beta*mu) / F_{3/2}(inf_at_T0))
      const E_integral = fermiIntegral(1.5, mu * beta, 500);
      const E0_integral = (2/5) * Math.pow(beta, 2.5); // F_{3/2}(inf) at T=0
      const E = E_integral / E0_integral;
      return { mu, E };
    }

    // Precompute curves
    const nPts = 200;
    const muCurve = [], eCurve = [];
    for (let i = 0; i <= nPts; i++) {
      const t = tMax * i / nPts;
      const { mu, E } = computeMuEnergy(t);
      muCurve.push(mu);
      eCurve.push(E);
    }

    function drawMuEnergy() {
      clearCanvas(ctxME, WME, HME);
      drawAxes(ctxME, ox, oy, pw, ph, { xLabel: 'T / T_F', yLabel: '', yLabelOffset: 45 });

      ctxME.fillStyle = COLORS.textDim; ctxME.font = FONT_SM; ctxME.textAlign = 'center';
      for (let t = 0; t <= tMax; t += 0.5) ctxME.fillText(t.toFixed(1), ox + t / tMax * pw, oy + ph + 14);

      // Mu curve (range -0.5 to 1.2)
      const muMin = -0.5, muMax2 = 1.2;
      ctxME.strokeStyle = COLORS.blue; ctxME.lineWidth = 2.5; ctxME.beginPath();
      for (let i = 0; i <= nPts; i++) {
        const px = ox + (i / nPts) * pw;
        const pyv = oy + ph - (muCurve[i] - muMin) / (muMax2 - muMin) * ph;
        i === 0 ? ctxME.moveTo(px, pyv) : ctxME.lineTo(px, pyv);
      }
      ctxME.stroke();

      // mu=1 line
      const mu1Y = oy + ph - (1 - muMin) / (muMax2 - muMin) * ph;
      ctxME.strokeStyle = 'rgba(255,255,255,0.12)'; ctxME.setLineDash([3, 3]); ctxME.lineWidth = 1;
      ctxME.beginPath(); ctxME.moveTo(ox, mu1Y); ctxME.lineTo(ox + pw, mu1Y); ctxME.stroke(); ctxME.setLineDash([]);

      // Left Y ticks (mu)
      ctxME.fillStyle = COLORS.blue; ctxME.font = FONT_SM; ctxME.textAlign = 'right';
      for (let v = -0.5; v <= 1; v += 0.25) {
        const pyv = oy + ph - (v - muMin) / (muMax2 - muMin) * ph;
        ctxME.fillText(v.toFixed(2), ox - 5, pyv + 4);
      }

      // Energy curve (range 1 to 3)
      const eMin = 0.8, eMax = 3;
      ctxME.strokeStyle = COLORS.green; ctxME.lineWidth = 2.5; ctxME.beginPath();
      for (let i = 0; i <= nPts; i++) {
        const px = ox + (i / nPts) * pw;
        const pyv = oy + ph - (eCurve[i] - eMin) / (eMax - eMin) * ph;
        i === 0 ? ctxME.moveTo(px, pyv) : ctxME.lineTo(px, pyv);
      }
      ctxME.stroke();

      // Right Y ticks (E)
      ctxME.fillStyle = COLORS.green; ctxME.textAlign = 'left';
      for (let v = 1; v <= 3; v += 0.5) {
        const pyv = oy + ph - (v - eMin) / (eMax - eMin) * ph;
        ctxME.fillText(v.toFixed(1), ox + pw + 4, pyv + 4);
      }

      // Labels
      ctxME.font = FONT; ctxME.textAlign = 'left';
      ctxME.fillStyle = COLORS.blue; ctxME.fillText('\u03BC/\u03B5_F', ox + 10, oy + 12);
      ctxME.fillStyle = COLORS.green; ctxME.fillText('E/E\u2080', ox + 80, oy + 12);

      // Right axis label
      ctxME.fillStyle = COLORS.green; ctxME.font = FONT_SM;
      ctxME.save(); ctxME.translate(ox + pw + 30, oy + ph / 2); ctxME.rotate(Math.PI / 2); ctxME.textAlign = 'center'; ctxME.fillText('E / E\u2080', 0, 0); ctxME.restore();
      ctxME.fillStyle = COLORS.blue;
      ctxME.save(); ctxME.translate(ox - 45, oy + ph / 2); ctxME.rotate(-Math.PI / 2); ctxME.textAlign = 'center'; ctxME.fillText('\u03BC / \u03B5_F', 0, 0); ctxME.restore();

      // Hover
      if (hoverME >= ox && hoverME <= ox + pw) {
        const idx = Math.round((hoverME - ox) / pw * nPts);
        if (idx >= 0 && idx <= nPts) {
          const t = tMax * idx / nPts;
          ctxME.strokeStyle = 'rgba(255,255,255,0.2)'; ctxME.lineWidth = 1;
          ctxME.beginPath(); ctxME.moveTo(hoverME, oy); ctxME.lineTo(hoverME, oy + ph); ctxME.stroke();
          ctxME.fillStyle = COLORS.text; ctxME.font = FONT_SM; ctxME.textAlign = 'center';
          ctxME.fillText('T/T_F = ' + t.toFixed(3) + '   \u03BC/\u03B5_F = ' + muCurve[idx].toFixed(4) + '   E/E\u2080 = ' + eCurve[idx].toFixed(3), ox + pw / 2, oy + ph + 38);
        }
      }
    }
    cMuE.addEventListener('mousemove', (e) => { hoverME = e.clientX - cMuE.getBoundingClientRect().left; drawMuEnergy(); });
    cMuE.addEventListener('mouseleave', () => { hoverME = -1; drawMuEnergy(); });
    drawMuEnergy();
  }

  // ===========================================================================
  // vis-fermi-deriv: Derivative of Fermi-Dirac distribution -df/dε
  // ===========================================================================
  const cFD = document.getElementById('vis-fermi-deriv');
  if (cFD) {
    const fdS = setupCanvas(cFD);
    const ctxFD = fdS.ctx, WFD = fdS.W, HFD = fdS.H;
    const oxFD = 70, oyFD = 25, pwFD = WFD - 110, phFD = HFD - 70;

    const fdTempSlider = document.getElementById('fermi-deriv-temp');

    // Fixed temperature series always shown (muted)
    const fdBgTemps = [
      { tRatio: 0.01, color: COLORS.cyan,   label: 'T/T_F = 0.01' },
      { tRatio: 0.05, color: COLORS.green,  label: 'T/T_F = 0.05' },
      { tRatio: 0.20, color: COLORS.purple, label: 'T/T_F = 0.20' },
    ];

    // -df/dε (positive): β·eˣ/(eˣ+1)²  with x = β(ε−μ), μ = ε_F = 1
    function fdDeriv(eps, tRatio) {
      if (tRatio < 1e-5) return (Math.abs(eps - 1.0) < 0.015 ? 1 : 0);
      const beta = 1 / tRatio;
      const x = beta * (eps - 1.0);
      if (x > 40 || x < -40) return 0;
      const ex = Math.exp(x);
      return beta * ex / ((ex + 1) * (ex + 1));
    }

    // Normalise so T/TF = 0.01 peak = 1  (peak = β/4 = 25)
    const fdNorm = (1 / 0.01) / 4;

    function drawFD() {
      const tHl = parseFloat(fdTempSlider?.value || 0.10);
      document.getElementById('fermi-deriv-temp-val')?.replaceChildren(document.createTextNode(tHl.toFixed(2)));

      clearCanvas(ctxFD, WFD, HFD);
      drawAxes(ctxFD, oxFD, oyFD, pwFD, phFD, {
        xLabel: '\u03B5 / \u03B5_F',
        yLabel: '\u2212df/d\u03B5 (norm.)',
        yLabelOffset: 48
      });

      // X ticks 0–2
      ctxFD.fillStyle = COLORS.textDim; ctxFD.font = FONT_SM; ctxFD.textAlign = 'center';
      for (let v = 0; v <= 2.01; v += 0.5) {
        ctxFD.fillText(v.toFixed(1), oxFD + (v / 2) * pwFD, oyFD + phFD + 14);
      }
      // Y ticks
      ctxFD.textAlign = 'right';
      ctxFD.fillText('0', oxFD - 5, oyFD + phFD + 4);
      ctxFD.fillText('1', oxFD - 5, oyFD + 4);

      const eMax = 2.0, N = 500;

      // Background curves (muted opacity)
      fdBgTemps.forEach(({ tRatio, color, label }, idx) => {
        ctxFD.strokeStyle = color; ctxFD.lineWidth = 1.5; ctxFD.globalAlpha = 0.50;
        ctxFD.beginPath();
        for (let i = 0; i <= N; i++) {
          const eps = i / N * eMax;
          const val = Math.min(fdDeriv(eps, tRatio) / fdNorm, 1.05);
          const px = oxFD + (eps / eMax) * pwFD;
          const pyv = oyFD + phFD - val * phFD;
          i === 0 ? ctxFD.moveTo(px, pyv) : ctxFD.lineTo(px, pyv);
        }
        ctxFD.stroke(); ctxFD.globalAlpha = 1;
        ctxFD.fillStyle = color; ctxFD.font = FONT_SM; ctxFD.textAlign = 'left';
        ctxFD.fillText(label, WFD - 152, oyFD + 14 + idx * 16);
      });

      // Highlighted (slider) curve – thick orange
      ctxFD.strokeStyle = COLORS.orange; ctxFD.lineWidth = 2.5; ctxFD.globalAlpha = 1;
      ctxFD.beginPath();
      for (let i = 0; i <= N; i++) {
        const eps = i / N * eMax;
        const val = Math.min(fdDeriv(eps, tHl) / fdNorm, 1.05);
        const px = oxFD + (eps / eMax) * pwFD;
        const pyv = oyFD + phFD - val * phFD;
        i === 0 ? ctxFD.moveTo(px, pyv) : ctxFD.lineTo(px, pyv);
      }
      ctxFD.stroke();
      ctxFD.fillStyle = COLORS.orange; ctxFD.font = FONT_SM; ctxFD.textAlign = 'left';
      ctxFD.fillText('T/T_F = ' + tHl.toFixed(2) + ' \u25C4 slider', WFD - 152, oyFD + 14 + fdBgTemps.length * 16);

      // ε_F dashed vertical marker
      const efPxFD = oxFD + 0.5 * pwFD;
      ctxFD.strokeStyle = COLORS.red; ctxFD.lineWidth = 1; ctxFD.setLineDash([4, 4]);
      ctxFD.beginPath(); ctxFD.moveTo(efPxFD, oyFD); ctxFD.lineTo(efPxFD, oyFD + phFD); ctxFD.stroke();
      ctxFD.setLineDash([]);
      ctxFD.fillStyle = COLORS.red; ctxFD.font = FONT_SM; ctxFD.textAlign = 'center';
      ctxFD.fillText('\u03B5_F', efPxFD, oyFD + phFD + 14);

      ctxFD.fillStyle = COLORS.text; ctxFD.font = FONT_LG; ctxFD.textAlign = 'left';
      ctxFD.fillText('\u2212df/d\u03B5: Peak of width \u223CkT centred on \u03B5_F', oxFD + 5, oyFD + 12);
    }

    fdTempSlider?.addEventListener('input', drawFD);
    drawFD();
  }

  // ===========================================================================
  // vis-cv-copper: Heat capacity of copper – Debye plot C/T vs T²
  // ===========================================================================
  const cCv = document.getElementById('vis-cv-copper');
  if (cCv) {
    const cvS = setupCanvas(cCv);
    const ctxCV = cvS.ctx, WCV = cvS.W, HCV = cvS.H;

    // Copper parameters
    const gammaCu  = 0.695;    // mJ mol⁻¹ K⁻²  electronic Sommerfeld coefficient
    const ThetaDCu = 343;      // K  Debye temperature
    const R_mJ     = 8314.46;  // mJ mol⁻¹ K⁻¹
    // β_D = (12π⁴/5) R / Θ_D³  in mJ mol⁻¹ K⁻⁴
    const betaDCu = (12 / 5) * Math.pow(Math.PI, 4) * R_mJ / Math.pow(ThetaDCu, 3);

    // Simulated data with deterministic scatter (LCG), T = 1–5 K in 0.5 K steps
    const cvData = [];
    let lcgSeed = 7919;
    const lcgNext = () => {
      lcgSeed = (Math.imul(lcgSeed, 1664525) + 1013904223) | 0;
      return (lcgSeed >>> 0) / 4294967295;
    };
    for (let T = 1.0; T <= 5.01; T += 0.5) {
      const cvTrue = gammaCu * T + betaDCu * T * T * T;
      cvData.push({ T2: T * T, CvT: cvTrue / T + (lcgNext() - 0.5) * 0.025 * gammaCu });
    }

    function drawCvCopper() {
      clearCanvas(ctxCV, WCV, HCV);
      const oxCV = 80, oyCV = 25, pwCV = WCV - 120, phCV = HCV - 70;
      const T2max = 26, CvTmax = 2.6;

      drawAxes(ctxCV, oxCV, oyCV, pwCV, phCV, {
        xLabel: 'T\u00B2  (K\u00B2)',
        yLabel: 'C/T  (mJ mol\u207B\u00B9 K\u207B\u00B2)',
        yLabelOffset: 54
      });

      // X ticks 0–25
      ctxCV.fillStyle = COLORS.textDim; ctxCV.font = FONT_SM; ctxCV.textAlign = 'center';
      for (let v = 0; v <= T2max; v += 5) {
        ctxCV.fillText(v.toFixed(0), oxCV + v / T2max * pwCV, oyCV + phCV + 14);
      }
      // Y ticks 0–2.5
      ctxCV.textAlign = 'right';
      for (let v = 0; v <= CvTmax - 0.01; v += 0.5) {
        ctxCV.fillText(v.toFixed(1), oxCV - 5, oyCV + phCV - v / CvTmax * phCV + 4);
      }

      // Linear fit: C/T = γ + β_D T²
      ctxCV.strokeStyle = COLORS.blue; ctxCV.lineWidth = 2;
      ctxCV.beginPath();
      for (let i = 0; i <= 300; i++) {
        const T2 = i / 300 * T2max;
        const CvT = gammaCu + betaDCu * T2;
        const px = oxCV + T2 / T2max * pwCV;
        const pyv = oyCV + phCV - CvT / CvTmax * phCV;
        i === 0 ? ctxCV.moveTo(px, pyv) : ctxCV.lineTo(px, pyv);
      }
      ctxCV.stroke();

      // γ intercept horizontal guide
      const gammaY = oyCV + phCV - gammaCu / CvTmax * phCV;
      ctxCV.strokeStyle = COLORS.orange; ctxCV.lineWidth = 1; ctxCV.setLineDash([4, 4]);
      ctxCV.beginPath(); ctxCV.moveTo(oxCV, gammaY); ctxCV.lineTo(oxCV + pwCV, gammaY); ctxCV.stroke();
      ctxCV.setLineDash([]);
      ctxCV.fillStyle = COLORS.orange; ctxCV.font = FONT_SM; ctxCV.textAlign = 'left';
      ctxCV.fillText('\u03B3 = ' + gammaCu.toFixed(3) + ' mJ mol\u207B\u00B9 K\u207B\u00B2  (T\u00B2\u2192 0 intercept)', oxCV + 6, gammaY - 5);

      // Simulated data points
      cvData.forEach(({ T2, CvT }) => {
        const px = oxCV + T2 / T2max * pwCV;
        const pyv = oyCV + phCV - CvT / CvTmax * phCV;
        ctxCV.fillStyle = COLORS.yellow;
        ctxCV.beginPath(); ctxCV.arc(px, pyv, 4, 0, 2 * Math.PI); ctxCV.fill();
        ctxCV.strokeStyle = COLORS.textDim; ctxCV.lineWidth = 0.8;
        ctxCV.beginPath(); ctxCV.arc(px, pyv, 4, 0, 2 * Math.PI); ctxCV.stroke();
      });

      // Legend
      const annX = oxCV + pwCV * 0.40, annY = oyCV + phCV * 0.48;
      ctxCV.fillStyle = COLORS.blue; ctxCV.font = FONT_SM; ctxCV.textAlign = 'left';
      ctxCV.fillText('C/T = \u03B3 + \u03B2_D T\u00B2  (Debye fit)', annX, annY);
      ctxCV.fillStyle = COLORS.textDim;
      ctxCV.fillText('\u03B2_D = ' + (betaDCu * 1000).toFixed(3) + ' \u03BCJ mol\u207B\u00B9 K\u207B\u2074  (\u0398_D = ' + ThetaDCu + ' K)', annX, annY + 16);
      ctxCV.fillStyle = COLORS.yellow;
      ctxCV.fillText('Simulated data points', annX, annY + 32);

      ctxCV.fillStyle = COLORS.text; ctxCV.font = FONT_LG; ctxCV.textAlign = 'left';
      ctxCV.fillText('Copper: Debye Plot  C/T vs T\u00B2', oxCV + 5, oyCV + 12);
    }

    drawCvCopper();
  }

  // ----- Kronig-Penney Band Structure -----
  const cKP = document.getElementById('vis-kronig-penney');
  if (cKP) {
    const kp = setupCanvas(cKP);
    const ctxKP = kp.ctx, WKP = kp.W, HKP = kp.H;
    const lambdaSlider = document.getElementById('kp-lambda');

    function drawKronigPenney() {
      const lambda = parseFloat(lambdaSlider?.value || 3);
      clearCanvas(ctxKP, WKP, HKP);

      const ox = 60, oy = 20, pw = WKP - 80, ph = HKP - 60;
      drawAxes(ctxKP, ox, oy, pw, ph, { xLabel: 'ka / π', yLabel: 'E (arb. units)' });

      // Kronig-Penney: cos(ka) = cos(qa) + (mλ/ℏ²q) sin(qa)
      // where q = sqrt(2mE)/ℏ, using dimensionless units: qa is the parameter
      // We solve: for each ka ∈ [0, π], find energies E such that
      // |cos(qa) + (λ/q) sin(qa)| ≤ 1, where cos(ka) = RHS

      const nK = 200;
      const maxE = 40;
      const nE = 800;

      // For each energy, compute whether it's in a band
      // RHS(E) = cos(sqrt(E)) + lambda/sqrt(E) * sin(sqrt(E))
      // Band when |RHS| <= 1

      // Draw bands as shaded regions
      const bands = [];
      let inBand = false;
      let bandStart = 0;

      for (let ie = 1; ie <= nE; ie++) {
        const E = maxE * ie / nE;
        const q = Math.sqrt(E);
        const rhs = Math.cos(q) + (lambda / q) * Math.sin(q);
        const allowed = Math.abs(rhs) <= 1;

        if (allowed && !inBand) {
          bandStart = E;
          inBand = true;
        } else if (!allowed && inBand) {
          bands.push({ lo: bandStart, hi: E });
          inBand = false;
        }
      }
      if (inBand) bands.push({ lo: bandStart, hi: maxE });

      // Draw band regions
      bands.forEach((band, idx) => {
        const y1 = oy + ph - (band.hi / maxE) * ph;
        const y2 = oy + ph - (band.lo / maxE) * ph;
        ctxKP.fillStyle = idx % 2 === 0 ? 'rgba(79,195,247,0.15)' : 'rgba(102,187,106,0.15)';
        ctxKP.fillRect(ox, y1, pw, y2 - y1);
      });

      // Draw E(k) dispersion curves within each band
      bands.forEach((band, idx) => {
        ctxKP.strokeStyle = idx % 2 === 0 ? COLORS.blue : COLORS.green;
        ctxKP.lineWidth = 2;

        // Forward sweep: k from 0 to π
        ctxKP.beginPath();
        let started = false;
        for (let ie = 0; ie <= nE; ie++) {
          const E = band.lo + (band.hi - band.lo) * ie / nE;
          const q = Math.sqrt(E);
          const rhs = Math.cos(q) + (lambda / q) * Math.sin(q);
          if (Math.abs(rhs) > 1) continue;
          const ka = Math.acos(Math.max(-1, Math.min(1, rhs)));
          const px = ox + (ka / Math.PI) * pw;
          const py = oy + ph - (E / maxE) * ph;
          !started ? (ctxKP.moveTo(px, py), started = true) : ctxKP.lineTo(px, py);
        }
        ctxKP.stroke();
      });

      // Free electron parabola (λ=0 reference)
      if (lambda > 0.5) {
        ctxKP.strokeStyle = COLORS.textDim;
        ctxKP.lineWidth = 1;
        ctxKP.setLineDash([4, 4]);
        ctxKP.beginPath();
        for (let ik = 0; ik <= nK; ik++) {
          const ka = Math.PI * ik / nK;
          const E = ka * ka;
          const px = ox + (ka / Math.PI) * pw;
          const py = oy + ph - (E / maxE) * ph;
          if (py >= oy) {
            ik === 0 ? ctxKP.moveTo(px, py) : ctxKP.lineTo(px, py);
          }
        }
        ctxKP.stroke();
        ctxKP.setLineDash([]);
      }

      // Gap labels
      for (let i = 0; i < bands.length - 1 && i < 3; i++) {
        const gapMid = (bands[i].hi + bands[i + 1].lo) / 2;
        const py = oy + ph - (gapMid / maxE) * ph;
        ctxKP.fillStyle = COLORS.red;
        ctxKP.font = FONT_SM;
        ctxKP.textAlign = 'right';
        ctxKP.fillText('gap', ox + pw - 5, py + 4);
      }

      // Labels
      ctxKP.fillStyle = COLORS.text;
      ctxKP.font = FONT;
      ctxKP.textAlign = 'left';
      ctxKP.fillText('λ = ' + lambda.toFixed(1), ox + 5, oy + 16);
      if (lambda < 0.5) {
        ctxKP.fillStyle = COLORS.textDim;
        ctxKP.fillText('(nearly free electrons)', ox + 70, oy + 16);
      }

      document.getElementById('kp-lambda-val')?.replaceChildren(document.createTextNode(lambda.toFixed(1)));
    }

    lambdaSlider?.addEventListener('input', drawKronigPenney);
    drawKronigPenney();
  }

  // ----- Band Filling: Conductor vs Insulator -----
  const cBF = document.getElementById('vis-band-filling');
  if (cBF) {
    const bf = setupCanvas(cBF);
    const ctxBF = bf.ctx, WBF = bf.W, HBF = bf.H;
    const elecSlider = document.getElementById('bf-electrons');
    const fieldSlider = document.getElementById('bf-field');

    function drawBandFilling() {
      const nElec = parseFloat(elecSlider?.value || 1.0);
      const field = parseFloat(fieldSlider?.value || 0);
      clearCanvas(ctxBF, WBF, HBF);

      const ox = 50, pw = WBF - 100;
      const bandH = 100, gapH = 30;

      // Draw two bands
      const bands = [
        { y: HBF - 50 - bandH, h: bandH, label: 'Band 1 (valence)' },
        { y: HBF - 50 - 2 * bandH - gapH, h: bandH, label: 'Band 2 (conduction)' },
      ];

      bands.forEach((band, idx) => {
        // Band background
        ctxBF.fillStyle = 'rgba(255,255,255,0.05)';
        ctxBF.fillRect(ox, band.y, pw, band.h);
        ctxBF.strokeStyle = COLORS.textDim;
        ctxBF.lineWidth = 1;
        ctxBF.strokeRect(ox, band.y, pw, band.h);

        // Draw cosine E(k) curve
        ctxBF.strokeStyle = COLORS.textDim;
        ctxBF.lineWidth = 1.5;
        ctxBF.beginPath();
        for (let i = 0; i <= 200; i++) {
          const k = -Math.PI + 2 * Math.PI * i / 200;
          const E = 0.5 * (1 - Math.cos(k));
          const px = ox + ((k + Math.PI) / (2 * Math.PI)) * pw;
          const py = band.y + band.h - E * band.h;
          i === 0 ? ctxBF.moveTo(px, py) : ctxBF.lineTo(px, py);
        }
        ctxBF.stroke();

        // Label
        ctxBF.fillStyle = COLORS.textDim;
        ctxBF.font = FONT_SM;
        ctxBF.textAlign = 'right';
        ctxBF.fillText(band.label, ox + pw - 5, band.y + 14);
      });

      // Gap label
      ctxBF.fillStyle = COLORS.red;
      ctxBF.font = FONT_SM;
      ctxBF.textAlign = 'center';
      ctxBF.fillText('Band Gap', ox + pw / 2, bands[0].y - gapH / 2 + 4);

      // Fill electrons: nElec = 1 means half of band 1, nElec = 2 means full band 1
      // With applied field, shift the filling slightly
      const totalStates = 200;
      const filledStates = Math.round(nElec / 2 * totalStates);
      const shift = field * 20;

      // Draw filled states as thick colored line on the E(k) curve
      const band = bands[0];
      ctxBF.strokeStyle = COLORS.blue;
      ctxBF.lineWidth = 4;
      ctxBF.beginPath();
      let started = false;
      for (let i = 0; i <= totalStates; i++) {
        const k = -Math.PI + 2 * Math.PI * i / totalStates;
        const E = 0.5 * (1 - Math.cos(k));
        // Shift filling due to field
        const shifted_i = i - shift;
        if (shifted_i >= 0 && shifted_i < filledStates && shifted_i >= 0 && shifted_i <= totalStates) {
          const px = ox + ((k + Math.PI) / (2 * Math.PI)) * pw;
          const py = band.y + band.h - E * band.h;
          !started ? (ctxBF.moveTo(px, py), started = true) : ctxBF.lineTo(px, py);
        } else {
          started = false;
        }
      }
      ctxBF.stroke();

      // Overflow into band 2 if nElec > 2
      if (nElec > 2) {
        const band2 = bands[1];
        const overflow = Math.round((nElec - 2) / 2 * totalStates);
        ctxBF.strokeStyle = COLORS.green;
        ctxBF.lineWidth = 4;
        ctxBF.beginPath();
        let s2 = false;
        for (let i = 0; i < overflow && i <= totalStates; i++) {
          const k = -Math.PI + 2 * Math.PI * i / totalStates;
          const E = 0.5 * (1 - Math.cos(k));
          const px = ox + ((k + Math.PI) / (2 * Math.PI)) * pw;
          const py = band2.y + band2.h - E * band2.h;
          !s2 ? (ctxBF.moveTo(px, py), s2 = true) : ctxBF.lineTo(px, py);
        }
        ctxBF.stroke();
      }

      // Status label
      ctxBF.fillStyle = COLORS.text;
      ctxBF.font = FONT;
      ctxBF.textAlign = 'left';
      let status = '';
      if (nElec < 1.9) status = 'CONDUCTOR — partially filled band';
      else if (nElec > 1.9 && nElec < 2.1) status = 'INSULATOR — completely filled band';
      else status = 'CONDUCTOR — partially filled upper band';
      ctxBF.fillText(status, ox + 5, 20);

      if (field > 0 && nElec < 1.9) {
        ctxBF.fillStyle = COLORS.green;
        ctxBF.fillText('→ Net current flows (asymmetric filling)', ox + 5, 36);
      } else if (field > 0 && nElec >= 1.9 && nElec <= 2.1) {
        ctxBF.fillStyle = COLORS.red;
        ctxBF.fillText('✕ No current (cannot shift a full band)', ox + 5, 36);
      }

      document.getElementById('bf-electrons-val')?.replaceChildren(document.createTextNode(nElec.toFixed(1)));
      document.getElementById('bf-field-val')?.replaceChildren(document.createTextNode(field.toFixed(2)));
    }

    elecSlider?.addEventListener('input', drawBandFilling);
    fieldSlider?.addEventListener('input', drawBandFilling);
    drawBandFilling();
  }

  // ----- Atomic Potentials → Nearly Free Electrons -----
  const cAtom = document.getElementById('vis-atomic-potentials');
  if (cAtom) {
    const { ctx: ctxA, W: WA, H: HA } = setupCanvas(cAtom);
    const spacingSlider = document.getElementById('atom-spacing');

    function drawAtomicPotentials() {
      clearCanvas(ctxA, WA, HA);
      const spacing = parseFloat(spacingSlider?.value || 80);
      document.getElementById('atom-spacing-val')?.replaceChildren(document.createTextNode(spacing));

      const nAtoms = 7;
      const baseY = HA * 0.45;
      const wellDepth = 80;
      const wellWidth = 15;
      const totalWidth = spacing * (nAtoms - 1);
      const startX = (WA - totalWidth) / 2;

      // Draw individual potentials and their sum
      const nPx = WA;
      const sumV = new Float64Array(nPx);
      const individualV = [];

      for (let a = 0; a < nAtoms; a++) {
        const cx = startX + a * spacing;
        const pts = new Float64Array(nPx);
        for (let px = 0; px < nPx; px++) {
          const x = px;
          const r = Math.abs(x - cx);
          // Coulomb-like well: V = -depth / (1 + (r/width)^2)
          pts[px] = -wellDepth / (1 + Math.pow(r / wellWidth, 2));
        }
        individualV.push(pts);
        for (let px = 0; px < nPx; px++) sumV[px] += pts[px];
      }

      // Draw individual potentials (faded)
      ctxA.strokeStyle = 'rgba(79, 195, 247, 0.25)'; ctxA.lineWidth = 1;
      for (let a = 0; a < nAtoms; a++) {
        ctxA.beginPath();
        for (let px = 0; px < nPx; px++) {
          const y = baseY + individualV[a][px] * 0.8;
          if (px === 0) ctxA.moveTo(px, y); else ctxA.lineTo(px, y);
        }
        ctxA.stroke();
      }

      // Draw sum potential (bright)
      ctxA.strokeStyle = COLORS.green; ctxA.lineWidth = 2.5;
      ctxA.beginPath();
      let minSum = 0;
      for (let px = 0; px < nPx; px++) {
        if (sumV[px] < minSum) minSum = sumV[px];
      }
      for (let px = 0; px < nPx; px++) {
        const y = baseY + sumV[px] * 0.8;
        if (px === 0) ctxA.moveTo(px, y); else ctxA.lineTo(px, y);
      }
      ctxA.stroke();

      // Draw atom positions
      for (let a = 0; a < nAtoms; a++) {
        const cx = startX + a * spacing;
        ctxA.fillStyle = COLORS.blue;
        ctxA.beginPath(); ctxA.arc(cx, baseY + 15, 4, 0, 2 * Math.PI); ctxA.fill();
      }

      // Annotations
      ctxA.fillStyle = COLORS.textDim; ctxA.font = FONT_SM; ctxA.textAlign = 'center';
      // Show lattice spacing
      if (nAtoms > 1) {
        const x1 = startX, x2 = startX + spacing;
        const annY = baseY + 35;
        ctxA.strokeStyle = COLORS.textDim; ctxA.lineWidth = 1;
        ctxA.beginPath(); ctxA.moveTo(x1, annY); ctxA.lineTo(x2, annY); ctxA.stroke();
        ctxA.beginPath(); ctxA.moveTo(x1, annY - 4); ctxA.lineTo(x1, annY + 4); ctxA.stroke();
        ctxA.beginPath(); ctxA.moveTo(x2, annY - 4); ctxA.lineTo(x2, annY + 4); ctxA.stroke();
        ctxA.fillText('a = ' + spacing, (x1 + x2) / 2, annY + 15);
      }

      // Flatness indicator
      if (spacing < 35) {
        ctxA.fillStyle = COLORS.green; ctxA.font = FONT;
        ctxA.fillText('Nearly free! V(x) ≈ constant', WA / 2, HA - 15);
      } else if (spacing > 65) {
        ctxA.fillStyle = COLORS.blue; ctxA.font = FONT;
        ctxA.fillText('Isolated atoms: bound electrons', WA / 2, HA - 15);
      } else {
        ctxA.fillStyle = COLORS.orange; ctxA.font = FONT;
        ctxA.fillText('Overlapping potentials', WA / 2, HA - 15);
      }

      // Legend
      ctxA.font = FONT_SM; ctxA.textAlign = 'left';
      ctxA.fillStyle = 'rgba(79, 195, 247, 0.5)';
      ctxA.fillText('— Individual V(x)', 10, 20);
      ctxA.fillStyle = COLORS.green;
      ctxA.fillText('— Sum ΣV(x)', 10, 36);

      ctxA.fillStyle = COLORS.text; ctxA.font = FONT_LG; ctxA.textAlign = 'right';
      ctxA.fillText('Atomic Potentials', WA - 10, 20);
    }

    spacingSlider?.addEventListener('input', drawAtomicPotentials);
    drawAtomicPotentials();
  }
}


// =============================================================================
// CH14: Semiconductors - Band Gap
// =============================================================================
function initCh14Vis() {
  // ----- Orbital Energy Levels vs Atomic Number -----
  const cOrb = document.getElementById('vis-orbital-energies');
  if (cOrb) {
    const { ctx: ctxOE, W: WOE, H: HOE } = setupCanvas(cOrb);
    const zSlider = document.getElementById('orbital-z');

    // Approximate orbital energies (in eV, negative) as function of Z
    // Based on screened hydrogen model with empirical corrections
    const orbitalNames = ['1s','2s','2p','3s','3p','3d','4s','4p','4d','4f','5s','5p','5d','6s','6p'];
    const orbitalColors = [COLORS.blue, COLORS.green, COLORS.green, COLORS.cyan, COLORS.cyan, COLORS.cyan,
                           COLORS.orange, COLORS.orange, COLORS.orange, COLORS.orange,
                           COLORS.purple, COLORS.purple, COLORS.purple, COLORS.red, COLORS.red];
    const orbitalN = [1,2,2,3,3,3,4,4,4,4,5,5,5,6,6];
    const orbitalL = [0,0,1,0,1,2,0,1,2,3,0,1,2,0,1];

    // Screening parameters (Slater's rules approximation)
    function orbitalEnergy(Z, n, l) {
      if (Z < 1) return 0;
      // Effective nuclear charge using simplified Slater rules
      let sigma = 0;
      // Very simplified model that captures the key crossings
      if (n === 1) sigma = 0.3 * Math.min(Z - 1, 1);
      else if (n === 2 && l === 0) sigma = 2 + 0.85 * Math.min(Z - 3, 5);
      else if (n === 2 && l === 1) sigma = 2.05 + 0.85 * Math.min(Z - 3, 5);
      else if (n === 3 && l === 0) sigma = 4.15 + 0.85 * Math.max(0, Z - 11) * 0.7 + 2 * 0.85;
      else if (n === 3 && l === 1) sigma = 4.5 + 0.85 * Math.max(0, Z - 11) * 0.7 + 2 * 0.85;
      else if (n === 3 && l === 2) sigma = 5.5 + 0.85 * Math.max(0, Z - 21) * 0.5 + 8;
      else if (n === 4 && l === 0) sigma = 11 + 0.85 * Math.max(0, Z - 19) * 0.5 + 4;
      else if (n === 4 && l === 1) sigma = 14 + 0.85 * Math.max(0, Z - 31) * 0.5 + 4;
      else if (n === 4 && l === 2) sigma = 22 + 0.85 * Math.max(0, Z - 39) * 0.4;
      else if (n === 4 && l === 3) sigma = 32 + 0.85 * Math.max(0, Z - 57) * 0.35;
      else if (n === 5 && l === 0) sigma = 28 + 0.85 * Math.max(0, Z - 37) * 0.45;
      else if (n === 5 && l === 1) sigma = 32 + 0.85 * Math.max(0, Z - 49) * 0.45;
      else if (n === 5 && l === 2) sigma = 40 + 0.85 * Math.max(0, Z - 57) * 0.4;
      else if (n === 6 && l === 0) sigma = 46 + 0.85 * Math.max(0, Z - 55) * 0.4;
      else if (n === 6 && l === 1) sigma = 52 + 0.85 * Math.max(0, Z - 81) * 0.4;
      else sigma = Z * 0.65;

      const Zeff = Math.max(0.5, Z - sigma);
      return -13.6 * Zeff * Zeff / (n * n);
    }

    // Element symbols for labels
    const elements = ['','H','He','Li','Be','B','C','N','O','F','Ne',
      'Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca',
      'Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn',
      'Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr',
      'Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn',
      'Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd',
      'Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb',
      'Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg',
      'Tl','Pb','Bi','Po','At','Rn'];

    let hoverOE = -1;

    function drawOrbitalEnergies() {
      clearCanvas(ctxOE, WOE, HOE);
      const Z = parseInt(zSlider?.value || 14);
      const sym = Z <= 86 ? elements[Z] : 'Z=' + Z;
      document.getElementById('orbital-z-val')?.replaceChildren(document.createTextNode(Z + ' (' + sym + ')'));

      const ox = 65, oy = 25, pw = WOE - 85, ph = HOE - 70;
      const logEmin = -5, logEmax = 0.5; // log10(-E/Ry) range

      // Axes
      drawAxes(ctxOE, ox, oy, pw, ph, { xLabel: 'Atomic Number Z' });
      ctxOE.fillStyle = COLORS.textDim; ctxOE.font = FONT_SM; ctxOE.textAlign = 'center';
      for (let z = 10; z <= 80; z += 10) {
        ctxOE.fillText(z.toString(), ox + (z / 86) * pw, oy + ph + 14);
      }
      ctxOE.fillText('1', ox + (1 / 86) * pw, oy + ph + 14);

      // Y-axis label
      ctxOE.save(); ctxOE.translate(15, oy + ph / 2); ctxOE.rotate(-Math.PI / 2);
      ctxOE.fillStyle = COLORS.text; ctxOE.font = FONT_SM; ctxOE.textAlign = 'center';
      ctxOE.fillText('Orbital Energy (log scale)', 0, 0); ctxOE.restore();

      // Y ticks
      ctxOE.textAlign = 'right';
      const yLabels = ['-0.1','-1','-10','-100','-1000','-10000'];
      const yVals = [-0.1, -1, -10, -100, -1000, -10000];
      yVals.forEach((v, i) => {
        const logV = Math.log10(-v / 13.6);
        const py = oy + ph - ((logV - logEmin) / (logEmax - logEmin)) * ph;
        if (py > oy && py < oy + ph) {
          ctxOE.fillStyle = COLORS.textDim; ctxOE.font = '10px Inter, system-ui, sans-serif';
          ctxOE.fillText(yLabels[i] + ' eV', ox - 4, py + 3);
          ctxOE.strokeStyle = COLORS.grid; ctxOE.lineWidth = 0.5;
          ctxOE.beginPath(); ctxOE.moveTo(ox, py); ctxOE.lineTo(ox + pw, py); ctxOE.stroke();
        }
      });

      // Draw orbital curves
      for (let oi = 0; oi < orbitalNames.length; oi++) {
        const n = orbitalN[oi], l = orbitalL[oi];
        // Only draw where orbital exists (Z large enough to have this orbital occupied or relevant)
        const minZ = n === 1 ? 1 : (n === 2 ? 2 : (n === 3 ? 11 : (n === 4 ? 19 : (n === 5 ? 37 : 55))));

        ctxOE.strokeStyle = orbitalColors[oi]; ctxOE.lineWidth = 1.8;
        ctxOE.beginPath();
        let started = false;
        for (let z = Math.max(1, minZ - 2); z <= 86; z++) {
          const E = orbitalEnergy(z, n, l);
          if (E >= -0.01) continue;
          const logE = Math.log10(-E / 13.6);
          const px = ox + (z / 86) * pw;
          const py = oy + ph - ((logE - logEmin) / (logEmax - logEmin)) * ph;
          if (py < oy || py > oy + ph) continue;
          !started ? (ctxOE.moveTo(px, py), started = true) : ctxOE.lineTo(px, py);
        }
        ctxOE.stroke();

        // Label at right end
        const E86 = orbitalEnergy(86, n, l);
        if (E86 < -0.01) {
          const logE = Math.log10(-E86 / 13.6);
          const py = oy + ph - ((logE - logEmin) / (logEmax - logEmin)) * ph;
          if (py > oy && py < oy + ph) {
            ctxOE.fillStyle = orbitalColors[oi]; ctxOE.font = '10px Inter, system-ui, sans-serif';
            ctxOE.textAlign = 'left';
            ctxOE.fillText(orbitalNames[oi], ox + pw + 4, py + 3);
          }
        }
      }

      // Highlight selected Z with vertical line
      const zPx = ox + (Z / 86) * pw;
      ctxOE.strokeStyle = COLORS.yellow; ctxOE.lineWidth = 1.5; ctxOE.setLineDash([4, 4]);
      ctxOE.beginPath(); ctxOE.moveTo(zPx, oy); ctxOE.lineTo(zPx, oy + ph); ctxOE.stroke();
      ctxOE.setLineDash([]);

      // Mark energy levels at selected Z
      ctxOE.fillStyle = COLORS.yellow;
      for (let oi = 0; oi < orbitalNames.length; oi++) {
        const E = orbitalEnergy(Z, orbitalN[oi], orbitalL[oi]);
        if (E >= -0.01) continue;
        const logE = Math.log10(-E / 13.6);
        const py = oy + ph - ((logE - logEmin) / (logEmax - logEmin)) * ph;
        if (py > oy && py < oy + ph) {
          ctxOE.beginPath(); ctxOE.arc(zPx, py, 3.5, 0, 2 * Math.PI); ctxOE.fill();
        }
      }

      ctxOE.fillStyle = COLORS.yellow; ctxOE.font = FONT; ctxOE.textAlign = 'center';
      ctxOE.fillText(sym + ' (Z = ' + Z + ')', zPx, oy - 5);

      // Noble gas markers
      const nobles = [{z:2,s:'He'},{z:10,s:'Ne'},{z:18,s:'Ar'},{z:36,s:'Kr'},{z:54,s:'Xe'},{z:86,s:'Rn'}];
      ctxOE.fillStyle = COLORS.textDim; ctxOE.font = '9px Inter, system-ui, sans-serif'; ctxOE.textAlign = 'center';
      nobles.forEach(ng => {
        ctxOE.fillText(ng.s, ox + (ng.z / 86) * pw, oy + ph + 26);
      });

      ctxOE.fillStyle = COLORS.text; ctxOE.font = FONT_LG; ctxOE.textAlign = 'left';
      ctxOE.fillText('Orbital Energies vs Z', ox + 5, oy + 14);
    }

    zSlider?.addEventListener('input', drawOrbitalEnergies);
    drawOrbitalEnergies();
  }

  // ----- Molecular Orbital Diagram -----
  const cMO = document.getElementById('vis-mo-diagram');
  if (cMO) {
    const { ctx: ctxMO, W: WMO, H: HMO } = setupCanvas(cMO);
    const molSelect = document.getElementById('mo-molecule');

    const molecules = {
      'H2': {
        name: 'H₂', atoms: ['H','H'],
        leftLevels: [{e: 0.5, label: '1s', n: 1}],
        rightLevels: [{e: 0.5, label: '1s', n: 1}],
        moLevels: [{e: 0.3, label: 'σ₁ₛ', n: 2, type: 'bonding'}, {e: 0.7, label: 'σ*₁ₛ', n: 0, type: 'antibonding'}],
        bondOrder: 1
      },
      'HF': {
        name: 'HF', atoms: ['H','F'],
        leftLevels: [{e: 0.55, label: '1s', n: 1}],
        rightLevels: [{e: 0.3, label: '2p', n: 5}],
        moLevels: [{e: 0.2, label: 'σ (bonding)', n: 2, type: 'bonding'}, {e: 0.35, label: 'π nb', n: 4, type: 'nonbonding'}, {e: 0.7, label: 'σ* (antibonding)', n: 0, type: 'antibonding'}],
        bondOrder: 1
      },
      'He2': {
        name: 'He₂', atoms: ['He','He'],
        leftLevels: [{e: 0.5, label: '1s', n: 2}],
        rightLevels: [{e: 0.5, label: '1s', n: 2}],
        moLevels: [{e: 0.3, label: 'σ₁ₛ', n: 2, type: 'bonding'}, {e: 0.7, label: 'σ*₁ₛ', n: 2, type: 'antibonding'}],
        bondOrder: 0
      },
      'N2': {
        name: 'N₂', atoms: ['N','N'],
        leftLevels: [{e: 0.65, label: '2s', n: 2}, {e: 0.4, label: '2p', n: 3}],
        rightLevels: [{e: 0.65, label: '2s', n: 2}, {e: 0.4, label: '2p', n: 3}],
        moLevels: [
          {e: 0.18, label: 'σ₂ₛ', n: 2, type: 'bonding'},
          {e: 0.28, label: 'π₂ₚ', n: 4, type: 'bonding'},
          {e: 0.35, label: 'σ₂ₚ', n: 2, type: 'bonding'},
          {e: 0.58, label: 'π*₂ₚ', n: 0, type: 'antibonding'},
          {e: 0.72, label: 'σ*₂ₛ', n: 2, type: 'antibonding'},
          {e: 0.82, label: 'σ*₂ₚ', n: 0, type: 'antibonding'}
        ],
        bondOrder: 3
      }
    };

    function drawMODiagram() {
      clearCanvas(ctxMO, WMO, HMO);
      const mol = molecules[molSelect?.value || 'H2'];

      const colW = WMO / 3;
      const oy = 40, ph = HMO - 80;

      // Column headers
      ctxMO.fillStyle = COLORS.text; ctxMO.font = FONT; ctxMO.textAlign = 'center';
      ctxMO.fillText(mol.atoms[0] + ' (AO)', colW * 0.5, 22);
      ctxMO.fillText(mol.name + ' (MO)', colW * 1.5, 22);
      ctxMO.fillText(mol.atoms[1] + ' (AO)', colW * 2.5, 22);

      // Energy axis
      ctxMO.save(); ctxMO.translate(12, oy + ph / 2); ctxMO.rotate(-Math.PI / 2);
      ctxMO.fillStyle = COLORS.textDim; ctxMO.font = FONT_SM; ctxMO.textAlign = 'center';
      ctxMO.fillText('Energy →', 0, 0); ctxMO.restore();

      // Draw energy levels
      function drawLevel(x, w, e, label, electrons, color) {
        const y = oy + ph - e * ph;
        ctxMO.strokeStyle = color; ctxMO.lineWidth = 2.5;
        ctxMO.beginPath(); ctxMO.moveTo(x - w / 2, y); ctxMO.lineTo(x + w / 2, y); ctxMO.stroke();
        // Label
        ctxMO.fillStyle = color; ctxMO.font = FONT_SM; ctxMO.textAlign = 'center';
        ctxMO.fillText(label, x, y + 16);
        // Electrons as arrows
        for (let i = 0; i < Math.min(electrons, 2); i++) {
          const ex = x + (i === 0 ? -8 : 8);
          const dir = i === 0 ? -1 : 1;
          ctxMO.strokeStyle = COLORS.yellow; ctxMO.lineWidth = 2;
          ctxMO.beginPath(); ctxMO.moveTo(ex, y - 5); ctxMO.lineTo(ex, y - 18); ctxMO.stroke();
          // Arrowhead
          ctxMO.beginPath();
          if (dir === -1) { // up arrow
            ctxMO.moveTo(ex - 4, y - 14); ctxMO.lineTo(ex, y - 18); ctxMO.lineTo(ex + 4, y - 14);
          } else { // down arrow
            ctxMO.moveTo(ex - 4, y - 9); ctxMO.lineTo(ex, y - 5); ctxMO.lineTo(ex + 4, y - 9);
          }
          ctxMO.stroke();
        }
      }

      // Left atomic orbitals
      mol.leftLevels.forEach(lv => drawLevel(colW * 0.5, 70, lv.e, lv.label, lv.n, COLORS.blue));

      // Right atomic orbitals
      mol.rightLevels.forEach(lv => drawLevel(colW * 2.5, 70, lv.e, lv.label, lv.n, COLORS.red));

      // Molecular orbitals
      mol.moLevels.forEach(lv => {
        const color = lv.type === 'bonding' ? COLORS.green : (lv.type === 'antibonding' ? COLORS.red : COLORS.purple);
        drawLevel(colW * 1.5, 90, lv.e, lv.label, lv.n, color);
      });

      // Dashed connection lines
      ctxMO.strokeStyle = 'rgba(255,255,255,0.12)'; ctxMO.lineWidth = 1; ctxMO.setLineDash([3, 4]);
      mol.leftLevels.forEach(lv => {
        mol.moLevels.forEach(mlv => {
          const y1 = oy + ph - lv.e * ph, y2 = oy + ph - mlv.e * ph;
          ctxMO.beginPath(); ctxMO.moveTo(colW * 0.5 + 35, y1); ctxMO.lineTo(colW * 1.5 - 45, y2); ctxMO.stroke();
        });
      });
      mol.rightLevels.forEach(lv => {
        mol.moLevels.forEach(mlv => {
          const y1 = oy + ph - lv.e * ph, y2 = oy + ph - mlv.e * ph;
          ctxMO.beginPath(); ctxMO.moveTo(colW * 2.5 - 35, y1); ctxMO.lineTo(colW * 1.5 + 45, y2); ctxMO.stroke();
        });
      });
      ctxMO.setLineDash([]);

      // Bond order
      ctxMO.fillStyle = COLORS.text; ctxMO.font = FONT; ctxMO.textAlign = 'center';
      const bondText = mol.bondOrder === 0 ? 'Bond order = 0 (no bond forms!)' : 'Bond order = ' + mol.bondOrder;
      ctxMO.fillText(bondText, WMO / 2, HMO - 12);
      if (mol.bondOrder === 0) { ctxMO.fillStyle = COLORS.red; ctxMO.fillText(bondText, WMO / 2, HMO - 12); }

      // Legend
      ctxMO.font = FONT_SM; ctxMO.textAlign = 'left';
      ctxMO.fillStyle = COLORS.green; ctxMO.fillText('Bonding', WMO - 150, oy + 14);
      ctxMO.fillStyle = COLORS.red; ctxMO.fillText('Antibonding', WMO - 150, oy + 30);
      ctxMO.fillStyle = COLORS.yellow; ctxMO.fillText('↑↓ = electrons', WMO - 150, oy + 46);
    }

    molSelect?.addEventListener('change', drawMODiagram);
    drawMODiagram();
  }

  // ----- Ionization Energies -----
  const cIon = document.getElementById('vis-ionization');
  if (cIon) {
    const { ctx: ctxIon, W: WIon, H: HIon } = setupCanvas(cIon);
    const periodSelect = document.getElementById('ion-period');

    // First ionization energies in eV (Z=1..54)
    const ionData = [
      13.60,24.59,5.39,9.32,8.30,11.26,14.53,13.62,17.42,21.56,
      5.14,7.65,5.99,8.15,10.49,10.36,12.97,15.76,4.34,6.11,
      6.56,6.83,6.75,6.77,7.43,7.90,7.88,7.64,7.73,9.39,
      6.00,7.90,9.79,9.75,11.81,14.00,4.18,5.69,6.22,6.63,
      6.76,7.09,7.28,7.36,7.46,8.34,7.58,8.99,5.79,7.34,
      8.61,9.01,10.45,12.13
    ];
    const elSym = ['','H','He','Li','Be','B','C','N','O','F','Ne',
      'Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca',
      'Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn',
      'Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr',
      'Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn',
      'Sb','Te','I','Xe'];
    const periodBounds = [[1,2],[3,10],[11,18],[19,36],[37,54]];
    const periodColors = [COLORS.red, COLORS.orange, COLORS.green, COLORS.blue, COLORS.purple];

    let hoverIon = -1;

    function drawIonization() {
      clearCanvas(ctxIon, WIon, HIon);
      const selPeriod = parseInt(periodSelect?.value || 0);

      const ox = 60, oy = 25, pw = WIon - 80, ph = HIon - 70;
      const maxE = 26;

      drawAxes(ctxIon, ox, oy, pw, ph, { xLabel: 'Atomic Number Z' });

      // Y ticks
      ctxIon.fillStyle = COLORS.textDim; ctxIon.font = FONT_SM; ctxIon.textAlign = 'right';
      for (let e = 0; e <= 25; e += 5) {
        const py = oy + ph - (e / maxE) * ph;
        ctxIon.fillText(e.toString(), ox - 5, py + 4);
        ctxIon.strokeStyle = COLORS.grid; ctxIon.lineWidth = 0.5;
        ctxIon.beginPath(); ctxIon.moveTo(ox, py); ctxIon.lineTo(ox + pw, py); ctxIon.stroke();
      }
      // X ticks
      ctxIon.textAlign = 'center';
      for (let z = 10; z <= 50; z += 10) {
        ctxIon.fillText(z.toString(), ox + (z / 54) * pw, oy + ph + 14);
      }

      ctxIon.save(); ctxIon.translate(15, oy + ph / 2); ctxIon.rotate(-Math.PI / 2);
      ctxIon.fillStyle = COLORS.text; ctxIon.font = FONT_SM; ctxIon.textAlign = 'center';
      ctxIon.fillText('Ionization Energy (eV)', 0, 0); ctxIon.restore();

      // Connect points with line
      ctxIon.strokeStyle = 'rgba(255,255,255,0.2)'; ctxIon.lineWidth = 1;
      ctxIon.beginPath();
      for (let z = 1; z <= ionData.length; z++) {
        const px = ox + (z / 54) * pw;
        const py = oy + ph - (ionData[z - 1] / maxE) * ph;
        z === 1 ? ctxIon.moveTo(px, py) : ctxIon.lineTo(px, py);
      }
      ctxIon.stroke();

      // Draw data points colored by period
      for (let z = 1; z <= ionData.length; z++) {
        let pIdx = -1;
        for (let p = 0; p < periodBounds.length; p++) {
          if (z >= periodBounds[p][0] && z <= periodBounds[p][1]) { pIdx = p; break; }
        }
        const highlight = selPeriod === 0 || selPeriod === pIdx + 1;
        const px = ox + (z / 54) * pw;
        const py = oy + ph - (ionData[z - 1] / maxE) * ph;

        ctxIon.globalAlpha = highlight ? 1.0 : 0.2;
        ctxIon.fillStyle = pIdx >= 0 ? periodColors[pIdx] : COLORS.textDim;
        ctxIon.beginPath(); ctxIon.arc(px, py, 4, 0, 2 * Math.PI); ctxIon.fill();

        // Label noble gases and alkali metals
        const nobles = [2,10,18,36,54];
        const alkalis = [1,3,11,19,37];
        if (nobles.includes(z) || alkalis.includes(z)) {
          ctxIon.fillStyle = highlight ? COLORS.text : 'rgba(255,255,255,0.15)';
          ctxIon.font = '10px Inter, system-ui, sans-serif';
          ctxIon.textAlign = 'center';
          ctxIon.fillText(elSym[z], px, py - 8);
        }
        ctxIon.globalAlpha = 1.0;
      }

      // Hover info
      if (hoverIon >= 1 && hoverIon <= ionData.length) {
        const z = hoverIon;
        const px = ox + (z / 54) * pw;
        const py = oy + ph - (ionData[z - 1] / maxE) * ph;
        ctxIon.fillStyle = COLORS.yellow;
        ctxIon.beginPath(); ctxIon.arc(px, py, 6, 0, 2 * Math.PI); ctxIon.fill();
        ctxIon.fillStyle = COLORS.text; ctxIon.font = FONT; ctxIon.textAlign = 'center';
        ctxIon.fillText(elSym[z] + ' (Z=' + z + '): ' + ionData[z - 1].toFixed(2) + ' eV', ox + pw / 2, oy + ph + 38);
      }

      // Legend
      ctxIon.font = FONT_SM; ctxIon.textAlign = 'left';
      periodBounds.forEach((pb, i) => {
        ctxIon.fillStyle = periodColors[i];
        ctxIon.globalAlpha = selPeriod === 0 || selPeriod === i + 1 ? 1 : 0.3;
        ctxIon.fillText('Period ' + (i + 1), ox + pw - 80, oy + 14 + i * 14);
        ctxIon.globalAlpha = 1;
      });

      ctxIon.fillStyle = COLORS.text; ctxIon.font = FONT_LG; ctxIon.textAlign = 'left';
      ctxIon.fillText('First Ionization Energies', ox + 5, oy + 14);
    }

    cIon.addEventListener('mousemove', (e) => {
      const rect = cIon.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const ox = 60, pw = WIon - 80;
      hoverIon = Math.round((mx - ox) / pw * 54);
      drawIonization();
    });
    cIon.addEventListener('mouseleave', () => { hoverIon = -1; drawIonization(); });
    periodSelect?.addEventListener('change', drawIonization);
    drawIonization();
  }

  // ----- Band Filling in 3rd-Row Metals -----
  const cBF3 = document.getElementById('vis-band-filling-3rd');
  if (cBF3) {
    const { ctx: ctxBF3, W: WBF3, H: HBF3 } = setupCanvas(cBF3);
    const bf3Select = document.getElementById('bf3-element');

    const elemData = {
      'Na': { name: 'Na', config: '[Ne] 3s¹', valence: 1, total: 8, fill3s: 0.5, fill3p: 0 },
      'Mg': { name: 'Mg', config: '[Ne] 3s²', valence: 2, total: 8, fill3s: 1.0, fill3p: 0.15 },
      'Al': { name: 'Al', config: '[Ne] 3s² 3p¹', valence: 3, total: 8, fill3s: 1.0, fill3p: 0.35 },
      'Si': { name: 'Si', config: '[Ne] 3s² 3p²', valence: 4, total: 8, fill3s: 1.0, fill3p: 0.5 },
    };

    function drawBandFilling3rd() {
      clearCanvas(ctxBF3, WBF3, HBF3);
      const elem = elemData[bf3Select?.value || 'Na'];

      const ox = 80, pw = WBF3 - 160;
      const bandH = 50, gap = 15;

      // Band structure: 1s, 2s/2p, 3s/3p, 4s/3d/4p (from bottom to top)
      const bands = [
        { label: '1s band', y: HBF3 - 60, fill: 1.0, color: COLORS.textDim, cap: 2 },
        { label: '2s/2p band', y: HBF3 - 60 - bandH - gap, fill: 1.0, color: COLORS.blue, cap: 8 },
        { label: '3s/3p band', y: HBF3 - 60 - 2 * (bandH + gap), fill: (elem.valence) / elem.total, color: COLORS.green, cap: 8 },
        { label: '4s/3d/4p band', y: HBF3 - 60 - 3 * (bandH + gap), fill: 0, color: COLORS.orange, cap: 18 },
      ];

      bands.forEach((band, idx) => {
        const y = band.y - bandH;

        // Band background
        ctxBF3.fillStyle = 'rgba(255,255,255,0.04)';
        ctxBF3.fillRect(ox, y, pw, bandH);
        ctxBF3.strokeStyle = 'rgba(255,255,255,0.15)'; ctxBF3.lineWidth = 1;
        ctxBF3.strokeRect(ox, y, pw, bandH);

        // Fill
        if (band.fill > 0) {
          ctxBF3.fillStyle = band.color; ctxBF3.globalAlpha = 0.3;
          ctxBF3.fillRect(ox, y + bandH * (1 - band.fill), pw, bandH * band.fill);
          ctxBF3.globalAlpha = 1;
        }

        // Label
        ctxBF3.fillStyle = band.color; ctxBF3.font = FONT_SM; ctxBF3.textAlign = 'right';
        ctxBF3.fillText(band.label, ox - 8, y + bandH / 2 + 4);

        // Capacity label
        ctxBF3.fillStyle = COLORS.textDim; ctxBF3.textAlign = 'left';
        ctxBF3.fillText(band.cap + ' states', ox + pw + 8, y + bandH / 2 + 4);
      });

      // Fermi level
      const fermiY = bands[2].y - bandH * bands[2].fill;
      ctxBF3.strokeStyle = COLORS.yellow; ctxBF3.lineWidth = 2; ctxBF3.setLineDash([6, 4]);
      ctxBF3.beginPath(); ctxBF3.moveTo(ox - 5, fermiY); ctxBF3.lineTo(ox + pw + 5, fermiY); ctxBF3.stroke();
      ctxBF3.setLineDash([]);
      ctxBF3.fillStyle = COLORS.yellow; ctxBF3.font = FONT; ctxBF3.textAlign = 'left';
      ctxBF3.fillText('εF', ox + pw + 8, fermiY + 5);

      // Band gaps
      for (let i = 0; i < bands.length - 1; i++) {
        const gapTop = bands[i + 1].y;
        const gapBot = bands[i].y - bandH;
        if (i < 2) { // show gap label for lower bands
          ctxBF3.fillStyle = COLORS.textDim; ctxBF3.font = '9px Inter, system-ui, sans-serif'; ctxBF3.textAlign = 'center';
          ctxBF3.fillText('gap', ox + pw / 2, (gapTop + gapBot) / 2 + 3);
        }
      }

      // 3s/3p overlap indication
      if (elem.valence >= 2) {
        const band3 = bands[2];
        const overlapY = band3.y - bandH * 0.5;
        ctxBF3.strokeStyle = COLORS.textDim; ctxBF3.lineWidth = 1; ctxBF3.setLineDash([2, 3]);
        ctxBF3.beginPath(); ctxBF3.moveTo(ox, overlapY); ctxBF3.lineTo(ox + pw, overlapY); ctxBF3.stroke();
        ctxBF3.setLineDash([]);
        ctxBF3.fillStyle = COLORS.textDim; ctxBF3.font = '9px Inter, system-ui, sans-serif'; ctxBF3.textAlign = 'right';
        ctxBF3.fillText('3s top / 3p bottom overlap', ox + pw - 5, overlapY - 4);
      }

      // Element info
      ctxBF3.fillStyle = COLORS.text; ctxBF3.font = FONT_LG; ctxBF3.textAlign = 'left';
      ctxBF3.fillText(elem.name + ': ' + elem.config, ox, 22);
      ctxBF3.fillStyle = COLORS.textDim; ctxBF3.font = FONT;
      ctxBF3.fillText(elem.valence + ' valence electrons in 3s/3p band (' + (elem.valence) + '/' + elem.total + ' filled)', ox, 40);

      // Conductor/semiconductor classification
      const isConductor = elem.fill3p < 0.5 || elem.fill3s < 1.0;
      ctxBF3.fillStyle = isConductor ? COLORS.green : COLORS.orange;
      ctxBF3.font = FONT;
      const classLabel = elem.name === 'Si' ? 'SEMICONDUCTOR — half-filled band, prefers covalent bonds' : 'CONDUCTOR — partially filled band';
      ctxBF3.fillText(classLabel, ox, HBF3 - 15);
    }

    bf3Select?.addEventListener('change', drawBandFilling3rd);
    drawBandFilling3rd();
  }

  const c = document.getElementById('vis-bands');
  if (c) {
  const { ctx, W, H } = setupCanvas(c);

  const tempSlider = document.getElementById('band-temp');
  const gapSlider = document.getElementById('band-gap');

  function draw() {
    const T = parseFloat(tempSlider?.value || 300);
    const Eg = parseFloat(gapSlider?.value || 1);
    clearCanvas(ctx, W, H);

    const midY = H / 2;
    const bandH = 80;
    const gapPx = Eg * 40;

    // Valence band
    ctx.fillStyle = 'rgba(79,195,247,0.2)';
    ctx.fillRect(50, midY + gapPx / 2, W - 100, bandH);
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 2;
    ctx.strokeRect(50, midY + gapPx / 2, W - 100, bandH);

    // Conduction band
    ctx.fillStyle = 'rgba(239,83,80,0.1)';
    ctx.fillRect(50, midY - gapPx / 2 - bandH, W - 100, bandH);
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 2;
    ctx.strokeRect(50, midY - gapPx / 2 - bandH, W - 100, bandH);

    // Band gap
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(50, midY - gapPx / 2, W - 100, gapPx);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, midY - gapPx / 2); ctx.lineTo(W - 50, midY - gapPx / 2);
    ctx.moveTo(50, midY + gapPx / 2); ctx.lineTo(W - 50, midY + gapPx / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Thermally excited electrons
    const kT = T / 11600;
    const nElectrons = Math.round(30 * Math.exp(-Eg / (2 * kT)));

    ctx.fillStyle = COLORS.red;
    for (let i = 0; i < nElectrons; i++) {
      const x = 80 + Math.random() * (W - 160);
      const y = midY - gapPx / 2 - 10 - Math.random() * (bandH - 20);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill();
    }

    // Holes
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < nElectrons; i++) {
      const x = 80 + Math.random() * (W - 160);
      const y = midY + gapPx / 2 + 10 + Math.random() * (bandH - 20);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.stroke();
    }

    // Labels
    ctx.fillStyle = COLORS.text; ctx.font = FONT; ctx.textAlign = 'center';
    ctx.fillText('Conduction Band', W / 2, midY - gapPx / 2 - bandH - 8);
    ctx.fillText('Valence Band', W / 2, midY + gapPx / 2 + bandH + 18);

    ctx.fillStyle = COLORS.orange;
    ctx.font = FONT_SM;
    ctx.fillText('Eg = ' + Eg.toFixed(2) + ' eV', W - 70, midY + 5);

    // Gap arrows
    ctx.strokeStyle = COLORS.orange;
    ctx.lineWidth = 1;
    drawArrow(ctx, W - 70, midY - gapPx / 2 + 5, W - 70, midY - gapPx / 2);
    drawArrow(ctx, W - 70, midY + gapPx / 2 - 5, W - 70, midY + gapPx / 2);

    ctx.fillStyle = COLORS.text; ctx.font = FONT; ctx.textAlign = 'left';
    ctx.fillText('T = ' + T + ' K, kT = ' + (kT * 1000).toFixed(1) + ' meV', 20, 25);
    ctx.fillText('Excited electrons: ~' + nElectrons, 20, 45);

    document.getElementById('band-temp-val')?.replaceChildren(document.createTextNode(T.toString()));
    document.getElementById('band-gap-val')?.replaceChildren(document.createTextNode(Eg.toFixed(2)));
  }

  tempSlider?.addEventListener('input', draw);
  gapSlider?.addEventListener('input', draw);
  draw();
  }

  // ----- Diode I-V Characteristic -----
  const cIV = document.getElementById('vis-iv-curve');
  if (cIV) {
    const ivS = setupCanvas(cIV);
    const ctxIV = ivS.ctx, WIV = ivS.W, HIV = ivS.H;
    const ivTempSlider = document.getElementById('iv-temp');

    function drawIV() {
      const T = parseFloat(ivTempSlider?.value || 300);
      clearCanvas(ctxIV, WIV, HIV);

      // Physical constants
      const kB = 1.380649e-23;
      const e = 1.60218e-19;
      const Is = 1e-9;  // 1 nA saturation current

      const Vmin = -1.0, Vmax = 1.0;
      const VT = kB * T / e;  // thermal voltage (~26 mV at 300 K)

      // Current scale: cap forward current display at ~20 mA
      const Imax_display = 20e-3;
      const Imin_display = -2e-3;  // small reverse saturation region
      const Irange = Imax_display - Imin_display;

      const ox = 70, oy = 25;
      const pw = WIV - ox - 30, ph = HIV - oy - 55;

      // Map V -> pixel x
      const vToPx = (v) => ox + ((v - Vmin) / (Vmax - Vmin)) * pw;
      // Map I -> pixel y (I in Amps)
      const iToPy = (i) => {
        const iClamp = Math.max(Imin_display, Math.min(Imax_display, i));
        return oy + ph - ((iClamp - Imin_display) / Irange) * ph;
      };

      // Zero-current axis y position
      const zeroIPy = iToPy(0);
      // Zero-voltage axis x position
      const zeroVPx = vToPx(0);

      // Axes – draw manually so origin is at (V=0, I=0) visible inside plot
      ctxIV.strokeStyle = COLORS.axis;
      ctxIV.lineWidth = 1;
      // x-axis at I=0
      ctxIV.beginPath(); ctxIV.moveTo(ox, zeroIPy); ctxIV.lineTo(ox + pw, zeroIPy); ctxIV.stroke();
      // y-axis at V=0
      ctxIV.beginPath(); ctxIV.moveTo(zeroVPx, oy); ctxIV.lineTo(zeroVPx, oy + ph); ctxIV.stroke();

      // Axis labels
      ctxIV.fillStyle = COLORS.text;
      ctxIV.font = FONT_SM;
      ctxIV.textAlign = 'center';
      ctxIV.fillText('Voltage V (V)', ox + pw / 2, oy + ph + 28);
      ctxIV.save();
      ctxIV.translate(ox - 42, oy + ph / 2);
      ctxIV.rotate(-Math.PI / 2);
      ctxIV.fillText('Current I (mA)', 0, 0);
      ctxIV.restore();

      // V-axis tick labels
      ctxIV.fillStyle = COLORS.textDim;
      ctxIV.font = '10px Inter, system-ui, sans-serif';
      ctxIV.textAlign = 'center';
      for (let vt = Vmin; vt <= Vmax + 0.01; vt += 0.5) {
        const px = vToPx(vt);
        ctxIV.fillText(vt.toFixed(1), px, zeroIPy + 14);
      }

      // I-axis tick labels (mA)
      ctxIV.textAlign = 'right';
      const iTicks = [0, 5, 10, 15, 20];
      iTicks.forEach(imA => {
        const py = iToPy(imA * 1e-3);
        ctxIV.fillText(imA.toString(), ox - 4, py + 4);
      });

      // Reverse bias shading
      ctxIV.fillStyle = 'rgba(239,83,80,0.06)';
      ctxIV.fillRect(ox, oy, zeroVPx - ox, ph);

      // Breakdown label
      ctxIV.fillStyle = 'rgba(239,83,80,0.45)';
      ctxIV.font = FONT_SM;
      ctxIV.textAlign = 'center';
      ctxIV.fillText('Reverse bias', ox + (zeroVPx - ox) / 2, oy + 14);

      // Forward bias shading
      ctxIV.fillStyle = 'rgba(79,195,247,0.05)';
      ctxIV.fillRect(zeroVPx, oy, ox + pw - zeroVPx, ph);

      // I-V curve
      ctxIV.strokeStyle = COLORS.blue;
      ctxIV.lineWidth = 2.5;
      ctxIV.beginPath();
      const nPtsIV = 500;
      for (let i = 0; i <= nPtsIV; i++) {
        const V = Vmin + (Vmax - Vmin) * i / nPtsIV;
        const I = Is * (Math.exp(V / VT) - 1);
        const px = vToPx(V);
        const py = iToPy(I);
        i === 0 ? ctxIV.moveTo(px, py) : ctxIV.lineTo(px, py);
      }
      ctxIV.stroke();

      // Saturation current line (reverse bias region)
      ctxIV.strokeStyle = COLORS.orange;
      ctxIV.lineWidth = 1.2;
      ctxIV.setLineDash([4, 4]);
      const IsatPy = iToPy(-Is);
      ctxIV.beginPath();
      ctxIV.moveTo(ox, IsatPy);
      ctxIV.lineTo(zeroVPx - 5, IsatPy);
      ctxIV.stroke();
      ctxIV.setLineDash([]);
      ctxIV.fillStyle = COLORS.orange;
      ctxIV.font = '10px Inter, system-ui, sans-serif';
      ctxIV.textAlign = 'left';
      ctxIV.fillText('I\u209B = 1 nA', ox + 4, IsatPy - 4);

      // Turn-on voltage marker (~0.6 V)
      const Vturn = 0.6;
      const VturnPx = vToPx(Vturn);
      const IturnA = Is * (Math.exp(Vturn / VT) - 1);
      const IturnPy = iToPy(IturnA);
      ctxIV.strokeStyle = COLORS.green;
      ctxIV.lineWidth = 1;
      ctxIV.setLineDash([3, 3]);
      ctxIV.beginPath();
      ctxIV.moveTo(VturnPx, zeroIPy);
      ctxIV.lineTo(VturnPx, Math.max(oy, IturnPy));
      ctxIV.stroke();
      ctxIV.setLineDash([]);
      ctxIV.fillStyle = COLORS.green;
      ctxIV.font = FONT_SM;
      ctxIV.textAlign = 'center';
      ctxIV.fillText('V\u209C\u1D52 \u2248 0.6 V', VturnPx + 24, zeroIPy + 16);

      // Info labels
      ctxIV.fillStyle = COLORS.text;
      ctxIV.font = FONT_LG;
      ctxIV.textAlign = 'left';
      ctxIV.fillText('p-n Junction Diode I-V', ox + 5, oy + 14);
      ctxIV.font = FONT_SM;
      ctxIV.fillStyle = COLORS.textDim;
      ctxIV.fillText('I = I\u209B(e^{eV/kT} \u2212 1)', ox + 5, oy + 28);
      ctxIV.fillStyle = COLORS.cyan;
      ctxIV.fillText('T = ' + T.toFixed(0) + ' K,  V_T = ' + (VT * 1000).toFixed(1) + ' mV', ox + 5, oy + 44);

      document.getElementById('iv-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(0)));
    }

    ivTempSlider?.addEventListener('input', drawIV);
    drawIV();
  }

  // ----- Energy Level Splitting into Bands -----
  const cBS = document.getElementById('vis-band-splitting');
  if (cBS) {
    const bsS = setupCanvas(cBS);
    const ctxBS = bsS.ctx, WBS = bsS.W, HBS = bsS.H;
    const bsNSlider = document.getElementById('band-n-atoms');

    // Three base energy levels (normalised 0..1 where 0=bottom, 1=top of plot area)
    const baseLevels = [0.22, 0.52, 0.82];
    const levelColors = [COLORS.blue, COLORS.green, COLORS.orange];
    const levelNames = ['E\u2081 (1s)', 'E\u2082 (2s)', 'E\u2083 (2p)'];

    // Spread factor per level (fraction of total plot height) as N grows
    const spreads = [0.06, 0.10, 0.14];

    function drawBandSplitting() {
      const N = parseInt(bsNSlider?.value || 5);
      clearCanvas(ctxBS, WBS, HBS);

      const ox = 20, oy = 20;
      const pw = WBS - ox - 20, ph = HBS - oy - 40;

      // Vertical axis label
      ctxBS.fillStyle = COLORS.textDim;
      ctxBS.font = FONT_SM;
      ctxBS.textAlign = 'center';
      ctxBS.save();
      ctxBS.translate(12, oy + ph / 2);
      ctxBS.rotate(-Math.PI / 2);
      ctxBS.fillText('Energy E', 0, 0);
      ctxBS.restore();

      // Title
      ctxBS.fillStyle = COLORS.text;
      ctxBS.font = FONT_LG;
      ctxBS.textAlign = 'center';
      ctxBS.fillText('N = ' + N + ' atom' + (N > 1 ? 's' : ''), WBS / 2, oy + 14);

      // Left label: isolated atom
      ctxBS.fillStyle = COLORS.textDim;
      ctxBS.font = FONT_SM;
      ctxBS.textAlign = 'center';
      ctxBS.fillText('Isolated atom', ox + pw * 0.12, oy + ph + 22);
      ctxBS.fillText(N + ' atoms together', ox + pw * 0.78, oy + ph + 22);

      // Divider
      const divX = ox + pw * 0.42;
      ctxBS.strokeStyle = 'rgba(255,255,255,0.08)';
      ctxBS.lineWidth = 1;
      ctxBS.setLineDash([4, 5]);
      ctxBS.beginPath();
      ctxBS.moveTo(divX, oy + 24);
      ctxBS.lineTo(divX, oy + ph);
      ctxBS.stroke();
      ctxBS.setLineDash([]);

      // Left section x-range
      const lxMid = ox + pw * 0.12;
      const lxHalf = pw * 0.10;

      // Right section x-range
      const rxLeft = ox + pw * 0.50;
      const rxRight = ox + pw * 0.95;
      const rxWidth = rxRight - rxLeft;

      // Band opacity increases with N so lines merge
      const lineAlpha = N <= 1 ? 1.0 : Math.max(0.18, 1.0 - (N - 1) * 0.04);

      baseLevels.forEach((lvl, li) => {
        const color = levelColors[li];
        const spread = spreads[li];

        // Y coordinate of base energy
        const baseY = oy + ph - lvl * ph;

        // Left: single level line
        ctxBS.strokeStyle = color;
        ctxBS.lineWidth = 2;
        ctxBS.beginPath();
        ctxBS.moveTo(lxMid - lxHalf, baseY);
        ctxBS.lineTo(lxMid + lxHalf, baseY);
        ctxBS.stroke();

        // Level label
        ctxBS.fillStyle = color;
        ctxBS.font = FONT_SM;
        ctxBS.textAlign = 'left';
        ctxBS.fillText(levelNames[li], lxMid + lxHalf + 4, baseY + 4);

        // Right: N split levels
        if (N === 1) {
          // Single atom on right too
          ctxBS.strokeStyle = color;
          ctxBS.lineWidth = 2;
          ctxBS.beginPath();
          ctxBS.moveTo(rxLeft, baseY);
          ctxBS.lineTo(rxRight, baseY);
          ctxBS.stroke();
        } else {
          const halfSpread = spread * ph / 2;
          const lineSpacing = N > 1 ? (2 * halfSpread) / (N - 1) : 0;
          // Band fill when many lines
          if (N >= 8) {
            const bandColor = color.startsWith('#') ? color : color;
            ctxBS.fillStyle = color.replace(')', ', 0.12)').replace('rgb', 'rgba');
            // simple rect for band
            ctxBS.globalAlpha = 0.15;
            ctxBS.fillStyle = color;
            ctxBS.fillRect(rxLeft, baseY - halfSpread, rxWidth, halfSpread * 2);
            ctxBS.globalAlpha = 1.0;
          }

          for (let n = 0; n < N; n++) {
            const offsetY = N === 1 ? 0 : -halfSpread + n * lineSpacing;
            const lineY = baseY + offsetY;
            const alpha = N <= 4 ? 1.0 : lineAlpha;
            const lw = N <= 4 ? 1.8 : Math.max(0.6, 1.8 - N * 0.05);

            ctxBS.globalAlpha = alpha;
            ctxBS.strokeStyle = color;
            ctxBS.lineWidth = lw;
            ctxBS.beginPath();
            ctxBS.moveTo(rxLeft, lineY);
            ctxBS.lineTo(rxRight, lineY);
            ctxBS.stroke();
          }
          ctxBS.globalAlpha = 1.0;

          // Band boundary lines
          if (N >= 2) {
            ctxBS.strokeStyle = color;
            ctxBS.lineWidth = 1.2;
            ctxBS.setLineDash([3, 3]);
            ctxBS.beginPath();
            ctxBS.moveTo(rxLeft - 5, baseY - halfSpread);
            ctxBS.lineTo(rxRight, baseY - halfSpread);
            ctxBS.moveTo(rxLeft - 5, baseY + halfSpread);
            ctxBS.lineTo(rxRight, baseY + halfSpread);
            ctxBS.stroke();
            ctxBS.setLineDash([]);
          }

          // Band label on right
          if (N >= 3) {
            ctxBS.fillStyle = color;
            ctxBS.globalAlpha = 0.8;
            ctxBS.font = '10px Inter, system-ui, sans-serif';
            ctxBS.textAlign = 'right';
            ctxBS.fillText(N + ' levels', rxRight - 2, baseY - halfSpread - 3);
            ctxBS.globalAlpha = 1.0;
          }
        }

        // Connecting dashed lines from isolated level to band edges
        if (N >= 2) {
          const halfSpread = spread * ph / 2;
          ctxBS.strokeStyle = 'rgba(255,255,255,0.12)';
          ctxBS.lineWidth = 0.8;
          ctxBS.setLineDash([3, 6]);
          ctxBS.beginPath();
          ctxBS.moveTo(lxMid + lxHalf, baseY);
          ctxBS.lineTo(rxLeft, baseY - halfSpread);
          ctxBS.moveTo(lxMid + lxHalf, baseY);
          ctxBS.lineTo(rxLeft, baseY + halfSpread);
          ctxBS.stroke();
          ctxBS.setLineDash([]);
        }
      });

      // Caption
      ctxBS.fillStyle = COLORS.textDim;
      ctxBS.font = FONT_SM;
      ctxBS.textAlign = 'center';
      if (N === 1) {
        ctxBS.fillText('Single atom: discrete levels', WBS / 2, HBS - 8);
      } else if (N < 6) {
        ctxBS.fillText('Each level splits into ' + N + ' closely-spaced levels', WBS / 2, HBS - 8);
      } else {
        ctxBS.fillText('Levels merge into quasi-continuous bands (N = ' + N + ')', WBS / 2, HBS - 8);
      }

      document.getElementById('band-n-atoms-val')?.replaceChildren(document.createTextNode(N.toString()));
    }

    bsNSlider?.addEventListener('input', drawBandSplitting);
    drawBandSplitting();
  }

  // ----- p-n Junction -----
  const cPN = document.getElementById('vis-pn-junction');
  if (cPN) {
    const pn = setupCanvas(cPN);
    const ctxPN = pn.ctx, WPN = pn.W, HPN = pn.H;
    const voltageSlider = document.getElementById('pn-voltage');

    function drawPNJunction() {
      const V = parseFloat(voltageSlider?.value || 0);
      clearCanvas(ctxPN, WPN, HPN);

      const cx = WPN / 2, oy = 30, ph = HPN - 80;

      // Draw band diagram
      const bandWidth = WPN / 2 - 40;

      // p-side (left): valence band near top, conduction band above
      // n-side (right): both bands shifted down
      const Eg = 60; // band gap in pixels
      const shift = V * 25; // voltage shifts bands

      // p-side bands
      const pValTop = oy + ph / 2;
      const pCondBot = pValTop - Eg;

      // n-side bands (shifted by voltage)
      const nValTop = pValTop + 30 - shift;
      const nCondBot = nValTop - Eg;

      // Draw p-side
      ctxPN.fillStyle = 'rgba(239,83,80,0.15)';
      ctxPN.fillRect(20, pValTop, bandWidth, ph - (pValTop - oy));
      ctxPN.fillStyle = 'rgba(239,83,80,0.08)';
      ctxPN.fillRect(20, oy, bandWidth, pCondBot - oy);

      // Draw n-side
      ctxPN.fillStyle = 'rgba(79,195,247,0.15)';
      ctxPN.fillRect(cx + 20, nValTop, bandWidth, oy + ph - nValTop);
      ctxPN.fillStyle = 'rgba(79,195,247,0.08)';
      ctxPN.fillRect(cx + 20, oy, bandWidth, nCondBot - oy);

      // Band edges
      ctxPN.lineWidth = 2.5;
      // p-side conduction band
      ctxPN.strokeStyle = COLORS.red;
      ctxPN.beginPath();
      ctxPN.moveTo(20, pCondBot);
      ctxPN.lineTo(cx - 20, pCondBot);
      ctxPN.stroke();
      // p-side valence band
      ctxPN.beginPath();
      ctxPN.moveTo(20, pValTop);
      ctxPN.lineTo(cx - 20, pValTop);
      ctxPN.stroke();

      // n-side conduction band
      ctxPN.strokeStyle = COLORS.blue;
      ctxPN.beginPath();
      ctxPN.moveTo(cx + 20, nCondBot);
      ctxPN.lineTo(WPN - 20, nCondBot);
      ctxPN.stroke();
      // n-side valence band
      ctxPN.beginPath();
      ctxPN.moveTo(cx + 20, nValTop);
      ctxPN.lineTo(WPN - 20, nValTop);
      ctxPN.stroke();

      // Junction region - smooth connection
      ctxPN.strokeStyle = COLORS.textDim;
      ctxPN.lineWidth = 1.5;
      ctxPN.setLineDash([4, 4]);
      // Connect conduction bands
      ctxPN.beginPath();
      ctxPN.moveTo(cx - 20, pCondBot);
      ctxPN.bezierCurveTo(cx, pCondBot, cx, nCondBot, cx + 20, nCondBot);
      ctxPN.stroke();
      // Connect valence bands
      ctxPN.beginPath();
      ctxPN.moveTo(cx - 20, pValTop);
      ctxPN.bezierCurveTo(cx, pValTop, cx, nValTop, cx + 20, nValTop);
      ctxPN.stroke();
      ctxPN.setLineDash([]);

      // Depletion region
      ctxPN.fillStyle = 'rgba(255,255,255,0.03)';
      const depW = Math.max(20, 60 - Math.abs(shift));
      ctxPN.fillRect(cx - depW, oy, 2 * depW, ph);
      ctxPN.strokeStyle = COLORS.textDim;
      ctxPN.lineWidth = 1;
      ctxPN.strokeRect(cx - depW, oy, 2 * depW, ph);

      // Charge carriers
      // p-side: holes (empty circles)
      for (let i = 0; i < 8; i++) {
        const x = 40 + Math.random() * (bandWidth - 40);
        const y = pValTop + 10 + Math.random() * 30;
        ctxPN.strokeStyle = COLORS.red;
        ctxPN.lineWidth = 1.5;
        ctxPN.beginPath();
        ctxPN.arc(x, y, 4, 0, 2 * Math.PI);
        ctxPN.stroke();
      }
      // n-side: electrons (filled circles)
      for (let i = 0; i < 8; i++) {
        const x = cx + 40 + Math.random() * (bandWidth - 40);
        const y = nCondBot - 10 - Math.random() * 30;
        ctxPN.fillStyle = COLORS.blue;
        ctxPN.beginPath();
        ctxPN.arc(x, y, 4, 0, 2 * Math.PI);
        ctxPN.fill();
      }

      // Labels
      ctxPN.fillStyle = COLORS.text;
      ctxPN.font = FONT;
      ctxPN.textAlign = 'center';
      ctxPN.fillText('p-type', bandWidth / 2 + 20, HPN - 10);
      ctxPN.fillText('n-type', cx + 20 + bandWidth / 2, HPN - 10);
      ctxPN.fillText('V = ' + V.toFixed(1) + ' V_T', cx, HPN - 10);

      // Forward/reverse bias indicator
      ctxPN.font = FONT_SM;
      if (V > 0.5) {
        ctxPN.fillStyle = COLORS.green;
        ctxPN.fillText('Forward bias — current flows', cx, oy - 10);
      } else if (V < -0.5) {
        ctxPN.fillStyle = COLORS.red;
        ctxPN.fillText('Reverse bias — depletion widens', cx, oy - 10);
      } else {
        ctxPN.fillStyle = COLORS.textDim;
        ctxPN.fillText('No bias — equilibrium', cx, oy - 10);
      }

      // Band labels
      ctxPN.font = FONT_SM;
      ctxPN.textAlign = 'left';
      ctxPN.fillStyle = COLORS.textDim;
      ctxPN.fillText('Ec', 22, pCondBot - 5);
      ctxPN.fillText('Ev', 22, pValTop + 14);
      ctxPN.fillText('Eg', 22, (pCondBot + pValTop) / 2 + 4);

      document.getElementById('pn-voltage-val')?.replaceChildren(document.createTextNode(V.toFixed(1)));
    }

    voltageSlider?.addEventListener('input', drawPNJunction);
    drawPNJunction();
  }

  // ----- Doping: n-type and p-type -----
  const cDO = document.getElementById('vis-doping');
  if (cDO) {
    const dop = setupCanvas(cDO);
    const ctxDO = dop.ctx, WDO = dop.W, HDO = dop.H;
    const typeSelect = document.getElementById('doping-type');
    const dopTempSlider = document.getElementById('doping-temp');

    function drawDoping() {
      const dopType = typeSelect?.value || 'intrinsic';
      const T = parseFloat(dopTempSlider?.value || 1);
      clearCanvas(ctxDO, WDO, HDO);

      const ox = 50, pw = WDO - 100, bandH = 60, gapH = 80;
      const valY = HDO - 50, condY = valY - bandH - gapH;

      // Draw bands
      ctxDO.fillStyle = 'rgba(79,195,247,0.1)';
      ctxDO.fillRect(ox, condY, pw, bandH);
      ctxDO.fillStyle = 'rgba(239,83,80,0.1)';
      ctxDO.fillRect(ox, valY - bandH, pw, bandH);

      ctxDO.strokeStyle = COLORS.blue;
      ctxDO.lineWidth = 2;
      ctxDO.beginPath();
      ctxDO.moveTo(ox, condY + bandH);
      ctxDO.lineTo(ox + pw, condY + bandH);
      ctxDO.stroke();

      ctxDO.strokeStyle = COLORS.red;
      ctxDO.beginPath();
      ctxDO.moveTo(ox, valY - bandH);
      ctxDO.lineTo(ox + pw, valY - bandH);
      ctxDO.stroke();

      // Gap label
      const gapMidY = (condY + bandH + valY - bandH) / 2;
      ctxDO.fillStyle = COLORS.textDim;
      ctxDO.font = FONT_SM;
      ctxDO.textAlign = 'center';
      ctxDO.fillText('Band Gap (Eg)', ox + pw / 2, gapMidY + 4);

      // Fermi level
      let fermiY = gapMidY;
      if (dopType === 'n-type') fermiY = gapMidY - gapH * 0.35;
      else if (dopType === 'p-type') fermiY = gapMidY + gapH * 0.35;

      ctxDO.strokeStyle = COLORS.yellow;
      ctxDO.lineWidth = 1.5;
      ctxDO.setLineDash([8, 4]);
      ctxDO.beginPath();
      ctxDO.moveTo(ox, fermiY);
      ctxDO.lineTo(ox + pw, fermiY);
      ctxDO.stroke();
      ctxDO.setLineDash([]);
      ctxDO.fillStyle = COLORS.yellow;
      ctxDO.font = FONT_SM;
      ctxDO.textAlign = 'left';
      ctxDO.fillText('μ (Fermi level)', ox + pw + 5, fermiY + 4);

      // Donor/acceptor levels
      if (dopType === 'n-type') {
        const donorY = condY + bandH + 10;
        ctxDO.strokeStyle = COLORS.green;
        ctxDO.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          const x = ox + 40 + i * (pw - 80) / 4;
          ctxDO.beginPath();
          ctxDO.moveTo(x - 15, donorY);
          ctxDO.lineTo(x + 15, donorY);
          ctxDO.stroke();
        }
        ctxDO.fillStyle = COLORS.green;
        ctxDO.textAlign = 'right';
        ctxDO.fillText('Donor levels', ox - 5, donorY + 4);
      } else if (dopType === 'p-type') {
        const acceptorY = valY - bandH - 10;
        ctxDO.strokeStyle = COLORS.purple;
        ctxDO.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          const x = ox + 40 + i * (pw - 80) / 4;
          ctxDO.beginPath();
          ctxDO.moveTo(x - 15, acceptorY);
          ctxDO.lineTo(x + 15, acceptorY);
          ctxDO.stroke();
        }
        ctxDO.fillStyle = COLORS.purple;
        ctxDO.textAlign = 'right';
        ctxDO.fillText('Acceptor levels', ox - 5, acceptorY + 4);
      }

      // Draw electrons and holes based on temperature
      const nCarriers = Math.round(3 + T * 5);
      if (dopType === 'n-type' || dopType === 'intrinsic') {
        ctxDO.fillStyle = COLORS.blue;
        const nE = dopType === 'n-type' ? nCarriers + 4 : nCarriers;
        for (let i = 0; i < nE; i++) {
          const x = ox + 20 + Math.random() * (pw - 40);
          const y = condY + Math.random() * bandH;
          ctxDO.beginPath(); ctxDO.arc(x, y, 3, 0, 2 * Math.PI); ctxDO.fill();
        }
      }
      if (dopType === 'p-type' || dopType === 'intrinsic') {
        ctxDO.strokeStyle = COLORS.red;
        ctxDO.lineWidth = 1.5;
        const nH = dopType === 'p-type' ? nCarriers + 4 : nCarriers;
        for (let i = 0; i < nH; i++) {
          const x = ox + 20 + Math.random() * (pw - 40);
          const y = valY - bandH + Math.random() * bandH;
          ctxDO.beginPath(); ctxDO.arc(x, y, 3, 0, 2 * Math.PI); ctxDO.stroke();
        }
      }

      // Labels
      ctxDO.fillStyle = COLORS.text;
      ctxDO.font = FONT;
      ctxDO.textAlign = 'left';
      const labels = { 'intrinsic': 'Intrinsic Semiconductor', 'n-type': 'n-type (Donor Doping)', 'p-type': 'p-type (Acceptor Doping)' };
      ctxDO.fillText(labels[dopType] + ' — T/T₀ = ' + T.toFixed(2), ox, 18);

      ctxDO.textAlign = 'center';
      ctxDO.fillStyle = COLORS.blue;
      ctxDO.fillText('Conduction Band', ox + pw / 2, condY + 14);
      ctxDO.fillStyle = COLORS.red;
      ctxDO.fillText('Valence Band', ox + pw / 2, valY - 10);

      document.getElementById('doping-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(2)));
    }

    typeSelect?.addEventListener('change', drawDoping);
    dopTempSlider?.addEventListener('input', drawDoping);
    drawDoping();
  }

  // ----- Band Structure Comparison -----
  const cBC = document.getElementById('vis-band-compare');
  if (cBC) {
    const {ctx: ctxBC, W: WBC, H: HBC} = setupCanvas(cBC);
    const gapSlider = document.getElementById('bc-gap');
    const bcTempSlider = document.getElementById('bc-temp');

    function drawBandCompare() {
      clearCanvas(ctxBC, WBC, HBC);
      const Eg = parseFloat(gapSlider?.value || 1.1);
      const T = parseFloat(bcTempSlider?.value || 300);

      const bandW = 120, bandH = 80;
      const gap = Eg * 15; // scale eV to pixels
      const kBT = T / 11600; // eV

      // Three cases: metal (Eg=0), semiconductor (Eg~1), insulator (Eg>4)
      const cases = [
        {name: 'Metal', eg: 0},
        {name: 'Semiconductor', eg: Eg},
        {name: 'Insulator', eg: Math.max(Eg, 5)}
      ];

      // Draw the user-adjusted case in the center
      const cx = WBC / 2;
      const midY = HBC / 2;

      // Conduction band
      const cbTop = midY - gap / 2 - bandH;
      const cbBot = midY - gap / 2;
      ctxBC.fillStyle = 'rgba(79,195,247,0.2)';
      ctxBC.fillRect(cx - bandW / 2, cbTop, bandW, bandH);
      ctxBC.strokeStyle = COLORS.blue; ctxBC.lineWidth = 2;
      ctxBC.strokeRect(cx - bandW / 2, cbTop, bandW, bandH);
      ctxBC.fillStyle = COLORS.blue; ctxBC.font = FONT; ctxBC.textAlign = 'center';
      ctxBC.fillText('Conduction', cx, cbTop + 15);

      // Valence band
      const vbTop = midY + gap / 2;
      const vbBot = vbTop + bandH;
      ctxBC.fillStyle = 'rgba(239,83,80,0.2)';
      ctxBC.fillRect(cx - bandW / 2, vbTop, bandW, bandH);
      ctxBC.strokeStyle = COLORS.red; ctxBC.lineWidth = 2;
      ctxBC.strokeRect(cx - bandW / 2, vbTop, bandW, bandH);
      ctxBC.fillStyle = COLORS.red; ctxBC.font = FONT; ctxBC.textAlign = 'center';
      ctxBC.fillText('Valence', cx, vbBot - 5);

      // Fill valence band
      ctxBC.fillStyle = 'rgba(239,83,80,0.4)';
      ctxBC.fillRect(cx - bandW / 2 + 2, vbTop + 2, bandW - 4, bandH - 4);

      // Fermi level
      const Ef = midY; // in the gap
      ctxBC.strokeStyle = COLORS.green; ctxBC.lineWidth = 1.5;
      ctxBC.setLineDash([5, 5]);
      ctxBC.beginPath(); ctxBC.moveTo(cx - bandW / 2 - 20, Ef); ctxBC.lineTo(cx + bandW / 2 + 20, Ef); ctxBC.stroke();
      ctxBC.setLineDash([]);
      ctxBC.fillStyle = COLORS.green; ctxBC.font = FONT_SM; ctxBC.textAlign = 'left';
      ctxBC.fillText('E_F', cx + bandW / 2 + 25, Ef + 4);

      // Bandgap label
      if (Eg > 0.1) {
        ctxBC.strokeStyle = COLORS.orange; ctxBC.lineWidth = 1;
        drawArrow(ctxBC, cx + bandW / 2 + 10, cbBot, cx + bandW / 2 + 10, vbTop, 5);
        ctxBC.fillStyle = COLORS.orange; ctxBC.font = FONT_SM; ctxBC.textAlign = 'left';
        ctxBC.fillText('E_g = ' + Eg.toFixed(1) + ' eV', cx + bandW / 2 + 15, midY + 4);
      }

      // Electron occupation in conduction band (Fermi-Dirac)
      if (Eg < 10 && kBT > 0.001) {
        const nExcited = Math.exp(-Eg / (2 * kBT));
        const nDots = Math.round(Math.min(nExcited * 50, 30));
        for (let i = 0; i < nDots; i++) {
          const ex = cx - bandW / 2 + 5 + Math.random() * (bandW - 10);
          const ey = cbBot - 5 - Math.random() * (bandH - 10);
          ctxBC.beginPath(); ctxBC.arc(ex, ey, 2.5, 0, 2 * Math.PI);
          ctxBC.fillStyle = COLORS.yellow; ctxBC.fill();
        }
        // Holes in valence band
        for (let i = 0; i < nDots; i++) {
          const hx = cx - bandW / 2 + 5 + Math.random() * (bandW - 10);
          const hy = vbTop + 5 + Math.random() * 15;
          ctxBC.beginPath(); ctxBC.arc(hx, hy, 2.5, 0, 2 * Math.PI);
          ctxBC.strokeStyle = COLORS.yellow; ctxBC.lineWidth = 1;
          ctxBC.stroke();
        }
      }

      // Right panel: Fermi-Dirac distribution
      const ox = cx + bandW / 2 + 80, oy2 = cbTop, ph2 = vbBot - cbTop;
      const fdW = 100;

      // f(E) curve
      ctxBC.strokeStyle = COLORS.green; ctxBC.lineWidth = 2;
      ctxBC.beginPath();
      for (let i = 0; i <= 100; i++) {
        const E_eV = -Eg / 2 + (i / 100) * (Eg + 4); // energy range
        const f = 1.0 / (Math.exp((E_eV) / kBT) + 1); // relative to Ef
        const py = Ef - E_eV * 15;
        const px = ox + f * fdW;
        if (py >= oy2 && py <= oy2 + ph2) {
          if (i === 0) ctxBC.moveTo(px, py); else ctxBC.lineTo(px, py);
        }
      }
      ctxBC.stroke();

      ctxBC.strokeStyle = COLORS.axis; ctxBC.lineWidth = 1;
      ctxBC.beginPath(); ctxBC.moveTo(ox, oy2); ctxBC.lineTo(ox, oy2 + ph2); ctxBC.stroke();
      ctxBC.fillStyle = COLORS.textDim; ctxBC.font = FONT_SM; ctxBC.textAlign = 'center';
      ctxBC.fillText('f(E)', ox + fdW / 2, oy2 + ph2 + 15);

      // Classification
      let classification;
      if (Eg < 0.1) classification = 'Metal (no gap)';
      else if (Eg < 4) classification = 'Semiconductor (E_g = ' + Eg.toFixed(1) + ' eV)';
      else classification = 'Insulator (E_g = ' + Eg.toFixed(1) + ' eV)';

      ctxBC.fillStyle = COLORS.text; ctxBC.font = FONT_LG; ctxBC.textAlign = 'center';
      ctxBC.fillText(classification, cx, 18);

      // Conductivity estimate
      const sigma = Eg < 0.1 ? 'High' : Math.exp(-Eg / (2 * kBT)) > 0.01 ? 'Moderate' : 'Very low';
      ctxBC.fillStyle = COLORS.textDim; ctxBC.font = FONT_SM;
      ctxBC.fillText('Conductivity: ' + sigma + '  |  kT = ' + (kBT * 1000).toFixed(1) + ' meV', cx, HBC - 8);

      document.getElementById('bc-gap-val')?.replaceChildren(document.createTextNode(Eg.toFixed(1)));
      document.getElementById('bc-temp-val')?.replaceChildren(document.createTextNode(T));
    }

    gapSlider?.addEventListener('input', drawBandCompare);
    bcTempSlider?.addEventListener('input', drawBandCompare);
    drawBandCompare();
  }

  // ----- Double Well Splitting -----
  const cWell = document.getElementById('vis-well-splitting');
  if (cWell) {
    const { ctx: ctxW, W: WW, H: HW } = setupCanvas(cWell);
    const sepSlider = document.getElementById('well-sep');

    function drawWellSplitting() {
      clearCanvas(ctxW, WW, HW);
      const sep = parseFloat(sepSlider?.value || 80);
      document.getElementById('well-sep-val')?.replaceChildren(document.createTextNode(sep));

      const cx = WW / 2, baseY = HW * 0.65;
      const wellW = 30, wellD = 100;
      const halfSep = sep * 1.5;

      // Left well center, right well center
      const lx = cx - halfSep, rx = cx + halfSep;

      // Draw wells
      function drawWell(x0) {
        ctxW.strokeStyle = COLORS.blue; ctxW.lineWidth = 2;
        ctxW.beginPath();
        // Left wall
        ctxW.moveTo(x0 - wellW * 2, baseY - wellD * 0.3);
        ctxW.lineTo(x0 - wellW, baseY - wellD * 0.3);
        // Down into well
        ctxW.lineTo(x0 - wellW, baseY + wellD * 0.5);
        // Bottom
        ctxW.lineTo(x0 + wellW, baseY + wellD * 0.5);
        // Up
        ctxW.lineTo(x0 + wellW, baseY - wellD * 0.3);
        ctxW.lineTo(x0 + wellW * 2, baseY - wellD * 0.3);
        ctxW.stroke();
      }

      drawWell(lx);
      drawWell(rx);

      // Energy level in isolated well
      const e0Y = baseY + wellD * 0.15;
      const Delta = Math.max(0, 40 * Math.exp(-sep / 20)); // splitting decreases with distance

      if (sep > 50) {
        // Show degenerate levels
        ctxW.strokeStyle = COLORS.green; ctxW.lineWidth = 2;
        ctxW.beginPath(); ctxW.moveTo(lx - wellW + 3, e0Y); ctxW.lineTo(lx + wellW - 3, e0Y); ctxW.stroke();
        ctxW.beginPath(); ctxW.moveTo(rx - wellW + 3, e0Y); ctxW.lineTo(rx + wellW - 3, e0Y); ctxW.stroke();

        ctxW.fillStyle = COLORS.green; ctxW.font = FONT_SM; ctxW.textAlign = 'left';
        ctxW.fillText('ε₀', rx + wellW + 5, e0Y + 4);
        ctxW.fillText('ε₀', lx - wellW - 20, e0Y + 4);
      }

      // When close: show split levels
      if (Delta > 1) {
        const ePlusY = e0Y + Delta;
        const eMinusY = e0Y - Delta;

        // Bonding (lower, symmetric)
        ctxW.strokeStyle = COLORS.green; ctxW.lineWidth = 2;
        ctxW.beginPath(); ctxW.moveTo(cx - 60, eMinusY); ctxW.lineTo(cx + 60, eMinusY); ctxW.stroke();
        // Antibonding (higher, antisymmetric)
        ctxW.strokeStyle = COLORS.red; ctxW.lineWidth = 2;
        ctxW.beginPath(); ctxW.moveTo(cx - 60, ePlusY); ctxW.lineTo(cx + 60, ePlusY); ctxW.stroke();

        // Labels
        ctxW.fillStyle = COLORS.green; ctxW.font = FONT_SM; ctxW.textAlign = 'left';
        ctxW.fillText('ε₋ = ε₀ − Δ  (ψ₊, bonding)', cx + 65, eMinusY + 4);
        ctxW.fillStyle = COLORS.red;
        ctxW.fillText('ε₊ = ε₀ + Δ  (ψ₋, antibonding)', cx + 65, ePlusY + 4);

        // Splitting bracket
        ctxW.strokeStyle = COLORS.yellow; ctxW.lineWidth = 1;
        const bx = cx - 70;
        ctxW.beginPath(); ctxW.moveTo(bx, eMinusY); ctxW.lineTo(bx, ePlusY); ctxW.stroke();
        ctxW.beginPath(); ctxW.moveTo(bx - 4, eMinusY); ctxW.lineTo(bx + 4, eMinusY); ctxW.stroke();
        ctxW.beginPath(); ctxW.moveTo(bx - 4, ePlusY); ctxW.lineTo(bx + 4, ePlusY); ctxW.stroke();
        ctxW.fillStyle = COLORS.yellow; ctxW.font = FONT; ctxW.textAlign = 'right';
        ctxW.fillText('2Δ', bx - 6, (eMinusY + ePlusY) / 2 + 5);
      }

      // Wavefunctions when close enough
      if (sep < 40 && Delta > 5) {
        ctxW.globalAlpha = 0.3;
        // Symmetric (bonding) wavefunction
        ctxW.strokeStyle = COLORS.green; ctxW.lineWidth = 1.5;
        ctxW.beginPath();
        for (let px = cx - 120; px <= cx + 120; px++) {
          const psi = Math.exp(-Math.pow((px - lx) / 25, 2)) + Math.exp(-Math.pow((px - rx) / 25, 2));
          ctxW.lineTo(px, e0Y - Delta - psi * 20);
        }
        ctxW.stroke();
        ctxW.globalAlpha = 1;
      }

      ctxW.fillStyle = COLORS.text; ctxW.font = FONT_LG; ctxW.textAlign = 'left';
      ctxW.fillText('Double Well Energy Splitting', 10, 20);
      ctxW.fillStyle = COLORS.textDim; ctxW.font = FONT_SM;
      ctxW.fillText('Separation: ' + sep, 10, 38);
    }

    sepSlider?.addEventListener('input', drawWellSplitting);
    drawWellSplitting();
  }

  // ----- Occupation vs Bandgap -----
  const cOcc = document.getElementById('vis-occupation-bandgap');
  if (cOcc) {
    const { ctx: ctxO, W: WO, H: HO } = setupCanvas(cOcc);
    const occTempSlider = document.getElementById('occgap-temp');

    function drawOccupationBandgap() {
      clearCanvas(ctxO, WO, HO);
      const T = parseFloat(occTempSlider?.value || 300);
      document.getElementById('occgap-temp-val')?.replaceChildren(document.createTextNode(T));

      const ox = 70, oy = HO - 50, pw = WO - 100, ph = HO - 80;
      const kB = 8.617e-5; // eV/K
      const kT = kB * T;

      // Axes
      ctxO.strokeStyle = COLORS.axis; ctxO.lineWidth = 1;
      ctxO.beginPath(); ctxO.moveTo(ox, oy); ctxO.lineTo(ox + pw, oy); ctxO.stroke();
      ctxO.beginPath(); ctxO.moveTo(ox, oy); ctxO.lineTo(ox, oy - ph); ctxO.stroke();

      ctxO.fillStyle = COLORS.text; ctxO.font = FONT; ctxO.textAlign = 'center';
      ctxO.fillText('Bandgap εbg (eV)', ox + pw / 2, oy + 30);
      ctxO.save(); ctxO.translate(18, oy - ph / 2); ctxO.rotate(-Math.PI / 2);
      ctxO.fillText('log₁₀ f(εc)', 0, 0); ctxO.restore();

      // Plot log10(f) vs bandgap, f = 1/(exp(εbg/2kT) + 1)
      const bgMax = 10; // eV
      const logMin = -30;
      const nPts = 300;

      ctxO.strokeStyle = COLORS.blue; ctxO.lineWidth = 2.5;
      ctxO.beginPath();
      for (let i = 0; i < nPts; i++) {
        const bg = (i / (nPts - 1)) * bgMax;
        const f = 1 / (Math.exp(bg / (2 * kT)) + 1);
        const logF = Math.log10(Math.max(f, 1e-35));
        const x = ox + (bg / bgMax) * pw;
        const y = oy - ((logF - logMin) / (0 - logMin)) * ph;
        if (y < oy - ph) continue;
        if (i === 0) ctxO.moveTo(x, y); else ctxO.lineTo(x, y);
      }
      ctxO.stroke();

      // Y-axis labels
      ctxO.fillStyle = COLORS.textDim; ctxO.font = FONT_SM; ctxO.textAlign = 'right';
      for (let lg = 0; lg >= logMin; lg -= 5) {
        const y = oy - ((lg - logMin) / (0 - logMin)) * ph;
        ctxO.fillText(lg.toString(), ox - 8, y + 4);
        ctxO.strokeStyle = COLORS.grid; ctxO.lineWidth = 0.5;
        ctxO.beginPath(); ctxO.moveTo(ox, y); ctxO.lineTo(ox + pw, y); ctxO.stroke();
      }

      // X-axis labels
      ctxO.fillStyle = COLORS.textDim; ctxO.font = FONT_SM; ctxO.textAlign = 'center';
      for (let bg = 0; bg <= bgMax; bg += 2) {
        const x = ox + (bg / bgMax) * pw;
        ctxO.fillText(bg.toString(), x, oy + 15);
      }

      // Mark specific materials
      const materials = [
        { name: 'Si', bg: 1.08, color: COLORS.green },
        { name: 'GaAs', bg: 1.42, color: COLORS.cyan },
        { name: 'Diamond', bg: 5.4, color: COLORS.purple },
        { name: 'NaCl', bg: 8.9, color: COLORS.orange },
      ];

      materials.forEach(m => {
        const x = ox + (m.bg / bgMax) * pw;
        const f = 1 / (Math.exp(m.bg / (2 * kT)) + 1);
        const logF = Math.log10(Math.max(f, 1e-35));
        const y = oy - ((logF - logMin) / (0 - logMin)) * ph;

        ctxO.strokeStyle = m.color; ctxO.lineWidth = 1; ctxO.setLineDash([3, 3]);
        ctxO.beginPath(); ctxO.moveTo(x, oy); ctxO.lineTo(x, Math.max(y, oy - ph)); ctxO.stroke();
        ctxO.setLineDash([]);

        if (y >= oy - ph) {
          ctxO.fillStyle = m.color;
          ctxO.beginPath(); ctxO.arc(x, y, 4, 0, 2 * Math.PI); ctxO.fill();
        }

        ctxO.fillStyle = m.color; ctxO.font = FONT_SM; ctxO.textAlign = 'center';
        ctxO.fillText(m.name, x, oy - ph - 5);
        ctxO.fillText(m.bg + ' eV', x, oy - ph + 10);
      });

      // NA line
      const naLogF = Math.log10(6.022e23);
      const naY = oy - (((-naLogF) - logMin) / (0 - logMin)) * ph;
      if (naY > oy - ph && naY < oy) {
        ctxO.strokeStyle = COLORS.yellow; ctxO.lineWidth = 1; ctxO.setLineDash([6, 4]);
        ctxO.beginPath(); ctxO.moveTo(ox, naY); ctxO.lineTo(ox + pw, naY); ctxO.stroke();
        ctxO.setLineDash([]);
        ctxO.fillStyle = COLORS.yellow; ctxO.font = FONT_SM; ctxO.textAlign = 'left';
        ctxO.fillText('f = 1/Nₐ (insulator threshold)', ox + 5, naY - 5);
      }

      ctxO.fillStyle = COLORS.text; ctxO.font = FONT_LG; ctxO.textAlign = 'left';
      ctxO.fillText('Conduction Probability vs Bandgap (T = ' + T + ' K)', ox, oy - ph - 12);
    }

    occTempSlider?.addEventListener('input', drawOccupationBandgap);
    drawOccupationBandgap();
  }
}


// =============================================================================
// CH15: Stars - HR Diagram
// =============================================================================
function initCh15Vis() {

  // =================================================================
  // Jeans Instability - Star Formation Simulation
  // =================================================================
  const cJ = document.getElementById('vis-jeans');
  if (cJ) {
    const {ctx: ctxJ, W: WJ, H: HJ} = setupCanvas(cJ);
    const jeansPlayBtn = document.getElementById('jeans-play');
    const jeansResetBtn = document.getElementById('jeans-reset');
    const jeansTempSlider = document.getElementById('jeans-temp');

    // Particles representing gas
    const N = 600;
    let particles = [];
    let jeansPlaying = false, jeansTime = 0;
    let protostars = []; // collapsed clumps become glowing protostars

    function initParticles() {
      particles = [];
      protostars = [];
      jeansTime = 0;
      // Seed several density perturbations (overdense regions)
      const seeds = [];
      const rng = mulberry32(17);
      const nSeeds = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < nSeeds; i++) {
        seeds.push({
          x: 80 + rng() * (WJ - 160),
          y: 60 + rng() * (HJ - 140),
          strength: 0.3 + rng() * 0.5
        });
      }
      for (let i = 0; i < N; i++) {
        let x, y;
        // 40% of particles clustered near seeds, 60% uniform
        if (rng() < 0.4 && seeds.length > 0) {
          const s = seeds[Math.floor(rng() * seeds.length)];
          x = s.x + (rng() - 0.5) * 120 * (1 - s.strength);
          y = s.y + (rng() - 0.5) * 120 * (1 - s.strength);
        } else {
          x = 20 + rng() * (WJ - 40);
          y = 20 + rng() * (HJ - 60);
        }
        particles.push({
          x, y,
          vx: (rng() - 0.5) * 0.3,
          vy: (rng() - 0.5) * 0.3,
          mass: 0.8 + rng() * 0.4
        });
      }
    }

    // Seeded RNG (same as in HR diagram)
    function mulberry32(a) {
      return function() {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    initParticles();

    function stepJeans(dt) {
      const temp = parseFloat(jeansTempSlider?.value || 30);
      const thermalPressure = 0.008 + temp * 0.003; // thermal velocity kicks
      const gravity = 0.12; // gravitational coupling

      // Build grid for neighbor finding (spatial hash)
      const cellSize = 40;
      const grid = {};
      particles.forEach((p, i) => {
        const gx = Math.floor(p.x / cellSize);
        const gy = Math.floor(p.y / cellSize);
        const key = gx + ',' + gy;
        if (!grid[key]) grid[key] = [];
        grid[key].push(i);
      });

      // Compute forces
      particles.forEach((p, i) => {
        let fx = 0, fy = 0;
        // Gravity from nearby particles
        const gx = Math.floor(p.x / cellSize);
        const gy = Math.floor(p.y / cellSize);
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const key = (gx+dx) + ',' + (gy+dy);
            const cell = grid[key];
            if (!cell) continue;
            cell.forEach(j => {
              if (j === i) return;
              const q = particles[j];
              const ddx = q.x - p.x, ddy = q.y - p.y;
              const r2 = ddx*ddx + ddy*ddy + 25; // softening
              const r = Math.sqrt(r2);
              // Gravity (attractive) with short-range repulsion (pressure)
              const fGrav = gravity * p.mass * q.mass / r2;
              const fPressure = r < 8 ? thermalPressure * 5 / (r + 1) : 0;
              const fNet = (fGrav - fPressure) / r;
              fx += ddx * fNet;
              fy += ddy * fNet;
            });
          }
        }

        // Thermal random kicks
        fx += (Math.random() - 0.5) * thermalPressure * 2;
        fy += (Math.random() - 0.5) * thermalPressure * 2;

        // Damping
        p.vx = p.vx * 0.995 + fx * dt;
        p.vy = p.vy * 0.995 + fy * dt;

        // Clamp velocity
        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        if (speed > 3) { p.vx *= 3/speed; p.vy *= 3/speed; }
      });

      // Move
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        // Soft boundary
        if (p.x < 10) { p.x = 10; p.vx *= -0.5; }
        if (p.x > WJ - 10) { p.x = WJ - 10; p.vx *= -0.5; }
        if (p.y < 10) { p.y = 10; p.vy *= -0.5; }
        if (p.y > HJ - 30) { p.y = HJ - 30; p.vy *= -0.5; }
      });

      // Detect collapsed clumps: if many particles are very close, form a protostar
      jeansTime += dt;
      if (jeansTime > 2 && Math.random() < 0.05) {
        // Find densest point
        let maxDensity = 0, maxX = 0, maxY = 0;
        particles.forEach(p => {
          let density = 0;
          particles.forEach(q => {
            const d2 = (p.x-q.x)*(p.x-q.x) + (p.y-q.y)*(p.y-q.y);
            if (d2 < 400) density += q.mass;
          });
          if (density > maxDensity) { maxDensity = density; maxX = p.x; maxY = p.y; }
        });
        // If dense enough and not near existing protostar, form one
        const nearExisting = protostars.some(ps => Math.hypot(ps.x - maxX, ps.y - maxY) < 50);
        if (maxDensity > 15 && !nearExisting) {
          protostars.push({x: maxX, y: maxY, birth: jeansTime, mass: maxDensity, R: 3 + maxDensity * 0.3});
          // Absorb nearby particles
          particles = particles.filter(p => {
            const d = Math.hypot(p.x - maxX, p.y - maxY);
            return d > 15;
          });
        }
      }

      // Protostars attract remaining particles
      protostars.forEach(ps => {
        particles.forEach(p => {
          const ddx = ps.x - p.x, ddy = ps.y - p.y;
          const r2 = ddx*ddx + ddy*ddy + 100;
          const r = Math.sqrt(r2);
          const f = ps.mass * 0.05 / r2;
          p.vx += ddx * f;
          p.vy += ddy * f;
          // Absorb if very close
          if (r < ps.R + 5) {
            ps.mass += p.mass * 0.1;
            ps.R = 3 + ps.mass * 0.3;
            p.x = -100; // remove
          }
        });
      });
      particles = particles.filter(p => p.x > -50);
    }

    function drawJeans() {
      ctxJ.fillStyle = '#060a10';
      ctxJ.fillRect(0, 0, WJ, HJ);

      // Gas particles
      particles.forEach(p => {
        // Color by local density (approximate)
        const alpha = 0.4 + Math.min(0.5, Math.abs(p.vx) + Math.abs(p.vy));
        ctxJ.fillStyle = `rgba(180,140,200,${alpha.toFixed(2)})`;
        ctxJ.beginPath(); ctxJ.arc(p.x, p.y, 2.2, 0, 2*Math.PI); ctxJ.fill();
        // Glow for dense feeling
        ctxJ.fillStyle = `rgba(150,120,180,${(alpha*0.15).toFixed(2)})`;
        ctxJ.beginPath(); ctxJ.arc(p.x, p.y, 6, 0, 2*Math.PI); ctxJ.fill();
      });

      // Protostars
      protostars.forEach(ps => {
        const age = jeansTime - ps.birth;
        const glow = Math.min(1, age * 0.5);
        const r = Math.min(ps.R, 20);

        // Outer glow
        const grd = ctxJ.createRadialGradient(ps.x, ps.y, 0, ps.x, ps.y, r * 3);
        grd.addColorStop(0, `rgba(255,200,100,${(0.4*glow).toFixed(2)})`);
        grd.addColorStop(0.5, `rgba(255,150,50,${(0.15*glow).toFixed(2)})`);
        grd.addColorStop(1, 'rgba(255,100,30,0)');
        ctxJ.fillStyle = grd;
        ctxJ.beginPath(); ctxJ.arc(ps.x, ps.y, r * 3, 0, 2*Math.PI); ctxJ.fill();

        // Core
        const coreGrd = ctxJ.createRadialGradient(ps.x, ps.y, 0, ps.x, ps.y, r);
        coreGrd.addColorStop(0, `rgba(255,255,230,${(0.9*glow).toFixed(2)})`);
        coreGrd.addColorStop(0.5, `rgba(255,200,100,${(0.7*glow).toFixed(2)})`);
        coreGrd.addColorStop(1, `rgba(200,100,50,${(0.3*glow).toFixed(2)})`);
        ctxJ.fillStyle = coreGrd;
        ctxJ.beginPath(); ctxJ.arc(ps.x, ps.y, r, 0, 2*Math.PI); ctxJ.fill();

        // Label
        if (glow > 0.5) {
          ctxJ.fillStyle = `rgba(255,255,255,${(glow*0.7).toFixed(2)})`;
          ctxJ.font = '10px Inter, system-ui, sans-serif';
          ctxJ.textAlign = 'center';
          ctxJ.fillText('protostar', ps.x, ps.y - r - 6);
        }
      });

      // Info
      ctxJ.fillStyle = COLORS.textDim; ctxJ.font = FONT_SM; ctxJ.textAlign = 'left';
      ctxJ.fillText('Particles: ' + particles.length + '   Protostars: ' + protostars.length, 10, HJ - 8);
      const temp = parseFloat(jeansTempSlider?.value || 30);
      ctxJ.textAlign = 'right';
      ctxJ.fillText('T ~ ' + (temp < 30 ? 'low (easy collapse)' : temp < 70 ? 'moderate' : 'high (resists collapse)'), WJ - 10, HJ - 8);
    }

    function jeansAnimate() {
      if (!jeansPlaying) return;
      stepJeans(1);
      drawJeans();
      activeAnimations['jeans'] = requestAnimationFrame(jeansAnimate);
    }

    jeansPlayBtn?.addEventListener('click', () => {
      jeansPlaying = !jeansPlaying;
      jeansPlayBtn.textContent = jeansPlaying ? '⏸ Pause' : '▶ Play';
      if (jeansPlaying) jeansAnimate();
      else if (activeAnimations['jeans']) cancelAnimationFrame(activeAnimations['jeans']);
    });

    jeansResetBtn?.addEventListener('click', () => {
      jeansPlaying = false;
      jeansPlayBtn.textContent = '▶ Play';
      if (activeAnimations['jeans']) cancelAnimationFrame(activeAnimations['jeans']);
      initParticles();
      drawJeans();
    });

    jeansTempSlider?.addEventListener('input', () => {
      const t = parseFloat(jeansTempSlider.value);
      const label = document.getElementById('jeans-temp-val');
      if (label) label.textContent = '';
    });

    drawJeans();
  }

  const c = document.getElementById('vis-hr');
  if (c) {
  const { ctx, W, H } = setupCanvas(c);

  // --- Real stellar data: [name, Teff(K), L/Lsun] ---
  // Sources: Hipparcos, Gaia DR3, Pecaut & Mamajek (2013), Torres (2010)
  const namedStars = [
    // Main sequence
    ['Sun', 5772, 1.0],
    ['Sirius A', 9940, 25.4],
    ['Vega', 9602, 40.1],
    ['Fomalhaut', 8590, 16.6],
    ['Altair', 7670, 10.6],
    ['Procyon A', 6530, 6.93],
    ['\u03b1 Cen A', 5790, 1.519],
    ['\u03b1 Cen B', 5260, 0.5],
    ['61 Cyg A', 4526, 0.153],
    ['Barnard\'s Star', 3134, 0.0035],
    ['Proxima Cen', 3042, 0.0017],
    ['Spica', 25300, 20500],
    ['Regulus', 12460, 288],
    // Red giants / horizontal branch
    ['Arcturus', 4286, 170],
    ['Aldebaran', 3910, 439],
    ['Pollux', 4666, 32.7],
    ['Capella Aa', 4970, 78.7],
    ['Capella Ab', 5690, 72.7],
    ['Mira', 3192, 8400],
    // Supergiants
    ['Betelgeuse', 3600, 126000],
    ['Antares', 3660, 75900],
    ['Rigel', 12100, 120000],
    ['Deneb', 8525, 196000],
    ['Canopus', 7400, 10700],
    ['Polaris', 6015, 1260],
    // White dwarfs
    ['Sirius B', 25200, 0.056],
    ['Procyon B', 7740, 0.00049],
    ['40 Eri B', 16500, 0.014],
    ['van Maanen\'s', 6220, 0.00017],
  ];

  // Seeded pseudo-random for reproducible star field
  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(42);
  function gaussRng() {
    let u, v, s;
    do { u = 2 * rng() - 1; v = 2 * rng() - 1; s = u*u + v*v; } while (s >= 1 || s === 0);
    return u * Math.sqrt(-2 * Math.log(s) / s);
  }

  // Generate realistic population from IMF + stellar structure relations
  const population = [];

  // Main sequence: Kroupa IMF, mass-luminosity and mass-temperature relations
  // L/Lsun ~ M^3.5 (low mass), M^4 (solar), M^3.5 (high mass)
  // Teff ~ 5772 * (M)^0.57 (approximate)
  for (let i = 0; i < 800; i++) {
    // Kroupa IMF: draw mass from broken power law
    const u = rng();
    let mass;
    if (u < 0.7) mass = 0.08 + rng() * 0.72;       // 0.08-0.8 Msun
    else if (u < 0.93) mass = 0.8 + rng() * 1.2;    // 0.8-2 Msun
    else if (u < 0.99) mass = 2 + rng() * 8;         // 2-10 Msun
    else mass = 10 + rng() * 40;                      // 10-50 Msun

    let logL;
    if (mass < 0.43) logL = Math.log10(0.23 * Math.pow(mass, 2.3));
    else if (mass < 2) logL = Math.log10(Math.pow(mass, 4));
    else if (mass < 20) logL = Math.log10(1.4 * Math.pow(mass, 3.5));
    else logL = Math.log10(32000 * mass);

    // Mass-temperature: Pecaut & Mamajek calibration (approximate)
    let logT;
    if (mass < 0.6) logT = Math.log10(3100 + 2700 * mass);
    else if (mass < 2) logT = Math.log10(3580 * Math.pow(mass, 0.21));
    else logT = Math.log10(5000 * Math.pow(mass, 0.27));

    // Add observational scatter
    logL += gaussRng() * 0.12;
    logT += gaussRng() * 0.015;
    population.push([Math.pow(10, logT), Math.pow(10, logL)]);
  }

  // Red giant branch: T ~ 3800-5200K, L ~ 10-3000 Lsun
  for (let i = 0; i < 90; i++) {
    const logL = 1.0 + rng() * 2.5;   // 10 to ~3000 Lsun
    const logT = 3.70 - 0.06 * logL + gaussRng() * 0.02; // cooler at higher L
    population.push([Math.pow(10, logT), Math.pow(10, logL)]);
  }

  // Horizontal branch / red clump: T ~ 4500-6500K, L ~ 30-100 Lsun
  for (let i = 0; i < 40; i++) {
    const logT = 3.65 + rng() * 0.15 + gaussRng() * 0.015;
    const logL = 1.5 + rng() * 0.5 + gaussRng() * 0.1;
    population.push([Math.pow(10, logT), Math.pow(10, logL)]);
  }

  // Asymptotic giant branch: T ~ 2800-4000K, L ~ 1000-100000 Lsun
  for (let i = 0; i < 25; i++) {
    const logL = 3.0 + rng() * 2.0;
    const logT = 3.58 - 0.04 * (logL - 3) + gaussRng() * 0.02;
    population.push([Math.pow(10, logT), Math.pow(10, logL)]);
  }

  // White dwarfs: T ~ 4000-80000K, L ~ 0.0001-0.1 Lsun
  // Follow cooling tracks: hotter WDs are more luminous
  for (let i = 0; i < 50; i++) {
    const logT = 3.6 + rng() * 1.3; // 4000-80000K
    // L = 4pi R^2 sigma T^4, with R ~ 0.01 Rsun (spread 0.008-0.014)
    const rWD = 0.008 + rng() * 0.006;
    const logL = Math.log10(rWD * rWD) + 4 * (logT - Math.log10(5772));
    population.push([Math.pow(10, logT), Math.pow(10, logL)]);
  }

  // Axis limits
  const logTmin = Math.log10(2500), logTmax = Math.log10(50000);
  const logLmin = -5, logLmax = 6.5;

  function tToX(T, ox, pw) {
    return ox + (1 - (Math.log10(T) - logTmin) / (logTmax - logTmin)) * pw;
  }
  function lToY(L, oy, ph) {
    return oy + ph - (Math.log10(L) - logLmin) / (logLmax - logLmin) * ph;
  }

  function starColor(T) {
    // Physically motivated B-V to RGB mapping
    if (T > 30000) return [0.62, 0.72, 1.0];
    if (T > 20000) return [0.67, 0.75, 1.0];
    if (T > 10000) return [0.79, 0.84, 1.0];
    if (T > 7500) return [0.97, 0.97, 1.0];
    if (T > 6000) return [1.0, 0.96, 0.91];
    if (T > 5000) return [1.0, 0.87, 0.68];
    if (T > 4000) return [1.0, 0.73, 0.44];
    if (T > 3300) return [1.0, 0.60, 0.30];
    return [1.0, 0.45, 0.20];
  }

  let showLabels = true, showRegions = true, showRadii = true;
  const cbLabels = document.getElementById('hr-show-labels');
  const cbRegions = document.getElementById('hr-show-regions');
  const cbRadii = document.getElementById('hr-show-radii');
  if (cbLabels) cbLabels.addEventListener('change', () => { showLabels = cbLabels.checked; draw(); });
  if (cbRegions) cbRegions.addEventListener('change', () => { showRegions = cbRegions.checked; draw(); });
  if (cbRadii) cbRadii.addEventListener('change', () => { showRadii = cbRadii.checked; draw(); });

  // Tooltip state
  let hoverStar = null;
  c.addEventListener('mousemove', e => {
    const rect = c.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const ox = 80, oy = 30, pw = W - 120, ph = H - 85;
    let closest = null, minD = 15;
    namedStars.forEach(s => {
      const sx = tToX(s[1], ox, pw), sy = lToY(s[2], oy, ph);
      const d = Math.hypot(mx - sx, my - sy);
      if (d < minD) { minD = d; closest = s; }
    });
    if (closest !== hoverStar) { hoverStar = closest; draw(); }
    c.style.cursor = closest ? 'pointer' : 'default';
  });
  c.addEventListener('mouseleave', () => { hoverStar = null; draw(); c.style.cursor = 'default'; });

  function draw() {
    ctx.fillStyle = '#060a10';
    ctx.fillRect(0, 0, W, H);

    const ox = 80, oy = 30, pw = W - 120, ph = H - 85;

    // Grid lines
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    [40000, 20000, 10000, 5000, 3000].forEach(T => {
      const x = tToX(T, ox, pw);
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + ph); ctx.stroke();
    });
    [-4, -2, 0, 2, 4, 6].forEach(l => {
      const y = lToY(Math.pow(10, l), oy, ph);
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + pw, y); ctx.stroke();
    });

    // Constant-radius lines (R/Rsun)
    if (showRadii) {
      ctx.setLineDash([6, 6]);
      [0.01, 0.1, 1, 10, 100, 1000].forEach(R => {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
        ctx.beginPath();
        let started = false;
        for (let lt = logTmin; lt <= logTmax; lt += 0.02) {
          // L/Lsun = (R/Rsun)^2 * (T/Tsun)^4
          const logL = 2 * Math.log10(R) + 4 * (lt - Math.log10(5772));
          if (logL < logLmin || logL > logLmax) { started = false; continue; }
          const x = tToX(Math.pow(10, lt), ox, pw);
          const y = lToY(Math.pow(10, logL), oy, ph);
          started ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          started = true;
        }
        ctx.stroke();
        // Label
        const labelT = R >= 1 ? 45000 : (R >= 0.01 ? 15000 : 5000);
        const labelLogL = 2 * Math.log10(R) + 4 * (Math.log10(labelT) - Math.log10(5772));
        if (labelLogL >= logLmin && labelLogL <= logLmax) {
          const lx = tToX(labelT, ox, pw), ly = lToY(Math.pow(10, labelLogL), oy, ph);
          ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '9px Inter, system-ui, sans-serif';
          ctx.textAlign = 'left';
          const label = R >= 1 ? R + ' R\u2609' : R + ' R\u2609';
          ctx.fillText(label, lx + 3, ly - 3);
        }
      });
      ctx.setLineDash([]);
    }

    // Axes
    ctx.strokeStyle = COLORS.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ph); ctx.lineTo(ox + pw, oy + ph); ctx.stroke();

    // Axis labels
    ctx.fillStyle = COLORS.text; ctx.font = FONT_SM; ctx.textAlign = 'center';
    ctx.fillText('Surface temperature (K)', ox + pw / 2, oy + ph + 35);
    // Arrow indicating hotter direction
    ctx.fillStyle = COLORS.textDim; ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText('\u2190 hotter', ox + pw / 2, oy + ph + 48);
    ctx.save(); ctx.translate(ox - 50, oy + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = COLORS.text; ctx.font = FONT_SM;
    ctx.fillText('Luminosity (L / L\u2609)', 0, 0); ctx.restore();

    // Temp tick labels (reversed axis)
    const tempTicks = [40000, 20000, 10000, 5000, 3000];
    ctx.fillStyle = COLORS.textDim; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    tempTicks.forEach(T => {
      const x = tToX(T, ox, pw);
      ctx.fillText(T >= 10000 ? (T/1000) + 'k' : T.toString(), x, oy + ph + 14);
    });

    // Luminosity tick labels
    ctx.textAlign = 'right'; ctx.fillStyle = COLORS.textDim; ctx.font = '10px Inter, system-ui, sans-serif';
    const lumTickData = [[-4,'10\u207B\u2074'],[-2,'10\u207B\u00B2'],[0,'1'],[2,'10\u00B2'],[4,'10\u2074'],[6,'10\u2076']];
    lumTickData.forEach(([l, txt]) => {
      const y = lToY(Math.pow(10, l), oy, ph);
      ctx.fillText(txt, ox - 5, y + 4);
    });

    // Plot population stars
    population.forEach(([T, L]) => {
      const x = tToX(T, ox, pw), y = lToY(L, oy, ph);
      if (x < ox || x > ox + pw || y < oy || y > oy + ph) return;
      const [r, g, b] = starColor(T);
      const logL = Math.log10(Math.max(L, 1e-6));
      const alpha = 0.45 + 0.35 * Math.min(1, (logL - logLmin) / (logLmax - logLmin));
      ctx.fillStyle = `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${alpha.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 2 * Math.PI); ctx.fill();
    });

    // Plot named stars with glow
    namedStars.forEach(([name, T, L]) => {
      const x = tToX(T, ox, pw), y = lToY(L, oy, ph);
      if (x < ox - 5 || x > ox + pw + 5 || y < oy - 5 || y > oy + ph + 5) return;
      const [r, g, b] = starColor(T);
      const col = `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
      const logL = Math.log10(Math.max(L, 1e-6));
      const sz = 2 + 1.5 * Math.min(1, (logL + 4) / 10);

      // Glow
      const grd = ctx.createRadialGradient(x, y, 0, x, y, sz * 4);
      grd.addColorStop(0, `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},0.5)`);
      grd.addColorStop(1, `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(x, y, sz * 4, 0, 2 * Math.PI); ctx.fill();

      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, sz, 0, 2 * Math.PI); ctx.fill();

      // Label
      if (showLabels) {
        const isHover = hoverStar && hoverStar[0] === name;
        ctx.fillStyle = isHover ? '#ffffff' : 'rgba(255,255,255,0.7)';
        ctx.font = isHover ? '12px Inter, system-ui, sans-serif' : '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, y - sz - 5);
      }
    });

    // Hover tooltip
    if (hoverStar) {
      const [name, T, L] = hoverStar;
      const x = tToX(T, ox, pw), y = lToY(L, oy, ph);
      const R = Math.sqrt(L) * Math.pow(5772 / T, 2);
      const info = `${name}:  T = ${T} K,  L = ${L >= 1 ? L.toFixed(1) : L.toExponential(2)} L\u2609,  R \u2248 ${R >= 1 ? R.toFixed(1) : R.toExponential(2)} R\u2609`;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.font = '11px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(info).width + 16;
      let tx = x - tw / 2, ty = y + 15;
      if (tx < 5) tx = 5; if (tx + tw > W - 5) tx = W - tw - 5;
      if (ty + 24 > H) ty = y - 30;
      ctx.fillRect(tx, ty, tw, 22);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, 22);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText(info, tx + 8, ty + 15);
    }

    // Region labels
    if (showRegions) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '16px Inter, system-ui, sans-serif';
      ctx.fillText('Main Sequence', ox + pw * 0.48, oy + ph * 0.58);
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText('Red Giants', ox + pw * 0.7, oy + ph * 0.22);
      ctx.fillText('Supergiants', ox + pw * 0.5, oy + ph * 0.04);
      ctx.fillText('White Dwarfs', ox + pw * 0.2, oy + ph * 0.9);
    }
  }

  draw();
  }

  // ----- Lane-Emden Solutions -----
  const cLE = document.getElementById('vis-lane-emden');
  if (cLE) {
    const leS = setupCanvas(cLE);
    const ctxLE = leS.ctx, WLE = leS.W, HLE = leS.H;

    function solveLaneEmden(n) {
      const dxi = 0.01;
      let xi = 0.001, theta = 1 - xi * xi / 6, dtheta = -xi / 3;
      const pts = [{ xi: 0, theta: 1 }];
      for (let i = 0; i < 2000; i++) {
        if (theta <= 0 && n < 5) break;
        if (xi > 20) break;
        const thetaN = n === 0 ? 1 : (n === 1 ? theta : Math.pow(Math.max(theta, 0), n));
        const ddtheta = -thetaN - 2 * dtheta / xi;
        dtheta += ddtheta * dxi;
        theta += dtheta * dxi;
        xi += dxi;
        pts.push({ xi, theta: Math.max(theta, 0) });
      }
      return pts;
    }

    function drawLE() {
      clearCanvas(ctxLE, WLE, HLE);
      const oxLE = 70, oyLE = 25, pwLE = WLE - 110, phLE = HLE - 70;
      const xiMax = 15;
      drawAxes(ctxLE, oxLE, oyLE, pwLE, phLE, { xLabel: '\u03BE = r/r\u2080', yLabel: '\u03B8(\u03BE)', yLabelOffset: 40 });

      ctxLE.fillStyle = COLORS.textDim; ctxLE.font = FONT_SM; ctxLE.textAlign = 'center';
      for (let x = 0; x <= xiMax; x += 5) ctxLE.fillText(x.toFixed(0), oxLE + x / xiMax * pwLE, oyLE + phLE + 14);
      ctxLE.textAlign = 'right';
      for (let y = 0; y <= 1; y += 0.2) ctxLE.fillText(y.toFixed(1), oxLE - 5, oyLE + phLE - y * phLE + 4);

      const polytropes = [
        { n: 0, color: COLORS.blue, label: 'n = 0' },
        { n: 1, color: COLORS.green, label: 'n = 1' },
        { n: 1.5, color: COLORS.orange, label: 'n = 1.5' },
        { n: 3, color: COLORS.red, label: 'n = 3 (Eddington)' },
        { n: 5, color: COLORS.purple, label: 'n = 5' }
      ];

      polytropes.forEach((p, idx) => {
        const pts = solveLaneEmden(p.n);
        ctxLE.strokeStyle = p.color; ctxLE.lineWidth = 2; ctxLE.beginPath();
        pts.forEach((pt, i) => {
          const px = oxLE + pt.xi / xiMax * pwLE;
          const pyv = oyLE + phLE - pt.theta * phLE;
          i === 0 ? ctxLE.moveTo(px, pyv) : ctxLE.lineTo(px, pyv);
        });
        ctxLE.stroke();
        ctxLE.fillStyle = p.color; ctxLE.font = FONT_SM; ctxLE.textAlign = 'left';
        ctxLE.fillText(p.label, WLE - 160, 35 + idx * 16);
      });

      ctxLE.fillStyle = COLORS.text; ctxLE.font = FONT_LG; ctxLE.textAlign = 'left';
      ctxLE.fillText('Lane-Emden Solutions: \u03B8(\u03BE)', oxLE + 5, oyLE + 12);
    }
    drawLE();
  }

  // ----- White Dwarf Mass-Radius Relation -----
  const cWD = document.getElementById('vis-wd-mr');
  if (cWD) {
    const wdS = setupCanvas(cWD);
    const ctxWD = wdS.ctx, WWD = wdS.W, HWD = wdS.H;
    let hoverWD = -1;
    const Mch = 1.44, R0s = 1.8;

    function drawWD() {
      clearCanvas(ctxWD, WWD, HWD);
      const oxWD = 70, oyWD = 25, pwWD = WWD - 110, phWD = HWD - 70;
      const mMax = 1.6, rMax = 4;
      drawAxes(ctxWD, oxWD, oyWD, pwWD, phWD, { xLabel: 'M / M\u2609', yLabel: 'R / R_Earth', yLabelOffset: 45 });

      ctxWD.fillStyle = COLORS.textDim; ctxWD.font = FONT_SM; ctxWD.textAlign = 'center';
      for (let m = 0; m <= mMax; m += 0.2) ctxWD.fillText(m.toFixed(1), oxWD + m / mMax * pwWD, oyWD + phWD + 14);
      ctxWD.textAlign = 'right';
      for (let r = 0; r <= rMax; r++) ctxWD.fillText(r.toFixed(0), oxWD - 5, oyWD + phWD - r / rMax * phWD + 4);

      // NR limit dashed
      ctxWD.strokeStyle = COLORS.textDim; ctxWD.lineWidth = 1; ctxWD.setLineDash([4, 4]);
      ctxWD.beginPath();
      for (let px = 5; px < pwWD; px++) {
        const m = px / pwWD * mMax;
        if (m < 0.1) continue;
        const r = R0s * Math.pow(0.5 / m, 1/3);
        if (r > rMax) continue;
        const pyv = oyWD + phWD - r / rMax * phWD;
        px === 5 ? ctxWD.moveTo(oxWD + px, pyv) : ctxWD.lineTo(oxWD + px, pyv);
      }
      ctxWD.stroke(); ctxWD.setLineDash([]);

      // Relativistic curve
      ctxWD.strokeStyle = COLORS.blue; ctxWD.lineWidth = 3; ctxWD.beginPath();
      const mPts = [];
      for (let r = 0.01; r <= rMax; r += 0.01) {
        const arg = 1 - (r / R0s) * (r / R0s);
        if (arg <= 0) continue;
        const m = Mch * Math.pow(arg, 1.5);
        if (m > mMax) continue;
        mPts.push({ m, r });
      }
      mPts.sort((a, b) => a.m - b.m);
      let wdSt = false;
      mPts.forEach(p => {
        const px = oxWD + p.m / mMax * pwWD;
        const pyv = oyWD + phWD - p.r / rMax * phWD;
        if (!wdSt) { ctxWD.moveTo(px, pyv); wdSt = true; } else ctxWD.lineTo(px, pyv);
      });
      ctxWD.stroke();

      // Chandrasekhar limit
      const mchX = oxWD + Mch / mMax * pwWD;
      ctxWD.strokeStyle = COLORS.red; ctxWD.lineWidth = 1; ctxWD.setLineDash([4, 4]);
      ctxWD.beginPath(); ctxWD.moveTo(mchX, oyWD); ctxWD.lineTo(mchX, oyWD + phWD); ctxWD.stroke();
      ctxWD.setLineDash([]);
      ctxWD.fillStyle = COLORS.red; ctxWD.font = FONT_SM; ctxWD.textAlign = 'center';
      ctxWD.fillText('M_Ch \u2248 1.44 M\u2609', mchX, oyWD + 15);

      // Known white dwarfs
      [{ name: 'Sirius B', m: 1.018, r: 0.92 }, { name: 'Procyon B', m: 0.604, r: 1.23 }, { name: '40 Eri B', m: 0.573, r: 1.36 }].forEach(d => {
        const px = oxWD + d.m / mMax * pwWD;
        const pyv = oyWD + phWD - d.r / rMax * phWD;
        ctxWD.fillStyle = COLORS.yellow;
        ctxWD.beginPath(); ctxWD.arc(px, pyv, 4, 0, 2 * Math.PI); ctxWD.fill();
        ctxWD.fillStyle = COLORS.text; ctxWD.font = '10px Inter, system-ui, sans-serif'; ctxWD.textAlign = 'left';
        ctxWD.fillText(d.name, px + 6, pyv - 4);
      });

      ctxWD.fillStyle = COLORS.text; ctxWD.font = FONT_LG; ctxWD.textAlign = 'left';
      ctxWD.fillText('White Dwarf Mass-Radius Relation', oxWD + 5, oyWD + 12);

      // Hover
      if (hoverWD >= oxWD && hoverWD <= oxWD + pwWD) {
        ctxWD.strokeStyle = 'rgba(255,255,255,0.2)'; ctxWD.lineWidth = 1;
        ctxWD.beginPath(); ctxWD.moveTo(hoverWD, oyWD); ctxWD.lineTo(hoverWD, oyWD + phWD); ctxWD.stroke();
        const m = (hoverWD - oxWD) / pwWD * mMax;
        const arg = 1 - Math.pow(Math.min(m / Mch, 0.999), 2/3);
        const r = arg > 0 ? R0s * Math.sqrt(arg) : 0;
        ctxWD.fillStyle = COLORS.text; ctxWD.font = FONT_SM; ctxWD.textAlign = 'center';
        ctxWD.fillText('M = ' + m.toFixed(2) + ' M\u2609,  R = ' + r.toFixed(2) + ' R_Earth', oxWD + pwWD / 2, oyWD + phWD + 38);
      }
    }
    cWD.addEventListener('mousemove', (e) => { hoverWD = e.clientX - cWD.getBoundingClientRect().left; drawWD(); });
    cWD.addEventListener('mouseleave', () => { hoverWD = -1; drawWD(); });
    drawWD();
  }

  // ===========================================================================
  // vis-beta-mass: Radiation pressure fraction β vs stellar mass
  // ===========================================================================
  const cBM = document.getElementById('vis-beta-mass');
  if (cBM) {
    const bmS = setupCanvas(cBM);
    const ctxBM = bmS.ctx, WBM = bmS.W, HBM = bmS.H;
    const oxBM = 70, oyBM = 25, pwBM = WBM - 110, phBM = HBM - 70;

    // Solve β from: M/M☉ = (18.1/μ²) * sqrt((1-β)/β⁴)
    // where μ = 0.6 (mean molecular weight)
    // → M/M☉ = (18.1 / 0.36) * sqrt((1-β)/β⁴)
    // For a given M, find β by bisection.
    const mu_BM = 0.6;
    const K_BM  = 18.1 / (mu_BM * mu_BM); // ≈ 50.28

    function betaFromMass(Msun) {
      // M = K_BM * sqrt((1-β)/β⁴)  →  search β in (0,1)
      let lo = 1e-6, hi = 1 - 1e-9;
      for (let iter = 0; iter < 80; iter++) {
        const mid = (lo + hi) / 2;
        const val = K_BM * Math.sqrt((1 - mid) / Math.pow(mid, 4));
        if (val > Msun) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    function drawBetaMass() {
      clearCanvas(ctxBM, WBM, HBM);

      // Log x-axis: M from 1 to 100 M☉
      const logMmin = 0, logMmax = 2;  // log10(1)=0, log10(100)=2

      drawAxes(ctxBM, oxBM, oyBM, pwBM, phBM, {
        xLabel: 'Stellar mass  M / M\u2609  (log scale)',
        yLabel: '\u03B2 = P_gas / P_total',
        yLabelOffset: 48
      });

      // X ticks at 1, 2, 5, 10, 20, 50, 100 M☉
      const mTicks = [1, 2, 5, 10, 20, 50, 100];
      ctxBM.fillStyle = COLORS.textDim; ctxBM.font = FONT_SM; ctxBM.textAlign = 'center';
      mTicks.forEach(m => {
        const px = oxBM + (Math.log10(m) - logMmin) / (logMmax - logMmin) * pwBM;
        ctxBM.fillText(m.toString(), px, oyBM + phBM + 14);
        ctxBM.strokeStyle = COLORS.grid; ctxBM.lineWidth = 0.5;
        ctxBM.beginPath(); ctxBM.moveTo(px, oyBM); ctxBM.lineTo(px, oyBM + phBM); ctxBM.stroke();
      });

      // Y ticks 0–1
      ctxBM.textAlign = 'right';
      for (let v = 0; v <= 1.01; v += 0.2) {
        const pyv = oyBM + phBM - v * phBM;
        ctxBM.fillStyle = COLORS.textDim;
        ctxBM.fillText(v.toFixed(1), oxBM - 5, pyv + 4);
        ctxBM.strokeStyle = COLORS.grid; ctxBM.lineWidth = 0.5;
        ctxBM.beginPath(); ctxBM.moveTo(oxBM, pyv); ctxBM.lineTo(oxBM + pwBM, pyv); ctxBM.stroke();
      }

      // β vs M curve
      ctxBM.strokeStyle = COLORS.blue; ctxBM.lineWidth = 2.5;
      ctxBM.beginPath();
      let bmFirst = true;
      const N_BM = 400;
      for (let i = 0; i <= N_BM; i++) {
        const logM = logMmin + i / N_BM * (logMmax - logMmin);
        const Msun = Math.pow(10, logM);
        const beta = betaFromMass(Msun);
        const px = oxBM + (logM - logMmin) / (logMmax - logMmin) * pwBM;
        const pyv = oyBM + phBM - beta * phBM;
        if (bmFirst) { ctxBM.moveTo(px, pyv); bmFirst = false; } else ctxBM.lineTo(px, pyv);
      }
      ctxBM.stroke();

      // Shaded region: gas-pressure dominated (β > 0.5) vs radiation-dominated
      const halfY = oyBM + phBM - 0.5 * phBM;
      ctxBM.fillStyle = 'rgba(79,195,247,0.08)';
      ctxBM.fillRect(oxBM, halfY, pwBM, oyBM + phBM - halfY);
      ctxBM.fillStyle = 'rgba(239,83,80,0.08)';
      ctxBM.fillRect(oxBM, oyBM, pwBM, halfY - oyBM);

      // β = 0.5 dashed guide
      ctxBM.strokeStyle = COLORS.textDim; ctxBM.lineWidth = 1; ctxBM.setLineDash([4, 4]);
      ctxBM.beginPath(); ctxBM.moveTo(oxBM, halfY); ctxBM.lineTo(oxBM + pwBM, halfY); ctxBM.stroke();
      ctxBM.setLineDash([]);

      // Region labels
      ctxBM.font = FONT_SM; ctxBM.textAlign = 'left';
      ctxBM.fillStyle = COLORS.blue;
      ctxBM.fillText('Gas-pressure dominated  (\u03B2 \u2248 1)', oxBM + 8, oyBM + phBM - 12);
      ctxBM.fillStyle = COLORS.red;
      ctxBM.fillText('Radiation-pressure dominated  (\u03B2 \u2192 0)', oxBM + 8, oyBM + 14);

      // Annotation: Sun and Eddington mass
      const sunBeta = betaFromMass(1);
      const sunPx = oxBM;
      const sunPy = oyBM + phBM - sunBeta * phBM;
      ctxBM.fillStyle = COLORS.yellow;
      ctxBM.beginPath(); ctxBM.arc(sunPx, sunPy, 5, 0, 2 * Math.PI); ctxBM.fill();
      ctxBM.fillStyle = COLORS.text; ctxBM.font = FONT_SM; ctxBM.textAlign = 'left';
      ctxBM.fillText('M\u2609  \u03B2\u22480.9996', sunPx + 7, sunPy - 4);

      const m100Beta = betaFromMass(100);
      const m100Px = oxBM + pwBM;
      const m100Py = oyBM + phBM - m100Beta * phBM;
      ctxBM.fillStyle = COLORS.orange;
      ctxBM.beginPath(); ctxBM.arc(m100Px, m100Py, 5, 0, 2 * Math.PI); ctxBM.fill();
      ctxBM.fillStyle = COLORS.text; ctxBM.textAlign = 'right';
      ctxBM.fillText('100 M\u2609  \u03B2\u2248' + m100Beta.toFixed(2), m100Px - 8, m100Py - 6);

      ctxBM.fillStyle = COLORS.text; ctxBM.font = FONT_LG; ctxBM.textAlign = 'left';
      ctxBM.fillText('Radiation Pressure Fraction vs Stellar Mass', oxBM + 5, oyBM + 12);
    }

    drawBetaMass();
  }

  // ===========================================================================
  // vis-stellar-profiles: Polytropic density and temperature profiles
  // ===========================================================================
  const cSP = document.getElementById('vis-stellar-profiles');
  if (cSP) {
    const spS = setupCanvas(cSP);
    const ctxSP = spS.ctx, WSP = spS.W, HSP = spS.H;
    const oxSP = 70, oySP = 35, pwSP = WSP - 110, phSP = HSP - 75;

    const spToggle = document.getElementById('stellar-profile-toggle');

    // Integrate Lane-Emden:  θ'' + (2/ξ)θ' + θⁿ = 0,  θ(0)=1, θ'(0)=0
    // Returns array of {xi, theta} from 0 to surface (θ=0) or ξ=20.
    function solveLaneEmdenProfile(n) {
      const dxi = 0.005;
      // Near-origin series: θ ≈ 1 - ξ²/6
      let xi = 0.001, theta = 1 - xi * xi / 6, dtheta = -xi / 3;
      const pts = [{ xi: 0, theta: 1 }];
      while (xi < 20) {
        const thetaN = Math.pow(Math.max(theta, 0), n);
        const ddtheta = -thetaN - 2 * dtheta / xi;
        dtheta += ddtheta * dxi;
        theta  += dtheta  * dxi;
        xi     += dxi;
        if (theta <= 0) { pts.push({ xi, theta: 0 }); break; }
        pts.push({ xi, theta });
      }
      return pts;
    }

    // Precompute solutions
    const spPolytropes = [
      { n: 1.5, color: COLORS.blue,   label: 'n = 1.5 (convective)' },
      { n: 3.0, color: COLORS.orange, label: 'n = 3 (Eddington)' },
      { n: 4.0, color: COLORS.purple, label: 'n = 4' },
    ];

    spPolytropes.forEach(p => {
      const raw = solveLaneEmdenProfile(p.n);
      // Normalise xi by xi_1 (surface) to get r/R
      const xi1 = raw[raw.length - 1].xi;
      p.profile = raw.map(pt => ({
        rR: pt.xi / xi1,
        T_ratio: pt.theta,                          // T/T_c = θ
        rho_ratio: Math.pow(pt.theta, p.n),         // ρ/ρ_c = θⁿ
      }));
    });

    function drawStellarProfiles() {
      const showMode = spToggle?.value || 'both';  // 'density', 'temperature', or 'both'

      clearCanvas(ctxSP, WSP, HSP);
      drawAxes(ctxSP, oxSP, oySP, pwSP, phSP, {
        xLabel: 'r / R',
        yLabel: 'Normalised value',
        yLabelOffset: 48
      });

      // X ticks 0–1
      ctxSP.fillStyle = COLORS.textDim; ctxSP.font = FONT_SM; ctxSP.textAlign = 'center';
      for (let v = 0; v <= 1.01; v += 0.2) {
        ctxSP.fillText(v.toFixed(1), oxSP + v * pwSP, oySP + phSP + 14);
      }
      // Y ticks 0–1
      ctxSP.textAlign = 'right';
      for (let v = 0; v <= 1.01; v += 0.2) {
        ctxSP.fillText(v.toFixed(1), oxSP - 5, oySP + phSP - v * phSP + 4);
      }

      spPolytropes.forEach(({ n, color, label, profile }) => {
        // Temperature profile (dashed)
        if (showMode === 'temperature' || showMode === 'both') {
          ctxSP.strokeStyle = color; ctxSP.lineWidth = 1.5; ctxSP.setLineDash([5, 4]);
          ctxSP.beginPath();
          profile.forEach((pt, i) => {
            const px = oxSP + pt.rR * pwSP;
            const pyv = oySP + phSP - pt.T_ratio * phSP;
            i === 0 ? ctxSP.moveTo(px, pyv) : ctxSP.lineTo(px, pyv);
          });
          ctxSP.stroke(); ctxSP.setLineDash([]);
        }

        // Density profile (solid)
        if (showMode === 'density' || showMode === 'both') {
          ctxSP.strokeStyle = color; ctxSP.lineWidth = 2.5;
          ctxSP.beginPath();
          profile.forEach((pt, i) => {
            const px = oxSP + pt.rR * pwSP;
            const pyv = oySP + phSP - pt.rho_ratio * phSP;
            i === 0 ? ctxSP.moveTo(px, pyv) : ctxSP.lineTo(px, pyv);
          });
          ctxSP.stroke();
        }
      });

      // Legend
      const legX = WSP - 195, legY = oySP + 12;
      spPolytropes.forEach(({ color, label }, idx) => {
        ctxSP.fillStyle = color; ctxSP.font = FONT_SM; ctxSP.textAlign = 'left';
        ctxSP.fillText(label, legX, legY + idx * 16);
      });

      // Line-style legend
      const legStyleY = legY + spPolytropes.length * 16 + 6;
      if (showMode === 'both' || showMode === 'density') {
        ctxSP.strokeStyle = COLORS.textDim; ctxSP.lineWidth = 2.5;
        ctxSP.beginPath(); ctxSP.moveTo(legX, legStyleY + 5); ctxSP.lineTo(legX + 22, legStyleY + 5); ctxSP.stroke();
        ctxSP.fillStyle = COLORS.textDim; ctxSP.font = FONT_SM; ctxSP.textAlign = 'left';
        ctxSP.fillText('\u03C1/\u03C1_c  (solid)', legX + 26, legStyleY + 9);
      }
      if (showMode === 'both' || showMode === 'temperature') {
        ctxSP.strokeStyle = COLORS.textDim; ctxSP.lineWidth = 1.5; ctxSP.setLineDash([5, 4]);
        ctxSP.beginPath(); ctxSP.moveTo(legX, legStyleY + 21); ctxSP.lineTo(legX + 22, legStyleY + 21); ctxSP.stroke();
        ctxSP.setLineDash([]);
        ctxSP.fillStyle = COLORS.textDim; ctxSP.font = FONT_SM;
        ctxSP.fillText('T/T_c  (dashed)', legX + 26, legStyleY + 25);
      }

      ctxSP.fillStyle = COLORS.text; ctxSP.font = FONT_LG; ctxSP.textAlign = 'left';
      ctxSP.fillText('Polytropic Stellar Profiles (Lane-Emden)', oxSP + 5, oySP - 6);
    }

    spToggle?.addEventListener('change', drawStellarProfiles);
    drawStellarProfiles();
  }

  // ----- Supergiant Onion Shell Structure -----
  const cOnion = document.getElementById('vis-onion');
  if (cOnion) {
    const {ctx: ctxOn, W: WOn, H: HOn} = setupCanvas(cOnion);
    const massSlider = document.getElementById('onion-mass');

    const shells = [
      {elem: 'H', reaction: 'H → He', temp: '10⁷ K', color: '#4fc3f7', minMass: 0.08},
      {elem: 'He', reaction: 'He → C, O', temp: '10⁸ K', color: '#66bb6a', minMass: 0.5},
      {elem: 'C', reaction: 'C → Ne, Na, Mg', temp: '5×10⁸ K', color: '#ffa726', minMass: 8},
      {elem: 'Ne', reaction: 'Ne → O, Mg', temp: '1.2×10⁹ K', color: '#ef5350', minMass: 10},
      {elem: 'O', reaction: 'O → Si, S', temp: '1.5×10⁹ K', color: '#ab47bc', minMass: 12},
      {elem: 'Si', reaction: 'Si → Fe', temp: '2.7×10⁹ K', color: '#ffee58', minMass: 15},
      {elem: 'Fe', reaction: 'No fusion (endpoint)', temp: '3×10⁹ K', color: '#e0e0e0', minMass: 15}
    ];

    function drawOnion() {
      clearCanvas(ctxOn, WOn, HOn);
      const M = parseFloat(massSlider?.value || 20);
      const cx = 180, cy = HOn / 2;
      const maxR = Math.min(cx - 20, cy - 30);

      // Determine active shells
      const active = shells.filter(s => M >= s.minMass);

      // Draw shells from outside in
      for (let i = 0; i < active.length; i++) {
        const r = maxR * (1 - i / (shells.length + 0.5));
        ctxOn.beginPath(); ctxOn.arc(cx, cy, r, 0, 2 * Math.PI);
        ctxOn.fillStyle = active[i].color + '30';
        ctxOn.fill();
        ctxOn.strokeStyle = active[i].color;
        ctxOn.lineWidth = 1.5;
        ctxOn.stroke();

        // Label
        ctxOn.fillStyle = active[i].color;
        ctxOn.font = i < 3 ? FONT : FONT_SM;
        ctxOn.textAlign = 'left';
        if (r > 15) {
          ctxOn.fillText(active[i].elem, cx + r + 5, cy - r / 2 + i * 5);
        }
      }

      // Center label
      if (active.length > 0) {
        ctxOn.fillStyle = COLORS.text; ctxOn.font = FONT_SM; ctxOn.textAlign = 'center';
        ctxOn.fillText(active[active.length - 1].elem + ' core', cx, cy + 4);
      }

      // Right panel: shell details
      const tx = 370, ty = 25;
      ctxOn.fillStyle = COLORS.text; ctxOn.font = FONT_LG; ctxOn.textAlign = 'left';
      ctxOn.fillText('Supergiant Structure (M = ' + M + ' M☉)', tx, ty);

      for (let i = 0; i < shells.length; i++) {
        const y = ty + 30 + i * 38;
        const isActive = M >= shells[i].minMass;
        ctxOn.globalAlpha = isActive ? 1.0 : 0.3;

        // Color swatch
        ctxOn.fillStyle = shells[i].color;
        ctxOn.fillRect(tx, y, 12, 12);

        // Text
        ctxOn.fillStyle = isActive ? COLORS.text : COLORS.textDim;
        ctxOn.font = FONT_SM;
        ctxOn.fillText(shells[i].elem + ' shell: ' + shells[i].reaction, tx + 18, y + 10);
        ctxOn.fillStyle = COLORS.textDim; ctxOn.font = '10px Inter, system-ui, sans-serif';
        ctxOn.fillText('T ~ ' + shells[i].temp + '  (≥' + shells[i].minMass + ' M☉)', tx + 18, y + 24);

        ctxOn.globalAlpha = 1.0;
      }

      document.getElementById('onion-mass-val')?.replaceChildren(document.createTextNode(M));
    }

    massSlider?.addEventListener('input', drawOnion);
    drawOnion();
  }

  // ----- Stellar Fate by Mass -----
  const cFate = document.getElementById('vis-stellar-fate');
  if (cFate) {
    const {ctx: ctxF, W: WF, H: HF} = setupCanvas(cFate);
    const fateSlider = document.getElementById('fate-mass');

    const phases = [
      {name: 'Brown Dwarf', range: [0, 0.08], color: '#795548', fate: 'Slowly cools forever', desc: 'Too low mass for H fusion'},
      {name: 'Red Dwarf', range: [0.08, 0.5], color: COLORS.red, fate: 'White dwarf (He)', desc: 'Burns H slowly for trillions of years'},
      {name: 'Sun-like', range: [0.5, 8], color: COLORS.yellow, fate: 'White dwarf (C/O)', desc: 'Main sequence → Red giant → Planetary nebula'},
      {name: 'Massive', range: [8, 25], color: COLORS.blue, fate: 'Neutron star', desc: 'Supergiant → Core-collapse supernova'},
      {name: 'Very Massive', range: [25, 50], color: COLORS.purple, fate: 'Black hole', desc: 'Supergiant → Hypernova or direct collapse'}
    ];

    function drawFate() {
      clearCanvas(ctxF, WF, HF);
      const M = parseFloat(fateSlider?.value || 1.0);

      // Mass scale bar at top
      const ox = 40, oy = 50, barW = WF - 80, barH = 30;

      // Log scale: 0.1 to 50
      const logMin = Math.log10(0.08), logMax = Math.log10(50);
      function massToX(m) { return ox + (Math.log10(Math.max(m, 0.08)) - logMin) / (logMax - logMin) * barW; }

      // Draw phase regions
      for (const p of phases) {
        const x1 = massToX(p.range[0] || 0.08);
        const x2 = massToX(p.range[1]);
        ctxF.fillStyle = p.color + '40';
        ctxF.fillRect(x1, oy, x2 - x1, barH);
        ctxF.strokeStyle = p.color;
        ctxF.lineWidth = 1;
        ctxF.strokeRect(x1, oy, x2 - x1, barH);

        ctxF.fillStyle = p.color; ctxF.font = FONT_SM; ctxF.textAlign = 'center';
        ctxF.fillText(p.name, (x1 + x2) / 2, oy + barH + 14);
      }

      // Mass marker
      const mx = massToX(M);
      ctxF.fillStyle = COLORS.text;
      ctxF.beginPath(); ctxF.moveTo(mx, oy - 5); ctxF.lineTo(mx - 6, oy - 15); ctxF.lineTo(mx + 6, oy - 15); ctxF.closePath(); ctxF.fill();
      ctxF.font = FONT; ctxF.textAlign = 'center';
      ctxF.fillText(M.toFixed(1) + ' M☉', mx, oy - 20);

      // Tick marks
      ctxF.fillStyle = COLORS.textDim; ctxF.font = '10px Inter, system-ui, sans-serif'; ctxF.textAlign = 'center';
      for (const m of [0.1, 0.5, 1, 5, 10, 25, 50]) {
        const px = massToX(m);
        ctxF.beginPath(); ctxF.moveTo(px, oy + barH); ctxF.lineTo(px, oy + barH + 3); ctxF.strokeStyle = COLORS.textDim; ctxF.stroke();
        ctxF.fillText(m, px, oy + barH + 28);
      }

      // Current phase info
      let current = phases[0];
      for (const p of phases) {
        if (M >= p.range[0]) current = p;
      }

      const infoY = oy + barH + 50;
      ctxF.fillStyle = current.color; ctxF.font = FONT_LG; ctxF.textAlign = 'left';
      ctxF.fillText('Classification: ' + current.name, ox, infoY);
      ctxF.fillStyle = COLORS.text; ctxF.font = FONT;
      ctxF.fillText('Evolution: ' + current.desc, ox, infoY + 25);
      ctxF.fillStyle = COLORS.green; ctxF.font = FONT;
      ctxF.fillText('Final fate: ' + current.fate, ox, infoY + 50);

      // Key thresholds
      ctxF.fillStyle = COLORS.textDim; ctxF.font = FONT_SM;
      ctxF.fillText('Key thresholds:  0.08 M☉ (H fusion)  |  0.5 M☉ (He flash)  |  8 M☉ (supernova)  |  ~25 M☉ (black hole)', ox, infoY + 80);

      document.getElementById('fate-mass-val')?.replaceChildren(document.createTextNode(M.toFixed(1)));
    }

    fateSlider?.addEventListener('input', drawFate);
    drawFate();
  }

  // ----- White Dwarf Density Profiles -----
  const cWDD = document.getElementById('vis-wd-density');
  if (cWDD) {
    const {ctx: ctxWD, W: WWD, H: HWD} = setupCanvas(cWDD);
    const plotSelect = document.getElementById('wdd-plot');
    const nSliderWD = document.getElementById('wdd-n');

    // Lane-Emden solutions (precomputed via RK4)
    function solveLaneEmden(n, steps) {
      steps = steps || 500;
      const xi = [0];
      const theta = [1];
      const dtheta = [0];
      const h = 0.02;
      for (let i = 0; i < steps; i++) {
        const x = xi[i];
        const th = theta[i];
        const dth = dtheta[i];
        if (th <= 0) break;

        // d2theta/dxi2 = -theta^n - (2/xi)*dtheta/dxi
        const x_mid = x + h / 2;
        let d2th;
        if (x < 0.001) {
          d2th = -Math.pow(th, n) / 3; // L'Hopital at origin
        } else {
          d2th = -Math.pow(Math.max(th, 0), n) - (2 / x) * dth;
        }

        // RK4
        const k1v = d2th;
        const k1x = dth;

        const th2 = th + k1x * h / 2;
        const dth2 = dth + k1v * h / 2;
        const x2 = x + h / 2;
        const d2th2 = x2 < 0.001 ? -Math.pow(Math.max(th2, 0), n) / 3 : -Math.pow(Math.max(th2, 0), n) - (2 / x2) * dth2;

        const k2v = d2th2;
        const k2x = dth2;

        const th3 = th + k2x * h / 2;
        const dth3 = dth + k2v * h / 2;
        const d2th3 = x2 < 0.001 ? -Math.pow(Math.max(th3, 0), n) / 3 : -Math.pow(Math.max(th3, 0), n) - (2 / x2) * dth3;

        const k3v = d2th3;
        const k3x = dth3;

        const x4 = x + h;
        const th4 = th + k3x * h;
        const dth4 = dth + k3v * h;
        const d2th4 = x4 < 0.001 ? -Math.pow(Math.max(th4, 0), n) / 3 : -Math.pow(Math.max(th4, 0), n) - (2 / x4) * dth4;

        const k4v = d2th4;
        const k4x = dth4;

        const newTh = th + (k1x + 2 * k2x + 2 * k3x + k4x) * h / 6;
        const newDth = dth + (k1v + 2 * k2v + 2 * k3v + k4v) * h / 6;

        if (newTh <= 0) {
          xi.push(x + h);
          theta.push(0);
          dtheta.push(newDth);
          break;
        }
        xi.push(x + h);
        theta.push(newTh);
        dtheta.push(newDth);
      }
      return {xi, theta};
    }

    function drawWDDensity() {
      clearCanvas(ctxWD, WWD, HWD);
      const plotType = plotSelect?.value || 'rho';
      const n = parseFloat(nSliderWD?.value || 3);

      const ox = 60, oy = 30, pw = WWD - 100, ph = HWD - 80;
      const yLabel = plotType === 'rho' ? 'ρ(r) / ρ_c' : '4πr²ρ(r)';
      drawAxes(ctxWD, ox, oy, pw, ph, {xLabel: 'r / R', yLabel: yLabel});

      // Constant density (n=0)
      ctxWD.strokeStyle = COLORS.textDim; ctxWD.lineWidth = 1.5;
      ctxWD.setLineDash([5, 5]);
      ctxWD.beginPath();
      if (plotType === 'rho') {
        ctxWD.moveTo(ox, oy + ph * 0.05);
        ctxWD.lineTo(ox + pw * 0.95, oy + ph * 0.05);
        ctxWD.lineTo(ox + pw * 0.95, oy + ph);
      } else {
        // 4πr²ρ = 4πr² * const → parabola
        for (let i = 0; i <= 200; i++) {
          const r = i / 200;
          const val = r * r;
          const px = ox + r * pw;
          const py = oy + ph * (1 - val);
          if (i === 0) ctxWD.moveTo(px, py); else ctxWD.lineTo(px, py);
        }
      }
      ctxWD.stroke();
      ctxWD.setLineDash([]);

      // Polytrope solution
      const sol = solveLaneEmden(n);
      const xiMax = sol.xi[sol.xi.length - 1];

      ctxWD.strokeStyle = COLORS.blue; ctxWD.lineWidth = 2.5;
      ctxWD.beginPath();
      for (let i = 0; i < sol.xi.length; i++) {
        const r = sol.xi[i] / xiMax; // normalized to [0,1]
        const rho = Math.pow(Math.max(sol.theta[i], 0), n); // ρ/ρ_c = θ^n
        let val;
        if (plotType === 'rho') {
          val = rho;
        } else {
          val = 4 * Math.PI * r * r * rho;
        }
        const px = ox + r * pw;
        const maxVal = plotType === 'rho' ? 1 : 1.5;
        const py = oy + ph * (1 - val / maxVal);
        if (py > oy + ph) continue;
        if (i === 0) ctxWD.moveTo(px, py); else ctxWD.lineTo(px, py);
      }
      ctxWD.stroke();

      // Legend
      const lx = ox + pw - 160, ly = oy + 10;
      ctxWD.strokeStyle = COLORS.textDim; ctxWD.lineWidth = 1.5; ctxWD.setLineDash([5, 5]);
      ctxWD.beginPath(); ctxWD.moveTo(lx, ly); ctxWD.lineTo(lx + 20, ly); ctxWD.stroke();
      ctxWD.setLineDash([]);
      ctxWD.fillStyle = COLORS.textDim; ctxWD.font = FONT_SM; ctxWD.textAlign = 'left';
      ctxWD.fillText('Constant density', lx + 25, ly + 4);

      ctxWD.strokeStyle = COLORS.blue; ctxWD.lineWidth = 2.5;
      ctxWD.beginPath(); ctxWD.moveTo(lx, ly + 18); ctxWD.lineTo(lx + 20, ly + 18); ctxWD.stroke();
      ctxWD.fillStyle = COLORS.blue;
      ctxWD.fillText('n = ' + n.toFixed(1) + ' polytrope', lx + 25, ly + 22);

      ctxWD.fillStyle = COLORS.text; ctxWD.font = FONT_LG; ctxWD.textAlign = 'left';
      ctxWD.fillText('White Dwarf Density Profiles', ox + 5, oy - 8);

      document.getElementById('wdd-n-val')?.replaceChildren(document.createTextNode(n.toFixed(1)));
    }

    plotSelect?.addEventListener('change', drawWDDensity);
    nSliderWD?.addEventListener('input', drawWDDensity);
    drawWDDensity();
  }

  // =================================================================
  // Stellar Lifecycle Animation
  // =================================================================
  const cEvo = document.getElementById('vis-stellar-evo');
  if (cEvo) {
    const {ctx: ctxE, W: WE, H: HE} = setupCanvas(cEvo);
    const evoMassSlider = document.getElementById('evo-mass');
    const evoPlayBtn = document.getElementById('evo-play');
    const evoResetBtn = document.getElementById('evo-reset');
    const evoStageLabel = document.getElementById('evo-stage-label');

    // Shell colors by element
    const EC = {
      H: '#4fc3f7', He: '#66bb6a', C: '#ffa726', Ne: '#ef5350',
      O: '#ab47bc', Si: '#ffee58', Fe: '#e0e0e0', n: '#90a4ae'
    };
    const ELEMENT_NAMES = {H:'Hydrogen', He:'Helium', C:'Carbon/Oxygen', Ne:'Neon', O:'Oxygen', Si:'Silicon', Fe:'Iron', n:'Neutrons'};

    // Stage colors for timeline
    const STAGE_COLORS = {
      'Main Sequence': '#4fc3f7', 'Main Sequence (Red Dwarf)': '#ef5350',
      'Brown Dwarf': '#8d6e63', 'Giant Star': '#ffa726',
      'Red Supergiant': '#ef5350', 'Blue Supergiant': '#6ec6ff',
      'Supergiant': '#ef5350', 'Onion-Shell Structure': '#ffa726',
      'Planetary Nebula': '#ab47bc', 'White Dwarf': '#e0e0e0',
      'Still Burning...': '#ef5350',
      'Core Collapse': '#ffee58', 'Supernova!': '#ff5722',
      'Neutron Star': '#26c6da', 'Black Hole': '#7c4dff',
      'Asymptotic Giant Branch': '#ef5350',
    };

    // Generate static star field once
    const bgStars = [];
    for (let i = 0; i < 200; i++) {
      bgStars.push({
        x: Math.random() * WE, y: Math.random() * HE,
        r: 0.3 + Math.random() * 1.2,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2
      });
    }

    // Build stage list depending on mass
    // Physics from textbook and standard stellar evolution:
    //
    // < 0.08 Msun: Brown dwarf. No H fusion. Just cools.
    //
    // 0.08-0.4 Msun: Red dwarf. H→He but convection mixes ALL the fuel
    //   so no inert He core builds up. Burns for trillions of years.
    //   Universe is too young for any to have finished. NEVER becomes a
    //   red giant — that requires an inert He core to form.
    //
    // 0.4-8 Msun: Main sequence → core H exhausted → shell H burning,
    //   star expands → Red Giant (He→C,O in core) → AGB (shell He burning,
    //   heavy elements dredged up) → Planetary Nebula → White Dwarf
    //
    // 8-25 Msun: Main seq → Giant → Supergiant (onion shells: C, Ne, O,
    //   Si → Fe) → Core collapse → Supernova → Neutron star
    //
    // >25 Msun: Main seq → Blue Supergiant → onion shells → Core collapse
    //   → Supernova → Black hole
    //
    function getStages(M) {

      // --- Brown dwarf: M < 0.08 Msun ---
      if (M < 0.08) return [
        {name:'Brown Dwarf', desc:'Not massive enough for H fusion. Just a ball of H, like Jupiter. Slowly cools forever.', dur:10,
         R:0.1+0.15*M/0.08, Ts:1500+1000*M/0.08, Tc:3e6, shells:[{el:'H',f:1}]},
      ];

      // --- Red dwarf: 0.08-0.4 Msun ---
      // Convection mixes ALL the hydrogen. No He core builds up.
      // Cannot ever become a red giant. Burns for trillions of years.
      if (M < 0.4) return [
        {name:'Main Sequence (Red Dwarf)', desc:'H \u2192 He with full convective mixing. Burns for trillions of years.', dur:8,
         R:0.15+0.7*M, Ts:2800+3000*M, Tc:8e6,
         shells:[{el:'He',f:0.15},{el:'H',f:1}]},
        {name:'Still Burning...', desc:'Universe is only 15 Gyr old \u2014 no red dwarf has ever run out of fuel.', dur:6,
         R:0.15+0.6*M, Ts:2700+2800*M, Tc:7e6,
         shells:[{el:'He',f:0.35},{el:'H',f:1}]},
      ];

      // --- Sun-like: 0.4-8 Msun ---
      if (M < 8) return [
        {name:'Main Sequence', desc:'H \u2192 He in the core. He ash accumulates (no convective mixing).', dur:7,
         R:Math.pow(M,0.8), Ts:5772*Math.pow(M,0.18), Tc:15e6*Math.pow(M,0.5),
         shells:[{el:'He',f:0.25},{el:'H',f:1}]},
        {name:'Giant Star', desc:'Core H exhausted. Shell H burning. Core contracts, outer layers expand and cool.', dur:5,
         R:5+20*(M/8), Ts:4500+500*(M/8), Tc:50e6,
         shells:[{el:'He',f:0.3},{el:'H',f:0.6},{el:'H',f:1}]},
        {name:'Red Supergiant', desc:'He \u2192 C, O in core. H burns in shell. Star swells to ~100 R\u2609.', dur:5,
         R:30+100*(M/8), Ts:3500+300*(M/8), Tc:100e6,
         shells:[{el:'C',f:0.08},{el:'He',f:0.25},{el:'H',f:1}]},
        {name:'Planetary Nebula', desc:'Outer layers expelled as glowing shells of gas. Hot core exposed.', dur:5,
         R:0.02, Ts:30000+30000*(M/8), Tc:100e6, special:'nebula',
         shells:[{el:'C',f:0.6},{el:'He',f:1}]},
        {name:'White Dwarf', desc:'C/O core supported by electron degeneracy pressure. No fusion. Slowly cools.', dur:5,
         R:0.013, Ts:15000, Tc:10e6, shells:[{el:'C',f:0.7},{el:'He',f:1}]},
      ];

      // --- Massive: 8-25 Msun → Neutron star ---
      if (M < 25) {
        return [
          {name:'Main Sequence', desc:'H \u2192 He. Hot and luminous.', dur:5,
           R:4*Math.pow(M/10,0.6), Ts:10000+8000*((M-8)/17), Tc:30e6,
           shells:[{el:'He',f:0.3},{el:'H',f:1}]},
          {name:'Giant Star', desc:'Core H exhausted. Shell H burning, star expands and cools.', dur:4,
           R:15+15*(M/25), Ts:5000+500*(M/25), Tc:100e6,
           shells:[{el:'C',f:0.05},{el:'He',f:0.2},{el:'H',f:1}]},
          {name:'Supergiant', desc:'He \u2192 C, O in core. Star becomes enormous and red. Multiple burning shells.', dur:5,
           R:40+60*(M/25), Ts:3500+300*(M/25), Tc:500e6,
           shells:[{el:'C',f:0.08},{el:'He',f:0.25},{el:'H',f:1}]},
          {name:'Onion-Shell Structure', desc:'Sequential fusion: C \u2192 Ne \u2192 O \u2192 Si \u2192 Fe. Iron is the endpoint of fusion.', dur:5,
           R:35+50*(M/25), Ts:3500+200*(M/25), Tc:3e9,
           shells:[
             {el:'Fe',f:0.03},{el:'Si',f:0.06},{el:'O',f:0.10},
             {el:'Ne',f:0.14},{el:'C',f:0.20},{el:'He',f:0.35},{el:'H',f:1}
           ]},
          {name:'Core Collapse', desc:'Iron core collapses at \u00BC the speed of light. T rises to 5 billion K in 0.1 s.', dur:3,
           R:35+50*(M/25), Ts:3600, Tc:10e9, special:'collapse',
           shells:[
             {el:'Fe',f:0.03},{el:'Si',f:0.06},{el:'O',f:0.10},
             {el:'Ne',f:0.14},{el:'C',f:0.20},{el:'He',f:0.35},{el:'H',f:1}
           ]},
          {name:'Supernova!', desc:'Matter rebounds off neutron-degenerate core \u2192 enormous explosion.', dur:6,
           R:0, Ts:50000, Tc:50e9, special:'supernova', shells:[]},
          {name:'Neutron Star', desc:'Neutron-degenerate remnant. R \u2248 10 km. \u03C1 \u2248 4\u00d710\u00b9\u2077 kg/m\u00b3.', dur:5,
           R:0.008, Ts:600000, Tc:1e11, special:'neutronstar', shells:[{el:'n',f:1}]},
        ];
      }

      // --- Very massive: >25 Msun → Black hole ---
      // These stars are blue supergiants (like Rigel). They may skip the
      // extended red giant phase, going more directly to supergiant.
      return [
        {name:'Main Sequence', desc:'H \u2192 He. Extremely hot, luminous, and blue.', dur:5,
         R:6*Math.pow(M/25,0.5), Ts:20000+15000*((M-25)/15), Tc:35e6,
         shells:[{el:'He',f:0.3},{el:'H',f:1}]},
        {name:'Blue Supergiant', desc:'He burning begins. Still hot and blue. Enormous luminosity.', dur:5,
         R:30+40*((M-25)/15), Ts:12000+8000*((M-25)/15), Tc:300e6,
         shells:[{el:'C',f:0.06},{el:'He',f:0.25},{el:'H',f:1}]},
        {name:'Onion-Shell Structure', desc:'Rapid successive fusion stages. Core produces Fe in days.', dur:5,
         R:40+50*((M-25)/15), Ts:10000+5000*((M-25)/15), Tc:3e9,
         shells:[
           {el:'Fe',f:0.03},{el:'Si',f:0.06},{el:'O',f:0.10},
           {el:'Ne',f:0.14},{el:'C',f:0.20},{el:'He',f:0.35},{el:'H',f:1}
         ]},
        {name:'Core Collapse', desc:'Iron core collapses. Nothing can stop it.', dur:3,
         R:40+50*((M-25)/15), Ts:10000, Tc:10e9, special:'collapse',
         shells:[
           {el:'Fe',f:0.03},{el:'Si',f:0.06},{el:'O',f:0.10},
           {el:'Ne',f:0.14},{el:'C',f:0.20},{el:'He',f:0.35},{el:'H',f:1}
         ]},
        {name:'Supernova!', desc:'Catastrophic explosion. Brightest event in the universe.', dur:6,
         R:0, Ts:50000, Tc:50e9, special:'supernova', shells:[]},
        {name:'Black Hole', desc:'Remnant too massive for neutron degeneracy. Collapses to a singularity.', dur:5,
         R:0.005, Ts:0, Tc:0, special:'blackhole', shells:[]},
      ];
    }

    let evoPlaying = false, evoTime = 0, evoStages = getStages(10);
    let snParticles = [], nebulaRings = [];
    let lastFrameTime = 0;
    let surfaceSparks = [];
    let screenShake = {x: 0, y: 0, intensity: 0};
    let pulsarAngle = 0;

    function evoTotalDur() { return evoStages.reduce((s,st) => s + st.dur, 0); }

    function getCurrentStage() {
      let t = evoTime;
      for (let i = 0; i < evoStages.length; i++) {
        if (t < evoStages[i].dur) return {idx: i, frac: t / evoStages[i].dur};
        t -= evoStages[i].dur;
      }
      return {idx: evoStages.length - 1, frac: 1};
    }

    function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
    function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    // Temperature to RGB color (more physically realistic)
    function tempToColor(T) {
      if (T <= 0) return {r:0, g:0, b:0};
      let r, g, b;
      const t = T / 1000;
      if (t <= 6.6) { r = 255; }
      else { r = Math.min(255, Math.max(0, 329.7 * Math.pow(t - 6, -0.1332))); }
      if (t <= 1) { g = 0; }
      else if (t <= 6.6) { g = Math.min(255, Math.max(0, 99.47 * Math.log(t) - 161.1)); }
      else { g = Math.min(255, Math.max(0, 288.1 * Math.pow(t - 6, -0.0755))); }
      if (t >= 6.6) { b = 255; }
      else if (t <= 1.9) { b = 0; }
      else { b = Math.min(255, Math.max(0, 138.5 * Math.log(t - 1) - 305.0)); }
      return {r: Math.round(r), g: Math.round(g), b: Math.round(b)};
    }

    function colorToCSS(c, a) {
      if (a !== undefined) return `rgba(${c.r},${c.g},${c.b},${a})`;
      return `rgb(${c.r},${c.g},${c.b})`;
    }

    function evoStarColor(T) {
      return colorToCSS(tempToColor(T));
    }

    function evoStarColorObj(T) {
      return tempToColor(T);
    }

    function initSNParticles() {
      snParticles = [];
      for (let i = 0; i < 300; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = 0.8 + Math.random() * 3.5;
        const hue = Math.random() < 0.3 ? 40 + Math.random()*30 :
                    (Math.random() < 0.5 ? 10 + Math.random()*25 : 50+Math.random()*10);
        const lum = 50 + Math.random()*45;
        snParticles.push({
          x: 0, y: 0, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
          life: 0.6 + Math.random()*0.4,
          size: 0.8 + Math.random()*3.5,
          color: `hsl(${hue}, 100%, ${lum}%)`,
          trail: Math.random() < 0.4,
          delay: Math.random() * 0.1
        });
      }
    }

    function initSurfaceSparks(cx, cy, radius) {
      if (surfaceSparks.length > 30) return;
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * 2 * Math.PI;
        surfaceSparks.push({
          angle: angle,
          r: radius,
          vr: 0.3 + Math.random() * 1.2,
          life: 0.5 + Math.random() * 0.8,
          age: 0,
          size: 1 + Math.random() * 2,
          hue: 30 + Math.random() * 30
        });
      }
    }

    function drawStarField(time) {
      bgStars.forEach(s => {
        const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.x);
        const alpha = s.brightness * twinkle;
        ctxE.fillStyle = `rgba(200,210,255,${alpha})`;
        ctxE.beginPath();
        ctxE.arc(s.x, s.y, s.r, 0, 2*Math.PI);
        ctxE.fill();
      });
    }

    // Draw a beautiful luminous star with radial gradient and surface shimmer
    function drawLuminousStar(cx, cy, radius, surfaceTemp, time, shells, isCollapsing, collapseFrac) {
      if (radius < 1) return;
      const sc = evoStarColorObj(surfaceTemp);
      const coreTemp = surfaceTemp * 3;
      const cc = evoStarColorObj(Math.min(coreTemp, 60000));

      // Outer atmospheric glow
      const glowR = radius * 1.6;
      const outerGlow = ctxE.createRadialGradient(cx, cy, radius * 0.8, cx, cy, glowR);
      outerGlow.addColorStop(0, colorToCSS(sc, 0.3));
      outerGlow.addColorStop(0.5, colorToCSS(sc, 0.1));
      outerGlow.addColorStop(1, colorToCSS(sc, 0));
      ctxE.fillStyle = outerGlow;
      ctxE.beginPath(); ctxE.arc(cx, cy, glowR, 0, 2*Math.PI); ctxE.fill();

      // Draw shell layers from outside in with gradient fills
      if (shells && shells.length > 0) {
        for (let i = shells.length - 1; i >= 0; i--) {
          const sr = radius * shells[i].f;
          if (sr < 0.5) continue;
          const innerR = i > 0 ? radius * shells[Math.max(0,i-1)].f : 0;
          const col = EC[shells[i].el] || '#888';

          const hr = parseInt(col.slice(1,3),16);
          const hg = parseInt(col.slice(3,5),16);
          const hb = parseInt(col.slice(5,7),16);

          const shellGrad = ctxE.createRadialGradient(cx, cy, innerR, cx, cy, sr);
          shellGrad.addColorStop(0, `rgba(${hr},${hg},${hb},0.5)`);
          shellGrad.addColorStop(0.7, `rgba(${hr},${hg},${hb},0.3)`);
          shellGrad.addColorStop(1, `rgba(${hr},${hg},${hb},0.15)`);
          ctxE.fillStyle = shellGrad;
          ctxE.beginPath(); ctxE.arc(cx, cy, sr, 0, 2*Math.PI); ctxE.fill();

          // Shell boundary
          if (sr > 3) {
            ctxE.strokeStyle = `rgba(${hr},${hg},${hb},0.6)`;
            ctxE.lineWidth = 1.5;
            ctxE.beginPath(); ctxE.arc(cx, cy, sr, 0, 2*Math.PI); ctxE.stroke();
          }
        }
      }

      // Core-to-surface luminous gradient overlay
      const starGrad = ctxE.createRadialGradient(cx, cy, 0, cx, cy, radius);
      starGrad.addColorStop(0, colorToCSS({r:255,g:255,b:255}, 0.9));
      starGrad.addColorStop(0.15, colorToCSS(cc, 0.7));
      starGrad.addColorStop(0.5, colorToCSS(sc, 0.4));
      starGrad.addColorStop(0.85, colorToCSS(sc, 0.25));
      starGrad.addColorStop(1, colorToCSS(sc, 0.1));
      ctxE.fillStyle = starGrad;
      ctxE.beginPath(); ctxE.arc(cx, cy, radius, 0, 2*Math.PI); ctxE.fill();

      // Surface shimmer / convection effect
      if (radius > 8 && !isCollapsing) {
        const numCells = Math.min(Math.floor(radius / 4), 30);
        for (let i = 0; i < numCells; i++) {
          const cellAngle = (i / numCells) * 2 * Math.PI + Math.sin(time * 0.8 + i * 1.7) * 0.3;
          const cellR = radius * (0.75 + 0.2 * Math.sin(time * 1.2 + i * 2.3));
          const cellX = cx + Math.cos(cellAngle) * cellR;
          const cellY = cy + Math.sin(cellAngle) * cellR;
          const cellSize = 2 + (radius / 30) * Math.abs(Math.sin(time * 1.5 + i * 3.1));
          const cellAlpha = 0.15 + 0.1 * Math.sin(time * 2 + i * 4.7);
          ctxE.fillStyle = colorToCSS({r:255,g:255,b:220}, cellAlpha);
          ctxE.beginPath(); ctxE.arc(cellX, cellY, cellSize, 0, 2*Math.PI); ctxE.fill();
        }
      }

      // Pulsing glow (subtle breathing)
      if (radius > 3) {
        const pulse = 1 + 0.03 * Math.sin(time * 1.5);
        const pulseGrad = ctxE.createRadialGradient(cx, cy, radius * 0.9 * pulse, cx, cy, radius * 1.15 * pulse);
        pulseGrad.addColorStop(0, colorToCSS(sc, 0));
        pulseGrad.addColorStop(0.5, colorToCSS(sc, 0.15));
        pulseGrad.addColorStop(1, colorToCSS(sc, 0));
        ctxE.fillStyle = pulseGrad;
        ctxE.beginPath(); ctxE.arc(cx, cy, radius * 1.15 * pulse, 0, 2*Math.PI); ctxE.fill();
      }

      // Collapsing vibration effect
      if (isCollapsing && collapseFrac > 0.3) {
        const shakeAmt = (collapseFrac - 0.3) * 15;
        screenShake.intensity = shakeAmt;
      }
    }

    // Draw surface sparks for active fusion
    function drawSurfaceSparks(cx, cy, radius, time, dt) {
      surfaceSparks = surfaceSparks.filter(s => s.age < s.life);
      surfaceSparks.forEach(s => {
        s.age += dt;
        s.r += s.vr * dt * 60;
        const x = cx + Math.cos(s.angle) * s.r;
        const y = cy + Math.sin(s.angle) * s.r;
        const alpha = Math.max(0, 1 - s.age / s.life);
        ctxE.fillStyle = `hsla(${s.hue}, 100%, 80%, ${alpha})`;
        ctxE.beginPath(); ctxE.arc(x, y, s.size * alpha, 0, 2*Math.PI); ctxE.fill();
      });
    }

    // Format temperature for display
    function formatTemp(T) {
      if (T >= 1e9) return (T / 1e9).toFixed(1) + ' GK';
      if (T >= 1e6) return (T / 1e6).toFixed(0) + ' MK';
      return Math.round(T).toLocaleString() + ' K';
    }

    // Format radius for display
    function formatRadius(R) {
      if (R < 0.01) return '~10 km';
      if (R < 0.1) return (R * 696340).toFixed(0) + ' km';
      return R.toFixed(2) + ' R\u2609';
    }

    function drawEvo() {
      const now = performance.now() / 1000;
      const time = now;

      clearCanvas(ctxE, WE, HE);

      // Apply screen shake
      ctxE.save();
      if (screenShake.intensity > 0) {
        const sx = (Math.random() - 0.5) * screenShake.intensity * 2;
        const sy = (Math.random() - 0.5) * screenShake.intensity * 2;
        ctxE.translate(sx, sy);
        screenShake.intensity *= 0.95;
        if (screenShake.intensity < 0.1) screenShake.intensity = 0;
      }

      // Deep space background
      ctxE.fillStyle = '#060a10';
      ctxE.fillRect(-5, -5, WE + 10, HE + 10);

      // Star field
      drawStarField(time);

      // Draw evolution track: faint dotted path showing the star's trajectory
      const M_evo = parseFloat(evoMassSlider?.value || 1);
      const logM_evo = Math.log10(Math.max(M_evo, 0.05));
      const logMin_evo = Math.log10(0.05), logMax_evo = Math.log10(40);
      const yFrac_evo = (logM_evo - logMin_evo) / (logMax_evo - logMin_evo);
      const trackY = 60 + yFrac_evo * (HE * 0.62 - 60);
      const trackXStart = 80, trackXEnd = WE * 0.55;
      // Dashed track line
      ctxE.strokeStyle = 'rgba(255,255,255,0.08)';
      ctxE.lineWidth = 1;
      ctxE.setLineDash([4, 6]);
      ctxE.beginPath(); ctxE.moveTo(trackXStart, trackY); ctxE.lineTo(trackXEnd, trackY); ctxE.stroke();
      ctxE.setLineDash([]);
      // Arrow at end
      ctxE.fillStyle = 'rgba(255,255,255,0.08)';
      ctxE.beginPath();
      ctxE.moveTo(trackXEnd, trackY);
      ctxE.lineTo(trackXEnd - 6, trackY - 4);
      ctxE.lineTo(trackXEnd - 6, trackY + 4);
      ctxE.closePath(); ctxE.fill();
      // "TIME →" label
      ctxE.fillStyle = 'rgba(255,255,255,0.12)';
      ctxE.font = '9px Inter, system-ui, sans-serif';
      ctxE.textAlign = 'center';
      ctxE.fillText('time \u2192', (trackXStart + trackXEnd) / 2, trackY + 14);

      const {idx, frac} = getCurrentStage();
      const stage = evoStages[idx];
      const prevStage = idx > 0 ? evoStages[idx-1] : stage;
      const tFrac = easeInOut(Math.min(frac * 2.5, 1)); // smooth transition

      // Interpolated values
      const maxPixR = 120;
      const curR = stage.special === 'supernova' ? 0 : stage.R;
      const prevR = prevStage.special === 'supernova' ? 0 : prevStage.R;
      const maxRval = Math.max(...evoStages.map(s => s.special ? 0 : s.R), 1);

      let drawRadius;
      if (stage.special === 'collapse') {
        const collFrac = Math.pow(frac, 2.5);
        const baseR = prevR / maxRval * maxPixR;
        drawRadius = baseR * (1 - collFrac * 0.97);
      } else if (stage.special === 'supernova') {
        drawRadius = 0;
      } else {
        const r0 = (prevStage.special === 'collapse' || prevStage.special === 'supernova') ? 0.02/maxRval*maxPixR : prevR/maxRval*maxPixR;
        const r1 = curR / maxRval * maxPixR;
        drawRadius = lerp(r0, r1, tFrac);
      }
      // Ensure star is always visible and radiating - use sqrt scaling
      // so small stars aren't invisible compared to giants
      if (drawRadius > 0 && stage.special !== 'supernova') {
        drawRadius = Math.max(drawRadius, 8);
        // Apply sqrt compression so giants don't dominate too much
        // but small stars are still clearly visible
        drawRadius = 8 + (drawRadius - 8) * (drawRadius < 20 ? 1 : 0.5 + 0.5 * Math.sqrt(drawRadius / maxPixR));
      }
      drawRadius = Math.max(drawRadius, 2);

      // Interpolated temperatures
      const prevTs = prevStage.Ts || stage.Ts;
      const prevTc = prevStage.Tc || stage.Tc;
      let curTs, curTc, curRdisp;
      if (stage.special === 'collapse') {
        curTs = lerp(prevTs, 50000, Math.pow(frac, 2));
        curTc = lerp(prevTc, 10e9, frac);
        curRdisp = lerp(prevStage.R, 0.001, Math.pow(frac, 2.5));
      } else if (stage.special === 'supernova') {
        curTs = 50000;
        curTc = 50e9;
        curRdisp = 0;
      } else {
        curTs = lerp(prevTs, stage.Ts, tFrac);
        curTc = lerp(prevTc, stage.Tc, tFrac);
        curRdisp = lerp(prevStage.R || stage.R, stage.R, tFrac);
      }

      // Star position: mass sets vertical row (top = massive, bottom = low mass)
      // Time progression moves star left → right
      const M = parseFloat(evoMassSlider?.value || 1);
      const totalDur = evoTotalDur();
      const overallProgress = evoTime / totalDur; // 0 to 1
      // Vertical: map mass logarithmically. >25 at top, <0.08 at bottom
      const logM = Math.log10(Math.max(M, 0.05));
      const logMin = Math.log10(0.05), logMax = Math.log10(40);
      const yFrac = (logM - logMin) / (logMax - logMin); // 0=top (low mass), 1=bottom (massive)
      const cyMin = 60, cyMax = HE * 0.62;
      const cy = cyMin + yFrac * (cyMax - cyMin);
      // Horizontal: moves right as animation progresses
      const cxMin = 80, cxMax = WE * 0.55;
      const cx = cxMin + overallProgress * (cxMax - cxMin);

      // ---- PLANETARY NEBULA ----
      if (stage.special === 'nebula') {
        const nebPhase = easeOut(frac);
        for (let ring = 0; ring < 5; ring++) {
          const ringDelay = ring * 0.12;
          const ringFrac = Math.max(0, (frac - ringDelay) / (1 - ringDelay));
          if (ringFrac <= 0) continue;
          const ringR = drawRadius + (25 + ring * 30) * easeOut(ringFrac);
          const alpha = 0.4 * (1 - ringFrac * 0.6) * (1 - ring * 0.15);
          const colors = ['#4fc3f7','#66bb6a','#ab47bc','#26c6da','#ec407a'];
          const col = colors[ring % colors.length];
          const hr = parseInt(col.slice(1,3),16);
          const hg = parseInt(col.slice(3,5),16);
          const hb = parseInt(col.slice(5,7),16);

          const ringWidth = (10 - ring) * (1 + ringFrac * 2);
          const nebGrad = ctxE.createRadialGradient(cx, cy, Math.max(0, ringR - ringWidth), cx, cy, ringR + ringWidth);
          nebGrad.addColorStop(0, `rgba(${hr},${hg},${hb},0)`);
          nebGrad.addColorStop(0.3, `rgba(${hr},${hg},${hb},${alpha * 0.5})`);
          nebGrad.addColorStop(0.5, `rgba(${hr},${hg},${hb},${alpha})`);
          nebGrad.addColorStop(0.7, `rgba(${hr},${hg},${hb},${alpha * 0.5})`);
          nebGrad.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
          ctxE.fillStyle = nebGrad;
          ctxE.beginPath(); ctxE.arc(cx, cy, ringR + ringWidth, 0, 2*Math.PI); ctxE.fill();

          // Wispy irregular shape overlay
          ctxE.globalAlpha = alpha * 0.3;
          ctxE.strokeStyle = col;
          ctxE.lineWidth = 2;
          ctxE.beginPath();
          for (let a = 0; a <= 2*Math.PI; a += 0.1) {
            const wobble = 1 + 0.08 * Math.sin(a * 5 + ring * 2 + time * 0.3);
            const px = cx + Math.cos(a) * ringR * wobble;
            const py = cy + Math.sin(a) * ringR * wobble;
            if (a === 0) ctxE.moveTo(px, py); else ctxE.lineTo(px, py);
          }
          ctxE.closePath(); ctxE.stroke();
          ctxE.globalAlpha = 1;
        }
      }

      // ---- SUPERNOVA ----
      if (stage.special === 'supernova') {
        if (snParticles.length === 0) initSNParticles();

        // Bright flash - massive white-out that fills entire screen
        if (frac < 0.35) {
          const flashFrac = frac / 0.35;
          // Hard initial punch: stays near full brightness longer
          const flashAlpha = flashFrac < 0.15 ? 1.0 : Math.pow(1 - (flashFrac - 0.15) / 0.85, 0.6);
          // Flash fills ENTIRE canvas as solid white initially, then fades to radial
          if (flashFrac < 0.2) {
            // Full white-out
            ctxE.fillStyle = `rgba(255,255,255,${flashAlpha})`;
            ctxE.fillRect(-5, -5, WE+10, HE+10);
          } else {
            const flashGrad = ctxE.createRadialGradient(cx, cy, 0, cx, cy, WE * (0.5 + flashFrac * 0.8));
            flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
            flashGrad.addColorStop(0.2, `rgba(255,255,230,${flashAlpha * 0.9})`);
            flashGrad.addColorStop(0.5, `rgba(255,220,150,${flashAlpha * 0.6})`);
            flashGrad.addColorStop(0.8, `rgba(255,150,50,${flashAlpha * 0.3})`);
            flashGrad.addColorStop(1, `rgba(255,80,20,0)`);
            ctxE.fillStyle = flashGrad;
            ctxE.fillRect(-5, -5, WE+10, HE+10);
          }
          screenShake.intensity = (1 - flashFrac) * 18;
        }

        // Expanding shockwave ring
        if (frac > 0.03) {
          const swFrac = (frac - 0.03) / 0.97;
          const swRadius = swFrac * Math.max(WE, HE) * 0.9;
          const swAlpha = Math.max(0, 1.0 * (1 - swFrac * 0.8));
          const swWidth = 5 + swFrac * 20;
          const swGrad = ctxE.createRadialGradient(cx, cy, Math.max(0, swRadius - swWidth*2), cx, cy, swRadius + swWidth);
          swGrad.addColorStop(0, `rgba(255,200,100,0)`);
          swGrad.addColorStop(0.5, `rgba(255,255,200,${swAlpha * 0.6})`);
          swGrad.addColorStop(0.7, `rgba(255,200,100,${swAlpha})`);
          swGrad.addColorStop(1, `rgba(255,100,50,0)`);
          ctxE.fillStyle = swGrad;
          ctxE.beginPath(); ctxE.arc(cx, cy, swRadius + swWidth, 0, 2*Math.PI); ctxE.fill();
        }

        // Debris particles
        snParticles.forEach(p => {
          const pFrac = Math.max(0, frac - p.delay) / (1 - p.delay);
          if (pFrac <= 0) return;
          const easedFrac = easeOut(pFrac);
          const dist = easedFrac * 250;
          const px = cx + p.vx * dist;
          const py = cy + p.vy * dist;
          const alpha = Math.max(0, p.life - pFrac * 0.7);
          if (alpha <= 0) return;

          if (p.trail && pFrac > 0.05) {
            const prevDist = easeOut(Math.max(0, pFrac - 0.05)) * 250;
            const ppx = cx + p.vx * prevDist;
            const ppy = cy + p.vy * prevDist;
            ctxE.strokeStyle = p.color;
            ctxE.globalAlpha = alpha * 0.4;
            ctxE.lineWidth = p.size * 0.5;
            ctxE.beginPath(); ctxE.moveTo(ppx, ppy); ctxE.lineTo(px, py); ctxE.stroke();
          }

          ctxE.fillStyle = p.color;
          ctxE.globalAlpha = alpha;
          const pSize = p.size * (0.5 + pFrac * 0.8);
          ctxE.beginPath(); ctxE.arc(px, py, pSize, 0, 2*Math.PI); ctxE.fill();

          if (p.size > 2 && alpha > 0.3) {
            ctxE.globalAlpha = alpha * 0.2;
            ctxE.beginPath(); ctxE.arc(px, py, pSize * 3, 0, 2*Math.PI); ctxE.fill();
          }
        });
        ctxE.globalAlpha = 1;

        // SUPERNOVA label
        if (frac < 0.4) {
          const labelAlpha = frac < 0.1 ? frac / 0.1 : 1 - (frac - 0.1) / 0.3;
          ctxE.fillStyle = `rgba(255,255,220,${Math.max(0, labelAlpha)})`;
          ctxE.font = 'bold 32px Inter, system-ui, sans-serif';
          ctxE.textAlign = 'center';
          ctxE.fillText('SUPERNOVA', cx, cy - 30);
          ctxE.font = FONT;
          ctxE.fillText('10\u2074\u2076 J released in seconds', cx, cy);
        }
      }

      // ---- BLACK HOLE ----
      if (stage.special === 'blackhole') {
        const bhFrac = easeOut(Math.min(frac * 2, 1));
        const diskR = 20 + bhFrac * 50;
        const ehR = 6 + bhFrac * 4;

        ctxE.save();
        ctxE.translate(cx, cy);

        const diskAngle = time * 0.8;
        for (let layer = 0; layer < 20; layer++) {
          const layerR = ehR + (diskR - ehR) * (layer / 20);
          const layerAngle = diskAngle + layer * 0.15;
          const layerAlpha = 0.15 * (1 - layer / 20) * bhFrac;
          const hue = lerp(30, 280, layer / 20);
          const lum = lerp(80, 40, layer / 20);

          ctxE.globalAlpha = layerAlpha;
          ctxE.strokeStyle = `hsl(${hue}, 100%, ${lum}%)`;
          ctxE.lineWidth = 3;
          ctxE.beginPath();
          ctxE.ellipse(0, 0, layerR, layerR * 0.35, layerAngle, 0, 2*Math.PI);
          ctxE.stroke();
        }

        // Photon sphere
        ctxE.globalAlpha = 0.6 * bhFrac;
        ctxE.strokeStyle = '#fff';
        ctxE.lineWidth = 1.5;
        ctxE.beginPath(); ctxE.arc(0, 0, ehR * 1.5, 0, 2*Math.PI); ctxE.stroke();

        // Inner accretion glow
        const innerGlow = ctxE.createRadialGradient(0, 0, ehR, 0, 0, ehR * 3);
        innerGlow.addColorStop(0, `rgba(255,200,100,0)`);
        innerGlow.addColorStop(0.3, `rgba(255,180,80,${0.4 * bhFrac})`);
        innerGlow.addColorStop(0.6, `rgba(200,100,255,${0.2 * bhFrac})`);
        innerGlow.addColorStop(1, 'rgba(100,0,200,0)');
        ctxE.globalAlpha = 1;
        ctxE.fillStyle = innerGlow;
        ctxE.beginPath(); ctxE.arc(0, 0, ehR * 3, 0, 2*Math.PI); ctxE.fill();

        // Event horizon
        ctxE.fillStyle = '#000';
        ctxE.globalAlpha = 1;
        ctxE.beginPath(); ctxE.arc(0, 0, ehR, 0, 2*Math.PI); ctxE.fill();
        ctxE.strokeStyle = `rgba(255,200,150,${0.5 * bhFrac})`;
        ctxE.lineWidth = 1;
        ctxE.beginPath(); ctxE.arc(0, 0, ehR, 0, 2*Math.PI); ctxE.stroke();

        ctxE.restore();
      }

      // ---- NEUTRON STAR with pulsar beams ----
      if (stage.special === 'neutronstar') {
        const nsFrac = easeOut(Math.min(frac * 2, 1));
        const nsR = 14 * nsFrac;
        pulsarAngle += 0.04;

        // Magnetosphere glow
        const magGrad = ctxE.createRadialGradient(cx, cy, nsR, cx, cy, nsR * 5);
        magGrad.addColorStop(0, `rgba(100,200,255,${0.3 * nsFrac})`);
        magGrad.addColorStop(0.5, `rgba(100,200,255,${0.1 * nsFrac})`);
        magGrad.addColorStop(1, 'rgba(100,200,255,0)');
        ctxE.fillStyle = magGrad;
        ctxE.beginPath(); ctxE.arc(cx, cy, nsR * 5, 0, 2*Math.PI); ctxE.fill();

        // Pulsar beams
        for (let beam = 0; beam < 2; beam++) {
          const beamAngle = pulsarAngle + beam * Math.PI;
          const beamLen = 120 * nsFrac;
          const beamWidth = 15;

          ctxE.save();
          ctxE.translate(cx, cy);
          ctxE.rotate(beamAngle);

          const beamGrad = ctxE.createLinearGradient(0, 0, beamLen, 0);
          beamGrad.addColorStop(0, `rgba(100,200,255,${0.7 * nsFrac})`);
          beamGrad.addColorStop(0.3, `rgba(150,220,255,${0.4 * nsFrac})`);
          beamGrad.addColorStop(1, 'rgba(100,200,255,0)');

          ctxE.fillStyle = beamGrad;
          ctxE.beginPath();
          ctxE.moveTo(nsR, -beamWidth * 0.3);
          ctxE.lineTo(beamLen, -beamWidth);
          ctxE.lineTo(beamLen, beamWidth);
          ctxE.lineTo(nsR, beamWidth * 0.3);
          ctxE.closePath();
          ctxE.fill();

          const coreGrad = ctxE.createLinearGradient(0, 0, beamLen * 0.6, 0);
          coreGrad.addColorStop(0, `rgba(220,240,255,${0.5 * nsFrac})`);
          coreGrad.addColorStop(1, 'rgba(220,240,255,0)');
          ctxE.fillStyle = coreGrad;
          ctxE.beginPath();
          ctxE.moveTo(nsR, -beamWidth * 0.1);
          ctxE.lineTo(beamLen * 0.6, -beamWidth * 0.3);
          ctxE.lineTo(beamLen * 0.6, beamWidth * 0.3);
          ctxE.lineTo(nsR, beamWidth * 0.1);
          ctxE.closePath();
          ctxE.fill();

          ctxE.restore();
        }

        // Neutron star body
        const nsGrad = ctxE.createRadialGradient(cx, cy, 0, cx, cy, nsR);
        nsGrad.addColorStop(0, `rgba(220,240,255,${0.95 * nsFrac})`);
        nsGrad.addColorStop(0.5, `rgba(150,200,255,${0.8 * nsFrac})`);
        nsGrad.addColorStop(0.85, `rgba(100,160,220,${0.7 * nsFrac})`);
        nsGrad.addColorStop(1, `rgba(80,130,200,${0.5 * nsFrac})`);
        ctxE.fillStyle = nsGrad;
        ctxE.beginPath(); ctxE.arc(cx, cy, nsR, 0, 2*Math.PI); ctxE.fill();

        ctxE.strokeStyle = `rgba(180,220,255,${0.6 * nsFrac})`;
        ctxE.lineWidth = 1.5;
        ctxE.beginPath(); ctxE.arc(cx, cy, nsR, 0, 2*Math.PI); ctxE.stroke();

        // Magnetic field lines
        ctxE.globalAlpha = 0.2 * nsFrac;
        ctxE.strokeStyle = '#6ec6ff';
        ctxE.lineWidth = 0.8;
        for (let a = 0; a < 6; a++) {
          const fieldAngle = pulsarAngle * 0.5 + a * Math.PI / 3;
          ctxE.beginPath();
          ctxE.ellipse(cx, cy, 35, 14, fieldAngle, 0, 2*Math.PI);
          ctxE.stroke();
        }
        ctxE.globalAlpha = 1;
      }

      // ---- NORMAL STAR ----
      if (!stage.special || stage.special === 'nebula' || stage.special === 'collapse') {
        const isCollapsing = stage.special === 'collapse';
        drawLuminousStar(cx, cy, drawRadius, curTs, time, stage.shells, isCollapsing, frac);

        // Surface sparks during active fusion
        if (!isCollapsing && drawRadius > 3) {
          if (Math.random() < 0.2) initSurfaceSparks(cx, cy, drawRadius);
          drawSurfaceSparks(cx, cy, drawRadius, time, 1/60);
        }

        // Shell labels
        if (drawRadius > 15) {
          ctxE.textAlign = 'left'; ctxE.font = FONT_SM;
          const labeled = new Set();
          const curShells = stage.shells;
          for (let i = 0; i < curShells.length; i++) {
            const sr = drawRadius * curShells[i].f;
            if (sr < 5 || labeled.has(curShells[i].el)) continue;
            labeled.add(curShells[i].el);

            let labelAlpha = 1;
            if (stage.name === 'Supergiant (Onion Shells)') {
              const shellAppearTime = (i / curShells.length) * 0.6;
              labelAlpha = Math.max(0, Math.min(1, (frac - shellAppearTime) / 0.15));
            }
            if (labelAlpha <= 0) continue;

            const ly = cy - sr + 8 + i * 2;
            const lx = cx + drawRadius + 18;

            ctxE.globalAlpha = labelAlpha * 0.5;
            ctxE.strokeStyle = EC[curShells[i].el]; ctxE.lineWidth = 0.8;
            ctxE.setLineDash([3, 3]);
            ctxE.beginPath(); ctxE.moveTo(cx + sr*0.7, ly); ctxE.lineTo(lx - 3, ly); ctxE.stroke();
            ctxE.setLineDash([]);

            ctxE.globalAlpha = labelAlpha;
            ctxE.fillStyle = EC[curShells[i].el];
            const elName = ELEMENT_NAMES[curShells[i].el] || curShells[i].el;
            ctxE.fillText(curShells[i].el + ' \u2014 ' + elName, lx, ly + 4);
          }
          ctxE.globalAlpha = 1;
        }
      }

      // White dwarf cooling glow
      if (stage.name === 'White Dwarf') {
        const coolFrac = frac;
        const dimming = 1 - coolFrac * 0.4;
        const wdGlow = ctxE.createRadialGradient(cx, cy, drawRadius, cx, cy, drawRadius * 4);
        wdGlow.addColorStop(0, `rgba(200,220,255,${0.3 * dimming})`);
        wdGlow.addColorStop(0.5, `rgba(180,200,240,${0.1 * dimming})`);
        wdGlow.addColorStop(1, 'rgba(150,170,220,0)');
        ctxE.fillStyle = wdGlow;
        ctxE.beginPath(); ctxE.arc(cx, cy, drawRadius * 4, 0, 2*Math.PI); ctxE.fill();
      }

      // ---- TIMELINE BAR ----
      const tlX = 30, tlY = HE - 48, tlW = WE - 60, tlH = 12;

      // Background track
      ctxE.fillStyle = 'rgba(255,255,255,0.04)';
      const tlR = 6;
      ctxE.beginPath();
      ctxE.moveTo(tlX + tlR, tlY);
      ctxE.lineTo(tlX + tlW - tlR, tlY);
      ctxE.quadraticCurveTo(tlX + tlW, tlY, tlX + tlW, tlY + tlR);
      ctxE.lineTo(tlX + tlW, tlY + tlH - tlR);
      ctxE.quadraticCurveTo(tlX + tlW, tlY + tlH, tlX + tlW - tlR, tlY + tlH);
      ctxE.lineTo(tlX + tlR, tlY + tlH);
      ctxE.quadraticCurveTo(tlX, tlY + tlH, tlX, tlY + tlH - tlR);
      ctxE.lineTo(tlX, tlY + tlR);
      ctxE.quadraticCurveTo(tlX, tlY, tlX + tlR, tlY);
      ctxE.closePath();
      ctxE.fill();

      // Colored stage segments
      let tAccum = 0;
      for (let i = 0; i < evoStages.length; i++) {
        const x0 = tlX + (tAccum / totalDur) * tlW;
        const w = (evoStages[i].dur / totalDur) * tlW;
        tAccum += evoStages[i].dur;
        const isCurrent = i === idx;
        const isPast = i < idx;

        const segCol = STAGE_COLORS[evoStages[i].name] || '#888';
        const hr = parseInt(segCol.slice(1,3),16);
        const hg = parseInt(segCol.slice(3,5),16);
        const hb = parseInt(segCol.slice(5,7),16);

        if (isPast) {
          ctxE.fillStyle = `rgba(${hr},${hg},${hb},0.35)`;
        } else if (isCurrent) {
          const stageProgress = frac;
          ctxE.fillStyle = `rgba(${hr},${hg},${hb},0.15)`;
          ctxE.fillRect(x0, tlY, w, tlH);
          ctxE.fillStyle = `rgba(${hr},${hg},${hb},0.45)`;
          ctxE.fillRect(x0, tlY, w * stageProgress, tlH);
          if (i > 0) {
            ctxE.strokeStyle = 'rgba(255,255,255,0.15)'; ctxE.lineWidth = 1;
            ctxE.beginPath(); ctxE.moveTo(x0, tlY); ctxE.lineTo(x0, tlY + tlH); ctxE.stroke();
          }
          continue;
        } else {
          ctxE.fillStyle = `rgba(${hr},${hg},${hb},0.1)`;
        }
        ctxE.fillRect(x0, tlY, w, tlH);

        if (i > 0) {
          ctxE.strokeStyle = 'rgba(255,255,255,0.15)'; ctxE.lineWidth = 1;
          ctxE.beginPath(); ctxE.moveTo(x0, tlY); ctxE.lineTo(x0, tlY + tlH); ctxE.stroke();
        }
      }

      // Stage labels below timeline
      tAccum = 0;
      for (let i = 0; i < evoStages.length; i++) {
        const x0 = tlX + (tAccum / totalDur) * tlW;
        const w = (evoStages[i].dur / totalDur) * tlW;
        tAccum += evoStages[i].dur;
        const isCurrent = i === idx;
        ctxE.fillStyle = isCurrent ? COLORS.text : COLORS.textDim;
        ctxE.font = '8px Inter, system-ui, sans-serif'; ctxE.textAlign = 'center';
        let label = evoStages[i].name;
        if (w < 50) label = label.length > 8 ? label.substring(0,7)+'\u2026' : label;
        else if (w < 80) label = label.length > 12 ? label.substring(0,11)+'\u2026' : label;
        ctxE.fillText(label, x0 + w/2, tlY + tlH + 11);
      }

      // Progress marker
      const progX = tlX + (evoTime / totalDur) * tlW;
      const progGlow = ctxE.createRadialGradient(progX, tlY + tlH/2, 0, progX, tlY + tlH/2, 8);
      progGlow.addColorStop(0, 'rgba(255,255,255,0.8)');
      progGlow.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      progGlow.addColorStop(1, 'rgba(255,255,255,0)');
      ctxE.fillStyle = progGlow;
      ctxE.fillRect(progX - 8, tlY + tlH/2 - 8, 16, 16);
      ctxE.fillStyle = '#fff';
      ctxE.beginPath(); ctxE.arc(progX, tlY + tlH/2, 3, 0, 2*Math.PI); ctxE.fill();
      ctxE.beginPath(); ctxE.moveTo(progX, tlY - 1); ctxE.lineTo(progX-4, tlY-7); ctxE.lineTo(progX+4, tlY-7); ctxE.closePath(); ctxE.fill();

      // ---- INFO PANEL ----
      const ipX = WE * 0.58, ipY = 20;

      ctxE.textAlign = 'left';
      ctxE.fillStyle = COLORS.text;
      ctxE.font = 'bold 18px Inter, system-ui, sans-serif';
      ctxE.fillText(stage.name, ipX, ipY + 5);

      ctxE.fillStyle = COLORS.textDim;
      ctxE.font = FONT_SM;
      const descWords = stage.desc.split(' ');
      let descLine = '';
      let descY = ipY + 24;
      descWords.forEach(word => {
        const testLine = descLine + (descLine ? ' ' : '') + word;
        if (ctxE.measureText(testLine).width > WE - ipX - 15) {
          ctxE.fillText(descLine, ipX, descY);
          descLine = word;
          descY += 14;
        } else {
          descLine = testLine;
        }
      });
      if (descLine) { ctxE.fillText(descLine, ipX, descY); descY += 14; }

      // Physical parameters
      descY += 6;
      ctxE.fillStyle = 'rgba(255,255,255,0.3)';
      ctxE.fillRect(ipX, descY, WE - ipX - 20, 1);
      descY += 12;

      if (!stage.special || stage.special === 'nebula' || stage.special === 'collapse') {
        ctxE.font = FONT_SM;
        ctxE.fillStyle = COLORS.yellow;
        ctxE.fillText('Surface: ', ipX, descY);
        ctxE.fillStyle = COLORS.text;
        ctxE.fillText(formatTemp(curTs), ipX + 52, descY);
        descY += 16;

        ctxE.fillStyle = COLORS.orange;
        ctxE.fillText('Core: ', ipX, descY);
        ctxE.fillStyle = COLORS.text;
        ctxE.fillText(formatTemp(curTc), ipX + 52, descY);
        descY += 16;

        ctxE.fillStyle = COLORS.cyan;
        ctxE.fillText('Radius: ', ipX, descY);
        ctxE.fillStyle = COLORS.text;
        ctxE.fillText(formatRadius(curRdisp), ipX + 52, descY);
        descY += 20;
      }

      // Composition legend
      const legendEls = [...new Set(stage.shells.map(s => s.el))];
      if (legendEls.length > 0) {
        ctxE.fillStyle = 'rgba(255,255,255,0.5)'; ctxE.font = FONT_SM;
        ctxE.fillText('Composition:', ipX, descY);
        descY += 16;
        legendEls.forEach((el) => {
          const col = EC[el];
          ctxE.fillStyle = col;
          ctxE.beginPath(); ctxE.arc(ipX + 5, descY - 3, 4, 0, 2*Math.PI); ctxE.fill();
          ctxE.fillStyle = COLORS.text; ctxE.font = FONT_SM;
          ctxE.fillText(ELEMENT_NAMES[el] || el, ipX + 14, descY);
          descY += 15;
        });
      }

      // Special info for remnants
      if (stage.special === 'blackhole') {
        ctxE.fillStyle = '#ce93d8'; ctxE.font = FONT;
        ctxE.fillText('Event horizon:', ipX, descY);
        descY += 16;
        const M = parseFloat(evoMassSlider?.value || 1);
        const rSch = (2 * 6.674e-11 * M * 2e30 / 9e16 / 1000).toFixed(1);
        ctxE.fillStyle = COLORS.text;
        ctxE.fillText('r\u209B \u2248 ' + rSch + ' km', ipX, descY);
        descY += 16;
        ctxE.fillStyle = COLORS.textDim; ctxE.font = FONT_SM;
        ctxE.fillText('No light escapes', ipX, descY);
      }
      if (stage.special === 'neutronstar') {
        ctxE.fillStyle = '#4fc3f7'; ctxE.font = FONT;
        ctxE.fillText('Radius \u2248 10 km', ipX, descY);
        descY += 16;
        ctxE.fillText('Density \u2248 4\u00D710\u00B9\u2077 kg/m\u00B3', ipX, descY);
        descY += 16;
        ctxE.fillStyle = COLORS.textDim; ctxE.font = FONT_SM;
        ctxE.fillText('Spin: ~700 rev/s', ipX, descY);
      }

      if (evoStageLabel) evoStageLabel.textContent = stage.name;

      ctxE.restore();
    }

    let lastRafTime = 0;
    function evoAnimate(rafTime) {
      if (!evoPlaying) return;
      if (lastRafTime === 0) lastRafTime = rafTime;
      const dt = Math.min((rafTime - lastRafTime) / 1000, 0.1);
      lastRafTime = rafTime;
      evoTime += dt;
      if (evoTime >= evoTotalDur()) {
        evoTime = evoTotalDur() - 0.001;
        evoPlaying = false;
        evoPlayBtn.textContent = '\u25B6 Play';
      }
      drawEvo();
      if (evoPlaying) activeAnimations['stellar-evo'] = requestAnimationFrame(evoAnimate);
    }

    evoPlayBtn?.addEventListener('click', () => {
      evoPlaying = !evoPlaying;
      evoPlayBtn.textContent = evoPlaying ? '\u23F8 Pause' : '\u25B6 Play';
      if (evoPlaying) {
        if (evoTime >= evoTotalDur() - 0.01) { evoTime = 0; snParticles = []; surfaceSparks = []; }
        lastRafTime = 0;
        activeAnimations['stellar-evo'] = requestAnimationFrame(evoAnimate);
      } else if (activeAnimations['stellar-evo']) {
        cancelAnimationFrame(activeAnimations['stellar-evo']);
      }
    });

    evoResetBtn?.addEventListener('click', () => {
      evoPlaying = false;
      evoPlayBtn.textContent = '\u25B6 Play';
      if (activeAnimations['stellar-evo']) cancelAnimationFrame(activeAnimations['stellar-evo']);
      evoTime = 0; snParticles = []; surfaceSparks = [];
      screenShake.intensity = 0; pulsarAngle = 0;
      drawEvo();
    });

    evoMassSlider?.addEventListener('input', () => {
      const M = parseFloat(evoMassSlider.value);
      document.getElementById('evo-mass-val')?.replaceChildren(document.createTextNode(M.toFixed(1)));
      evoStages = getStages(M);
      evoTime = 0; snParticles = []; surfaceSparks = []; evoPlaying = false;
      evoPlayBtn.textContent = '\u25B6 Play';
      screenShake.intensity = 0; pulsarAngle = 0;
      if (activeAnimations['stellar-evo']) cancelAnimationFrame(activeAnimations['stellar-evo']);
      drawEvo();
    });

    drawEvo();
  }

  // =================================================================
  // Star Size Comparison
  // =================================================================
  const cSizes = document.getElementById('vis-star-sizes');
  if (cSizes) {
    const {ctx: ctxS, W: WS, H: HS} = setupCanvas(cSizes);
    const zoomSlider = document.getElementById('size-zoom');
    const zoomLabel = document.getElementById('size-zoom-label');

    const stars = [
      {name:'UY Scuti',   R:1708, T:3365, type:'M4Ia',   cat:'Hypergiant'},
      {name:'Betelgeuse', R:887,  T:3600, type:'M1Ia',   cat:'Supergiant'},
      {name:'Antares',    R:680,  T:3660, type:'M1Ib',   cat:'Supergiant'},
      {name:'Rigel',      R:79,   T:12100,type:'B8Ia',   cat:'Supergiant'},
      {name:'Aldebaran',  R:44,   T:3910, type:'K5III',  cat:'Giant'},
      {name:'Arcturus',   R:25,   T:4286, type:'K1III',  cat:'Giant'},
      {name:'Pollux',     R:9.1,  T:4666, type:'K0III',  cat:'Giant'},
      {name:'Sirius A',   R:1.71, T:9940, type:'A1V',    cat:'Main Seq.'},
      {name:'Sun',        R:1.0,  T:5772, type:'G2V',    cat:'Main Seq.'},
      {name:'α Cen B',    R:0.86, T:5260, type:'K1V',    cat:'Main Seq.'},
      {name:'Proxima Cen',R:0.15, T:3042, type:'M5V',    cat:'Red Dwarf'},
    ];
    const earthR = 0.009;

    // Unicode superscript digits for exponents
    function superscript(n) {
      const sup = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
      return String(n).split('').map(c => sup[c] || c).join('');
    }

    // --- Star color from temperature ---
    function tempToRGB(T) {
      let r, g, b;
      if (T >= 30000) { r = 0.58; g = 0.68; b = 1.0; }
      else if (T >= 20000) { const t = (T-20000)/10000; r = 0.58+0.14*(1-t); g = 0.68+0.10*(1-t); b = 1.0; }
      else if (T >= 10000) { const t = (T-10000)/10000; r = 0.72+0.25*(1-t); g = 0.78+0.17*(1-t); b = 1.0; }
      else if (T >= 7500)  { const t = (T-7500)/2500;  r = 0.97-0.12*t; g = 0.95-0.05*t; b = 1.0; }
      else if (T >= 6000)  { const t = (T-6000)/1500;  r = 1.0; g = 0.97-0.02*(1-t); b = 1.0-0.10*(1-t); }
      else if (T >= 5000)  { const t = (T-5000)/1000;  r = 1.0; g = 0.87+0.10*t; b = 0.72+0.18*t; }
      else if (T >= 4000)  { const t = (T-4000)/1000;  r = 1.0; g = 0.72+0.15*t; b = 0.42+0.30*t; }
      else if (T >= 3000)  { const t = (T-3000)/1000;  r = 1.0; g = 0.55+0.17*t; b = 0.22+0.20*t; }
      else { r = 1.0; g = 0.45; b = 0.18; }
      return [r, g, b];
    }

    // --- Camera system ---
    // Scale = pixels per solar radius. Logarithmic zoom.
    // At zoom=0: UY Scuti radius ~ 35% of canvas height
    const scaleMin = (HS * 0.35) / 1708;
    // At zoom=100: Proxima Cen radius ~ 40px
    const scaleMax = 40 / 0.15;

    function getScale(z) {
      return Math.exp(Math.log(scaleMin) + (z / 100) * (Math.log(scaleMax) - Math.log(scaleMin)));
    }

    // Place stars along a horizontal line in world-space (units: R_sun).
    // Each star's center x = cumulative spacing so they don't overlap at any zoom.
    // We space them so centers are separated by sum of radii * 1.3 for breathing room.
    const worldX = [];
    const worldY = 0; // all stars at y=0 in world space (center of canvas)
    {
      let cx = 0;
      for (let i = 0; i < stars.length; i++) {
        if (i === 0) { cx = 0; }
        else { cx += (stars[i-1].R + stars[i].R) * 1.4; }
        worldX.push(cx);
      }
    }

    // Camera: zoom slider directly controls both scale AND horizontal position.
    // zoom=0 → centered on UY Scuti (leftmost), zoom=100 → centered on Proxima Cen (rightmost).
    // Simple linear interpolation in world-space for smooth scrolling.
    function getCameraX(z) {
      const t = z / 100;
      return worldX[0] * (1 - t) + worldX[worldX.length - 1] * t;
    }

    // --- Background star field (static random) ---
    const bgStars = [];
    {
      const rng = (s) => { s = Math.sin(s) * 43758.5453; return s - Math.floor(s); };
      for (let i = 0; i < 200; i++) {
        bgStars.push({
          x: rng(i * 7.3 + 1.1) * WS,
          y: rng(i * 13.7 + 3.3) * HS,
          brightness: 0.15 + rng(i * 3.1 + 9.9) * 0.55,
          size: 0.5 + rng(i * 5.7 + 2.2) * 1.0
        });
      }
    }

    let hoverStar = -1;
    let mouseX = -1, mouseY = -1;

    // --- Convert world coordinate to screen coordinate ---
    // Stars are centered vertically at 65% of canvas height so their tops are visible
    function worldToScreen(wx, wy, camX, scale) {
      const sx = WS / 2 + (wx - camX) * scale;
      const sy = HS * 0.65 - wy * scale;
      return [sx, sy];
    }

    // --- Draw a luminous star sphere ---
    function drawStar(s, sx, sy, rPx, isHover) {
      const [cr, cg, cb] = tempToRGB(s.T);
      const r255 = Math.round(cr * 255), g255 = Math.round(cg * 255), b255 = Math.round(cb * 255);

      // Outer glow
      const glowR = Math.min(rPx * 2.5, rPx + 60);
      if (glowR > 2) {
        const glow = ctxS.createRadialGradient(sx, sy, rPx * 0.3, sx, sy, glowR);
        glow.addColorStop(0, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.30)');
        glow.addColorStop(0.4, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.10)');
        glow.addColorStop(1, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0)');
        ctxS.fillStyle = glow;
        ctxS.beginPath(); ctxS.arc(sx, sy, glowR, 0, 2 * Math.PI); ctxS.fill();
      }

      // Star body with radial gradient (bright center → colored limb)
      const bodyR = Math.max(rPx, 1.2);
      const grad = ctxS.createRadialGradient(sx - bodyR * 0.25, sy - bodyR * 0.25, bodyR * 0.05, sx, sy, bodyR);
      grad.addColorStop(0, 'rgba(255,255,255,0.97)');
      grad.addColorStop(0.25, 'rgba(' + Math.min(255, r255 + 40) + ',' + Math.min(255, g255 + 40) + ',' + Math.min(255, b255 + 40) + ',0.95)');
      grad.addColorStop(0.75, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.90)');
      // Limb darkening
      const dr = Math.max(0, r255 - 50), dg = Math.max(0, g255 - 50), db = Math.max(0, b255 - 50);
      grad.addColorStop(1, 'rgba(' + dr + ',' + dg + ',' + db + ',0.85)');
      ctxS.fillStyle = grad;
      ctxS.beginPath(); ctxS.arc(sx, sy, bodyR, 0, 2 * Math.PI); ctxS.fill();

      // Highlight for 3D effect
      if (bodyR > 5) {
        const hlGrad = ctxS.createRadialGradient(sx - bodyR * 0.3, sy - bodyR * 0.3, 0, sx - bodyR * 0.3, sy - bodyR * 0.3, bodyR * 0.6);
        hlGrad.addColorStop(0, 'rgba(255,255,255,0.20)');
        hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctxS.fillStyle = hlGrad;
        ctxS.beginPath(); ctxS.arc(sx, sy, bodyR, 0, 2 * Math.PI); ctxS.fill();
      }

      // Hover ring
      if (isHover && bodyR > 2) {
        ctxS.strokeStyle = 'rgba(255,255,255,0.5)';
        ctxS.lineWidth = 1.5;
        ctxS.beginPath(); ctxS.arc(sx, sy, bodyR + 4, 0, 2 * Math.PI); ctxS.stroke();
      }
    }

    // --- Draw a star as a curved horizon (when it's too huge to fit) ---
    function drawHorizon(s, sx, sy, rPx, camX, scale) {
      const [cr, cg, cb] = tempToRGB(s.T);
      const r255 = Math.round(cr * 255), g255 = Math.round(cg * 255), b255 = Math.round(cb * 255);

      // The star center is at (sx, sy). rPx is the radius in pixels.
      // We draw the visible arc of its upper edge.
      // Compute the angular extent visible on screen.
      const dy = sy - 0; // distance from star center to top of canvas
      const halfAngle = Math.asin(Math.min(1, (WS / 2 + 100) / rPx));

      // Surface glow gradient from bottom
      const gradH = HS * 0.6;
      const surfY = sy - rPx; // top of star in screen coords
      const visibleSurfY = Math.max(surfY, -100);
      const glowGrad = ctxS.createLinearGradient(0, HS, 0, Math.max(visibleSurfY, 0));
      glowGrad.addColorStop(0, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.12)');
      glowGrad.addColorStop(0.5, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.06)');
      glowGrad.addColorStop(1, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0)');
      ctxS.fillStyle = glowGrad;
      ctxS.fillRect(0, Math.max(visibleSurfY, 0), WS, HS - Math.max(visibleSurfY, 0));

      // Draw the arc of the star's surface
      // The center is at (sx, sy), we draw a clipped arc
      ctxS.save();
      ctxS.beginPath();
      ctxS.rect(0, 0, WS, HS);
      ctxS.clip();

      // Radial gradient for the star body
      const bodyGrad = ctxS.createRadialGradient(sx, sy, rPx * 0.85, sx, sy, rPx * 1.02);
      bodyGrad.addColorStop(0, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.15)');
      bodyGrad.addColorStop(0.6, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.25)');
      bodyGrad.addColorStop(0.9, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.50)');
      bodyGrad.addColorStop(1, 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0)');
      ctxS.fillStyle = bodyGrad;
      ctxS.beginPath(); ctxS.arc(sx, sy, rPx * 1.02, 0, 2 * Math.PI); ctxS.fill();

      // Bright limb line
      ctxS.strokeStyle = 'rgba(' + r255 + ',' + g255 + ',' + b255 + ',0.7)';
      ctxS.lineWidth = 2;
      ctxS.beginPath(); ctxS.arc(sx, sy, rPx, 0, 2 * Math.PI); ctxS.stroke();

      ctxS.restore();
    }

    // --- Draw Earth ---
    function drawEarth(sx, sy, rPx) {
      const er = Math.max(rPx, 1.2);
      // Blue body
      const eg = ctxS.createRadialGradient(sx - er * 0.2, sy - er * 0.2, er * 0.1, sx, sy, er);
      eg.addColorStop(0, '#7ec8e3');
      eg.addColorStop(0.5, '#4a90d9');
      eg.addColorStop(1, '#2c5f8a');
      ctxS.fillStyle = eg;
      ctxS.beginPath(); ctxS.arc(sx, sy, er, 0, 2 * Math.PI); ctxS.fill();
      // Green patches
      if (er > 4) {
        ctxS.fillStyle = 'rgba(92,184,92,0.5)';
        ctxS.beginPath(); ctxS.arc(sx - er * 0.25, sy - er * 0.15, er * 0.35, 0, 2 * Math.PI); ctxS.fill();
        ctxS.beginPath(); ctxS.arc(sx + er * 0.30, sy + er * 0.10, er * 0.25, 0, 2 * Math.PI); ctxS.fill();
      }
    }

    // --- Main draw ---
    function drawSizes() {
      const z = parseFloat(zoomSlider?.value || 30);
      const scale = getScale(z);
      const camX = getCameraX(z);

      // Background
      ctxS.fillStyle = '#060a10';
      ctxS.fillRect(0, 0, WS, HS);

      // Background star field
      for (const bs of bgStars) {
        ctxS.fillStyle = 'rgba(255,255,255,' + (bs.brightness * 0.7) + ')';
        ctxS.fillRect(bs.x, bs.y, bs.size, bs.size);
      }

      // Determine which stars are horizon-scale, visible, or too small
      const horizonStars = [];
      const visibleStars = [];
      const tinyStars = [];

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const rPx = s.R * scale;
        const [sx, sy] = worldToScreen(worldX[i], worldY, camX, scale);

        if (rPx > HS * 2) {
          horizonStars.push({s, i, sx, sy, rPx});
        } else if (rPx >= 0.8) {
          visibleStars.push({s, i, sx, sy, rPx});
        } else {
          tinyStars.push({s, i, sx, sy, rPx});
        }
      }

      // Draw horizon stars (back to front = largest first)
      horizonStars.sort((a, b) => b.rPx - a.rPx);
      for (const h of horizonStars) {
        drawHorizon(h.s, h.sx, h.sy, h.rPx, camX, scale);
        // Label near the visible surface
        const [cr, cg, cb] = tempToRGB(h.s.T);
        const col = 'rgb(' + Math.round(cr*255) + ',' + Math.round(cg*255) + ',' + Math.round(cb*255) + ')';
        const surfaceY = h.sy - h.rPx;
        const labelY = Math.max(surfaceY + 25, 30);
        if (labelY < HS - 20) {
          ctxS.fillStyle = col; ctxS.font = FONT; ctxS.textAlign = 'center';
          ctxS.fillText(h.s.name + ' (surface)', Math.max(80, Math.min(WS - 80, h.sx)), labelY);
          ctxS.fillStyle = COLORS.textDim; ctxS.font = FONT_SM;
          ctxS.fillText(h.s.R + ' R\u2609 \u00b7 ' + h.s.type + ' \u00b7 ' + h.s.cat, Math.max(80, Math.min(WS - 80, h.sx)), labelY + 16);
        }
      }

      // Draw visible stars (back to front = largest first so small ones draw on top)
      visibleStars.sort((a, b) => b.rPx - a.rPx);
      for (const v of visibleStars) {
        // Skip if way off screen
        if (v.sx + v.rPx < -50 || v.sx - v.rPx > WS + 50) continue;
        if (v.sy + v.rPx < -50 || v.sy - v.rPx > HS + 50) continue;

        const isHover = hoverStar === v.i;
        drawStar(v.s, v.sx, v.sy, v.rPx, isHover);

        // Labels
        const labelAbove = v.sy - v.rPx - 10;
        if (labelAbove > 8 && v.sx > -30 && v.sx < WS + 30) {
          ctxS.textAlign = 'center';
          ctxS.fillStyle = isHover ? '#fff' : 'rgba(255,255,255,0.82)';
          ctxS.font = (isHover || v.rPx > 15) ? FONT : FONT_SM;
          ctxS.fillText(v.s.name, v.sx, labelAbove);
          if (v.rPx > 6 || isHover) {
            ctxS.fillStyle = COLORS.textDim; ctxS.font = '10px Inter, system-ui, sans-serif';
            ctxS.fillText(v.s.R + ' R\u2609 \u00b7 ' + v.s.type, v.sx, labelAbove + 13);
          }
        }

        // Diameter marker <-> with size in km
        if (v.rPx > 15 && v.sx > 0 && v.sx < WS) {
          const dKm = v.s.R * 2 * 696340; // diameter in km
          const exp = Math.floor(Math.log10(dKm));
          const sizeStr = '10' + superscript(exp) + ' km';
          const markerY = v.sy + v.rPx * 0.3;
          const mLeft = v.sx - v.rPx + 4;
          const mRight = v.sx + v.rPx - 4;
          // Dark outline then bright line
          ctxS.strokeStyle = 'rgba(0,0,0,0.5)';
          ctxS.lineWidth = 3;
          ctxS.beginPath(); ctxS.moveTo(mLeft, markerY); ctxS.lineTo(mRight, markerY); ctxS.stroke();
          ctxS.strokeStyle = 'rgba(255,255,200,0.8)';
          ctxS.lineWidth = 1.5;
          ctxS.beginPath(); ctxS.moveTo(mLeft, markerY); ctxS.lineTo(mRight, markerY); ctxS.stroke();
          // Arrows
          const aw = Math.min(8, v.rPx * 0.15);
          ctxS.beginPath(); ctxS.moveTo(mLeft, markerY); ctxS.lineTo(mLeft + aw, markerY - aw/2); ctxS.moveTo(mLeft, markerY); ctxS.lineTo(mLeft + aw, markerY + aw/2); ctxS.stroke();
          ctxS.beginPath(); ctxS.moveTo(mRight, markerY); ctxS.lineTo(mRight - aw, markerY - aw/2); ctxS.moveTo(mRight, markerY); ctxS.lineTo(mRight - aw, markerY + aw/2); ctxS.stroke();
          // Size label — large font with dark pill background
          const fontSize = Math.max(13, Math.min(18, v.rPx * 0.15));
          ctxS.font = fontSize + 'px Inter, system-ui, sans-serif';
          ctxS.textAlign = 'center';
          const tw = ctxS.measureText(sizeStr).width + 12;
          const th = fontSize + 6;
          ctxS.fillStyle = 'rgba(0,0,0,0.75)';
          ctxS.beginPath();
          ctxS.roundRect(v.sx - tw/2, markerY - th - 2, tw, th, 4);
          ctxS.fill();
          ctxS.fillStyle = 'rgba(255,255,200,0.95)';
          ctxS.fillText(sizeStr, v.sx, markerY - 6);
        }
      }

      // Draw Earth next to Sun if Sun is big enough
      const sunIdx = stars.findIndex(s => s.name === 'Sun');
      const sunRPx = stars[sunIdx].R * scale;
      if (sunRPx > 6) {
        const [sunSX, sunSY] = worldToScreen(worldX[sunIdx], worldY, camX, scale);
        const earthPx = earthR * scale;
        const esx = sunSX + sunRPx + Math.max(earthPx, 2) + 5;
        const esy = sunSY;
        if (esx > 0 && esx < WS + 20) {
          drawEarth(esx, esy, earthPx);
          ctxS.fillStyle = '#7ec8e3'; ctxS.font = '10px Inter, system-ui, sans-serif'; ctxS.textAlign = 'center';
          const eLabelY = esy - Math.max(earthPx, 2) - 5;
          if (eLabelY > 8) ctxS.fillText('Earth', esx, eLabelY);
        }
      }

      // --- Scale bar ---
      let scaleBarR = 1, scaleBarLabel = '1 R\u2609';
      let scaleBarPx = scale;
      if (scaleBarPx > WS * 0.35) { scaleBarR = 0.01; scaleBarLabel = '0.01 R\u2609 (\u2248 R\u2295)'; scaleBarPx = 0.01 * scale; }
      else if (scaleBarPx > WS * 0.12) { scaleBarR = 0.1; scaleBarLabel = '0.1 R\u2609'; scaleBarPx = 0.1 * scale; }
      else if (scaleBarPx < 2) { scaleBarR = 100; scaleBarLabel = '100 R\u2609'; scaleBarPx = 100 * scale; }
      else if (scaleBarPx < 10) { scaleBarR = 10; scaleBarLabel = '10 R\u2609'; scaleBarPx = 10 * scale; }
      if (scaleBarPx > 1 && scaleBarPx < WS * 0.45) {
        const sbY = HS - 18;
        const sbX = WS - 20 - scaleBarPx;
        ctxS.strokeStyle = 'rgba(255,255,255,0.4)'; ctxS.lineWidth = 1.5;
        ctxS.beginPath(); ctxS.moveTo(sbX, sbY); ctxS.lineTo(sbX + scaleBarPx, sbY); ctxS.stroke();
        ctxS.beginPath(); ctxS.moveTo(sbX, sbY - 4); ctxS.lineTo(sbX, sbY + 4); ctxS.stroke();
        ctxS.beginPath(); ctxS.moveTo(sbX + scaleBarPx, sbY - 4); ctxS.lineTo(sbX + scaleBarPx, sbY + 4); ctxS.stroke();
        ctxS.fillStyle = 'rgba(255,255,255,0.5)'; ctxS.font = '10px Inter, system-ui, sans-serif'; ctxS.textAlign = 'center';
        ctxS.fillText(scaleBarLabel, sbX + scaleBarPx / 2, sbY - 8);
      }

      // --- "Too small" indicators ---
      const tooSmallNames = tinyStars.map(t => t.s.name);
      if (tooSmallNames.length > 0 && tooSmallNames.length < stars.length) {
        ctxS.fillStyle = 'rgba(255,255,255,0.30)'; ctxS.font = '10px Inter, system-ui, sans-serif'; ctxS.textAlign = 'left';
        ctxS.fillText('Zoom in to see: ' + tooSmallNames.join(', '), 10, HS - 8);
      }

      // --- "Off screen" arrows for stars that are visible-sized but outside viewport ---
      for (const v of visibleStars) {
        if (v.sx >= -50 && v.sx <= WS + 50) continue;
        const arrowY = Math.max(30, Math.min(HS - 30, v.sy));
        const isLeft = v.sx < 0;
        const ax = isLeft ? 14 : WS - 14;
        ctxS.fillStyle = 'rgba(255,255,255,0.4)'; ctxS.font = '10px Inter, system-ui, sans-serif';
        ctxS.textAlign = isLeft ? 'left' : 'right';
        const arrow = isLeft ? '\u2190 ' : '';
        const arrowR = isLeft ? '' : ' \u2192';
        ctxS.fillText(arrow + v.s.name + arrowR, ax, arrowY);
      }

      // --- Hover tooltip ---
      if (hoverStar >= 0) {
        const s = stars[hoverStar];
        const rKm = Math.round(s.R * 696340);
        const info = s.name + '  |  ' + s.R + ' R\u2609 (' + rKm.toLocaleString() + ' km)  |  T = ' + s.T + ' K  |  ' + s.type + ' (' + s.cat + ')';
        ctxS.font = FONT_SM;
        const tw = ctxS.measureText(info).width + 20;
        const tx = Math.max(4, Math.min(WS - tw - 4, WS / 2 - tw / 2));
        const ty = 8;
        ctxS.fillStyle = 'rgba(0,0,0,0.85)';
        const bh = 24;
        ctxS.beginPath();
        const br = 4;
        ctxS.moveTo(tx + br, ty); ctxS.lineTo(tx + tw - br, ty); ctxS.arcTo(tx + tw, ty, tx + tw, ty + br, br);
        ctxS.lineTo(tx + tw, ty + bh - br); ctxS.arcTo(tx + tw, ty + bh, tx + tw - br, ty + bh, br);
        ctxS.lineTo(tx + br, ty + bh); ctxS.arcTo(tx, ty + bh, tx, ty + bh - br, br);
        ctxS.lineTo(tx, ty + br); ctxS.arcTo(tx, ty, tx + br, ty, br);
        ctxS.fill();
        ctxS.strokeStyle = 'rgba(255,255,255,0.2)'; ctxS.lineWidth = 1;
        ctxS.beginPath();
        ctxS.moveTo(tx + br, ty); ctxS.lineTo(tx + tw - br, ty); ctxS.arcTo(tx + tw, ty, tx + tw, ty + br, br);
        ctxS.lineTo(tx + tw, ty + bh - br); ctxS.arcTo(tx + tw, ty + bh, tx + tw - br, ty + bh, br);
        ctxS.lineTo(tx + br, ty + bh); ctxS.arcTo(tx, ty + bh, tx, ty + bh - br, br);
        ctxS.lineTo(tx, ty + br); ctxS.arcTo(tx, ty, tx + br, ty, br);
        ctxS.stroke();
        ctxS.fillStyle = '#fff'; ctxS.textAlign = 'left';
        ctxS.fillText(info, tx + 10, ty + 16);
      }

      // Zoom label
      if (zoomLabel) {
        if (scale >= 1) {
          zoomLabel.textContent = '1 px = ' + (1 / scale).toFixed(3) + ' R\u2609';
        } else {
          zoomLabel.textContent = '1 px = ' + (1 / scale).toFixed(1) + ' R\u2609';
        }
      }
    }

    // --- Hit testing ---
    function hitTest(mx, my) {
      const z = parseFloat(zoomSlider?.value || 30);
      const scale = getScale(z);
      const camX = getCameraX(z);
      let closest = -1, closestDist = Infinity;
      for (let i = 0; i < stars.length; i++) {
        const rPx = stars[i].R * scale;
        if (rPx < 0.8) continue;
        const [sx, sy] = worldToScreen(worldX[i], worldY, camX, scale);
        const d = Math.hypot(mx - sx, my - sy);
        const hitR = Math.max(rPx, 12);
        if (d < hitR && d < closestDist) {
          closestDist = d; closest = i;
        }
      }
      // Also check horizon stars — hit if mouse is within the arc area
      for (let i = 0; i < stars.length; i++) {
        const rPx = stars[i].R * scale;
        if (rPx <= HS * 2) continue;
        const [sx, sy] = worldToScreen(worldX[i], worldY, camX, scale);
        const d = Math.hypot(mx - sx, my - sy);
        if (d < rPx && my > sy - rPx) { closest = i; break; }
      }
      return closest;
    }

    // --- Events ---
    cSizes.addEventListener('mousemove', e => {
      const rect = cSizes.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (WS / rect.width);
      mouseY = (e.clientY - rect.top) * (HS / rect.height);
      const newHover = hitTest(mouseX, mouseY);
      if (newHover !== hoverStar) { hoverStar = newHover; drawSizes(); }
      cSizes.style.cursor = newHover >= 0 ? 'pointer' : 'default';
    });

    cSizes.addEventListener('mouseleave', () => {
      hoverStar = -1; mouseX = -1; mouseY = -1; drawSizes();
    });

    cSizes.addEventListener('wheel', e => {
      e.preventDefault();
      let z = parseFloat(zoomSlider?.value || 30);
      z -= e.deltaY * 0.1;
      z = Math.max(0, Math.min(100, z));
      if (zoomSlider) zoomSlider.value = z;
      drawSizes();
    }, {passive: false});

    zoomSlider?.addEventListener('input', drawSizes);
    drawSizes();
  }
}
