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
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { apiFetch } from '../../config/api';
import MainLayout from '../../layouts/MainLayout';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    role_name: '',
    role_description: ''
  });
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/admin/roles', {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.detail && errorData.detail.error_code) {
          setError(errorData.detail.user_message || errorData.detail.message);
        } else {
          setError(errorData.detail || 'Failed to load roles');
        }
        setRoles([]);
        return;
      }
      
      const data = await response.json();
      setRoles(data.roles);
      setError('');
    } catch (err) {
      setError('Failed to load roles: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await apiFetch('/admin/permissions', {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Cannot load permissions:', errorData.detail?.user_message || 'Permission denied');
        setPermissions([]);
        return;
      }
      
      const data = await response.json();
      setPermissions(data.permissions);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      setPermissions([]);
    }
  };

  const handleCreateRole = async () => {
    try {
      await apiFetch('/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setSuccess('Role created successfully');
      setCreateModalOpen(false);
      setFormData({ role_name: '', role_description: '' });
      loadRoles();
    } catch (err) {
      setError('Failed to create role: ' + err.message);
    }
  };

  const handleUpdateRole = async () => {
    try {
      await apiFetch(`/admin/roles/${selectedRole.role_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setSuccess('Role updated successfully');
      setEditModalOpen(false);
      setSelectedRole(null);
      setFormData({ role_name: '', role_description: '' });
      loadRoles();
    } catch (err) {
      setError('Failed to update role: ' + err.message);
    }
  };

  const handleDeleteRole = async (roleId, isSystemRole) => {
    if (isSystemRole) {
      setError('Cannot delete system roles');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this role?')) {
      return;
    }
    
    try {
      await apiFetch(`/admin/roles/${roleId}`, {
        method: 'DELETE'
      });
      setSuccess('Role deleted successfully');
      loadRoles();
    } catch (err) {
      setError('Failed to delete role: ' + err.message);
    }
  };

  const handleAssignPermissions = async () => {
    try {
      await apiFetch(`/admin/roles/${selectedRole.role_id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_ids: selectedPermissions })
      });
      setSuccess('Permissions assigned successfully');
      setPermissionModalOpen(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      loadRoles();
    } catch (err) {
      setError('Failed to assign permissions: ' + err.message);
    }
  };

  const openEditModal = (role) => {
    if (role.is_system_role) {
      setError('Cannot edit system roles');
      return;
    }
    setSelectedRole(role);
    setFormData({
      role_name: role.role_name,
      role_description: role.role_description
    });
    setEditModalOpen(true);
  };

  const openPermissionModal = (role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions.map(p => p.permission_id));
    setPermissionModalOpen(true);
  };

  const togglePermission = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.permission_category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

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
  if (error && roles.length === 0) {
    return (
      <MainLayout>
        <Box p={3}>
          <Typography variant="h4" mb={3}>Role Management</Typography>
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
        <Typography variant="h4">Role Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
        >
          Create Role
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
              <TableCell>Role Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.role_id}>
                <TableCell>{role.role_id}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {role.is_system_role && <LockIcon fontSize="small" color="disabled" />}
                    {role.role_name}
                  </Box>
                </TableCell>
                <TableCell>{role.role_description}</TableCell>
                <TableCell>
                  <Chip
                    label={`${role.permissions.length} permissions`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={role.is_system_role ? 'System' : 'Custom'}
                    size="small"
                    color={role.is_system_role ? 'default' : 'success'}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={role.is_system_role ? 'System roles cannot be edited' : 'Edit Role'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => openEditModal(role)}
                        color="primary"
                        disabled={role.is_system_role}
                      >
                        <EditIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Manage Permissions">
                    <IconButton
                      size="small"
                      onClick={() => openPermissionModal(role)}
                      color="secondary"
                    >
                      <SecurityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={role.is_system_role ? 'System roles cannot be deleted' : 'Delete Role'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteRole(role.role_id, role.is_system_role)}
                        color="error"
                        disabled={role.is_system_role}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Role Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SecurityIcon />
            Create New Role
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Role Name"
              value={formData.role_name}
              onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.role_description}
              onChange={(e) => setFormData({ ...formData, role_description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateRole}
            variant="contained"
            disabled={!formData.role_name || !formData.role_description}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Role</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Role Name"
              value={formData.role_name}
              onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.role_description}
              onChange={(e) => setFormData({ ...formData, role_description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateRole} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Permissions Modal */}
      <Dialog 
        open={permissionModalOpen} 
        onClose={() => setPermissionModalOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Manage Permissions: {selectedRole?.role_name}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <Card key={category} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    {category}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup>
                    <Grid container spacing={2}>
                      {perms.map((perm) => (
                        <Grid item xs={12} sm={6} key={perm.permission_id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedPermissions.includes(perm.permission_id)}
                                onChange={() => togglePermission(perm.permission_id)}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {perm.permission_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {perm.permission_code}
                                </Typography>
                              </Box>
                            }
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionModalOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignPermissions} variant="contained">
            Save Permissions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </MainLayout>
  );
}
