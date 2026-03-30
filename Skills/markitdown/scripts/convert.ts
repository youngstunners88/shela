#!/usr/bin/env bun
/**
 * MarkItDown Converter - Single file conversion
 * Convert any file to Markdown format
 */

import { parseArgs } from "util";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { basename, extname, join, dirname } from "path";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    extension: { type: "string", short: "x" },
    "mime-type": { type: "string", short: "m" },
    charset: { type: "string", short: "c" },
    plugins: { type: "boolean", short: "p" },
    prompt: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (values.help || (!values.input && positionals.length === 0)) {
  console.log(`
MarkItDown Converter - Convert any file to Markdown

Usage:
  bun convert.ts --input <file> [options]
  bun convert.ts <file> [options]

Options:
  -i, --input <path>      Input file path (required if not positional)
  -o, --output <path>     Output file path (default: stdout)
  -x, --extension <ext>   Force file extension hint (e.g., "pdf")
  -m, --mime-type <type>  Force MIME type hint
  -c, --charset <charset> Force charset hint (e.g., "UTF-8")
  -p, --plugins           Enable 3rd-party plugins
  --prompt <text>         Custom prompt for image/audio descriptions
  -h, --help              Show this help

Examples:
  bun convert.ts --input report.pdf --output report.md
  bun convert.ts presentation.pptx -o notes.md
  bun convert.ts --input document.docx --plugins
`);
  process.exit(0);
}

const inputPath = values.input || positionals[0];

if (!inputPath) {
  console.error("Error: Input file is required");
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.error(`Error: File not found: ${inputPath}`);
  process.exit(1);
}

// Build markitdown command arguments
const args: string[] = [inputPath];

if (values.output) {
  args.push("-o", values.output);
}

if (values.extension) {
  args.push("-x", values.extension);
}

if (values["mime-type"]) {
  args.push("-m", values["mime-type"]);
}

if (values.charset) {
  args.push("-c", values.charset);
}

if (values.plugins) {
  args.push("-p");
}

// Execute markitdown
const proc = spawn("markitdown", args, {
  stdio: ["inherit", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

proc.stdout.on("data", (data) => {
  stdout += data.toString();
});

proc.stderr.on("data", (data) => {
  stderr += data.toString();
});

proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`Conversion failed (exit ${code}):`);
    if (stderr) console.error(stderr);
    process.exit(code || 1);
  }

  // If output was specified, markitdown already wrote to file
  // If not, we need to output the result
  if (!values.output) {
    console.log(stdout);
  } else {
    console.log(`✓ Converted: ${inputPath} → ${values.output}`);
  }
});
