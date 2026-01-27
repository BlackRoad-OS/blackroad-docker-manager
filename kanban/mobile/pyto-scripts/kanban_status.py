#!/usr/bin/env python3
"""
Kanban Status Viewer for Pyto (iOS)

View and update kanban task status from your iOS device.
"""

import json
import os
from datetime import datetime
from pathlib import Path

# Try to use Pyto's file picker if available
try:
    import file_picker
    HAS_FILE_PICKER = True
except ImportError:
    HAS_FILE_PICKER = False


class KanbanViewer:
    """Simple kanban state viewer for mobile."""

    def __init__(self, state_file=None):
        if state_file:
            self.state_file = state_file
        else:
            # Try common locations
            locations = [
                '/iCloud/blackroad-docker-manager/kanban/state/current.json',
                '~/blackroad-docker-manager/kanban/state/current.json',
                './kanban/state/current.json'
            ]
            for loc in locations:
                expanded = os.path.expanduser(loc)
                if os.path.exists(expanded):
                    self.state_file = expanded
                    break
            else:
                self.state_file = None

    def load_state(self):
        """Load current kanban state."""
        if not self.state_file or not os.path.exists(self.state_file):
            return None
        with open(self.state_file, 'r') as f:
            return json.load(f)

    def display_board(self):
        """Display the kanban board in a mobile-friendly format."""
        state = self.load_state()
        if not state:
            print("Could not load kanban state.")
            print("Please specify state file location.")
            return

        print("=" * 40)
        print("       BLACKROAD KANBAN BOARD")
        print("=" * 40)
        print(f"Last Updated: {state.get('lastUpdated', 'Unknown')}")
        print()

        columns = state.get('columns', {})
        column_order = [
            'backlog', 'triage', 'ready', 'inProgress',
            'review', 'testing', 'blocked', 'done'
        ]

        for col_name in column_order:
            tasks = columns.get(col_name, [])
            emoji = self._get_column_emoji(col_name)
            count = len(tasks)

            print(f"{emoji} {col_name.upper()} ({count})")
            print("-" * 30)

            if tasks:
                for task in tasks:
                    priority = task.get('priority', 'medium')
                    priority_icon = self._get_priority_icon(priority)
                    print(f"  {priority_icon} {task.get('id', '???')}: {task.get('title', 'Untitled')}")
            else:
                print("  (empty)")
            print()

        # Show integration status
        print("=" * 40)
        print("       INTEGRATION STATUS")
        print("=" * 40)
        integrations = state.get('integrations', {})
        for name, info in integrations.items():
            status = info.get('status', 'unknown')
            icon = "✅" if status in ['active', 'configured'] else "⚠️"
            print(f"  {icon} {name}: {status}")

        # Show metrics
        print()
        print("=" * 40)
        print("           METRICS")
        print("=" * 40)
        metrics = state.get('metrics', {})
        print(f"  Tasks Completed: {metrics.get('tasksCompleted', 0)}")
        print(f"  PRs Opened: {metrics.get('prsOpened', 0)}")
        print(f"  PRs Merged: {metrics.get('prsMerged', 0)}")
        print(f"  PRs Failed: {metrics.get('prsFailed', 0)}")

    def _get_column_emoji(self, column):
        """Get emoji for column."""
        emojis = {
            'backlog': '📋',
            'triage': '🔍',
            'ready': '🚀',
            'inProgress': '⚡',
            'review': '👀',
            'testing': '🧪',
            'blocked': '🚧',
            'done': '✅'
        }
        return emojis.get(column, '📌')

    def _get_priority_icon(self, priority):
        """Get icon for priority."""
        icons = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🟢'
        }
        return icons.get(priority, '⚪')

    def list_tasks(self, column=None, priority=None):
        """List tasks with optional filtering."""
        state = self.load_state()
        if not state:
            return []

        tasks = []
        columns = state.get('columns', {})

        for col_name, col_tasks in columns.items():
            if column and col_name != column:
                continue
            for task in col_tasks:
                if priority and task.get('priority') != priority:
                    continue
                task['column'] = col_name
                tasks.append(task)

        return tasks

    def update_task_status(self, task_id, new_column):
        """Move a task to a new column."""
        state = self.load_state()
        if not state:
            print("Could not load state")
            return False

        columns = state.get('columns', {})
        task = None
        old_column = None

        # Find and remove task from current column
        for col_name, col_tasks in columns.items():
            for i, t in enumerate(col_tasks):
                if t.get('id') == task_id:
                    task = col_tasks.pop(i)
                    old_column = col_name
                    break
            if task:
                break

        if not task:
            print(f"Task {task_id} not found")
            return False

        # Add to new column
        if new_column not in columns:
            columns[new_column] = []
        columns[new_column].append(task)

        # Update state
        state['lastUpdated'] = datetime.utcnow().isoformat()

        # Save
        with open(self.state_file, 'w') as f:
            json.dump(state, f, indent=2)

        print(f"Moved {task_id} from {old_column} to {new_column}")
        return True


def main():
    """Main entry point for Pyto."""
    viewer = KanbanViewer()

    print("\nBlackRoad Kanban Mobile Viewer")
    print("Commands: board, list, move <id> <column>, quit\n")

    while True:
        try:
            cmd = input("> ").strip().lower()
        except EOFError:
            break

        if cmd == 'quit' or cmd == 'q':
            break
        elif cmd == 'board' or cmd == 'b':
            viewer.display_board()
        elif cmd == 'list' or cmd == 'l':
            tasks = viewer.list_tasks()
            for t in tasks:
                print(f"[{t['column']}] {t['id']}: {t.get('title', 'Untitled')}")
        elif cmd.startswith('move '):
            parts = cmd.split()
            if len(parts) >= 3:
                task_id = parts[1]
                new_column = parts[2]
                viewer.update_task_status(task_id, new_column)
            else:
                print("Usage: move <task_id> <column>")
        elif cmd == 'help' or cmd == 'h':
            print("Commands:")
            print("  board (b) - Show kanban board")
            print("  list (l)  - List all tasks")
            print("  move <id> <column> - Move task")
            print("  quit (q)  - Exit")
        elif cmd:
            print(f"Unknown command: {cmd}")
            print("Type 'help' for available commands")


if __name__ == '__main__':
    main()
