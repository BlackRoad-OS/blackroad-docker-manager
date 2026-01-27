#!/usr/bin/env python3
"""
SHA-256 Hashing Utilities for BlackRoad Kanban System

Provides file hashing, task verification, and integrity checking
for all kanban operations.
"""

import hashlib
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Union
from datetime import datetime


class SHA256Hasher:
    """SHA-256 hashing utility for files and content."""

    @staticmethod
    def hash_string(content: str) -> str:
        """Hash a string using SHA-256."""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    @staticmethod
    def hash_bytes(data: bytes) -> str:
        """Hash bytes using SHA-256."""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def hash_file(file_path: Union[str, Path]) -> str:
        """Hash a file using SHA-256."""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    def hash_directory(dir_path: Union[str, Path], exclude: Optional[List[str]] = None) -> Dict[str, str]:
        """Hash all files in a directory recursively."""
        exclude = exclude or ['.git', '__pycache__', 'node_modules', '.env']
        hashes = {}
        dir_path = Path(dir_path)

        for file_path in dir_path.rglob('*'):
            if file_path.is_file():
                # Check exclusions
                if any(ex in str(file_path) for ex in exclude):
                    continue
                relative_path = str(file_path.relative_to(dir_path))
                hashes[relative_path] = SHA256Hasher.hash_file(file_path)

        return hashes

    @staticmethod
    def hash_json(data: dict) -> str:
        """Hash JSON data deterministically."""
        # Sort keys for consistent hashing
        json_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
        return SHA256Hasher.hash_string(json_str)


