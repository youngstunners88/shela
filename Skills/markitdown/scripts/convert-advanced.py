#!/usr/bin/env python3
"""
MarkItDown Advanced Converter
Python API with LLM integration support

Usage: python3 convert-advanced.py <input-file> [options]

Options:
  --output <path>          Output file path
  --llm                    Enable LLM for image descriptions
  --model <name>           LLM model name (default: gpt-4o-mini)
  --title                  Extract and print document title
  --json                   Output as JSON with metadata
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

# Add markitdown to path
sys.path.insert(0, "/home/workspace/markitdown/packages/markitdown/src")

from markitdown import MarkItDown


def main():
    parser = argparse.ArgumentParser(
        description="Convert files to markdown using MarkItDown",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 convert-advanced.py document.pdf
  python3 convert-advanced.py presentation.pptx --llm --model gpt-4o
  python3 convert-advanced.py image.png --llm --json
        """
    )
    
    parser.add_argument("input_file", help="Path to input file")
    parser.add_argument("-o", "--output", help="Output file path")
    parser.add_argument("--llm", action="store_true", help="Enable LLM for image descriptions")
    parser.add_argument("--model", default="gpt-4o-mini", help="LLM model name")
    parser.add_argument("--title", action="store_true", help="Extract and print document title")
    parser.add_argument("--json", action="store_true", help="Output as JSON with metadata")
    parser.add_argument("--docintel", help="Azure Document Intelligence endpoint")
    parser.add_argument("--plugins", action="store_true", help="Enable plugins")
    
    args = parser.parse_args()
    
    input_path = Path(args.input_file)
    
    if not input_path.exists():
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    # Build MarkItDown instance
    md_kwargs = {
        "enable_plugins": args.plugins,
    }
    
    if args.docintel:
        md_kwargs["docintel_endpoint"] = args.docintel
    
    if args.llm:
        try:
            from openai import OpenAI
            md_kwargs["llm_client"] = OpenAI()
            md_kwargs["llm_model"] = args.model
            print(f"Using LLM: {args.model}", file=sys.stderr)
        except ImportError:
            print("Warning: openai not installed, skipping LLM features", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Could not initialize OpenAI client: {e}", file=sys.stderr)
    
    md = MarkItDown(**md_kwargs)
    
    print(f"Converting: {input_path}", file=sys.stderr)
    
    # Convert
    result = md.convert(str(input_path))
    
    # Build output
    if args.json:
        output = {
            "content": result.text_content,
            "title": result.title,
            "filename": result.filename,
            "converted_at": datetime.now().isoformat(),
        }
        output_text = json.dumps(output, indent=2)
    else:
        if args.title and result.title:
            print(f"Title: {result.title}", file=sys.stderr)
        output_text = result.text_content
    
    # Write or print
    if args.output:
        output_path = Path(args.output)
        output_path.write_text(output_text, encoding="utf-8")
        size = len(output_text.encode("utf-8"))
        print(f"✓ Saved: {output_path} ({size} bytes)", file=sys.stderr)
    else:
        print(output_text)


if __name__ == "__main__":
    main()
