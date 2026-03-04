#!/bin/bash
# Boot agent context - Initialize and load memory
# Usage: ./boot.sh <agent-id>

set -e

PAM_DIR="/home/workspace/persistent-agent-memory"

if [ -z "$1" ]; then
    echo "Usage: ./boot.sh <agent-id>"
    echo "Example: ./boot.sh main-assistant"
    exit 1
fi

AGENT_ID="$1"
MEMORY_DIR="$PAM_DIR/memory/agents/$AGENT_ID"

# Create memory directory if needed
mkdir -p "$MEMORY_DIR"

# Initialize databases if needed
if [ ! -f "$PAM_DIR/data/knowledge.db" ]; then
    echo "Initializing databases..."
    python3 "$PAM_DIR/scripts/init_databases.py"
fi

# Boot agent context
echo "Boot context for $AGENT_ID:"
echo "=============================="
python3 "$PAM_DIR/scripts/boot_agent.py" --agent-id "$AGENT_ID"

echo ""
echo "Memory files:"
echo "  Today: $MEMORY_DIR/$(date +%Y-%m-%d).md"
echo "  Yesterday: $MEMORY_DIR/$(date -d yesterday +%Y-%m-%d).md"
echo ""
echo "Shared brain files:"
ls -la "$PAM_DIR/shared-brain/"*.json 2>/dev/null | head -5 || echo "  No files yet"
