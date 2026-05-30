#!/usr/bin/env node
/* Strict KaTeX harness for a Books-workspace book.
 *
 * Renders EVERY math expression in <book>/chapters/*.html under
 * strict:"error" + throwOnError:true — the only check that surfaces
 * silently-broken formulas (undefined macros, unbalanced braces) that the
 * runtime throwOnError:false hides as raw text.
 *
 * It auto-extracts the `macros` object from <book>/book.js so it always
 * matches the book, and decodes HTML entities (&lt; -> <) so it mirrors how
 * the browser feeds text nodes to KaTeX.
 *
 * Setup (one time, in this scripts/ dir):  npm install katex@0.16.47
 * Usage:  node scripts/katex-check.js <book-slug>
 *         node scripts/katex-check.js meteorology
 */
const fs = require("fs");
const path = require("path");

let katex;
try { katex = require("katex"); }
catch (e) {
  console.error("Missing katex. Run:  (cd " + __dirname + " && npm install katex@0.16.47)");
  process.exit(2);
}

const slug = process.argv[2];
if (!slug) { console.error("usage: node katex-check.js <book-slug>"); process.exit(2); }
const ROOT = path.resolve(__dirname, "..", "..", "..", ".."); // skill is at <root>/.claude/skills/new-book
const book = path.join(ROOT, slug);
const chaptersDir = path.join(book, "chapters");
if (!fs.existsSync(chaptersDir)) { console.error("no chapters dir at " + chaptersDir); process.exit(2); }

// ── Extract the macros object literal from book.js ──
function extractMacros(bookJsPath) {
  if (!fs.existsSync(bookJsPath)) return {};
  const src = fs.readFileSync(bookJsPath, "utf8");
  const i = src.indexOf("macros:");
  if (i < 0) return {};
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  for (; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (depth === 0) { j++; break; } }
  }
  const objText = src.slice(open, j);
  try { return eval("(" + objText + ")"); } // values are string literals — safe enough for a local harness
  catch (e) { console.warn("warn: could not parse macros from book.js (" + e.message + "); proceeding with none"); return {}; }
}
const macros = extractMacros(path.join(book, "book.js"));
console.log("Using " + Object.keys(macros).length + " macros from " + slug + "/book.js");

function decodeEntities(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}

function extractMath(src) {
  const out = [];
  const patterns = [
    { re: /\$\$([\s\S]+?)\$\$/g, display: true },
    { re: /\\\[([\s\S]+?)\\\]/g, display: true },
    { re: /\\\(([\s\S]+?)\\\)/g, display: false },
  ];
  let masked = src;
  for (const p of patterns) {
    masked = masked.replace(p.re, (m, body) => { out.push({ body, display: p.display }); return " ".repeat(m.length); });
  }
  masked.replace(/\$([^$\n]+?)\$/g, (m, body) => { out.push({ body, display: false }); return m; });
  return out;
}

let total = 0, failures = 0;
for (const file of fs.readdirSync(chaptersDir).filter(f => f.endsWith(".html")).sort()) {
  const src = fs.readFileSync(path.join(chaptersDir, file), "utf8");
  const exprs = extractMath(src);
  let fileFail = 0;
  for (const { body, display } of exprs) {
    total++;
    try {
      katex.renderToString(decodeEntities(body), { displayMode: display, throwOnError: true, strict: "error", macros: Object.assign({}, macros) });
    } catch (e) {
      failures++; fileFail++;
      console.log(`\n✗ ${file}\n   ${String(e.message).split("\n")[0]}\n   EXPR: ${body.trim().slice(0, 160)}`);
    }
  }
  console.log(`${fileFail === 0 ? "✓" : "✗"} ${file}: ${exprs.length} expressions, ${fileFail} failures`);
}
console.log(`\n==== TOTAL: ${total} expressions, ${failures} failures ====`);
process.exit(failures ? 1 : 0);
