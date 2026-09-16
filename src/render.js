import { escapeHtml } from "./escape.js";

/** @typedef {import('./parse.js').ParsedDiff} ParsedDiff */
/** @typedef {import('./parse.js').FileDiff} FileDiff */
/** @typedef {import('./parse.js').Hunk} Hunk */
/** @typedef {import('./parse.js').DiffLine} DiffLine */
/** @typedef {import('./parse.js').FileStatus} FileStatus */
/** @typedef {import('./parse.js').LineKind} LineKind */

/**
 * @typedef {object} RenderOptions
 * @property {string} [title]
 * @property {'system' | 'light' | 'dark'} [theme]
 */

const STYLES = String.raw`
:root {
  color-scheme: light dark;
  --paper: #f3eee4;
  --ink: #1c1915;
  --muted: #6b6358;
  --rule: rgba(28, 25, 21, 0.12);
  --card: #fffaf1;
  --card-edge: rgba(28, 25, 21, 0.08);
  --accent: #9a3412;
  --stamp: #9a3412;
  --add-bg: #dcefe2;
  --add-ink: #14532d;
  --del-bg: #f8e2dc;
  --del-ink: #9f1239;
  --meta: #7c7468;
  --ln: #8a8175;
  --shadow: 0 18px 40px rgba(28, 25, 21, 0.08);
  --font-display: "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif;
  --font-ui: "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", "Cascadia Code", Menlo, Consolas, "Liberation Mono", monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #161310;
    --ink: #f4efe6;
    --muted: #b3a89a;
    --rule: rgba(244, 239, 230, 0.12);
    --card: #211c17;
    --card-edge: rgba(244, 239, 230, 0.08);
    --accent: #e8a87c;
    --stamp: #e8a87c;
    --add-bg: #143024;
    --add-ink: #bbf7d0;
    --del-bg: #3a1717;
    --del-ink: #fecaca;
    --meta: #9c9184;
    --ln: #8f8578;
    --shadow: 0 18px 44px rgba(0, 0, 0, 0.35);
  }
}

:root[data-theme="dark"] {
  --paper: #161310;
  --ink: #f4efe6;
  --muted: #b3a89a;
  --rule: rgba(244, 239, 230, 0.12);
  --card: #211c17;
  --card-edge: rgba(244, 239, 230, 0.08);
  --accent: #e8a87c;
  --stamp: #e8a87c;
  --add-bg: #143024;
  --add-ink: #bbf7d0;
  --del-bg: #3a1717;
  --del-ink: #fecaca;
  --meta: #9c9184;
  --ln: #8f8578;
  --shadow: 0 18px 44px rgba(0, 0, 0, 0.35);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-ui);
}

body {
  min-height: 100vh;
  background-image:
    radial-gradient(1200px 500px at 10% -10%, rgba(154, 52, 18, 0.08), transparent 50%),
    radial-gradient(900px 400px at 110% 0%, rgba(28, 25, 21, 0.06), transparent 45%);
}

.sheet {
  width: min(920px, calc(100% - 2rem));
  margin: 2.5rem auto 3rem;
}

.masthead {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem 1.5rem;
  align-items: start;
  padding: 1.75rem 1.75rem 1.5rem;
  margin-bottom: 1.5rem;
  background: var(--card);
  border: 1px solid var(--card-edge);
  border-radius: 18px;
  box-shadow: var(--shadow);
}

.masthead-copy {
  min-width: 0;
}

.masthead-aside {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.kicker {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}

h1 {
  margin: 0.15rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem 1.75rem;
  margin: 1rem 0 0;
}

.stats div { min-width: 4.5rem; }

.stats dt {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.stats dd {
  margin: 0.2rem 0 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
}

.stats .add { color: var(--add-ink); }
.stats .del { color: var(--del-ink); }

.stamp {
  width: 5.4rem;
  height: 5.4rem;
  display: grid;
  place-items: center;
  border: 2px solid var(--stamp);
  border-radius: 50%;
  color: var(--stamp);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.68rem;
  font-weight: 700;
  transform: rotate(12deg);
  opacity: 0.88;
}

.toolbar {
  display: flex;
  justify-content: center;
}

#theme-toggle {
  appearance: none;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink);
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  cursor: pointer;
}

#theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
#theme-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.file-card {
  background: var(--card);
  border: 1px solid var(--card-edge);
  border-radius: 16px;
  box-shadow: var(--shadow);
  margin: 0 0 1.15rem;
  overflow: hidden;
}

.file-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem 0.85rem;
  padding: 0.95rem 1.15rem;
  border-bottom: 1px solid var(--rule);
}

.status {
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--accent);
}

.file-head h2 {
  margin: 0;
  flex: 1 1 12rem;
  font-family: var(--font-mono);
  font-size: 0.92rem;
  font-weight: 600;
  word-break: break-all;
}

.file-stat {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--muted);
}

.hunk-head {
  margin: 0;
  padding: 0.55rem 1.15rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted);
  background: color-mix(in srgb, var(--paper) 70%, var(--card));
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}

.diff {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.55;
  tab-size: 4;
}

.diff td {
  vertical-align: top;
  padding: 0 0.35rem;
}

.ln {
  width: 1%;
  min-width: 2.4rem;
  text-align: right;
  color: var(--ln);
  user-select: none;
  padding-left: 0.7rem;
}

.sign {
  width: 1%;
  color: var(--muted);
  user-select: none;
}

.code {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding-right: 1rem;
}

.row-add { background: var(--add-bg); color: var(--add-ink); }
.row-del { background: var(--del-bg); color: var(--del-ink); }
.row-meta td { color: var(--meta); font-style: italic; }

.empty, .binary {
  margin: 0;
  padding: 1.25rem 1.15rem 1.4rem;
  color: var(--muted);
}

.colophon {
  margin: 2rem 0 0;
  text-align: center;
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}

@media print {
  body { background: white; }
  .toolbar, #theme-toggle { display: none; }
  .file-card, .masthead { box-shadow: none; break-inside: avoid; }
}
`.trim();

