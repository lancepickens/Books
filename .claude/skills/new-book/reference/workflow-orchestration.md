# Fanning a whole book out across subagents

Writing one chapter? Just write it. Writing a whole 10-chapter book? Multi-agent
orchestration with the `Workflow` tool is worth it — but only when the user has opted into
that scale (see the Workflow tool's rules). This is how the meteorology book was built.

## The pattern: draft → adversarial-verify pipeline

Each chapter owns its own two files (`chapters/NN-slug.html`, `interactive/slug.js`), so there
are **no write conflicts** — no worktrees needed. Pipeline each chapter through two stages:

```js
phase('Draft');
const results = await pipeline(
  chapters,                                   // [1..10]
  (n) => agent(draftPrompt(n),  { label: 'draft:ch'  + n, phase: 'Draft'  }).then(() => n),
  (n) => agent(verifyPrompt(n), { label: 'verify:ch' + n, phase: 'Verify' }),
);
```

- **Draft agent** gets: the full house-style spec (the contents of `SKILL.md` +
  `reference/house-style.md`), this chapter's equation brief, the exact output file paths, the
  prev/next nav links, and a finished chapter to use as a structural template. It writes both
  files and returns a short report (not the file contents).
- **Verify agent** gets: the same brief, and instructions to re-check equations + citations
  **against sources using WebSearch/WebFetch** (not recall), confirm only whitelisted KaTeX
  macros are used, sanity-check the widget, and **fix in place**.

Keep the workflow script self-contained: workflow scripts have **no filesystem access**, so the
spec and all per-chapter briefs must be inline string constants, not `require`d files.

## Consistency insurance

Notation drift across parallel writers is the main risk. Mitigate:
- Put every convention and symbol in the shared spec, handed identically to every agent.
- Consider drafting the **conventions-anchor chapter** first (the one that fixes
  coordinates/signs — for meteorology, the equations-of-motion chapter), review it yourself,
  then fan the rest out using it as the gold template.
- After the run, audit for symbol collisions and verify nav/links/structure with a lint
  (grep for `data-widget` ↔ script-tag match, resolve all hrefs).

## Validate yourself, in the main loop — don't trust a second workflow blindly

Run the empirical gates yourself; they are fast and reliable:
- `scripts/katex-check.js <slug>` — strict KaTeX over every expression.
- `node --check` on every widget.
- `scripts/widget-run.js <slug>` — execute each widget in JSDOM, check readouts vs reference
  values.
- A structural lint (preamble/glossary/Where/further-reading present; links resolve).
- Personally spot-check every load-bearing constant against the brief.

**Caution learned the hard way:** a background verification workflow can **stall** — one agent
hung ~3.3 h on a web/tool call and returned almost nothing (≈30k tokens, no edits). Don't rely
on a background pass for the things you can check directly. The JSDOM + KaTeX harnesses, run by
you, caught and confirmed far more than the stalled pass would have.

## `args` gotcha

The `Workflow` `args` value can arrive as a *string* even when you intend a JSON array. If your
script does `Array.isArray(args) ? args : DEFAULT`, a stringified `"[4]"` falls through to the
default (the meteorology build was meant to do one anchor chapter first but built all ten in one
pass for this reason). Either parse defensively or accept that the script runs its default set.
