#!/usr/bin/env python3
"""
MarkItDown conversion script for Zo Skill.
Converts any file to Markdown for LLM consumption.
"""

import argparse
import sys
import os
from pathlib import Path

# Import after installation check
try:
    from markitdown import MarkItDown
except ImportError:
    print("Error: markitdown not installed. Run: pip install 'markitdown[all]'", file=sys.stderr)
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Convert any file to Markdown using MarkItDown"
    )
    parser.add_argument("input", help="Input file path or URL")
    parser.add_argument("output", nargs="?", help="Output markdown file (optional, defaults to stdout)")
    parser.add_argument("--use-plugins", action="store_true", help="Enable 3rd-party plugins")
    parser.add_argument("--docintel", action="store_true", help="Use Azure Document Intelligence")
    parser.add_argument("--endpoint", help="Azure Document Intelligence endpoint")
    parser.add_argument("--llm-api-key", help="OpenAI API key for image descriptions")
    parser.add_argument("--llm-model", default="gpt-4o", help="LLM model for image descriptions")
    parser.add_argument("--list-plugins", action="store_true", help="List available plugins")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Initialize MarkItDown
    md_kwargs = {"enable_plugins": args.use_plugins}
    
    # Add Azure Document Intelligence if requested
    if args.docintel:
        if not args.endpoint:
            print("Error: --endpoint required when using --docintel", file=sys.stderr)
            sys.exit(1)
        md_kwargs["docintel_endpoint"] = args.endpoint
    
    # Add LLM client if API key provided
    if args.llm_api_key and args.llm_model:
        try:
            from openai import OpenAI
            md_kwargs["llm_client"] = OpenAI(api_key=args.llm_api_key)
            md_kwargs["llm_model"] = args.llm_model
        except ImportError:
            print("Warning: openai package not installed, LLM features disabled", file=sys.stderr)
    
    md = MarkItDown(**md_kwargs)
    
    # List plugins if requested
    if args.list_plugins:
        plugins = md._plugins if hasattr(md, '_plugins') else []
        if plugins:
            print("Available plugins:")
            for plugin in plugins:
                print(f"  - {plugin}")
        else:
            print("No plugins available/loaded")
        sys.exit(0)
    
    # Check input file exists (if not a URL)
    if not args.input.startswith("http") and not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    # Convert file
    if args.verbose:
        print(f"Converting: {args.input}...", file=sys.stderr)
    
    try:
        result = md.convert(args.input)
    except Exception as e:
        print(f"Error during conversion: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Output result
    output = result.text_content
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        if args.verbose:
            print(f"Written to: {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
