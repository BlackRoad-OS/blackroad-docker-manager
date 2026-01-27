# Documentation Task Template

## Task Information

- **Task ID**: TASK-XXX
- **Type**: Documentation
- **Priority**: [Critical/High/Medium/Low]
- **Effort**: [XS/S/M/L/XL]
- **Assignee**: [Agent ID or Username]
- **Created**: YYYY-MM-DD

## Documentation Scope

### What to Document
[Describe what needs documentation]

### Target Audience
- [ ] Developers
- [ ] End Users
- [ ] AI Agents
- [ ] DevOps/SRE
- [ ] API Consumers

### Documentation Type
- [ ] README
- [ ] API Reference
- [ ] Tutorial/Guide
- [ ] Architecture Overview
- [ ] Agent Instructions
- [ ] Inline Code Comments

## Content Outline

### 1. Overview
- Purpose
- Key concepts
- Prerequisites

### 2. Getting Started
- Installation
- Configuration
- Quick start example

### 3. Detailed Usage
- Feature 1
- Feature 2
- Feature 3

### 4. API Reference
- Endpoints/Methods
- Parameters
- Examples
- Error codes

### 5. Troubleshooting
- Common issues
- FAQ
- Getting help

## Files to Create/Modify

- [ ] `docs/overview.md`
- [ ] `docs/api-reference.md`
- [ ] `README.md`
- [ ] Inline code comments

## Style Guidelines

### Markdown Standards
- Use ATX-style headers (`#`)
- Code blocks with language specifiers
- Tables for structured data
- Relative links between docs

### Code Examples
```python
# Always include runnable examples
def example_function():
    """Include docstrings."""
    return "example"
```

### Diagrams
```
┌──────────┐     ┌──────────┐
│  Box 1   │────►│  Box 2   │
└──────────┘     └──────────┘
```

## Agent-Specific Documentation

For AI agent consumption, include:

### Structured Sections
```markdown
## Agent Instructions

### Before Starting
1. Step one
2. Step two

### During Task
1. Action one
2. Action two

### Completion Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

### Machine-Readable Metadata
```yaml
---
task_type: documentation
target_agents: [claude, gpt, copilot]
complexity: medium
estimated_effort: M
---
```

## Checklist

### Before Starting
- [ ] Review existing documentation
- [ ] Understand target audience
- [ ] Gather necessary information
- [ ] Claim task in kanban

### During Implementation
- [ ] Follow style guidelines
- [ ] Include examples
- [ ] Test all code samples
- [ ] Use clear, concise language

### Before Submitting PR
- [ ] Spell check complete
- [ ] Links verified
- [ ] Code examples tested
- [ ] Reviewed for accuracy
- [ ] Hash verification complete

### Hash Verification
```
Task Hash: [sha256:...]
Documentation Files:
  - docs/file1.md: [sha256:...]
  - docs/file2.md: [sha256:...]
```

## Review Criteria

### Content Quality
- [ ] Accurate information
- [ ] Complete coverage
- [ ] Clear explanations
- [ ] Useful examples

### Format Quality
- [ ] Proper formatting
- [ ] Consistent style
- [ ] Good structure
- [ ] Easy navigation

### Technical Quality
- [ ] Code examples work
- [ ] Commands are correct
- [ ] Links are valid
- [ ] No outdated information

## Notes

[Any additional notes or context]

---

**Agent Instructions**: Documentation should be clear, accurate, and helpful. Always test code examples before including them. Use the existing documentation style in this repository.
