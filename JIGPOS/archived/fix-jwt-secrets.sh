#!/bin/bash
# Script to fix all JWT_SECRET fallbacks in remaining files

cd /Users/florisolivier/BMH/backend

echo "Fixing JWT secrets in remaining files..."

# Fix routes/viral.js
if grep -q "JWT_SECRET.*||" routes/viral.js; then
  echo "Fixing routes/viral.js..."
  # This will be done manually via Edit tool
fi

# Fix routes/affiliate.js
if grep -q "JWT_SECRET.*||" routes/affiliate.js; then
  echo "Fixing routes/affiliate.js..."
  # This will be done manually via Edit tool
fi

# Fix modules/websocket/index.js
if grep -q "JWT_SECRET.*||" modules/websocket/index.js; then
  echo "Fixing modules/websocket/index.js..."
  # This will be done manually via Edit tool
fi

# Fix api-mongodb.js
if grep -q "JWT_SECRET.*||" api-mongodb.js; then
  echo "Fixing api-mongodb.js..."
  # This will be done manually via Edit tool
fi

# Fix api-gamified.js
if grep -q "JWT_SECRET.*||" api-gamified.js; then
  echo "Fixing api-gamified.js..."
  # This will be done manually via Edit tool
fi

# Fix auth.js
if grep -q "JWT_SECRET.*||" auth.js; then
  echo "Fixing auth.js..."
  # This will be done manually via Edit tool
fi

echo "Done listing files to fix"