const THEME_SCRIPT = `
(function () {
  var KEY = "diff-postcard-theme";
  var root = document.documentElement;
  var button = document.getElementById("theme-toggle");
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  }
  function label() {
    var theme = root.getAttribute("data-theme");
    if (theme === "dark") return "Light theme";
    if (theme === "light") return "Dark theme";
    return "Toggle theme";
  }
  function sync() {
    if (button) button.textContent = label();
  }
  sync();
  if (!button) return;
  button.addEventListener("click", function () {
    var current = root.getAttribute("data-theme");
    var next;
    if (current === "dark") next = "light";
    else if (current === "light") next = "dark";
    else next = window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    sync();
  });
})();
`.trim();

/**
 * @param {FileStatus} status
 * @returns {string}
 */
function statusLabel(status) {
  switch (status) {
    case "add":
      return "added";
    case "delete":
      return "deleted";
    case "rename":
      return "renamed";
    case "modify":
      return "modified";
    default: {
      const _exhaustive = status;
      return _exhaustive;
    }
  }
}

/**
 * @param {LineKind} kind
 * @returns {string}
 */
function rowClass(kind) {
  switch (kind) {
    case "add":
      return "row-add";
    case "del":
      return "row-del";
    case "meta":
      return "row-meta";
    case "context":
      return "row-ctx";
    default: {
      const _exhaustive = /** @type {never} */ (kind);
      void _exhaustive;
      return "row-ctx";
    }
  }
}

/**
 * @param {LineKind} kind
 * @returns {string}
 */
function signFor(kind) {
  switch (kind) {
    case "add":
      return "+";
    case "del":
      return "−";
    case "meta":
      return "\\";
    case "context":
      return "";
    default: {
      const _exhaustive = /** @type {never} */ (kind);
      void _exhaustive;
      return "";
    }
  }
}

/**
 * @param {Hunk} hunk
 * @returns {string}
 */
function renderHunk(hunk) {
  const rows = hunk.lines
    .map((line) => {
      const oldLn = line.oldLine == null ? "" : String(line.oldLine);
      const newLn = line.newLine == null ? "" : String(line.newLine);
      return `<tr class="${rowClass(line.kind)}"><td class="ln">${escapeHtml(oldLn)}</td><td class="ln">${escapeHtml(newLn)}</td><td class="sign">${signFor(line.kind)}</td><td class="code">${escapeHtml(line.text)}</td></tr>`;
    })
    .join("");
  return `<h3 class="hunk-head">${escapeHtml(hunk.header)}</h3><table class="diff">${rows}</table>`;
}

/**
 * @param {FileDiff} file
 * @returns {string}
 */
/**
 * @param {unknown} value
 * @returns {number}
 */
function numericCount(value) {
  return Number(value) || 0;
}

/**
 * @param {FileDiff} file
 * @returns {string}
 */
function renderFile(file) {
  const stats = `<span class="file-stat">+${numericCount(file.additions)} −${numericCount(file.deletions)}</span>`;
  let body;
  if (file.binary) {
    body = `<p class="binary">Binary file — contents omitted.</p>`;
  } else if (file.hunks.length === 0) {
    body = `<p class="empty">No textual hunks in this file.</p>`;
  } else {
    body = file.hunks.map(renderHunk).join("");
  }
  return `<article class="file-card" data-path="${escapeHtml(file.path)}"><header class="file-head"><span class="status">${escapeHtml(statusLabel(file.status))}</span><h2>${escapeHtml(file.path)}</h2>${stats}</header>${body}</article>`;
}

/**
 * @param {ParsedDiff} parsed
 * @param {RenderOptions} [options]
 * @returns {string}
 */
export function renderPostcard(parsed, options = {}) {
  const title = options.title?.trim() || "Diff postcard";
  const theme = options.theme ?? "system";
  const files = parsed.files ?? [];
  const fileCount = files.length;
  const cards =
    fileCount === 0
      ? `<article class="file-card"><p class="empty">Nothing to show — the diff was empty.</p></article>`
      : files.map(renderFile).join("\n");

  const themeAttr =
    theme === "light" || theme === "dark" ? ` data-theme="${theme}"` : "";

  return `<!DOCTYPE html>
<html lang="en"${themeAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)}</title>
<style>
${STYLES}
</style>
</head>
<body>
<main class="sheet">
  <header class="masthead">
    <div class="masthead-copy">
      <p class="kicker">diff postcard</p>
      <h1>${escapeHtml(title)}</h1>
      <dl class="stats">
        <div><dt>files</dt><dd>${fileCount}</dd></div>
        <div><dt>added</dt><dd class="add">+${numericCount(parsed.additions)}</dd></div>
        <div><dt>removed</dt><dd class="del">−${numericCount(parsed.deletions)}</dd></div>
      </dl>
    </div>
    <div class="masthead-aside">
      <div class="stamp" aria-hidden="true">diff<br>mail</div>
      <div class="toolbar">
        <button type="button" id="theme-toggle">Toggle theme</button>
      </div>
    </div>
  </header>
  ${cards}
  <p class="colophon">Generated by diff-postcard · single file · works offline</p>
</main>
<script>
${THEME_SCRIPT}
</script>
</body>
</html>
`;
}
