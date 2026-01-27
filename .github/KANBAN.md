# BlackRoad Docker Manager - Kanban Project System

## Overview

This repository uses a Salesforce-style project management system integrated with GitHub Projects, Cloudflare Workers for state management, and CRM-style tracking for all operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BlackRoad Kanban Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   GitHub     │    │  Cloudflare  │    │  Salesforce  │                   │
│  │   (Files)    │◄──►│   (State)    │◄──►│    (CRM)     │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    Kanban State Manager                          │        │
│  │  • Task tracking    • Sprint management    • PR validation       │        │
│  │  • Agent todos      • Integration sync     • Hash verification   │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                    Integration Layer                              │       │
│  │  Vercel │ DigitalOcean │ Claude │ Raspberry Pi │ Mobile Apps     │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Kanban Columns

| Column | Description | Automation |
|--------|-------------|------------|
| **Backlog** | All incoming tasks, issues, feature requests | Auto-added from issues |
| **Triage** | Tasks being evaluated for priority | Agent review required |
| **Ready** | Prioritized and ready for work | Has all requirements |
| **In Progress** | Currently being worked on | Max 3 per agent |
| **Review** | PR submitted, awaiting review | Auto-linked to PRs |
| **Testing** | In QA/validation phase | CI/CD triggered |
| **Blocked** | Waiting on external dependency | Escalation alerts |
| **Done** | Completed and merged | Hash verified |

## State Management

### Cloudflare KV Store
- Stores real-time kanban state
- Syncs with GitHub Projects API
- Maintains task metadata and history

### Salesforce CRM Integration
- Tracks customer-facing features
- Links issues to customer requests
- Maintains relationship data

### GitHub Repository
- Source of truth for code
- Project boards for visualization
- Actions for automation

## Hash Verification

All completed tasks are verified using SHA-256 hashing:
- Task content hash
- Associated file hashes
- Commit verification hash
- Agent signature hash

See `/kanban/hashing/` for implementation details.

## Quick Links

- [Agent Instructions](./AGENTS.md)
- [Integration Setup](../kanban/integrations/)
- [Task Templates](../kanban/templates/)
- [Hashing Utilities](../kanban/hashing/)
