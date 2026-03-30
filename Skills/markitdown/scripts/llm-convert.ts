#!/usr/bin/env bun
/**
 * MarkItDown LLM-Optimized Converter
 * 
 * Converts files to markdown with metadata headers optimized for LLM context.
 * Adds document type, source, timestamp, and optional context.
 * 
 * Usage: bun llm-convert.ts <input-file> [options]
 * Options:
 *   --context <text>     Add context description
 *   --source <text>      Override source attribution
 *   --no-meta           Skip metadata header
 */

import { basename, extname, dirname, join } from "path";
import { stat as fsStat } from "fs/promises";

interface Metadata {
  source: string;
  type: string;
  converted_at: string;
  context?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const inputFile = args[0];
  
  if (!inputFile || inputFile.startsWith("--")) {
    console.error("Usage: bun llm-convert.ts <input-file> [options]");
    console.error("");
    console.error("Options:");
    console.error("  --context <text>   Add context description");
    console.error("  --source <text>    Override source attribution");
    console.error("  --no-meta          Skip metadata header");
    process.exit(1);
  }
  
  const contextIdx = args.indexOf("--context");
  const context = contextIdx !== -1 ? args[contextIdx + 1] : undefined;
  
  const sourceIdx = args.indexOf("--source");
  const sourceOverride = sourceIdx !== -1 ? args[sourceIdx + 1] : undefined;
  
  const noMeta = args.includes("--no-meta");
  
  return { inputFile, context, sourceOverride, noMeta };
}

function generateMetadataHeader(meta: Metadata): string {
  const lines = [
    "---",
    `source: ${meta.source}`,
    `type: ${meta.type}`,
    `converted_at: ${meta.converted_at}`,
  ];
  
  if (meta.context) {
    lines.push(`context: ${meta.context}`);
  }
  
  lines.push("---");
  lines.push("");
  
  return lines.join("\n");
}

function getDocType(ext: string): string {
  const typeMap: Record<string, string> = {
    ".pdf": "PDF Document",
    ".docx": "Microsoft Word",
    ".doc": "Microsoft Word",
    ".xlsx": "Excel Spreadsheet",
    ".xls": "Excel Spreadsheet",
    ".pptx": "PowerPoint Presentation",
    ".ppt": "PowerPoint Presentation",
    ".html": "HTML Document",
    ".htm": "HTML Document",
    ".csv": "CSV Data",
    ".json": "JSON Data",
    ".xml": "XML Data",
    ".jpg": "JPEG Image",
    ".jpeg": "JPEG Image",
    ".png": "PNG Image",
    ".gif": "GIF Image",
    ".mp3": "MP3 Audio",
    ".wav": "WAV Audio",
    ".epub": "EPUB E-book",
    ".zip": "ZIP Archive",
  };
  
  return typeMap[ext.toLowerCase()] || "Unknown Document";
}

async function main() {
  const { inputFile, context, sourceOverride, noMeta } = parseArgs();
  
  // Resolve input path
  const inputPath = inputFile.startsWith("/") 
    ? inputFile 
    : join(process.cwd(), inputFile);
  
  // Check file exists
  const stats = await fsStat(inputPath).catch(() => null);
  if (!stats || !stats.isFile()) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }
  
  const ext = extname(inputPath);
  const base = basename(inputPath, ext);
  const outputPath = join(dirname(inputPath), `${base}.md`);
  
  console.error(`Converting: ${inputPath}`);
  
  // Run markitdown to get content
  const proc = Bun.spawn({
    cmd: ["markitdown", inputPath],
    stdout: "pipe",
    stderr: "pipe",
  });
  
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    const error = await new Response(proc.stderr).text();
    console.error(`Conversion failed: ${error}`);
    process.exit(exitCode);
  }
  
  let content = await new Response(proc.stdout).text();
  
  // Add metadata header
  if (!noMeta) {
    const metadata: Metadata = {
      source: sourceOverride || basename(inputPath),
      type: getDocType(ext),
      converted_at: new Date().toISOString(),
    };
    
    if (context) {
      metadata.context = context;
    }
    
    const header = generateMetadataHeader(metadata);
    content = header + content;
  }
  
  // Write output
  await Bun.write(outputPath, content);
  
  console.error(`✓ Saved: ${outputPath}`);
  console.error(`  Size: ${content.length} characters`);
  console.error(`  Type: ${getDocType(ext)}`);
  if (context) {
    console.error(`  Context: ${context}`);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
