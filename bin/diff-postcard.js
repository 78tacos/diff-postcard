#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseUnifiedDiff, renderPostcard } from "../src/index.js";

const VERSION = "1.0.0";

const HELP = `
diff-postcard — turn a unified git diff into a single-file HTML postcard

Usage:
  git diff | diff-postcard > postcard.html
  diff-postcard --file path/to.diff --out postcard.html
  diff-postcard path/to.diff -o postcard.html

Options:
  -f, --file <path>     Read diff from a file instead of stdin
  -o, --out <path>      Write HTML to a file instead of stdout
  -t, --title <text>    Postcard title (default: "Diff postcard")
      --theme <name>    system | light | dark  (default: system)
  -h, --help            Show this help
  -v, --version         Show version

Examples:
  git diff main...HEAD | npx diff-postcard --title "PR snapshot" > pr.html
  npm run demo
`.trim();

/**
 * @typedef {object} CliOptions
 * @property {string | null} file
 * @property {string | null} out
 * @property {string} title
 * @property {'system' | 'light' | 'dark'} theme
 * @property {boolean} help
 * @property {boolean} version
 */

/**
 * @param {string} value
 * @returns {'system' | 'light' | 'dark'}
 */
function parseTheme(value) {
  switch (value) {
    case "system":
    case "light":
    case "dark":
      return value;
    default:
      throw new Error(`Unknown theme "${value}". Use system, light, or dark.`);
  }
}

/**
 * @param {string[]} argv
 * @returns {CliOptions}
 */
export function parseArgs(argv) {
  /** @type {CliOptions} */
  const options = {
    file: null,
    out: null,
    title: "Diff postcard",
    theme: "system",
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      return value;
    };

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-v":
      case "--version":
        options.version = true;
        break;
      case "-f":
      case "--file":
        options.file = next();
        break;
      case "-o":
      case "--out":
        options.out = next();
        break;
      case "-t":
      case "--title":
        options.title = next();
        break;
      case "--theme":
        options.theme = parseTheme(next());
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (options.file) {
          throw new Error(`Unexpected extra argument: ${arg}`);
        }
        options.file = arg;
        break;
    }
  }

  return options;
}

/**
 * @returns {Promise<string>}
 */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * @param {string[]} argv
 */
export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (options.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  let diffText;
  if (options.file) {
    diffText = await readFile(options.file, "utf8");
  } else if (process.stdin.isTTY) {
    process.stderr.write("No diff provided. Pass --file or pipe a unified diff on stdin.\n\n");
    process.stderr.write(`${HELP}\n`);
    return 1;
  } else {
    diffText = await readStdin();
  }

  const html = renderPostcard(parseUnifiedDiff(diffText), {
    title: options.title,
    theme: options.theme,
  });

  if (options.out) {
    await writeFile(options.out, html, "utf8");
  } else {
    process.stdout.write(html);
  }
  return 0;
}

const isDirect =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirect) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
      process.exitCode = 1;
    },
  );
}
