# Medical Image Sharing Platform API Documentation

This document outlines the API endpoints used by the Medical Image Sharing Platform frontend. It provides information about request/response formats, URL paths, and error handling.

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Images](#images)
4. [Sharing](#sharing)
5. [Analysis](#analysis)
6. [Appointments](#appointments)
7. [Provider Availability](#provider-availability)
8. [Messages](#messages)
9. [Health Metrics](#health-metrics)

## Authentication

### Login

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "token": "jwt-token-here",
      "refreshToken": "refresh-token-here",
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "name": "User Name",
        "role": "Patient"
      }
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "status": "error",
    "message": "Invalid credentials"
  }
  ```

### Register

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "newuser@example.com",
    "password": "password123",
    "name": "New User",
    "role": "Patient"
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "token": "jwt-token-here",
      "refreshToken": "refresh-token-here",
      "user": {
        "id": "user-id",
        "email": "newuser@example.com",
        "name": "New User",
        "role": "Patient"
      }
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "status": "error",
    "message": "Email already in use"
  }
  ```

## User Management

### Get User Profile

- **URL**: `/api/users/profile`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "user-id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "Patient",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "status": "error",
    "message": "Unauthorized"
  }
  ```

### Get Patients (for Provider)

- **URL**: `/api/provider/patients`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `search` (optional): Search term
  - `status` (optional): Filter by status (active, inactive)
  - `page` (optional): Page number for pagination
  - `limit` (optional): Items per page
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "patients": [
        {
          "id": "patient-id",
          "name": "Patient Name",
          "email": "patient@example.com",
          "phone": "+123456789",
          "status": "active",
          "lastVisit": "2023-01-01T00:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50,
        "pages": 5
      }
    }
  }
  ```

### Get Providers (for Patient)

- **URL**: `/api/patient/providers`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "providers": [
        {
          "id": "provider-id",
          "name": "Dr. Provider Name",
          "specialty": "Cardiology",
          "hospital": "General Hospital",
          "rating": 4.5,
          "reviewCount": 120,
          "status": "active",
          "lastVisit": "2023-01-01T00:00:00.000Z",
          "nextAppointment": "2023-02-01T10:00:00.000Z"
        }
      ]
    }
  }
  ```

### Add Provider (for Patient)

- **URL**: `/api/patient/providers/add`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "providerCode": "PROVIDER123"
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "provider": {
        "id": "provider-id",
        "name": "Dr. Provider Name",
        "specialty": "Cardiology",
        "hospital": "General Hospital",
        "rating": 4.5,
        "reviewCount": 120,
        "status": "active"
      }
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "status": "error",
    "message": "Invalid provider code"
  }
  ```

## Images

### Get Images

- **URL**: `/api/images`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `patientId` (optional): Filter by patient
  - `type` (optional): Filter by image type
  - `startDate` (optional): Filter by date range start
  - `endDate` (optional): Filter by date range end
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "images": [
        {
          "id": "image-id",
          "filename": "xray.jpg",
          "type": "X-RAY",
          "patientId": "patient-id",
          "patientName": "Patient Name",
          "uploadedBy": "provider-id",
          "uploadedByName": "Dr. Provider",
          "studyDate": "2023-01-01T00:00:00.000Z",
          "bodyPart": "CHEST",
          "notes": "Annual checkup",
          "status": "ANALYZED"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50,
        "pages": 5
      }
    }
  }
  ```

### Upload Image

- **URL**: `/api/images/upload`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Body**: FormData with:
  - `file`: Image file
  - `type`: Image type (X-RAY, MRI, CT, ULTRASOUND, etc.)
  - `patientId`: Patient ID
  - `studyDate`: Date of study
  - `bodyPart`: Body part (CHEST, HEAD, ABDOMEN, etc.)
  - `notes` (optional): Additional notes
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "image-id",
      "filename": "xray.jpg",
      "type": "X-RAY",
      "s3Key": "patients/patient-id/images/image-id.jpg",
      "uploadedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "status": "error",
    "message": "Invalid file type"
  }
  ```

## Analysis

### Get Image Analysis

- **URL**: `/api/analyses`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `imageId`: Image ID
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "analysis-id",
        "imageId": "image-id",
        "providerId": "provider-id",
        "diagnosis": "Normal lung tissue, no abnormalities detected",
        "confidence": 0.95,
        "findings": "[{\"title\":\"Normal lung parenchyma\",\"description\":\"Lung fields appear clear\",\"confidence\":0.95,\"severity\":\"low\"}]",
        "notes": "Routine analysis, no follow-up needed",
        "createdAt": "2023-01-02T00:00:00.000Z",
        "updatedAt": "2023-01-02T00:00:00.000Z"
      }
    ]
  }
  ```

### Analyze Image

- **URL**: `/api/images/{imageId}/analyze`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "type": "DIAGNOSTIC"
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "analysis-id",
      "imageId": "image-id",
      "providerId": "provider-id",
      "diagnosis": "",
      "confidence": 0,
      "findings": [],
      "createdAt": "2023-01-02T00:00:00.000Z"
    }
  }
  ```

