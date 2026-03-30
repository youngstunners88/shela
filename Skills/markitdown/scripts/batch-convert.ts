#!/usr/bin/env bun
/**
 * MarkItDown Batch Converter
 * Convert all supported files in a directory
 * 
 * Usage: bun batch-convert.ts <directory> [options]
 * Options:
 *   --ext <ext1,ext2>   Filter by extensions (pdf,docx,xlsx,etc)
 *   --recursive         Include subdirectories
 */

import { readdir, stat as fsStat } from "fs/promises";
import { join, extname, basename, relative } from "path";

const supportedExts = new Set([
  ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt",
  ".html", ".htm", ".csv", ".json", ".xml",
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp",
  ".mp3", ".wav", ".m4a", ".flac",
  ".epub", ".zip"
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const dir = args[0];
  
  if (!dir || dir.startsWith("--")) {
    console.error("Usage: bun batch-convert.ts <directory> [options]");
    console.error("");
    console.error("Options:");
    console.error("  --ext <exts>       Filter by extensions (pdf,docx,xlsx)");
    console.error("  --recursive        Include subdirectories");
    process.exit(1);
  }
  
  const extFilter = new Set<string>();
  const recursive = args.includes("--recursive");
  
  const extIdx = args.indexOf("--ext");
  if (extIdx !== -1 && args[extIdx + 1]) {
    for (const e of args[extIdx + 1].split(",")) {
      extFilter.add(e.toLowerCase().startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`);
    }
  }
  
  return { dir, extFilter, recursive };
}

async function findFiles(dir: string, recursive: boolean, extFilter: Set<string>): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory() && recursive) {
      files.push(...await findFiles(fullPath, recursive, extFilter));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (supportedExts.has(ext)) {
        if (extFilter.size === 0 || extFilter.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  return files;
}

async function convertFile(inputPath: string, outputDir: string): Promise<{ success: boolean; outputPath?: string }> {
  const base = basename(inputPath, extname(inputPath));
  const outputPath = join(outputDir, `${base}.md`);
  
  const proc = Bun.spawn({
    cmd: ["markitdown", inputPath, "-o", outputPath],
    stdout: "pipe",
    stderr: "pipe",
  });
  
  const exitCode = await proc.exited;
  
  if (exitCode === 0) {
    return { success: true, outputPath };
  } else {
    const error = await new Response(proc.stderr).text();
    console.error(`  ✗ Failed: ${error.slice(0, 100)}...`);
    return { success: false };
  }
}

async function main() {
  const { dir, extFilter, recursive } = parseArgs();
  
  // Resolve directory
  const targetDir = dir.startsWith("/") ? dir : join(process.cwd(), dir);
  
  const stats = await fsStat(targetDir).catch(() => null);
  if (!stats || !stats.isDirectory()) {
    console.error(`Error: Not a directory: ${targetDir}`);
    process.exit(1);
  }
  
  console.error(`Scanning: ${targetDir}${recursive ? " (recursive)" : ""}`);
  if (extFilter.size > 0) {
    console.error(`Filter: ${Array.from(extFilter).join(", ")}`);
  }
  
  // Find files
  const files = await findFiles(targetDir, recursive, extFilter);
  
  if (files.length === 0) {
    console.error("No supported files found.");
    console.error(`Supported: ${Array.from(supportedExts).join(", ")}`);
    process.exit(1);
  }
  
  console.error(`Found ${files.length} file(s) to convert`);
  console.error("");
  
  // Convert files
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    const relPath = relative(targetDir, file);
    console.error(`Converting: ${relPath}`);
    
    const result = await convertFile(file, dirname(file));
    
    if (result.success) {
      successCount++;
      const outputRel = relative(targetDir, result.outputPath!);
      console.error(`  ✓ ${outputRel}`);
    } else {
      failCount++;
    }
  }
  
  console.error("");
  console.error(`Done: ${successCount} converted, ${failCount} failed`);
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
