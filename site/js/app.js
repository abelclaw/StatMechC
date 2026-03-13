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

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('show');
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
  const cClt = document.getElementById('vis-clt');
  if (cClt) {
    const clt = setupCanvas(cClt);
    const ctx2 = clt.ctx, W2 = clt.W, H2 = clt.H;
    const nSlider = document.getElementById('clt-n');

    function drawCLT() {
      const N = parseInt(nSlider?.value || 1);
      clearCanvas(ctx2, W2, H2);

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
        let sum = 0;
        for (let j = 0; j < bins; j++) sum += newDist[j];
        for (let j = 0; j < bins; j++) newDist[j] /= sum;
        dist = newDist;
      }

      const maxVal = Math.max(...dist);
      const xAxis = H2 - 40;
      const barW = (W2 - 60) / bins;

      ctx2.fillStyle = 'rgba(102,187,106,0.5)';
      for (let i = 0; i < bins; i++) {
        const barH = (dist[i] / maxVal) * (xAxis - 20);
        const x = 30 + i * barW;
        ctx2.fillRect(x, xAxis - barH, barW, barH);
      }

      // Gaussian overlay
      const mean = bins / 2;
      const sigma = (bins / (2 * Math.sqrt(3))) / Math.sqrt(N);
      ctx2.strokeStyle = COLORS.red;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      for (let i = 0; i < bins; i++) {
        const gaussVal = Math.exp(-0.5 * ((i - mean) / sigma) ** 2);
        const x = 30 + i * barW + barW / 2;
        const y = xAxis - gaussVal * (xAxis - 20);
        i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
      }
      ctx2.stroke();

      ctx2.fillStyle = COLORS.text;
      ctx2.font = FONT_LG;
      ctx2.textAlign = 'center';
      ctx2.fillText('N = ' + N + ' (average of ' + N + ' uniform draws)', W2 / 2, 20);
      ctx2.font = FONT_SM;
      ctx2.fillStyle = COLORS.green;
      ctx2.fillText('Simulation', W2 / 2 - 80, 38);
      ctx2.fillStyle = COLORS.red;
      ctx2.fillText('Gaussian fit', W2 / 2 + 80, 38);

      document.getElementById('clt-n-val')?.replaceChildren(document.createTextNode(N));
    }

    nSlider?.addEventListener('input', drawCLT);
    drawCLT();
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

      // Gaussian overlay for N >= 2
      if (N >= 2) {
        const sig = 1 / (Math.sqrt(12) * Math.sqrt(N)); // sigma of mean of N uniform[-0.5,0.5]
        ctxC.strokeStyle = COLORS.red;
        ctxC.lineWidth = 1.5;
        ctxC.setLineDash([6, 4]);
        ctxC.beginPath();
        for (let i = 0; i < nPts; i++) {
          const xbar = xMin + (xMax - xMin) * i / nPts;
          const g = (1 / (sig * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * (xbar / sig) ** 2);
          const px = ox + i / nPts * plotW;
          const py = xAxis - g * yScale;
          i === 0 ? ctxC.moveTo(px, py) : ctxC.lineTo(px, py);
        }
        ctxC.stroke();
        ctxC.setLineDash([]);
      }

      // Labels
      ctxC.fillStyle = COLORS.text;
      ctxC.font = FONT;
      ctxC.textAlign = 'left';
      ctxC.fillText('N = ' + N + (N === 1 ? ' (uniform)' : N === 2 ? ' (triangle)' : ' (converging to Gaussian)'), ox + 5, 28);
      ctxC.fillStyle = COLORS.green;
      ctxC.fillText('P\u2099(x\u0304)', WC - 150, 28);
      if (N >= 2) {
        ctxC.fillStyle = COLORS.red;
        ctxC.fillText('Gaussian fit', WC - 150, 44);
      }

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
    if (startBtn) startBtn.textContent = running ? 'Pause' : 'Start';
    if (running) animate();
  });

  resetBtn?.addEventListener('click', () => {
    running = false;
    if (startBtn) startBtn.textContent = 'Start';
    reset();
    draw();
  });

  reset();
  draw();

  // ----- Diffusion Equation -----
  const c2 = document.getElementById('vis-diffusion');
  if (!c2) return;
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


