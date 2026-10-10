# diff-postcard

Turn a unified git diff into a single-file HTML postcard.

Each file is a card. Light and dark themes follow the system preference, and the page has a toggle that works offline. The CSS is inlined: no CDN, no tracking.

## Install

Requires Node.js 18+. There are no runtime dependencies.

```bash
git clone https://github.com/78tacos/diff-postcard.git
cd diff-postcard
npm install
```

`npm install` links the `diff-postcard` command in this checkout. You can also run the script directly:

```bash
node bin/diff-postcard.js --help
```

## Usage

Pipe a diff, or pass a file:

```bash
git diff | node bin/diff-postcard.js > postcard.html
git diff main...HEAD | node bin/diff-postcard.js --title "PR snapshot" -o postcard.html
node bin/diff-postcard.js --file examples/sample.diff --out postcard.html
node bin/diff-postcard.js examples/sample.diff -o postcard.html
```

Options:

| Flag | Meaning |
| --- | --- |
| `path/to.diff` | Positional path to a unified diff (same as `--file`) |
| `-f, --file <path>` | Read the unified diff from a file instead of stdin |
| `-o, --out <path>` | Write HTML to a file instead of stdout |
| `-t, --title <text>` | Postcard title (default: `Diff postcard`) |
| `--theme <name>` | `system` (default), `light`, or `dark` |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

Open the HTML in a browser. The theme toggle stores the choice in `localStorage` when it can. The file does not need a network connection.

## Demo

[`examples/sample.diff`](examples/sample.diff) is a small diff: a modification, a rename, an add, a delete, a binary file, and text that has to be escaped. Generate the postcard:

```bash
npm run demo
```

That writes `examples/sample.html`. Open it locally:

```bash
# macOS
open examples/sample.html
# Linux
xdg-open examples/sample.html
```

## Library

The parser and renderer are plain ESM, with no build step:

```js
import { diffToHtml, parseUnifiedDiff, renderPostcard } from "diff-postcard";

const html = diffToHtml(diffText, { title: "Sprint 12", theme: "system" });
```

## Tests

```bash
npm test
```

Tests use Node's built-in runner (`node --test`).

## License

MIT © 78tacos
