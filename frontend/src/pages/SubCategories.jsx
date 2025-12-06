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
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  AccountTree as SubCategoryIcon
} from '@mui/icons-material';
import { apiFetch } from '../config/api';
import MainLayout from '../layouts/MainLayout';

export default function SubCategories() {
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    category_id: '',
    sub_category_name: '',
    sub_category_code: '',
    description: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    fetchCategories();
    fetchSubCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiFetch('categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubCategories = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('sub-categories');
      if (response.ok) {
        const data = await response.json();
        setSubCategories(data.sub_categories || []);
        showSnackbar(`Loaded ${data.sub_categories?.length || 0} sub-categories`, 'success');
      } else {
        showSnackbar('Failed to fetch sub-categories', 'error');
      }
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
      showSnackbar('Error loading sub-categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (subCategory = null) => {
    if (subCategory) {
      setFormData({
        category_id: subCategory.category_id,
        sub_category_name: subCategory.sub_category_name,
        sub_category_code: subCategory.sub_category_code || '',
        description: subCategory.description || '',
        display_order: subCategory.display_order || 0,
        is_active: subCategory.is_active
      });
      setSelectedSubCategory(subCategory);
      setEditMode(true);
    } else {
      setFormData({
        category_id: '',
        sub_category_name: '',
        sub_category_code: '',
        description: '',
        display_order: 1,
        is_active: true
      });
      setSelectedSubCategory(null);
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSubCategory(null);
    setEditMode(false);
  };

  const handleSubmit = async () => {
    try {
      const url = editMode ? `sub-categories/${selectedSubCategory.id}` : 'sub-categories';
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showSnackbar(
          editMode ? 'Sub-category updated successfully' : 'Sub-category created successfully',
          'success'
        );
        handleCloseDialog();
        fetchSubCategories();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error saving sub-category:', error);
      showSnackbar('Error saving sub-category', 'error');
    }
  };

  const handleDeleteClick = (subCategory) => {
    setSelectedSubCategory(subCategory);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await apiFetch(`sub-categories/${selectedSubCategory.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSnackbar('Sub-category deleted successfully', 'success');
        setDeleteDialog(false);
        setSelectedSubCategory(null);
        fetchSubCategories();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Error deleting sub-category:', error);
      showSnackbar('Error deleting sub-category', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.category_name : 'Unknown';
  };

  const getCategoryCode = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.category_code : '';
  };

  const filteredSubCategories = subCategories.filter(subCategory => {
    const matchesSearch = 
      subCategory.sub_category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subCategory.sub_category_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subCategory.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryName(subCategory.category_id)?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || subCategory.category_id === parseInt(filterCategory);
    
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SubCategoryIcon sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              Sub-Category Management
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Sub-Category
          </Button>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                placeholder="Search by sub-category name, code, or parent category..."
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
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Category</InputLabel>
                <Select
                  value={filterCategory}
                  label="Filter by Category"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.category_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
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
                  <TableCell><strong>Parent Category</strong></TableCell>
                  <TableCell><strong>Order</strong></TableCell>
                  <TableCell><strong>Sub-Category Name</strong></TableCell>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSubCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No sub-categories found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubCategories.map((subCategory) => (
                    <TableRow key={subCategory.id} hover>
                      <TableCell>
                        <Chip 
                          label={getCategoryCode(subCategory.category_id)} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{subCategory.display_order}</TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {subCategory.sub_category_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={subCategory.sub_category_code} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {subCategory.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subCategory.is_active ? 'Active' : 'Inactive'}
                          color={subCategory.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(subCategory)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(subCategory)}
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
            {editMode ? 'Edit Sub-Category' : 'Add New Sub-Category'}
            <IconButton
              onClick={handleCloseDialog}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Parent Category</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Parent Category"
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.category_name} ({category.category_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Sub-Category Name"
                value={formData.sub_category_name}
                onChange={(e) => setFormData({ ...formData, sub_category_name: e.target.value })}
                required
                fullWidth
                helperText="e.g., Software Development, Cloud Services"
              />
              <TextField
                label="Sub-Category Code"
                value={formData.sub_category_code}
                onChange={(e) => setFormData({ ...formData, sub_category_code: e.target.value.toUpperCase() })}
                fullWidth
                helperText="Unique code (e.g., TECH-SW, FIN-BANK)"
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                helperText="Brief description of this sub-category"
              />
              <TextField
                label="Display Order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                fullWidth
                helperText="Order within parent category"
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
            <Typography>
              Are you sure you want to delete <strong>{selectedSubCategory?.sub_category_name}</strong>?
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
