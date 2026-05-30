#!/usr/bin/env node
/* JSDOM widget executor for a Books-workspace book.
 *
 * Executes each <book>/interactive/*.js widget's REAL code in a DOM. Confirms
 * build() runs end-to-end with no runtime error, then dumps the computed
 * readout text + element counts so the numbers can be eyeballed against known
 * reference values. This is the empirical "do the widgets actually compute the
 * right physics" check (stronger than node --check, which only checks syntax).
 *
 * It stubs requestAnimationFrame / timers so animation loops don't spin, and
 * gives elements a sane getBoundingClientRect.
 *
 * Setup (one time, in this scripts/ dir):  npm install jsdom
 * Usage:  node scripts/widget-run.js <book-slug>
 */
const fs = require("fs");
const path = require("path");

let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch (e) {
  console.error("Missing jsdom. Run:  (cd " + __dirname + " && npm install jsdom)");
  process.exit(2);
}

const slug = process.argv[2];
if (!slug) { console.error("usage: node widget-run.js <book-slug>"); process.exit(2); }
const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const dir = path.join(ROOT, slug, "interactive");
if (!fs.existsSync(dir)) { console.error("no interactive dir at " + dir); process.exit(2); }

// Map each widget file to the data-widget slug it self-mounts on (assume == filename).
const widgets = fs.readdirSync(dir).filter(f => f.endsWith(".js")).map(f => f.replace(/\.js$/, "")).sort();

function widgetSlugInFile(src, fallback) {
  const m = src.match(/data-widget=['"]([^'"]+)['"]/);
  return m ? m[1] : fallback;
}

function runWidget(file) {
  const src = fs.readFileSync(path.join(dir, file + ".js"), "utf8");
  const mountSlug = widgetSlugInFile(src, file);
  const html = `<!doctype html><html><body>
    <section class="interactive" data-widget="${mountSlug}"><div class="widget-mount"></div></section>
    </body></html>`;
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const { window } = dom;
  let rafCount = 0;
  window.requestAnimationFrame = (cb) => { if (rafCount++ < 3) { try { cb(16 * rafCount); } catch (e) {} } return rafCount; };
  window.cancelAnimationFrame = () => {};
  window.setInterval = () => 0;
  window.clearInterval = () => {};
  window.setTimeout = (cb) => { try { cb(); } catch (e) {} return 0; };
  window.clearTimeout = () => {};
  window.Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, width: 520, height: 320, top: 0, left: 0, right: 520, bottom: 320 };
  };

  const g = {
    window, document: window.document, navigator: window.navigator,
    requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame,
    setInterval: window.setInterval, clearInterval: window.clearInterval,
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
    Math, Number, String, Array, Object, JSON, console, Date,
    SVGElement: window.SVGElement, Node: window.Node, Event: window.Event,
  };
  const keys = Object.keys(g);
  try {
    // eslint-disable-next-line no-new-func
    new Function(...keys, src + "\n//# sourceURL=" + file)(...keys.map(k => g[k]));
  } catch (e) {
    return { file, ok: false, error: (e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : String(e)) };
  }
  const mount = window.document.querySelector(".widget-mount");
  const svgCount = mount ? mount.querySelectorAll("svg").length : 0;
  const elCount = mount ? mount.querySelectorAll("*").length : 0;
  const inputs = mount ? mount.querySelectorAll("input,button").length : 0;
  let text = mount ? mount.textContent.replace(/\s+/g, " ").trim() : "";
  if (text.length > 400) text = text.slice(0, 400) + "…";
  return { file, ok: true, svgCount, elCount, inputs, text };
}

let fails = 0;
for (const w of widgets) {
  const r = runWidget(w);
  if (!r.ok) { fails++; console.log(`✗ ${w}\n    ERROR: ${r.error}`); }
  else {
    console.log(`✓ ${w}: ${r.svgCount} svg, ${r.elCount} els, ${r.inputs} controls`);
    console.log(`    readout: ${r.text || "(none captured)"}`);
  }
}
console.log(`\n==== ${widgets.length - fails}/${widgets.length} widgets built without error ====`);
process.exit(fails ? 1 : 0);
