/* Low-Energy Nuclear Reactions — page bootstrap. Runs after KaTeX loads.
   Macros for THIS book only. Rules:
   - Define every macro you intend to use; an undefined \name renders as SILENT
     raw text under throwOnError:false. The strict harness catches violations.
   - Never shadow KaTeX built-ins (\theta, \P, \E, \k, \deg, \div, ...).
     \eta (Sommerfeld parameter), \sigma (cross section), \Gamma are built-ins
     used directly. Nuclides are written {}^{A}\mathrm{X} via the \nuc macro.
   - Keep delimiters / throwOnError / strict / trust as-is. */

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
      // built-ins (\theta, \eta, \sigma, \P, \E, \k, \deg).
      macros: {
        "\\dd": "\\mathrm{d}",
        "\\half": "\\tfrac{1}{2}",
        "\\unit": "\\,\\mathrm{#1}",
        "\\abs": "\\left| #1 \\right|",
        "\\eV": "\\,\\mathrm{eV}",
        "\\keV": "\\,\\mathrm{keV}",
        "\\MeV": "\\,\\mathrm{MeV}",
        "\\Ue": "U_e",
        "\\EG": "E_G",
        "\\nuc": "{}^{#1}\\mathrm{#2}",
        "\\Pd": "\\mathrm{Pd}",
        "\\Dtwo": "\\mathrm{D}_2",
        "\\DPd": "x_{\\mathrm{D/Pd}}",
        "\\Pxs": "P_{\\mathrm{xs}}",
        "\\Sfac": "S(E)",
        "\\barns": "\\,\\mathrm{b}",
        "\\lam": "\\lambda_{\\mathrm{fus}}",
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
