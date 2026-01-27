# Mobile Development Setup

## Overview

This guide covers setting up mobile development tools for working with the BlackRoad Docker Manager on iOS devices. These apps enable full development capability from anywhere.

## Supported Apps

| App | Purpose | Platform | License |
|-----|---------|----------|---------|
| **Termius** | SSH client | iOS/Android | Freemium |
| **iSH** | Linux shell | iOS | Free |
| **Shellfish** | SFTP/SSH | iOS | Paid |
| **Working Copy** | Git client | iOS | Freemium |
| **Pyto** | Python IDE | iOS | Paid |

## Quick Start

### 1. Working Copy (Git)

Working Copy is the primary Git client for iOS development.

**Clone Repository:**
1. Open Working Copy
2. Tap + → Clone Repository
3. Enter: `https://github.com/BlackRoad-OS/blackroad-docker-manager.git`
4. Authenticate with GitHub

**URL Scheme:**
```
working-copy://open?repo=blackroad-docker-manager
working-copy://x-callback-url/pull?repo=blackroad-docker-manager
working-copy://x-callback-url/push?repo=blackroad-docker-manager
```

### 2. Termius (SSH)

Termius provides secure SSH access to development servers.

**Import Hosts Configuration:**
```json
{
  "hosts": [
    {
      "label": "Dev Server",
      "address": "${DEV_SERVER_IP}",
      "port": 22,
      "username": "developer",
      "authType": "key"
    },
    {
      "label": "Raspberry Pi",
      "address": "${RPI_IP}",
      "port": 22,
      "username": "pi",
      "authType": "key"
    }
  ]
}
```

### 3. iSH (Linux Shell)

iSH provides a full Alpine Linux environment on iOS.

**Initial Setup:**
```bash
# Update packages
apk update && apk upgrade

# Install development tools
apk add git python3 py3-pip nodejs npm curl openssh

# Clone repository
git clone https://github.com/BlackRoad-OS/blackroad-docker-manager.git
cd blackroad-docker-manager

# Install Python dependencies
pip3 install -r requirements.txt
```

**Shared Files:**
iSH can access files in `/iCloud/iSH/` when iCloud is enabled.

### 4. Shellfish (SFTP/SSH)

Shellfish provides file management and terminal access.

**Features:**
- SFTP file browser
- SSH terminal
- Files app integration
- Shortcut automation

**Setup:**
1. Add server connection
2. Import SSH key
3. Enable Files app provider

### 5. Pyto (Python)

Pyto is a full Python IDE for iOS.

**Setup:**
```python
# Install required packages in Pyto
import subprocess
subprocess.run(['pip', 'install', 'requests', 'pyyaml'])
```

**Run Hashing Scripts:**
```python
import os
os.chdir('/iCloud/blackroad-docker-manager')

# Run SHA-256 hashing
exec(open('kanban/hashing/sha256.py').read())
```

## Workflow Integration

### Mobile Development Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Working Copy   │────►│     Edit        │────►│   Commit/Push   │
│  (Clone/Pull)   │     │ (Any Text App)  │     │  (Working Copy) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                             ┌─────────────────┐
│   iSH / Pyto    │                             │    Termius      │
│  (Run Scripts)  │                             │   (Deploy)      │
└─────────────────┘                             └─────────────────┘
```

### Shortcuts Automation

Create iOS Shortcuts for common tasks:

**Quick Commit:**
1. Open Working Copy
2. Stage changes
3. Commit with message
4. Push to remote

**Deploy to Pi:**
1. SSH via Termius
2. Run deployment script
3. Check health status

## Configuration Files

### termius-config.json
Located at: `kanban/mobile/termius-config.json`

### ish-setup.sh
Located at: `kanban/mobile/ish-setup.sh`

### pyto-scripts/
Python scripts optimized for Pyto located at: `kanban/mobile/pyto-scripts/`

## Tips

1. **Sync via iCloud**: Use iCloud folder for cross-app file sharing
2. **SSH Keys**: Store keys securely in each app's keychain
3. **Offline Work**: Working Copy supports full offline Git operations
4. **Shortcuts**: Automate repetitive tasks with iOS Shortcuts
5. **Split View**: Use iPad split view for editing + terminal

## Troubleshooting

### Working Copy
- **Push fails**: Check GitHub token permissions
- **Conflicts**: Use merge tool or resolve in-app

### Termius
- **Connection timeout**: Check network/VPN
- **Key auth fails**: Verify key format (OpenSSH)

### iSH
- **Slow performance**: Normal for emulation
- **Package missing**: `apk add <package>`

### Pyto
- **Import error**: Install package via pip
- **File access**: Enable Files permissions
