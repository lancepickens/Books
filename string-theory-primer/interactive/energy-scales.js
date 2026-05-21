/* Interactive · log-scale length ruler.
   Mounts into any [data-widget='energy-scales'] section.

   The ruler runs from 10^-35 m (Planck length) to 10^27 m (observable universe).
   Drag the knob, click anywhere on the ruler, or use arrow keys to inspect what
   physics governs each scale. */

(function () {
  "use strict";

  const STOPS = [
    {
      exp: -35,
      title: "Planck length",
      value: "1.616 × 10⁻³⁵ m",
      regime: "Quantum gravity",
      desc: "ℓ_P = √(ℏG/c³). The unique length built from ℏ, G, c alone. At this scale, the smooth-manifold picture of spacetime is expected to fail — metric fluctuations become of order one. String theory aims to provide what replaces it."
    },
    {
      exp: -33,
      title: "String length (conjectured)",
      value: "~ 10⁻³³ m",
      regime: "String theory",
      desc: "ℓ_s = √α'. The intrinsic length of a string. Often modelled within a few orders of magnitude of ℓ_P, though the precise value is model-dependent and not directly measured."
    },
    {
      exp: -19,
      title: "LHC reach",
      value: "~ 10⁻¹⁹ m",
      regime: "Standard Model",
      desc: "Shortest distance directly probed by the Large Hadron Collider at 13 TeV, set by ℏc/E. Sixteen orders of magnitude above the string scale; this is the experimental frontier."
    },
    {
      exp: -15,
      title: "Proton charge radius",
      value: "0.84 × 10⁻¹⁵ m",
      regime: "Quantum chromodynamics",
      desc: "Quarks are confined inside hadrons by gluon flux tubes — themselves an early hint of string-like behavior, which is what got Veneziano, Nambu, and others started in the late 1960s."
    },
    {
      exp: -10,
      title: "Atom",
      value: "~ 10⁻¹⁰ m",
      regime: "Atomic physics",
      desc: "Bohr radius is 5.29 × 10⁻¹¹ m. Non-relativistic quantum mechanics describes electron orbitals; the strong and weak forces only matter inside the nucleus."
    },
    {
      exp: -7,
      title: "Virus / wavelength of visible light",
      value: "~ 10⁻⁷ m",
      regime: "Classical EM + chemistry",
      desc: "Macromolecular biology. Classical electromagnetism and statistical mechanics govern; quantum effects average out at room temperature."
    },
    {
      exp: 0,
      title: "Human",
      value: "1 m",
      regime: "Newtonian mechanics",
      desc: "Everyday scale. Quantum effects suppressed by decoherence; relativistic effects negligible at human energies. Newton suffices."
    },
    {
      exp: 7,
      title: "Earth",
      value: "6.37 × 10⁶ m",
      regime: "Newtonian gravity, with GR corrections",
      desc: "Earth's radius. GPS satellites must include both special- and general-relativistic time dilation to remain accurate to within tens of metres."
    },
    {
      exp: 11,
      title: "Earth–Sun distance",
      value: "1.50 × 10¹¹ m",
      regime: "Celestial mechanics",
      desc: "One astronomical unit. General relativity is needed for Mercury's perihelion precession and gravitational lensing of starlight."
    },
    {
      exp: 21,
      title: "Milky Way",
      value: "~ 5 × 10²⁰ m",
      regime: "Galactic dynamics",
      desc: "Galaxy diameter. Stellar dynamics plus dark matter; observed rotation curves don't match the visible mass alone."
    },
    {
      exp: 26,
      title: "Observable universe",
      value: "4.4 × 10²⁶ m",
      regime: "Cosmology — full GR",
      desc: "The Hubble radius. FLRW cosmology, dark matter, dark energy — general relativity applied at its largest tested scale."
    }
  ];

  // Pre/post bounds for the ruler axis
  const MIN_EXP = -36;
  const MAX_EXP = 28;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function nearestStop(exp) {
    let best = STOPS[0], bestD = Math.abs(exp - STOPS[0].exp);
    for (let i = 1; i < STOPS.length; i++) {
      const d = Math.abs(exp - STOPS[i].exp);
      if (d < bestD) { best = STOPS[i]; bestD = d; }
    }
    return best;
  }

  function formatExp(exp) {
    // Render as 10^n; only display the integer exponent for the live readout.
    return `10` + supDigits(Math.round(exp));
  }

  function supDigits(n) {
    const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(n).split("").map(c => map[c] || c).join("");
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    // Layout constants
    const W = 720, H = 200;
    const padL = 24, padR = 24;
    const axisY = 70;
    const axisLeft = padL, axisRight = W - padR;
    const axisW = axisRight - axisLeft;

    const expToX = (e) => axisLeft + ((e - MIN_EXP) / (MAX_EXP - MIN_EXP)) * axisW;
    const xToExp = (x) => MIN_EXP + ((x - axisLeft) / axisW) * (MAX_EXP - MIN_EXP);

    // Build SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Logarithmic ruler of length scales");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.touchAction = "none";

    // Axis line
    const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("x1", axisLeft);
    axis.setAttribute("y1", axisY);
    axis.setAttribute("x2", axisRight);
    axis.setAttribute("y2", axisY);
    axis.setAttribute("stroke", "#1f1c1a");
    axis.setAttribute("stroke-width", "1.4");
    svg.appendChild(axis);

    // Minor ticks every 2 in exponent
    for (let e = MIN_EXP; e <= MAX_EXP; e += 2) {
      const x = expToX(e);
      const t = document.createElementNS("http://www.w3.org/2000/svg", "line");
      t.setAttribute("x1", x); t.setAttribute("x2", x);
      t.setAttribute("y1", axisY - 4); t.setAttribute("y2", axisY + 4);
      t.setAttribute("stroke", "#d3cabd");
      t.setAttribute("stroke-width", "0.8");
      svg.appendChild(t);
    }

    // Major ticks every 5 in exponent + labels
    for (let e = -35; e <= 25; e += 5) {
      const x = expToX(e);
      const t = document.createElementNS("http://www.w3.org/2000/svg", "line");
      t.setAttribute("x1", x); t.setAttribute("x2", x);
      t.setAttribute("y1", axisY - 7); t.setAttribute("y2", axisY + 7);
      t.setAttribute("stroke", "#9a9389");
      t.setAttribute("stroke-width", "1");
      svg.appendChild(t);

      const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      lbl.setAttribute("x", x);
      lbl.setAttribute("y", axisY + 22);
      lbl.setAttribute("text-anchor", "middle");
      lbl.setAttribute("font-family", "Inter, sans-serif");
      lbl.setAttribute("font-size", "10");
      lbl.setAttribute("fill", "#9a9389");
      lbl.textContent = `10${supDigits(e)}`;
      svg.appendChild(lbl);
    }

    // Axis end caption
    const axisCap = document.createElementNS("http://www.w3.org/2000/svg", "text");
    axisCap.setAttribute("x", axisLeft);
    axisCap.setAttribute("y", axisY + 38);
    axisCap.setAttribute("font-family", "Inter, sans-serif");
    axisCap.setAttribute("font-size", "9");
    axisCap.setAttribute("fill", "#9a9389");
    axisCap.setAttribute("letter-spacing", "1.5");
    axisCap.textContent = "LENGTH SCALE (METRES)";
    svg.appendChild(axisCap);

    // Stop markers
    const stopGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    STOPS.forEach((s, i) => {
      const x = expToX(s.exp);

      const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
      tick.setAttribute("x1", x); tick.setAttribute("x2", x);
      tick.setAttribute("y1", axisY - 14); tick.setAttribute("y2", axisY - 2);
      tick.setAttribute("stroke", "#a83e2a");
      tick.setAttribute("stroke-width", "1.2");
      stopGroup.appendChild(tick);

      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", axisY - 16);
      dot.setAttribute("r", "2.5");
      dot.setAttribute("fill", "#a83e2a");
      dot.style.cursor = "pointer";
      dot.addEventListener("click", (ev) => { ev.stopPropagation(); setExp(s.exp); });
      stopGroup.appendChild(dot);
    });
    svg.appendChild(stopGroup);

    // Knob
    const knobLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    knobLine.setAttribute("y1", axisY - 28);
    knobLine.setAttribute("y2", axisY + 28);
    knobLine.setAttribute("stroke", "#1f1c1a");
    knobLine.setAttribute("stroke-width", "1");
    knobLine.setAttribute("stroke-dasharray", "2 2");
    svg.appendChild(knobLine);

    const knob = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    knob.setAttribute("r", "7");
    knob.setAttribute("fill", "#fbfaf7");
    knob.setAttribute("stroke", "#1f1c1a");
    knob.setAttribute("stroke-width", "1.6");
    knob.setAttribute("cy", axisY);
    knob.style.cursor = "grab";
    knob.setAttribute("tabindex", "0");
    knob.setAttribute("role", "slider");
    knob.setAttribute("aria-label", "Length scale (log10 metres)");
    knob.setAttribute("aria-valuemin", MIN_EXP);
    knob.setAttribute("aria-valuemax", MAX_EXP);
    svg.appendChild(knob);

    // Readout panel
    const panel = document.createElement("div");
    panel.style.marginTop = "0.9rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr auto";
    panel.style.gap = "0.4rem 1.5rem";
    panel.style.alignItems = "baseline";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";

    const titleEl = document.createElement("div");
    titleEl.style.fontFamily = "Source Serif 4, Georgia, serif";
    titleEl.style.fontSize = "1.1rem";
    titleEl.style.fontWeight = "600";
    titleEl.style.color = "#1f1c1a";
    titleEl.style.gridColumn = "1";

    const valueEl = document.createElement("div");
    valueEl.style.fontFamily = "Inter, sans-serif";
    valueEl.style.fontSize = "0.9rem";
    valueEl.style.color = "#a83e2a";
    valueEl.style.fontWeight = "500";
    valueEl.style.letterSpacing = "0.02em";
    valueEl.style.gridColumn = "2";
    valueEl.style.textAlign = "right";
    valueEl.style.whiteSpace = "nowrap";

    const regimeEl = document.createElement("div");
    regimeEl.style.fontFamily = "Inter, sans-serif";
    regimeEl.style.fontSize = "0.72rem";
    regimeEl.style.textTransform = "uppercase";
    regimeEl.style.letterSpacing = "0.12em";
    regimeEl.style.color = "#6f6a63";
    regimeEl.style.gridColumn = "1 / -1";
    regimeEl.style.fontWeight = "600";
    regimeEl.style.marginTop = "-0.15rem";

    const descEl = document.createElement("div");
    descEl.style.fontFamily = "Source Serif 4, Georgia, serif";
    descEl.style.fontSize = "0.96rem";
    descEl.style.lineHeight = "1.55";
    descEl.style.color = "#1f1c1a";
    descEl.style.gridColumn = "1 / -1";

    panel.appendChild(titleEl);
    panel.appendChild(valueEl);
    panel.appendChild(regimeEl);
    panel.appendChild(descEl);

    mount.appendChild(svg);
    mount.appendChild(panel);

    // State
    let currentExp = -35;

    function setExp(e) {
      currentExp = clamp(e, MIN_EXP, MAX_EXP);
      const x = expToX(currentExp);
      knob.setAttribute("cx", x);
      knobLine.setAttribute("x1", x);
      knobLine.setAttribute("x2", x);
      knob.setAttribute("aria-valuenow", currentExp.toFixed(1));
      const s = nearestStop(currentExp);
      titleEl.textContent = s.title;
      valueEl.textContent = s.value;
      regimeEl.textContent = s.regime;
      descEl.textContent = s.desc;
    }

    // Mouse / touch dragging
    let dragging = false;

    function pointFromEvent(ev) {
      const pt = svg.createSVGPoint();
      const touch = ev.touches && ev.touches[0];
      pt.x = (touch ? touch.clientX : ev.clientX);
      pt.y = (touch ? touch.clientY : ev.clientY);
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const local = pt.matrixTransform(ctm.inverse());
      return local;
    }

    function onDown(ev) {
      const p = pointFromEvent(ev);
      if (!p) return;
      dragging = true;
      knob.style.cursor = "grabbing";
      setExp(xToExp(p.x));
      ev.preventDefault();
    }
    function onMove(ev) {
      if (!dragging) return;
      const p = pointFromEvent(ev);
      if (!p) return;
      setExp(xToExp(p.x));
      ev.preventDefault();
    }
    function onUp() {
      dragging = false;
      knob.style.cursor = "grab";
    }

    svg.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    svg.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    // Keyboard
    knob.addEventListener("keydown", (ev) => {
      let delta = 0;
      switch (ev.key) {
        case "ArrowLeft": delta = -1; break;
        case "ArrowRight": delta = 1; break;
        case "ArrowDown": delta = -1; break;
        case "ArrowUp": delta = 1; break;
        case "PageDown": delta = -5; break;
        case "PageUp": delta = 5; break;
        case "Home": setExp(MIN_EXP + 1); ev.preventDefault(); return;
        case "End": setExp(MAX_EXP - 1); ev.preventDefault(); return;
        default: return;
      }
      setExp(currentExp + delta);
      ev.preventDefault();
    });

    // Init
    setExp(-35);
  }

  function start() {
    document.querySelectorAll("[data-widget='energy-scales']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
