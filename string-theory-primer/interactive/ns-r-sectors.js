/* Interactive · NS and R sector spectrum of the open superstring.

   Before GSO:
     NS: half-integer modes b_{-1/2}, b_{-3/2}, …; vacuum has α'M² = -1/2.
     R:  integer modes d_{-1}, d_{-2}, …; vacuum is degenerate (target spinor); α'M² = 0.
   GSO keeps states with the appropriate (−1)^F parity. */

(function () {
  "use strict";

  // NS sector states up to level N = 2 (in units of 1/2)
  // We label states by which b_{-r} have been excited (r ∈ {1/2, 3/2, 5/2, ...})
  // Level shift: a_NS = 1/2, mass: α'M² = N - 1/2, where N is total oscillator level.
  // Bosonic (no fermion-number) parity (-1)^F flips with each fermion excitation; vacuum has (-1)^F = -1.

  // We'll list states by hand for clarity, up to α'M² ≤ 3/2.
  const NS_STATES = [
    { level: 0,    state: "|0⟩_NS",                                 mSq: -0.5, gsoKeep: false, kind: "tachyon" },
    { level: 0.5,  state: "ψ^μ_{-1/2} |0⟩_NS",                       mSq:  0.0, gsoKeep: true,  kind: "vector" },
    { level: 1,    state: "ψ^μ_{-1/2} ψ^ν_{-1/2} |0⟩_NS",            mSq:  0.5, gsoKeep: false, kind: "tensor" },
    { level: 1,    state: "ψ^μ_{-1} |0⟩_NS"  + "  (does not exist — only half-integer)", mSq: 0.5, gsoKeep: false, kind: "n/a" },
    { level: 1.5,  state: "ψ^μ_{-3/2} |0⟩_NS",                       mSq:  1.0, gsoKeep: true,  kind: "vector" },
    { level: 1.5,  state: "ψ^μ_{-1/2} ψ^ν_{-1/2} ψ^ρ_{-1/2} |0⟩_NS", mSq:  1.0, gsoKeep: true,  kind: "tensor (3-form)" }
  ].filter(s => s.kind !== "n/a");

  // R sector — every state is a spacetime spinor (because the R vacuum is)
  // a_R = 0; α'M² = N.
  const R_STATES = [
    { level: 0,   state: "|S⟩_R",                                    mSq: 0.0, gsoKeep: true,  kind: "spinor (one chirality after GSO)" },
    { level: 1,   state: "ψ^μ_{-1} |S⟩_R",                            mSq: 1.0, gsoKeep: true,  kind: "spinor × vector" },
    { level: 1,   state: "α^μ_{-1} |S⟩_R",                            mSq: 1.0, gsoKeep: true,  kind: "spinor × vector" },
    { level: 2,   state: "(several massive states)",                  mSq: 2.0, gsoKeep: true,  kind: "various spinors" }
  ];

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let gsoOn = false;

    // Toggle
    const ctl = document.createElement("div");
    ctl.style.display = "flex";
    ctl.style.alignItems = "center";
    ctl.style.gap = "1rem";
    ctl.style.marginBottom = "0.9rem";
    ctl.style.fontFamily = "Inter, sans-serif";
    ctl.style.fontSize = "0.85rem";

    const gsoBtn = document.createElement("button");
    gsoBtn.textContent = "GSO  OFF";
    Object.assign(gsoBtn.style, {
      fontFamily: "Inter, sans-serif", fontSize: "0.78rem",
      letterSpacing: "0.08em", textTransform: "uppercase",
      background: "transparent", border: "1px solid #d3cabd",
      color: "#1f1c1a", padding: "0.4rem 1.1rem",
      borderRadius: "999px", cursor: "pointer", fontWeight: "600"
    });
    gsoBtn.addEventListener("click", () => {
      gsoOn = !gsoOn;
      gsoBtn.textContent = "GSO  " + (gsoOn ? "ON" : "OFF");
      gsoBtn.style.background = gsoOn ? "#a83e2a" : "transparent";
      gsoBtn.style.color = gsoOn ? "#fbfaf7" : "#1f1c1a";
      gsoBtn.style.borderColor = gsoOn ? "#a83e2a" : "#d3cabd";
      redraw();
    });
    ctl.appendChild(gsoBtn);

    const hint = document.createElement("span");
    hint.style.color = "#6f6a63";
    hint.style.fontStyle = "italic";
    hint.style.fontSize = "0.85rem";
    hint.textContent = "Toggle the projection; watch the tachyon disappear and the boson/fermion counts equalize.";
    ctl.appendChild(hint);

    mount.appendChild(ctl);

    // Two-column display
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr 1fr";
    grid.style.gap = "1.5rem";

    const nsCol = document.createElement("div");
    const rCol = document.createElement("div");
    grid.appendChild(nsCol);
    grid.appendChild(rCol);
    mount.appendChild(grid);

    function header(text, color) {
      const h = document.createElement("div");
      h.style.cssText = "font-family: Inter, sans-serif; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.14em; color: " + color + "; font-weight: 700; margin-bottom: 0.6rem; border-bottom: 1px solid " + color + "; padding-bottom: 0.35rem";
      h.textContent = text;
      return h;
    }

    function renderColumn(col, states, headerText, color) {
      col.innerHTML = "";
      col.appendChild(header(headerText, color));
      const visible = gsoOn ? states.filter(s => s.gsoKeep) : states;
      for (const s of visible) {
        const row = document.createElement("div");
        row.style.padding = "0.5rem 0";
        row.style.borderBottom = "1px dotted #e7e1d6";

        const top = document.createElement("div");
        top.style.display = "flex";
        top.style.justifyContent = "space-between";
        top.style.alignItems = "baseline";
        top.style.gap = "0.6rem";

        const lbl = document.createElement("div");
        lbl.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 0.98rem; color: #1f1c1a; font-style: italic";
        lbl.textContent = s.state;

        const m = document.createElement("div");
        const mSq = s.mSq;
        const isTach = mSq < 0;
        const isMassless = Math.abs(mSq) < 1e-9;
        m.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 0.92rem; color: " +
          (isTach ? "#a83e2a" : (isMassless ? "#2c6e1f" : "#6f6a63")) +
          "; font-weight: 600; white-space: nowrap";
        m.textContent = "α′M² = " + mSq.toFixed(1);

        top.appendChild(lbl);
        top.appendChild(m);
        row.appendChild(top);

        const kind = document.createElement("div");
        kind.style.cssText = "font-family: Inter, sans-serif; font-size: 0.76rem; color: #9a9389; margin-top: 0.15rem";
        kind.textContent = s.kind + (isTach ? "  ·  unstable" : "");
        row.appendChild(kind);

        col.appendChild(row);
      }
      if (visible.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "color: #9a9389; font-style: italic; font-family: Inter, sans-serif; font-size: 0.85rem; padding: 0.6rem 0";
        empty.textContent = "(nothing in this sector at displayed levels)";
        col.appendChild(empty);
      }
    }

    function redraw() {
      renderColumn(nsCol, NS_STATES, "NS sector — spacetime bosons", "#1e5b8a");
      renderColumn(rCol, R_STATES, "R sector — spacetime fermions", "#a83e2a");
    }

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='ns-r-sectors']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
