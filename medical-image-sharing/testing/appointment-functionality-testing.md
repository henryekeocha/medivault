# Appointment Functionality Testing Plan

## Overview
This document outlines the testing strategy for all appointment-related functionality in the Medical Image Sharing platform. It covers the entire appointment lifecycle from creation to completion.

## Test Prerequisites
- Multiple test accounts with different roles (Patient, Provider, Admin)
- Clean test database environment
- All appointment-related components properly deployed

## Core Functionality Testing

### 1. Provider Search and Availability
- **Test ID**: AP-001
- **Description**: Verify that patients can search for providers by specialty and view their availability
- **Steps**:
  1. Log in as a patient
  2. Navigate to appointment booking
  3. Select a specialty from the dropdown
  4. Verify providers are listed
  5. Select a provider and check available dates
  6. Select a date and verify time slots are displayed
- **Expected Results**: Provider list filters correctly by specialty, available dates are accurate, and time slots reflect the provider's actual availability

### 2. Appointment Booking
- **Test ID**: AP-002
- **Description**: Verify that patients can successfully book appointments
- **Steps**:
  1. Log in as a patient
  2. Navigate to appointment booking
  3. Select a specialty, provider, date, and time slot
  4. Enter any required notes or reason for visit
  5. Submit the appointment request
- **Expected Results**: Appointment is successfully created with status "SCHEDULED", confirmation is displayed to the patient, and the slot is no longer available for booking

### 3. Appointment Viewing (Patient)
- **Test ID**: AP-003
- **Description**: Verify that patients can view their upcoming and past appointments
- **Steps**:
  1. Log in as a patient
  2. Navigate to appointments list
  3. Check that upcoming appointments are displayed correctly
  4. Filter to view past appointments
- **Expected Results**: Appointments are displayed with correct details (provider, date/time, status) and sorted chronologically

### 4. Appointment Viewing (Provider)
- **Test ID**: AP-004
- **Description**: Verify that providers can view all their scheduled appointments
- **Steps**:
  1. Log in as a provider
  2. Navigate to provider calendar or appointment list
  3. Check different date ranges and filters
- **Expected Results**: All appointments for the provider are displayed with correct patient information, date/time, and status

### 5. Appointment Cancellation (Patient)
- **Test ID**: AP-005
- **Description**: Verify that patients can cancel their upcoming appointments
- **Steps**:
  1. Log in as a patient
  2. Navigate to upcoming appointments
  3. Select an appointment and click cancel
  4. Confirm cancellation
- **Expected Results**: Appointment status is updated to "CANCELLED", time slot becomes available again, and confirmation message is displayed

### 6. Appointment Status Management (Provider)
- **Test ID**: AP-006
- **Description**: Verify that providers can update appointment statuses
- **Steps**:
  1. Log in as a provider
  2. Navigate to appointment list
  3. Select an appointment and update status (COMPLETED, NO_SHOW)
  4. Save changes
- **Expected Results**: Appointment status is updated correctly, and changes are reflected in both provider and patient views

### 7. Appointment Filtering and Sorting
- **Test ID**: AP-007
- **Description**: Verify that appointments can be filtered and sorted by various criteria
- **Steps**:
  1. Log in as a patient or provider
  2. Navigate to appointment list
  3. Test various filters (status, date range, provider specialty)
  4. Test sorting options
- **Expected Results**: Filtered and sorted results match the selected criteria accurately

## API Integration Testing

### 8. Appointment Creation API
- **Test ID**: AP-008
- **Description**: Verify the appointment creation API endpoint
- **Steps**:
  1. Make a POST request to /api/appointments with valid appointment data
  2. Verify response status and format
- **Expected Results**: API returns 201 status with the created appointment details, including a unique ID

### 9. Appointment Retrieval API
- **Test ID**: AP-009
- **Description**: Verify the appointment retrieval API endpoints
- **Steps**:
  1. Test GET /api/appointments with various query parameters
  2. Test GET /api/appointments/{id} for specific appointments
  3. Test patient-specific and provider-specific endpoints
