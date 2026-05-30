/* Interactive · The gray greenhouse as energy balance.
   Computes the real Chapter III, §6 physics:
     single partly-absorbing layer:  T_s = T_e (1 - eps/2)^(-1/4),  T_a = T_s / 2^(1/4)
     N opaque layers:                T_s = (N+1)^(1/4) T_e,         layer k at T_k = (N+1-k)^(1/4) T_e
   Absorbed solar drives everything:  S = S0 (1 - alpha) / 4 = sigma T_e^4.
   Mounts into any [data-widget='gray-greenhouse'] section. */

(function () {
  "use strict";

  // Palette (per chapter spec).
  const ACCENT = "#2b5c8a";
  const ACCENT_DEEP = "#173a5a";
  const WARM = "#b8651a";
  const GOLD = "#c08a2d";
  const FAINT = "#8e9a9e";
  const RULE = "#dde3ea";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";
  const CARD = "#ffffff";

  // Physical constants.
  const SIGMA = 5.67e-8;     // W m^-2 K^-4
  const S0 = 1361;           // W m^-2
  const ALBEDO = 0.30;       // planetary albedo (fixed reference)

  const NS = "http://www.w3.org/2000/svg";

  function emissionTemp(solarMult) {
    // S = solarMult * S0 (1 - albedo) / 4 = sigma Te^4
    const S = solarMult * S0 * (1 - ALBEDO) / 4;
    return { Te: Math.pow(S / SIGMA, 0.25), S: S };
  }

  function surfaceTempEps(Te, eps) {
    // T_s = Te (1 - eps/2)^(-1/4)
    return Te * Math.pow(1 - eps / 2, -0.25);
  }

  function surfaceTempN(Te, N) {
    return Te * Math.pow(N + 1, 0.25);
  }

  document.querySelectorAll("[data-widget='gray-greenhouse']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    const state = { mode: "eps", eps: 0.78, N: 1, solar: 1.0 };

    // ── Mode toggle ─────────────────────────────────────
    const modeRow = document.createElement("div");
    modeRow.style.display = "flex";
    modeRow.style.gap = "0.5rem";
    host.appendChild(modeRow);
    const btnEps = mkToggle("Emissivity ε");
    const btnN = mkToggle("Opaque layers N");
    modeRow.appendChild(btnEps);
    modeRow.appendChild(btnN);

    // ── Controls ────────────────────────────────────────
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1.1rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const epsCtl = mkSlider("emissivity ε", 0, 1, 0.01, state.eps);
    const nCtl = mkSlider("layers N", 0, 4, 1, state.N);
    const solarCtl = mkSlider("solar ×", 0.6, 1.5, 0.01, state.solar);
    controls.appendChild(epsCtl.wrap);
    controls.appendChild(nCtl.wrap);
    controls.appendChild(solarCtl.wrap);

    // ── SVG: schematic (left) + plot (right) ────────────
    const W = 560, Hh = 300;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", Hh);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // ── Numeric readout ─────────────────────────────────
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.5";
    readout.style.minHeight = "2.6em";
    host.appendChild(readout);

    // ── Legend ──────────────────────────────────────────
    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      swatch(GOLD) + "absorbed sunlight" +
      "</span>" + sep() +
      swatch(WARM) + "longwave (IR) flux" +
      "</span>" + sep() +
      swatch(ACCENT) + "T<sub>s</sub> vs control</span>";
    host.appendChild(legend);

    function setMode(m) {
      state.mode = m;
      btnEps.dataset.on = (m === "eps") ? "1" : "0";
      btnN.dataset.on = (m === "N") ? "1" : "0";
      styleToggle(btnEps);
      styleToggle(btnN);
      epsCtl.wrap.style.display = (m === "eps") ? "" : "none";
      nCtl.wrap.style.display = (m === "N") ? "" : "none";
      redraw();
    }

    function redraw() {
      state.eps = +epsCtl.input.value;
      state.N = +nCtl.input.value;
      state.solar = +solarCtl.input.value;
      epsCtl.val.textContent = state.eps.toFixed(2);
      nCtl.val.textContent = state.N.toFixed(0);
      solarCtl.val.textContent = state.solar.toFixed(2) + "×";

      const { Te, S } = emissionTemp(state.solar);
      let Ts, Ta, downLW, upTOA, layerLabel;
      if (state.mode === "eps") {
        Ts = surfaceTempEps(Te, state.eps);
        Ta = Ts / Math.pow(2, 0.25);                 // T_a = T_s / 2^(1/4)
        downLW = state.eps * SIGMA * Math.pow(Ta, 4); // back-radiation to surface
        // TOA outgoing = (1-eps) sigma Ts^4 + eps sigma Ta^4  (= S in equilibrium)
        upTOA = (1 - state.eps) * SIGMA * Math.pow(Ts, 4) + state.eps * SIGMA * Math.pow(Ta, 4);
        layerLabel = "Tₐ = " + Ta.toFixed(0) + " K  (ε = " + state.eps.toFixed(2) + ")";
      } else {
        Ts = surfaceTempN(Te, state.N);
        // bottom opaque layer (k=1) at (N)^(1/4) Te; its downward flux hits surface
        Ta = (state.N >= 1) ? Te * Math.pow(state.N, 0.25) : Te;
        downLW = (state.N >= 1) ? SIGMA * Math.pow(Ta, 4) : 0;
        upTOA = S;                                    // top opaque layer emits exactly S
        layerLabel = state.N + " opaque layer" + (state.N === 1 ? "" : "s");
      }
      const upSurf = SIGMA * Math.pow(Ts, 4);

      drawSchematic(svg, { Te, S, Ts, Ta, downLW, upTOA, upSurf, mode: state.mode, eps: state.eps, N: state.N });
      drawPlot(svg, state);

      const dT = Ts - Te;
      readout.innerHTML =
        "absorbed sunlight S = <strong style='color:" + ACCENT_DEEP + "'>" + S.toFixed(0) + "</strong> W m⁻²" +
        " &nbsp;·&nbsp; T<sub>e</sub> = <strong style='color:" + ACCENT_DEEP + "'>" + Te.toFixed(0) + "</strong> K" +
        " &nbsp;·&nbsp; " + layerLabel + "<br>" +
        "surface T<sub>s</sub> = <strong style='color:" + WARM + ";font-size:1.05em'>" + Ts.toFixed(0) + " K</strong>" +
        " (" + (Ts - 273.15).toFixed(0) + " °C)" +
        " &nbsp;·&nbsp; greenhouse warming T<sub>s</sub>−T<sub>e</sub> = <strong style='color:" + WARM + "'>+" + dT.toFixed(0) + " K</strong>" +
        " &nbsp;·&nbsp; back-radiation ↓ = " + downLW.toFixed(0) + " W m⁻²";
    }

    epsCtl.input.addEventListener("input", redraw);
    nCtl.input.addEventListener("input", redraw);
    solarCtl.input.addEventListener("input", redraw);
    btnEps.addEventListener("click", () => setMode("eps"));
    btnN.addEventListener("click", () => setMode("N"));

    setMode("eps");
  }

  // ── Schematic: stacked flux arrows on the left half ───
  function drawSchematic(svg, d) {
    // clear group
    let g = svg.querySelector("#schem");
    if (g) g.remove();
    g = document.createElementNS(NS, "g");
    g.setAttribute("id", "schem");
    svg.appendChild(g);

    const x0 = 26, x1 = 250;        // schematic spans this x-band
    const ySpace = 30, ySurf = 252; // top-of-atmosphere and surface y
    const xSun = x0 + 34, xUp = (x0 + x1) / 2, xDown = x1 - 34;

    // ground
    rect(g, x0, ySurf, x1 - x0, 26, WARM, 0.16);
    line(g, x0, ySurf, x1, ySurf, RULE, 1);
    txt(g, (x0 + x1) / 2, ySurf + 18, "surface  Tₛ = " + d.Ts.toFixed(0) + " K", 11, INK, "middle", "Inter, sans-serif", 600);

    // top-of-atmosphere dashed line
    const toa = line(g, x0, ySpace, x1, ySpace, FAINT, 1);
    toa.setAttribute("stroke-dasharray", "4 4");
    txt(g, x0, ySpace - 7, "top of atmosphere → space", 10, MUTED, "start", "Inter, sans-serif", 500);

    // atmospheric layer band(s)
    if (d.mode === "eps") {
      const yL = (ySpace + ySurf) / 2;
      rect(g, x0, yL - 13, x1 - x0, 26, ACCENT, 0.10 + 0.22 * d.eps);
      txt(g, (x0 + x1) / 2, yL + 4, "gray layer  Tₐ = " + d.Ta.toFixed(0) + " K", 10.5, ACCENT_DEEP, "middle", "Inter, sans-serif", 600);
    } else {
      const N = Math.max(d.N, 0);
      for (let k = 0; k < N; k++) {
        const frac = (k + 1) / (N + 1);
        const yL = ySurf - frac * (ySurf - ySpace);
        rect(g, x0, yL - 8, x1 - x0, 16, ACCENT, 0.30);
        line(g, x0, yL, x1, yL, ACCENT, 0.5);
      }
      txt(g, (x0 + x1) / 2, ySpace + 18, N + " opaque layer" + (N === 1 ? "" : "s"), 10.5, ACCENT_DEEP, "middle", "Inter, sans-serif", 600);
    }

    // arrows: down sunlight (gold), up IR from surface (warm), down back-radiation (warm), up TOA (warm)
    arrow(g, xSun, ySpace, xSun, ySurf, GOLD, "S = " + d.S.toFixed(0), "down");
    arrow(g, xUp, ySurf, xUp, ySpace, WARM, "↑" + d.upSurf.toFixed(0), "up");
    if (d.downLW > 0.5) {
      arrow(g, xDown, (ySpace + ySurf) / 2, xDown, ySurf, WARM, "↓" + d.downLW.toFixed(0), "down");
    }
    // outgoing longwave at TOA
    arrow(g, x1 - 6, (ySpace + ySurf) / 2, x1 - 6, ySpace, WARM, "OLR " + d.upTOA.toFixed(0), "up");
  }

  // ── Plot: T_s vs control on the right half ────────────
  function drawPlot(svg, state) {
    let g = svg.querySelector("#plot");
    if (g) g.remove();
    g = document.createElementNS(NS, "g");
    g.setAttribute("id", "plot");
    svg.appendChild(g);

    const px = 300, pw = 232, py = 36, ph = 210;
    const { Te } = emissionTemp(state.solar);

    // y-range of T_s: from Te (no greenhouse) to a generous top
    const Tmin = 240;
    const Tmax = (state.mode === "eps")
      ? Math.max(320, surfaceTempEps(Te, 0.98) + 8)
      : Math.max(360, surfaceTempN(Te, 4) + 8);

    const xScale = t => px + t * pw;                 // t in [0,1]
    const yScale = T => py + (1 - (T - Tmin) / (Tmax - Tmin)) * ph;

    // axes
    line(g, px, py, px, py + ph, FAINT, 0.8);
    line(g, px, py + ph, px + pw, py + ph, FAINT, 0.8);

    // reference lines: Te (255), observed 288
    refLine(g, px, pw, yScale(Te), Te, "Tₑ", FAINT);
    if (288 >= Tmin && 288 <= Tmax) refLine(g, px, pw, yScale(288), 288, "288 K obs", GOLD);

    // y ticks
    [250, 280, 310, 340].forEach(T => {
      if (T < Tmin || T > Tmax) return;
      txt(g, px - 5, yScale(T) + 3.5, T.toFixed(0), 9.5, FAINT, "end", "Inter, sans-serif", 400);
    });

    // curve
    const pts = [];
    const NPT = 80;
    for (let i = 0; i <= NPT; i++) {
      const t = i / NPT;
      let Ts, xt;
      if (state.mode === "eps") {
        const eps = t;                                // 0..1
        Ts = surfaceTempEps(Te, eps);
        xt = t;
      } else {
        const Nf = t * 4;                             // continuous 0..4 for a smooth curve
        Ts = surfaceTempN(Te, Nf);
        xt = t;
      }
      pts.push([xScale(xt), yScale(Math.min(Ts, Tmax))]);
    }
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", makePath(pts));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", ACCENT);
    path.setAttribute("stroke-width", "2");
    g.appendChild(path);

    // marker at current control value
    let curT, curX;
    if (state.mode === "eps") {
      curX = xScale(state.eps);
      curT = yScale(surfaceTempEps(Te, state.eps));
    } else {
      curX = xScale(state.N / 4);
      curT = yScale(Math.min(surfaceTempN(Te, state.N), Tmax));
    }
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", curX);
    dot.setAttribute("cy", curT);
    dot.setAttribute("r", "4");
    dot.setAttribute("fill", WARM);
    dot.setAttribute("stroke", "#fff");
    dot.setAttribute("stroke-width", "1");
    g.appendChild(dot);

    // x label / ticks
    if (state.mode === "eps") {
      txt(g, px, py + ph + 14, "0", 9.5, FAINT, "middle", "Inter, sans-serif", 400);
      txt(g, px + pw, py + ph + 14, "1", 9.5, FAINT, "middle", "Inter, sans-serif", 400);
      txt(g, px + pw / 2, py + ph + 26, "emissivity ε", 11, MUTED, "middle", "Source Serif 4, serif", 400, true);
    } else {
      for (let n = 0; n <= 4; n++) {
        txt(g, xScale(n / 4), py + ph + 14, n.toFixed(0), 9.5, FAINT, "middle", "Inter, sans-serif", 400);
      }
      txt(g, px + pw / 2, py + ph + 26, "number of opaque layers N", 11, MUTED, "middle", "Source Serif 4, serif", 400, true);
    }
    txt(g, px - 26, py - 8, "Tₛ (K)", 10.5, MUTED, "start", "Source Serif 4, serif", 400, true);
  }

  // ── DOM / SVG helpers ─────────────────────────────────
  function refLine(g, px, pw, y, T, label, color) {
    const l = line(g, px, y, px + pw, y, color, 0.9);
    l.setAttribute("stroke-dasharray", "3 3");
    txt(g, px + pw, y - 3, label, 9, color, "end", "Inter, sans-serif", 500);
  }

  function rect(g, x, y, w, h, fill, op) {
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", x); r.setAttribute("y", y);
    r.setAttribute("width", w); r.setAttribute("height", h);
    r.setAttribute("fill", fill); r.setAttribute("fill-opacity", op);
    g.appendChild(r);
    return r;
  }

  function line(g, x1, y1, x2, y2, stroke, sw) {
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", stroke); l.setAttribute("stroke-width", sw);
    g.appendChild(l);
    return l;
  }

  function txt(g, x, y, s, size, fill, anchor, family, weight, italic) {
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("text-anchor", anchor || "start");
    t.setAttribute("font-family", family || "Inter, sans-serif");
    t.setAttribute("font-size", size);
    t.setAttribute("fill", fill);
    if (weight) t.setAttribute("font-weight", weight);
    if (italic) t.setAttribute("font-style", "italic");
    t.textContent = s;
    g.appendChild(t);
    return t;
  }

  function arrow(g, x1, y1, x2, y2, color, label, dir) {
    line(g, x1, y1, x2, y2, color, 2);
    // arrowhead
    const head = document.createElementNS(NS, "path");
    const s = 5;
    let d;
    if (dir === "down") {
      d = `M ${x2} ${y2} l ${-s} ${-s * 1.6} l ${2 * s} 0 z`;
    } else {
      d = `M ${x2} ${y2} l ${-s} ${s * 1.6} l ${2 * s} 0 z`;
    }
    head.setAttribute("d", d);
    head.setAttribute("fill", color);
    g.appendChild(head);
    // label beside the midpoint
    const my = (y1 + y2) / 2;
    txt(g, x1 + 8, my, label, 9.5, color, "start", "Inter, sans-serif", 600);
  }

  function makePath(pts) {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    return d;
  }

  function swatch(color) {
    return "<span><span style='display:inline-block;width:18px;height:3px;background:" +
      color + ";vertical-align:middle;margin-right:0.35em'></span>";
  }
  function sep() { return ""; }

  function mkToggle(label) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.dataset.on = "0";
    styleToggle(b);
    return b;
  }
  function styleToggle(b) {
    const on = b.dataset.on === "1";
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.76rem";
    b.style.padding = "0.3rem 0.8rem";
    b.style.border = "1px solid " + ACCENT;
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "600";
    b.style.background = on ? ACCENT : "#fff";
    b.style.color = on ? "#fff" : ACCENT;
    b.style.transition = "background 100ms, color 100ms";
  }

  function mkSlider(label, min, max, step, value) {
    const wrap = document.createElement("label");
    wrap.style.fontFamily = "Inter, sans-serif";
    wrap.style.fontSize = "0.8rem";
    wrap.style.color = INK;
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.5rem";
    const lab = document.createElement("span");
    const val = document.createElement("span");
    val.style.fontWeight = "600";
    val.style.color = ACCENT;
    lab.textContent = label + " ";
    lab.appendChild(val);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min); input.max = String(max);
    input.step = String(step); input.value = String(value);
    input.style.width = "130px";
    input.style.accentColor = ACCENT;
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return { wrap, input, val };
  }
})();
