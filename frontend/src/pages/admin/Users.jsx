import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  VpnKey as VpnKeyIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { apiFetch } from '../../config/api';
import MainLayout from '../../layouts/MainLayout';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    is_active: true
  });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/admin/users', {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Check if it's a structured error response
        if (errorData.detail && errorData.detail.error_code) {
          setError(errorData.detail.user_message || errorData.detail.message);
        } else {
          setError(errorData.detail || 'Failed to load users');
        }
        setUsers([]);
        return;
      }
      
      const data = await response.json();
      setUsers(data.users);
      setError('');
    } catch (err) {
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await apiFetch('/admin/roles', {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Cannot load roles:', errorData.detail?.user_message || 'Permission denied');
        setRoles([]);
        return;
      }
      
      const data = await response.json();
      setRoles(data.roles);
    } catch (err) {
      console.error('Failed to load roles:', err);
      setRoles([]);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreateUser = async () => {
    try {
      let passwordToUse = formData.password;
      
      // Generate password if auto-generate is enabled
      if (autoGeneratePassword) {
        passwordToUse = generatePassword();
        setFormData({ ...formData, password: passwordToUse });
      }
      
      await apiFetch('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, password: passwordToUse })
      });
      
      if (autoGeneratePassword) {
        setSuccess(`User created successfully! Generated password: ${passwordToUse} (Please save this - it won't be shown again)`);
      } else {
        setSuccess('User created successfully');
      }
      
      setCreateModalOpen(false);
      setFormData({ email: '', full_name: '', password: '', is_active: true });
      setAutoGeneratePassword(false);
      loadUsers();
    } catch (err) {
      setError('Failed to create user: ' + err.message);
    }
  };

  const handleUpdateUser = async () => {
    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password; // Don't send empty password
      }
      
      await apiFetch(`/admin/users/${selectedUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      setSuccess('User updated successfully');
      setEditModalOpen(false);
      setSelectedUser(null);
      setFormData({ email: '', full_name: '', password: '', is_active: true });
      loadUsers();
    } catch (err) {
      setError('Failed to update user: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'DELETE'
      });
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (err) {
      setError('Failed to delete user: ' + err.message);
    }
  };

  const handleAssignRoles = async () => {
    try {
      await apiFetch(`/admin/users/${selectedUser.user_id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_ids: selectedRoles })
      });
      setSuccess('Roles assigned successfully');
      setRoleModalOpen(false);
      setSelectedUser(null);
      setSelectedRoles([]);
      loadUsers();
    } catch (err) {
      setError('Failed to assign roles: ' + err.message);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '',
      is_active: user.is_active
    });
    setEditModalOpen(true);
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles.map(r => r.role_id));
    setRoleModalOpen(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  // Show error prominently if there's a permission issue
  if (error && users.length === 0) {
    return (
      <MainLayout>
        <Box p={3}>
          <Typography variant="h4" mb={3}>User Management</Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Access Restricted
            </Typography>
            <Typography color="text.secondary">
              You don't have the necessary permissions to view this page.
              Please contact your system administrator if you need access.
            </Typography>
          </Paper>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create User
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>{user.user_id}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Chip
                          key={role.role_id}
                          label={role.role_name}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Chip label="No roles" size="small" variant="outlined" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit User">
                    <IconButton
                      size="small"
                      onClick={() => openEditModal(user)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Assign Roles">
                    <IconButton
                      size="small"
                      onClick={() => openRoleModal(user)}
                      color="secondary"
                    >
                      <AdminIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete User">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteUser(user.user_id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create User Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PersonAddIcon />
            Create New User
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
              helperText="User will use this email to login"
            />
            <TextField
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              fullWidth
              required
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoGeneratePassword}
                  onChange={(e) => {
                    setAutoGeneratePassword(e.target.checked);
                    if (e.target.checked) {
                      setFormData({ ...formData, password: '' });
                    }
                  }}
                  color="secondary"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <VpnKeyIcon fontSize="small" />
                  Auto-generate secure password
                </Box>
              }
            />
            
            {!autoGeneratePassword && (
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                required
                helperText="Minimum 8 characters, include uppercase, lowercase, number and special character"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  )
                }}
              />
            )}
            
            {autoGeneratePassword && (
              <Alert severity="info">
                A secure random password will be generated and displayed after creation. 
                Make sure to save it as it won't be shown again!
              </Alert>
            )}
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateModalOpen(false);
            setAutoGeneratePassword(false);
            setFormData({ email: '', full_name: '', password: '', is_active: true });
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={!formData.email || !formData.full_name || (!autoGeneratePassword && !formData.password)}
            startIcon={<PersonAddIcon />}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="New Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              placeholder="Leave empty to keep current password"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Roles Modal */}
      <Dialog open={roleModalOpen} onClose={() => setRoleModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Roles</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <FormControl fullWidth>
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={selectedRoles}
                onChange={(e) => setSelectedRoles(e.target.value)}
                renderValue={(selected) => (
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {selected.map((roleId) => {
                      const role = roles.find(r => r.role_id === roleId);
                      return role ? <Chip key={roleId} label={role.role_name} size="small" /> : null;
                    })}
                  </Box>
                )}
              >
                {roles.map((role) => (
                  <MenuItem key={role.role_id} value={role.role_id}>
                    {role.role_name} - {role.role_description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleModalOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignRoles} variant="contained">
            Assign Roles
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </MainLayout>
  );
}
