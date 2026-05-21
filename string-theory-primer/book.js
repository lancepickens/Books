/* String Theory: A Primer — page bootstrap.
   Runs after KaTeX loads. */

(function () {
  function renderMath() {
    if (typeof renderMathInElement !== "function") {
      // auto-render not loaded yet; defer.
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
        "\\R": "\\mathbb{R}",
        "\\C": "\\mathbb{C}",
        "\\Z": "\\mathbb{Z}",
        "\\eps": "\\varepsilon",
        "\\dd": "\\mathrm{d}",
        "\\half": "\\tfrac{1}{2}",
      },
    });
    return true;
  }

  function init() {
    if (!renderMath()) {
      // try again shortly in case auto-render is still loading
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
