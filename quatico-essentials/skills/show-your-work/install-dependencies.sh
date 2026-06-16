#!/bin/bash
# Install show-your-work dependencies (macOS + Homebrew)
set -euo pipefail

echo "Installing show-your-work dependencies..."

# uv (Python package runner — provides uvx)
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    brew install uv
else
    echo "uv: already installed ($(uv --version))"
fi

# Graphviz (optional — for rendering dot diagrams in demos)
if ! command -v dot &> /dev/null; then
    echo "Installing graphviz..."
    brew install graphviz
else
    echo "graphviz: already installed"
fi

# Verify showboat and rodney are fetchable
echo ""
echo "Verifying tools (fetched on demand via uvx)..."
uvx showboat --version
uvx rodney --version

echo ""
echo "All dependencies installed. Ready to use 'show your work'."
