#!/usr/bin/env bun
/**
 * MarkItDown Batch Converter
 * Convert multiple files to Markdown in parallel
 */

import { parseArgs } from "util";
import { spawn } from "child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { basename, extname, join, relative, dirname } from "path";

const SUPPORTED_EXTENSIONS = [
  ".pdf", ".docx", ".doc", ".pptx", ".ppt",
  ".xlsx", ".xls", ".csv", ".html", ".htm",
  ".txt", ".json", ".xml", ".epub",
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp",
  ".mp3", ".wav", ".m4a", ".ogg",
  ".zip"
];

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
    recursive: { type: "boolean", short: "r" },
    pattern: { type: "string", short: "p" },
    parallel: { type: "string", short: "n" },
    plugins: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(`
MarkItDown Batch Converter - Convert multiple files to Markdown

Usage:
  bun batch.ts --input <dir> --output <dir> [options]

Options:
  -i, --input <dir>       Input directory (required)
  -o, --output <dir>      Output directory (required)
  -r, --recursive         Process subdirectories
  -p, --pattern <glob>    File pattern to match (default: all supported)
  -n, --parallel <num>    Number of parallel workers (default: 4)
  --plugins               Enable 3rd-party plugins
  -h, --help              Show this help

Examples:
  bun batch.ts -i ./documents -o ./markdown
  bun batch.ts -i ./docs -o ./md -r -n 8
  bun batch.ts -i ./reports -o ./notes --plugins
`);
  process.exit(0);
}

if (!values.input || !values.output) {
  console.error("Error: Both --input and --output are required");
  process.exit(1);
}

if (!existsSync(values.input)) {
  console.error(`Error: Input directory not found: ${values.input}`);
  process.exit(1);
}

// Ensure output directory exists
if (!existsSync(values.output)) {
  mkdirSync(values.output, { recursive: true });
}

const parallelCount = parseInt(values.parallel || "4", 10);
const usePlugins = values.plugins || false;

// Collect all files to process
const filesToProcess: { input: string; output: string; relativePath: string }[] = [];

function collectFiles(dir: string, baseDir: string) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && values.recursive) {
      collectFiles(fullPath, baseDir);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const relPath = relative(baseDir, fullPath);
        const outputRelPath = relPath.replace(ext, ".md");
        const outputPath = join(values.output!, outputRelPath);

        // Ensure output subdirectory exists
        const outputDir = dirname(outputPath);
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        filesToProcess.push({
          input: fullPath,
          output: outputPath,
          relativePath: relPath,
        });
      }
    }
  }
}

collectFiles(values.input, values.input);

console.log(`Found ${filesToProcess.length} files to convert`);
console.log(`Using ${parallelCount} parallel workers\n`);

// Process files in parallel with concurrency limit
async function processFile(file: typeof filesToProcess[0]): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [file.input, "-o", file.output];
    if (usePlugins) args.push("-p");

    const proc = spawn("markitdown", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error(`✗ Failed: ${file.relativePath}`);
        if (stderr) console.error(`  ${stderr.trim()}`);
        reject(new Error(`Conversion failed for ${file.input}`));
      } else {
        console.log(`✓ ${file.relativePath} → ${relative(values.output!, file.output)}`);
        resolve();
      }
    });
  });
}

async function runBatch() {
  const queue = [...filesToProcess];
  let completed = 0;
  let failed = 0;

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      try {
        await processFile(file);
        completed++;
      } catch {
        failed++;
      }
    }
  }

  const workers = Array(parallelCount).fill(null).map(worker);
  await Promise.all(workers);

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${filesToProcess.length}`);
  console.log(`Success: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Output: ${values.output}`);
}

runBatch().catch((err) => {
  console.error("Batch processing error:", err);
  process.exit(1);
});
