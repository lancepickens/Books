/* Acids and Bases — page bootstrap. Runs after KaTeX loads.

   Macro discipline (see CLAUDE.md / new-book skill):
   - Use ONLY the macros defined below. Any other \name renders as SILENT raw
     text under throwOnError:false. The strict harness catches violations.
   - Never shadow KaTeX built-ins. In particular we do NOT define \H (a built-in
     accent); the hydrogen ion is \Hp. Chemical species are spelled with
     \mathrm{...}; reaction arrows use the built-in \rightleftharpoons via \eqm. */

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
      macros: {
        "\\Ka": "K_{\\mathrm{a}}",
        "\\Kb": "K_{\\mathrm{b}}",
        "\\Kw": "K_{\\mathrm{w}}",
        "\\Ksp": "K_{\\mathrm{sp}}",
        "\\Kf": "K_{\\mathrm{f}}",
        "\\pKa": "\\mathrm{p}K_{\\mathrm{a}}",
        "\\pKb": "\\mathrm{p}K_{\\mathrm{b}}",
        "\\pKw": "\\mathrm{p}K_{\\mathrm{w}}",
        "\\pH": "\\mathrm{pH}",
        "\\pOH": "\\mathrm{pOH}",
        "\\Hp": "\\mathrm{H^{+}}",
        "\\Hthree": "\\mathrm{H_3O^{+}}",
        "\\OHm": "\\mathrm{OH^{-}}",
        "\\conc": "[\\mathrm{#1}]",
        "\\eqm": "\\rightleftharpoons",
        "\\Msol": "\\,\\mathrm{M}",
        "\\dd": "\\mathrm{d}",
        "\\half": "\\tfrac{1}{2}",
        "\\degC": "^{\\circ}\\mathrm{C}",
        "\\Hzero": "H_{0}",
        "\\HR": "H_{\\mathrm{R}}",
        "\\sub": "\\sigma",
        "\\rxn": "\\rho",
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
