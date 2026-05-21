/* Computational Chemistry: A Primer — page bootstrap.
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
      macros: {
        "\\R": "\\mathbb{R}",
        "\\C": "\\mathbb{C}",
        "\\Z": "\\mathbb{Z}",
        "\\eps": "\\varepsilon",
        "\\dd": "\\mathrm{d}",
        "\\half": "\\tfrac{1}{2}",
        "\\bra": "\\left\\langle #1 \\right|",
        "\\ket": "\\left| #1 \\right\\rangle",
        "\\braket": "\\left\\langle #1 \\middle| #2 \\right\\rangle",
        "\\matrixel": "\\left\\langle #1 \\middle| #2 \\middle| #3 \\right\\rangle",
        "\\op": "\\hat{#1}",
        "\\vr": "\\mathbf{r}",
        "\\vR": "\\mathbf{R}",
        "\\vk": "\\mathbf{k}",
        "\\vq": "\\mathbf{q}",
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
