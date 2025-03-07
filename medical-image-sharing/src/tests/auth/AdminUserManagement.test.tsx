import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Role } from '@prisma/client';
import React from 'react';

// Define types for our user data
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

interface UserFormData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CreateUserData {
  name: string;
  email: string;
  role: string;
  password?: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
}

// Mock components based on what we saw in the admin page
// This is a simplified version for testing
const AdminUserManagementTest = () => {
  const [users, setUsers] = React.useState<User[]>([
    { id: '1', name: 'User 1', email: 'user1@example.com', role: Role.PATIENT, isActive: true },
    { id: '2', name: 'User 2', email: 'user2@example.com', role: Role.PROVIDER, isActive: true },
  ]);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [formData, setFormData] = React.useState<UserFormData>({
    id: '',
    name: '',
    email: '',
    role: '',
  });

  // Mock API client
  const apiClient = {
    getAdminUsers: jest.fn().mockResolvedValue({
      status: 'success',
      data: {
        data: users,
        pagination: { total: users.length }
      }
    }),
    createUser: jest.fn().mockImplementation((userData: CreateUserData) => {
      const newUser = { id: '3', ...userData, isActive: true } as User;
      setUsers([...users, newUser]);
      return Promise.resolve({
        status: 'success',
        data: newUser
      });
    }),
    updateAdminUser: jest.fn().mockImplementation((id: string, userData: UpdateUserData) => {
      const updatedUsers = users.map(user => 
        user.id === id ? { ...user, ...userData } : user
      );
      setUsers(updatedUsers as User[]);
      return Promise.resolve({
        status: 'success',
        data: updatedUsers.find(user => user.id === id)
      });
    }),
    deactivateUser: jest.fn().mockImplementation((id: string) => {
      const updatedUsers = users.map(user => 
        user.id === id ? { ...user, isActive: false } : user
      );
      setUsers(updatedUsers);
      return Promise.resolve({
        status: 'success',
        data: { success: true }
      });
    })
  };

  // Mock edit user function
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase(),
    });
    setOpenDialog(true);
  };

  // Mock submit user function
  const handleSubmitUser = async () => {
    if (formData.id) {
      // Update user
      await apiClient.updateAdminUser(formData.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role.toUpperCase() as Role
      });
    } else {
      // Create user
      await apiClient.createUser({
        name: formData.name,
        email: formData.email,
        role: formData.role.toUpperCase(),
        password: 'password123' // Default password for testing
      });
    }
    setOpenDialog(false);
  };

  // Mock deactivate user function
  const handleDeactivateUser = async (userId: string) => {
    await apiClient.deactivateUser(userId);
  };

  return (
    <div>
      <h1>User Management</h1>
      
      {/* User list */}
      <div data-testid="user-list">
        {users.map(user => (
          <div key={user.id} data-testid={`user-${user.id}`}>
            <div data-testid={`user-name-${user.id}`}>{user.name}</div>
            <div data-testid={`user-email-${user.id}`}>{user.email}</div>
            <div data-testid={`user-role-${user.id}`}>{user.role}</div>
            <div data-testid={`user-status-${user.id}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </div>
            <button 
              data-testid={`edit-user-${user.id}`}
              onClick={() => handleEditUser(user)}
            >
              Edit
            </button>
            <button 
              data-testid={`deactivate-user-${user.id}`}
              onClick={() => handleDeactivateUser(user.id)}
            >
              Deactivate
            </button>
          </div>
        ))}
      </div>
      
      {/* Add new user button */}
      <button 
        data-testid="add-user-btn"
        onClick={() => {
          setSelectedUser(null);
          setFormData({
            id: '',
            name: '',
            email: '',
            role: 'patient',
          });
          setOpenDialog(true);
        }}
      >
        Add User
      </button>
      
      {/* User form dialog */}
      {openDialog && (
        <div data-testid="user-form-dialog">
          <h2>{formData.id ? 'Edit User' : 'Add User'}</h2>
          <div>
            <label htmlFor="name">Name</label>
            <input 
              id="name"
              data-testid="user-form-name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              data-testid="user-form-email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label htmlFor="role">Role</label>
            <select 
              id="role"
              data-testid="user-form-role"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="admin">Admin</option>
              <option value="provider">Provider</option>
              <option value="patient">Patient</option>
            </select>
          </div>
          <button 
            data-testid="save-user-btn"
            onClick={handleSubmitUser}
          >
            Save
          </button>
          <button 
            data-testid="cancel-btn"
            onClick={() => setOpenDialog(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

describe('Admin User Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should display list of users', async () => {
    render(<AdminUserManagementTest />);

    // Check for user list
    expect(screen.getByTestId('user-list')).toBeInTheDocument();
    
    // Check for user 1
    expect(screen.getByTestId('user-1')).toBeInTheDocument();
    expect(screen.getByTestId('user-name-1')).toHaveTextContent('User 1');
    expect(screen.getByTestId('user-email-1')).toHaveTextContent('user1@example.com');
    expect(screen.getByTestId('user-role-1')).toHaveTextContent('PATIENT');
    expect(screen.getByTestId('user-status-1')).toHaveTextContent('Active');
    
    // Check for user 2
    expect(screen.getByTestId('user-2')).toBeInTheDocument();
    expect(screen.getByTestId('user-name-2')).toHaveTextContent('User 2');
    expect(screen.getByTestId('user-email-2')).toHaveTextContent('user2@example.com');
    expect(screen.getByTestId('user-role-2')).toHaveTextContent('PROVIDER');
    expect(screen.getByTestId('user-status-2')).toHaveTextContent('Active');
  });

  it('should allow editing a user', async () => {
    render(<AdminUserManagementTest />);

    // Click edit button for user 1
    fireEvent.click(screen.getByTestId('edit-user-1'));
    
    // Check that form opened with user data
    expect(screen.getByTestId('user-form-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('user-form-name')).toHaveValue('User 1');
    expect(screen.getByTestId('user-form-email')).toHaveValue('user1@example.com');
    expect(screen.getByTestId('user-form-role')).toHaveValue('patient');
    
    // Change user role to provider
    fireEvent.change(screen.getByTestId('user-form-role'), { target: { value: 'provider' } });
    expect(screen.getByTestId('user-form-role')).toHaveValue('provider');
    
    // Save user
    fireEvent.click(screen.getByTestId('save-user-btn'));
    
    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByTestId('user-form-dialog')).not.toBeInTheDocument();
    });
    
    // Check that user role was updated
    expect(screen.getByTestId('user-role-1')).toHaveTextContent('PROVIDER');
  });

  it('should allow adding a new user', async () => {
    render(<AdminUserManagementTest />);

    // Click add user button
    fireEvent.click(screen.getByTestId('add-user-btn'));
    
    // Check that form opened with empty data
    expect(screen.getByTestId('user-form-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('user-form-name')).toHaveValue('');
    expect(screen.getByTestId('user-form-email')).toHaveValue('');
    
    // Fill in user data
    fireEvent.change(screen.getByTestId('user-form-name'), { target: { value: 'New User' } });
    fireEvent.change(screen.getByTestId('user-form-email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByTestId('user-form-role'), { target: { value: 'admin' } });
    
    // Save user
    fireEvent.click(screen.getByTestId('save-user-btn'));
    
    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByTestId('user-form-dialog')).not.toBeInTheDocument();
    });
    
    // Check that new user was added
    expect(screen.getByTestId('user-3')).toBeInTheDocument();
    expect(screen.getByTestId('user-name-3')).toHaveTextContent('New User');
    expect(screen.getByTestId('user-email-3')).toHaveTextContent('new@example.com');
    expect(screen.getByTestId('user-role-3')).toHaveTextContent('ADMIN');
    expect(screen.getByTestId('user-status-3')).toHaveTextContent('Active');
  });

  it('should allow deactivating a user', async () => {
    render(<AdminUserManagementTest />);

    // Click deactivate button for user 2
    fireEvent.click(screen.getByTestId('deactivate-user-2'));
    
    // Check that user status was updated
    await waitFor(() => {
      expect(screen.getByTestId('user-status-2')).toHaveTextContent('Inactive');
    });
  });
}); 