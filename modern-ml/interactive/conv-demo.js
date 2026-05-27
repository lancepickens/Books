/* Interactive · 2D convolution with picked kernels on procedural images.
   Renders input + kernel + output as grayscale heatmaps.
   Mounts into any [data-widget='conv-demo'] section. */

(function () {
  "use strict";

  const SIZE = 96;          // image resolution
  const CELL = 3;           // canvas pixels per image pixel
  const W = SIZE * CELL;    // = 288
  const PAD = 16;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  // Kernels (3×3)
  const KERNELS = {
    "identity":  [[0,0,0],[0,1,0],[0,0,0]],
    "blur 3×3":  [[1/9,1/9,1/9],[1/9,1/9,1/9],[1/9,1/9,1/9]],
    "sharpen":   [[0,-1,0],[-1,5,-1],[0,-1,0]],
    "sobel-x":   [[-1,0,1],[-2,0,2],[-1,0,1]],
    "sobel-y":   [[-1,-2,-1],[0,0,0],[1,2,1]],
    "laplacian": [[0,1,0],[1,-4,1],[0,1,0]],
  };

  // Procedural images
  function imgCheckerboard() {
    const im = new Float32Array(SIZE * SIZE);
    const sq = 12;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const a = Math.floor(x / sq), b = Math.floor(y / sq);
      im[y * SIZE + x] = ((a + b) % 2 === 0) ? 0.85 : 0.15;
    }
    return im;
  }
  function imgCircle() {
    const im = new Float32Array(SIZE * SIZE);
    const cx = SIZE / 2, cy = SIZE / 2, r = SIZE * 0.32;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      im[y * SIZE + x] = d < r ? 0.85 : 0.15;
    }
    // edge smoothing for visual fairness
    return smooth(im);
  }
  function imgStripes() {
    const im = new Float32Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const t = Math.sin(2 * Math.PI * (x + 0.7 * y) / 16);
      im[y * SIZE + x] = 0.5 + 0.45 * t;
    }
    return im;
  }
  function imgGradients() {
    const im = new Float32Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      // diagonal gradient + a square in the middle
      let v = 0.15 + 0.6 * (x + y) / (2 * SIZE);
      if (x > SIZE * 0.35 && x < SIZE * 0.65 && y > SIZE * 0.35 && y < SIZE * 0.65) v = 0.9;
      im[y * SIZE + x] = v;
    }
    return im;
  }
  function smooth(im) {
    const out = new Float32Array(im.length);
    for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        s += im[(y + dy) * SIZE + (x + dx)];
      }
      out[y * SIZE + x] = s / 9;
    }
    return out;
  }

  const IMAGES = {
    "checkerboard": imgCheckerboard,
    "circle":       imgCircle,
    "stripes":      imgStripes,
    "gradient + square": imgGradients,
  };

  document.querySelectorAll("[data-widget='conv-demo']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "1.2rem";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const imgWrap = controlGroup("image");
    const kerWrap = controlGroup("kernel");
    controls.appendChild(imgWrap);
    controls.appendChild(kerWrap);

    const imgKeys = Object.keys(IMAGES);
    const kerKeys = Object.keys(KERNELS);
    let curImg = imgKeys[2];
    let curKer = kerKeys[3];

    imgKeys.forEach(k => imgWrap.appendChild(makeOpt(k, () => { curImg = k; rerender(); }, () => curImg === k)));
    kerKeys.forEach(k => kerWrap.appendChild(makeOpt(k, () => { curKer = k; rerender(); }, () => curKer === k)));

    // Layout: input | kernel | output, with arrows
    const stage = document.createElement("div");
    stage.style.display = "flex";
    stage.style.gap = "0.7rem";
    stage.style.alignItems = "center";
    stage.style.flexWrap = "wrap";
    stage.style.justifyContent = "center";
    host.appendChild(stage);

    const inputBox = makeImageBox(W, W, "input");
    const arrow1 = arrow();
    const kernelBox = makeKernelBox();
    const arrow2 = arrow();
    const outBox = makeImageBox(W, W, "output");
    stage.appendChild(inputBox.el);
    stage.appendChild(arrow1);
    stage.appendChild(kernelBox.el);
    stage.appendChild(arrow2);
    stage.appendChild(outBox.el);

    const note = document.createElement("div");
    note.style.fontFamily = "Inter, sans-serif";
    note.style.fontSize = "0.8rem";
    note.style.color = "#5f6d72";
    note.style.textAlign = "center";
    note.innerHTML = `<strong>${SIZE}×${SIZE}</strong> input, 3×3 kernel, ${SIZE - 2}×${SIZE - 2} output (no padding). Output values are normalized to grayscale.`;
    host.appendChild(note);

    function rerender() {
      // update active state in controls
      [...imgWrap.children].forEach(c => c.dataset.active = (c.dataset.label === curImg ? "1" : "0"));
      [...kerWrap.children].forEach(c => c.dataset.active = (c.dataset.label === curKer ? "1" : "0"));
      [...imgWrap.children].forEach(restyleOpt);
      [...kerWrap.children].forEach(restyleOpt);

      const input = IMAGES[curImg]();
      const kernel = KERNELS[curKer];
      const output = conv2D(input, kernel);
      drawHeatmap(inputBox.ctx, input, SIZE, SIZE);
      drawKernel(kernelBox.svg, kernel);
      drawHeatmap(outBox.ctx, output, SIZE - 2, SIZE - 2, true);
    }

    rerender();
  }

  function controlGroup(label) {
    const g = document.createElement("div");
    g.style.display = "flex";
    g.style.flexDirection = "column";
    g.style.alignItems = "flex-start";
    g.style.gap = "0.3rem";
    const lab = document.createElement("div");
    lab.style.fontFamily = "Inter, sans-serif";
    lab.style.fontSize = "0.7rem";
    lab.style.textTransform = "uppercase";
    lab.style.letterSpacing = "0.1em";
    lab.style.color = FAINT;
    lab.textContent = label;
    g.appendChild(lab);
    const inner = document.createElement("div");
    inner.style.display = "flex";
    inner.style.gap = "0.3rem";
    inner.style.flexWrap = "wrap";
    g.appendChild(inner);
    // We attach options to inner — so caller can append via this proxy
    g.appendChild = inner.appendChild.bind(inner);
    g.children = inner.children;
    return g;
  }
  function makeOpt(label, onClick, isActive) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.label = label;
    b.dataset.active = isActive() ? "1" : "0";
    b.textContent = label;
    restyleOpt(b);
    b.addEventListener("click", onClick);
    return b;
  }
  function restyleOpt(b) {
    const active = b.dataset.active === "1";
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.74rem";
    b.style.padding = "0.25rem 0.6rem";
    b.style.border = "1px solid " + (active ? ACCENT : "#c8d3cd");
    b.style.background = active ? ACCENT : "#fff";
    b.style.color = active ? "#fff" : "#1c1f21";
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = active ? "600" : "500";
  }

  function arrow() {
    const s = document.createElement("div");
    s.textContent = "✱";
    s.style.fontFamily = "Inter, sans-serif";
    s.style.fontSize = "1.4rem";
    s.style.color = FAINT;
    return s;
  }

  function makeImageBox(w, h, label) {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.3rem";
    const cap = document.createElement("div");
    cap.style.fontFamily = "Inter, sans-serif";
    cap.style.fontSize = "0.7rem";
    cap.style.textTransform = "uppercase";
    cap.style.letterSpacing = "0.1em";
    cap.style.color = FAINT;
    cap.textContent = label;
    wrap.appendChild(cap);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.style.width = w + "px";
    canvas.style.maxWidth = "100%";
    canvas.style.background = "#ffffff";
    canvas.style.border = "1px solid " + RULE;
    canvas.style.borderRadius = "2px";
    canvas.style.imageRendering = "pixelated";
    wrap.appendChild(canvas);
    return { el: wrap, ctx: canvas.getContext("2d"), canvas };
  }

  function makeKernelBox() {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.3rem";
    const cap = document.createElement("div");
    cap.style.fontFamily = "Inter, sans-serif";
    cap.style.fontSize = "0.7rem";
    cap.style.textTransform = "uppercase";
    cap.style.letterSpacing = "0.1em";
    cap.style.color = FAINT;
    cap.textContent = "kernel";
    wrap.appendChild(cap);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const KW = 110, KH = 110;
    svg.setAttribute("viewBox", `0 0 ${KW} ${KH}`);
    svg.setAttribute("width", KW);
    svg.setAttribute("height", KH);
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    svg.style.background = "#fff";
    wrap.appendChild(svg);
    return { el: wrap, svg };
  }

  function conv2D(im, K) {
    const out = new Float32Array((SIZE - 2) * (SIZE - 2));
    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            s += K[dy + 1][dx + 1] * im[(y + dy) * SIZE + (x + dx)];
          }
        }
        out[(y - 1) * (SIZE - 2) + (x - 1)] = s;
      }
    }
    return out;
  }

  function drawHeatmap(ctx, arr, w, h, signed) {
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    const img = ctx.createImageData(canvasW, canvasH);
    const buf = img.data;
    // determine min/max
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < arr.length; i++) { if (arr[i] < mn) mn = arr[i]; if (arr[i] > mx) mx = arr[i]; }
    const cellW = canvasW / w, cellH = canvasH / h;
    for (let cy = 0; cy < h; cy++) {
      for (let cx = 0; cx < w; cx++) {
        const v = arr[cy * w + cx];
        let r, g, b;
        if (signed) {
          // diverging colormap centered at 0; positive=accent, negative=sand
          const peak = Math.max(Math.abs(mn), Math.abs(mx), 1e-6);
          const t = v / peak; // ∈ [-1, 1]
          if (t >= 0) {
            const a = t;
            r = Math.round(255 * (1 - a) + 47 * a);
            g = Math.round(255 * (1 - a) + 107 * a);
            b = Math.round(255 * (1 - a) + 74 * a);
          } else {
            const a = -t;
            r = Math.round(255 * (1 - a) + 184 * a);
            g = Math.round(255 * (1 - a) + 101 * a);
            b = Math.round(255 * (1 - a) + 26 * a);
          }
        } else {
          const t = (mx > mn) ? (v - mn) / (mx - mn) : 0.5;
          const gray = Math.round(255 * (1 - t * 0.85));
          r = g = b = gray;
        }
        // paint the cell
        const x0 = Math.floor(cx * cellW), x1 = Math.floor((cx + 1) * cellW);
        const y0 = Math.floor(cy * cellH), y1 = Math.floor((cy + 1) * cellH);
        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const idx = (py * canvasW + px) * 4;
            buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function drawKernel(svg, K) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ns = "http://www.w3.org/2000/svg";
    const KW = 110, cell = KW / 3;
    let mx = 0;
    for (const row of K) for (const v of row) mx = Math.max(mx, Math.abs(v));
    if (mx === 0) mx = 1;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const v = K[i][j];
        const t = v / mx;
        let fill;
        if (t >= 0) {
          const a = t;
          fill = `rgb(${Math.round(255 * (1 - a) + 47 * a)},${Math.round(255 * (1 - a) + 107 * a)},${Math.round(255 * (1 - a) + 74 * a)})`;
        } else {
          const a = -t;
          fill = `rgb(${Math.round(255 * (1 - a) + 184 * a)},${Math.round(255 * (1 - a) + 101 * a)},${Math.round(255 * (1 - a) + 26 * a)})`;
        }
        const r = svg.appendChild(document.createElementNS(ns, "rect"));
        r.setAttribute("x", j * cell + 1);
        r.setAttribute("y", i * cell + 1);
        r.setAttribute("width", cell - 2);
        r.setAttribute("height", cell - 2);
        r.setAttribute("fill", fill);
        r.setAttribute("stroke", "#dfe6e2");
        r.setAttribute("stroke-width", "0.5");
        const t2 = svg.appendChild(document.createElementNS(ns, "text"));
        t2.setAttribute("x", j * cell + cell / 2);
        t2.setAttribute("y", i * cell + cell / 2 + 4);
        t2.setAttribute("text-anchor", "middle");
        t2.setAttribute("font-family", "Inter, sans-serif");
        t2.setAttribute("font-size", "10");
        t2.setAttribute("fill", Math.abs(t) > 0.5 ? "#fff" : "#1c1f21");
        const fmt = (Math.abs(v) < 0.99 && v !== 0) ? v.toFixed(2) : v.toString();
        t2.textContent = fmt;
      }
    }
  }
})();
