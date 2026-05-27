/* A Modern Introduction to Machine Learning — page bootstrap.
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
        "\\Ex": "\\mathbb{E}",
        "\\Prob": "\\mathbb{P}",
        "\\NN": "\\mathbb{N}",
        "\\ZZ": "\\mathbb{Z}",
        "\\ind": "\\mathbb{1}",
        "\\eps": "\\varepsilon",
        "\\dd": "\\mathrm{d}",
        "\\half": "\\tfrac{1}{2}",
        "\\loss": "\\mathcal{L}",
        "\\data": "\\mathcal{D}",
        "\\hyp": "\\mathcal{H}",
        "\\KL": "\\mathrm{KL}",
        "\\softmax": "\\operatorname{softmax}",
        "\\argmin": "\\operatorname*{arg\\,min}",
        "\\argmax": "\\operatorname*{arg\\,max}",
        "\\norm": "\\left\\lVert #1 \\right\\rVert",
        "\\abs": "\\left| #1 \\right|",
        "\\inner": "\\left\\langle #1, #2 \\right\\rangle",
        "\\vx": "\\mathbf{x}",
        "\\vy": "\\mathbf{y}",
        "\\vw": "\\mathbf{w}",
        "\\vh": "\\mathbf{h}",
        "\\vz": "\\mathbf{z}",
        "\\vq": "\\mathbf{q}",
        "\\vk": "\\mathbf{k}",
        "\\vv": "\\mathbf{v}",
        "\\vtheta": "\\boldsymbol{\\theta}",
        "\\mW": "\\mathbf{W}",
        "\\mX": "\\mathbf{X}",
        "\\mA": "\\mathbf{A}",
        "\\mK": "\\mathbf{K}",
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