### Get AI Analysis

- **URL**: `/api/images/{imageId}/ai-analysis`
- **Method**: `GET` 
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "suggestions": [
        {
          "title": "Potential fracture detected",
          "description": "AI model suggests a potential fracture in the distal radius with 85% confidence. Consider additional views or CT for confirmation.",
          "confidence": 0.85,
          "severity": "high"
        },
        {
          "title": "Bone density concerns",
          "description": "Lower than expected bone density observed. Consider DEXA scan to evaluate for osteoporosis or osteopenia.",
          "confidence": 0.75,
          "severity": "medium"
        }
      ]
    }
  }
  ```

### Update Analysis

- **URL**: `/api/analyses/{analysisId}`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "diagnosis": "Normal lung tissue, no abnormalities detected",
    "confidence": 0.95,
    "findings": "[{\"title\":\"Normal lung parenchyma\",\"description\":\"Lung fields appear clear\",\"confidence\":0.95,\"severity\":\"low\"}]",
    "notes": "Routine analysis, no follow-up needed"
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "analysis-id",
      "imageId": "image-id",
      "providerId": "provider-id",
      "diagnosis": "Normal lung tissue, no abnormalities detected",
      "confidence": 0.95,
      "findings": "[{\"title\":\"Normal lung parenchyma\",\"description\":\"Lung fields appear clear\",\"confidence\":0.95,\"severity\":\"low\"}]",
      "notes": "Routine analysis, no follow-up needed",
      "updatedAt": "2023-01-02T00:00:00.000Z"
    }
  }
  ```

## Sharing

### Share Image

- **URL**: `/api/shares`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "imageId": "image-id",
    "recipientId": "recipient-id",
    "expiryDays": 7,
    "accessLevel": "VIEW",
    "notes": "Please review this chest X-ray"
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "share-id",
      "shareCode": "SHARE123",
      "imageId": "image-id",
      "senderId": "sender-id",
      "recipientId": "recipient-id",
      "expiresAt": "2023-01-08T00:00:00.000Z",
      "accessLevel": "VIEW",
      "notes": "Please review this chest X-ray",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Get Shared Images

- **URL**: `/api/shares`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `type` (optional): "sent" or "received"
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "shares": [
        {
          "id": "share-id",
          "shareCode": "SHARE123",
          "imageId": "image-id",
          "image": {
            "id": "image-id",
            "filename": "xray.jpg",
            "type": "X-RAY",
            "studyDate": "2023-01-01T00:00:00.000Z"
          },
          "sender": {
            "id": "sender-id",
            "name": "Dr. Sender"
          },
          "recipient": {
            "id": "recipient-id",
            "name": "Dr. Recipient"
          },
          "expiresAt": "2023-01-08T00:00:00.000Z",
          "accessLevel": "VIEW",
          "notes": "Please review this chest X-ray",
          "createdAt": "2023-01-01T00:00:00.000Z"
        }
      ]
    }
  }
  ```

### Revoke Share

- **URL**: `/api/shares/{shareId}`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "message": "Share successfully revoked"
    }
  }
  ```

## Provider Availability

### Get Provider Working Hours

