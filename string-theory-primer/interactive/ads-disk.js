/* Interactive · Poincaré disk model of hyperbolic space (AdS_2 spatial slice).
   Two draggable points; we draw the geodesic between them as a circular arc
   perpendicular to the disk boundary, and project them out to boundary points. */

(function () {
  "use strict";

  const W = 520, H = 520;
  const CX = W / 2, CY = H / 2;
  const R = 220;  // disk radius in SVG units

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Convert disk-local (dx, dy) in [-1, 1] disk units, |·| < 1, to SVG coords
  function diskToPx(dx, dy) {
    return { x: CX + dx * R, y: CY + dy * R };
  }
  function pxToDisk(px, py) {
    return { dx: (px - CX) / R, dy: (py - CY) / R };
  }

  // Hyperbolic distance between two points in disk (Euclidean coords with |z| < 1):
  //   d_H(p, q) = arcosh(1 + 2|p − q|² / [(1 − |p|²)(1 − |q|²)])
  function hypDistance(p, q) {
    const dx = p.dx - q.dx, dy = p.dy - q.dy;
    const d2 = dx * dx + dy * dy;
    const p2 = p.dx * p.dx + p.dy * p.dy;
    const q2 = q.dx * q.dx + q.dy * q.dy;
    return Math.acosh(1 + 2 * d2 / ((1 - p2) * (1 - q2)));
  }

  // Construct the geodesic arc through two interior points of the unit disk.
  // The geodesic is either a diameter (if the two points and the origin are colinear)
  // or a circular arc perpendicular to the unit circle.
  // Given p and q with |p|, |q| < 1, the inverse points p* = p / |p|² (under unit-circle
  // inversion) lie outside the disk. The orthogonal circle passes through p, q, and p*.
  // Equivalently, its center lies on the perpendicular bisector of (p, p*).
  function geodesic(p, q) {
    // Check if p, q, origin are colinear → straight line
    const cross = p.dx * q.dy - p.dy * q.dx;
    if (Math.abs(cross) < 1e-6) {
      return { type: "line", p, q };
    }
    // Inversion of p across unit circle: p* = p / |p|²
    const p2 = p.dx * p.dx + p.dy * p.dy;
    if (p2 < 1e-8) return { type: "line", p, q };
    const pStar = { dx: p.dx / p2, dy: p.dy / p2 };
    // Find the circle through p, q, pStar
    return { type: "arc", center: circleThru3(p, q, pStar) };
  }

  function circleThru3(p, q, r) {
    // Given three points, return center and radius of the circle through them.
    const ax = p.dx, ay = p.dy, bx = q.dx, by = q.dy, cx = r.dx, cy = r.dy;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-12) return null;
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const dx = ax - ux, dy = ay - uy;
    const rr = Math.sqrt(dx * dx + dy * dy);
    return { cx: ux, cy: uy, r: rr };
  }

  // Find the two intersection points of an arc/line with the unit circle (the boundary)
  function lineBoundary(p, q) {
    // Line through p and q in Euclidean disk; intersect with x² + y² = 1
    const dx = q.dx - p.dx, dy = q.dy - p.dy;
    // parametrize as p + t * (dx, dy); solve |p + t d|² = 1
    const a = dx * dx + dy * dy;
    const b = 2 * (p.dx * dx + p.dy * dy);
    const c = p.dx * p.dx + p.dy * p.dy - 1;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t1 = (-b - Math.sqrt(disc)) / (2 * a);
    const t2 = (-b + Math.sqrt(disc)) / (2 * a);
    return [
      { dx: p.dx + t1 * dx, dy: p.dy + t1 * dy },
      { dx: p.dx + t2 * dx, dy: p.dy + t2 * dy }
    ];
  }

  function arcBoundary(center) {
    // Geodesic arc is part of the circle at center with some radius; the two endpoints
    // on the boundary are the intersections of that circle with the unit circle.
    // The two circles intersect at points perpendicular to the line connecting their centers.
    const { cx, cy, r } = center;
    const D = Math.sqrt(cx * cx + cy * cy);  // distance from origin
    if (D < 1e-9) return null;
    // intersection points form an isoceles configuration:
    //   distance from each circle center to chord midpoint:
    //     a = (D² + r² − 1²) / (2D)
    //     h² = r² − a²
    const a = (D * D + r * r - 1) / (2 * D);
    const h2 = r * r - a * a;
    if (h2 < 0) return null;
    const h = Math.sqrt(h2);
    // midpoint of chord, along the line from disk origin to center
    const mx = (cx / D) * (D - a);  // careful: chord midpoint is at a along the line from center
    const my = (cy / D) * (D - a);
    // perpendicular direction
    const px = -cy / D, py = cx / D;
    return [
      { dx: mx + h * px, dy: my + h * py },
      { dx: mx - h * px, dy: my - h * py }
    ];
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let p = { dx: -0.45, dy: 0.2 };
    let q = { dx: 0.5, dy: -0.3 };

    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Poincare disk"
    });
    svg.style.width = "100%";
    svg.style.maxWidth = "520px";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.margin = "0 auto";
    svg.style.touchAction = "none";
    svg.style.userSelect = "none";

    // Boundary disk
    svg.appendChild(makeSvgEl("circle", {
      cx: CX, cy: CY, r: R,
      fill: "#fbfaf7", stroke: "#1f1c1a", "stroke-width": 2
    }));

    // Boundary label
    const blbl = makeSvgEl("text", {
      x: CX, y: CY - R - 10, "text-anchor": "middle",
      "font-family": "Inter, sans-serif", "font-size": "11",
      fill: "#a83e2a", "font-weight": "600", "letter-spacing": "1.5"
    });
    blbl.textContent = "BOUNDARY · DUAL CFT$_1$ LIVES HERE";
    svg.appendChild(blbl);

    // Tessellation hint: a few faint reference geodesics
    function refArc(a, b) {
      const g = geodesic(a, b);
      if (g.type === "line") {
        return makeSvgEl("line", {
          x1: diskToPx(a.dx, a.dy).x, y1: diskToPx(a.dx, a.dy).y,
          x2: diskToPx(b.dx, b.dy).x, y2: diskToPx(b.dx, b.dy).y,
          stroke: "#d3cabd", "stroke-width": 1, "stroke-dasharray": "3 3"
        });
      } else {
        const c = g.center;
        const center = diskToPx(c.cx, c.cy);
        return makeSvgEl("circle", {
          cx: center.x, cy: center.y, r: c.r * R,
          fill: "none", stroke: "#e7e1d6", "stroke-width": 1, "stroke-dasharray": "3 3"
        });
      }
    }

    // Reference geodesics: arcs from one diametric boundary point to another along several axes
    const refRefs = makeSvgEl("g");
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * 2 * Math.PI;
      const r1 = { dx: 0.6 * Math.cos(ang), dy: 0.6 * Math.sin(ang) };
      const r2 = { dx: -0.6 * Math.cos(ang + 0.6), dy: -0.6 * Math.sin(ang + 0.6) };
      refRefs.appendChild(refArc(r1, r2));
    }
    refRefs.setAttribute("clip-path", "url(#disk-clip)");
    // We need a clip path so the reference circles are clipped to the disk
    const defs = makeSvgEl("defs");
    const cp = makeSvgEl("clipPath", { id: "disk-clip" });
    cp.appendChild(makeSvgEl("circle", { cx: CX, cy: CY, r: R - 0.5 }));
    defs.appendChild(cp);
    svg.appendChild(defs);
    svg.appendChild(refRefs);

    // Main geodesic between p and q (will be updated)
    const mainArc = makeSvgEl("path", {
      fill: "none", stroke: "#a83e2a", "stroke-width": 2.6,
      "clip-path": "url(#disk-clip)"
    });
    svg.appendChild(mainArc);

    // Boundary endpoints
    const bdyP = makeSvgEl("circle", { r: 5, fill: "#a83e2a", stroke: "#fbfaf7", "stroke-width": 1.6 });
    const bdyQ = makeSvgEl("circle", { r: 5, fill: "#a83e2a", stroke: "#fbfaf7", "stroke-width": 1.6 });
    svg.appendChild(bdyP); svg.appendChild(bdyQ);

    // Boundary endpoint labels
    const bdyPL = makeSvgEl("text", { "font-family": "Source Serif 4, Georgia, serif", "font-size": "14", "font-weight": "600", fill: "#a83e2a" });
    bdyPL.textContent = "x₁";
    const bdyQL = makeSvgEl("text", { "font-family": "Source Serif 4, Georgia, serif", "font-size": "14", "font-weight": "600", fill: "#a83e2a" });
    bdyQL.textContent = "x₂";
    svg.appendChild(bdyPL); svg.appendChild(bdyQL);

    // Bulk handles
    const handleP = makeSvgEl("circle", { r: 9, fill: "#1e5b8a", stroke: "#fbfaf7", "stroke-width": 2 });
    const handleQ = makeSvgEl("circle", { r: 9, fill: "#1e5b8a", stroke: "#fbfaf7", "stroke-width": 2 });
    handleP.style.cursor = "grab";
    handleQ.style.cursor = "grab";
    handleP.setAttribute("tabindex", "0"); handleQ.setAttribute("tabindex", "0");
    handleP.setAttribute("role", "slider"); handleQ.setAttribute("role", "slider");
    handleP.setAttribute("aria-label", "Bulk point 1");
    handleQ.setAttribute("aria-label", "Bulk point 2");
    svg.appendChild(handleP); svg.appendChild(handleQ);

    const labelP = makeSvgEl("text", { "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1e5b8a" });
    labelP.textContent = "P";
    const labelQ = makeSvgEl("text", { "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1e5b8a" });
    labelQ.textContent = "Q";
    svg.appendChild(labelP); svg.appendChild(labelQ);

    mount.appendChild(svg);

    // Readout
    const panel = document.createElement("div");
    panel.style.marginTop = "0.85rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr 1fr";
    panel.style.gap = "0.5rem 1.5rem";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";

    function mkStat(text, color) {
      const w = document.createElement("div");
      const lbl = document.createElement("div");
      lbl.style.cssText = "font-family: Inter, sans-serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: " + color + "; font-weight: 700; margin-bottom: 0.15rem";
      lbl.textContent = text;
      const val = document.createElement("div");
      val.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 1.3rem; font-weight: 600; color: #1f1c1a";
      w.appendChild(lbl); w.appendChild(val);
      return { wrap: w, val };
    }

    const distStat = mkStat("Hyperbolic geodesic length", "#a83e2a");
    const interpStat = mkStat("Geometric reading", "#6f6a63");
    interpStat.val.style.fontSize = "0.95rem";
    interpStat.val.style.fontStyle = "italic";

    panel.appendChild(distStat.wrap); panel.appendChild(interpStat.wrap);
    mount.appendChild(panel);

    function redraw() {
      const pp = diskToPx(p.dx, p.dy);
      const qp = diskToPx(q.dx, q.dy);
      handleP.setAttribute("cx", pp.x); handleP.setAttribute("cy", pp.y);
      handleQ.setAttribute("cx", qp.x); handleQ.setAttribute("cy", qp.y);
      labelP.setAttribute("x", pp.x + 11); labelP.setAttribute("y", pp.y - 8);
      labelQ.setAttribute("x", qp.x + 11); labelQ.setAttribute("y", qp.y - 8);

      // Compute geodesic
      const g = geodesic(p, q);
      let bdyPoints;
      let d = "";
      if (g.type === "line") {
        const pts = lineBoundary(p, q);
        if (pts) {
          bdyPoints = pts;
          const a = diskToPx(pts[0].dx, pts[0].dy);
          const b = diskToPx(pts[1].dx, pts[1].dy);
          d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
        }
      } else {
        const c = g.center;
        const pts = arcBoundary(c);
        if (pts) {
          bdyPoints = pts;
          // draw arc from pts[0] to pts[1] passing through p, q
          const a = diskToPx(pts[0].dx, pts[0].dy);
          const b = diskToPx(pts[1].dx, pts[1].dy);
          const rPx = c.r * R;
          // we need the major-or-minor arc that actually passes through p and q.
          // Compute angles of a, b, and a sample (e.g., p) from the arc center:
          const cpx = diskToPx(c.cx, c.cy);
          const angA = Math.atan2(a.y - cpx.y, a.x - cpx.x);
          const angB = Math.atan2(b.y - cpx.y, b.x - cpx.x);
          const angP = Math.atan2(pp.y - cpx.y, pp.x - cpx.x);
          // Determine sweep direction and largeArc to include p
          // SVG: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
          // Try both options and pick the one where p lies between
          const diff = (angB - angA + 2 * Math.PI) % (2 * Math.PI);
          const sweepFlag = (((angP - angA + 2 * Math.PI) % (2 * Math.PI)) < diff) ? 1 : 0;
          const largeArcFlag = (diff > Math.PI) ? 1 : 0;
          // Actually for an arc going one way that includes p, we want to pick the smaller arc
          // (geodesic in Poincaré is the shorter circular arc through the two boundary points
          // when one stays inside the disk).
          // The geodesic arc is always the one *inside* the disk; we'll mark sweepFlag heuristically:
          d = `M ${a.x} ${a.y} A ${rPx} ${rPx} 0 0 ${sweepFlag} ${b.x} ${b.y}`;
        }
      }
      mainArc.setAttribute("d", d);

      if (bdyPoints) {
        const a = diskToPx(bdyPoints[0].dx, bdyPoints[0].dy);
        const b = diskToPx(bdyPoints[1].dx, bdyPoints[1].dy);
        bdyP.setAttribute("cx", a.x); bdyP.setAttribute("cy", a.y);
        bdyQ.setAttribute("cx", b.x); bdyQ.setAttribute("cy", b.y);
        bdyPL.setAttribute("x", a.x + (a.x > CX ? 10 : -22));
        bdyPL.setAttribute("y", a.y + 5);
        bdyQL.setAttribute("x", b.x + (b.x > CX ? 10 : -22));
        bdyQL.setAttribute("y", b.y + 5);
      }

      const d_h = hypDistance(p, q);
      distStat.val.textContent = isFinite(d_h) ? d_h.toFixed(3) : "—";
      if (d_h < 1) interpStat.val.textContent = "short — points are nearby in hyperbolic metric";
      else if (d_h < 3) interpStat.val.textContent = "moderate — entanglement entropy ∝ this length";
      else interpStat.val.textContent = "large — boundary points x₁ and x₂ are well-separated";
    }

    // Drag
    let dragging = null;
    function pointFromEvent(ev) {
      const pt = svg.createSVGPoint();
      const touch = ev.touches && ev.touches[0];
      pt.x = touch ? touch.clientX : ev.clientX;
      pt.y = touch ? touch.clientY : ev.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return pt.matrixTransform(ctm.inverse());
    }
    function setDragHandlers(handle, which) {
      handle.addEventListener("mousedown", (ev) => { dragging = which; handle.style.cursor = "grabbing"; ev.preventDefault(); });
      handle.addEventListener("touchstart", (ev) => { dragging = which; ev.preventDefault(); }, { passive: false });
      handle.addEventListener("keydown", (ev) => {
        const step = 0.05;
        const target = which === "p" ? p : q;
        switch (ev.key) {
          case "ArrowLeft": target.dx -= step; break;
          case "ArrowRight": target.dx += step; break;
          case "ArrowUp": target.dy -= step; break;
          case "ArrowDown": target.dy += step; break;
          default: return;
        }
        clampInside(target);
        redraw();
        ev.preventDefault();
      });
    }
    function clampInside(pt) {
      const r2 = pt.dx * pt.dx + pt.dy * pt.dy;
      const maxR = 0.93;
      if (r2 > maxR * maxR) {
        const r = Math.sqrt(r2);
        pt.dx *= maxR / r;
        pt.dy *= maxR / r;
      }
    }
    setDragHandlers(handleP, "p");
    setDragHandlers(handleQ, "q");
    window.addEventListener("mousemove", (ev) => {
      if (!dragging) return;
      const pt = pointFromEvent(ev); if (!pt) return;
      const d = pxToDisk(pt.x, pt.y);
      const target = dragging === "p" ? p : q;
      target.dx = d.dx; target.dy = d.dy;
      clampInside(target);
      redraw();
    });
    window.addEventListener("touchmove", (ev) => {
      if (!dragging) return;
      const pt = pointFromEvent(ev); if (!pt) return;
      const d = pxToDisk(pt.x, pt.y);
      const target = dragging === "p" ? p : q;
      target.dx = d.dx; target.dy = d.dy;
      clampInside(target);
      redraw();
      ev.preventDefault();
    }, { passive: false });
    window.addEventListener("mouseup", () => {
      if (dragging) {
        (dragging === "p" ? handleP : handleQ).style.cursor = "grab";
        dragging = null;
      }
    });
    window.addEventListener("touchend", () => { dragging = null; });

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='ads-disk']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
