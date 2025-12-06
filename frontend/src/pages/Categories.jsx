import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Chip,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { apiFetch } from '../config/api';
import MainLayout from '../layouts/MainLayout';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    category_name: '',
    category_code: '',
    description: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        showSnackbar(`Loaded ${data.categories?.length || 0} categories`, 'success');
      } else {
        showSnackbar('Failed to fetch categories', 'error');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      showSnackbar('Error loading categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setFormData({
        category_name: category.category_name,
        category_code: category.category_code || '',
        description: category.description || '',
        display_order: category.display_order || 0,
        is_active: category.is_active
      });
      setSelectedCategory(category);
      setEditMode(true);
    } else {
      setFormData({
        category_name: '',
        category_code: '',
        description: '',
        display_order: categories.length + 1,
        is_active: true
      });
      setSelectedCategory(null);
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCategory(null);
    setEditMode(false);
  };

  const handleSubmit = async () => {
    try {
      const url = editMode ? `categories/${selectedCategory.id}` : 'categories';
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showSnackbar(
          editMode ? 'Category updated successfully' : 'Category created successfully',
          'success'
        );
        handleCloseDialog();
        fetchCategories();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      showSnackbar('Error saving category', 'error');
    }
  };

  const handleDeleteClick = (category) => {
    setSelectedCategory(category);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await apiFetch(`categories/${selectedCategory.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSnackbar('Category deleted successfully', 'success');
        setDeleteDialog(false);
        setSelectedCategory(null);
        fetchCategories();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showSnackbar('Error deleting category', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredCategories = categories.filter(category =>
    category.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.category_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              Category Management
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Category
          </Button>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search by category name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Order</strong></TableCell>
                  <TableCell><strong>Category Name</strong></TableCell>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Sub-Categories</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No categories found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id} hover>
                      <TableCell>{category.display_order}</TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {category.category_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={category.category_code} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {category.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={category.sub_category_count || 0} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={category.is_active ? 'Active' : 'Inactive'}
                          color={category.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(category)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(category)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editMode ? 'Edit Category' : 'Add New Category'}
            <IconButton
              onClick={handleCloseDialog}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Category Name"
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                required
                fullWidth
                helperText="e.g., Technology, Finance, Healthcare"
              />
              <TextField
                label="Category Code"
                value={formData.category_code}
                onChange={(e) => setFormData({ ...formData, category_code: e.target.value.toUpperCase() })}
                required
                fullWidth
                helperText="Unique code (e.g., TECH, FIN)"
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                helperText="Brief description of this category"
              />
              <TextField
                label="Display Order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                fullWidth
                helperText="Order in which this category appears"
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
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Deleting this category will also delete all its sub-categories!
            </Alert>
            <Typography>
              Are you sure you want to delete <strong>{selectedCategory?.category_name}</strong>?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </MainLayout>
  );
}