- **URL**: `/api/provider/availability/hours`
- **Method**: `GET` 
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": [
      { "day": "Monday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Tuesday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Wednesday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Thursday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Friday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Saturday", "startTime": "10:00", "endTime": "14:00", "isActive": false },
      { "day": "Sunday", "startTime": "00:00", "endTime": "00:00", "isActive": false }
    ]
  }
  ```

### Save Provider Working Hours

- **URL**: `/api/provider/availability/hours`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "workingHours": [
      { "day": "Monday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Tuesday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Wednesday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Thursday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Friday", "startTime": "09:00", "endTime": "17:00", "isActive": true },
      { "day": "Saturday", "startTime": "10:00", "endTime": "14:00", "isActive": false },
      { "day": "Sunday", "startTime": "00:00", "endTime": "00:00", "isActive": false }
    ]
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "message": "Working hours saved successfully"
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "status": "error",
    "message": "Invalid time format"
  }
  ```

### Get Provider Availability Blocks

- **URL**: `/api/provider/availability/blocks`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "block-123",
        "day": "Monday",
        "startTime": "18:00",
        "endTime": "20:00",
        "isRecurring": true
      },
      {
        "id": "block-124",
        "date": "2023-11-15",
        "startTime": "10:00",
        "endTime": "12:00",
        "isRecurring": false
      }
    ]
  }
  ```

### Add Provider Availability Block

- **URL**: `/api/provider/availability/blocks`
- **Method**: `POST` 
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "day": "Monday",
    "startTime": "18:00",
    "endTime": "20:00",
    "isRecurring": true
  }
  ```
  or
  ```json
  {
    "date": "2023-11-15",
    "startTime": "10:00",
    "endTime": "12:00",
    "isRecurring": false
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "block-125",
      "day": "Monday",
      "startTime": "18:00",
      "endTime": "20:00",
      "isRecurring": true
    }
  }
  ```

### Remove Provider Availability Block

- **URL**: `/api/provider/availability/blocks/{blockId}`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "message": "Availability block removed successfully"
    }
  }
  ```

### Save Provider Availability Blocks (Bulk)

- **URL**: `/api/provider/availability/blocks`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "blocks": [
      {
        "id": "block-123",
        "day": "Monday",
        "startTime": "18:00",
        "endTime": "20:00",
        "isRecurring": true
      },
      {
        "id": "block-124",
        "date": "2023-11-15",
        "startTime": "10:00",
        "endTime": "12:00",
        "isRecurring": false
      }
    ]
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "message": "Availability blocks saved successfully"
    }
  }
  ```

### Get Provider Blocked Times

- **URL**: `/api/provider/availability/blocked`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "blocked-123",
        "reason": "Vacation",
        "startDate": "2023-12-24",
        "endDate": "2023-12-31"
      },
      {
        "id": "blocked-124",
        "reason": "Conference",
        "startDate": "2023-11-15",
        "endDate": "2023-11-17"
      }
    ]
  }
  ```

### Add Provider Blocked Time

- **URL**: `/api/provider/availability/blocked`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "reason": "Vacation",
    "startDate": "2023-12-24",
    "endDate": "2023-12-31"
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "blocked-125",
      "reason": "Vacation",
      "startDate": "2023-12-24",
      "endDate": "2023-12-31"
    }
  }
  ```

### Remove Provider Blocked Time

- **URL**: `/api/provider/availability/blocked/{blockedTimeId}`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "message": "Blocked time removed successfully"
    }
  }
  ```

### Save Provider Blocked Times (Bulk)

- **URL**: `/api/provider/availability/blocked`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "blockedTimes": [
      {
        "id": "blocked-123",
        "reason": "Vacation",
        "startDate": "2023-12-24",
        "endDate": "2023-12-31"
      },
      {
        "id": "blocked-124",
        "reason": "Conference", 
        "startDate": "2023-11-15",
        "endDate": "2023-11-17"
      }
    ]
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "message": "Blocked times saved successfully"
    }
  }
  ```

## Health Metrics

### Get Patient Health Metrics

