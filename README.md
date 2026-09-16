# diff-postcard

Turn a unified git diff into a **shareable, single-file HTML postcard**.

Each file and hunk becomes a card. Typography is the point. Dark and light themes follow the system preference and can be toggled offline — the HTML is self-contained (inline CSS, no CDN, no tracking).

## Install

Requires Node.js 18+.

```bash
git clone https://github.com/78tacos/diff-postcard.git
cd diff-postcard
npm install
```

There are no runtime dependencies. `npm install` just makes the `diff-postcard` bin available locally. You can also run the script directly:

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

Open the generated HTML in any browser. The theme toggle stores the choice in `localStorage` when available and still works if you email or AirDrop the file.

## Demo

A checked-in multi-file diff lives at [`examples/sample.diff`](examples/sample.diff). Generate the matching postcard:

```bash
npm run demo
```

That writes [`examples/sample.html`](examples/sample.html). Open it locally:

```bash
# macOS
open examples/sample.html
# Linux
xdg-open examples/sample.html
```

The sample includes a modification, a rename, an add, a delete, a binary file, and escaped HTML in the diff text.

## Library

The parser and renderer are plain ESM with no build step:

```js
import { diffToHtml, parseUnifiedDiff, renderPostcard } from "diff-postcard";

const html = diffToHtml(diffText, { title: "Sprint 12", theme: "system" });
```

## Tests

```bash
npm test
```

Uses Node's built-in test runner (`node --test`). Coverage is the unified-diff parser plus HTML output assertions (cards, escaping, theme, no CDN).

## License

MIT © 78tacos
