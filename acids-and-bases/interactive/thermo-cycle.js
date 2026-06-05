/* Interactive · The thermodynamic-cycle pKa estimator.

   A pKa is a free energy: pKa = ΔG*_aq / (2.303 RT) = ΔG*_aq / 1.364 kcal/mol
   at 298 K. The absolute (direct) cycle routes deprotonation through the gas
   phase and back:

     ΔG*_aq = ΔG°_gas + ΔΔG_solv + ΔG*_solv(H+) + ssCorr,

   where ΔΔG_solv = ΔG*_solv(A-) − ΔG*_solv(HA) (negative; the anion is far
   better solvated), ΔG*_solv(H+) ≈ −265.9 kcal/mol (Tissandier et al.,
   J. Phys. Chem. A 102, 7787 (1998)) is held fixed, and ssCorr = +1.89
   kcal/mol is the 1 atm → 1 M standard-state correction, RT ln(24.46) at 298 K.

   The point of the widget: a 1.364 kcal/mol change in any input moves the
   predicted pKa by exactly one unit — tiny energy errors blow up. Pure
   functions are DOM-free and harness-testable. Vanilla JS IIFE, no libs. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  // Fixed constants of the cycle (kcal/mol, 298 K).
  const DG_SOLV_H = -265.9; // proton aqueous solvation free energy (Tissandier 1998)
  const SS_CORR = 1.89;     // 1 atm -> 1 M standard-state correction, RT ln(24.46)
  const KCAL_PER_PKA = 1.364; // 2.303 RT at 298 K = 1.364 kcal/mol = 5.71 kJ/mol
  const KJ_PER_KCAL = 4.184;

  // ── Pure functions (DOM-free, harness-testable) ──
  // Aqueous deprotonation free energy from the cycle (kcal/mol).
  function dGaqFromCycle(dG_gas, ddG_solv, dGsolvH, ssCorr) {
    return dG_gas + ddG_solv + dGsolvH + ssCorr;
  }
  // Predicted pKa from the cycle.
  function pKaFromCycle(dG_gas, ddG_solv, dGsolvH, ssCorr) {
    return dGaqFromCycle(dG_gas, ddG_solv, dGsolvH, ssCorr) / KCAL_PER_PKA;
  }

  // Preset: acetic-acid-like. ΔG°gas ≈ 341, ΔΔG_solv chosen so pKa ≈ 4.8.
  const PRESET = { dG_gas: 341.0, ddG_solv: -70.5 };

  // Slider ranges (kcal/mol).
  const GAS_MIN = 320, GAS_MAX = 360;
  const DD_MIN = -80, DD_MAX = -60;

  const W = 540, H = 300;

  document.querySelectorAll("[data-widget='thermo-cycle']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.8rem";

    let dG_gas = PRESET.dG_gas;
    let ddG_solv = PRESET.ddG_solv;

    // SVG cycle diagram
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // Controls
    const ctrlWrap = document.createElement("div");
    ctrlWrap.style.display = "flex";
    ctrlWrap.style.flexDirection = "column";
    ctrlWrap.style.gap = "0.5rem";
    ctrlWrap.style.width = "100%";
    ctrlWrap.style.maxWidth = "460px";
    host.appendChild(ctrlWrap);

    const gasCtrl = mkSlider("ΔG°gas (gas-phase deprotonation)", GAS_MIN, GAS_MAX, 0.5, dG_gas, "kcal/mol");
    const ddCtrl = mkSlider("ΔΔG_solv = ΔG*solv(A⁻) − ΔG*solv(HA)", DD_MIN, DD_MAX, 0.5, ddG_solv, "kcal/mol");
    ctrlWrap.appendChild(gasCtrl.row);
    ctrlWrap.appendChild(ddCtrl.row);

    // Preset button
    const presetBtn = document.createElement("button");
    presetBtn.textContent = "Reset to acetic-acid preset (pKa ≈ 4.8)";
    presetBtn.style.fontFamily = "Inter, sans-serif";
    presetBtn.style.fontSize = "0.78rem";
    presetBtn.style.color = ACCENT_DEEP;
    presetBtn.style.background = "#fff";
    presetBtn.style.border = "1px solid " + RULE;
    presetBtn.style.borderRadius = "3px";
    presetBtn.style.padding = "0.35rem 0.7rem";
    presetBtn.style.cursor = "pointer";
    presetBtn.style.alignSelf = "flex-start";
    ctrlWrap.appendChild(presetBtn);

    // Readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.86rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.7";
    host.appendChild(readout);

    gasCtrl.slider.addEventListener("input", () => { dG_gas = +gasCtrl.slider.value; redraw(); });
    ddCtrl.slider.addEventListener("input", () => { ddG_solv = +ddCtrl.slider.value; redraw(); });
    presetBtn.addEventListener("click", () => {
      dG_gas = PRESET.dG_gas; ddG_solv = PRESET.ddG_solv;
      gasCtrl.slider.value = String(dG_gas);
      ddCtrl.slider.value = String(ddG_solv);
      redraw();
    });

    redraw();

    function redraw() {
      gasCtrl.val.textContent = "+" + dG_gas.toFixed(1);
      ddCtrl.val.textContent = ddG_solv.toFixed(1);

      const dGaq = dGaqFromCycle(dG_gas, ddG_solv, DG_SOLV_H, SS_CORR);
      const pKa = dGaq / KCAL_PER_PKA;

      svg.innerHTML = drawCycle(dG_gas, ddG_solv, dGaq, pKa);

      // Sensitivity: 1.364 kcal/mol = 1 pKa unit. Show what +1 kcal/mol does.
      const perKcal = 1 / KCAL_PER_PKA;
      readout.innerHTML =
        `predicted &nbsp;$\\mathrm{p}K_{\\mathrm{a}}$ &nbsp;<strong style="color:${ACCENT_DEEP};font-family:'JetBrains Mono',monospace;font-size:1.05em">` +
        pKa.toFixed(2) + `</strong>&nbsp;&nbsp;from&nbsp;&nbsp;$\\Delta G^{*}_{\\mathrm{aq}}$ = <strong style="color:${WARM};font-family:'JetBrains Mono',monospace">` +
        dGaq.toFixed(2) + ` kcal/mol</strong> (` + (dGaq * KJ_PER_KCAL).toFixed(1) + ` kJ/mol)<br>` +
        `<span style="font-size:0.92em">sensitivity: every <strong>1.364 kcal/mol</strong> = exactly <strong>1 pKa unit</strong>; ` +
        `a <strong>1 kcal/mol</strong> error shifts the prediction by <strong style="color:${ACCENT}">` +
        perKcal.toFixed(2) + ` pKa units</strong></span>`;

      if (window.renderMathInElement) {
        try {
          window.renderMathInElement(readout, {
            delimiters: [{ left: "$", right: "$", display: false }],
            throwOnError: false
          });
        } catch (e) { /* KaTeX not ready; plain text fallback is fine */ }
      }
    }
  }

  // ── Cycle diagram (returns SVG string) ──
  function drawCycle(dG_gas, ddG_solv, dGaq, pKa) {
    // Four corners of the cycle.
    const xL = 120, xR = 420, yT = 60, yB = 230;
    let s = "";

    // Boxes
    s += boxNode(xL, yT, "HA (gas)", FAINT);
    s += boxNode(xR, yT, "A⁻ + H⁺ (gas)", FAINT);
    s += boxNode(xL, yB, "HA (aq)", ACCENT);
    s += boxNode(xR, yB, "A⁻ + H⁺ (aq)", ACCENT);

    // Top arrow: gas-phase deprotonation
    s += arrow(xL + 70, yT, xR - 90, yT, ACCENT_DEEP);
    s += text((xL + xR) / 2, yT - 12, "ΔG°gas = +" + dG_gas.toFixed(1), 11, ACCENT_DEEP, "middle");

    // Left leg: solvate HA (upward, into gas = +; we label the downward solvation)
    s += arrow(xL, yB - 16, xL, yT + 16, FAINT);
    s += vlabel(xL - 12, (yT + yB) / 2, "−ΔG*solv(HA)", MUTED);

    // Right leg: solvate A- + H+ (downward = aq)
    s += arrow(xR, yT + 16, xR, yB - 16, WARM);
    s += vlabel(xR + 12, (yT + yB) / 2, "ΔΔG_solv + ΔG*solv(H⁺)", WARM, "start");
    s += text(xR + 12, (yT + yB) / 2 + 16, "(" + ddG_solv.toFixed(1) + " + (−265.9))", 9.5, FAINT, "start");

    // Bottom arrow: aqueous deprotonation (the result)
    s += arrow(xL + 70, yB, xR - 90, yB, ACCENT);
    s += text((xL + xR) / 2, yB + 22, "ΔG*aq = " + dGaq.toFixed(2) + "  →  pKa " + pKa.toFixed(2), 11.5, ACCENT, "middle");

    // standard-state note
    s += text((xL + xR) / 2, yT - 30, "(+1.89 kcal/mol standard-state correction included)", 9.5, FAINT, "middle");

    return s;
  }

  // ── UI / SVG helpers ──
  function mkSlider(label, min, max, step, value, unit) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "0.6rem";
    row.style.fontFamily = "Inter, sans-serif";
    row.style.fontSize = "0.8rem";
    row.style.color = MUTED;

    const lab = document.createElement("span");
    lab.textContent = label;
    lab.style.flex = "1.4";
    lab.style.minWidth = "0";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.flex = "1";
    slider.style.accentColor = ACCENT;

    const val = document.createElement("span");
    val.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    val.style.minWidth = "5.5em";
    val.style.textAlign = "right";
    val.style.color = INK;
    val.textContent = value.toFixed(1) + " " + unit;

    row.appendChild(lab);
    row.appendChild(slider);
    row.appendChild(val);
    return { row, slider, val };
  }

  function boxNode(cx, cy, label, color) {
    const w = 130, h = 30;
    const x = cx - w / 2, y = cy - h / 2;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" rx="4" ` +
      `fill="#fff" stroke="${color}" stroke-width="1.5"/>` +
      `<text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" font-size="12" fill="${INK}" ` +
      `font-family="Inter,sans-serif" text-anchor="middle">${label}</text>`;
  }

  function arrow(x1, y1, x2, y2, color) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const ah = 7;
    const ax1 = x2 - ah * Math.cos(ang - 0.4);
    const ay1 = y2 - ah * Math.sin(ang - 0.4);
    const ax2 = x2 - ah * Math.cos(ang + 0.4);
    const ay2 = y2 - ah * Math.sin(ang + 0.4);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ` +
      `stroke="${color}" stroke-width="1.6"/>` +
      `<path d="M ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ax1.toFixed(1)} ${ay1.toFixed(1)} ` +
      `L ${ax2.toFixed(1)} ${ay2.toFixed(1)} Z" fill="${color}"/>`;
  }

  function text(x, y, s, size, color, anchor) {
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${color}" ` +
      `font-family="Inter,sans-serif" text-anchor="${anchor}">${s}</text>`;
  }

  function vlabel(x, y, s, color, anchor) {
    const a = anchor || "end";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="10" fill="${color}" ` +
      `font-family="Inter,sans-serif" text-anchor="${a}" ` +
      `transform="rotate(-90 ${x.toFixed(1)} ${y.toFixed(1)})">${s}</text>`;
  }
})();
