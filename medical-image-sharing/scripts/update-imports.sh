#!/bin/bash

# Script to update import references for migrated services
# This will replace imports from old files with new ones where applicable

echo "Updating import references in frontend files..."

# Find all TypeScript files
FILES=$(find medical-image-sharing/src -type f -name "*.ts" -o -name "*.tsx")

# Replace auth imports
for file in $FILES; do
  # Skip files in the node_modules directory
  if [[ $file == *"node_modules"* ]]; then
    continue
  fi
  
  # Replace imports from removed files
  sed -i '' 's|import { authOptions } from "@/lib/auth/auth-options"|import { authOptions } from "@/app/api/auth/[...nextauth]/route"|g' "$file"
  sed -i '' "s|import { authOptions } from '@/lib/auth/auth-options'|import { authOptions } from '@/app/api/auth/[...nextauth]/route'|g" "$file"
  
  # Update S3 utils imports
  sed -i '' 's|import { getPresignedUrl } from "@/lib/aws/s3-utils"|import { getPresignedDownloadUrl } from "@/lib/api/s3-api"|g' "$file"
  sed -i '' "s|import { getPresignedUrl } from '@/lib/aws/s3-utils'|import { getPresignedDownloadUrl } from '@/lib/api/s3-api'|g" "$file"
  sed -i '' 's|import { uploadToS3, getPresignedUrl } from "@/lib/aws/s3-utils"|import { getPresignedUploadUrl, getPresignedDownloadUrl } from "@/lib/api/s3-api"|g' "$file"
  sed -i '' "s|import { uploadToS3, getPresignedUrl } from '@/lib/aws/s3-utils'|import { getPresignedUploadUrl, getPresignedDownloadUrl } from '@/lib/api/s3-api'|g" "$file"
  
  # Update middleware imports
  sed -i '' 's|import { requireAuth, getAuthenticatedUser } from "@/middleware/cognito-auth"|// Auth now handled via backend API|g' "$file"
  sed -i '' "s|import { requireAuth, getAuthenticatedUser } from '@/middleware/cognito-auth'|// Auth now handled via backend API|g" "$file"
done

echo "Import references updated." 