class TaskHasher:
    """Hash generation and verification for kanban tasks."""

    def __init__(self, state_file: Optional[str] = None):
        self.state_file = state_file or 'kanban/state/hashes.json'
        self.hashes = self._load_hashes()

    def _load_hashes(self) -> Dict:
        """Load existing hashes from state file."""
        try:
            with open(self.state_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {'tasks': {}, 'files': {}, 'commits': {}}

    def _save_hashes(self):
        """Save hashes to state file."""
        os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
        with open(self.state_file, 'w') as f:
            json.dump(self.hashes, f, indent=2)

    def hash_task(self, task: dict) -> str:
        """Generate hash for a task."""
        # Create hashable representation
        hashable = {
            'id': task.get('id'),
            'title': task.get('title'),
            'description': task.get('description', ''),
            'status': task.get('status'),
            'files': sorted(task.get('files', [])),
            'metadata': task.get('metadata', {})
        }
        return SHA256Hasher.hash_json(hashable)

    def verify_task(self, task: dict) -> bool:
        """Verify a task against its stored hash."""
        task_id = task.get('id')
        if task_id not in self.hashes['tasks']:
            return False

        current_hash = self.hash_task(task)
        stored_hash = self.hashes['tasks'][task_id]['hash']
        return current_hash == stored_hash

    def register_task(self, task: dict) -> str:
        """Register a task and store its hash."""
        task_id = task.get('id')
        task_hash = self.hash_task(task)

        self.hashes['tasks'][task_id] = {
            'hash': task_hash,
            'created': datetime.utcnow().isoformat(),
            'title': task.get('title')
        }
        self._save_hashes()
        return task_hash

    def register_file(self, file_path: str) -> str:
        """Register a file and store its hash."""
        file_hash = SHA256Hasher.hash_file(file_path)

        self.hashes['files'][file_path] = {
            'hash': file_hash,
            'timestamp': datetime.utcnow().isoformat(),
            'size': os.path.getsize(file_path)
        }
        self._save_hashes()
        return file_hash

    def verify_file(self, file_path: str) -> bool:
        """Verify a file against its stored hash."""
        if file_path not in self.hashes['files']:
            return False

        current_hash = SHA256Hasher.hash_file(file_path)
        stored_hash = self.hashes['files'][file_path]['hash']
        return current_hash == stored_hash

    def register_commit(self, commit_sha: str, files: List[str]) -> str:
        """Register a commit with its file hashes."""
        file_hashes = {}
        for file_path in files:
            if os.path.exists(file_path):
                file_hashes[file_path] = SHA256Hasher.hash_file(file_path)

        commit_data = {
            'sha': commit_sha,
            'files': file_hashes,
            'timestamp': datetime.utcnow().isoformat()
        }
        commit_hash = SHA256Hasher.hash_json(commit_data)

        self.hashes['commits'][commit_sha] = {
            'hash': commit_hash,
            'files': file_hashes,
            'timestamp': commit_data['timestamp']
        }
        self._save_hashes()
        return commit_hash


class PRValidator:
    """Validate pull requests using hash verification."""

    def __init__(self, task_hasher: TaskHasher):
        self.hasher = task_hasher

    def validate_pr(self, pr_data: dict) -> dict:
        """Validate a PR using hash checks."""
        results = {
            'valid': True,
            'checks': [],
            'timestamp': datetime.utcnow().isoformat()
        }

        # Check task association
        if task_id := pr_data.get('task_id'):
            task = pr_data.get('task')
            if task:
                task_valid = self.hasher.verify_task(task)
                results['checks'].append({
                    'type': 'task',
                    'id': task_id,
                    'valid': task_valid
                })
                results['valid'] = results['valid'] and task_valid

        # Check file hashes
        for file_path in pr_data.get('files', []):
            if os.path.exists(file_path):
                file_valid = self.hasher.verify_file(file_path)
                results['checks'].append({
                    'type': 'file',
                    'path': file_path,
                    'valid': file_valid
                })

        # Generate PR hash
        pr_hash = SHA256Hasher.hash_json({
            'title': pr_data.get('title'),
            'branch': pr_data.get('branch'),
            'files': sorted(pr_data.get('files', [])),
            'task_id': pr_data.get('task_id')
        })
        results['hash'] = pr_hash

        return results


def generate_file_manifest(directory: str, output_file: str = None) -> dict:
    """Generate a manifest of all file hashes in a directory."""
    hashes = SHA256Hasher.hash_directory(directory)

    manifest = {
        'version': '1.0',
        'generated': datetime.utcnow().isoformat(),
        'directory': directory,
        'file_count': len(hashes),
        'files': hashes,
        'manifest_hash': SHA256Hasher.hash_json(hashes)
    }

    if output_file:
        with open(output_file, 'w') as f:
            json.dump(manifest, f, indent=2)

    return manifest


def verify_manifest(manifest_file: str, directory: str) -> dict:
    """Verify a directory against a manifest."""
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)

    current_hashes = SHA256Hasher.hash_directory(directory)
    stored_hashes = manifest['files']

    results = {
        'valid': True,
        'added': [],
        'removed': [],
        'modified': [],
        'unchanged': []
    }

    all_files = set(current_hashes.keys()) | set(stored_hashes.keys())

    for file_path in all_files:
        current = current_hashes.get(file_path)
        stored = stored_hashes.get(file_path)

        if current and not stored:
            results['added'].append(file_path)
        elif stored and not current:
            results['removed'].append(file_path)
            results['valid'] = False
        elif current != stored:
            results['modified'].append(file_path)
            results['valid'] = False
        else:
            results['unchanged'].append(file_path)

    return results


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: sha256.py <command> [args]")
        print("Commands:")
        print("  hash <file>           - Hash a single file")
        print("  hash-dir <directory>  - Hash all files in directory")
        print("  manifest <directory>  - Generate manifest file")
        print("  verify <manifest> <directory> - Verify against manifest")
        sys.exit(1)

    command = sys.argv[1]

    if command == 'hash' and len(sys.argv) > 2:
        file_hash = SHA256Hasher.hash_file(sys.argv[2])
        print(f"{file_hash}  {sys.argv[2]}")

    elif command == 'hash-dir' and len(sys.argv) > 2:
        hashes = SHA256Hasher.hash_directory(sys.argv[2])
        for path, hash_val in sorted(hashes.items()):
            print(f"{hash_val}  {path}")

    elif command == 'manifest' and len(sys.argv) > 2:
        output = sys.argv[3] if len(sys.argv) > 3 else 'manifest.json'
        manifest = generate_file_manifest(sys.argv[2], output)
        print(f"Generated manifest with {manifest['file_count']} files")
        print(f"Manifest hash: {manifest['manifest_hash']}")

    elif command == 'verify' and len(sys.argv) > 3:
        results = verify_manifest(sys.argv[2], sys.argv[3])
        print(f"Valid: {results['valid']}")
        if results['added']:
            print(f"Added: {len(results['added'])} files")
        if results['removed']:
            print(f"Removed: {len(results['removed'])} files")
        if results['modified']:
            print(f"Modified: {len(results['modified'])} files")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
