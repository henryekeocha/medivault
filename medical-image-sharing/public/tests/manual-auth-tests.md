# Manual Authentication Test Script

This document provides step-by-step instructions for manually testing the authentication flow and user management features of the application.

## Authentication Flow Tests

### Test 1: User Registration

1. Navigate to `/register`
2. Fill in the registration form:
   - Name: `Test User`
   - Email: `testuser@example.com` (use a unique email each time)
   - Password: `Password123`
   - Confirm Password: `Password123`
   - Select Role (if available): `Patient`
3. Click "Register" button
4. Expected results:
   - Success message should appear
   - User should be automatically logged in
   - User should be redirected to the appropriate dashboard based on role
   - LocalStorage should contain token and refreshToken

### Test 2: User Login

1. Navigate to `/login`
2. Fill in the login form:
   - Email: `testuser@example.com` (use the email from registration)
   - Password: `Password123`
3. Click "Login" button
4. Expected results:
   - Success message should appear
   - User should be redirected to the appropriate dashboard based on role
   - LocalStorage should contain token and refreshToken
   - User information should be visible in profile area

### Test 3: Form Validation

1. Navigate to `/login`
2. Test invalid inputs:
   - Empty email (should show error)
   - Invalid email format (should show error)
   - Empty password (should show error)
   - Short password (should show error)
3. Navigate to `/register`
4. Test invalid inputs:
   - Empty name (should show error)
   - Empty email (should show error)
   - Invalid email format (should show error)
   - Empty password (should show error)
   - Passwords not matching (should show error)

### Test 4: User Logout

1. Login as a user
2. Click on the logout button/link in the user menu
3. Expected results:
   - User should be redirected to login page
   - LocalStorage should not contain token and refreshToken
   - Protected routes should no longer be accessible without login

### Test 5: Token Refresh

1. Login as a user
2. Stay on the dashboard for more than 14 minutes (token refresh interval)
3. Perform an action that requires authentication
4. Expected results:
   - Action should complete successfully
   - No redirection to login page should occur
   - LocalStorage should contain updated token

### Test 6: Session Timeout

1. Login as a user
2. Remain inactive for 30 minutes (session timeout)
3. Expected results:
   - User should be automatically logged out
   - User should be redirected to login page
   - LocalStorage should not contain token and refreshToken

## User Management Tests

### Test 7: Admin User Listing

1. Login as an admin user
2. Navigate to the user management page
3. Expected results:
   - List of users should be displayed
   - Pagination controls should work
   - Sorting by columns should work
   - Filter by role should work
   - Filter by status should work
   - Search functionality should work

### Test 8: Create New User (Admin)

1. Login as an admin user
2. Navigate to the user management page
3. Click "Add User" button
4. Fill in the user form:
   - Name: `New Test User`
   - Email: `newtestuser@example.com`
   - Password: `Password123`
   - Confirm Password: `Password123`
   - Role: Select a role
5. Click "Save" button
6. Expected results:
   - Success message should appear
   - New user should appear in the user list
   - User should be able to login with provided credentials

### Test 9: Edit User (Admin)

1. Login as an admin user
2. Navigate to the user management page
3. Find a user and click the edit button
4. Change user details:
   - Update name
   - Update role
5. Click "Save" button
6. Expected results:
   - Success message should appear
   - Updated information should be reflected in the user list
   - User's permissions should reflect the new role

### Test 10: Deactivate User (Admin)

1. Login as an admin user
2. Navigate to the user management page
3. Find a user and click the deactivate button
4. Confirm deactivation
5. Expected results:
   - Success message should appear
   - User's status should change to inactive in the list
   - Deactivated user should not be able to login

### Test 11: Role-Based Access Control

1. Login as a patient user
2. Attempt to access admin routes (e.g., `/admin/users`)
3. Expected results:
   - Access should be denied
   - User should be redirected to appropriate dashboard
4. Login as a provider user
5. Attempt to access admin routes
6. Expected results:
   - Access should be denied
   - User should be redirected to appropriate dashboard
7. Login as an admin user
8. Attempt to access all routes
9. Expected results:
   - Admin should have access to all routes

## Reporting Issues

When reporting issues, please include:
1. Test number and name
2. Step where the issue occurred
3. Expected vs. actual result
4. Browser and device information
5. Screenshots if possible 