// =============================================================================
// CH3: Equilibrium - Double Pendulum / Chaos + Maxwell-Boltzmann
// =============================================================================
function initCh3Vis() {
  const c = document.getElementById('vis-chaos');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const L1 = 80, L2 = 80, m1 = 1, m2 = 1, g = 9.81;
  let pends = [];

  function initPendulums() {
    const offset = parseFloat(document.getElementById('chaos-offset')?.value || 0.01);
    pends = [
      { th1: Math.PI / 2, th2: Math.PI / 2, w1: 0, w2: 0, trail: [], color: COLORS.blue },
      { th1: Math.PI / 2 + offset, th2: Math.PI / 2, w1: 0, w2: 0, trail: [], color: COLORS.red }
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

    const ox = W / 2, oy = 120;

    pends.forEach(p => {
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
    ctx.fillText('Two double pendulums with tiny initial difference', 10, 20);
    ctx.fillStyle = COLORS.blue; ctx.fillText('Pendulum 1', 10, 38);
    ctx.fillStyle = COLORS.red; ctx.fillText('Pendulum 2', 10, 54);
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
    if (d) d.textContent = parseFloat(this.value).toFixed(4);
  });

  initPendulums();
  draw();

  // ----- Maxwell-Boltzmann Speed Distribution -----
  const cMB = document.getElementById('vis-maxwell');
  if (!cMB) return;
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
  if (!cHC) return;
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
}


// =============================================================================
// CH7: Ensembles - Boltzmann Distribution
// =============================================================================
function initCh7Vis() {
  const c = document.getElementById('vis-boltzmann');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const betaSlider = document.getElementById('boltz-beta');

  function draw() {
    const beta = parseFloat(betaSlider?.value || 1);
    clearCanvas(ctx, W, H);

    const ox = 60, xAxis = H - 50;

    drawAxes(ctx, ox, 20, W - ox - 30, xAxis - 20, {
      xLabel: 'Energy E',
      yLabel: 'P(E) = e^{-\u03B2E} / Z'
    });

    const maxE = 5;
    const eScale = (W - ox - 40) / maxE;

    // Filled area
    ctx.fillStyle = 'rgba(79,195,247,0.2)';
    ctx.beginPath();
    ctx.moveTo(ox, xAxis);
    for (let px = 0; px < W - ox - 40; px++) {
      const E = px / eScale;
      const P = beta * Math.exp(-beta * E);
      const py = xAxis - P * (xAxis - 30) / beta;
      ctx.lineTo(ox + px, py);
    }
    ctx.lineTo(W - 40, xAxis);
    ctx.closePath();
    ctx.fill();

    // Curve
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let px = 0; px < W - ox - 40; px++) {
      const E = px / eScale;
      const P = beta * Math.exp(-beta * E);
      const py = xAxis - P * (xAxis - 30) / beta;
      px === 0 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
    }
    ctx.stroke();

    // Mean energy line
    const meanE = 1 / beta;
    const meanPx = ox + meanE * eScale;
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(meanPx, 20); ctx.lineTo(meanPx, xAxis); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.red;
    ctx.font = FONT_SM;
    ctx.textAlign = 'center';
    ctx.fillText('\u27E8E\u27E9 = 1/\u03B2 = ' + meanE.toFixed(2), meanPx, xAxis + 15);

    ctx.fillStyle = COLORS.text;
    ctx.font = FONT_LG;
    ctx.textAlign = 'left';
    ctx.fillText('\u03B2 = 1/kT = ' + beta.toFixed(2) + '  \u2192  T \u221D ' + (1 / beta).toFixed(2), 80, 30);

    document.getElementById('boltz-beta-val')?.replaceChildren(document.createTextNode(beta.toFixed(2)));
  }

  betaSlider?.addEventListener('input', draw);
  draw();
}


// =============================================================================
// CH8: Free Energy
// =============================================================================
function initCh8Vis() {
  const c = document.getElementById('vis-freeenergy');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  const tempSlider = document.getElementById('fe-temp');

  function draw() {
    const T = parseFloat(tempSlider?.value || 1);
    clearCanvas(ctx, W, H);

    const ox = 60, xAxis = H - 50;
    const xRange = W - ox - 40;

    drawAxes(ctx, ox, 20, xRange, xAxis - 20, { xLabel: 'State parameter x' });

    const midY = (xAxis + 20) / 2;
    const scale = (xAxis - 40) / 8;

    // Energy curve E(x) = x^2
    ctx.strokeStyle = COLORS.red;
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
    ctx.strokeStyle = COLORS.green;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px < xRange; px++) {
      const x = (px / xRange - 0.5) * 4;
      const S = 2 - 0.5 * x * x;
      const nTS = -T * S;
      const py = midY - nTS * scale / 4;
      px === 0 ? ctx.moveTo(ox + px, py) : ctx.lineTo(ox + px, py);
    }
    ctx.stroke();

    // Free energy F = E - TS
    ctx.strokeStyle = COLORS.orange;
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
    ctx.fillStyle = COLORS.orange;
    ctx.beginPath(); ctx.arc(ox + minFx, minPy, 5, 0, 2 * Math.PI); ctx.fill();

    // Legend
    ctx.font = FONT_SM;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.red; ctx.fillText('E (energy)', W - 160, 30);
    ctx.fillStyle = COLORS.green; ctx.fillText('-TS', W - 160, 48);
    ctx.fillStyle = COLORS.orange; ctx.fillText('F = E - TS (free energy)', W - 160, 66);

    ctx.fillStyle = COLORS.text;
    ctx.font = FONT;
    ctx.fillText('T = ' + T.toFixed(1), 80, 30);
    ctx.fillText('System minimizes F, not E', 80, 48);

    document.getElementById('fe-temp-val')?.replaceChildren(document.createTextNode(T.toFixed(1)));
  }

  tempSlider?.addEventListener('input', draw);
  draw();
}


