#!/usr/bin/env bun
/**
 * MarkItDown CLI Wrapper
 * Converts any document to Markdown using Microsoft MarkItDown
 *
 * Usage: markit-down <file> [options]
 *        markit-down --help
 */

import { parseArgs } from "util";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const helpText = `
markit-down - Convert documents to Markdown

USAGE:
  markit-down <file> [options]
  cat file.pdf | markit-down [options]

ARGUMENTS:
  file                    Path to file to convert

OPTIONS:
  -o, --output <path>     Output file (default: stdout)
  -d, --docintel          Use Azure Document Intelligence
  -e, --endpoint <url>    Azure Document Intelligence endpoint
  -p, --plugins           Enable 3rd party plugins
  --list-plugins          List available plugins
  --pipe                  Read from stdin
  -h, --help              Show this help

EXAMPLES:
  markit-down document.pdf
  markit-down report.docx -o report.md
  markit-down scan.pdf -d -e "https://..."
  for f in *.pdf; do markit-down "$f" -o "${f%.pdf}.md"; done

SUPPORTED FORMATS:
  PDF, DOCX, PPTX, XLSX, HTML, EPUB, Images, Audio,
  JSON, CSV, XML, ZIP, YouTube URLs
`;

// Parse arguments
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    output: { type: "string", short: "o" },
    docintel: { type: "boolean", short: "d" },
    endpoint: { type: "string", short: "e" },
    plugins: { type: "boolean", short: "p" },
    "list-plugins": { type: "boolean" },
    pipe: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(helpText);
  process.exit(0);
}

// Check if markitdown is installed
const checkMarkItDown = (): boolean => {
  try {
    const result = Bun.spawnSync(["python3", "-c", "import markitdown; print('ok')"]);
    return result.success;
  } catch {
    return false;
  }
};

if (!checkMarkItDown()) {
  console.error("Error: MarkItDown not installed.");
  console.error("Run: pip install 'markitdown[all]'");
  process.exit(1);
}

// Build Python command
const inputFile = positionals[0];
const useStdin = values.pipe || (!inputFile && !values["list-plugins"]);

if (!inputFile && !useStdin && !values["list-plugins"]) {
  console.error("Error: No input file specified. Use --help for usage.");
  process.exit(1);
}

if (inputFile && !existsSync(resolve(inputFile))) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

// Build command arguments
const args: string[] = [
  "-m",
  "markitdown",
];

if (values.output) args.push("-o", values.output);
if (values.docintel) args.push("-d");
if (values.endpoint) args.push("-e", values.endpoint);
if (values.plugins) args.push("--use-plugins");
if (values["list-plugins"]) args.push("--list-plugins");

if (inputFile) {
  args.push(resolve(inputFile));
}

// Execute
const proc = spawn("python3", args, {
  stdio: useStdin ? ["pipe", "inherit", "inherit"] : ["inherit", "inherit", "inherit"],
});

if (useStdin) {
  process.stdin.pipe(proc.stdin);
}

proc.on("close", (code) => {
  process.exit(code ?? 0);
});
