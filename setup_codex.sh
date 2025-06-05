#!/usr/bin/env bash
set -euo pipefail

# Ensure Node.js v20+ is installed
if ! command -v node >/dev/null; then
  echo "Error: Node.js is not installed." >&2
  exit 1
fi
NODE_MAJOR=$(node -p 'parseInt(process.versions.node.split(".")[0],10)')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js v20 or higher is required." >&2
  exit 1
fi

# Install or upgrade Corepack via npm
npm install -g corepack

# Try to install Yarn via Corepack
if corepack enable && corepack prepare yarn@stable --activate; then
  echo "Yarn installed via Corepack"
else
  echo "Corepack failed, falling back to npm for Yarn installation"
  npm install -g yarn --force
fi

# Configure Yarn registry
yarn config set npmRegistryServer "https://registry.npmjs.org/" --home
