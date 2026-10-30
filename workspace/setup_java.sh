#!/usr/bin/env bash
# ==============================================================================
# Termux Java 21 & Bubblewrap Environment Setup Script
# ==============================================================================
set -e

echo "[1/5] Updating Termux packages..."
pkg update -y || apt-get update -y

echo "[2/5] Ensuring tur-repo is installed..."
pkg install -y tur-repo || true

echo "[3/5] Updating package lists after adding repositories..."
pkg update -y

echo "[4/5] Installing OpenJDK 21..."
pkg install -y openjdk-21

echo "[5/5] Configuring JAVA_HOME and PATH environment variables..."
JAVA_PATH="$PREFIX"
export JAVA_HOME="$JAVA_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

# Persist environment variables in .bashrc and .zshrc if they exist
for profile in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$profile" ] || [ -d "$(dirname "$profile")" ]; then
        grep -q "JAVA_HOME" "$profile" 2>/dev/null || echo -e "\nexport JAVA_HOME=$JAVA_PATH\nexport PATH=\$JAVA_HOME/bin:\$PATH" >> "$profile"
    fi
done

echo "=============================================================================="
echo "✅ Java installation and environment setup completed successfully!"
echo "JAVA_HOME: $JAVA_HOME"
echo "Java Version Check:"
java -version
echo "=============================================================================="
