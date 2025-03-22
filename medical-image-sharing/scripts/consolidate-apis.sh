#!/bin/bash

# Script to help consolidate API endpoints by removing the v1 prefix
# This will identify v1 endpoints and create a plan to migrate them to standard endpoints

ROOT_DIR="$(pwd)"
APP_DIR="$ROOT_DIR/app"
API_DIR="$APP_DIR/api"
V1_DIR="$API_DIR/v1"

echo "API Consolidation Plan"
echo "======================"
echo "This script will help identify v1 API endpoints that need to be consolidated"
echo 

# Check if v1 directory exists
if [ ! -d "$V1_DIR" ]; then
  echo "No v1 directory found at $V1_DIR"
  exit 1
fi

# Function to find if a standard API endpoint exists
has_standard_endpoint() {
  local endpoint=$1
  if [ -d "$API_DIR/$endpoint" ]; then
    return 0 # True
  else
    return 1 # False
  fi
}

# List all v1 endpoints
echo "V1 Endpoints found:"
echo "------------------"
for endpoint in $(ls -d "$V1_DIR"/*/ 2>/dev/null); do
  endpoint_name=$(basename "$endpoint")
  echo " - $endpoint_name"
  
  # Check if standard endpoint exists
  if has_standard_endpoint "$endpoint_name"; then
    echo "   ✓ Standard endpoint exists at: app/api/$endpoint_name"
    
    # Check if they are identical
    diff_output=$(diff -rq "$API_DIR/$endpoint_name" "$V1_DIR/$endpoint_name" 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo "   ✓ Endpoints are identical"
      echo "   → Safe to remove v1 endpoint"
    else
      echo "   ✗ Endpoints differ"
      echo "   → Manual merge required"
      echo "   → Differences:"
      diff -rq "$API_DIR/$endpoint_name" "$V1_DIR/$endpoint_name" 2>/dev/null | sed 's/^/      /'
    fi
  else
    echo "   ✗ No standard endpoint exists"
    echo "   → Need to create standard endpoint"
  fi
  echo
done

# Recommendations
echo "Recommendations:"
echo "---------------"
echo "1. For endpoints with standard versions that are identical:"
echo "   - Make sure client.ts is updated to use the standard endpoint"
echo "   - Then remove the v1 endpoint"
echo
echo "2. For endpoints with standard versions that differ:"
echo "   - Compare and merge the functionality"
echo "   - Make sure client.ts is updated to use the standard endpoint"
echo "   - Then remove the v1 endpoint"
echo
echo "3. For endpoints without standard versions:"
echo "   - Create standard endpoints at app/api/<endpoint_name>"
echo "   - Copy the functionality from the v1 endpoint"
echo "   - Make sure client.ts is updated to use the standard endpoint"
echo "   - Then remove the v1 endpoint"
echo 