# Agent Instructions & Guidelines

## Purpose

This document provides instructions for AI agents (Claude, GPT, Copilot, etc.) working on this repository. Following these guidelines reduces failed pull requests and ensures consistent, high-quality contributions.

## Before Starting Any Task

### 1. Read the Kanban State
```bash
# Check current project state
cat kanban/state/current.json

# Review pending tasks
cat kanban/todos/pending.md
```

### 2. Verify Branch Strategy
```bash
# Always work on designated feature branches
git checkout -b claude/<task-name>-<session-id>

# Never commit directly to main
```

### 3. Check Integration Status
```bash
# Verify all endpoints are reachable
./scripts/check-endpoints.sh

# Review API configurations
cat kanban/integrations/endpoints.json
```

## Task Workflow

### Step 1: Claim Task
1. Move task from "Ready" to "In Progress" in kanban
2. Update `kanban/state/current.json` with your agent ID
3. Create a task-specific branch

### Step 2: Implement
1. Follow existing code patterns
2. Add appropriate tests
3. Update documentation inline
4. Generate file hashes for modified files

### Step 3: Validate
1. Run all tests locally
2. Verify SHA-256 hashes
3. Check integration endpoints
4. Validate against PR checklist

### Step 4: Submit PR
1. Use PR template
2. Link to kanban task
3. Include hash verification output
4. Request appropriate reviewers

## Critical Rules

### DO:
- Read existing code before modifying
- Use existing patterns and conventions
- Update kanban state after each action
- Generate hashes for all changes
- Test integrations before submitting

### DON'T:
- Push directly to main
- Skip hash verification
- Ignore failing tests
- Leave kanban state stale
- Make changes without reading context

## Hash Verification

Every change must include hash verification:

```python
from kanban.hashing import verify_change

# Generate hash for your changes
hash_result = verify_change(
    files_modified=['path/to/file.py'],
    task_id='TASK-123',
    agent_id='claude-opus-4-5'
)

# Include in commit message
# Hash: sha256:abc123...
```

## Integration Checklist

Before submitting a PR, verify these integrations:

- [ ] GitHub Actions CI passes
- [ ] Cloudflare Workers endpoints respond
- [ ] Salesforce CRM sync active
- [ ] Vercel preview deployment works
- [ ] DigitalOcean health checks pass
- [ ] Claude API validation succeeds
- [ ] Mobile app compatibility verified

## Common Failure Modes

### 1. Stale Kanban State
**Symptom**: PR conflicts with another agent's work
**Fix**: Always pull latest state before starting

### 2. Missing Hash Verification
**Symptom**: PR rejected by hash validator
**Fix**: Run `./scripts/generate-hashes.sh` before commit

### 3. Integration Timeout
**Symptom**: CI fails on integration tests
**Fix**: Check endpoint health, retry with backoff

### 4. Branch Naming
**Symptom**: Push rejected with 403
**Fix**: Use format `claude/<task>-<session-id>`

## Task Templates

Use these templates for common tasks:

- [Bug Fix Template](../kanban/templates/bug-fix.md)
- [Feature Template](../kanban/templates/feature.md)
- [Integration Template](../kanban/templates/integration.md)
- [Documentation Template](../kanban/templates/documentation.md)

## Escalation

If blocked:
1. Move task to "Blocked" column
2. Update `kanban/state/blocked.json`
3. Add blocker details
4. Notify via configured channels
