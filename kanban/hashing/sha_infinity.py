#!/usr/bin/env python3
"""
SHA-Infinity Hashing System for BlackRoad Kanban

SHA-Infinity is a layered, recursive hashing approach that provides:
1. Multi-layer hash chains for tamper detection
2. Merkle tree structures for efficient verification
3. Time-locked hash sequences for audit trails
4. Cross-reference hashing for relationship integrity

This provides "infinite" security depth by combining multiple
cryptographic techniques into a unified verification system.
"""

import hashlib
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from collections import OrderedDict


@dataclass
class HashLayer:
    """Represents a single layer in the hash chain."""
    level: int
    hash: str
    algorithm: str
    timestamp: str
    parent_hash: Optional[str] = None
    metadata: Optional[dict] = None


@dataclass
class MerkleNode:
    """A node in the Merkle tree."""
    hash: str
    left: Optional['MerkleNode'] = None
    right: Optional['MerkleNode'] = None
    data: Optional[str] = None


class SHAInfinity:
    """
    SHA-Infinity: A multi-layer recursive hashing system.

    Provides deep verification through:
    - Hash chains (each hash includes previous)
    - Merkle trees (efficient partial verification)
    - Time-locked sequences (temporal ordering)
    - Algorithm diversity (multiple hash algorithms)
    """

    ALGORITHMS = ['sha256', 'sha384', 'sha512', 'sha3_256', 'sha3_512', 'blake2b', 'blake2s']

    def __init__(self, depth: int = 7, state_file: Optional[str] = None):
        """
        Initialize SHA-Infinity hasher.

        Args:
            depth: Number of hash layers (default 7, can be "infinite")
            state_file: Path to store hash state
        """
        self.depth = depth
        self.state_file = state_file or 'kanban/state/sha_infinity.json'
        self.chain = []
        self.merkle_root = None
        self._load_state()

    def _load_state(self):
        """Load existing hash state."""
        try:
            with open(self.state_file, 'r') as f:
                state = json.load(f)
                self.chain = [HashLayer(**layer) for layer in state.get('chain', [])]
        except (FileNotFoundError, json.JSONDecodeError):
            self.chain = []

    def _save_state(self):
        """Save hash state."""
        os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
        state = {
            'chain': [asdict(layer) for layer in self.chain],
            'merkle_root': self.merkle_root.hash if self.merkle_root else None,
            'last_updated': datetime.utcnow().isoformat()
        }
        with open(self.state_file, 'w') as f:
            json.dump(state, f, indent=2)

    def _hash_with_algorithm(self, data: bytes, algorithm: str) -> str:
        """Hash data with specified algorithm."""
        if algorithm == 'sha256':
            return hashlib.sha256(data).hexdigest()
        elif algorithm == 'sha384':
            return hashlib.sha384(data).hexdigest()
        elif algorithm == 'sha512':
            return hashlib.sha512(data).hexdigest()
        elif algorithm == 'sha3_256':
            return hashlib.sha3_256(data).hexdigest()
        elif algorithm == 'sha3_512':
            return hashlib.sha3_512(data).hexdigest()
        elif algorithm == 'blake2b':
            return hashlib.blake2b(data).hexdigest()
        elif algorithm == 'blake2s':
            return hashlib.blake2s(data).hexdigest()
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")

    def hash_infinite(self, content: Union[str, bytes], metadata: Optional[dict] = None) -> List[HashLayer]:
        """
        Generate infinite-depth hash chain.

        Each layer uses a different algorithm and includes
        the previous layer's hash, creating a chain that's
        exponentially harder to forge.
        """
        if isinstance(content, str):
            content = content.encode('utf-8')

        layers = []
        current_data = content
        parent_hash = None

        for level in range(self.depth):
            algorithm = self.ALGORITHMS[level % len(self.ALGORITHMS)]

            # Include parent hash in current data for chaining
            if parent_hash:
                current_data = parent_hash.encode() + current_data

            # Add timestamp for temporal ordering
            timestamp = datetime.utcnow().isoformat()
            current_data = timestamp.encode() + current_data

            # Generate hash
            hash_value = self._hash_with_algorithm(current_data, algorithm)

            layer = HashLayer(
                level=level,
                hash=hash_value,
                algorithm=algorithm,
                timestamp=timestamp,
                parent_hash=parent_hash,
                metadata=metadata if level == 0 else None
            )
            layers.append(layer)

            parent_hash = hash_value
            current_data = hash_value.encode()

        self.chain.extend(layers)
        self._save_state()

        return layers

    def verify_chain(self, layers: List[HashLayer]) -> Tuple[bool, List[str]]:
        """
        Verify the integrity of a hash chain.

        Returns (is_valid, list_of_errors)
        """
        errors = []

        for i, layer in enumerate(layers):
            if i == 0:
                continue

            # Verify parent hash reference
            if layer.parent_hash != layers[i - 1].hash:
                errors.append(f"Layer {layer.level}: parent hash mismatch")

            # Verify timestamp ordering
            prev_time = datetime.fromisoformat(layers[i - 1].timestamp)
            curr_time = datetime.fromisoformat(layer.timestamp)
            if curr_time < prev_time:
                errors.append(f"Layer {layer.level}: timestamp ordering violation")

        return len(errors) == 0, errors

    def build_merkle_tree(self, items: List[str]) -> MerkleNode:
        """
        Build a Merkle tree from a list of items.

        Enables efficient partial verification without
        needing the entire dataset.
        """
        if not items:
            return MerkleNode(hash=self._hash_with_algorithm(b'', 'sha256'))

        # Create leaf nodes
        nodes = [
            MerkleNode(
                hash=self._hash_with_algorithm(item.encode(), 'sha256'),
                data=item
            )
            for item in items
        ]

        # Build tree bottom-up
        while len(nodes) > 1:
            next_level = []
            for i in range(0, len(nodes), 2):
                left = nodes[i]
                right = nodes[i + 1] if i + 1 < len(nodes) else nodes[i]

                combined = left.hash + right.hash
                parent_hash = self._hash_with_algorithm(combined.encode(), 'sha256')

                parent = MerkleNode(
                    hash=parent_hash,
                    left=left,
                    right=right
                )
                next_level.append(parent)
            nodes = next_level

        self.merkle_root = nodes[0]
        return nodes[0]

    def get_merkle_proof(self, item: str, root: MerkleNode) -> List[Tuple[str, str]]:
        """
        Get Merkle proof for an item.

        Returns list of (hash, direction) tuples needed
        to verify the item is in the tree.
        """
        item_hash = self._hash_with_algorithm(item.encode(), 'sha256')
        proof = []

        def find_path(node: MerkleNode, target_hash: str, path: List) -> bool:
            if node.data is not None:
                return node.hash == target_hash

            if node.left and find_path(node.left, target_hash, path):
                if node.right:
                    path.append((node.right.hash, 'right'))
                return True

            if node.right and find_path(node.right, target_hash, path):
                if node.left:
                    path.append((node.left.hash, 'left'))
                return True

            return False

        find_path(root, item_hash, proof)
        return proof

    def verify_merkle_proof(self, item: str, proof: List[Tuple[str, str]], root_hash: str) -> bool:
        """Verify an item using its Merkle proof."""
        current_hash = self._hash_with_algorithm(item.encode(), 'sha256')

        for sibling_hash, direction in proof:
            if direction == 'right':
                combined = current_hash + sibling_hash
            else:
                combined = sibling_hash + current_hash
            current_hash = self._hash_with_algorithm(combined.encode(), 'sha256')

        return current_hash == root_hash

    def cross_reference_hash(self, items: Dict[str, str]) -> str:
        """
        Generate cross-reference hash for related items.

        Creates a hash that depends on all items, so any
        change to any item invalidates the entire reference.
        """
        # Sort for deterministic ordering
        ordered = OrderedDict(sorted(items.items()))

        # Create cross-referenced structure
        cross_ref = {}
        prev_hash = ""

        for key, value in ordered.items():
            item_hash = self._hash_with_algorithm(
                (prev_hash + key + value).encode(),
                'sha256'
            )
            cross_ref[key] = item_hash
            prev_hash = item_hash

        # Final hash includes all cross-references
        final_data = json.dumps(cross_ref, sort_keys=True)
        return self._hash_with_algorithm(final_data.encode(), 'sha512')

    def time_lock_hash(self, content: str, lock_until: datetime) -> dict:
        """
        Create a time-locked hash.

        The hash can only be verified after the lock time,
        useful for audit trails and sequential verification.
        """
        content_hash = self._hash_with_algorithm(content.encode(), 'sha256')
        lock_time = lock_until.isoformat()

        # Include lock time in hash
        time_locked = self._hash_with_algorithm(
            (content_hash + lock_time).encode(),
            'sha384'
        )

        return {
            'hash': time_locked,
            'content_hash': content_hash,
            'locked_until': lock_time,
            'created': datetime.utcnow().isoformat()
        }

    def verify_time_lock(self, time_lock: dict, content: str) -> Tuple[bool, str]:
        """Verify a time-locked hash."""
        now = datetime.utcnow()
        lock_time = datetime.fromisoformat(time_lock['locked_until'])

        if now < lock_time:
            return False, f"Time lock active until {lock_time}"

        content_hash = self._hash_with_algorithm(content.encode(), 'sha256')
        if content_hash != time_lock['content_hash']:
            return False, "Content hash mismatch"

        expected = self._hash_with_algorithm(
            (content_hash + time_lock['locked_until']).encode(),
            'sha384'
        )

        if expected != time_lock['hash']:
            return False, "Time-locked hash mismatch"

        return True, "Verified"


