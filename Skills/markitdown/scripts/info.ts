#!/usr/bin/env bun
/**
 * MarkItDown Info - Get information about supported formats and plugins
 */

import { spawn } from "child_process";

const SUPPORTED_FORMATS = `
Supported File Formats:
========================

Documents:
  • PDF (.pdf) - Full text extraction with structure
  • Word (.docx, .doc) - Preserves headings, tables, formatting
  • PowerPoint (.pptx, .ppt) - Slides as sections
  • EPUB (.epub) - E-book conversion

Spreadsheets:
  • Excel (.xlsx, .xls) - Tables as Markdown tables
  • CSV (.csv) - Structured Markdown output

Web & Text:
  • HTML (.html, .htm) - Clean content extraction
  • Text (.txt) - Plain text
  • JSON (.json) - Structured output
  • XML (.xml) - Structured output

Media:
  • Images (.jpg, .jpeg, .png, .gif, .bmp, .webp)
    - OCR text extraction
    - EXIF metadata
    - Optional LLM descriptions
  • Audio (.mp3, .wav, .m4a, .ogg)
    - Speech-to-text transcription
    - EXIF metadata

Other:
  • YouTube URLs - Video transcript extraction
  • ZIP files (.zip) - Iterates and converts contents
  • Wikipedia URLs - Article extraction
`;

function showFormats() {
  console.log(SUPPORTED_FORMATS);
}

async function listPlugins() {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("markitdown", ["--list-plugins"], {
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to list plugins (exit ${code})`));
    });
  });
}

async function showVersion() {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn("markitdown", ["--version"], {
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to get version (exit ${code})`));
    });
  });
}

// CLI
const { values } = await import("util").then(m => m.parseArgs({
  args: Bun.argv.slice(2),
  options: {
    formats: { type: "boolean" },
    plugins: { type: "boolean" },
    version: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
}));

if (values.help || (!values.formats && !values.plugins && !values.version)) {
  console.log(`
MarkItDown Info - Get information about the tool

Usage:
  bun info.ts [options]

Options:
  --formats    Show supported file formats
  --plugins    List available plugins
  --version    Show version information
  -h, --help   Show this help

Examples:
  bun info.ts --formats
  bun info.ts --plugins
`);
  process.exit(0);
}

if (values.formats) {
  showFormats();
}

if (values.plugins) {
  await listPlugins();
}

if (values.version) {
  await showVersion();
}
