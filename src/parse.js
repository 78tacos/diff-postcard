/**
 * Parse unified diffs (git and classic) into a structured postcard model.
 */

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
const GIT_DIFF_RE = /^diff --git ("[^"]+"|\S+) ("[^"]+"|\S+)$/;

/**
 * @typedef {'context' | 'add' | 'del' | 'meta'} LineKind
 *
 * @typedef {object} DiffLine
 * @property {LineKind} kind
 * @property {string} text
 * @property {number | null} oldLine
 * @property {number | null} newLine
 *
 * @typedef {object} Hunk
 * @property {string} header
 * @property {number} oldStart
 * @property {number} oldCount
 * @property {number} newStart
 * @property {number} newCount
 * @property {DiffLine[]} lines
 *
 * @typedef {'modify' | 'add' | 'delete' | 'rename'} FileStatus
 *
 * @typedef {object} FileDiff
 * @property {string} oldPath
 * @property {string} newPath
 * @property {string} path
 * @property {FileStatus} status
 * @property {boolean} binary
 * @property {Hunk[]} hunks
 * @property {number} additions
 * @property {number} deletions
 *
 * @typedef {object} ParsedDiff
 * @property {FileDiff[]} files
 * @property {number} additions
 * @property {number} deletions
 */

/**
 * @param {string} text
 * @returns {ParsedDiff}
 */
export function parseUnifiedDiff(text) {
  const source = String(text ?? "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const rawLines = source.split("\n");
  if (rawLines.length && rawLines[rawLines.length - 1] === "") {
    rawLines.pop();
  }

  /** @type {FileDiff[]} */
  const files = [];
  /** @type {FileDiff | null} */
  let current = null;
  /** @type {Hunk | null} */
  let hunk = null;
  let oldLine = 0;
  let newLine = 0;

  /**
   * @param {Partial<FileDiff> & { path?: string }} [init]
   * @returns {FileDiff}
   */
  function startFile(init = {}) {
    hunk = null;
    const file = {
      oldPath: init.oldPath ?? "",
      newPath: init.newPath ?? "",
      path: init.path ?? "",
      status: init.status ?? "modify",
      binary: init.binary ?? false,
      hunks: [],
      additions: 0,
      deletions: 0,
    };
    files.push(file);
    current = file;
    return file;
  }

  function ensureFile() {
    if (!current) {
      return startFile();
    }
    return current;
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function cleanPath(value) {
    let path = value.trim();
    if (
      (path.startsWith('"') && path.endsWith('"')) ||
      (path.startsWith("'") && path.endsWith("'"))
    ) {
      path = path.slice(1, -1);
    }
    const tab = path.indexOf("\t");
    if (tab !== -1) {
      path = path.slice(0, tab);
    }
    if (path === "/dev/null") {
      return path;
    }
    if (path.startsWith("a/") || path.startsWith("b/")) {
      return path.slice(2);
    }
    return path;
  }

  function finalizePath() {
    if (!current) {
      return;
    }
    if (!current.oldPath && current.newPath) {
      current.oldPath = current.newPath;
    }
    if (!current.newPath && current.oldPath) {
      current.newPath = current.oldPath;
    }
    if (current.oldPath === "/dev/null") {
      current.status = "add";
      current.path = current.newPath;
      return;
    }
    if (current.newPath === "/dev/null") {
      current.status = "delete";
      current.path = current.oldPath;
      return;
    }
    if (current.oldPath !== current.newPath) {
      current.status = "rename";
    }
    current.path =
      current.status === "rename"
        ? `${current.oldPath} → ${current.newPath}`
        : current.newPath || current.oldPath;
  }

  for (const line of rawLines) {
    const gitMatch = line.match(GIT_DIFF_RE);
    if (gitMatch) {
      if (current) {
        finalizePath();
      }
      const oldPath = cleanPath(gitMatch[1]);
      const newPath = cleanPath(gitMatch[2]);
      startFile({
        oldPath,
        newPath,
        path: newPath || oldPath,
        status: "modify",
      });
      continue;
    }

    if (line.startsWith("new file mode")) {
      const file = ensureFile();
      file.status = "add";
      continue;
    }

    if (line.startsWith("deleted file mode")) {
      const file = ensureFile();
      file.status = "delete";
      continue;
    }

    if (line.startsWith("rename from ")) {
      const file = ensureFile();
      file.oldPath = cleanPath(line.slice("rename from ".length));
      continue;
    }

    if (line.startsWith("rename to ")) {
      const file = ensureFile();
      file.newPath = cleanPath(line.slice("rename to ".length));
      continue;
    }

    if (
      line.startsWith("Binary files ") ||
      line.startsWith("GIT binary patch") ||
      line === "Binary files differ"
    ) {
      const file = ensureFile();
      file.binary = true;
      hunk = null;
      continue;
    }

    if (line.startsWith("--- ") && !hunk) {
      const file = current ? current : startFile();
      file.oldPath = cleanPath(line.slice(4));
      continue;
    }

    if (line.startsWith("+++ ") && !hunk) {
      const file = ensureFile();
      file.newPath = cleanPath(line.slice(4));
      continue;
    }

    const hunkMatch = line.match(HUNK_RE);
    if (hunkMatch) {
      const file = ensureFile();
      hunk = {
        header: line,
        oldStart: Number(hunkMatch[1]),
        oldCount: hunkMatch[2] === undefined ? 1 : Number(hunkMatch[2]),
        newStart: Number(hunkMatch[3]),
        newCount: hunkMatch[4] === undefined ? 1 : Number(hunkMatch[4]),
        lines: [],
      };
      file.hunks.push(hunk);
      oldLine = hunk.oldStart;
      newLine = hunk.newStart;
      continue;
    }

    if (!hunk) {
      continue;
    }

    const prefix = line[0];
    const body = line.length > 0 ? line.slice(1) : "";

    if (prefix === "+" ) {
      hunk.lines.push({
        kind: "add",
        text: body,
        oldLine: null,
        newLine,
      });
      current.additions += 1;
      newLine += 1;
      continue;
    }

    if (prefix === "-") {
      hunk.lines.push({
        kind: "del",
        text: body,
        oldLine,
        newLine: null,
      });
      current.deletions += 1;
      oldLine += 1;
      continue;
    }

    if (prefix === "\\") {
      hunk.lines.push({
        kind: "meta",
        text: line.slice(1).trimStart(),
        oldLine: null,
        newLine: null,
      });
      continue;
    }

    hunk.lines.push({
      kind: "context",
      text: prefix === " " || prefix === undefined ? body : line,
      oldLine,
      newLine,
    });
    oldLine += 1;
    newLine += 1;
  }

  if (current) {
    finalizePath();
  }

  let additions = 0;
  let deletions = 0;
  for (const file of files) {
    if (!file.path) {
      file.path = file.newPath || file.oldPath || "unknown";
    }
    additions += file.additions;
    deletions += file.deletions;
  }

  return { files, additions, deletions };
}
