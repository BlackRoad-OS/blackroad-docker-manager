#!/bin/bash
# BlackRoad Docker Manager - Hash Generation Script
# Generates SHA-256 hashes for all files in the repository

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
OUTPUT_DIR="kanban/state"
OUTPUT_FILE="$OUTPUT_DIR/file_hashes.json"
MANIFEST_FILE="$OUTPUT_DIR/manifest.txt"

# Excluded patterns
EXCLUDE_PATTERNS=(
    ".git"
    "node_modules"
    "__pycache__"
    "*.pyc"
    ".env"
    ".env.*"
    "*.log"
    ".DS_Store"
)

echo "========================================"
echo "   BlackRoad Hash Generation"
echo "========================================"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build exclude arguments for find
EXCLUDE_ARGS=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS -not -path '*/$pattern' -not -path '*/$pattern/*' -not -name '$pattern'"
done

echo -e "${BLUE}Scanning files...${NC}"

# Generate manifest with hashes
echo "# BlackRoad File Hash Manifest" > "$MANIFEST_FILE"
echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$MANIFEST_FILE"
echo "" >> "$MANIFEST_FILE"

# Count files
FILE_COUNT=0

# Find and hash files
find . -type f \
    -not -path "./.git/*" \
    -not -path "./node_modules/*" \
    -not -path "./__pycache__/*" \
    -not -name "*.pyc" \
    -not -name ".DS_Store" \
    -not -name "*.log" \
    | sort | while read -r file; do

    # Skip if file doesn't exist or is empty
    [ -f "$file" ] || continue

    # Generate hash
    hash=$(sha256sum "$file" | cut -d' ' -f1)
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")

    # Write to manifest
    echo "$hash  $file  $size" >> "$MANIFEST_FILE"

    FILE_COUNT=$((FILE_COUNT + 1))
done

echo -e "${GREEN}Generated hashes for files${NC}"
echo ""

# Generate JSON output
echo -e "${BLUE}Creating JSON manifest...${NC}"

python3 << 'PYTHON_SCRIPT'
import json
import os
from datetime import datetime

manifest_file = "kanban/state/manifest.txt"
output_file = "kanban/state/file_hashes.json"

files = {}
total_size = 0

with open(manifest_file, 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        parts = line.split('  ')
        if len(parts) >= 2:
            hash_val = parts[0]
            file_path = parts[1]
            size = int(parts[2]) if len(parts) > 2 else 0

            files[file_path] = {
                'hash': hash_val,
                'size': size
            }
            total_size += size

# Calculate overall hash
import hashlib
all_hashes = ''.join(sorted([f['hash'] for f in files.values()]))
manifest_hash = hashlib.sha256(all_hashes.encode()).hexdigest()

output = {
    'version': '1.0',
    'generated': datetime.utcnow().isoformat() + 'Z',
    'file_count': len(files),
    'total_size': total_size,
    'manifest_hash': manifest_hash,
    'files': files
}

with open(output_file, 'w') as f:
    json.dump(output, f, indent=2)

print(f"Files hashed: {len(files)}")
print(f"Total size: {total_size:,} bytes")
print(f"Manifest hash: {manifest_hash[:16]}...")
PYTHON_SCRIPT

echo ""
echo -e "${GREEN}Hash generation complete!${NC}"
echo ""
echo "Output files:"
echo "  - $MANIFEST_FILE (text format)"
echo "  - $OUTPUT_FILE (JSON format)"
echo ""

# Show summary
if [ -f "$OUTPUT_FILE" ]; then
    echo "Summary:"
    python3 -c "
import json
with open('$OUTPUT_FILE', 'r') as f:
    data = json.load(f)
print(f\"  Files: {data['file_count']}\")
print(f\"  Size: {data['total_size']:,} bytes\")
print(f\"  Manifest Hash: {data['manifest_hash'][:32]}...\")
"
fi
