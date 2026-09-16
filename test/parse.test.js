import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseUnifiedDiff } from "../src/parse.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const samplePath = join(dirname(fileURLToPath(import.meta.url)), "..", "examples", "sample.diff");

describe("parseUnifiedDiff", () => {
  it("parses a multi-file git diff with hunks, rename, add, delete, and binary", () => {
    const parsed = parseUnifiedDiff(readFileSync(samplePath, "utf8"));
    assert.equal(parsed.files.length, 5);
    assert.equal(parsed.additions, 14);
    assert.equal(parsed.deletions, 6);

    const [greet, calc, notes, readme, logo] = parsed.files;
    assert.equal(greet.path, "src/greet.js");
    assert.equal(greet.status, "modify");
    assert.equal(greet.hunks.length, 1);
    assert.equal(greet.additions, 5);
    assert.equal(greet.deletions, 2);

    assert.equal(calc.status, "rename");
    assert.equal(calc.oldPath, "src/math.js");
    assert.equal(calc.newPath, "src/calc.js");
    assert.match(calc.path, /math\.js/);
    assert.match(calc.path, /calc\.js/);

    assert.equal(notes.status, "delete");
    assert.equal(notes.path, "notes.md");
    assert.equal(notes.deletions, 3);

    assert.equal(readme.status, "add");
    assert.equal(readme.path, "README.md");
    assert.equal(readme.additions, 7);

    assert.equal(logo.status, "modify");
    assert.equal(logo.binary, true);
    assert.equal(logo.path, "assets/logo.png");
  });

  it("assigns old and new line numbers through mixed hunks", () => {
    const diff = `--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,4 @@
 keep
-gone
+added
 keep
+tail
`;
    const [file] = parseUnifiedDiff(diff).files;
    const kinds = file.hunks[0].lines.map((line) => [
      line.kind,
      line.oldLine,
      line.newLine,
      line.text,
    ]);
    assert.deepEqual(kinds, [
      ["context", 1, 1, "keep"],
      ["del", 2, null, "gone"],
      ["add", null, 2, "added"],
      ["context", 3, 3, "keep"],
      ["add", null, 4, "tail"],
    ]);
  });

  it("treats omitted hunk counts as 1", () => {
    const diff = `--- a/one
+++ b/one
@@ -2 +2 @@
-old
+new
`;
    const hunk = parseUnifiedDiff(diff).files[0].hunks[0];
    assert.equal(hunk.oldStart, 2);
    assert.equal(hunk.oldCount, 1);
    assert.equal(hunk.newStart, 2);
    assert.equal(hunk.newCount, 1);
  });

  it("records no-newline markers as meta lines", () => {
    const diff = `--- a/x
+++ b/x
@@ -1 +1 @@
-old
\\ No newline at end of file
+new
\\ No newline at end of file
`;
    const lines = parseUnifiedDiff(diff).files[0].hunks[0].lines;
    assert.equal(lines.filter((line) => line.kind === "meta").length, 2);
    assert.equal(lines[1].text, "No newline at end of file");
  });

  it("parses classic diffs without git headers", () => {
    const diff = `--- foo.ts\t2024-01-01
+++ foo.ts\t2024-01-02
@@ -1,2 +1,2 @@
 function x() {
-  return 1;
+  return 2;
`;
    const parsed = parseUnifiedDiff(diff);
    assert.equal(parsed.files.length, 1);
    assert.equal(parsed.files[0].path, "foo.ts");
    assert.equal(parsed.files[0].additions, 1);
    assert.equal(parsed.files[0].deletions, 1);
  });

  it("returns an empty model for blank input", () => {
    const parsed = parseUnifiedDiff("");
    assert.deepEqual(parsed, { files: [], additions: 0, deletions: 0 });
  });

  it("strips a BOM and normalizes CRLF", () => {
    const diff = "\uFEFF--- a/x\r\n+++ b/x\r\n@@ -1 +1 @@\r\n-a\r\n+b\r\n";
    const parsed = parseUnifiedDiff(diff);
    assert.equal(parsed.files[0].path, "x");
    assert.equal(parsed.additions, 1);
    assert.equal(parsed.deletions, 1);
  });
});
