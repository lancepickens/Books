/* Interactive · Strominger–Vafa entropy.
   S = 2π √(Q_1 Q_5 N).  Sliders for the three charges. */

(function () {
  "use strict";

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let Q1 = 50, Q5 = 50, N = 50;

    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "auto 1fr auto";
    wrap.style.gap = "0.6rem 1rem";
    wrap.style.alignItems = "center";
    wrap.style.fontFamily = "Inter, sans-serif";
    wrap.style.fontSize = "0.88rem";
    wrap.style.marginBottom = "1.2rem";

    function mkRow(labelText, min, max, init, onInput) {
      const lbl = document.createElement("span");
      lbl.style.color = "#6f6a63";
      lbl.style.fontWeight = "500";
      lbl.textContent = labelText;
      const inp = document.createElement("input");
      inp.type = "range";
      inp.min = String(min); inp.max = String(max); inp.step = "1"; inp.value = String(init);
      inp.style.accentColor = "#a83e2a";
      const val = document.createElement("span");
      val.style.color = "#1f1c1a";
      val.style.fontFeatureSettings = "'tnum'";
      val.style.minWidth = "5ch";
      val.textContent = String(init);
      inp.addEventListener("input", () => {
        val.textContent = inp.value;
        onInput(+inp.value);
      });
      wrap.appendChild(lbl);
      wrap.appendChild(inp);
      wrap.appendChild(val);
      return inp;
    }

    mkRow("Q₁  (D1-branes)", 1, 200, Q1, v => { Q1 = v; redraw(); });
    mkRow("Q₅  (D5-branes)", 1, 200, Q5, v => { Q5 = v; redraw(); });
    mkRow("N  (momentum)",    1, 500, N,  v => { N = v;  redraw(); });
    mount.appendChild(wrap);

    // Big readout (both sides agree)
    const panel = document.createElement("div");
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr 1fr";
    panel.style.gap = "0.8rem 1.5rem";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.9rem";

    function mkBigStat(text, color, sub) {
      const w = document.createElement("div");
      const lbl = document.createElement("div");
      lbl.style.cssText = "font-family: Inter, sans-serif; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: " + color + "; font-weight: 700; margin-bottom: 0.2rem";
      lbl.textContent = text;
      const val = document.createElement("div");
      val.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 2.2rem; font-weight: 600; color: #1f1c1a; line-height: 1.05";
      const sb = document.createElement("div");
      sb.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 0.95rem; font-style: italic; color: #6f6a63; margin-top: 0.2rem";
      sb.textContent = sub;
      w.appendChild(lbl); w.appendChild(val); w.appendChild(sb);
      return { wrap: w, val };
    }
    const bhStat = mkBigStat("Macroscopic  S_BH", "#a83e2a", "from horizon area:  A / 4G");
    const microStat = mkBigStat("Microscopic  S_micro", "#1e5b8a", "from Cardy formula on D1–D5 CFT");
    panel.appendChild(bhStat.wrap); panel.appendChild(microStat.wrap);

    const formula = document.createElement("div");
    formula.style.cssText = "grid-column: 1 / -1; font-family: 'Source Serif 4', Georgia, serif; font-size: 1rem; color: #1f1c1a; margin-top: 0.4rem";
    panel.appendChild(formula);

    mount.appendChild(panel);

    function redraw() {
      const S = 2 * Math.PI * Math.sqrt(Q1 * Q5 * N);
      bhStat.val.textContent = S.toFixed(2);
      microStat.val.textContent = S.toFixed(2);
      formula.innerHTML = "S = 2π √(Q₁ Q₅ N) = 2π √(" + Q1 + " · " + Q5 + " · " + N + ") = " + S.toFixed(2) + ".  Agreement to the digit.";
    }

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='strominger-vafa']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