// =============================================================================
// CH9: Phase Transitions + 2D Ising Model
// =============================================================================
function initCh9Vis() {
  // ----- Phase Diagram -----
  const c = document.getElementById('vis-phase');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  function drawPhaseDiagram() {
    clearCanvas(ctx, W, H);

    const ox = 80, oy = 30, pw = W - 120, ph = H - 80;

    drawAxes(ctx, ox, oy, pw, ph, { xLabel: 'Temperature', yLabel: 'Pressure', yLabelOffset: 40 });

    const tp = { x: ox + pw * 0.25, y: oy + ph * 0.65 };
    const cp = { x: ox + pw * 0.7, y: oy + ph * 0.25 };

    // Solid region
    ctx.fillStyle = 'rgba(79,195,247,0.1)';
    ctx.beginPath();
    ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ph); ctx.lineTo(tp.x, tp.y); ctx.lineTo(ox + pw * 0.15, oy);
    ctx.closePath(); ctx.fill();

    // Liquid region
    ctx.fillStyle = 'rgba(102,187,106,0.1)';
    ctx.beginPath();
    ctx.moveTo(ox + pw * 0.15, oy); ctx.lineTo(tp.x, tp.y); ctx.lineTo(cp.x, cp.y); ctx.lineTo(ox + pw * 0.6, oy);
    ctx.closePath(); ctx.fill();

    // Gas region
    ctx.fillStyle = 'rgba(239,83,80,0.07)';
    ctx.beginPath();
    ctx.moveTo(tp.x, tp.y); ctx.lineTo(ox + pw, oy + ph); ctx.lineTo(ox + pw, oy);
    ctx.lineTo(ox + pw * 0.6, oy); ctx.lineTo(cp.x, cp.y);
    ctx.closePath(); ctx.fill();

    // Phase boundaries
    ctx.strokeStyle = COLORS.blue; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(ox + pw * 0.15, oy); ctx.stroke();

    ctx.strokeStyle = COLORS.green;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.quadraticCurveTo(ox + pw * 0.5, oy + ph * 0.5, cp.x, cp.y); ctx.stroke();

    ctx.strokeStyle = COLORS.red;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.quadraticCurveTo(ox + pw * 0.15, oy + ph * 0.85, ox, oy + ph); ctx.stroke();

    // Supercritical dashed
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(cp.x, oy + ph); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cp.x, cp.y); ctx.lineTo(ox + pw, cp.y); ctx.stroke();
    ctx.setLineDash([]);

    // Points
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(tp.x, tp.y, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(cp.x, cp.y, 5, 0, 2 * Math.PI); ctx.fill();

    // Labels
    ctx.font = FONT_LG; ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.blue; ctx.fillText('SOLID', ox + pw * 0.12, oy + ph * 0.35);
    ctx.fillStyle = COLORS.green; ctx.fillText('LIQUID', ox + pw * 0.4, oy + ph * 0.25);
    ctx.fillStyle = COLORS.red; ctx.fillText('GAS', ox + pw * 0.7, oy + ph * 0.6);

    ctx.fillStyle = COLORS.text; ctx.font = FONT_SM;
    ctx.fillText('Triple Point', tp.x, tp.y + 18);
    ctx.fillText('Critical Point', cp.x, cp.y - 12);

    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Supercritical', ox + pw * 0.85, oy + ph * 0.15);
    ctx.fillText('Fluid', ox + pw * 0.85, oy + ph * 0.2);
  }

  c.addEventListener('mousemove', (e) => {
    drawPhaseDiagram();
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(mx, my, 4, 0, 2 * Math.PI); ctx.fill();
  });

  drawPhaseDiagram();

  // ----- 2D Ising Model -----
  const cIsing = document.getElementById('vis-ising');
  if (!cIsing) return;
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
  if (!cDebye) return;
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
}


