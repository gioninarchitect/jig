#!/bin/bash

API_URL="http://localhost:3001/api/v1"

echo "================================"
echo "Testing ALL User Logins"
echo "================================"
echo ""

# Test Admin
echo "1. Testing ADMIN login..."
ADMIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"admin@basothomedicalherbs.ls","password":"Admin123!"}')
if echo "$ADMIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ ADMIN login SUCCESS"
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token')
else
    echo "❌ ADMIN login FAILED"
    echo "$ADMIN_RESPONSE"
fi
echo ""

# Test Manager
echo "2. Testing MANAGER login..."
MANAGER_RESPONSE=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"manager@basothomedicalherbs.ls","password":"Manager123!"}')
if echo "$MANAGER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ MANAGER login SUCCESS"
else
    echo "❌ MANAGER login FAILED"
    echo "$MANAGER_RESPONSE"
fi
echo ""

# Test Assistant
echo "3. Testing ASSISTANT login..."
ASSISTANT_RESPONSE=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"assistant@basothomedicalherbs.ls","password":"Assistant123!"}')
if echo "$ASSISTANT_RESPONSE" | grep -q '"success":true'; then
    echo "✅ ASSISTANT login SUCCESS"
else
    echo "❌ ASSISTANT login FAILED"
    echo "$ASSISTANT_RESPONSE"
fi
echo ""

# Test Regular User
echo "4. Testing USER login..."
USER_RESPONSE=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"user@basothomedicalherbs.ls","password":"User123!"}')
if echo "$USER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ USER login SUCCESS"
else
    echo "❌ USER login FAILED"
    echo "$USER_RESPONSE"
fi
echo ""

# Test Patient
echo "5. Testing PATIENT login..."
PATIENT_RESPONSE=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"patient@basothomedicalherbs.ls","password":"Patient123!"}')
if echo "$PATIENT_RESPONSE" | grep -q '"success":true'; then
    echo "✅ PATIENT login SUCCESS"
else
    echo "❌ PATIENT login FAILED"
    echo "$PATIENT_RESPONSE"
fi
echo ""

# Test fetching users with admin token
if [ ! -z "$ADMIN_TOKEN" ]; then
    echo "6. Testing ADMIN can fetch users from API..."
    USERS_RESPONSE=$(curl -s $API_URL/users -H "Authorization: Bearer $ADMIN_TOKEN")
    USER_COUNT=$(echo "$USERS_RESPONSE" | jq -r '.users | length' 2>/dev/null)
    if [ ! -z "$USER_COUNT" ] && [ "$USER_COUNT" -gt 0 ]; then
        echo "✅ Admin can fetch users: $USER_COUNT users found"
    else
        echo "❌ Admin CANNOT fetch users"
        echo "$USERS_RESPONSE"
    fi
    echo ""

    # Test fetching orders
    echo "7. Testing ADMIN can fetch orders from API..."
    ORDERS_RESPONSE=$(curl -s $API_URL/orders/all -H "Authorization: Bearer $ADMIN_TOKEN")
    if echo "$ORDERS_RESPONSE" | grep -q '"orders"'; then
        ORDER_COUNT=$(echo "$ORDERS_RESPONSE" | jq -r '.orders | length' 2>/dev/null)
        echo "✅ Admin can fetch orders: $ORDER_COUNT orders found"
    else
        echo "❌ Admin CANNOT fetch orders"
        echo "$ORDERS_RESPONSE"
    fi
fi

echo ""
echo "================================"
echo "Testing Complete"
echo "================================"