- **Expected Results**: API returns the correct appointments based on the request parameters and user role

### 10. Appointment Update API
- **Test ID**: AP-010
- **Description**: Verify the appointment update API endpoint
- **Steps**:
  1. Make a PUT request to /api/appointments/{id} with updated data
  2. Verify response status and data
- **Expected Results**: API returns 200 status with the updated appointment details

## Edge Cases and Error Handling

### 11. Concurrent Booking Attempts
- **Test ID**: AP-011
- **Description**: Verify system handles concurrent booking attempts for the same time slot
- **Steps**:
  1. Simulate two patients attempting to book the same time slot simultaneously
- **Expected Results**: Only one booking succeeds, the other receives an appropriate error message

### 12. Booking Outside Available Hours
- **Test ID**: AP-012
- **Description**: Verify system prevents booking outside a provider's available hours
- **Steps**:
  1. Attempt to directly submit an appointment for a time not in the provider's availability
- **Expected Results**: System rejects the appointment with an appropriate error message

### 13. Cancellation Time Limit
- **Test ID**: AP-013
- **Description**: Verify cancellation time limit policy is enforced
- **Steps**:
  1. Attempt to cancel an appointment that is scheduled to occur within the cancellation time limit
- **Expected Results**: System either prevents cancellation or applies the appropriate policy (e.g., late cancellation fee)

### 14. Form Validation
- **Test ID**: AP-014
- **Description**: Verify appointment form validation works correctly
- **Steps**:
  1. Test submitting the appointment form with various invalid inputs
- **Expected Results**: Appropriate validation errors are displayed, and no invalid data is submitted

## Performance and Load Testing

### 15. Appointment Listing Performance
- **Test ID**: AP-015
- **Description**: Verify performance of appointment listing with large datasets
- **Steps**:
  1. Load test database with a large number of appointments
  2. Measure response time for appointment listing pages and API endpoints
- **Expected Results**: Page loads and API responses complete within acceptable time limits

### 16. Concurrent User Load
- **Test ID**: AP-016
- **Description**: Verify system handles multiple users booking appointments simultaneously
- **Steps**:
  1. Simulate multiple concurrent users searching for and booking appointments
- **Expected Results**: System remains responsive and maintains data integrity

## Mobile Responsiveness Testing

### 17. Mobile Provider Selection
- **Test ID**: AP-017
- **Description**: Verify provider selection works well on mobile devices
- **Steps**:
  1. Test provider selection interface on various mobile screen sizes
- **Expected Results**: Provider selection is usable and information is clearly visible on small screens

### 18. Mobile Date/Time Selection
- **Test ID**: AP-018
- **Description**: Verify date and time selection is mobile-friendly
- **Steps**:
  1. Test calendar and time slot selection on mobile devices
- **Expected Results**: Date picker and time slots are easy to select with touch input on small screens

### 19. Mobile Appointment List
- **Test ID**: AP-019
- **Description**: Verify appointment list is readable and usable on mobile
- **Steps**:
  1. Check appointment list pages on various mobile screen sizes
- **Expected Results**: Appointment information is properly formatted and actions (cancel, etc.) are accessible

## Regression Testing

### 20. Property Name Consistency
- **Test ID**: AP-020
- **Description**: Verify that property names are used consistently throughout the application
- **Steps**:
  1. Run property consistency check script
  2. Verify all instances of renamed properties (doctorId → providerId, datetime → scheduledFor)
- **Expected Results**: No occurrences of old property names are found

## Acceptance Criteria
- All core appointment functions work as expected across different user roles
- Mobile responsiveness is confirmed for all appointment-related screens
- API endpoints return correct data with appropriate status codes
- All edge cases are handled gracefully
- Performance meets established benchmarks
- No regression issues with property naming consistency

## Test Data Requirements
- Test accounts for each user role
- Providers with different specialties and availability patterns
- Various appointment statuses
- Different date ranges (past, current, future)

## Test Environment
- Development environment with representative data
- Staging environment that mirrors production
- Mobile device emulators or real devices for responsive testing
- API testing tools (Postman, Insomnia, etc.) 