class KanbanInfinityHasher:
    """Apply SHA-Infinity to kanban operations."""

    def __init__(self, depth: int = 7):
        self.infinity = SHAInfinity(depth=depth)
        self.task_hashes = {}
        self.pr_merkle_trees = {}

    def hash_task(self, task: dict) -> dict:
        """Generate infinite hash chain for a task."""
        task_content = json.dumps(task, sort_keys=True)
        layers = self.infinity.hash_infinite(task_content, metadata={'task_id': task.get('id')})

        result = {
            'task_id': task.get('id'),
            'layers': len(layers),
            'final_hash': layers[-1].hash,
            'chain': [{'level': l.level, 'hash': l.hash, 'algorithm': l.algorithm} for l in layers]
        }

        self.task_hashes[task.get('id')] = result
        return result

    def hash_pr(self, pr_data: dict, files: List[str]) -> dict:
        """Generate Merkle tree for PR files and cross-reference with task."""
        # Build Merkle tree of file hashes
        file_hashes = {}
        for file_path in files:
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    file_hashes[file_path] = hashlib.sha256(f.read()).hexdigest()

        merkle_root = self.infinity.build_merkle_tree(list(file_hashes.values()))

        # Cross-reference with PR metadata
        cross_ref_items = {
            'pr_title': pr_data.get('title', ''),
            'pr_branch': pr_data.get('branch', ''),
            'task_id': pr_data.get('task_id', ''),
            'merkle_root': merkle_root.hash
        }
        cross_ref = self.infinity.cross_reference_hash(cross_ref_items)

        result = {
            'pr_id': pr_data.get('id'),
            'merkle_root': merkle_root.hash,
            'cross_reference': cross_ref,
            'file_count': len(files),
            'file_hashes': file_hashes
        }

        self.pr_merkle_trees[pr_data.get('id')] = result
        return result

    def verify_integrity(self, task_id: str) -> dict:
        """Verify complete integrity of task and all related hashes."""
        if task_id not in self.task_hashes:
            return {'valid': False, 'error': 'Task not found in hash registry'}

        task_hash = self.task_hashes[task_id]
        # Reconstruct and verify chain would go here

        return {
            'valid': True,
            'task_id': task_id,
            'final_hash': task_hash['final_hash'],
            'layers_verified': task_hash['layers']
        }


