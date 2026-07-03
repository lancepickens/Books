/* Chapter X widget — The replication calculator.
   Computes posterior log-odds for a contested hypothesis given N positive
   reports with per-report likelihood ratio LR and intraclass correlation rho:
     N_eff = N / (1 + rho*(N-1))          (Kish design effect, Survey Sampling, Wiley 1965)
     log10 O_post = log10 O_prior + N_eff * log10 LR
   and contrasts it with the naive (rho = 0) posterior. Reference check:
   prior 1e-6, LR = 10, N = 30, rho = 0.9 -> N_eff = 30/27.1 = 1.107,
   posterior odds ~ 10^-4.89 (p ~ 1.3e-5) vs naive 10^24. */

(function () {
  "use strict";

  const ACCENT = "#a06010";
  const ACCENT_DEEP = "#6f430a";
  const WARM = "#2b5c8a";      // second data series (naive, rho = 0)
  const FAINT = "#8e9a9e";
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 56, r: 16, t: 18, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // ── Pure statistics (DOM-free; exercised by the JSDOM harness) ──
  function nEff(N, rho) {                    // Kish effective sample size
    if (N <= 0) return 0;
    return N / (1 + rho * (N - 1));
  }
  function posteriorLogOdds(log10Prior, LR, N, rho) {
    return log10Prior + nEff(N, rho) * Math.log10(LR);
  }
  function naiveLogOdds(log10Prior, LR, N) {
    return log10Prior + N * Math.log10(LR);
  }
  function probFromLogOdds(lo) {             // p = O/(1+O), log-safe
    if (lo > 15) return 1;
    if (lo < -15) return Math.pow(10, lo);   // p ~ O for tiny odds
    const odds = Math.pow(10, lo);
    return odds / (1 + odds);
  }

  // ── Self-mount ──
  document.querySelectorAll("[data-widget='bayes-replication']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // axis ranges: N on x, log10 posterior odds on y (clamped for display)
    const NX0 = 0, NX1 = 100;
    const LY0 = -10, LY1 = 30;

    const xPix = n => M.l + (n - NX0) / (NX1 - NX0) * PW;
    const yPix = ly => M.t + (LY1 - ly) / (LY1 - LY0) * PH;

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "0.6rem 1.4rem";
    controls.style.alignItems = "center";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.8rem";
    controls.style.color = MUTED;
    host.appendChild(controls);

    // defaults = the chapter's worked example
    const pSlider = mkSlider(controls, "log₁₀ prior odds", -8, 0, 0.1, -6);
    const lSlider = mkSlider(controls, "LR per report", 1, 20, 0.5, 10);
    const nSlider = mkSlider(controls, "positive reports N", 0, 100, 1, 30);
    const rSlider = mkSlider(controls, "correlation ρ", 0, 1, 0.01, 0.9);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // probability gauge
    const gaugeWrap = document.createElement("div");
    gaugeWrap.style.width = "min(420px, 90%)";
    gaugeWrap.style.fontFamily = "Inter, sans-serif";
    gaugeWrap.style.fontSize = "0.72rem";
    gaugeWrap.style.color = MUTED;
    const gaugeBar = document.createElement("div");
    gaugeBar.style.position = "relative";
    gaugeBar.style.height = "10px";
    gaugeBar.style.border = "1px solid " + RULE;
    gaugeBar.style.borderRadius = "5px";
    gaugeBar.style.overflow = "hidden";
    gaugeBar.style.background = "#fff";
    const gaugeFill = document.createElement("div");
    gaugeFill.style.position = "absolute";
    gaugeFill.style.left = "0";
    gaugeFill.style.top = "0";
    gaugeFill.style.bottom = "0";
    gaugeFill.style.background = ACCENT;
    gaugeBar.appendChild(gaugeFill);
    const gaugeLabel = document.createElement("div");
    gaugeLabel.style.textAlign = "center";
    gaugeLabel.style.marginTop = "2px";
    gaugeWrap.appendChild(gaugeBar);
    gaugeWrap.appendChild(gaugeLabel);
    host.appendChild(gaugeWrap);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.5";
    host.appendChild(readout);

    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.75rem";
    legend.style.color = MUTED;
    legend.innerHTML =
      `<span style="color:${ACCENT};font-weight:700">━</span> correlated (Kish N_eff) &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">━</span> naive (ρ = 0) &nbsp;&nbsp; ` +
      `<span style="color:${FAINT}">┄ even odds (p = ½)</span>`;
    host.appendChild(legend);

    [pSlider, lSlider, nSlider, rSlider].forEach(s => s.input.addEventListener("input", redraw));
    redraw();

    function redraw() {
      const logPrior = parseFloat(pSlider.input.value);
      const LR = parseFloat(lSlider.input.value);
      const N = Math.round(parseFloat(nSlider.input.value));
      const rho = parseFloat(rSlider.input.value);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // gridlines + axes
      for (let ly = LY0; ly <= LY1; ly += 10) {
        line(svg, M.l, yPix(ly), M.l + PW, yPix(ly), RULE, 1);
        text(svg, M.l - 6, yPix(ly) + 3, String(ly), "end", 10, FAINT, "Inter, sans-serif");
      }
      for (let n = 0; n <= NX1; n += 20) {
        line(svg, xPix(n), M.t, xPix(n), M.t + PH, RULE, 1);
        text(svg, xPix(n), M.t + PH + 14, String(n), "middle", 10, FAINT, "Inter, sans-serif");
      }
      text(svg, M.l + PW / 2, H - 6, "N (positive reports)", "middle", 11, MUTED, "italic 'Source Serif 4', serif");
      textRot(svg, 14, M.t + PH / 2, "log₁₀ odds", 11, MUTED);

      // even-odds reference (p = 0.5)
      line(svg, M.l, yPix(0), M.l + PW, yPix(0), FAINT, 1, "4,4");

      // curves vs N at the chosen rho (and rho = 0 for contrast)
      const cor = [], nai = [];
      for (let n = 0; n <= NX1; n++) {
        cor.push([xPix(n), yPix(clampY(posteriorLogOdds(logPrior, LR, n, rho)))]);
        nai.push([xPix(n), yPix(clampY(naiveLogOdds(logPrior, LR, n)))]);
      }
      path(svg, nai, WARM, 2);
      path(svg, cor, ACCENT, 2);

      // current-N markers
      const loCor = posteriorLogOdds(logPrior, LR, N, rho);
      const loNai = naiveLogOdds(logPrior, LR, N);
      circle(svg, xPix(N), yPix(clampY(loNai)), 4, WARM);
      circle(svg, xPix(N), yPix(clampY(loCor)), 4.5, ACCENT_DEEP);

      const ne = nEff(N, rho);
      const pCor = probFromLogOdds(loCor);
      const pNai = probFromLogOdds(loNai);

      gaugeFill.style.width = (Math.max(0, Math.min(1, pCor)) * 100).toFixed(2) + "%";
      gaugeLabel.textContent = "posterior probability (correlated): " + fmtP(pCor);

      readout.innerHTML =
        `prior = 10<sup>${logPrior.toFixed(1)}</sup> &nbsp;·&nbsp; LR = ${LR} &nbsp;·&nbsp; N = ${N} &nbsp;·&nbsp; ρ = ${rho.toFixed(2)}` +
        `<br/>N<sub>eff</sub> = <strong style="color:${ACCENT_DEEP}">${ne.toFixed(2)}</strong>` +
        ` &nbsp;·&nbsp; posterior odds = <strong style="color:${ACCENT_DEEP}">10<sup>${loCor.toFixed(1)}</sup></strong>` +
        ` (p ≈ ${fmtP(pCor)})` +
        ` &nbsp;·&nbsp; naive: 10<sup>${loNai.toFixed(1)}</sup> (p ≈ <span style="color:${WARM}">${fmtP(pNai)}</span>)`;
    }

    function clampY(ly) { return Math.max(LY0, Math.min(LY1, ly)); }
  }

  function fmtP(p) {
    if (p >= 0.999999) return "≈ 1";
    if (p >= 0.001) return (p * 100).toPrecision(3) + "%";
    if (p <= 0) return "0";
    const e = Math.floor(Math.log10(p));
    const m = p / Math.pow(10, e);
    return m.toFixed(1) + "×10" + sup(e);
  }

  // ── UI + SVG helpers ──
  function mkSlider(parent, label, min, max, step, val) {
    const wrap = document.createElement("label");
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.45rem";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = min; input.max = max; input.step = step; input.value = val;
    input.style.width = "130px";
    input.style.accentColor = "#a06010";
    wrap.appendChild(span);
    wrap.appendChild(input);
    parent.appendChild(wrap);
    return { wrap, input };
  }
  function sup(n) {
    const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(n).split("").map(c => map[c] || c).join("");
  }
  function line(svg, x1, y1, x2, y2, stroke, w, dash) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    el.setAttribute("x1", x1); el.setAttribute("y1", y1);
    el.setAttribute("x2", x2); el.setAttribute("y2", y2);
    el.setAttribute("stroke", stroke); el.setAttribute("stroke-width", w);
    if (dash) el.setAttribute("stroke-dasharray", dash);
    svg.appendChild(el);
  }
  function path(svg, pts, stroke, w) {
    if (!pts.length) return;
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", stroke);
    el.setAttribute("stroke-width", w);
    svg.appendChild(el);
  }
  function circle(svg, cx, cy, r, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    el.setAttribute("cx", cx); el.setAttribute("cy", cy); el.setAttribute("r", r);
    el.setAttribute("fill", fill);
    svg.appendChild(el);
  }
  function text(svg, x, y, str, anchor, size, fill, font) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("font-size", size);
    el.setAttribute("fill", fill);
    if (font) el.setAttribute("style", "font: " + size + "px " + font + ";");
    el.textContent = str;
    svg.appendChild(el);
  }
  function textRot(svg, x, y, str, size, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("text-anchor", "middle");
    el.setAttribute("font-size", size);
    el.setAttribute("fill", fill);
    el.setAttribute("transform", `rotate(-90 ${x} ${y})`);
    el.setAttribute("style", "font: italic " + size + "px 'Source Serif 4', serif;");
    el.textContent = str;
    svg.appendChild(el);
  }

  // expose pure functions for the harness
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { nEff, posteriorLogOdds, naiveLogOdds, probFromLogOdds };
  }
})();
