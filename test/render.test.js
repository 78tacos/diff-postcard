import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseUnifiedDiff } from "../src/parse.js";
import { renderPostcard } from "../src/render.js";
import { diffToHtml, escapeHtml } from "../src/index.js";

const sample = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "examples", "sample.diff"),
  "utf8",
);

describe("renderPostcard", () => {
  it("emits a self-contained HTML document with inline CSS and no CDN", () => {
    const html = diffToHtml(sample, { title: "Sample postcard" });
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<style>/);
    assert.match(html, /prefers-color-scheme:\s*dark/);
    assert.match(html, /id="theme-toggle"/);
    assert.match(html, /localStorage/);
    assert.doesNotMatch(html, /https?:\/\/cdn\./i);
    assert.doesNotMatch(html, /<link[^>]+stylesheet/i);
    assert.doesNotMatch(html, /googleapis|jsdelivr|unpkg|cdnjs/i);
    assert.doesNotMatch(html, /google-analytics|googletagmanager|\bgtag\(|plausible\.io/i);
  });

  it("renders a card per file, including binary files", () => {
    const html = diffToHtml(sample);
    assert.match(html, /data-path="src\/greet\.js"/);
    assert.match(html, /data-path="src\/math\.js → src\/calc\.js"/);
    assert.match(html, /data-path="notes\.md"/);
    assert.match(html, /data-path="README\.md"/);
    assert.match(html, /data-path="assets\/logo\.png"/);
    assert.match(html, /Binary file — contents omitted/);
    assert.match(html, />files<\/dt><dd>5<\/dd>/);
    assert.match(html, />\+14<\/dd>/);
    assert.match(html, />−6<\/dd>/);
  });

  it("escapes untrusted diff text in the HTML", () => {
    const html = diffToHtml(sample);
    assert.match(html, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>alert\("xss"\)<\/script>/);
  });

  it("escapes postcard titles", () => {
    const html = renderPostcard(parseUnifiedDiff(""), {
      title: `<img src=x onerror=alert(1)>`,
    });
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(html, /<img src=x/);
  });

  it("pins an explicit theme on the root element", () => {
    const dark = renderPostcard(parseUnifiedDiff(""), { theme: "dark" });
    const light = renderPostcard(parseUnifiedDiff(""), { theme: "light" });
    const system = renderPostcard(parseUnifiedDiff(""), { theme: "system" });
    assert.match(dark, /<html lang="en" data-theme="dark">/);
    assert.match(light, /<html lang="en" data-theme="light">/);
    assert.match(system, /<html lang="en">/);
    assert.doesNotMatch(system, /<html lang="en" data-theme=/);
  });

  it("shows an empty state when there are no files", () => {
    const html = renderPostcard({ files: [], additions: 0, deletions: 0 });
    assert.match(html, /the diff was empty/);
  });

  it("does not interpolate raw count or kind payloads into HTML", () => {
    const payload = "<svg onload=alert(1)>";
    const html = renderPostcard({
      files: [
        {
          path: "crafted.js",
          oldPath: "crafted.js",
          newPath: "crafted.js",
          status: "modify",
          binary: false,
          hunks: [
            {
              header: "@@ -1 +1 @@",
              oldStart: 1,
              oldCount: 1,
              newStart: 1,
              newCount: 1,
              lines: [
                {
                  kind: /** @type {never} */ (payload),
                  text: "ok",
                  oldLine: 1,
                  newLine: 1,
                },
              ],
            },
          ],
          additions: payload,
          deletions: payload,
        },
      ],
      additions: payload,
      deletions: payload,
    });
    assert.doesNotMatch(html, /<svg onload=alert\(1\)>/);
    assert.match(html, /<tr class="row-ctx">/);
    assert.match(html, />\+0<\/dd>/);
    assert.match(html, />−0<\/dd>/);
  });

  it("includes added and deleted line markers in hunk tables", () => {
    const html = diffToHtml(`--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@ foo\n-old\n+new\n`);
    assert.match(html, /@@ -1 \+1 @@ foo/);
    assert.match(html, /<tr class="row-del">/);
    assert.match(html, /<tr class="row-add">/);
    assert.match(html, />old<\/td>/);
    assert.match(html, />new<\/td>/);
  });
});

describe("escapeHtml", () => {
  it("encodes the usual suspects", () => {
    assert.equal(escapeHtml(`<&"' >`), "&lt;&amp;&quot;&#39; &gt;");
  });
});
