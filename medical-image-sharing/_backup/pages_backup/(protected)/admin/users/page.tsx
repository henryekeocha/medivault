'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress, 
  FormControl,
  InputLabel,
  Select,
  Pagination,
  FormHelperText,
  SelectChangeEvent,
} from '@mui/material';
import {
  Group as GroupIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  Block as BlockIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ApiClient } from '@/lib/api/client';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { Role } from '@prisma/client';
import { ApiResponse } from '@/lib/api/types';
import { routes } from '@/config/routes';
import type { Route } from 'next';

// Define PaginatedResponse interface if it's not already defined
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  data?: T[]; // Added for compatibility with existing API responses
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
  createdAt?: string;
  isActive?: boolean;
}

interface UserFormData {
  id?: string;
  name: string;
  email: string;
  role: string;
  password?: string;
  confirmPassword?: string;
}

// Utility function to map API user to component user
function mapApiUserToComponentUser(apiUser: any): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    status: apiUser.isActive ? 'active' : 'inactive',
    lastLogin: apiUser.lastLoginAt ? new Date(apiUser.lastLoginAt).toISOString() : undefined,
    createdAt: apiUser.createdAt ? new Date(apiUser.createdAt).toISOString() : undefined,
    isActive: apiUser.isActive
  };
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { error, handleError, clearError } = useErrorHandler({ context: 'User Management', showToastByDefault: true });

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // User actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeactivateDialog, setOpenDeactivateDialog] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  
  // Form data and validation
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'patient',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const fetchUsers = async () => {
    clearError();
    setLoading(true);
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getAdminUsers({
        page,
        limit,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        sortBy,
        sortDirection,
      });
      
      if (response.status === 'success') {
        const mappedUsers = (response.data.data || []).map(mapApiUserToComponentUser);
        setUsers(mappedUsers);
        setTotalUsers(response.data.pagination?.total || 0);
      } else {
        handleError(new Error(response.error?.message || 'Failed to fetch users'));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(routes.root.login as Route);
      return;
    }

    if (user?.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }
    
    fetchUsers();
  }, [isAuthenticated, user?.role, router, page, limit, roleFilter, statusFilter, sortBy, sortDirection]);

  // Debounce search term changes
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers();
    }, 500);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleRoleFilterChange = (event: SelectChangeEvent<string>) => {
    setRoleFilter(event.target.value);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditUser = () => {
    if (selectedUser) {
      setFormData({
        id: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role.toLowerCase(),
      });
      setOpenDialog(true);
    }
    handleMenuClose();
  };

  const handleDeactivateUser = () => {
    setOpenDeactivateDialog(true);
    handleMenuClose();
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setFormData({
      name: '',
      email: '',
      role: 'patient',
      password: '',
      confirmPassword: '',
    });
    setFormErrors({});
  };

  const handleDeactivateDialogClose = () => {
    setOpenDeactivateDialog(false);
    setDeactivateReason('');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value,
      });
      
      // Clear error for this field when it changes
      if (formErrors[name]) {
        setFormErrors({
          ...formErrors,
          [name]: '',
        });
      }
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.email.includes('@')) errors.email = 'Invalid email format';
    if (!formData.role) errors.role = 'Role is required';
    
    // Only validate password for new users
    if (!formData.id) {
      if (!formData.password) errors.password = 'Password is required';
      if (formData.password && formData.password.length < 8) 
        errors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) 
        errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitUser = async () => {
    if (!validateForm()) return;
    
    clearError();
    setSaveLoading(true);
    
    try {
      const apiClient = ApiClient.getInstance();
      let response;
      
      if (formData.id) {
        // Update existing user
        const { id, password, confirmPassword, ...updateData } = formData;
        // Cast role to Role type
        const typedUpdateData = {
          ...updateData,
          role: updateData.role as Role
        };
        response = await apiClient.updateAdminUser(id!, typedUpdateData);
      } else {
        // Create new user
        const { confirmPassword, ...createData } = formData;
        // Cast role to Role type
        const typedCreateData = {
          ...createData,
          role: createData.role as Role
        };
        response = await apiClient.createUser(typedCreateData);
      }
      
      if (response.status === 'success') {
        setSuccess(formData.id ? 'User updated successfully' : 'User created successfully');
        handleDialogClose();
        fetchUsers();
      } else {
        handleError(new Error(response.error?.message || 'Operation failed'));
      }
    } catch (err) {
      console.error('Error saving user:', err);
      handleError(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!selectedUser) return;
    
    if (!deactivateReason) {
      setFormErrors({ deactivateReason: 'Please provide a reason for deactivation' });
      return;
    }
    
    setSaveLoading(true);
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.deactivateUser(selectedUser.id, deactivateReason);
      
      if (response.status === 'success') {
        setSuccess('User deactivated successfully');
        handleDeactivateDialogClose();
        fetchUsers();
      } else {
        handleError(new Error(response.error?.message || 'Failed to deactivate user'));
      }
    } catch (err) {
      console.error('Error deactivating user:', err);
      handleError(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const getStatusColor = (status?: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckIcon fontSize="small" />;
      case 'inactive':
        return <BlockIcon fontSize="small" />;
      case 'pending':
        return <CloseIcon fontSize="small" />;
      default:
        // Return a default icon instead of null
        return <CloseIcon fontSize="small" style={{ opacity: 0.5 }} />;
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1800px' }}>
      <Box sx={{ mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupIcon sx={{ fontSize: 32, mr: 2 }} />
            <Typography variant="h4" component="h1">
              User Management
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            disabled={loading}
          >
            Add User
          </Button>
        </Box>

        <Box sx={{ px: 2 }}>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }} 
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={fetchUsers} 
                  startIcon={<RefreshIcon />}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* Filters and Search */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <TextField
              variant="outlined"
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ flexGrow: 1, minWidth: '250px' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl sx={{ minWidth: '150px' }}>
              <InputLabel id="role-filter-label">Role</InputLabel>
              <Select
                labelId="role-filter-label"
                value={roleFilter}
                onChange={handleRoleFilterChange}
                label="Role"
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="provider">Provider</MenuItem>
                <MenuItem value="patient">Patient</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: '150px' }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Users Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <LoadingState message="Loading users..." />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        No users found
                      </Typography>
                      <Button 
                        variant="text" 
                        startIcon={<RefreshIcon />} 
                        onClick={fetchUsers}
                        sx={{ mt: 1 }}
                      >
                        Refresh
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role} 
                          color={
                            user.role.toLowerCase() === 'admin' 
                              ? 'error' 
                              : user.role.toLowerCase() === 'provider' 
                              ? 'primary' 
                              : 'default'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status || 'Unknown'}
                          color={getStatusColor(user.status)}
                          size="small"
                          icon={getStatusIcon(user.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={(e) => handleMenuOpen(e, user)} disabled={loading}>
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
              count={Math.ceil(totalUsers / limit)} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
              disabled={loading}
            />
          </Box>
        </Box>
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditUser} disabled={loading}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem 
          onClick={handleDeactivateUser} 
          disabled={loading || (selectedUser?.status === 'inactive')}
        >
          <BlockIcon fontSize="small" sx={{ mr: 1 }} />
          Deactivate
        </MenuItem>
      </Menu>

      {/* Add/Edit User Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {formData.id ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  name="name"
                  label="Full Name"
                  fullWidth
                  value={formData.name}
                  onChange={handleFormChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="email"
                  label="Email Address"
                  fullWidth
                  value={formData.email}
                  onChange={handleFormChange}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!formErrors.role}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="role"
                    value={formData.role}
                    onChange={(event: SelectChangeEvent<string>) => {
                      handleFormChange({
                        target: {
                          name: "role",
                          value: event.target.value
                        }
                      } as React.ChangeEvent<{ name?: string; value: unknown }>);
                    }}
                    label="Role"
                    disabled={loading}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="provider">Provider</MenuItem>
                    <MenuItem value="patient">Patient</MenuItem>
                  </Select>
                  {formErrors.role && <FormHelperText>{formErrors.role}</FormHelperText>}
                </FormControl>
              </Grid>
              
              {!formData.id && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      name="password"
                      label="Password"
                      type="password"
                      fullWidth
                      value={formData.password}
                      onChange={handleFormChange}
                      error={!!formErrors.password}
                      helperText={formErrors.password}
                      disabled={loading}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="confirmPassword"
                      label="Confirm Password"
                      type="password"
                      fullWidth
                      value={formData.confirmPassword}
                      onChange={handleFormChange}
                      error={!!formErrors.confirmPassword}
                      helperText={formErrors.confirmPassword}
                      disabled={loading}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={saveLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitUser} 
            variant="contained" 
            color="primary"
            disabled={saveLoading}
          >
            {saveLoading ? <CircularProgress size={24} /> : formData.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog 
        open={openDeactivateDialog} 
        onClose={handleDeactivateDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Deactivate User
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to deactivate {selectedUser?.name}?
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This will prevent the user from accessing the system.
            </Typography>
            <TextField
              label="Reason for deactivation"
              fullWidth
              multiline
              rows={3}
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
              error={!!formErrors.deactivateReason}
              helperText={formErrors.deactivateReason}
              sx={{ mt: 2 }}
              disabled={loading}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeactivateDialogClose} disabled={saveLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeactivate} 
            variant="contained" 
            color="error"
            disabled={saveLoading}
          >
            {saveLoading ? <CircularProgress size={24} /> : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 