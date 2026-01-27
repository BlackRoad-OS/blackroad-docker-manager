# BlackRoad Docker Manager

Part of the BlackRoad Product Suite - 100+ tools for modern development.

## Overview

BlackRoad Docker Manager is a comprehensive Docker management solution with integrated Kanban project management, multi-cloud deployment, and AI-assisted development workflows.

## Features

- **Kanban Project Management** - Salesforce-style project tracking integrated with GitHub
- **Multi-Cloud Integrations** - Cloudflare, Vercel, DigitalOcean, and more
- **AI Agent Support** - Claude API integration for automated code review and task management
- **Edge Computing** - Raspberry Pi fleet management for edge deployments
- **Mobile Development** - Full iOS development support (Termius, iSH, Working Copy, Pyto)
- **Hash Verification** - SHA-256 and SHA-Infinity for tamper detection
- **PR Quality Gates** - Automated validation to reduce failed pull requests

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/BlackRoad-OS/blackroad-docker-manager.git
cd blackroad-docker-manager

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Run endpoint check
./scripts/check-endpoints.sh
```

### For AI Agents

If you're an AI agent working on this repository:

1. **Read the agent instructions**: [.github/AGENTS.md](.github/AGENTS.md)
2. **Check kanban state**: `kanban/state/current.json`
3. **Use task templates**: `kanban/templates/`
4. **Generate hashes before committing**: `./scripts/generate-hashes.sh`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BlackRoad Docker Manager                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   GitHub     │    │  Cloudflare  │    │  Salesforce  │       │
│  │   (Code)     │◄──►│   (State)    │◄──►│    (CRM)     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Kanban State Manager                    │        │
│  └─────────────────────────────────────────────────────┘        │
│         │                                                        │
│         ▼                                                        │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐        │
│  │ Vercel │   DO   │ Claude │  RPi   │ Mobile │ Docker │        │
│  └────────┴────────┴────────┴────────┴────────┴────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
blackroad-docker-manager/
├── .github/
│   ├── AGENTS.md              # AI agent instructions
│   ├── KANBAN.md              # Kanban system documentation
│   ├── PROJECT_BOARD.yml      # GitHub Projects configuration
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       ├── pr-validation.yml  # PR quality gates
│       └── kanban-sync.yml    # Kanban state sync
├── kanban/
│   ├── integrations/          # Service integrations
│   │   ├── endpoints.json     # All API configurations
│   │   ├── cloudflare-worker.js
│   │   ├── salesforce-sync.js
│   │   ├── vercel-integration.js
│   │   ├── digitalocean-integration.js
│   │   ├── claude-integration.js
│   │   └── raspberry-pi.js
│   ├── hashing/               # Hash verification
│   │   ├── sha256.py          # Standard SHA-256
│   │   ├── sha_infinity.py    # Multi-layer hashing
│   │   └── README.md
│   ├── templates/             # Task templates
│   │   ├── bug-fix.md
│   │   ├── feature.md
│   │   ├── integration.md
│   │   └── documentation.md
│   ├── mobile/                # Mobile app configs
│   │   ├── README.md
│   │   ├── termius-config.json
│   │   ├── ish-setup.sh
│   │   └── pyto-scripts/
│   ├── state/                 # Kanban state
│   │   └── current.json
│   └── todos/
│       └── pending.md
├── scripts/
│   ├── check-endpoints.sh     # Health check all endpoints
│   ├── generate-hashes.sh     # Generate file hashes
│   └── deploy.sh              # Multi-environment deploy
├── .env.example               # Environment template
├── .gitignore
└── README.md
```

## Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| GitHub | Source control, Projects | Active |
| Cloudflare | State management, Workers | Configured |
| Salesforce | CRM, customer tracking | Configured |
| Vercel | Deployment, previews | Configured |
| DigitalOcean | Infrastructure | Configured |
| Claude API | AI assistance | Configured |
| Raspberry Pi | Edge computing | Configured |

## Kanban Workflow

1. **Backlog** → Tasks enter the system
2. **Triage** → Evaluated for priority
3. **Ready** → Prioritized and requirements clear
4. **In Progress** → Being worked on (max 3 per agent)
5. **Review** → PR submitted
6. **Testing** → Validation phase
7. **Done** → Completed and merged

## Hash Verification

All changes are verified using SHA-256:

```bash
# Generate hashes
./scripts/generate-hashes.sh

# Or use Python directly
python3 kanban/hashing/sha256.py hash-dir .
```

For maximum security, use SHA-Infinity (multi-layer hashing):

```bash
python3 kanban/hashing/sha_infinity.py demo
```

## Mobile Development

Full iOS development support:

- **Working Copy**: Git operations
- **Termius**: SSH access
- **iSH**: Linux shell
- **Pyto**: Python scripts

See [kanban/mobile/README.md](kanban/mobile/README.md) for setup.

## Configuration

1. Copy `.env.example` to `.env`
2. Fill in your API credentials
3. Run `./scripts/check-endpoints.sh` to verify

## Contributing

1. Read [.github/AGENTS.md](.github/AGENTS.md)
2. Claim a task from the kanban board
3. Create a feature branch
4. Generate hashes before committing
5. Submit PR using the template

## About BlackRoad

BlackRoad OS is building the future of development tools and infrastructure.

- Website: [blackroad.systems](https://blackroad.systems)
- Email: blackroad.systems@gmail.com

---

🖤🛣️ **Built with BlackRoad**
