---
name: markitdown
description: Convert any file to Markdown using Microsoft's MarkItDown tool. Supports PDF, Word, Excel, PowerPoint, images, audio, HTML, YouTube, and more. Perfect for LLM ingestion pipelines.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  version: "1.0.0"
---

# MarkItDown Skill

Convert any file to clean Markdown format for LLM processing, analysis, and archiving.

## Quick Start

```bash
# Convert a single file
bun /home/workspace/Skills/markitdown/scripts/convert.ts --input path/to/file.pdf --output output.md

# Convert with auto-detection
bun /home/workspace/Skills/markitdown/scripts/convert.ts --input path/to/file.docx

# Batch convert a directory
bun /home/workspace/Skills/markitdown/scripts/batch.ts --input /path/to/docs --output /path/to/markdown/
```

## Supported Formats

| Format | Extensions | Notes |
|--------|------------|-------|
| PDF | .pdf | Full text extraction with structure |
| Word | .docx, .doc | Preserves headings, tables, formatting |
| Excel | .xlsx, .xls | Tables converted to Markdown tables |
| PowerPoint | .pptx | Slides as sections |
| Images | .jpg, .png, .gif | OCR + EXIF metadata |
| Audio | .mp3, .wav | Speech-to-text transcription |
| HTML | .html, .htm | Clean extraction of main content |
| Text | .txt, .csv, .json, .xml | Structured Markdown output |
| YouTube | URLs | Video transcript extraction |
| EPUB | .epub | E-book conversion |
| ZIP | .zip | Iterates and converts all contents |

## CLI Reference

### Single File Conversion

```bash
bun /home/workspace/Skills/markitdown/scripts/convert.ts [options]

Options:
  --input, -i      Input file path (required)
  --output, -o     Output file path (optional, defaults to stdout)
  --extension, -x  Force file type (e.g., "pdf", "docx")
  --plugins, -p    Enable 3rd-party plugins
  --prompt         Custom prompt for image/audio LLM descriptions
```

### Batch Conversion

```bash
bun /home/workspace/Skills/markitdown/scripts/batch.ts [options]

Options:
  --input, -i      Input directory (required)
  --output, -o     Output directory (required)
  --recursive, -r  Process subdirectories
  --pattern, -p    File pattern to match (default: "*")
  --parallel, -n   Number of parallel workers (default: 4)
```

### List Plugins

```bash
markitdown --list-plugins
```

## Autonomous Prompting Patterns

### Pattern 1: Ingest Document for Analysis

```
Convert this file to Markdown, then analyze its content:
- Extract key insights
- Summarize main points
- Identify action items

File: {{FILE_PATH}}
```

### Pattern 2: Batch Archive Documents

```
Convert all files in {{DIRECTORY}} to Markdown and save to {{OUTPUT_DIR}}.
Preserve the original directory structure.
Include metadata about each file in a YAML frontmatter block.
```

### Pattern 3: Extract Tables from Excel/PDF

```
Convert {{SPREADSHEET}} to Markdown with focus on:
- All tables formatted as proper Markdown tables
- Headers preserved
- Data types inferred where possible
```

### Pattern 4: YouTube to Notes

```
Convert this YouTube URL to a structured note:
{{YOUTUBE_URL}}

Format as:
# {{TITLE}}

## Summary
{{SUMMARY}}

## Key Points
- Point 1
- Point 2
...

## Full Transcript
{{TRANSCRIPT}}
```

## Python API Usage

```python
from markitdown import MarkItDown

# Basic conversion
md = MarkItDown()
result = md.convert("document.pdf")
print(result.text_content)

# With LLM for image descriptions
from openai import OpenAI
client = OpenAI()
md = MarkItDown(llm_client=client, llm_model="gpt-4o")
result = md.convert("image.jpg")

# With plugins
md = MarkItDown(enable_plugins=True)
result = md.convert("document.pdf")
```

## Advanced: Azure Document Intelligence

For better PDF/scan quality, use Azure Document Intelligence:

1. Set environment variables:
   ```bash
   export AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
   export AZURE_DOCUMENT_INTELLIGENCE_KEY="your-key"
   ```

2. Use with conversion:
   ```bash
   markitdown document.pdf -d -e "$AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"
   ```

## Integration Examples

### With File Watcher (Auto-convert)

```bash
# Watch a folder and auto-convert new files
bun /home/workspace/Skills/markitdown/scripts/watch.ts --input /incoming --output /processed
```

### In Data Pipelines

```python
# Convert before vectorization
from markitdown import MarkItDown

def ingest_document(file_path):
    md = MarkItDown()
    result = md.convert(file_path)
    return {
        "content": result.text_content,
        "title": result.title,
        "metadata": result.metadata
    }
```

## Output Structure

The conversion result includes:
- `text_content` - The Markdown text
- `title` - Document title (if extractable)
- `metadata` - File metadata (EXIF, document properties, etc.)

## Tips

- Use `-x` flag when reading from stdin to hint file type
- Enable plugins for OCR support in documents with images
- For scanned PDFs, Azure Document Intelligence gives best results
- Batch operations preserve relative paths in output directory
- Markdown output is optimized for token efficiency in LLMs
