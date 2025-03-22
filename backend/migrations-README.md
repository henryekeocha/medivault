# Migration from AWS Cognito to Next.js Auth

This document outlines the steps required to migrate from AWS Cognito to Next.js Authentication in the backend.

## Database Schema Changes

We've added two new models to the schema:

1. `UserDevice` - Keeps track of user devices and remembered status
2. `AuthEvent` - Logs authentication events like login attempts and password changes

## Applying Migrations

Run the following commands to apply the migrations:

```bash
# Generate Prisma client with the updated schema
npx prisma generate

# Apply the migration to your database
psql -U your_username -d your_database_name -f prisma/migrations/20250330_add_device_tracking.sql
```

Or, you can use the regular Prisma Migration command:

```bash
npx prisma migrate dev --name add_device_tracking
```

## Code Changes

The following changes were made:

1. Removed Cognito-specific middleware files:
   - `middleware/cognito.ts`
   - `middleware/cognito-auth.ts`

2. Removed Cognito-specific controllers:
   - `controllers/auth/cognito.controller.ts`

3. Removed Cognito-related services:
   - `services/aws/cognito-config.ts`
   - `services/aws/cognito-mfa-service.ts`
   - `services/aws/cognito-service.ts`

4. Updated the main auth middleware:
   - Supports Next.js JWT tokens using NEXTAUTH_SECRET
   - Removed Cognito-specific routes

5. Updated the device tracking service:
   - Created a database-backed implementation instead of Cognito
   - Added new functions for tracking devices and auth events

## Environment Variables

Update your `.env` file to include:

```
NEXTAUTH_SECRET=your_nextauth_secret
JWT_SECRET=your_jwt_secret
```

The `JWT_SECRET` can be the same as the `NEXTAUTH_SECRET` for simplicity.

## Testing

After applying these changes, you should test the following flows:

1. User registration
2. User login
3. JWT token validation
4. Device tracking
5. Authorization and role-based access

The backend now accepts both Next.js Auth tokens and existing JWT tokens for backward compatibility. 