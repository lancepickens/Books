/* Interactive · The acidity ruler beyond water.
   A horizontal acidity scale running from superbasic (left) to superacidic
   (right). Each amphiprotic solvent has its own autoprotolysis constant K_s and
   therefore its own accessible acid/base window, drawn as a colored bar between
   its lyonium (SH2+) and lyate (S-) limits. Reference acids and the superacids
   sit as markers on the same axis (aqueous pKa for the acids, H0 for the
   superacids). Selecting a solvent highlights its window and lists which acids
   it would level (any acid whose pKa is below the solvent's left edge).

   The scale is a single monotone "acidity coordinate": for solvents we plot the
   window on the solvent's own pH range, and we align everything on a shared
   axis where larger = more basic, smaller/negative = more acidic. Values are
   approximate and composition-dependent; see the chapter for sources and spread.

   Data tables and pure helpers are DOM-free. Vanilla JS IIFE, no libraries. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  // ── Solvent windows (DOM-free data) ──
  // Each solvent's accessible window runs from acidLimit (its lyonium SH2+,
  // the most acidic species it can hold) to baseLimit (its lyate S-). The
  // numbers are placed on the shared acidity axis below. pKs is the
  // autoprotolysis constant; window width = pKs. Values approximate, 25 °C
  // unless noted. (Housecroft–Sharpe; CRC; non-aqueous solvent tables.)
  const SOLVENTS = [
    // name, pKs, acidLimit (right window edge, on the scale), baseLimit (left
    // edge, on the scale), lyoniumpKa (effective pKa of SH2+ — the leveling
    // threshold), note
    ["Sulfuric acid", 3.6, -12.0, -8.4, -12.0, "100% H₂SO₄; pKₛ≈3.4–3.9"],
    ["Acetic acid (glacial)", 14.5, -3.0, 11.5, -7.0, "pKₛ≈12.6–14.5 (spread)"],
    ["Water", 14.0, 0.0, 14.0, -1.74, "pKₛ=14.0"],
    ["Methanol", 16.7, 0.9, 17.6, -1.0, "pKₛ≈16.7"],
    ["Ethanol", 18.9, 1.1, 20.0, -1.0, "pKₛ≈18.9"],
    ["DMSO", 34.0, 1.5, 35.5, 0.0, "pKₛ≈33–35"],
    ["Ammonia (liq.)", 30.0, 2.5, 32.5, 9.25, "pKₛ≈27–33, T-dependent"]
  ];

  // ── Reference acids: aqueous pKa, placed on the axis at their pKa ──
  // An acid is "leveled" by a solvent when it is a stronger acid than the
  // solvent's lyonium ion, i.e. its pKa lies below the lyonium pKa, so it
  // dissociates completely to that lyonium ion.
  const ACIDS = [
    ["HClO₄", -10.0],
    ["HI", -10.0],
    ["HBr", -9.0],
    ["HCl", -6.0],
    ["H₂SO₄", -3.0],
    ["HNO₃", -1.4]
  ];

  // ── Superacid markers: H0 (approximate, composition-dependent) ──
  const SUPERACIDS = [
    ["100% H₂SO₄", -12.0, "the Gillespie threshold"],
    ["Fluorosulfuric HSO₃F", -15.1, "H₀≈−15"],
    ["Magic acid HSO₃F·SbF₅", -23.0, "reported ≈−19 to −23"],
    ["Fluoroantimonic HF·SbF₅", -28.0, "strongest known, ≈−21 to −28"]
  ];

  // ── Pure helpers (DOM-free) ──
  // Acids this solvent levels: those stronger than its lyonium ion, i.e. with
  // aqueous pKa below the solvent's lyonium pKa.
  function leveledAcids(lyoniumpKa) {
    return ACIDS.filter(a => a[1] < lyoniumpKa).map(a => a[0]);
  }

  // Axis runs from AX_MAX (most basic, left) down to AX_MIN (most acidic, right).
  const AX_MAX = 36;   // superbasic end
  const AX_MIN = -30;  // superacidic end

  const W = 600, H = 560;
  const M = { l: 150, r: 24, t: 56, b: 40 };
  const PW = W - M.l - M.r;

  function xpx(v) {
    const c = Math.max(AX_MIN, Math.min(AX_MAX, v));
    return M.l + (AX_MAX - c) / (AX_MAX - AX_MIN) * PW;
  }

  document.querySelectorAll("[data-widget='acidity-window']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    let sel = 2; // default highlight: water

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // Solvent selector
    const ctrl = document.createElement("div");
    ctrl.style.display = "flex";
    ctrl.style.flexWrap = "wrap";
    ctrl.style.justifyContent = "center";
    ctrl.style.gap = "0.4rem";
    ctrl.style.maxWidth = "520px";
    SOLVENTS.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = s[0];
      b.style.fontFamily = "Inter, sans-serif";
      b.style.fontSize = "0.78rem";
      b.style.padding = "0.28rem 0.55rem";
      b.style.border = "1px solid " + RULE;
      b.style.borderRadius = "3px";
      b.style.background = "#fff";
      b.style.color = MUTED;
      b.style.cursor = "pointer";
      b.addEventListener("click", () => { sel = i; restyle(); redraw(); });
      ctrl.appendChild(b);
    });
    host.appendChild(ctrl);
    const buttons = Array.from(ctrl.children);

    function restyle() {
      buttons.forEach((b, i) => {
        const on = i === sel;
        b.style.background = on ? ACCENT : "#fff";
        b.style.color = on ? "#fff" : MUTED;
        b.style.borderColor = on ? ACCENT : RULE;
        b.style.fontWeight = on ? "600" : "400";
      });
    }

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.84rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.55";
    readout.style.maxWidth = "520px";
    host.appendChild(readout);

    restyle();
    redraw();

    function redraw() {
      let s = "";

      // ── Axis gridlines + numeric labels every 5 units ──
      for (let g = AX_MAX; g >= AX_MIN; g -= 5) {
        const x = xpx(g);
        s += `<line x1="${x.toFixed(1)}" y1="${M.t}" x2="${x.toFixed(1)}" y2="${H - M.b}" stroke="${RULE}" stroke-width="1"/>`;
        s += txt(x, H - M.b + 16, String(g), 9.5, FAINT, "middle");
      }

      // axis title + direction cues
      s += txt(M.l, 22, "← more basic", 11, MUTED, "start");
      s += txt(W - M.r, 22, "more acidic →", 11, MUTED, "end");
      s += txt((M.l + W - M.r) / 2, 22, "pH  /  H₀  scale", 11, INK, "middle");
      s += txt((M.l + W - M.r) / 2, H - M.b + 32, "acidity coordinate (aqueous pH, or Hammett H₀ at the acidic end)", 9.5, FAINT, "middle");

      // ── Solvent window bars ──
      const rowH = 22, rowGap = 6;
      const topY = M.t + 6;
      SOLVENTS.forEach((sv, i) => {
        const y = topY + i * (rowH + rowGap);
        const xL = xpx(sv[3]);          // base edge (left, more basic)
        const xR = xpx(sv[2]);          // acid edge (right, more acidic)
        const on = i === sel;
        const fill = on ? ACCENT : "#d9c8d3";
        const op = on ? 0.85 : 0.5;
        s += `<rect x="${xR.toFixed(1)}" y="${y.toFixed(1)}" width="${(xL - xR).toFixed(1)}" height="${rowH}" rx="2" fill="${fill}" opacity="${op}"/>`;
        if (on) {
          s += `<rect x="${xR.toFixed(1)}" y="${y.toFixed(1)}" width="${(xL - xR).toFixed(1)}" height="${rowH}" rx="2" fill="none" stroke="${ACCENT_DEEP}" stroke-width="1.5"/>`;
        }
        // name on the left margin
        s += txt(M.l - 8, y + rowH / 2 + 3.5, sv[0], 10.5, on ? ACCENT_DEEP : MUTED, "end");
      });

      // ── Reference acid markers (aqueous pKa), as ticks above the bars ──
      const acidY = topY + SOLVENTS.length * (rowH + rowGap) + 6;
      ACIDS.forEach((a, i) => {
        const x = xpx(a[1]);
        s += `<line x1="${x.toFixed(1)}" y1="${acidY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(acidY + 12).toFixed(1)}" stroke="${WARM}" stroke-width="1.5"/>`;
        const ty = acidY - 4 + (i % 2) * 12;
        s += txt(x, ty, a[0], 9, WARM, "middle");
      });
      s += txt(M.l - 8, acidY + 8, "strong acids (pKₐ)", 9.5, WARM, "end");

      // ── Superacid markers (H0), below ──
      const supY = acidY + 34;
      SUPERACIDS.forEach((sa, i) => {
        const x = xpx(sa[1]);
        s += `<circle cx="${x.toFixed(1)}" cy="${supY.toFixed(1)}" r="4" fill="${ACCENT_DEEP}"/>`;
        const ty = supY + 16 + (i % 2) * 12;
        s += txt(x, ty, `${sa[0]}`, 8.5, ACCENT_DEEP, "middle");
        s += `<line x1="${x.toFixed(1)}" y1="${(supY - 8).toFixed(1)}" x2="${x.toFixed(1)}" y2="${supY.toFixed(1)}" stroke="${ACCENT_DEEP}" stroke-width="1"/>`;
      });
      s += txt(M.l - 8, supY + 4, "superacids (H₀)", 9.5, ACCENT_DEEP, "end");

      // ── Water neutral pH 7 marker ──
      const x7 = xpx(7);
      s += `<line x1="${x7.toFixed(1)}" y1="${M.t}" x2="${x7.toFixed(1)}" y2="${H - M.b}" stroke="${FAINT}" stroke-width="1" stroke-dasharray="3 3"/>`;
      s += txt(x7, M.t - 4, "pH 7", 9, FAINT, "middle");

      svg.innerHTML = s;

      // ── Readout ──
      const sv = SOLVENTS[sel];
      const lev = leveledAcids(sv[4]);
      const allNames = ACIDS.map(a => a[0]);
      const diff = allNames.filter(n => lev.indexOf(n) === -1);
      const levTxt = lev.length
        ? (lev.length === allNames.length
            ? `levels <strong style="color:${WARM}">all of them</strong> (each collapses to its ${formula("SH₂⁺")} ion)`
            : `levels <strong style="color:${WARM}">${lev.join(", ")}</strong> but differentiates ${diff.join(", ")}`)
        : `levels none of them — all remain distinguishable`;
      const strongest = SUPERACIDS[SUPERACIDS.length - 1];
      readout.innerHTML =
        `<strong style="color:${ACCENT_DEEP}">${sv[0]}</strong>: ` +
        `${sv[5]}; window spans ${fmt(sv[2])} → ${fmt(sv[3])} on the scale (width = pKₛ). ` +
        `This solvent ${levTxt}. ` +
        `<br/>For reference, the strongest marker shown is <strong style="color:${ACCENT_DEEP}">${strongest[0]}</strong> at H₀ ≈ ${fmt(strongest[1])} (${strongest[2]}).`;
    }
  }

  function fmt(v) {
    return (v > 0 ? "+" : "") + v.toFixed(1);
  }

  function formula(name) {
    return name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function txt(x, y, s, size, color, anchor) {
    return `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-size="${size}" fill="${color}" font-family="Inter,sans-serif" text-anchor="${anchor}">${formula(s)}</text>`;
  }
})();
