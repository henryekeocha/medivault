# Component to API Mapping

This document maps each component in the Medical Image Sharing Platform to the API endpoints it uses. This helps developers understand the dependencies between the frontend components and backend services.

## Patient Components

### PatientDashboardPage
- **Endpoints Used**:
  - `GET /api/users/profile` - Get user profile
  - `GET /api/images` - Get recent images
  - `GET /api/appointments` - Get upcoming appointments
  - `GET /api/patient/providers` - Get linked providers

### PatientImagesPage
- **Endpoints Used**:
  - `GET /api/images` - Get patient images
  - `POST /api/images/upload` - Upload new images
  - `GET /api/images/{imageId}` - Get image details
  - `DELETE /api/images/{imageId}` - Delete image

### PatientSharePage
- **Endpoints Used**:
  - `GET /api/images` - Get patient images
  - `GET /api/shares` - Get shared images with type="sent"
  - `POST /api/shares` - Share image
  - `DELETE /api/shares/{shareId}` - Revoke access
  - `GET /api/patient/providers` - Get providers for sharing

### PatientProvidersPage
- **Endpoints Used**:
  - `GET /api/patient/providers` - Get linked providers
  - `POST /api/patient/providers/add` - Add provider using code
  - `DELETE /api/patient/providers/{providerId}` - Remove provider

### PatientAppointmentsPage
- **Endpoints Used**:
  - `GET /api/appointments` - Get patient appointments
  - `POST /api/appointments` - Schedule new appointment
  - `PUT /api/appointments/{appointmentId}` - Update appointment
  - `DELETE /api/appointments/{appointmentId}` - Cancel appointment
  - `GET /api/appointments/provider/{providerId}/availability` - Get provider availability

### PatientMessagesPage
- **Endpoints Used**:
  - `GET /api/messages` - Get patient messages
  - `POST /api/messages` - Send new message
  - `GET /api/messages/{messageId}` - Get message details
  - `PUT /api/messages/{messageId}/read` - Mark message as read

## Provider Components

### ProviderDashboardPage
- **Endpoints Used**:
  - `GET /api/users/profile` - Get user profile
  - `GET /api/provider/patients` - Get recent patients
  - `GET /api/appointments` - Get upcoming appointments
  - `GET /api/messages` - Get unread messages count

### ProviderPatientsPage
- **Endpoints Used**:
  - `GET /api/provider/patients` - Get provider patients
  - `GET /api/patients/{patientId}` - Get patient details
  - `GET /api/patients/{patientId}/health-metrics` - Get patient health metrics

### ProviderImagesPage
- **Endpoints Used**:
  - `GET /api/images` - Get images (filtered by patient if selected)
  - `POST /api/images/upload` - Upload new images
  - `GET /api/images/{imageId}` - Get image details

### ProviderSharePage
- **Endpoints Used**:
  - `GET /api/provider/patients` - Get patients
  - `GET /api/images` - Get images for selected patient
  - `GET /api/shares` - Get shared images
  - `POST /api/shares` - Share image
  - `DELETE /api/shares/{shareId}` - Revoke access

### ProviderAnalysisPage
- **Endpoints Used**:
  - `GET /api/images` - Get images pending analysis
  - `GET /api/analyses` - Get analyses for image
  - `POST /api/images/{imageId}/analyze` - Start analysis process
  - `GET /api/images/{imageId}/ai-analysis` - Get AI suggestions
  - `PUT /api/analyses/{analysisId}` - Update analysis findings

### ProviderAvailabilityPage
- **Endpoints Used**:
  - `GET /api/provider/availability/hours` - Get working hours
  - `POST /api/provider/availability/hours` - Save working hours
  - `GET /api/provider/availability/blocks` - Get availability blocks
  - `POST /api/provider/availability/blocks` - Add availability block
  - `DELETE /api/provider/availability/blocks/{blockId}` - Remove availability block
  - `PUT /api/provider/availability/blocks` - Save all availability blocks
  - `GET /api/provider/availability/blocked` - Get blocked times
  - `POST /api/provider/availability/blocked` - Add blocked time
  - `DELETE /api/provider/availability/blocked/{blockedTimeId}` - Remove blocked time
  - `PUT /api/provider/availability/blocked` - Save all blocked times

### ProviderAppointmentsPage
- **Endpoints Used**:
  - `GET /api/appointments` - Get provider appointments
  - `PUT /api/appointments/{appointmentId}` - Update appointment status
  - `DELETE /api/appointments/{appointmentId}` - Cancel appointment

### ProviderMessagesPage
- **Endpoints Used**:
  - `GET /api/messages` - Get provider messages
  - `POST /api/messages` - Send new message
  - `GET /api/messages/{messageId}` - Get message details
  - `PUT /api/messages/{messageId}/read` - Mark message as read

### ProviderAnalyticsPage
- **Endpoints Used**:
  - `GET /api/provider/analytics/patient-activity` - Get patient activity data
  - `GET /api/provider/analytics/image-types` - Get image type distribution
  - `GET /api/provider/analytics/monthly-images` - Get monthly image uploads
  - `GET /api/provider/analytics/stats` - Get general statistics

## Admin Components

### AdminDashboardPage
- **Endpoints Used**:
  - `GET /api/admin/users/stats` - Get user statistics
  - `GET /api/admin/images/stats` - Get image statistics
  - `GET /api/admin/system/status` - Get system status

### AdminUsersPage
- **Endpoints Used**:
  - `GET /api/admin/users` - Get all users
  - `POST /api/admin/users` - Create new user
  - `PUT /api/admin/users/{userId}` - Update user
  - `DELETE /api/admin/users/{userId}` - Delete user

### AdminImagesPage
- **Endpoints Used**:
  - `GET /api/admin/images` - Get all images
  - `DELETE /api/admin/images/{imageId}` - Delete image
  - `GET /api/admin/images/stats` - Get image usage statistics

### AdminMessagesPage
- **Endpoints Used**:
  - `GET /api/admin/messages` - Get all messages
  - `DELETE /api/admin/messages/{messageId}` - Delete message
  - `POST /api/admin/messages/broadcast` - Send broadcast message

### AdminSettingsPage
- **Endpoints Used**:
  - `GET /api/admin/settings` - Get system settings
  - `PUT /api/admin/settings` - Update system settings

## Shared Components

### Login/Registration
- **Endpoints Used**:
  - `POST /api/auth/login` - User login
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/forgot-password` - Forgot password
  - `PUT /api/auth/reset-password` - Reset password

### UserProfile
- **Endpoints Used**:
  - `GET /api/users/profile` - Get user profile
  - `PUT /api/users/profile` - Update user profile
  - `PUT /api/users/password` - Change password

### ImageViewer
- **Endpoints Used**:
  - `GET /api/images/{imageId}` - Get image details
  - `GET /api/analyses` - Get analyses for image

### NotificationCenter
- **Endpoints Used**:
  - `GET /api/notifications` - Get user notifications
  - `PUT /api/notifications/{notificationId}/read` - Mark notification as read
  - `DELETE /api/notifications/{notificationId}` - Delete notification