#!/bin/bash
# Stop immediately if any command fails
set -e

# Find project root directory containing package.json
SCRIPT_DIR="$(dirname "$(realpath "$0" 2>/dev/null || readlink -f "$0" 2>/dev/null || echo "$0")")"
cd "$SCRIPT_DIR"

if [ ! -f "package.json" ]; then
  # Search parent directories up to 3 levels
  for dir in "." ".." "../.." "../../.."; do
    if [ -f "$dir/package.json" ]; then
      cd "$dir"
      break
    fi
  done
fi

if [ ! -f "package.json" ]; then
  echo "❌ ERROR: package.json not found! Please run this script from inside the project directory."
  exit 1
fi

echo "=================================================="
echo "SAI Ethio • SeeraAI Robust Android Build Script"
echo "Working Directory: $(pwd)"
echo "Timestamp: $(date)"
echo "=================================================="

# 1. Check for openjdk-17 (Java)
echo "[1/4] Checking for openjdk-17 / Java..."
if ! command -v java &> /dev/null; then
  echo "❌ ERROR: Java (openjdk-17) is not installed."
  echo "Please run: pkg install openjdk-17"
  exit 1
fi
java -version
echo "✅ Java check passed."

# 2. Ensure dependencies are installed
echo "[2/4] Ensuring dependencies are installed..."
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules missing. Running npm install..."
  npm install || { echo "❌ ERROR: npm install failed."; exit 1; }
else
  echo "📦 node_modules exists. Ensuring clean package installation..."
  npm install || { echo "❌ ERROR: npm install failed."; exit 1; }
fi
echo "✅ Dependencies check passed."

# 3. Execute npm run build:distribution
echo "[3/4] Building distribution package..."
if grep -q "build:distribution" package.json; then
  npm run build:distribution || { echo "❌ ERROR: Distribution build failed."; exit 1; }
else
  echo "⚠️ 'build:distribution' not found in package.json. Running standard 'npm run build'..."
  npm run build || { echo "❌ ERROR: Standard build failed."; exit 1; }
fi
echo "✅ Distribution build completed."

# 4. Check Bubblewrap CLI and build
echo "[4/4] Checking Bubblewrap CLI and building TWA..."
if [ ! -f "twa-manifest.json" ]; then
  echo "❌ ERROR: twa-manifest.json not found in $(pwd)."
  exit 1
fi

if command -v bubblewrap &> /dev/null; then
  bubblewrap build --manifest=twa-manifest.json || { echo "❌ ERROR: Bubblewrap build failed."; exit 1; }
else
  echo "⚠️ Bubblewrap CLI not found globally. Attempting npx @bubblewrap/cli build..."
  npx @bubblewrap/cli build --manifest=twa-manifest.json || { echo "❌ ERROR: Bubblewrap build failed."; exit 1; }
fi

echo "=================================================="
echo "🎉 SUCCESS: Build completed successfully! Your AAB/APK is ready."
echo "=================================================="
