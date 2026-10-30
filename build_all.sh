#!/bin/bash
# ==============================================================================
# SAI Ethio • SeeraAI All-in-One Termux Build & Environment Setup Script
# ==============================================================================
set -e

# Log all output to file and console
LOG_FILE="seeraai_build_all.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=================================================="
echo "🚀 SAI Ethio • SeeraAI Termux Build Started"
echo "Timestamp: $(date)"
echo "=================================================="

# 0. Navigate to project root directory
SCRIPT_DIR="$(dirname "$(realpath "$0" 2>/dev/null || readlink -f "$0" 2>/dev/null || echo "$0")")"
cd "$SCRIPT_DIR"

if [ ! -f "package.json" ]; then
  for dir in "." ".." "../.." "../../.."; do
    if [ -f "$dir/package.json" ]; then
      cd "$dir"
      break
    fi
  done
fi

if [ ! -f "package.json" ]; then
  echo "❌ ERROR: package.json not found! Please run this script from inside the project folder."
  exit 1
fi

echo "📂 Working Directory: $(pwd)"

# 1. Check for Node.js and npm
echo "[1/6] Verifying Node.js and npm..."
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
  echo "❌ ERROR: Node.js or npm is missing. Please install nodejs via: pkg install nodejs"
  exit 1
fi
echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

# 2. Check for Java / openjdk-17
echo "[2/6] Verifying Java (openjdk-17)..."
if ! command -v java &> /dev/null; then
  echo "⚠️ WARNING: Java is not detected in PATH."
  echo "Please install openjdk-17 by running: pkg install openjdk-17"
  echo "Attempting to continue or locate java..."
else
  java -version
  echo "✅ Java check passed."
fi

# 3. Clean previous build artifacts and dependencies
echo "[3/6] Cleaning existing build artifacts & cache..."
rm -rf node_modules dist dist-distribution .vite
npm cache clean --force
echo "✅ Environment cleaned successfully."

# 4. Clean npm install
echo "[4/6] Installing dependencies (npm install)..."
npm install || { echo "❌ ERROR: npm install failed."; exit 1; }
echo "✅ Dependencies installed successfully."

# 5. Build distribution assets
echo "[5/6] Building production distribution (npm run build:distribution)..."
if grep -q "build:distribution" package.json; then
  npm run build:distribution || { echo "❌ ERROR: Distribution build failed."; exit 1; }
else
  echo "⚠️ 'build:distribution' script not found. Running standard 'npm run build'..."
  npm run build || { echo "❌ ERROR: Standard build failed."; exit 1; }
fi
echo "✅ Distribution build completed."

# 6. Bubblewrap APK/AAB Build
echo "[6/6] Building TWA APK/AAB with Bubblewrap..."
if [ ! -f "twa-manifest.json" ]; then
  echo "❌ ERROR: twa-manifest.json is missing!"
  exit 1
fi

if command -v bubblewrap &> /dev/null; then
  bubblewrap build --manifest=twa-manifest.json || { echo "❌ ERROR: Bubblewrap build failed."; exit 1; }
else
  echo "⚠️ Bubblewrap CLI not found globally. Running via npx..."
  npx @bubblewrap/cli build --manifest=twa-manifest.json || { echo "❌ ERROR: Bubblewrap build failed."; exit 1; }
fi

echo "=================================================="
echo "🎉 SUCCESS: SeeraAI APK/AAB build completed successfully!"
echo "📄 Detailed log saved to: $LOG_FILE"
echo "=================================================="