- **URL**: `/api/patients/{patientId}/health-metrics`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `metric` (optional): Specific metric type to filter by (e.g., "blood_pressure", "weight")
  - `from` (optional): Start date for the metrics
  - `to` (optional): End date for the metrics
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "metrics": [
        {
          "id": "metric-id-1",
          "patientId": "patient-id",
          "type": "blood_pressure",
          "value": "120/80",
          "unit": "mmHg",
          "date": "2023-01-01T00:00:00.000Z",
          "notes": "Morning reading",
          "source": "PATIENT"
        },
        {
          "id": "metric-id-2",
          "patientId": "patient-id",
          "type": "weight",
          "value": "70",
          "unit": "kg",
          "date": "2023-01-01T00:00:00.000Z",
          "notes": "",
          "source": "PROVIDER"
        }
      ]
    }
  }
  ```

## Messages

### Get Messages

- **URL**: `/api/messages`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `recipientId` (optional): Filter by recipient
  - `senderId` (optional): Filter by sender
  - `unread` (optional): Filter unread messages only (true/false)
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "messages": [
        {
          "id": "message-id",
          "senderId": "sender-id",
          "senderName": "Sender Name",
          "recipientId": "recipient-id",
          "recipientName": "Recipient Name",
          "subject": "Test Message",
          "content": "This is a test message.",
          "isRead": false,
          "createdAt": "2023-01-01T00:00:00.000Z",
          "attachments": []
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50,
        "pages": 5
      }
    }
  }
  ```

### Send Message

- **URL**: `/api/messages`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "recipientId": "recipient-id",
    "subject": "Test Message",
    "content": "This is a test message.",
    "attachments": [] 
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "message-id",
      "senderId": "sender-id",
      "recipientId": "recipient-id",
      "subject": "Test Message",
      "content": "This is a test message.",
      "isRead": false,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "attachments": []
    }
  }
  ```

### Mark Message as Read

- **URL**: `/api/messages/{messageId}/read`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer {token}`
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "message-id",
      "isRead": true,
      "readAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

## Appointments

### Get Appointments

- **URL**: `/api/appointments`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `patientId` (optional): Filter by patient
  - `providerId` (optional): Filter by provider
  - `status` (optional): Filter by status (scheduled, completed, canceled)
  - `from` (optional): Start date for appointments
  - `to` (optional): End date for appointments
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "appointments": [
        {
          "id": "appointment-id",
          "patientId": "patient-id",
          "patientName": "Patient Name",
          "providerId": "provider-id",
          "providerName": "Dr. Provider Name",
          "datetime": "2023-01-01T10:00:00.000Z",
          "duration": 30,
          "type": "CONSULTATION",
          "status": "SCHEDULED",
          "notes": "Initial consultation",
          "createdAt": "2022-12-15T00:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50,
        "pages": 5
      }
    }
  }
  ```

### Schedule Appointment

- **URL**: `/api/appointments`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "patientId": "patient-id",
    "providerId": "provider-id",
    "datetime": "2023-01-01T10:00:00.000Z",
    "duration": 30,
    "type": "CONSULTATION",
    "notes": "Initial consultation"
  }
  ```
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "appointment-id",
      "patientId": "patient-id",
      "providerId": "provider-id",
      "datetime": "2023-01-01T10:00:00.000Z",
      "duration": 30,
      "type": "CONSULTATION",
      "status": "SCHEDULED",
      "notes": "Initial consultation",
      "createdAt": "2022-12-15T00:00:00.000Z"
    }
  }
  ```
- **Error Response**:
  ```json
  {
    "status": "error",
    "message": "Provider not available at requested time"
  }
  ```

### Get Provider Availability

- **URL**: `/api/appointments/provider/{providerId}/availability`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `date`: Date to check availability (YYYY-MM-DD)
- **Success Response**:
  ```json
  {
    "status": "success",
    "data": {
      "availableSlots": [
        {
          "startTime": "09:00",
          "endTime": "09:30",
          "datetime": "2023-01-01T09:00:00.000Z"
        },
        {
          "startTime": "09:30",
          "endTime": "10:00",
          "datetime": "2023-01-01T09:30:00.000Z"
        }
      ]
    }
  }
  ``` 