# Cognito Frontend-Backend Integration

This document describes the process of migrating AWS Cognito authentication services from the frontend to the backend in the Medical Image Sharing application.

## Overview

As part of our architectural improvements, we've moved AWS Cognito service interactions from the frontend to the backend. This provides several benefits:

1. **Enhanced Security**: AWS credentials are no longer exposed in the frontend
2. **Centralized Authentication**: All authentication logic is now handled in one place
3. **Simplified Frontend**: The frontend now uses a standard API interface rather than AWS SDK
4. **Better Maintainability**: Easier updates to authentication logic

## Changes Made

### Files Moved to Backend

The following files were moved from the frontend to the backend:

1. **Authentication Files**:
   - `cognito-jwt-verifier.ts`
   - `mfa-service.ts`
   - `token-service.ts`

2. **AWS Configuration and Services**:
   - `cognito-config.ts`
   - `cognito-service.ts`
   - `s3-utils.ts`

3. **Middleware**:
   - `cognito-auth.ts`

4. **Migration Script**:
   - `migrate-users-to-cognito.ts`

### New Frontend API Routes

To maintain functionality while improving architecture, we've created several new API routes that proxy requests to the backend:

1. **Authentication Routes**:
   - `/api/auth/cognito/sign-in`
   - `/api/auth/cognito/sign-up`
   - `/api/auth/cognito/confirm-sign-up`
   - `/api/auth/cognito/sign-out`
   - `/api/auth/cognito/user`

2. **Helper Utilities**:
   - `auth-helper.ts` - Common functions for authentication API routes
   - `s3-api.ts` - Frontend API client for S3 operations

### Updated Import References

All references to the moved files were updated to point to the new locations or replacement utilities:

1. Direct AWS configurations now use environment variables
2. S3 operations now use the API client instead of direct AWS SDK calls
3. Authentication now routes through the backend API

## How Authentication Now Works

1. The React `useCognitoAuth` hook makes requests to our frontend API routes
2. These routes proxy the requests to the corresponding backend endpoints
3. The backend contains all AWS SDK code and credentials
4. JWT tokens are passed between frontend and backend for authentication

## Next Steps

- Update any remaining components that directly use AWS SDK
- Ensure proper error handling across all API routes
- Add comprehensive testing for the authentication flow

## References

- AWS Cognito Documentation: https://docs.aws.amazon.com/cognito/
- AWS SDK for JavaScript: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/ 