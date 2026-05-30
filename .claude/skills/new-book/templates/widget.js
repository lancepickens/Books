/* TEMPLATE interactive widget. One per chapter, in <book>/interactive/<slug>.js.
   - Vanilla JS, no libraries, no imports. Self-mounts on its data-widget slug.
   - Must compute the chapter's REAL math (on-screen numbers from the actual
     equations), not a cartoon. Must pass `node --check`.
   - Palette (match the book): use the accent/accent-deep you chose + a warm
     contrast for a second series. Inter for UI, italic Source Serif 4 for axis
     variable labels.
   - Verify with scripts/widget-run.js (executes build() in JSDOM). */

(function () {
  "use strict";

  // ── Book palette (replace ACCENT/ACCENT_DEEP with this book's colors) ──
  const ACCENT = "#2b5c8a";
  const ACCENT_DEEP = "#173a5a";
  const WARM = "#b8651a";      // second data series / contrast
  const FAINT = "#8e9a9e";
  const RULE = "#dde3ea";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 46, r: 16, t: 18, b: 34 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // ── Self-mount (every section with this data-widget slug) ──
  document.querySelectorAll("[data-widget='<widget-slug>']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // 1) Controls (sliders / buttons) appended to `host`.
    // 2) An SVG plot (createElementNS) or a <canvas>.
    // 3) A live numeric readout element.
    // 4) A legend.
    // Wire control 'input'/'click' events to a redraw() that recomputes from the
    // physics functions below and updates the readout + plot.

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
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    host.appendChild(readout);

    redraw();

    function redraw() {
      // const y = physics(x);  // call the pure functions below
      // render(svg, ...);
      // readout.innerHTML = `<strong style="color:${ACCENT_DEEP}">...</strong>`;
    }
  }

  // ── Pure physics functions (the chapter's equations). Keep these DOM-free so
  //    the JSDOM/Node harness can test them directly. ──
  // function physics(x) { return ...; }

  // ── Pure SVG helpers ──
  function makePath(pts) {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    return d;
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
    b.addEventListener("mouseenter", () => { b.style.background = ACCENT; b.style.color = "#fff"; });
    b.addEventListener("mouseleave", () => { b.style.background = "#fff"; b.style.color = ACCENT; });
  }
})();
