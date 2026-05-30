/* Meteorology: The Atmosphere in Motion — page bootstrap.
   Runs after KaTeX loads. */

(function () {
  function renderMath() {
    if (typeof renderMathInElement !== "function") {
      return false;
    }
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
      strict: "ignore",
      trust: false,
      // NOTE for authors: use ONLY the macros below. Any other \name renders
      // as silent raw text under throwOnError:false. Do NOT shadow KaTeX
      // built-ins (\theta, \P, \E, \k, \deg). Potential temperature uses the
      // built-in \theta directly.
      macros: {
        "\\R": "\\mathbb{R}",
        "\\Ex": "\\mathbb{E}",
        "\\half": "\\tfrac{1}{2}",
        "\\dd": "\\mathrm{d}",
        "\\pd": "\\partial",
        "\\grad": "\\nabla",
        "\\Dt": "\\frac{D}{Dt}",
        "\\DDt": "\\frac{D #1}{D t}",
        "\\vu": "\\mathbf{u}",
        "\\vv": "\\mathbf{v}",
        "\\vV": "\\mathbf{V}",
        "\\vU": "\\mathbf{U}",
        "\\vk": "\\mathbf{k}",
        "\\vr": "\\mathbf{r}",
        "\\vx": "\\mathbf{x}",
        "\\vF": "\\mathbf{F}",
        "\\vg": "\\mathbf{g}",
        "\\vQ": "\\mathbf{Q}",
        "\\vOmega": "\\boldsymbol{\\Omega}",
        "\\vnabla": "\\boldsymbol{\\nabla}",
        "\\Rd": "R_d",
        "\\Rv": "R_v",
        "\\cp": "c_p",
        "\\cv": "c_v",
        "\\Lv": "L_v",
        "\\Ro": "\\mathrm{Ro}",
        "\\CAPE": "\\mathrm{CAPE}",
        "\\CIN": "\\mathrm{CIN}",
        "\\degC": "^{\\circ}\\mathrm{C}",
        "\\unit": "\\,\\mathrm{#1}",
        "\\abs": "\\left| #1 \\right|",
        "\\norm": "\\left\\lVert #1 \\right\\rVert",
        "\\inner": "\\left\\langle #1, #2 \\right\\rangle",
      },
    });
    return true;
  }

  function init() {
    if (!renderMath()) {
      const t = setInterval(() => {
        if (renderMath()) clearInterval(t);
      }, 50);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
