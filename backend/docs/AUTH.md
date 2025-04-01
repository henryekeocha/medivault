## User Synchronization Strategy

To maintain data consistency between Clerk and our database, we implement a multi-layered synchronization strategy:

### 1. Session-based Synchronization

The backend synchronizes user data on authenticated requests using the `syncUserMiddleware`. This ensures data consistency even without webhooks in development environments:

```typescript
// Applied to authenticated routes via bypassAuth middleware
app.use('/api/protected-route', bypassAuth, protectedRoutes); 
```

This middleware:
- Checks if user data needs syncing (based on last update time)
- Fetches latest data from Clerk
- Updates our database with current user information
- Has minimal performance impact due to threshold checks

### 2. Explicit Synchronization API

For critical user data changes, we provide an explicit sync endpoint:

```typescript
// Backend route
app.use('/api/sync', bypassAuth, syncUserMiddleware, syncRoutes);

// Frontend client code
const response = await fetch('/api/sync/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. Frontend-triggered Synchronization

The frontend triggers synchronization at key points:
- After successful login
- On profile page load
- After profile updates
- When user data is critical for the current operation

### 4. Production Considerations

In production, this strategy should be supplemented with webhooks for real-time updates. The code is structured to allow easy addition of webhook handlers when deploying to production.

When configuring Clerk webhooks for production:
1. Create a webhook endpoint in Clerk Dashboard pointing to `/api/webhook/clerk`
2. Configure these event types:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `factor.created`
   - `factor.verified`
   - `factor.revoked`
   - `session.created`
3. Set the `CLERK_WEBHOOK_SECRET` environment variable to the secret from Clerk 