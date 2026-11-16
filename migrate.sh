#!/bin/bash
echo "Validating Migration..."
# 1. Check for Cloud Run dependencies in the source code
echo "Checking for legacy Cloud Run references..."
if grep -r "run.app" src/ ; then
  echo "WARNING: Legacy Cloud Run URL found in src/!"
else
  echo "No legacy Cloud Run URLs found in src/."
fi

# 2. Check for potentially exposed secrets
echo "Checking for potential secret leakage..."
if grep -r -E "API_KEY|SECRET|PASSWORD" src/ | grep -v ".env" ; then
  echo "WARNING: Potential secret leakage found in src/!"
else
  echo "No obvious secrets found in src/."
fi

# 3. Final Build Check
echo "Running final build check..."
npm run build && echo "Build successful!" || echo "Build FAILED!"
