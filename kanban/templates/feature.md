# Feature Task Template

## Task Information

- **Task ID**: TASK-XXX
- **Type**: Feature
- **Priority**: [Critical/High/Medium/Low]
- **Effort**: [XS/S/M/L/XL]
- **Assignee**: [Agent ID or Username]
- **Created**: YYYY-MM-DD

## Feature Description

### Summary
[One-line description of the feature]

### User Story
As a [type of user], I want [goal] so that [benefit].

### Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

### Out of Scope
- [What this feature does NOT include]

## Technical Design

### Architecture
[Describe the technical approach]

```
┌─────────────┐     ┌─────────────┐
│  Component  │────►│  Component  │
└─────────────┘     └─────────────┘
```

### New Files
- `path/to/new/file.py` - [Description]
- `path/to/new/file.js` - [Description]

### Modified Files
- `path/to/existing/file.py` - [Changes needed]

### Dependencies
- [External dependency 1]
- [External dependency 2]

### API Changes
```json
{
  "endpoint": "/api/v1/new-feature",
  "method": "POST",
  "body": {}
}
```

## Implementation Plan

### Phase 1: Foundation
- [ ] Set up file structure
- [ ] Create base interfaces/types
- [ ] Add configuration

### Phase 2: Core Logic
- [ ] Implement main functionality
- [ ] Add error handling
- [ ] Write unit tests

### Phase 3: Integration
- [ ] Connect to existing systems
- [ ] Add API endpoints
- [ ] Integration tests

### Phase 4: Polish
- [ ] Documentation
- [ ] Performance optimization
- [ ] Edge case handling

## Testing Strategy

### Unit Tests
- [ ] Test case 1
- [ ] Test case 2

### Integration Tests
- [ ] Integration scenario 1
- [ ] Integration scenario 2

### Manual Testing
1. [Test step 1]
2. [Test step 2]

## Checklist

### Before Starting
- [ ] Read acceptance criteria thoroughly
- [ ] Review related code and architecture
- [ ] Check for blocking dependencies
- [ ] Claim task in kanban board
- [ ] Create feature branch

### During Implementation
- [ ] Follow existing patterns
- [ ] Write tests alongside code
- [ ] Keep commits atomic
- [ ] Update documentation inline

### Before Submitting PR
- [ ] All acceptance criteria met
- [ ] All tests pass
- [ ] Generate infinity hashes
- [ ] Performance verified
- [ ] Security review passed
- [ ] Documentation complete

### Hash Verification
```
Task Hash: [sha256:...]
Infinity Chain Final: [sha-infinity:...]
File Hashes:
  - path/to/file1.py: [sha256:...]
  - path/to/file2.js: [sha256:...]
Merkle Root: [sha256:...]
```

## Integration Checklist

- [ ] GitHub Actions CI passes
- [ ] Cloudflare Workers deployed
- [ ] Vercel preview working
- [ ] DigitalOcean infrastructure ready
- [ ] Salesforce CRM linked (if customer-facing)
- [ ] Claude validation passed
- [ ] Mobile app compatibility verified

## Rollback Plan

If issues arise:
1. [Rollback step 1]
2. [Rollback step 2]

## Notes

[Any additional notes or context]

---

**Agent Instructions**: This is a complex task. Use TodoWrite to break into subtasks. Follow `.github/AGENTS.md` guidelines strictly.
