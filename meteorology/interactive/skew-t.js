/* Interactive · A working Skew-T log-p diagram.
   Plots a synthetic-but-realistic environmental temperature and dewpoint sounding,
   lifts a surface parcel dry-adiabatically to the LCL and then along the moist
   adiabat Gamma_s, marks LCL / LFC / EL, shades CAPE (parcel warmer) and CIN
   (parcel cooler), and reports CAPE & CIN in J/kg.

   All on-screen numbers come from the chapter's own equations:
     - first law / Poisson:      theta = T (p0/p)^kappa  (dry ascent)
     - Clausius-Clapeyron:       e_s(T) = e_s0 exp[(Lv/Rv)(1/T0 - 1/T)]
     - saturation mixing ratio:  w_s = eps e_s / (p - e_s)
     - saturated lapse rate:     Gamma_s = Gamma_d (1 + Lv w_s/(Rd T))
                                                  / (1 + Lv^2 w_s eps/(cp Rd T^2))
     - CAPE = Rd * integral (Tv,parcel - Tv,env) d(ln p)   over positive area
     - CIN  = same integral over the negative area below the LFC

   Mounts into any [data-widget='skew-t'] section. Vanilla JS, no libraries. */

(function () {
  "use strict";

  // ── Palette ───────────────────────────────────────────
  var ACCENT = "#2b5c8a";
  var ACCENT_DEEP = "#173a5a";
  var WARM = "#b8651a";
  var GOLD = "#c08a2d";
  var FAINT = "#8e9a9e";
  var RULE = "#dde3ea";
  var INK = "#1c1f21";
  var MUTED = "#5f6d72";
  var CARD = "#ffffff";

  // ── Physical constants (chapter conventions, SI) ──────
  var G = 9.81;        // m s^-2
  var RD = 287;        // J kg^-1 K^-1
  var RV = 461;        // J kg^-1 K^-1
  var CP = 1004;       // J kg^-1 K^-1
  var LV = 2.5e6;      // J kg^-1
  var EPS = RD / RV;   // ~0.622
  var KAPPA = RD / CP; // ~0.286
  var GAMMA_D = G / CP;// K m^-1  (dry adiabatic lapse rate)
  var P0 = 1000;       // hPa  (reference pressure)
  var ES0 = 6.11;      // hPa  at T0
  var T0K = 273.15;    // K

  // ── Plot geometry ─────────────────────────────────────
  var W = 560, H = 440;
  var M = { l: 46, r: 16, t: 16, b: 34 };
  var PW = W - M.l - M.r, PH = H - M.t - M.b;

  // Skew-T axis ranges
  var P_TOP = 150, P_BOT = 1000;     // hPa, plotted range
  var T_LEFT = -40, T_RIGHT = 40;    // degC, isotherm range at p = P_BOT
  var SKEW = 38;                     // degC of skew per decade of ln(p) (~45 deg visually)

  // ── Saturation physics ───────────────────────────────
  function esat(Tk) {                       // Clausius-Clapeyron, hPa
    return ES0 * Math.exp((LV / RV) * (1 / T0K - 1 / Tk));
  }
  function wsat(Tk, p) {                     // saturation mixing ratio (kg/kg)
    var es = esat(Tk);
    if (es >= p) return 10;                  // guard: clamp near total saturation
    return EPS * es / (p - es);
  }
  function gammaS(Tk, p) {                    // saturated lapse rate, K/m
    var ws = wsat(Tk, p);
    var num = 1 + (LV * ws) / (RD * Tk);
    var den = 1 + (LV * LV * ws * EPS) / (CP * RD * Tk * Tk);
    return GAMMA_D * num / den;
  }
  function Tvirt(Tk, w) { return Tk * (1 + 0.61 * w); }

  // Hydrostatic height increment for a small pressure step (mean-layer).
  function dz(p, dpHpa, Tk) {
    // dz = -Rd T / (g p) dp ; p in hPa cancels in the ratio dp/p
    return -(RD * Tk) / (G * p) * dpHpa;
  }

  // ── Coordinate transforms (skew-T log-p) ──────────────
  var lnTop = Math.log(P_TOP), lnBot = Math.log(P_BOT);
  function yOf(p) {                           // pressure -> pixel y
    var f = (Math.log(p) - lnBot) / (lnTop - lnBot);
    return M.t + (1 - f) * PH;                // P_BOT at bottom, P_TOP at top
  }
  function xOf(Tc, p) {                        // temperature(degC) at p -> pixel x
    var skew = SKEW * (Math.log(P_BOT) - Math.log(p)) / Math.LN10;
    var f = (Tc - T_LEFT + skew) / (T_RIGHT - T_LEFT);
    return M.l + f * PW;
  }

  // ── Parametric environmental sounding ─────────────────
  // Returns environment T and Td (degC) at pressure p (hPa), shaped by the two
  // surface sliders. Realistic: a near-dry-adiabatic mixed layer, a conditionally
  // unstable mid-troposphere, a tropopause near 200 hПa, and a drying aloft.
  function environment(p, Tsfc, Tdsfc) {
    // Height above surface via standard-atmosphere-ish mapping (km).
    var zkm = 44.3 * (1 - Math.pow(p / 1013.25, 0.190));
    // Environmental temperature: piecewise lapse with a low-level cap.
    var Tc;
    if (zkm < 1.0) {
      Tc = Tsfc - 8.5 * zkm;                  // mixed layer, near dry adiabatic
    } else if (zkm < 1.6) {
      Tc = (Tsfc - 8.5) - 2.0 * (zkm - 1.0);  // weak cap / inhibition layer
    } else if (zkm < 11.5) {
      Tc = (Tsfc - 8.5 - 1.2) - 6.6 * (zkm - 1.6); // conditionally unstable troposphere
    } else {
      Tc = (Tsfc - 8.5 - 1.2 - 65.34) + 1.0 * (zkm - 11.5); // stratosphere, warms up
    }
    // Dewpoint: moist near surface, drying upward; depression grows with height.
    var depr = (Tsfc - Tdsfc) + 2.2 * zkm;
    var Tdc = Tc - depr;
    if (Tdc > Tc) Tdc = Tc;
    return { T: Tc, Td: Tdc, z: zkm };
  }

  // ── Lift a surface parcel; compute LCL, LFC, EL, CAPE, CIN ──
  function liftParcel(Tsfc, Tdsfc) {
    var Tk0 = Tsfc + 273.15;
    var Td0 = Tdsfc + 273.15;
    // Surface mixing ratio (conserved on dry ascent): saturation at the dewpoint.
    var w0 = wsat(Td0, P_BOT);
    var theta0 = Tk0 * Math.pow(P0 / P_BOT, KAPPA);

    var path = [];     // {p, Tc, Tvk, sat}
    var lcl = null, lfc = null, el = null;
    var cape = 0, cin = 0;

    var dp = 5;        // hPa step
    var saturated = false;
    var Tk = Tk0;
    var prevBuoyPos = null;   // track sign changes of (Tv,parcel - Tv,env)
    var prevP = P_BOT, prevDiff = null;

    for (var p = P_BOT; p >= P_TOP; p -= dp) {
      if (!saturated) {
        // Dry adiabat: Poisson. Check for saturation (parcel reaches LCL).
        Tk = theta0 * Math.pow(p / P0, KAPPA);
        if (wsat(Tk, p) <= w0 && lcl === null) {
          lcl = p;
          saturated = true;
        }
      } else {
        // Moist adiabat: integrate Gamma_s over the height of this pressure step.
        var step = 1; // hPa sub-steps for stability of the integration
        for (var pp = p + dp; pp > p; pp -= step) {
          var height = dz(pp, -step, Tk);     // positive metres for upward step
          Tk -= gammaS(Tk, pp) * height;
        }
      }

      // Parcel water content for virtual temperature.
      var wParcel = saturated ? wsat(Tk, p) : w0;
      var TvP = Tvirt(Tk, wParcel);

      // Environment at this level.
      var env = environment(p, Tsfc, Tdsfc);
      var TvE_T = env.T + 273.15;
      var wEnv = wsat(env.Td + 273.15, p);
      var TvE = Tvirt(TvE_T, wEnv);

      var diff = TvP - TvE;                    // virtual-temperature excess (K)
      path.push({ p: p, Tc: Tk - 273.15, sat: saturated, diff: diff });

      // Integrate CAPE / CIN by trapezoid in ln p between successive levels.
      if (prevDiff !== null) {
        var dlnp = Math.log(prevP) - Math.log(p);   // positive going up
        var contrib = RD * 0.5 * (diff + prevDiff) * dlnp;  // J/kg
        // Mark LFC: parcel crosses from negative to positive buoyancy (above LCL).
        if (lcl !== null && p < lcl && prevDiff <= 0 && diff > 0 && lfc === null) {
          lfc = p;
        }
        if (lfc !== null && el === null) {
          // CAPE accumulates over the positive-buoyancy region above the LFC;
          // the first level that turns negative again is the EL.
          if (diff > 0) cape += contrib;
          else { el = p; }
        }
        // CIN is the inhibition that must be overcome to *reach* the LFC: the
        // negative-buoyancy work below it. Freeze it once the LFC is found; if no
        // LFC is ever reached there is no CAPE to release, so CIN stays 0.
        if (lfc === null && diff < 0) {
          cin += contrib;   // contrib is negative here
        }
      }
      prevDiff = diff;
      prevP = p;
      if (el !== null && p < el - 1) break;    // stop a bit past EL
    }

    // No level of free convection -> the sounding cannot convect from the surface;
    // inhibition is moot, so report 0 rather than a runaway negative area.
    if (lfc === null) cin = 0;

    return {
      path: path, w0: w0,
      lcl: lcl, lfc: lfc, el: el,
      cape: Math.max(0, cape),
      cin: cin,            // negative or zero
      wmax: Math.sqrt(2 * Math.max(0, cape))
    };
  }

  // ── Build the widget ──────────────────────────────────
  document.querySelectorAll("[data-widget='skew-t']").forEach(function (section) {
    var host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // Controls
    var controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1.4rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    var tState = { T: 30, Td: 22 };

    var tCtl = slider("surface T", "deg", 18, 40, 1, tState.T, WARM);
    var dCtl = slider("surface dewpoint", "deg", 2, 30, 1, tState.Td, ACCENT);
    controls.appendChild(tCtl.wrap);
    controls.appendChild(dCtl.wrap);

    // SVG canvas
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // Readout
    var readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.84rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.minHeight = "1.3em";
    host.appendChild(readout);

    // Legend
    var legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.72rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.1rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      swatch(WARM, "environment T") +
      swatch(ACCENT, "environment dewpoint") +
      swatch(INK, "lifted parcel") +
      areaSwatch("rgba(43,124,74,0.30)", "CAPE") +
      areaSwatch("rgba(43,92,138,0.30)", "CIN");
    host.appendChild(legend);

    function redraw() {
      tState.T = +tCtl.input.value;
      tState.Td = +dCtl.input.value;
      if (tState.Td > tState.T) { tState.Td = tState.T; dCtl.input.value = tState.Td; }
      tCtl.val.textContent = tState.T + "°C";
      dCtl.val.textContent = tState.Td + "°C";
      var res = liftParcel(tState.T, tState.Td);
      render(svg, tState, res);
      var capeS = Math.round(res.cape);
      var cinS = Math.round(res.cin);
      var elTxt = res.el ? Math.round(res.el) + " hPa" : "—";
      readout.innerHTML =
        "CAPE <strong style='color:" + ACCENT_DEEP + "'>" + capeS + " J kg⁻¹</strong>" +
        " &nbsp;·&nbsp; CIN <strong style='color:" + ACCENT_DEEP + "'>" + cinS + " J kg⁻¹</strong>" +
        " &nbsp;·&nbsp; w<sub>max</sub> = √(2·CAPE) ≈ <strong>" + res.wmax.toFixed(0) + " m s⁻¹</strong>" +
        " &nbsp;·&nbsp; EL " + elTxt;
    }

    tCtl.input.addEventListener("input", redraw);
    dCtl.input.addEventListener("input", redraw);
    redraw();
  }

  // ── Rendering ─────────────────────────────────────────
  function render(svg, st, res) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var ns = "http://www.w3.org/2000/svg";

    // Dry-adiabat / isotherm grid (light skewed isotherms).
    for (var Tg = -40; Tg <= 40; Tg += 10) {
      var d = "M " + xOf(Tg, P_BOT).toFixed(1) + " " + yOf(P_BOT).toFixed(1) +
              " L " + xOf(Tg, P_TOP).toFixed(1) + " " + yOf(P_TOP).toFixed(1);
      line(svg, d, RULE, 0.7);
    }
    // Pressure gridlines + labels.
    [1000, 850, 700, 500, 300, 200].forEach(function (p) {
      if (p < P_TOP || p > P_BOT) return;
      var y = yOf(p);
      line(svg, "M " + M.l + " " + y.toFixed(1) + " L " + (M.l + PW) + " " + y.toFixed(1), RULE, 0.7);
      text(svg, M.l - 6, y + 3.4, String(p), "end", 10, FAINT, "Inter, sans-serif");
    });
    // Temperature axis ticks along the bottom (p = P_BOT).
    [-40, -20, 0, 20, 40].forEach(function (Tg) {
      var x = xOf(Tg, P_BOT);
      text(svg, x, H - 6, (Tg > 0 ? "+" : "") + Tg, "middle", 10, FAINT, "Inter, sans-serif");
    });

    // CAPE / CIN shading: a band between parcel and environment along the path.
    var path = res.path;
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], b = path[i];
      // Only shade between LCL and EL region meaningfully; use buoyancy sign.
      var fill = null;
      var sgn = (a.diff + b.diff);
      if (res.lfc && b.p <= res.lfc && (!res.el || b.p >= res.el) && sgn > 0) {
        fill = "rgba(43,124,74,0.30)";       // CAPE green
      } else if (sgn < 0 && (!res.lfc || b.p >= res.lfc)) {
        fill = "rgba(43,92,138,0.30)";       // CIN blue
      }
      if (!fill) continue;
      var envA = environment(a.p, st.T, st.Td);
      var envB = environment(b.p, st.T, st.Td);
      var poly = [
        [xOf(a.Tc, a.p), yOf(a.p)],
        [xOf(b.Tc, b.p), yOf(b.p)],
        [xOf(envB.T, b.p), yOf(b.p)],
        [xOf(envA.T, a.p), yOf(a.p)]
      ];
      polygon(svg, poly, fill);
    }

    // Environment temperature (warm) and dewpoint (accent).
    var envT = [], envTd = [];
    for (var p = P_BOT; p >= P_TOP; p -= 5) {
      var e = environment(p, st.T, st.Td);
      envT.push([xOf(e.T, p), yOf(p)]);
      envTd.push([xOf(e.Td, p), yOf(p)]);
    }
    polyline(svg, envT, WARM, 2.0);
    polyline(svg, envTd, ACCENT, 2.0);

    // Lifted parcel (ink).
    var par = path.map(function (q) { return [xOf(q.Tc, q.p), yOf(q.p)]; });
    polyline(svg, par, INK, 2.0);

    // Level markers.
    marker(svg, res.lcl, "LCL", GOLD, st);
    marker(svg, res.lfc, "LFC", WARM, st);
    marker(svg, res.el, "EL", ACCENT_DEEP, st);

    // Axis labels.
    text(svg, M.l - 30, M.t + PH / 2, "pressure (hPa)", "middle", 11, MUTED, "Source Serif 4, serif", true, M.l - 30, M.t + PH / 2);
    text(svg, M.l + PW / 2, H - 20, "temperature (°C, skewed)", "middle", 11, MUTED, "Source Serif 4, serif");
  }

  function marker(svg, p, label, color, st) {
    if (!p) return;
    var y = yOf(p);
    var x = M.l + PW - 4;
    line(svg, "M " + M.l + " " + y.toFixed(1) + " L " + x + " " + y.toFixed(1), color, 0.9, "3 3");
    text(svg, x - 2, y - 3, label, "end", 10.5, color, "Inter, sans-serif");
  }

  // ── SVG helpers ───────────────────────────────────────
  function line(svg, d, color, w, dash) {
    var ns = "http://www.w3.org/2000/svg";
    var el = document.createElementNS(ns, "path");
    el.setAttribute("d", d);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", color);
    el.setAttribute("stroke-width", String(w));
    if (dash) el.setAttribute("stroke-dasharray", dash);
    svg.appendChild(el);
    return el;
  }
  function polyline(svg, pts, color, w) {
    if (!pts.length) return;
    var d = "M " + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length; i++) d += " L " + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1);
    line(svg, d, color, w);
  }
  function polygon(svg, pts, fill) {
    var ns = "http://www.w3.org/2000/svg";
    var el = document.createElementNS(ns, "polygon");
    el.setAttribute("points", pts.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "));
    el.setAttribute("fill", fill);
    el.setAttribute("stroke", "none");
    svg.appendChild(el);
  }
  function text(svg, x, y, str, anchor, size, color, font, rotate, rx, ry) {
    var ns = "http://www.w3.org/2000/svg";
    var el = document.createElementNS(ns, "text");
    el.setAttribute("x", x);
    el.setAttribute("y", y);
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("font-family", font);
    el.setAttribute("font-size", String(size));
    el.setAttribute("fill", color);
    if (font.indexOf("Serif") >= 0) el.setAttribute("font-style", "italic");
    if (rotate) el.setAttribute("transform", "rotate(-90, " + rx + ", " + ry + ")");
    el.textContent = str;
    svg.appendChild(el);
    return el;
  }

  // ── Control + legend builders ─────────────────────────
  function slider(name, unit, min, max, step, value, color) {
    var wrap = document.createElement("label");
    wrap.style.fontFamily = "Inter, sans-serif";
    wrap.style.fontSize = "0.8rem";
    wrap.style.color = INK;
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.25rem";

    var head = document.createElement("span");
    var val = document.createElement("span");
    val.style.fontWeight = "600";
    val.style.color = color;
    val.textContent = value + "°C";
    head.appendChild(document.createTextNode(name + "  "));
    head.appendChild(val);
    wrap.appendChild(head);

    var input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.style.width = "180px";
    input.style.accentColor = color;
    wrap.appendChild(input);

    return { wrap: wrap, input: input, val: val };
  }

  function swatch(color, label) {   // line swatch
    return "<span><span style='display:inline-block;width:22px;height:2px;background:" +
      color + ";vertical-align:middle;margin-right:0.3em'></span>" + label + "</span>";
  }
  function areaSwatch(color, label) {   // filled-area swatch
    return "<span><span style='display:inline-block;width:12px;height:10px;background:" +
      color + ";vertical-align:middle;margin-right:0.3em;border-radius:1px'></span>" + label + "</span>";
  }
})();
