/* Interactive · Hard–Soft Acid–Base pairing.
   Pick a Lewis acid and a Lewis base from tabulated ionization energy I and
   electron affinity A (eV, from Pearson, Inorg. Chem. 27, 734 (1988) and
   Parr–Pearson, J. Am. Chem. Soc. 105, 7512 (1983)). The widget computes the
   Mulliken electronegativity chi = (I+A)/2, the absolute hardness
   eta = (I-A)/2, and the fractional charge transfer on contact
   deltaN = (chiA - chiB) / (2(etaA + etaB)). It classifies each species as
   hard (high eta) or soft (low eta) and reports whether the pairing is
   hard–hard, soft–soft, or a mismatch. H+ is handled specially: it has no
   electrons, so eta = infinity (the hardest possible acid). */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  // ── Pure functions (DOM-free) ──
  function chi(I, A) { return (I + A) / 2; }
  function eta(I, A) { return (I - A) / 2; }
  function deltaN(chiA, chiB, etaA, etaB) {
    const denom = 2 * (etaA + etaB);
    if (!isFinite(denom) || denom === 0) return 0;
    return (chiA - chiB) / denom;
  }

  // Lewis acids: [label, I (eV), A (eV)] OR proton special-cased via eta:Infinity.
  // I and A here are the ionization energy and electron affinity of the acidic
  // species; chi and eta follow from them. For the proton we set eta = Infinity.
  const ACIDS = [
    { id: "Hp",   label: "H+",   proton: true,  chi: Infinity, eta: Infinity },
    { id: "Al3",  label: "Al3+", chi: 74.2, eta: 45.8 },
    { id: "Li",   label: "Li+",  chi: 40.5, eta: 35.1 },
    { id: "Mg2",  label: "Mg2+", chi: 47.6, eta: 32.5 },
    { id: "Na",   label: "Na+",  chi: 26.2, eta: 21.1 },
    { id: "Zn2",  label: "Zn2+", chi: 28.8, eta: 10.8 },
    { id: "Hg2",  label: "Hg2+", chi: 26.5, eta: 7.7 },
    { id: "Ag",   label: "Ag+",  chi: 14.6, eta: 6.9 },
    { id: "Cu",   label: "Cu+",  chi: 14.0, eta: 6.3 },
    { id: "Au",   label: "Au+",  chi: 14.9, eta: 5.7 }
  ];

  // Lewis bases (anions): chi and eta in eV (Pearson 1988).
  const BASES = [
    { id: "F",  label: "F-",  chi: 10.4, eta: 7.0 },
    { id: "H",  label: "H-",  chi: 6.4,  eta: 6.8 },
    { id: "Cl", label: "Cl-", chi: 8.3,  eta: 4.7 },
    { id: "Br", label: "Br-", chi: 7.6,  eta: 4.2 },
    { id: "CN", label: "CN-", chi: 8.5,  eta: 5.3 },
    { id: "I",  label: "I-",  chi: 6.8,  eta: 3.7 }
  ];

  // Hard/soft cutoff on eta (eV). Above ~ hard, below ~ soft; near it, borderline.
  const HARD_CUT = 8.0;
  const SOFT_CUT = 5.0;

  function classify(e) {
    if (!isFinite(e)) return "hard";
    if (e >= HARD_CUT) return "hard";
    if (e <= SOFT_CUT) return "soft";
    return "borderline";
  }

  // Formula prettifier: H3O+ style sub/superscripts as unicode for SVG/HTML text.
  const SUBS = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉" };
  function pretty(label) {
    let out = "";
    for (let i = 0; i < label.length; i++) {
      const c = label[i];
      if (c === "+") out += "⁺";
      else if (c === "-") out += "⁻";
      else if (SUBS[c]) out += SUBS[c];
      else out += c;
    }
    return out;
  }

  document.querySelectorAll("[data-widget='hsab']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.8rem";

    let acid = ACIDS.find(a => a.id === "Hg2");
    let base = BASES.find(b => b.id === "I");

    // ── Selector row ──
    const selRow = document.createElement("div");
    selRow.style.display = "flex";
    selRow.style.flexWrap = "wrap";
    selRow.style.justifyContent = "center";
    selRow.style.gap = "1.4rem";
    selRow.style.fontFamily = "Inter, sans-serif";
    selRow.style.fontSize = "0.84rem";
    selRow.style.color = MUTED;
    host.appendChild(selRow);

    const acidSel = makeSelect("Lewis acid", ACIDS, acid.id, WARM);
    const baseSel = makeSelect("Lewis base", BASES, base.id, ACCENT);
    selRow.appendChild(acidSel.wrap);
    selRow.appendChild(baseSel.wrap);

    // ── SVG hardness axis ──
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const W = 580, Hh = 200;
    svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", Hh);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // ── Readout ──
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.86rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.6";
    readout.style.maxWidth = "480px";
    host.appendChild(readout);

    acidSel.el.addEventListener("change", () => {
      acid = ACIDS.find(a => a.id === acidSel.el.value);
      redraw();
    });
    baseSel.el.addEventListener("change", () => {
      base = BASES.find(b => b.id === baseSel.el.value);
      redraw();
    });

    redraw();

    function makeSelect(labelText, list, initial, col) {
      const wrap = document.createElement("label");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "0.25rem";
      wrap.style.fontWeight = "600";
      wrap.style.color = col;
      const txt = document.createElement("span");
      txt.textContent = labelText;
      const el = document.createElement("select");
      el.style.fontFamily = "Inter, sans-serif";
      el.style.fontSize = "0.9rem";
      el.style.padding = "0.25rem 0.4rem";
      el.style.color = INK;
      el.style.border = "1px solid " + RULE;
      el.style.borderRadius = "3px";
      el.style.background = "#fff";
      for (const item of list) {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = pretty(item.label);
        if (item.id === initial) opt.selected = true;
        el.appendChild(opt);
      }
      wrap.appendChild(txt);
      wrap.appendChild(el);
      return { wrap, el };
    }

    function tag(cls) {
      if (cls === "hard") return `<span style="color:${ACCENT_DEEP};font-weight:600">hard</span>`;
      if (cls === "soft") return `<span style="color:${WARM};font-weight:600">soft</span>`;
      return `<span style="color:${MUTED};font-weight:600">borderline</span>`;
    }

    function num(x) {
      if (!isFinite(x)) return "∞";
      return x.toFixed(1);
    }

    function redraw() {
      const cA = acid.chi, eA = acid.eta;
      const cB = base.chi, eB = base.eta;
      const dN = deltaN(cA, cB, eA, eB);
      const clsA = classify(eA);
      const clsB = classify(eB);

      // Pairing verdict.
      let verdict, vColor;
      if (clsA === "hard" && clsB === "hard") { verdict = "hard–hard — a strong, favoured match"; vColor = ACCENT_DEEP; }
      else if (clsA === "soft" && clsB === "soft") { verdict = "soft–soft — a strong, favoured match"; vColor = WARM; }
      else if (clsA === "borderline" || clsB === "borderline") { verdict = "borderline pairing"; vColor = MUTED; }
      else { verdict = "hard–soft mismatch — the weaker combination"; vColor = FAINT; }

      // ── Hardness axis: log scale of eta, infinity pinned at the right edge ──
      const M = { l: 30, r: 30, t: 70, b: 40 };
      const axW = W - M.l - M.r;
      const yAx = Hh - M.b;
      const ETA_MIN = 3, ETA_MAX = 50; // eV span for finite species
      function xOf(e) {
        if (!isFinite(e)) return M.l + axW; // pin infinity to the right end
        const v = Math.max(ETA_MIN, Math.min(ETA_MAX, e));
        const f = (Math.log10(v) - Math.log10(ETA_MIN)) / (Math.log10(ETA_MAX) - Math.log10(ETA_MIN));
        return M.l + f * axW * 0.94; // leave room before the ∞ pin
      }

      let s = "";
      // axis line
      s += `<line x1="${M.l}" y1="${yAx}" x2="${M.l + axW}" y2="${yAx}" stroke="${RULE}" stroke-width="2"/>`;
      // ticks at a few eta values
      [3, 5, 8, 15, 30].forEach(t => {
        const x = xOf(t);
        s += `<line x1="${x.toFixed(1)}" y1="${yAx - 4}" x2="${x.toFixed(1)}" y2="${yAx + 4}" stroke="${FAINT}" stroke-width="1"/>`;
        s += text(x, yAx + 16, String(t), 9, FAINT, "middle");
      });
      // infinity pin
      s += text(M.l + axW, yAx + 16, "∞", 12, FAINT, "middle");
      // axis labels
      s += text(M.l, yAx + 30, "soft (low η)", 9.5, WARM, "start");
      s += text(M.l + axW, yAx + 30, "hard (high η)", 9.5, ACCENT_DEEP, "end");
      s += text(W / 2, M.t - 44, "chemical hardness η  /  eV", 10.5, MUTED, "middle");

      // faint markers for the whole roster (context)
      ACIDS.concat(BASES).forEach(sp => {
        const x = xOf(sp.eta);
        s += `<circle cx="${x.toFixed(1)}" cy="${yAx}" r="2.2" fill="${RULE}"/>`;
      });

      // acid marker (warm, above the line)
      const xa = xOf(eA);
      s += `<line x1="${xa.toFixed(1)}" y1="${yAx}" x2="${xa.toFixed(1)}" y2="${(M.t - 4)}" stroke="${WARM}" stroke-width="1" stroke-dasharray="2 2"/>`;
      s += `<circle cx="${xa.toFixed(1)}" cy="${(M.t - 4)}" r="5" fill="${WARM}"/>`;
      s += text(xa, M.t - 14, pretty(acid.label), 12, WARM, "middle");

      // base marker (accent, slightly lower band)
      const xb = xOf(eB);
      s += `<line x1="${xb.toFixed(1)}" y1="${yAx}" x2="${xb.toFixed(1)}" y2="${(M.t + 18)}" stroke="${ACCENT}" stroke-width="1" stroke-dasharray="2 2"/>`;
      s += `<circle cx="${xb.toFixed(1)}" cy="${(M.t + 18)}" r="5" fill="${ACCENT}"/>`;
      s += text(xb, M.t + 34, pretty(base.label), 12, ACCENT, "middle");

      svg.innerHTML = s;

      readout.innerHTML =
        `<div style="font-family:JetBrains Mono,ui-monospace,monospace;font-size:0.82rem;color:${INK};margin-bottom:0.4rem">` +
          `<span style="color:${WARM}">${pretty(acid.label)}</span>: χ=${num(cA)}, η=${num(eA)} eV (${tag(clsA)}) &nbsp;·&nbsp; ` +
          `<span style="color:${ACCENT}">${pretty(base.label)}</span>: χ=${num(cB)}, η=${num(eB)} eV (${tag(clsB)})` +
        `</div>` +
        `Charge transfer on contact: ` +
        `<strong style="color:${INK}">ΔN = ${isFinite(dN) ? dN.toFixed(3) : "0"}</strong> electrons.<br>` +
        `<strong style="color:${vColor}">${verdict}.</strong>`;
    }

    function text(x, y, str, size, color, anchor) {
      return `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-size="${size}" fill="${color}" font-family="Inter,sans-serif" text-anchor="${anchor}">${str}</text>`;
    }
  }
})();
