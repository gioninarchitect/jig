#!/bin/bash

API_URL="http://localhost:3001/api/v1"

echo "================================"
echo "COMPREHENSIVE ROLE TESTING"
echo "================================"
echo ""

test_login_and_redirect() {
    local role=$1
    local email=$2
    local password=$3
    local expected_page=$4

    echo "Testing $role..."
    echo "  Email: $email"

    RESPONSE=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"$password\"}")

    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo "  ✅ API Login: SUCCESS"

        ROLE=$(echo "$RESPONSE" | jq -r '.user.role')
        FIRSTNAME=$(echo "$RESPONSE" | jq -r '.user.firstName')
        LASTNAME=$(echo "$RESPONSE" | jq -r '.user.lastName')

        echo "  📋 Role in DB: $ROLE"
        echo "  👤 Name: $FIRSTNAME $LASTNAME"
        echo "  🎯 Expected redirect: $expected_page"

        # Check if user has Section 21 status
        if [ "$role" == "PATIENT" ]; then
            SECTION21=$(echo "$RESPONSE" | jq -r '.user.section21Status // "none"')
            echo "  🏥 Section 21 Status: $SECTION21"
        fi
    else
        echo "  ❌ API Login: FAILED"
        echo "$RESPONSE" | jq '.'
    fi
    echo ""
}

# Test all roles
test_login_and_redirect "ADMIN" "admin@basothomedicalherbs.ls" "Admin123!" "admin.html"
test_login_and_redirect "MANAGER" "manager@basothomedicalherbs.ls" "Manager123!" "admin.html"
test_login_and_redirect "ASSISTANT" "assistant@basothomedicalherbs.ls" "Assistant123!" "admin.html"
test_login_and_redirect "USER" "user@basothomedicalherbs.ls" "User123!" "dashboard.html"
test_login_and_redirect "PENDING S21" "pending@basothomedicalherbs.ls" "Pending123!" "dashboard.html"
test_login_and_redirect "PATIENT" "patient@basothomedicalherbs.ls" "Patient123!" "dashboard.html"

echo "================================"
echo "DATABASE VERIFICATION"
echo "================================"
