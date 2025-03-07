# Error Handling Patterns Guide

This documentation outlines the standardized error handling patterns implemented across the Medical Imaging Application. Following these patterns ensures a consistent user experience and simplifies debugging and maintenance.

## Table of Contents

1. [Core Components](#core-components)
2. [Error Handling Hook](#error-handling-hook)
3. [Implementation Patterns](#implementation-patterns)
4. [Loading States](#loading-states)
5. [Best Practices](#best-practices)
6. [Edge Cases](#edge-cases)
7. [Examples](#examples)

## Core Components

Our error handling system consists of several core components:

### useErrorHandler Hook

A custom React hook that provides a standardized way to handle errors in components. The hook offers:
- Error state management
- Loading state management
- Error handling utilities
- Toast integration
- Retry functionality

### Toast Notifications

Provides non-blocking feedback for errors that don't prevent the user from continuing to use the application.

### Error Alerts

In-page alerts for more critical errors that require user attention.

### Loading States

Consistent loading indicators that provide feedback during asynchronous operations.

## Error Handling Hook

The `useErrorHandler` hook is the foundation of our error handling system.

### Basic Usage

```tsx
const { 
  error,                  // Current error message (string | null)
  loading,                // Loading state (boolean)
  setError,               // Function to set error manually
  setLoading,             // Function to set loading state manually
  clearError,             // Function to clear error
  handleError,            // Function to handle an error object
  withErrorHandling,      // HOF to wrap async functions
  retry                   // Function to retry the last operation
} = useErrorHandler();
```

### Configuration Options

```tsx
const errorHandler = useErrorHandler({
  context: 'Operation',          // Context for error messages
  initialError: null,            // Initial error state
  initialLoading: false,         // Initial loading state
  showToastByDefault: true       // Whether to show toast for errors by default
});
```

## Implementation Patterns

### API Call Pattern

```tsx
const fetchData = async () => {
  await withErrorHandling(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getData();
      setData(response.data);
    } finally {
      setLoading(false);
    }
  })();
};
```

### React Query Pattern

```tsx
const { data, isLoading } = useQuery(
  ['key'],
  async () => {
    try {
      const response = await apiClient.getData();
      return response.data;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }
);
```

### Error Display Pattern

```tsx
{error && (
  <Alert 
    severity="error" 
    action={
      <Button
        color="inherit"
        size="small"
        startIcon={<RefreshIcon />}
        onClick={retry}
      >
        Retry
      </Button>
    }
  >
    {error}
  </Alert>
)}
```

### Loading State Pattern

```tsx
{loading ? (
  <LoadingState message="Loading data..." />
) : (
  // Content when loaded
)}
```

## Loading States

Our application uses several types of loading indicators:

1. **Inline Loading**: For individual elements or rows
2. **Component Loading**: For loading entire components
3. **Full Page Loading**: For initial page loads
4. **Button Loading**: For indicating action in progress on button click

### Implementing Loading States

```tsx
<Button
  disabled={loading}
  startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
>
  {loading ? 'Saving...' : 'Save'}
</Button>
```

## Best Practices

1. **Centralized Error Handling**: Use the `useErrorHandler` hook for consistent error handling.
2. **Meaningful Error Messages**: Provide clear, actionable error messages.
3. **Recovery Options**: Always give users a way to recover from errors.
4. **Proper Context**: Include the context of the operation in error messages.
5. **Validation Feedback**: Provide immediate validation feedback in forms.
6. **Network Error Detection**: Handle offline scenarios gracefully.
7. **Security Considerations**: Never expose sensitive information in error messages.

## Edge Cases

### Offline Handling

```tsx
const { error, handleError } = useErrorHandler();

useEffect(() => {
  const handleOffline = () => {
    handleError('You are currently offline. Some features may be unavailable.');
  };
  
  window.addEventListener('offline', handleOffline);
  return () => window.removeEventListener('offline', handleOffline);
}, [handleError]);
```

### Concurrent Requests

When dealing with multiple concurrent requests, use Promise.all with error handling:

```tsx
const fetchMultipleResources = async () => {
  await withErrorHandling(async () => {
    setLoading(true);
    try {
      const [users, settings] = await Promise.all([
        apiClient.getUsers().catch(err => {
          handleError(err, false); // Don't show toast yet
          return { data: [] };
        }),
        apiClient.getSettings().catch(err => {
          handleError(err, false); // Don't show toast yet
          return { data: {} };
        })
      ]);
      
      setUsers(users.data);
      setSettings(settings.data);
    } finally {
      setLoading(false);
    }
  })();
};
```

## Examples

### Complete Component Example

```tsx
function DataComponent() {
  const [data, setData] = useState([]);
  const { error, loading, handleError, clearError, retry } = useErrorHandler();
  
  const fetchData = useCallback(async () => {
    try {
      const response = await apiClient.getData();
      setData(response.data);
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  if (loading) {
    return <LoadingState />;
  }
  
  return (
    <div>
      {error && (
        <Alert 
          severity="error" 
          action={
            <Button
              color="inherit"
              size="small"
              onClick={retry}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {data.length > 0 ? (
        <DataTable data={data} />
      ) : (
        <Typography>No data available</Typography>
      )}
    </div>
  );
}
```

### Showcase

Visit the Error Showcase page at `/admin/error-showcase` to see all error handling patterns in action.

## Reference

- [Error Handling Audit Summary](/docs/error-handling-audit-summary.md)
- [TypeScript Interfaces for Error Handling](/src/hooks/useErrorHandler.ts) 