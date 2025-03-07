# AWS Cognito Integration

This document provides an overview of the AWS Cognito integration for the Medical Image Sharing application.

## Overview

AWS Cognito is a fully managed identity service that provides user sign-up, sign-in, and access control for web and mobile applications. This integration allows us to leverage AWS Cognito for authentication and authorization, providing a more secure and scalable solution compared to our previous NextAuth.js implementation.

## Features

- User sign-up and sign-in
- Multi-factor authentication (MFA)
- Password reset and account recovery
- Social identity provider integration
- Role-based access control
- Token-based authentication
- User profile management
- Security logging and monitoring

## Implementation

The Cognito integration consists of the following components:

### Backend

- **Cognito Service**: A service layer for interacting with AWS Cognito APIs
- **JWT Verifier**: A utility for verifying Cognito JWT tokens
- **Authentication Middleware**: Middleware for protecting API routes
- **Migration Script**: A script for migrating users from NextAuth.js to Cognito

### Frontend

- **Cognito Auth Hook**: A React hook for using Cognito authentication
- **Cognito Auth Context**: A React context provider for Cognito authentication
- **Authentication UI**: UI components for sign-up, sign-in, and account management

## Configuration

To use the Cognito integration, you need to set up the following environment variables:

```
# AWS Cognito
COGNITO_USER_POOL_ID="us-east-1_xxxxxxxx"
COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
COGNITO_IDENTITY_POOL_ID="us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
COGNITO_DOMAIN="your-domain.auth.us-east-1.amazoncognito.com"

# AWS Region
AWS_REGION="us-east-1"
NEXT_PUBLIC_AWS_REGION="us-east-1"
```

## User Migration

To migrate users from NextAuth.js to Cognito, use the provided migration script:

```bash
# Dry run (no changes)
npm run migrate-users-to-cognito -- --dry-run

# Migrate all users
npm run migrate-users-to-cognito

# Migrate specific user
npm run migrate-users-to-cognito -- --user-id=123

# Migrate users with specific role
npm run migrate-users-to-cognito -- --role=ADMIN

# Migrate in batches
npm run migrate-users-to-cognito -- --batch-size=10
```

## Usage

### Backend API Authentication

```typescript
import { requireAuth, requireRole } from '@/middleware/cognito-auth';

// Require authentication
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult) {
    return authResult; // Return error response if authentication failed
  }
  
  // Continue with authenticated request...
}

// Require specific role
export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, ['ADMIN', 'PROVIDER']);
  if (authResult) {
    return authResult; // Return error response if authorization failed
  }
  
  // Continue with authorized request...
}
```

### Frontend Authentication

```tsx
// In _app.tsx or layout.tsx
import { CognitoAuthProvider } from '@/contexts/CognitoAuthContext';

function MyApp({ Component, pageProps }) {
  return (
    <CognitoAuthProvider>
      <Component {...pageProps} />
    </CognitoAuthProvider>
  );
}

// In a component
import { useCognitoAuthContext } from '@/contexts/CognitoAuthContext';

function MyComponent() {
  const { isAuthenticated, user, signIn, signOut } = useCognitoAuthContext();
  
  // Use authentication state and methods...
}

// Protect a route
import { withCognitoAuth, withCognitoRole } from '@/contexts/CognitoAuthContext';

// Require authentication
const ProtectedPage = withCognitoAuth(MyComponent);

// Require specific role
const AdminPage = withCognitoRole(MyComponent, ['ADMIN']);
```

## Security Considerations

- Cognito tokens are stored in localStorage, which is vulnerable to XSS attacks. Consider using HTTP-only cookies for production.
- Always validate tokens on the server side before processing requests.
- Use HTTPS for all API requests to prevent token interception.
- Implement proper error handling and logging for security events.
- Regularly rotate credentials and review security logs.

## Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/index.html)
- [JWT Verification](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
- [Cognito User Migration](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html) 