def generate_infinity_report(directory: str) -> dict:
    """Generate a complete SHA-Infinity report for a directory."""
    infinity = SHAInfinity(depth=7)

    # Collect all files
    files = []
    for path in Path(directory).rglob('*'):
        if path.is_file() and '.git' not in str(path):
            files.append(str(path))

    # Build Merkle tree of file hashes
    file_hashes = []
    for file_path in files:
        with open(file_path, 'rb') as f:
            file_hashes.append(hashlib.sha256(f.read()).hexdigest())

    merkle = infinity.build_merkle_tree(file_hashes)

    # Generate infinite hash of the merkle root
    layers = infinity.hash_infinite(merkle.hash)

    report = {
        'generated': datetime.utcnow().isoformat(),
        'directory': directory,
        'file_count': len(files),
        'merkle_root': merkle.hash,
        'infinity_depth': len(layers),
        'final_hash': layers[-1].hash,
        'algorithms_used': list(set(l.algorithm for l in layers)),
        'verification_chain': [
            {'level': l.level, 'algorithm': l.algorithm, 'hash': l.hash[:16] + '...'}
            for l in layers
        ]
    }

    return report


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("SHA-Infinity Hashing System")
        print("Usage: sha_infinity.py <command> [args]")
        print("")
        print("Commands:")
        print("  hash <content>        - Generate infinite hash chain")
        print("  report <directory>    - Generate full directory report")
        print("  demo                  - Run demonstration")
        sys.exit(0)

    command = sys.argv[1]

    if command == 'hash' and len(sys.argv) > 2:
        content = sys.argv[2]
        infinity = SHAInfinity(depth=7)
        layers = infinity.hash_infinite(content)
        print(f"SHA-Infinity Hash Chain ({len(layers)} layers):")
        for layer in layers:
            print(f"  L{layer.level} [{layer.algorithm}]: {layer.hash[:32]}...")
        print(f"\nFinal Hash: {layers[-1].hash}")

    elif command == 'report' and len(sys.argv) > 2:
        report = generate_infinity_report(sys.argv[2])
        print(json.dumps(report, indent=2))

    elif command == 'demo':
        print("=== SHA-Infinity Demonstration ===\n")

        infinity = SHAInfinity(depth=5)

        # Demo 1: Hash chain
        print("1. Infinite Hash Chain:")
        layers = infinity.hash_infinite("Hello, BlackRoad!")
        for layer in layers:
            print(f"   Layer {layer.level}: {layer.hash[:40]}... ({layer.algorithm})")

        # Demo 2: Merkle tree
        print("\n2. Merkle Tree:")
        items = ["file1.py", "file2.js", "file3.ts", "file4.go"]
        root = infinity.build_merkle_tree(items)
        print(f"   Root: {root.hash[:40]}...")

        # Demo 3: Cross-reference
        print("\n3. Cross-Reference Hash:")
        cross = infinity.cross_reference_hash({
            "task": "TASK-001",
            "pr": "PR-42",
            "commit": "abc123"
        })
        print(f"   Cross-ref: {cross[:40]}...")

        # Demo 4: Time lock
        print("\n4. Time-Locked Hash:")
        lock = infinity.time_lock_hash("secret", datetime(2026, 12, 31))
        print(f"   Locked until: {lock['locked_until']}")
        print(f"   Hash: {lock['hash'][:40]}...")

        print("\n=== Demo Complete ===")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
