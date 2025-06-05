#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status.
set -e

# ----- Node.js version check -----
# Verify Node.js is installed and version is >=20.
if ! command -v node >/dev/null; then
  echo "Error: Node.js is not installed." >&2
  exit 1
fi
NODE_MAJOR=$(node -p 'parseInt(process.versions.node.split(".")[0],10)')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Error: Node.js v20 or higher is required." >&2
  exit 1
fi

# ----- Install project dependencies -----
# Install all dependencies listed in package.json using Yarn.
yarn install

# ----- Ensure required devDependencies -----
DEV_DEPS=(eslint prettier typescript husky lint-staged)
for pkg in "${DEV_DEPS[@]}"; do
  node - <<NODE || yarn add -D "$pkg"
const fs = require('fs');
const pkg = require('./package.json');
const name = process.argv[1];
if ((pkg.dependencies && pkg.dependencies[name]) || (pkg.devDependencies && pkg.devDependencies[name])) {
  process.exit(0);
}
process.exit(1);
NODE
"$pkg"
done

# ----- Initialize ESLint configuration -----
# Try to generate a config using @eslint/create-config. If it fails, fall back to a simple preset.
if [ ! -f .eslintrc.json ] && [ ! -f eslint.config.js ]; then
  if npx --yes @eslint/create-config --config eslint-config-airbnb-base --eslintrc --packageManager yarn --no-install >/dev/null 2>&1; then
    echo "ESLint configuration created via create-config."
  else
    cat > .eslintrc.json <<'EOC'
{
  "env": {
    "browser": true,
    "node": true,
    "es2020": true
  },
  "extends": ["airbnb-base"],
  "parserOptions": {
    "sourceType": "module"
  },
  "rules": {}
}
EOC
  fi
fi

# ----- Create tsconfig.json -----
cat > tsconfig.json <<'EOT'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
EOT

# ----- Update package.json scripts and lint-staged config -----
node - <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts.lint = "eslint 'src/**/*.{js,jsx,ts,tsx}'";
pkg.scripts.format = "prettier --write 'src/**/*.{js,jsx,ts,tsx,json,css,md}'";
pkg.scripts.build = "tsc";
pkg.scripts.prepare = "husky install";
pkg['lint-staged'] = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'git add'],
  '*.{js,jsx,ts,tsx,json,css,md}': ['prettier --write', 'git add']
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
NODE

# ----- Set up Husky and pre-commit hook -----
# Initialize Husky and add a pre-commit hook that runs lint-staged.
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"

# ----- Success message -----
echo "✅  All dependencies installed and configured!"
