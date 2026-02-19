#!/bin/bash
# Check production file counts vs local newbrand
SERVER="root@154.66.197.199"
REMOTE="/var/www/dbc"

echo "========================================"
echo "  PRODUCTION vs LOCAL FILE COMPARISON"
echo "========================================"
echo ""

echo "--- HTML Pages ---"
REMOTE_HTML=$(ssh $SERVER "ls $REMOTE/*.html 2>/dev/null | wc -l")
LOCAL_HTML=$(ls /Users/florisolivier/DBC/newbrand/*.html 2>/dev/null | wc -l)
echo "  Production: $REMOTE_HTML"
echo "  Local:      $LOCAL_HTML"
echo ""

echo "--- Frontend JS ---"
REMOTE_JS=$(ssh $SERVER "ls $REMOTE/frontend/*.js 2>/dev/null | wc -l")
LOCAL_JS=$(ls /Users/florisolivier/DBC/newbrand/frontend/*.js 2>/dev/null | wc -l)
echo "  Production: $REMOTE_JS"
echo "  Local:      $LOCAL_JS"
echo ""

echo "--- CSS ---"
REMOTE_CSS=$(ssh $SERVER "ls $REMOTE/css/*.css 2>/dev/null | wc -l")
LOCAL_CSS=$(ls /Users/florisolivier/DBC/newbrand/css/*.css 2>/dev/null | wc -l)
echo "  Production: $REMOTE_CSS"
echo "  Local:      $LOCAL_CSS"
echo ""

echo "--- Backend Controllers ---"
REMOTE_CTRL=$(ssh $SERVER "ls $REMOTE/backend/controllers/*.js 2>/dev/null | wc -l")
LOCAL_CTRL=$(ls /Users/florisolivier/DBC/newbrand/backend/controllers/*.js 2>/dev/null | wc -l)
echo "  Production: $REMOTE_CTRL"
echo "  Local:      $LOCAL_CTRL"
echo ""

echo "--- Backend Routes ---"
REMOTE_ROUTES=$(ssh $SERVER "ls $REMOTE/backend/routes/*.js 2>/dev/null | wc -l")
LOCAL_ROUTES=$(ls /Users/florisolivier/DBC/newbrand/backend/routes/*.js 2>/dev/null | wc -l)
echo "  Production: $REMOTE_ROUTES"
echo "  Local:      $LOCAL_ROUTES"
echo ""

echo "--- Database Models ---"
REMOTE_MODELS=$(ssh $SERVER "ls $REMOTE/backend/modules/database/models/*.js 2>/dev/null | wc -l")
LOCAL_MODELS=$(ls /Users/florisolivier/DBC/newbrand/backend/modules/database/models/*.js 2>/dev/null | wc -l)
echo "  Production: $REMOTE_MODELS"
echo "  Local:      $LOCAL_MODELS"
echo ""

echo "--- Middleware ---"
REMOTE_MW=$(ssh $SERVER "ls $REMOTE/backend/middleware/*.js 2>/dev/null | wc -l")
LOCAL_MW=$(ls /Users/florisolivier/DBC/newbrand/backend/middleware/*.js 2>/dev/null | wc -l)
echo "  Production: $REMOTE_MW"
echo "  Local:      $LOCAL_MW"
echo ""

echo "--- Images ---"
REMOTE_IMG=$(ssh $SERVER "ls $REMOTE/images/* 2>/dev/null | wc -l")
LOCAL_IMG=$(ls /Users/florisolivier/DBC/newbrand/images/* 2>/dev/null | wc -l)
echo "  Production: $REMOTE_IMG"
echo "  Local:      $LOCAL_IMG"
echo ""

echo "========================================"
echo "  MISSING FRONTEND JS ON PRODUCTION"
echo "========================================"
LOCAL_FILES=$(ls /Users/florisolivier/DBC/newbrand/frontend/*.js 2>/dev/null | xargs -n1 basename)
REMOTE_FILES=$(ssh $SERVER "ls $REMOTE/frontend/*.js 2>/dev/null | xargs -n1 basename")

MISSING=0
for f in $LOCAL_FILES; do
  if ! echo "$REMOTE_FILES" | grep -q "^${f}$"; then
    echo "  MISSING: $f"
    MISSING=$((MISSING + 1))
  fi
done
echo "  Total missing: $MISSING"
echo ""

echo "========================================"
echo "  MISSING CONTROLLERS ON PRODUCTION"
echo "========================================"
LOCAL_CTRL_FILES=$(ls /Users/florisolivier/DBC/newbrand/backend/controllers/*.js 2>/dev/null | xargs -n1 basename)
REMOTE_CTRL_FILES=$(ssh $SERVER "ls $REMOTE/backend/controllers/*.js 2>/dev/null | xargs -n1 basename")

MISSING_CTRL=0
for f in $LOCAL_CTRL_FILES; do
  if ! echo "$REMOTE_CTRL_FILES" | grep -q "^${f}$"; then
    echo "  MISSING: $f"
    MISSING_CTRL=$((MISSING_CTRL + 1))
  fi
done
echo "  Total missing: $MISSING_CTRL"
echo ""

echo "========================================"
echo "  MISSING MODELS ON PRODUCTION"
echo "========================================"
LOCAL_MODEL_FILES=$(ls /Users/florisolivier/DBC/newbrand/backend/modules/database/models/*.js 2>/dev/null | xargs -n1 basename)
REMOTE_MODEL_FILES=$(ssh $SERVER "ls $REMOTE/backend/modules/database/models/*.js 2>/dev/null | xargs -n1 basename")

MISSING_MODELS=0
for f in $LOCAL_MODEL_FILES; do
  if ! echo "$REMOTE_MODEL_FILES" | grep -q "^${f}$"; then
    echo "  MISSING: $f"
    MISSING_MODELS=$((MISSING_MODELS + 1))
  fi
done
echo "  Total missing: $MISSING_MODELS"
echo ""

echo "========================================"
echo "  DONE"
echo "========================================"
