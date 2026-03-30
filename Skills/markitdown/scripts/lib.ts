/**
 * MarkItDown Library for TypeScript/JavaScript
 * Programmatic interface to Microsoft's markitdown
 */

import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

export interface ConversionOptions {
  /** Enable OCR for images in documents */
  ocr?: boolean;
  /** Azure Document Intelligence endpoint */
  azureEndpoint?: string;
  /** Enable plugin support */
  plugins?: boolean;
  /** Custom LLM model for OCR/image descriptions */
  llmModel?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface ConversionResult {
  /** The markdown content */
  content: string;
  /** Original file path */
  source: string;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Convert a single file to markdown
 * @param inputPath - Path to the file to convert
 * @param options - Conversion options
 * @returns Promise with the conversion result
 */
export async function convertToMarkdown(
  inputPath: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const absolutePath = resolve(inputPath);
  
  if (!existsSync(absolutePath)) {
    return {
      content: "",
      source: inputPath,
      success: false,
      error: `File not found: ${inputPath}`,
    };
  }

  const pythonCode = buildPythonCode(absolutePath, options);
  
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-c", pythonCode], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    let output = "";
    let error = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      error += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        resolve({
          content: "",
          source: inputPath,
          success: false,
          error: error || `Process exited with code ${code}`,
        });
      } else {
        resolve({
          content: output,
          source: inputPath,
          success: true,
        });
      }
    });

    // Handle timeout
    if (options.timeout) {
      setTimeout(() => {
        proc.kill();
        resolve({
          content: output,
          source: inputPath,
          success: false,
          error: `Timeout after ${options.timeout}ms`,
        });
      }, options.timeout);
    }
  });
}

/**
 * Convert multiple files to markdown
 * @param inputPaths - Array of file paths
 * @param options - Conversion options
 * @returns Promise with array of results
 */
export async function batchConvert(
  inputPaths: string[],
  options: ConversionOptions = {}
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  
  for (const path of inputPaths) {
    const result = await convertToMarkdown(path, options);
    results.push(result);
  }
  
  return results;
}

/**
 * Convert and return content suitable for LLM context
 * @param inputPath - Path to the file
 * @param options - Conversion options
 * @returns The markdown content or null on failure
 */
export async function extractForLLM(
  inputPath: string,
  options: ConversionOptions = {}
): Promise<string | null> {
  const result = await convertToMarkdown(inputPath, options);
  return result.success ? result.content : null;
}

function buildPythonCode(inputPath: string, options: ConversionOptions): string {
  const ocrEnabled = options.ocr && process.env.OPENAI_API_KEY;
  const azureEnabled = options.azureEndpoint || process.env.AZURE_DOC_INTEL_ENDPOINT;
  
  let mdInit = "md = MarkItDown(";
  const params: string[] = [];
  
  if (options.plugins) {
    params.push("enable_plugins=True");
  }
  
  if (azureEnabled) {
    params.push(`docintel_endpoint="${azureEnabled}"`);
  }
  
  mdInit += params.join(", ") + ")";
  
  return `
import sys
import os

markitdown_path = "/home/workspace/markitdown/packages/markitdown/src"
if os.path.exists(markitdown_path):
    sys.path.insert(0, markitdown_path)

from markitdown import MarkItDown

${ocrEnabled ? `
from openai import OpenAI
client = OpenAI()
md = MarkItDown(
    ${options.plugins ? "enable_plugins=True, " : ""}llm_client=client, llm_model="${options.llmModel || "gpt-4o"}"
)
` : mdInit === "md = MarkItDown()" ? "md = MarkItDown()" : mdInit}

try:
    result = md.convert("${inputPath}")
    print(result.text_content)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;
}

// CLI usage
if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: bun run lib.ts <file-path> [--ocr]");
    process.exit(1);
  }
  
  const filePath = args[0];
  const useOcr = args.includes("--ocr");
  
  const result = await convertToMarkdown(filePath, { ocr: useOcr });
  
  if (result.success) {
    console.log(result.content);
  } else {
    console.error(result.error);
    process.exit(1);
  }
}
