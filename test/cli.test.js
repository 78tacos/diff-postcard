import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArgs } from "../bin/diff-postcard.js";

describe("parseArgs", () => {
  it("accepts a positional file and long options", () => {
    const options = parseArgs([
      "examples/sample.diff",
      "--out",
      "out.html",
      "--title",
      "Hello",
      "--theme",
      "dark",
    ]);
    assert.equal(options.file, "examples/sample.diff");
    assert.equal(options.out, "out.html");
    assert.equal(options.title, "Hello");
    assert.equal(options.theme, "dark");
  });

  it("rejects unknown themes", () => {
    assert.throws(() => parseArgs(["--theme", "neon"]), /Unknown theme/);
  });
});
