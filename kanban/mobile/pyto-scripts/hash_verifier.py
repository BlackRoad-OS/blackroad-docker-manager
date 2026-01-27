#!/usr/bin/env python3
"""
Hash Verifier for Pyto (iOS)

Verify file and task hashes from your iOS device.
"""

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path


class MobileHasher:
    """Simplified hasher for mobile use."""

    def __init__(self, base_path=None):
        self.base_path = base_path or self._find_repo()

    def _find_repo(self):
        """Find the repository path."""
        locations = [
            '/iCloud/blackroad-docker-manager',
            '~/blackroad-docker-manager',
            '.'
        ]
        for loc in locations:
            expanded = os.path.expanduser(loc)
            if os.path.isdir(expanded):
                return expanded
        return '.'

    def hash_file(self, file_path):
        """Compute SHA-256 hash of a file."""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    def hash_string(self, content):
        """Compute SHA-256 hash of a string."""
        return hashlib.sha256(content.encode()).hexdigest()

    def verify_file(self, file_path, expected_hash):
        """Verify a file against an expected hash."""
        actual_hash = self.hash_file(file_path)
        return actual_hash == expected_hash, actual_hash

    def scan_directory(self, directory=None):
        """Scan directory and generate hashes."""
        directory = directory or self.base_path
        results = {}

        exclude = ['.git', '__pycache__', 'node_modules', '.env']

        for root, dirs, files in os.walk(directory):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude]

            for file in files:
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, directory)

                try:
                    file_hash = self.hash_file(file_path)
                    results[relative_path] = {
                        'hash': file_hash,
                        'size': os.path.getsize(file_path)
                    }
                except Exception as e:
                    results[relative_path] = {
                        'error': str(e)
                    }

        return results

    def compare_manifests(self, old_manifest, new_manifest):
        """Compare two manifests and show differences."""
        added = []
        removed = []
        modified = []
        unchanged = []

        old_files = set(old_manifest.keys())
        new_files = set(new_manifest.keys())

        for f in new_files - old_files:
            added.append(f)

        for f in old_files - new_files:
            removed.append(f)

        for f in old_files & new_files:
            if old_manifest[f].get('hash') != new_manifest[f].get('hash'):
                modified.append(f)
            else:
                unchanged.append(f)

        return {
            'added': added,
            'removed': removed,
            'modified': modified,
            'unchanged': unchanged,
            'total_changes': len(added) + len(removed) + len(modified)
        }


def display_menu():
    """Display the main menu."""
    print("\n" + "=" * 40)
    print("    BLACKROAD HASH VERIFIER")
    print("=" * 40)
    print("1. Hash a single file")
    print("2. Scan directory")
    print("3. Verify file against hash")
    print("4. Generate manifest")
    print("5. Compare with saved manifest")
    print("6. Hash text input")
    print("0. Exit")
    print("=" * 40)


def main():
    """Main entry point."""
    hasher = MobileHasher()

    while True:
        display_menu()

        try:
            choice = input("\nChoice: ").strip()
        except EOFError:
            break

        if choice == '0':
            print("Goodbye!")
            break

        elif choice == '1':
            # Hash single file
            file_path = input("File path: ").strip()
            file_path = os.path.expanduser(file_path)

            if os.path.exists(file_path):
                file_hash = hasher.hash_file(file_path)
                print(f"\nSHA-256: {file_hash}")
                print(f"Size: {os.path.getsize(file_path)} bytes")
            else:
                print(f"File not found: {file_path}")

        elif choice == '2':
            # Scan directory
            directory = input(f"Directory [{hasher.base_path}]: ").strip()
            if not directory:
                directory = hasher.base_path
            directory = os.path.expanduser(directory)

            print(f"\nScanning {directory}...")
            results = hasher.scan_directory(directory)

            print(f"\nFound {len(results)} files:")
            for path, info in sorted(results.items())[:20]:
                if 'error' in info:
                    print(f"  ❌ {path}: {info['error']}")
                else:
                    print(f"  ✓ {path}: {info['hash'][:16]}...")

            if len(results) > 20:
                print(f"  ... and {len(results) - 20} more")

        elif choice == '3':
            # Verify file
            file_path = input("File path: ").strip()
            expected_hash = input("Expected hash: ").strip()

            file_path = os.path.expanduser(file_path)

            if os.path.exists(file_path):
                match, actual = hasher.verify_file(file_path, expected_hash)
                if match:
                    print("\n✅ VERIFIED - Hash matches!")
                else:
                    print("\n❌ MISMATCH")
                    print(f"Expected: {expected_hash}")
                    print(f"Actual:   {actual}")
            else:
                print(f"File not found: {file_path}")

        elif choice == '4':
            # Generate manifest
            directory = input(f"Directory [{hasher.base_path}]: ").strip()
            if not directory:
                directory = hasher.base_path
            directory = os.path.expanduser(directory)

            output_file = input("Output file [manifest.json]: ").strip()
            if not output_file:
                output_file = "manifest.json"

            print(f"\nGenerating manifest for {directory}...")
            results = hasher.scan_directory(directory)

            manifest = {
                'generated': datetime.utcnow().isoformat(),
                'directory': directory,
                'file_count': len(results),
                'files': results
            }

            with open(output_file, 'w') as f:
                json.dump(manifest, f, indent=2)

            print(f"Saved manifest to {output_file}")
            print(f"Contains {len(results)} file hashes")

        elif choice == '5':
            # Compare manifests
            manifest_file = input("Manifest file: ").strip()
            directory = input(f"Directory to compare [{hasher.base_path}]: ").strip()

            if not directory:
                directory = hasher.base_path

            manifest_file = os.path.expanduser(manifest_file)
            directory = os.path.expanduser(directory)

            if not os.path.exists(manifest_file):
                print(f"Manifest not found: {manifest_file}")
                continue

            with open(manifest_file, 'r') as f:
                old_manifest = json.load(f).get('files', {})

            new_manifest = hasher.scan_directory(directory)
            comparison = hasher.compare_manifests(old_manifest, new_manifest)

            print(f"\n{'=' * 40}")
            print("COMPARISON RESULTS")
            print(f"{'=' * 40}")
            print(f"Added: {len(comparison['added'])}")
            print(f"Removed: {len(comparison['removed'])}")
            print(f"Modified: {len(comparison['modified'])}")
            print(f"Unchanged: {len(comparison['unchanged'])}")
            print(f"{'=' * 40}")

            if comparison['added']:
                print("\nAdded files:")
                for f in comparison['added'][:10]:
                    print(f"  + {f}")

            if comparison['removed']:
                print("\nRemoved files:")
                for f in comparison['removed'][:10]:
                    print(f"  - {f}")

            if comparison['modified']:
                print("\nModified files:")
                for f in comparison['modified'][:10]:
                    print(f"  ~ {f}")

        elif choice == '6':
            # Hash text
            text = input("Enter text to hash: ")
            text_hash = hasher.hash_string(text)
            print(f"\nSHA-256: {text_hash}")

        else:
            print("Invalid choice")


if __name__ == '__main__':
    main()
