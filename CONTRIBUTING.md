# Contributing to BlackRoad Docker Manager

Thank you for your interest in contributing! This guide covers both human and AI agent contributions.

## For AI Agents

If you're an AI agent (Claude, GPT, Copilot, etc.), please read [.github/AGENTS.md](.github/AGENTS.md) for specific instructions.

### Quick Reference

1. **Before starting**: Read the kanban state at `kanban/state/current.json`
2. **Claim a task**: Update the task status to "in_progress"
3. **Follow templates**: Use templates in `kanban/templates/`
4. **Generate hashes**: Run `./scripts/generate-hashes.sh`
5. **Submit PR**: Use the PR template

## For Human Contributors

### Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Submit a pull request

### Development Setup

```bash
# Clone the repo
git clone https://github.com/YOUR-USERNAME/blackroad-docker-manager.git
cd blackroad-docker-manager

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Verify setup
./scripts/check-endpoints.sh
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `claude/` - AI agent branches

### Commit Messages

Use conventional commits:

```
feat(integrations): add new Vercel endpoints
fix(hashing): correct SHA-256 file handling
docs(readme): update installation instructions
chore(deps): update dependencies
```

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Run hash verification
4. Fill out the PR template completely
5. Request review from maintainers

### Code Style

- Python: Follow PEP 8
- JavaScript: Use ES6+ features
- Bash: Use shellcheck recommendations
- Add comments for complex logic

### Testing

```bash
# Check Python syntax
find . -name "*.py" -exec python3 -m py_compile {} \;

# Check JavaScript syntax
find . -name "*.js" -exec node --check {} \;

# Generate hashes
./scripts/generate-hashes.sh
```

## Task Templates

Use the appropriate template for your contribution:

- [Bug Fix Template](kanban/templates/bug-fix.md)
- [Feature Template](kanban/templates/feature.md)
- [Integration Template](kanban/templates/integration.md)
- [Documentation Template](kanban/templates/documentation.md)

## Reporting Issues

When reporting bugs:

1. Check existing issues first
2. Include reproduction steps
3. Include environment details
4. Attach relevant logs

## Security

- Never commit credentials
- Use environment variables
- Report security issues privately

## Questions?

- Open an issue for general questions
- Email: blackroad.systems@gmail.com

---

🖤🛣️ Thank you for contributing to BlackRoad!
