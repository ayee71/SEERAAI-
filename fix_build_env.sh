#!/bin/bash
# Stop immediately if any command fails
set -e

# Ensure we operate in the script's directory
cd "$(dirname "$0")"

LOG_FILE="build_env_fix.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=================================================="
echo "SAI Ethio • SeeraAI Clean Build Environment Script"
echo "Timestamp: $(date)"
echo "=================================================="

# 1. Verify Node.js and npm availability
echo "[1/5] Verifying Node.js and npm..."
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
  echo "❌ ERROR: Node.js or npm is not installed or not in PATH."
  exit 1
fi
echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

# 2. Check for package.json
echo "[2/5] Verifying package.json presence..."
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: package.json not found in $(pwd). Please run this script from the project root directory."
  exit 1
fi
echo "✅ package.json found."

# 3. Clean existing node_modules, dist, and dist-distribution folders safely
echo "[3/5] Cleaning existing node_modules, dist, and dist-distribution folders..."
rm -rf node_modules dist dist-distribution .vite
mkdir -p dist dist-distribution
echo "✅ Cleaned build artifacts and created required directories."

# 4. Force npm cache clean
echo "[4/5] Forcing npm cache clean..."
npm cache clean --force || echo "⚠️ npm cache clean warning (non-fatal)."
echo "✅ npm cache cleaned."

# 5. Perform clean npm install
echo "[5/5] Performing clean npm install..."
npm install || { echo "❌ ERROR: npm install failed."; exit 1; }
echo "✅ Clean dependencies installation complete."

echo "=================================================="
echo "🎉 SUCCESS: Build environment is clean and consistent!"
echo "Log saved to $(pwd)/$LOG_FILE"
echo "=================================================="
