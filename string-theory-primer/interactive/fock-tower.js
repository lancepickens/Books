/* Interactive · Fock space tower for the open bosonic string.

   Displays states by level N, restricting to a single transverse direction
   for clarity. Each state is labeled by its occupation numbers
   (N_1, N_2, ..., N_n) with N = Σ k N_k.

   For one transverse direction the partition function p(N) gives the
   number of states at level N: p(0)=1, p(1)=1, p(2)=2, p(3)=3, p(4)=5, ...
   With a=1, α'M² = N − 1. */

(function () {
  "use strict";

  const N_MAX = 5;
  const A = 1;  // normal-ordering shift; α' M² = N − a

  // Generate partitions of N (with parts ≥ 1) — these label states.
  function partitions(N) {
    const result = [];
    function rec(remaining, max, current) {
      if (remaining === 0) { result.push(current.slice()); return; }
      for (let k = Math.min(remaining, max); k >= 1; k--) {
        current.push(k);
        rec(remaining - k, k, current);
        current.pop();
      }
    }
    if (N === 0) return [[]];
    rec(N, N, []);
    return result;
  }

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function partitionLabel(p) {
    if (p.length === 0) return "|0;p⟩";
    // Group repeated entries: α_-2 α_-2 α_-1 → α_{-2}² α_{-1}
    const counts = new Map();
    for (const k of p) counts.set(k, (counts.get(k) || 0) + 1);
    const parts = Array.from(counts.entries()).sort((a, b) => b[0] - a[0]);
    let s = "";
    for (const [k, c] of parts) {
      s += "α₋" + subscript(k);
      if (c > 1) s += superscript(c);
      s += " ";
    }
    s += "|0;p⟩";
    return s;
  }

  function subscript(n) {
    const m = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
    return String(n).split("").map(c => m[c] || c).join("");
  }
  function superscript(n) {
    const m = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(n).split("").map(c => m[c] || c).join("");
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "0.6rem";
    wrap.style.padding = "0.4rem 0 0.2rem";

    for (let N = 0; N <= N_MAX; N++) {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "auto auto 1fr";
      row.style.gap = "0.85rem 1rem";
      row.style.alignItems = "center";
      row.style.padding = "0.45rem 0";
      row.style.borderBottom = (N === N_MAX) ? "none" : "1px dotted #e7e1d6";

      const levelCell = document.createElement("div");
      levelCell.style.fontFamily = "Inter, sans-serif";
      levelCell.style.fontSize = "0.78rem";
      levelCell.style.textTransform = "uppercase";
      levelCell.style.letterSpacing = "0.12em";
      levelCell.style.color = "#6f6a63";
      levelCell.style.fontWeight = "600";
      levelCell.style.minWidth = "5ch";
      levelCell.textContent = "N = " + N;

      const massCell = document.createElement("div");
      massCell.style.fontFamily = "Source Serif 4, Georgia, serif";
      massCell.style.fontSize = "0.95rem";
      massCell.style.color = "#1f1c1a";
      massCell.style.minWidth = "11ch";
      const m2 = N - A;
      let massLabel;
      if (m2 < 0) {
        massLabel = "α′M² = " + m2 + "  (tachyon)";
        massCell.style.color = "#a83e2a";
      } else if (m2 === 0) {
        massLabel = "α′M² = 0  (massless)";
        massCell.style.color = "#2c6e1f";
      } else {
        massLabel = "α′M² = +" + m2;
      }
      massCell.textContent = massLabel;

      const statesCell = document.createElement("div");
      statesCell.style.display = "flex";
      statesCell.style.flexWrap = "wrap";
      statesCell.style.gap = "0.45rem";
      statesCell.style.fontFamily = "Inter, sans-serif";
      statesCell.style.fontSize = "0.85rem";

      const parts = partitions(N);
      for (const p of parts) {
        const chip = document.createElement("span");
        chip.textContent = partitionLabel(p);
        chip.style.padding = "0.18rem 0.6rem";
        chip.style.border = "1px solid #d3cabd";
        chip.style.borderRadius = "999px";
        chip.style.background = "#fbfaf7";
        chip.style.color = "#1f1c1a";
        chip.style.whiteSpace = "nowrap";
        if (m2 < 0) chip.style.borderColor = "#a83e2a";
        if (m2 === 0) chip.style.borderColor = "#2c6e1f";
        statesCell.appendChild(chip);
      }

      const countCell = document.createElement("span");
      countCell.style.color = "#9a9389";
      countCell.style.fontFamily = "Inter, sans-serif";
      countCell.style.fontSize = "0.78rem";
      countCell.textContent = parts.length + (parts.length === 1 ? " state" : " states");
      statesCell.appendChild(countCell);

      row.appendChild(levelCell);
      row.appendChild(massCell);
      row.appendChild(statesCell);
      wrap.appendChild(row);
    }

    const note = document.createElement("p");
    note.style.fontFamily = "Inter, sans-serif";
    note.style.fontSize = "0.78rem";
    note.style.color = "#6f6a63";
    note.style.marginTop = "0.75rem";
    note.style.borderTop = "1px solid #e7e1d6";
    note.style.paddingTop = "0.7rem";
    note.innerHTML = "Showing one transverse direction (state count $= p(N)$, the partition function). " +
                     "The full bosonic spectrum is enormously larger because there are $D-2$ transverse directions, each independent. " +
                     "Counting these gives the asymptotic state density $\\rho(N) \\sim e^{4\\pi\\sqrt{N(D-2)/24}}$ — the famous Hagedorn growth.";
    wrap.appendChild(note);

    mount.appendChild(wrap);
  }

  function start() {
    document.querySelectorAll("[data-widget='fock-tower']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
