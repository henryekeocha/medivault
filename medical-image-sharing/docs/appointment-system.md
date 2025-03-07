# Appointment System Documentation

## Overview

The Appointment System is a critical component of the Medical Image Sharing platform, enabling patients to book appointments with healthcare providers and allowing providers to manage their schedules efficiently.

## Key Components

- **BookAppointment**: Dialog component that walks patients through the process of booking a new appointment
- **AppointmentList**: Displays a list of appointments with filtering and pagination
- **AppointmentForm**: Form for creating or editing appointment details (primarily used by providers)
- **PatientAppointments**: Dashboard component showing a patient's upcoming and past appointments
- **ProviderCalendar**: Calendar view of a provider's schedule

## Data Model

### Appointment Properties

| Property Name | Type | Description | Notes |
|---------------|------|-------------|-------|
| `id` | string | Unique identifier for the appointment | |
| `patientId` | string | ID of the patient | |
| `providerId` | string | ID of the healthcare provider | Previously `doctorId` |
| `scheduledFor` | Date/string | Date and time of the appointment | Previously `datetime` |
| `status` | AppointmentStatus | Current status of the appointment | SCHEDULED, COMPLETED, CANCELLED, NO_SHOW |
| `reason` | string | Reason for the appointment | |
| `notes` | string | Additional notes | Optional |
| `type` | string | Type of appointment | Optional |
| `imageId` | string | Associated medical image | Optional |

### Status Enum

```typescript
enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED', 
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}
```

## API Endpoints

### Get Appointments

```typescript
// Get all appointments (admin)
GET /api/appointments

// Get a patient's appointments
GET /api/appointments/patient/:patientId

// Get a provider's appointments
GET /api/appointments/doctor/:doctorId
```

Response format:
```typescript
{
  data: {
    items: Appointment[],  // Previously "appointments"
    totalCount: number,
    page: number,
    limit: number
  }
}
```

### Create Appointment

```typescript
POST /api/appointments
```

Request body:
```typescript
{
  patientId: string,
  providerId: string,  // Previously "doctorId"
  scheduledFor: string | Date,  // Previously "datetime"
  reason: string,
  notes?: string,
  type?: string,
  status?: AppointmentStatus,
  imageId?: string
}
```

### Update Appointment

```typescript
PATCH /api/appointments/:id
```

Request body (all fields optional):
```typescript
{
  scheduledFor?: string | Date,  // Previously "datetime"
  status?: AppointmentStatus,
  notes?: string,
  // Other fields...
}
```

## Recent API Changes

To maintain consistency with Prisma schema and database models, several property names have been updated throughout the application:

1. `doctorId` → `providerId`: This change better reflects the role as "healthcare provider" rather than specifically a doctor.
2. `datetime` → `scheduledFor`: This provides more semantic clarity about what the field represents.
3. `appointments` → `items` in API responses: This standardizes paginated responses across the API.

These changes have been implemented across:
- TypeScript interfaces
- Component props and state
- API request and response handling
- Database queries

All frontend components have been updated to use these new property names. When working with the codebase, be sure to use the updated property names to maintain consistency.

## Usage Examples

### Booking an Appointment (Frontend)

```typescript
bookAppointment.mutate({
  providerId: selectedProvider.id,  // NOT doctorId
  patientId: currentUser.data.id,
  scheduledFor: appointmentDateTime,  // NOT datetime
  reason: 'Medical consultation',
  notes: notes || undefined
});
```

### Accessing Appointments from API Response

```typescript
// Correct way to access appointments
const appointments = appointmentsResponse?.items || [];

// Filter for upcoming appointments
const upcomingAppointments = appointments.filter(
  (apt) => apt.status === AppointmentStatus.SCHEDULED && 
  !isAfter(new Date(), new Date(apt.scheduledFor))
);
``` 