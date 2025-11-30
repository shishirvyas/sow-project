import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  VpnKey as KeyIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { apiFetch } from '../../config/api';
import MainLayout from '../../layouts/MainLayout';

export default function Permissions() {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  
  const [formData, setFormData] = useState({
    permission_code: '',
    permission_name: '',
    permission_description: '',
    permission_category: 'Other'
  });
  
  const categories = ['System', 'User', 'Role', 'Document', 'Analysis', 'Audit', 'Prompt', 'Other'];

  useEffect(() => {
    loadPermissions();
    loadRoles();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const resp = await apiFetch('/admin/permissions', { method: 'GET' });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail?.user_message || body.detail || `Status ${resp.status}`);
      }
      const data = await resp.json();
      setPermissions(data.permissions || []);
      setError(null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const resp = await apiFetch('/admin/roles', { method: 'GET' });
      if (resp.ok) {
        const data = await resp.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.warn('Could not load roles:', err);
    }
  };

  const handleCreatePermission = async () => {
    try {
      const resp = await apiFetch('/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.permission_code,
          name: formData.permission_name,
          description: formData.permission_description,
          category: formData.permission_category
        })
      });
      
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.detail?.user_message || body.detail || 'Failed to create permission');
      }
      
      setSuccess('Permission created successfully');
      setCreateModalOpen(false);
      setFormData({ permission_code: '', permission_name: '', permission_description: '', permission_category: 'Other' });
      loadPermissions();
    } catch (err) {
      setError('Failed to create permission: ' + err.message);
    }
  };

  const handleUpdatePermission = async () => {
    try {
      const resp = await apiFetch(`/admin/permissions/${selectedPermission.permission_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.permission_code,
          name: formData.permission_name,
          description: formData.permission_description,
          category: formData.permission_category
        })
      });
      
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.detail?.user_message || body.detail || 'Failed to update permission');
      }
      
      setSuccess('Permission updated successfully');
      setEditModalOpen(false);
      setSelectedPermission(null);
      setFormData({ permission_code: '', permission_name: '', permission_description: '', permission_category: 'Other' });
      loadPermissions();
    } catch (err) {
      setError('Failed to update permission: ' + err.message);
    }
  };

  const handleDeletePermission = async (permissionId) => {
    if (!window.confirm('Are you sure you want to delete this permission? This may affect roles using it.')) {
      return;
    }
    
    try {
      const resp = await apiFetch(`/admin/permissions/${permissionId}`, {
        method: 'DELETE'
      });
      
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.detail?.user_message || body.detail || 'Failed to delete permission');
      }
      
      setSuccess('Permission deleted successfully');
      loadPermissions();
    } catch (err) {
      setError('Failed to delete permission: ' + err.message);
    }
  };

  const openEditModal = (perm) => {
    setSelectedPermission(perm);
    setFormData({
      permission_code: perm.permission_code,
      permission_name: perm.permission_name,
      permission_description: perm.permission_description || '',
      permission_category: perm.permission_category || 'Other'
    });
    setEditModalOpen(true);
  };

  const openViewModal = (perm) => {
    setSelectedPermission(perm);
    setViewModalOpen(true);
  };

  const getRolesWithPermission = (permissionId) => {
    return roles.filter(role => 
      role.permissions.some(p => p.permission_id === permissionId)
    );
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.permission_category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(groupedPermissions).reduce((acc, [category, perms]) => {
    const filtered = perms.filter(p => {
      const searchLower = searchQuery.toLowerCase();
      return (
        p.permission_name?.toLowerCase().includes(searchLower) ||
        p.permission_code?.toLowerCase().includes(searchLower) ||
        p.permission_description?.toLowerCase().includes(searchLower) ||
        category.toLowerCase().includes(searchLower)
      );
    });
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});

  const categoryColors = {
    'System': 'error',
    'User': 'primary',
    'Role': 'secondary',
    'Document': 'info',
    'Analysis': 'success',
    'Audit': 'warning',
    'Prompt': 'info',
    'Other': 'default'
  };

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error && permissions.length === 0) {
    return (
      <MainLayout>
        <Box p={3}>
          <Typography variant="h4" gutterBottom>
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Permissions
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 32 }} />
              Permissions Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create, edit, and manage all system permissions
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Permission
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <KeyIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{permissions.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Permissions
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <SecurityIcon color="success" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{Object.keys(groupedPermissions).length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Categories
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search permissions by name, code, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {Object.keys(filteredGrouped).length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery ? 'No permissions found matching your search.' : 'No permissions found.'}
            </Typography>
          </Paper>
        ) : (
          <Box>
            {Object.entries(filteredGrouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, perms]) => (
                <Accordion key={category} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} width="100%">
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {category}
                      </Typography>
                      <Chip
                        label={`${perms.length} permission${perms.length !== 1 ? 's' : ''}`}
                        color={categoryColors[category] || 'default'}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Permission Code</strong></TableCell>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>Description</strong></TableCell>
                            <TableCell align="center"><strong>Used By</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {perms.map((perm) => {
                            const rolesUsingPerm = getRolesWithPermission(perm.permission_id);
                            return (
                              <TableRow key={perm.permission_id} hover>
                                <TableCell>
                                  <Chip
                                    label={perm.permission_code}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>
                                    {perm.permission_name}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {perm.permission_description || '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={`${rolesUsingPerm.length} role${rolesUsingPerm.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    color={rolesUsingPerm.length > 0 ? 'success' : 'default'}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Tooltip title="View Details">
                                    <IconButton size="small" onClick={() => openViewModal(perm)} color="info">
                                      <ViewIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Edit Permission">
                                    <IconButton size="small" onClick={() => openEditModal(perm)} color="primary">
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete Permission">
                                    <IconButton size="small" onClick={() => handleDeletePermission(perm.permission_id)} color="error">
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))}
          </Box>
        )}

        <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <SecurityIcon />
              Create New Permission
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Permission Code"
                value={formData.permission_code}
                onChange={(e) => setFormData({ ...formData, permission_code: e.target.value })}
                placeholder="e.g., user.view"
                fullWidth
                required
                helperText="Unique identifier (lowercase, dot-separated)"
              />
              <TextField
                label="Permission Name"
                value={formData.permission_name}
                onChange={(e) => setFormData({ ...formData, permission_name: e.target.value })}
                placeholder="e.g., View Users"
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.permission_category}
                  onChange={(e) => setFormData({ ...formData, permission_category: e.target.value })}
                  label="Category"
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Description"
                value={formData.permission_description}
                onChange={(e) => setFormData({ ...formData, permission_description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder="Describe what this permission allows"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreatePermission}
              variant="contained"
              disabled={!formData.permission_code || !formData.permission_name}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Permission</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Permission Code"
                value={formData.permission_code}
                onChange={(e) => setFormData({ ...formData, permission_code: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Permission Name"
                value={formData.permission_name}
                onChange={(e) => setFormData({ ...formData, permission_name: e.target.value })}
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.permission_category}
                  onChange={(e) => setFormData({ ...formData, permission_category: e.target.value })}
                  label="Category"
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Description"
                value={formData.permission_description}
                onChange={(e) => setFormData({ ...formData, permission_description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePermission} variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Permission Details</DialogTitle>
          <DialogContent>
            {selectedPermission && (
              <Box mt={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Code</Typography>
                    <Chip label={selectedPermission.permission_code} color="primary" />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{selectedPermission.permission_name}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Category</Typography>
                    <Chip label={selectedPermission.permission_category || 'Other'} size="small" />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{selectedPermission.permission_description || 'No description provided'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Roles with this permission ({getRolesWithPermission(selectedPermission.permission_id).length})
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                      {getRolesWithPermission(selectedPermission.permission_id).length > 0 ? (
                        getRolesWithPermission(selectedPermission.permission_id).map(role => (
                          <Chip key={role.role_id} label={role.role_name} size="small" color="success" />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">Not used by any roles</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
}
