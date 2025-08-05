#!/bin/bash

# Test script for ImmuDB CRUD API
# Make sure the application is running before executing this script

BASE_URL="http://localhost:3000"

echo "🚀 Testing ImmuDB CRUD API"
echo "========================="

# Test 1: Health check
echo "1. Health Check:"
curl -s "$BASE_URL/health" | jq '.'
echo ""

# Test 2: Create users
echo "2. Creating users:"
echo "Creating user 1..."
curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user001",
    "name": "Alice Johnson",
    "email": "alice@example.com"
  }' | jq '.'

echo "Creating user 2..."
curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user002", 
    "name": "Bob Smith",
    "email": "bob@example.com"
  }' | jq '.'

echo "Creating user 3..."
curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user003",
    "name": "Carol Davis",
    "email": "carol@example.com"
  }' | jq '.'

echo ""

# Test 3: Get all users
echo "3. Getting all users:"
curl -s "$BASE_URL/users" | jq '.'
echo ""

# Test 4: Get specific user
echo "4. Getting specific user (user001):"
curl -s "$BASE_URL/users/user001" | jq '.'
echo ""

# Test 5: Update user
echo "5. Updating user001:"
curl -s -X PUT "$BASE_URL/users/user001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson-Smith",
    "email": "alice.smith@example.com"
  }' | jq '.'
echo ""

# Test 6: Get updated user
echo "6. Getting updated user:"
curl -s "$BASE_URL/users/user001" | jq '.'
echo ""

# Test 7: Try to get non-existent user
echo "7. Trying to get non-existent user:"
curl -s "$BASE_URL/users/nonexistent" | jq '.'
echo ""

echo "✅ Test completed!"
echo ""
echo "🔍 To view the database:"
echo "1. ImmuDB Web Console: http://localhost:9497"
echo "2. Add debug endpoints to your application (see debug-routes.ts)"
echo "3. Use ImmuAdmin CLI tool"
