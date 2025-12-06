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
  Close as CloseIcon
} from '@mui/icons-material';
import { apiFetch } from '../config/api';
import MainLayout from '../layouts/MainLayout';

export default function Countries() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    country_name: '',
    iso_code_2: '',
    iso_code_3: '',
    numeric_code: '',
    region: '',
    is_active: true
  });

  const regions = [
    'Africa',
    'Asia',
    'Europe',
    'North America',
    'South America',
    'Oceania'
  ];

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('countries');
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
        showSnackbar(`Loaded ${data.countries?.length || 0} countries`, 'success');
      } else {
        showSnackbar('Failed to fetch countries', 'error');
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
      showSnackbar('Error loading countries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (country = null) => {
    if (country) {
      setFormData({
        country_name: country.country_name,
        iso_code_2: country.iso_code_2,
        iso_code_3: country.iso_code_3,
        numeric_code: country.numeric_code || '',
        region: country.region,
        is_active: country.is_active
      });
      setSelectedCountry(country);
      setEditMode(true);
    } else {
      setFormData({
        country_name: '',
        iso_code_2: '',
        iso_code_3: '',
        numeric_code: '',
        region: '',
        is_active: true
      });
      setSelectedCountry(null);
      setEditMode(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCountry(null);
    setEditMode(false);
  };

  const handleSubmit = async () => {
    try {
      const url = editMode ? `countries/${selectedCountry.id}` : 'countries';
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showSnackbar(
          editMode ? 'Country updated successfully' : 'Country created successfully',
          'success'
        );
        handleCloseDialog();
        fetchCountries();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error saving country:', error);
      showSnackbar('Error saving country', 'error');
    }
  };

  const handleDeleteClick = (country) => {
    setSelectedCountry(country);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await apiFetch(`countries/${selectedCountry.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSnackbar('Country deleted successfully', 'success');
        setDeleteDialog(false);
        setSelectedCountry(null);
        fetchCountries();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Error deleting country:', error);
      showSnackbar('Error deleting country', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredCountries = countries.filter(country =>
    country.country_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.iso_code_2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.iso_code_3?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Country Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Country
          </Button>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search by country name, ISO code, or region..."
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
                  <TableCell><strong>Country Name</strong></TableCell>
                  <TableCell><strong>ISO 2</strong></TableCell>
                  <TableCell><strong>ISO 3</strong></TableCell>
                  <TableCell><strong>Region</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCountries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">No countries found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCountries.map((country) => (
                    <TableRow key={country.id} hover>
                      <TableCell>{country.country_name}</TableCell>
                      <TableCell>
                        <Chip label={country.iso_code_2} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={country.iso_code_3} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{country.region}</TableCell>
                      <TableCell>
                        <Chip
                          label={country.is_active ? 'Active' : 'Inactive'}
                          color={country.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(country)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(country)}
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
            {editMode ? 'Edit Country' : 'Add New Country'}
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
                label="Country Name"
                value={formData.country_name}
                onChange={(e) => setFormData({ ...formData, country_name: e.target.value })}
                required
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="ISO Code 2"
                  value={formData.iso_code_2}
                  onChange={(e) => setFormData({ ...formData, iso_code_2: e.target.value.toUpperCase() })}
                  required
                  fullWidth
                  inputProps={{ maxLength: 2 }}
                  helperText="2-letter code (e.g., US)"
                />
                <TextField
                  label="ISO Code 3"
                  value={formData.iso_code_3}
                  onChange={(e) => setFormData({ ...formData, iso_code_3: e.target.value.toUpperCase() })}
                  required
                  fullWidth
                  inputProps={{ maxLength: 3 }}
                  helperText="3-letter code (e.g., USA)"
                />
              </Box>
              <TextField
                label="Numeric Code"
                value={formData.numeric_code}
                onChange={(e) => setFormData({ ...formData, numeric_code: e.target.value })}
                fullWidth
                inputProps={{ maxLength: 3 }}
                helperText="Optional 3-digit code"
              />
              <TextField
                select
                label="Region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                required
                fullWidth
                SelectProps={{ native: true }}
              >
                <option value="">Select a region</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </TextField>
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
              Are you sure you want to delete <strong>{selectedCountry?.country_name}</strong>?
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
