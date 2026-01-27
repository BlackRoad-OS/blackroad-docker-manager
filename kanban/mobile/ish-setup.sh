#!/bin/sh
# iSH Setup Script for BlackRoad Docker Manager
# Run this script after installing iSH on iOS

set -e

echo "=================================="
echo "BlackRoad Docker Manager - iSH Setup"
echo "=================================="

# Update package repository
echo "[1/7] Updating package repository..."
apk update

# Upgrade existing packages
echo "[2/7] Upgrading packages..."
apk upgrade

# Install essential tools
echo "[3/7] Installing essential tools..."
apk add \
    git \
    curl \
    wget \
    openssh \
    openssh-keygen \
    ca-certificates \
    bash \
    zsh \
    vim \
    nano

# Install development tools
echo "[4/7] Installing development tools..."
apk add \
    python3 \
    py3-pip \
    nodejs \
    npm \
    jq \
    make \
    gcc \
    musl-dev \
    python3-dev

# Install Python packages
echo "[5/7] Installing Python packages..."
pip3 install --upgrade pip
pip3 install \
    requests \
    pyyaml \
    python-dotenv \
    click

# Configure Git
echo "[6/7] Configuring Git..."
git config --global init.defaultBranch main
git config --global pull.rebase false

# Create directory structure
echo "[7/7] Setting up directories..."
mkdir -p ~/projects
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Clone repository (optional - uncomment if needed)
# cd ~/projects
# git clone https://github.com/BlackRoad-OS/blackroad-docker-manager.git

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Configure SSH keys:"
echo "   ssh-keygen -t ed25519 -C 'ish@blackroad'"
echo ""
echo "2. Clone the repository:"
echo "   cd ~/projects"
echo "   git clone https://github.com/BlackRoad-OS/blackroad-docker-manager.git"
echo ""
echo "3. Configure Git user:"
echo "   git config --global user.email 'your@email.com'"
echo "   git config --global user.name 'Your Name'"
echo ""
echo "4. For iCloud access, files are at: /iCloud/"
echo ""
echo "Enjoy mobile development with BlackRoad!"
