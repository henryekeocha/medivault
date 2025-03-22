#!/bin/bash

# Script to switch between development and production environments

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default to development if no argument is provided
ENV=${1:-development}

# Convert to lowercase
ENV=$(echo "$ENV" | tr '[:upper:]' '[:lower:]')

# Validate input
if [[ "$ENV" != "development" && "$ENV" != "production" ]]; then
  echo -e "${RED}Error: Invalid environment. Use 'development' or 'production'.${NC}"
  exit 1
fi

# Project root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Source and destination files
SRC_FILE="$ROOT_DIR/.env.$ENV"
DEST_FILE="$ROOT_DIR/.env"

# Check if source file exists
if [ ! -f "$SRC_FILE" ]; then
  echo -e "${RED}Error: Environment file $SRC_FILE does not exist.${NC}"
  exit 1
fi

# Copy environment file
cp "$SRC_FILE" "$DEST_FILE"

# Show confirmation
echo -e "${GREEN}Successfully set environment to ${YELLOW}$ENV${GREEN}.${NC}"

# Additional environment-specific actions
if [ "$ENV" = "development" ]; then
  echo -e "${GREEN}Using local development services:${NC}"
  echo -e "  ${YELLOW}API:${NC} http://localhost:3001/api"
  echo -e "  ${YELLOW}WebSocket:${NC} ws://localhost:3001"
  echo -e "  ${YELLOW}App:${NC} http://localhost:3000"
  echo -e "${YELLOW}Remember to start your local backend server!${NC}"
else
  echo -e "${GREEN}Using production services:${NC}"
  echo -e "  ${YELLOW}API:${NC} https://api.medivault.online/api"
  echo -e "  ${YELLOW}WebSocket:${NC} wss://api.medivault.online"
  echo -e "  ${YELLOW}App:${NC} https://medivault.online"
fi

echo -e "${GREEN}Ready to run:${NC} npm run dev" 