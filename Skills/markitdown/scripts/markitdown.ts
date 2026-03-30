#!/usr/bin/env bun
/**
 * MarkItDown Skill Script
 * Autonomous file-to-markdown conversion tool
 */

import { spawn } from "child_process";
import { existsSync } from "fs";

const MARKITDOWN_BIN = "markitdown";

interface ConvertOptions {
  output?: string;
  extension?: string;
  mimeType?: string;
  charset?: string;
  useDocIntel?: boolean;
  endpoint?: string;
  usePlugins?: boolean;
  keepDataUris?: boolean;
}

function runMarkItDown(input: string, options: ConvertOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const args: string[] = [];
    
    if (options.output) args.push("-o", options.output);
    if (options.extension) args.push("-x", options.extension);
    if (options.mimeType) args.push("-m", options.mimeType);
    if (options.charset) args.push("-c", options.charset);
    if (options.useDocIntel) args.push("-d");
    if (options.endpoint) args.push("-e", options.endpoint);
    if (options.usePlugins) args.push("-p");
    if (options.keepDataUris) args.push("--keep-data-uris");
    
    args.push(input);

    const proc = spawn(MARKITDOWN_BIN, args, { stdio: ["pipe", "pipe", "pipe"] });
    
    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => { stdout += data.toString(); });
    proc.stderr?.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`markitdown exited with code ${code}: ${stderr}`));
      } else {
        resolve(options.output ? `Converted to ${options.output}` : stdout);
      }
    });

    proc.on("error", (err) => reject(err));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const usage = `
Usage: bun markitdown.ts <command> [options]

Commands:
  convert <file>              Convert file to markdown
  batch <pattern>               Batch convert files (e.g., "*.pdf")
  list-plugins                  Show available plugins
  help                          Show this help

Options for convert:
  -o, --output <file>         Output file path
  -e, --extension <ext>         File extension hint
  -m, --mime-type <type>        MIME type hint
  -d, --doc-intel               Use Azure Document Intelligence
  -p, --plugins                 Enable 3rd-party plugins
  --keep-data-uris              Preserve base64 images

Examples:
  bun markitdown.ts convert document.pdf -o output.md
  bun markitdown.ts convert https://example.com/page.html
  bun markitdown.ts batch "*.pdf" -o ./converted/
`;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(usage);
    process.exit(0);
  }

  if (command === "list-plugins" || command === "--list-plugins") {
    try {
      const result = await runMarkItDown("", { output: undefined });
      // Actually call with list-plugins flag
      const proc = spawn(MARKITDOWN_BIN, ["--list-plugins"], { stdio: "inherit" });
    } catch (err) {
      console.error("Error listing plugins:", err);
    }
    return;
  }

  if (command === "convert") {
    const filePath = args[1];
    if (!filePath || !existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      console.error(`Usage: bun markitdown.ts convert <file> [options]`);
      process.exit(1);
    }

    const options: ConvertOptions = {};
    
    // Parse options
    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case "-o":
        case "--output":
          options.output = args[++i];
          break;
        case "-e":
        case "--extension":
          options.extension = args[++i];
          break;
        case "-m":
        case "--mime-type":
          options.mimeType = args[++i];
          break;
        case "-c":
        case "--charset":
          options.charset = args[++i];
          break;
        case "-d":
        case "--doc-intel":
          options.useDocIntel = true;
          break;
        case "--endpoint":
          options.endpoint = args[++i];
          break;
        case "-p":
        case "--plugins":
          options.usePlugins = true;
          break;
        case "--keep-data-uris":
          options.keepDataUris = true;
          break;
      }
    }

    try {
      const result = await runMarkItDown(filePath, options);
      console.log(result);
    } catch (err) {
      console.error("Conversion failed:", err);
      process.exit(1);
    }
    return;
  }

  if (command === "batch") {
    const pattern = args[1];
    if (!pattern) {
      console.error("Error: Pattern required (e.g., '*.pdf')");
      process.exit(1);
    }

    // Use shell globbing
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(`find . -name "${pattern}" -type f 2>/dev/null`);
      const files = stdout.trim().split("\n").filter(f => f);
      
      console.log(`Found ${files.length} files matching "${pattern}"`);
      
      for (const file of files) {
        const outputPath = `${file}.md`;
        console.log(`Converting: ${file} -> ${outputPath}`);
        try {
          await runMarkItDown(file, { output: outputPath });
        } catch (err) {
          console.error(`Failed to convert ${file}:`, err);
        }
      }
      console.log("Batch conversion complete.");
    } catch (err) {
      console.error("Batch conversion failed:", err);
      process.exit(1);
    }
    return;
  }

  console.log(`Unknown command: ${command}`);
  console.log(usage);
  process.exit(1);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
