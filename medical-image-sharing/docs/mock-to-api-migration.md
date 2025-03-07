# Mock Data to API Migration Guide

This document outlines the migration process from mock data to real API data for each component in the Medical Image Sharing Platform.

## Migration Status

| Component | Status | Notes |
|-----------|--------|-------|
| PatientDashboardPage | ✅ Completed | |
| PatientImagesPage | ✅ Completed | |
| PatientSharePage | ✅ Completed | |
| PatientProvidersPage | ✅ Completed | |
| PatientAppointmentsPage | ⏳ In Progress | Need to implement appointment booking flow |
| PatientMessagesPage | ✅ Completed | |
| ProviderDashboardPage | ✅ Completed | |
| ProviderPatientsPage | ✅ Completed | |
| ProviderImagesPage | ✅ Completed | |
| ProviderSharePage | ✅ Completed | |
| ProviderAnalysisPage | ⏳ In Progress | AI integration pending |
| ProviderAvailabilityPage | ✅ Completed | |
| ProviderAppointmentsPage | ⏳ In Progress | Need calendar integration |
| ProviderMessagesPage | ✅ Completed | |
| ProviderAnalyticsPage | ✅ Completed | |
| AdminDashboardPage | ✅ Completed | |
| AdminUsersPage | ✅ Completed | |
| AdminImagesPage | ✅ Completed | |
| AdminMessagesPage | ✅ Completed | |
| AdminSettingsPage | ❌ Not Started | |

## Migration Process

### General Migration Pattern

For each component, the migration process follows these general steps:

1. **Identify mock data**
   - Locate hardcoded arrays, constants, and static data
   - Document the structure and purpose of the mock data

2. **Create API methods**
   - Add corresponding methods to the ApiClient class
   - Ensure proper error handling and response types

3. **Update component state**
   - Replace static arrays with state variables
   - Add loading and error states

4. **Implement data fetching**
   - Add useEffect hooks for initial data loading
   - Implement refresh/reload functionality if needed

5. **Update UI for API integration**
   - Add loading indicators
   - Implement empty states
   - Add error messages and retry options

6. **Handle interactive operations**
   - Update CRUD operations to use API calls
   - Add optimistic updates where appropriate
   - Implement proper error handling and user feedback

7. **Test integration**
   - Verify data loading
   - Test all interactive operations
   - Ensure error cases are handled appropriately

### Common Code Patterns

#### Loading State Pattern

```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType[]>([]);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await ApiClient.getData();
    setData(response.data);
  } catch (err) {
    setError('Failed to load data. Please try again.');
    console.error('Error fetching data:', err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

#### Toast Notification Pattern

```tsx
const { toast, showSuccess, showError } = useToast();

const handleAction = async () => {
  try {
    await ApiClient.performAction();
    showSuccess('Action completed successfully');
    // Update local state or refetch data
  } catch (err) {
    showError('Failed to perform action. Please try again.');
    console.error('Error:', err);
  }
};
```

#### Optimistic Update Pattern

```tsx
const handleDelete = async (id: string) => {
  // Store current state for potential rollback
  const previousData = [...data];
  
  // Optimistically update UI
  setData(data.filter(item => item.id !== id));
  
  try {
    await ApiClient.deleteItem(id);
    showSuccess('Item deleted successfully');
  } catch (err) {
    // Rollback on failure
    setData(previousData);
    showError('Failed to delete item. Please try again.');
    console.error('Error deleting item:', err);
  }
};
```

## Component-Specific Migration Notes

### PatientSharePage

**Mock Data Removed:**
- `mockImages` array of patient images
- `mockSharedImages` array of previously shared images

**API Methods Added:**
- `getImages()` - Fetch patient images
- `getSharedImages()` - Fetch images shared by patient
- `shareImage()` - Share an image with a provider
- `revokeAccess()` - Revoke access to a shared image

**State Changes:**
- Added loading states for images and shared images
- Added error handling for failed API calls
- Implemented optimistic updates for share/revoke operations

### ProviderAnalyticsPage

**Mock Data Removed:**
- `patientActivityData` - Patient activity over time
- `imageTypeData` - Distribution of image types
- `monthlyImageData` - Monthly image upload counts
- `stats` - General statistics (total patients, active patients, etc.)

**API Methods Added:**
- `getPatientActivity()` - Fetch patient activity data
- `getImageTypeDistribution()` - Fetch image type distribution
- `getMonthlyImageData()` - Fetch monthly image upload counts
- `getProviderStats()` - Fetch general provider statistics

**State Changes:**
- Added separate loading state for each data section
- Implemented error handling with retry functionality
- Added data refresh capability

### ProviderAvailabilityPage

**Mock Data Removed:**
- `mockWorkingHours` - Default working hours
- `mockAvailabilityBlocks` - Additional availability blocks
- `mockBlockedTimes` - Vacation and time-off periods

**API Methods Added:**
- `getProviderWorkingHours()` - Fetch provider's working hours
- `saveProviderWorkingHours()` - Update provider's working hours
- `getProviderAvailabilityBlocks()` - Fetch availability blocks
- `addProviderAvailabilityBlock()` - Add a new availability block
- `removeProviderAvailabilityBlock()` - Remove an availability block
- `saveProviderAvailabilityBlocks()` - Update all availability blocks
- `getProviderBlockedTimes()` - Fetch blocked time periods
- `addProviderBlockedTime()` - Add a new blocked time period
- `removeProviderBlockedTime()` - Remove a blocked time period
- `saveProviderBlockedTimes()` - Update all blocked time periods

**State Changes:**
- Added comprehensive loading and error states
- Implemented form validation for time inputs
- Added calendar visualization integrating all availability data

## Testing the Migration

### Manual Testing Steps

1. **Verify Initial Load**
   - Check that data loads correctly when the component mounts
   - Verify loading indicators display during API calls
   - Ensure error messages appear if API calls fail

2. **Test Interactive Operations**
   - Verify all CRUD operations make appropriate API calls
   - Check that success/error notifications display correctly
   - Ensure optimistic updates work as expected
   - Test error recovery mechanisms

3. **Verify Empty States**
   - Test components with no data
   - Verify helpful empty state messages
   - Ensure "add new" or similar actions are accessible

### Automated Testing

- Add unit tests for ApiClient methods
- Implement integration tests for API call sequences
- Add component tests with mocked API responses

## Troubleshooting Common Issues

### API Authentication Errors

If components fail to load data due to authentication issues:
- Check that the auth token is being included in requests
- Verify token refresh mechanism is working
- Ensure API permissions are configured correctly

### Data Format Mismatches

If components render incorrectly after API integration:
- Verify API response structure matches expected format
- Add data transformation in API client or components
- Update TypeScript interfaces to match actual data

### Performance Issues

If components are slow to load or interact with:
- Consider implementing pagination for large data sets
- Add caching for frequently accessed data
- Optimize API queries with appropriate filters
- Consider implementing data prefetching for critical paths 