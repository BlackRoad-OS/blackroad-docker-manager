# Bug Fix Task Template

## Task Information

- **Task ID**: TASK-XXX
- **Type**: Bug Fix
- **Priority**: [Critical/High/Medium/Low]
- **Assignee**: [Agent ID or Username]
- **Created**: YYYY-MM-DD

## Bug Description

### Summary
[One-line description of the bug]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Environment
- OS: [e.g., Ubuntu 22.04]
- Runtime: [e.g., Node 18, Python 3.11]
- Browser: [if applicable]
- Device: [if applicable]

## Root Cause Analysis

### Investigation Notes
[Document your findings here]

### Affected Files
- [ ] `path/to/file1.py`
- [ ] `path/to/file2.js`

### Related Issues
- #XXX
- #YYY

## Implementation Plan

### Fix Approach
[Describe how you will fix the bug]

### Changes Required
1. [Change 1]
2. [Change 2]

### Testing Plan
- [ ] Unit tests for fix
- [ ] Integration tests
- [ ] Manual verification
- [ ] Regression testing

## Checklist

### Before Starting
- [ ] Read all related code files
- [ ] Understand the bug context
- [ ] Check for related issues/PRs
- [ ] Claim task in kanban board

### During Implementation
- [ ] Follow existing code patterns
- [ ] Add appropriate error handling
- [ ] Write tests for the fix
- [ ] Update documentation if needed

### Before Submitting PR
- [ ] All tests pass
- [ ] Generate file hashes
- [ ] Update kanban state
- [ ] Self-review changes
- [ ] No unintended side effects

### Hash Verification
```
Task Hash: [sha256:...]
File Hashes:
  - path/to/file1.py: [sha256:...]
  - path/to/file2.py: [sha256:...]
```

## Integration Checklist

- [ ] GitHub Actions CI passes
- [ ] Cloudflare sync verified
- [ ] CRM updated (if customer-facing)
- [ ] Mobile compatibility checked

## Notes

[Any additional notes or context]

---

**Agent Instructions**: Follow the guidelines in `.github/AGENTS.md`. Mark task as in_progress before starting, update kanban state after completion.