// =============================================================================
// CH14: Semiconductors - Band Gap
// =============================================================================
function initCh14Vis() {
  const c = document.getElementById('vis-bands');
  if (!c) return;
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


// =============================================================================
// CH15: Stars - HR Diagram
// =============================================================================
function initCh15Vis() {
  const c = document.getElementById('vis-hr');
  if (!c) return;
  const { ctx, W, H } = setupCanvas(c);

  function draw() {
    ctx.fillStyle = '#060a10';
    ctx.fillRect(0, 0, W, H);

    const ox = 70, oy = 30, pw = W - 100, ph = H - 80;

    // Axes
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + ph); ctx.lineTo(ox + pw, oy + ph); ctx.stroke();

    ctx.fillStyle = COLORS.text; ctx.font = FONT_SM; ctx.textAlign = 'center';
    ctx.fillText('Temperature (K) \u2192  \u2190 hotter', ox + pw / 2, oy + ph + 25);
    ctx.save(); ctx.translate(ox - 30, oy + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Luminosity (L/L\u2609)', 0, 0); ctx.restore();

    // Temp axis labels (reversed)
    const tempLabels = [40000, 20000, 10000, 5000, 3000];
    tempLabels.forEach(T => {
      const x = ox + (1 - (Math.log10(T) - Math.log10(3000)) / (Math.log10(40000) - Math.log10(3000))) * pw;
      ctx.fillStyle = COLORS.textDim; ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillText(T.toString(), x, oy + ph + 12);
    });

    // Luminosity labels
    const lumLabels = [-4, -2, 0, 2, 4, 6];
    lumLabels.forEach(l => {
      const y = oy + ph - (l + 4) / 10 * ph;
      ctx.fillStyle = COLORS.textDim; ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('10^' + l, ox - 5, y + 4);
    });
    ctx.textAlign = 'center';

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

      const grd = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      grd.addColorStop(0, col + 'aa');
      grd.addColorStop(1, col + '00');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(x, y, size * 3, 0, 2 * Math.PI); ctx.fill();

      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, size, 0, 2 * Math.PI); ctx.fill();

      if (label) {
        ctx.fillStyle = COLORS.text; ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.fillText(label, x, y - size - 6);
      }
    }

    // Main sequence
    const msStars = [
      [35000, 200000, 5], [25000, 50000, 4.5], [15000, 5000, 4],
      [10000, 500, 3.5], [7500, 50, 3], [6000, 2, 2.5],
      [5800, 1, 2.5], [5000, 0.5, 2], [4000, 0.1, 1.8], [3000, 0.01, 1.5]
    ];

    // Main sequence band
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
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
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = FONT_LG;
    ctx.fillText('Main Sequence', ox + pw * 0.5, oy + ph * 0.55);
    ctx.fillText('Giants', ox + pw * 0.65, oy + ph * 0.15);
    ctx.fillText('Supergiants', ox + pw * 0.45, oy + ph * 0.08);
    ctx.fillText('White Dwarfs', ox + pw * 0.25, oy + ph * 0.88);
  }

  draw();
}
