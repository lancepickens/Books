/* Interactive · Ridge regression path on degree-9 polynomial features.
   λ slider sweeps log-scale from 1e-6 to 1e2.
   Shows the fit on top, the coefficient magnitudes on the bottom.
   Mounts into any [data-widget='ridge-path'] section. */

(function () {
  "use strict";

  const W = 520, H = 400;
  const FIT_H = 230, BAR_H = 130;
  const M = { l: 42, r: 16, t: 18, b: 28 };
  const FIT_PW = W - M.l - M.r, FIT_PH = FIT_H - M.t - M.b;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  const SIGMA = 0.20;
  const N_TRAIN = 15;
  const N_DENSE = 200;
  const DEGREE = 9;

  const trueFn = x => Math.sin(2 * Math.PI * x);

  document.querySelectorAll("[data-widget='ridge-path']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const lamWrap = document.createElement("label");
    lamWrap.style.fontFamily = "Inter, sans-serif";
    lamWrap.style.fontSize = "0.82rem";
    lamWrap.style.display = "flex";
    lamWrap.style.alignItems = "center";
    lamWrap.style.gap = "0.5rem";
    lamWrap.innerHTML = `<span>log₁₀ λ <span data-role="lam-val" style="font-weight:600;color:${ACCENT}">−4.0</span></span>`;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "-6"; slider.max = "2"; slider.step = "0.1"; slider.value = "-4";
    slider.style.width = "200px";
    slider.style.accentColor = ACCENT;
    lamWrap.appendChild(slider);
    controls.appendChild(lamWrap);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Resample data";
    styleBtn(btn);
    controls.appendChild(btn);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = "#5f6d72";
    readout.style.textAlign = "center";
    host.appendChild(readout);

    let data = sample();

    function redraw() {
      const logLam = +slider.value;
      const lam = Math.pow(10, logLam);
      lamWrap.querySelector("[data-role='lam-val']").textContent = logLam.toFixed(1);
      const coef = fitRidge(data.x, data.y, DEGREE, lam);
      render(svg, data, coef, lam);
      const trainErr = mse(data.x.map(x => evalPoly(coef, x)), data.y);
      const testErr = denseErr(coef);
      const wnorm = Math.sqrt(coef.reduce((a, c) => a + c * c, 0));
      readout.innerHTML =
        `λ = <strong style="color:${ACCENT_DEEP}">${lam.toExponential(1)}</strong> &nbsp;·&nbsp; ` +
        `‖w‖₂ = <strong style="color:${ACCENT_DEEP}">${wnorm.toFixed(2)}</strong> &nbsp;·&nbsp; ` +
        `train MSE ${trainErr.toFixed(3)} &nbsp;·&nbsp; test MSE ${testErr.toFixed(3)}`;
    }

    slider.addEventListener("input", redraw);
    btn.addEventListener("click", () => { data = sample(); redraw(); });

    redraw();
  }

  function styleBtn(b) {
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.78rem";
    b.style.padding = "0.32rem 0.85rem";
    b.style.border = "1px solid " + ACCENT;
    b.style.background = "#fff";
    b.style.color = ACCENT;
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
    b.addEventListener("mouseenter", () => { b.style.background = ACCENT; b.style.color = "#fff"; });
    b.addEventListener("mouseleave", () => { b.style.background = "#fff"; b.style.color = ACCENT; });
  }

  function sample() {
    const x = [], y = [];
    for (let i = 0; i < N_TRAIN; i++) {
      const xi = (i + 0.5) / N_TRAIN + (Math.random() - 0.5) * 0.03;
      x.push(Math.max(0.01, Math.min(0.99, xi)));
      y.push(trueFn(x[i]) + gauss() * SIGMA);
    }
    return { x, y };
  }

  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Ridge: (X'X + 2λI)w = X'y.  X = Vandermonde of x with P = d+1 columns.
  function fitRidge(xs, ys, d, lam) {
    const N = xs.length, P = d + 1;
    const X = [];
    for (let i = 0; i < N; i++) {
      const row = new Array(P);
      let v = 1;
      for (let p = 0; p < P; p++) { row[p] = v; v *= xs[i]; }
      X.push(row);
    }
    const XtX = matZeros(P, P);
    const Xty = new Array(P).fill(0);
    for (let i = 0; i < N; i++) {
      for (let p = 0; p < P; p++) {
        Xty[p] += X[i][p] * ys[i];
        for (let q = 0; q < P; q++) XtX[p][q] += X[i][p] * X[i][q];
      }
    }
    for (let p = 0; p < P; p++) XtX[p][p] += 2 * lam;
    return solveLinear(XtX, Xty);
  }

  function matZeros(r, c) {
    const m = [];
    for (let i = 0; i < r; i++) m.push(new Array(c).fill(0));
    return m;
  }

  function solveLinear(A_in, b_in) {
    const n = b_in.length;
    const A = A_in.map(r => r.slice());
    const b = b_in.slice();
    for (let k = 0; k < n; k++) {
      let mr = k, mv = Math.abs(A[k][k]);
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(A[i][k]) > mv) { mv = Math.abs(A[i][k]); mr = i; }
      }
      if (mr !== k) { [A[k], A[mr]] = [A[mr], A[k]]; [b[k], b[mr]] = [b[mr], b[k]]; }
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

  function mse(pred, y) {
    let s = 0;
    for (let i = 0; i < pred.length; i++) s += (pred[i] - y[i]) ** 2;
    return s / pred.length;
  }

  function denseErr(coef) {
    let s = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      const e = evalPoly(coef, x) - trueFn(x);
      s += e * e;
    }
    return s / N;
  }

  function render(svg, data, coef, lam) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ns = "http://www.w3.org/2000/svg";

    // ── Top half: fit ────────────────────────────────────
    const xs = x => M.l + x * FIT_PW;
    const ys = y => M.t + ((1.5 - y) / 3.0) * FIT_PH;

    // y=0 axis
    const ax = svg.appendChild(document.createElementNS(ns, "line"));
    ax.setAttribute("x1", M.l); ax.setAttribute("x2", M.l + FIT_PW);
    ax.setAttribute("y1", ys(0)); ax.setAttribute("y2", ys(0));
    ax.setAttribute("stroke", FAINT); ax.setAttribute("stroke-width", "0.6");
    [-1, 0, 1].forEach(yt => {
      const t = svg.appendChild(document.createElementNS(ns, "text"));
      t.setAttribute("x", M.l - 6); t.setAttribute("y", ys(yt) + 3.5);
      t.setAttribute("text-anchor", "end");
      t.setAttribute("font-family", "Inter, sans-serif");
      t.setAttribute("font-size", "10"); t.setAttribute("fill", FAINT);
      t.textContent = yt.toFixed(0);
    });

    // true function
    const dense = [];
    for (let i = 0; i < N_DENSE; i++) {
      const x = i / (N_DENSE - 1);
      dense.push({ x, y: evalPoly(coef, x), yTrue: trueFn(x) });
    }
    const truePath = makePath(dense.map(d => [xs(d.x), ys(d.yTrue)]));
    appendPath(svg, truePath, "#1c1f21", 1.4);

    const fitPath = makePath(dense.map(d => {
      const y = Math.max(-1.5, Math.min(1.5, d.y));
      return [xs(d.x), ys(y)];
    }));
    appendPath(svg, fitPath, ACCENT, 1.9);

    data.x.forEach((x, i) => {
      const c = svg.appendChild(document.createElementNS(ns, "circle"));
      c.setAttribute("cx", xs(x));
      c.setAttribute("cy", ys(Math.max(-1.5, Math.min(1.5, data.y[i]))));
      c.setAttribute("r", "3.2");
      c.setAttribute("fill", SAND);
      c.setAttribute("stroke", "#fff");
      c.setAttribute("stroke-width", "0.8");
    });

    // Top label
    const top = svg.appendChild(document.createElementNS(ns, "text"));
    top.setAttribute("x", M.l + 6); top.setAttribute("y", M.t + 10);
    top.setAttribute("font-family", "Inter, sans-serif");
    top.setAttribute("font-size", "10");
    top.setAttribute("fill", FAINT);
    top.textContent = "degree-9 polynomial ridge regression";

    // ── Bottom half: coefficients ────────────────────────
    const bTop = FIT_H + 10;
    const bH = BAR_H - 20;
    const innerL = M.l, innerR = W - M.r;
    const P = coef.length;
    const slot = (innerR - innerL) / P;
    const maxAbs = Math.max(...coef.map(Math.abs), 1e-8);
    const zeroY = bTop + bH / 2;

    // baseline
    const bl = svg.appendChild(document.createElementNS(ns, "line"));
    bl.setAttribute("x1", innerL); bl.setAttribute("x2", innerR);
    bl.setAttribute("y1", zeroY); bl.setAttribute("y2", zeroY);
    bl.setAttribute("stroke", FAINT); bl.setAttribute("stroke-width", "0.5");

    for (let k = 0; k < P; k++) {
      const cx = innerL + (k + 0.5) * slot;
      const h = (coef[k] / maxAbs) * (bH / 2 - 4);
      const r = svg.appendChild(document.createElementNS(ns, "rect"));
      const w = Math.max(8, slot * 0.55);
      r.setAttribute("x", cx - w / 2);
      r.setAttribute("y", h >= 0 ? zeroY - h : zeroY);
      r.setAttribute("width", w);
      r.setAttribute("height", Math.abs(h));
      r.setAttribute("fill", h >= 0 ? ACCENT : SAND);
      r.setAttribute("opacity", "0.85");

      const lab = svg.appendChild(document.createElementNS(ns, "text"));
      lab.setAttribute("x", cx);
      lab.setAttribute("y", bTop + bH + 12);
      lab.setAttribute("text-anchor", "middle");
      lab.setAttribute("font-family", "Inter, sans-serif");
      lab.setAttribute("font-size", "9");
      lab.setAttribute("fill", FAINT);
      lab.textContent = `w${sub(k)}`;
    }

    const bLab = svg.appendChild(document.createElementNS(ns, "text"));
    bLab.setAttribute("x", innerL); bLab.setAttribute("y", bTop - 2);
    bLab.setAttribute("font-family", "Inter, sans-serif");
    bLab.setAttribute("font-size", "10");
    bLab.setAttribute("fill", FAINT);
    bLab.textContent = "coefficient magnitudes (rescaled to peak)";
  }

  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  function sub(n) {
    return n.toString().split("").map(c => SUB[+c]).join("");
  }

  function appendPath(svg, d, stroke, width) {
    const ns = "http://www.w3.org/2000/svg";
    const p = svg.appendChild(document.createElementNS(ns, "path"));
    p.setAttribute("d", d);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", stroke);
    p.setAttribute("stroke-width", width);
  }

  function makePath(pts) {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    return d;
  }
})();
