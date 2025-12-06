import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Warning as AlertIcon
} from '@mui/icons-material';
import { apiFetch } from '../config/api';
import MainLayout from '../layouts/MainLayout';

export default function Prompts() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get context from navigation state
  const promptContext = location.state || {};
  const {
    countryId,
    countryName,
    categoryId,
    categoryName,
    subCategoryId,
    subCategoryName
  } = promptContext;

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showContextRequired, setShowContextRequired] = useState(!countryName && !categoryName && !subCategoryName);
  
  const [searchClauseId, setSearchClauseId] = useState('');
  const [formData, setFormData] = useState({
    clause_id: '',
    name: '',
    prompt_text: '',
    is_active: true
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPrompts();
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchClauseId]);

  const fetchPrompts = async () => {
    try {
      console.log('🔄 Fetching prompts...');
      setLoading(true);
      const url = searchClauseId ? `prompts?clause_id=${encodeURIComponent(searchClauseId)}` : 'prompts';
      const response = await apiFetch(url);
      console.log('📡 Response status:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Received data:', data);
        console.log('📊 Prompts array:', data.prompts);
        console.log('📈 Prompts count:', data.prompts?.length || 0);
        
        if (data.prompts && data.prompts.length > 0) {
          console.log('🔍 First prompt:', data.prompts[0]);
          console.log('🔍 First prompt keys:', Object.keys(data.prompts[0]));
          console.log('🔍 clause_id:', data.prompts[0].clause_id);
          console.log('🔍 name:', data.prompts[0].name);
          console.log('🔍 is_active:', data.prompts[0].is_active);
        }
        
        setPrompts(data.prompts || []);
        showSnackbar(`Loaded ${data.prompts?.length || 0} prompts`, 'success');
      } else {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        showSnackbar('Failed to load prompts', 'error');
      }
    } catch (error) {
      console.error('❌ Error fetching prompts:', error);
      showSnackbar('Error loading prompts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (prompt = null) => {
    if (prompt) {
      setEditMode(true);
      setSelectedPrompt(prompt);
      setFormData({
        clause_id: prompt.clause_id,
        name: prompt.name,
        prompt_text: prompt.prompt_text,
        is_active: prompt.is_active,
        country_id: prompt.country_id,
        sub_category_id: prompt.sub_category_id
      });
    } else {
      setEditMode(false);
      setSelectedPrompt(null);
      setFormData({
        clause_id: '',
        name: '',
        prompt_text: '',
        is_active: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPrompt(null);
    setEditMode(false);
  };

  const handleViewPrompt = async (prompt) => {
    try {
      // Fetch full prompt details including prompt_text
      const response = await apiFetch(`prompts/${prompt.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📖 Fetched full prompt details:', data);
        setSelectedPrompt(data);
        setViewDialog(true);
      } else {
        showSnackbar('Failed to load prompt details', 'error');
      }
    } catch (error) {
      console.error('Error fetching prompt details:', error);
      showSnackbar('Error loading prompt details', 'error');
    }
  };

  const handleDeleteClick = (prompt) => {
    console.log('Delete clicked for prompt:', prompt);
    if (!prompt || !prompt.id) {
      console.error('Invalid prompt data:', prompt);
      showSnackbar('Error: Invalid prompt data', 'error');
      return;
    }
    setSelectedPrompt(prompt);
    setDeleteDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const url = editMode ? `prompts/${selectedPrompt.id}` : 'prompts';
      const method = editMode ? 'PUT' : 'POST';
      
      // For edit mode: use existing prompt context or navigation context
      // For create mode: use navigation context
      const payload = {
        ...formData,
        country_id: editMode ? (formData.country_id || countryId) : countryId,
        sub_category_id: editMode ? (formData.sub_category_id || subCategoryId) : subCategoryId
      };
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showSnackbar(`Prompt ${editMode ? 'updated' : 'created'} successfully`, 'success');
        handleCloseDialog();
        fetchPrompts();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      showSnackbar('Error saving prompt', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedPrompt || !selectedPrompt.id) {
      console.error('No prompt selected or missing ID:', selectedPrompt);
      showSnackbar('Error: No prompt selected', 'error');
      setDeleteDialog(false);
      return;
    }

    try {
      console.log('Deleting prompt:', selectedPrompt.id);
      const response = await apiFetch(`prompts/${selectedPrompt.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSnackbar('Prompt deleted successfully', 'success');
        setDeleteDialog(false);
        setSelectedPrompt(null);
        fetchPrompts();
      } else {
        const error = await response.json();
        showSnackbar(error.detail || 'Delete failed', 'error');
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      showSnackbar('Error deleting prompt', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <MainLayout>
      {/* Mandatory Context Selection Modal */}
      <Dialog 
        open={showContextRequired} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <AlertIcon />
            Context Selection Required
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            You must select a Country, Category, and Sub-Category context before managing AI Prompt Templates.
          </Alert>
          <Typography variant="body1" paragraph>
            Prompts are organized by:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" gutterBottom>
              <strong>Country:</strong> Geographic region or market
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              <strong>Category:</strong> Main classification group
            </Typography>
            <Typography component="li" variant="body2" gutterBottom>
              <strong>Sub-Category:</strong> Specific area within the category
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This ensures prompts are properly categorized and can be managed effectively across different contexts.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Button
            onClick={() => navigate(-1)}
            color="inherit"
          >
            Go Back
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/prompt-selector')}
            autoFocus
          >
            Select Context
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          AI Prompt Templates
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Prompt
        </Button>
      </Box>

      {/* Context Banner */}
      {(countryName || categoryName || subCategoryName) && (
        <Card sx={{ mb: 3, bgcolor: 'info.light', borderLeft: 4, borderColor: 'info.main' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: 'info.contrastText' }}>
                  Prompt Context
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {countryName && (
                    <Chip
                      label={`Country: ${countryName}`}
                      color="primary"
                      size="medium"
                    />
                  )}
                  {categoryName && (
                    <Chip
                      label={`Category: ${categoryName}`}
                      color="primary"
                      size="medium"
                    />
                  )}
                  {subCategoryName && (
                    <Chip
                      label={`Sub-Category: ${subCategoryName}`}
                      color="success"
                      size="medium"
                    />
                  )}
                </Box>
              </Box>
              <IconButton
                onClick={() => navigate('/prompt-selector')}
                color="primary"
                title="Change Context"
              >
                <ArrowBackIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {/* Search Field */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Search by Clause ID"
              placeholder="Enter Clause ID to search..."
              value={searchClauseId}
              onChange={(e) => setSearchClauseId(e.target.value)}
              variant="outlined"
              size="medium"
              sx={{ flexGrow: 1, maxWidth: 400 }}
              InputProps={{
                endAdornment: searchClauseId && (
                  <IconButton
                    size="small"
                    onClick={() => setSearchClauseId('')}
                    edge="end"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )
              }}
            />
            {searchClauseId && (
              <Typography variant="body2" color="text.secondary">
                {prompts.length} result{prompts.length !== 1 ? 's' : ''} found
              </Typography>
            )}
          </Box>

          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Clause ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>SubCategory</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">Loading...</TableCell>
                  </TableRow>
                ) : prompts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {searchClauseId ? `No prompts found matching "${searchClauseId}"` : 'No prompts found. Create your first prompt template!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  prompts.map((prompt) => (
                    <TableRow key={prompt.id} hover>
                      <TableCell>
                        <Chip 
                          label={prompt.clause_id} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {prompt.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {prompt.country_name || <span style={{color: '#999', fontStyle: 'italic'}}>Not Set</span>}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {prompt.category_name || <span style={{color: '#999', fontStyle: 'italic'}}>Not Set</span>}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {prompt.sub_category_name || <span style={{color: '#999', fontStyle: 'italic'}}>Not Set</span>}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleViewPrompt(prompt)}
                          title="View"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(prompt)}
                          title="Edit"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(prompt)}
                          title="Delete"
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Prompt Template' : 'Create New Prompt Template'}
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
              label="Clause ID"
              fullWidth
              required
              value={formData.clause_id}
              onChange={(e) => setFormData({ ...formData, clause_id: e.target.value })}
              placeholder="e.g., ADM-E01, ADM-E04"
              helperText="Unique identifier for this prompt (e.g., ADM-E01)"
              disabled={editMode}
            />
            
            <TextField
              label="Prompt Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Annual Rate Increase Audit"
            />

            <TextField
              label="Prompt Text"
              fullWidth
              required
              multiline
              rows={15}
              value={formData.prompt_text}
              onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
              placeholder="Enter your prompt template here. Use {{variable_name}} for variable substitution..."
              sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
              helperText="Use {{variable_name}} syntax for variables that will be substituted from the variables table"
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
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.clause_id || !formData.name || !formData.prompt_text}
          >
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          View Prompt Template
          <IconButton
            onClick={() => setViewDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPrompt && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Clause ID</Typography>
                <Chip label={selectedPrompt.clause_id} size="small" color="primary" />
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                <Typography variant="body1">{selectedPrompt.name}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">Prompt Text</Typography>
                <Paper sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50', mt: 1, maxHeight: 400, overflow: 'auto' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap', 
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: 'text.primary'
                    }}
                  >
                    {selectedPrompt.prompt_text}
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedPrompt.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={selectedPrompt.is_active ? 'success' : 'default'}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Variables</Typography>
                  <Chip 
                    label={`${selectedPrompt.variable_count || 0} variables`} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                  <Typography variant="body2">
                    {new Date(selectedPrompt.created_at).toLocaleString()}
                  </Typography>
                </Box>
                {selectedPrompt.updated_at && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
                    <Typography variant="body2">
                      {new Date(selectedPrompt.updated_at).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<EditIcon />}
            onClick={() => {
              setViewDialog(false);
              handleOpenDialog(selectedPrompt);
            }}
          >
            Edit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog} 
        onClose={() => {
          setDeleteDialog(false);
          // Don't clear selectedPrompt here, let handleDelete do it
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the prompt "{selectedPrompt?.name}"?
            This action cannot be undone.
          </Typography>
          {selectedPrompt && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ID: {selectedPrompt.id}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialog(false);
            // Keep selectedPrompt for a moment in case it's needed
          }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}
