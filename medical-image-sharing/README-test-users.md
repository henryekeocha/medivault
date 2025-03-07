# Test Users Creation Guide

This document explains how to create test user accounts for different roles (patient, provider, admin) in the Medical Image Sharing application.

## Option 1: Using the Admin UI

1. Log in as an admin user
2. Navigate to Admin Dashboard
3. Click on "Test Users" card 
4. On the Test Users page, click the "Create Test Users" button
5. The system will attempt to create all predefined test users and display the results

## Option 2: Using the Script (Backend)

We've provided scripts that can directly create test users in the database:

### JavaScript version:

```bash
# From the backend directory
cd backend
node ../medical-image-sharing/scripts/create-test-users.js
```

### TypeScript version:

```bash
# From the medical-image-sharing directory
cd medical-image-sharing
npx ts-node scripts/create-test-users.ts
```

## Test User Accounts

The following test accounts will be created:

| Name | Email | Username | Password | Role | Specialty |
|------|-------|----------|----------|------|-----------|
| Test Patient | patient@test.com | testpatient | Password123! | PATIENT | - |
| Test Provider | provider@test.com | testprovider | Password123! | PROVIDER | RADIOLOGY |
| Test Admin | admin@test.com | testadmin | Password123! | ADMIN | - |
| Test Cardiologist | cardio@test.com | testcardio | Password123! | PROVIDER | CARDIOLOGY |
| Test Neurologist | neuro@test.com | testneuro | Password123! | PROVIDER | NEUROLOGY |

## Notes

- If a user with the same email or username already exists, the creation will be skipped
- All users are created with `isActive: true`
- All passwords are hashed before storing in the database
- You can modify the list of test users by editing the `testUsers` array in the scripts 