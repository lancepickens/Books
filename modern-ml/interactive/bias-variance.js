/* Interactive · Bias–variance tradeoff via polynomial fitting.
   True function: f*(x) = sin(2πx) on [0, 1].
   Sample N noisy points; fit polynomial of degree d; show train + test error.
   Mounts into any [data-widget='bias-variance'] section. */

(function () {
  "use strict";

  const W = 520, H = 320;
  const M = { l: 42, r: 16, t: 18, b: 32 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  const SIGMA = 0.22;
  const N_TRAIN = 15;
  const N_DENSE = 200;

  const trueFn = x => Math.sin(2 * Math.PI * x);

  document.querySelectorAll("[data-widget='bias-variance']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const degWrap = document.createElement("label");
    degWrap.style.fontFamily = "Inter, sans-serif";
    degWrap.style.fontSize = "0.82rem";
    degWrap.style.color = "#1c1f21";
    degWrap.style.display = "flex";
    degWrap.style.alignItems = "center";
    degWrap.style.gap = "0.5rem";
    degWrap.innerHTML = `<span>degree <span data-role="deg-val" style="font-weight:600;color:${ACCENT}">3</span></span>`;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "12";
    slider.value = "3";
    slider.step = "1";
    slider.style.width = "180px";
    slider.style.accentColor = ACCENT;
    degWrap.appendChild(slider);
    controls.appendChild(degWrap);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Resample noise";
    styleBtn(btn);
    controls.appendChild(btn);

    // Plot
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // Readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = "#5f6d72";
    readout.style.textAlign = "center";
    readout.style.minHeight = "1.3em";
    host.appendChild(readout);

    // Legend
    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML = `
      <span><span style="display:inline-block;width:24px;height:2px;background:#1c1f21;vertical-align:middle;margin-right:0.35em"></span>true function</span>
      <span><span style="display:inline-block;width:24px;height:2px;background:${ACCENT};vertical-align:middle;margin-right:0.35em"></span>polynomial fit</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${SAND};vertical-align:middle;margin-right:0.35em"></span>training points</span>
    `;
    host.appendChild(legend);

    let data = sample();

    function redraw() {
      const d = +slider.value;
      degWrap.querySelector("[data-role='deg-val']").textContent = d;
      const fit = fitPoly(data.x, data.y, d);
      const dense = denseEval(fit);
      const trainErr = mse(data.x.map(x => evalPoly(fit, x)), data.y);
      const testErr = denseTestError(fit);
      render(svg, data, dense, fit);
      readout.innerHTML =
        `train MSE <strong style="color:${ACCENT_DEEP}">${trainErr.toFixed(3)}</strong> &nbsp;·&nbsp; ` +
        `test MSE <strong style="color:${ACCENT_DEEP}">${testErr.toFixed(3)}</strong> &nbsp;·&nbsp; ` +
        `noise floor σ² ≈ ${(SIGMA * SIGMA).toFixed(3)}`;
    }

    slider.addEventListener("input", redraw);
    btn.addEventListener("click", () => {
      data = sample();
      redraw();
    });

    redraw();
  }

  function styleBtn(b) {
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.78rem";
    b.style.padding = "0.32rem 0.85rem";
    b.style.border = "1px solid " + ACCENT;
    b.style.background = "#ffffff";
    b.style.color = ACCENT;
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
    b.style.transition = "background 100ms, color 100ms";
    b.addEventListener("mouseenter", () => { b.style.background = ACCENT; b.style.color = "#fff"; });
    b.addEventListener("mouseleave", () => { b.style.background = "#fff"; b.style.color = ACCENT; });
  }

  function sample() {
    const x = [], y = [];
    for (let i = 0; i < N_TRAIN; i++) {
      const xi = (i + 0.5) / N_TRAIN;        // even spacing in [0,1]
      const jitter = (Math.random() - 0.5) * 0.05;
      x.push(Math.max(0, Math.min(1, xi + jitter)));
      y.push(trueFn(x[i]) + gauss() * SIGMA);
    }
    return { x, y };
  }

  function gauss() {
    // Box–Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Fit polynomial of degree d via normal equations with mild ridge for numerical stability.
  function fitPoly(xs, ys, d) {
    const N = xs.length, P = d + 1;
    // Build design matrix X: N x P
    const X = [];
    for (let i = 0; i < N; i++) {
      const row = new Array(P);
      let v = 1;
      for (let p = 0; p < P; p++) { row[p] = v; v *= xs[i]; }
      X.push(row);
    }
    // X^T X (P x P), X^T y (P)
    const XtX = matZeros(P, P);
    const Xty = new Array(P).fill(0);
    for (let i = 0; i < N; i++) {
      for (let p = 0; p < P; p++) {
        Xty[p] += X[i][p] * ys[i];
        for (let q = 0; q < P; q++) {
          XtX[p][q] += X[i][p] * X[i][q];
        }
      }
    }
    // Tiny ridge to keep things invertible for high-degree (degenerate) cases.
    const lam = 1e-8;
    for (let p = 0; p < P; p++) XtX[p][p] += lam;
    return solveLinear(XtX, Xty);
  }

  function matZeros(r, c) {
    const m = [];
    for (let i = 0; i < r; i++) m.push(new Array(c).fill(0));
    return m;
  }

  // Gaussian elimination with partial pivoting; returns x in Ax=b.
  function solveLinear(A_in, b_in) {
    const n = b_in.length;
    const A = A_in.map(row => row.slice());
    const b = b_in.slice();
    for (let k = 0; k < n; k++) {
      // pivot
      let maxRow = k, maxVal = Math.abs(A[k][k]);
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(A[i][k]) > maxVal) { maxVal = Math.abs(A[i][k]); maxRow = i; }
      }
      if (maxRow !== k) {
        [A[k], A[maxRow]] = [A[maxRow], A[k]];
        [b[k], b[maxRow]] = [b[maxRow], b[k]];
      }
      const piv = A[k][k] || 1e-14;
      for (let i = k + 1; i < n; i++) {
        const f = A[i][k] / piv;
        for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
        b[i] -= f * b[k];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = s / (A[i][i] || 1e-14);
    }
    return x;
  }

  function evalPoly(coef, x) {
    let v = 0, p = 1;
    for (let k = 0; k < coef.length; k++) { v += coef[k] * p; p *= x; }
    return v;
  }

  function denseEval(coef) {
    const pts = [];
    for (let i = 0; i < N_DENSE; i++) {
      const x = i / (N_DENSE - 1);
      pts.push({ x, y: evalPoly(coef, x), yTrue: trueFn(x) });
    }
    return pts;
  }

  function mse(pred, y) {
    let s = 0;
    for (let i = 0; i < pred.length; i++) s += (pred[i] - y[i]) ** 2;
    return s / pred.length;
  }

  // Test "error" against the true function on a dense grid — captures bias + variance,
  // excluding irreducible noise σ². The honest comparison for an MSE relative to noise floor.
  function denseTestError(coef) {
    let s = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      const e = evalPoly(coef, x) - trueFn(x);
      s += e * e;
    }
    return s / N;
  }

  function render(svg, data, dense, coef) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ns = "http://www.w3.org/2000/svg";

    // Scales: x in [0,1], y in [-1.5, 1.5]
    const xScale = x => M.l + x * PW;
    const yScale = y => M.t + ((1.5 - y) / 3.0) * PH;

    // Axes
    const xAxis = svg.appendChild(document.createElementNS(ns, "line"));
    xAxis.setAttribute("x1", M.l); xAxis.setAttribute("x2", M.l + PW);
    xAxis.setAttribute("y1", yScale(0)); xAxis.setAttribute("y2", yScale(0));
    xAxis.setAttribute("stroke", FAINT); xAxis.setAttribute("stroke-width", "0.6");

    // y ticks
    [-1, 0, 1].forEach(yt => {
      const t = svg.appendChild(document.createElementNS(ns, "text"));
      t.setAttribute("x", M.l - 6);
      t.setAttribute("y", yScale(yt) + 3.5);
      t.setAttribute("text-anchor", "end");
      t.setAttribute("font-family", "Inter, sans-serif");
      t.setAttribute("font-size", "10");
      t.setAttribute("fill", FAINT);
      t.textContent = yt.toFixed(0);
    });
    // x ticks
    [0, 0.25, 0.5, 0.75, 1].forEach(xt => {
      const t = svg.appendChild(document.createElementNS(ns, "text"));
      t.setAttribute("x", xScale(xt));
      t.setAttribute("y", H - 8);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", "Inter, sans-serif");
      t.setAttribute("font-size", "10");
      t.setAttribute("fill", FAINT);
      t.textContent = xt.toString();
    });

    // True function (black)
    const truePath = makePath(dense.map(d => [xScale(d.x), yScale(d.yTrue)]));
    const trueEl = svg.appendChild(document.createElementNS(ns, "path"));
    trueEl.setAttribute("d", truePath);
    trueEl.setAttribute("fill", "none");
    trueEl.setAttribute("stroke", "#1c1f21");
    trueEl.setAttribute("stroke-width", "1.4");

    // Fit (accent) — clip to plot region by clamping
    const clipped = dense.map(d => {
      const y = Math.max(-1.5, Math.min(1.5, d.y));
      return [xScale(d.x), yScale(y)];
    });
    const fitPath = makePath(clipped);
    const fitEl = svg.appendChild(document.createElementNS(ns, "path"));
    fitEl.setAttribute("d", fitPath);
    fitEl.setAttribute("fill", "none");
    fitEl.setAttribute("stroke", ACCENT);
    fitEl.setAttribute("stroke-width", "1.8");

    // Training points
    data.x.forEach((x, i) => {
      const c = svg.appendChild(document.createElementNS(ns, "circle"));
      c.setAttribute("cx", xScale(x));
      c.setAttribute("cy", yScale(Math.max(-1.5, Math.min(1.5, data.y[i]))));
      c.setAttribute("r", "3.2");
      c.setAttribute("fill", SAND);
      c.setAttribute("stroke", "#fff");
      c.setAttribute("stroke-width", "0.8");
    });

    // Axis labels
    const xl = svg.appendChild(document.createElementNS(ns, "text"));
    xl.setAttribute("x", M.l + PW / 2);
    xl.setAttribute("y", H - 2);
    xl.setAttribute("text-anchor", "middle");
    xl.setAttribute("font-family", "Source Serif 4, serif");
    xl.setAttribute("font-style", "italic");
    xl.setAttribute("font-size", "12");
    xl.setAttribute("fill", "#5f6d72");
    xl.textContent = "x";

    const yl = svg.appendChild(document.createElementNS(ns, "text"));
    yl.setAttribute("x", 14);
    yl.setAttribute("y", M.t + PH / 2);
    yl.setAttribute("text-anchor", "middle");
    yl.setAttribute("font-family", "Source Serif 4, serif");
    yl.setAttribute("font-style", "italic");
    yl.setAttribute("font-size", "12");
    yl.setAttribute("fill", "#5f6d72");
    yl.setAttribute("transform", `rotate(-90, 14, ${M.t + PH / 2})`);
    yl.textContent = "y";
  }

  function makePath(pts) {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    return d;
  }
})();
