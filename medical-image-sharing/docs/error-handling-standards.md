# Error Handling Standards

This document defines the standardized approach to error handling across the medical imaging application.

## Table of Contents
1. [Error Handling Principles](#error-handling-principles)
2. [Common Error Handling Patterns](#common-error-handling-patterns)
3. [Loading State Standards](#loading-state-standards)
4. [Toast Notification Standards](#toast-notification-standards)
5. [Implementation Examples](#implementation-examples)

## Error Handling Principles

1. **Consistency**: All components should handle errors in a consistent manner.
2. **User Feedback**: Always provide clear feedback to users when errors occur.
3. **Graceful Degradation**: Components should continue to function even when parts of the system fail.
4. **Logging**: All errors should be logged appropriately for debugging.
5. **Recovery**: When possible, provide users with a way to recover from errors.
6. **Prevention**: Validate inputs to prevent errors before they occur.

## Common Error Handling Patterns

### API Call Pattern

For all API calls, use the following pattern:

```typescript
const fetchData = async () => {
  // Set loading state
  setLoading(true);
  // Clear previous errors
  setError(null);
  
  try {
    // Make API call
    const apiClient = ApiClient.getInstance();
    const response = await apiClient.someApiMethod(params);
    
    // Check response status
    if (response.status === 'success' && response.data) {
      // Handle success case
      setData(response.data);
    } else {
      // Handle API error with message from response
      throw new Error(response.message || 'Operation failed. Please try again.');
    }
  } catch (error) {
    // Log the error
    console.error('Error fetching data:', error);
    
    // Set error state with user-friendly message
    setError(
      error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.'
    );
    
    // Show error toast
    toast.showError(
      error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.'
    );
    
    // Optional: Initialize with fallback/empty data
    initializeEmptyData();
  } finally {
    // Reset loading state in all cases
    setLoading(false);
  }
};
```

### Mutation Pattern (React Query)

For mutations with React Query:

```typescript
const mutation = useMutation({
  mutationFn: (data) => ApiClient.getInstance().someMethod(data),
  onSuccess: (data) => {
    // Handle success
    toast.showSuccess('Operation completed successfully');
    // Update local state or invalidate queries
    queryClient.invalidateQueries({ queryKey: ['relevantData'] });
  },
  onError: (error: any) => {
    // Log the error
    console.error('Mutation error:', error);
    
    // Show error toast with specific message when available
    toast.showError(
      error.message || 'Failed to complete operation. Please try again.'
    );
  }
});
```

## Loading State Standards

1. **Global Component**: Use the `<LoadingState />` component for consistent loading indicators.
2. **Loading State Variable**: Every component that fetches data should have a `loading` state variable.
3. **Initial Loading**: Show a centered loading indicator for initial data loads.
4. **Partial Loading**: For partial updates, use inline loading indicators or skeleton loaders.
5. **Button Loading**: When actions are in progress, disable buttons and show loading states.

Example loading state implementation:

```tsx
// Full page loading
if (loading && !data.length) {
  return <LoadingState message="Loading data..." fullScreen />;
}

// Partial loading
<Box sx={{ position: 'relative' }}>
  {partialLoading && <LoadingState overlay />}
  <DataContent data={data} />
</Box>

// Button loading
<Button 
  disabled={isSubmitting}
  startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

## Toast Notification Standards

1. **Error Toasts**: Red, displayed for 8000ms
2. **Success Toasts**: Green, displayed for 4000ms
3. **Warning Toasts**: Amber, displayed for 6000ms
4. **Info Toasts**: Blue, displayed for 5000ms

Use the appropriate toast method for each case:

```typescript
// Error notification
toast.showError('Failed to load patient data. Please try again.');

// Success notification
toast.showSuccess('Patient record updated successfully');

// Warning notification
toast.showWarning('Some fields could not be updated');

// Info notification
toast.showInfo('Remember to save your changes');
```

## Implementation Examples

### Data Fetching Component

```tsx
function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getPatients();
      
      if (response.status === 'success' && response.data) {
        setPatients(response.data.items || []);
      } else {
        throw new Error(response.message || 'Failed to fetch patients');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchPatients();
  }, []);
  
  // Display loading state
  if (loading && !patients.length) {
    return <LoadingState message="Loading patients..." />;
  }
  
  // Display error state
  if (error && !patients.length) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={fetchPatients} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }
  
  // Display content
  return (
    <div>
      {/* Render patient list */}
    </div>
  );
}
```

### Form Submission Component

```tsx
function PatientForm({ patientId, onSuccess }) {
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.showWarning('Please correct the errors in the form');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.updatePatient(patientId, formData);
      
      if (response.status === 'success') {
        toast.showSuccess('Patient information updated successfully');
        onSuccess(response.data);
      } else {
        throw new Error(response.message || 'Failed to update patient information');
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while updating patient information';
      
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Form fields */}
      
      <Button 
        type="submit"
        variant="contained"
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
      >
        {submitting ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
``` 