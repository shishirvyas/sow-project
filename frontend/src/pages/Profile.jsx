import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../config/api'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import WorkIcon from '@mui/icons-material/Work'
import BusinessIcon from '@mui/icons-material/Business'
import TimelineIcon from '@mui/icons-material/Timeline'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import EditIcon from '@mui/icons-material/Edit'
import LockIcon from '@mui/icons-material/Lock'
import SettingsIcon from '@mui/icons-material/Settings'
import SaveIcon from '@mui/icons-material/Save'
import MainLayout from '../layouts/MainLayout'

export default function Profile() {
  const navigate = useNavigate()
  const { user, loading, refreshUser } = useAuth()
  const [tabValue, setTabValue] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' })
  
  // Edit Profile State
  const [editForm, setEditForm] = React.useState({
    full_name: '',
    phone: '',
    location: '',
    bio: '',
    job_title: '',
    department: ''
  })
  
  // Change Password State
  const [passwordForm, setPasswordForm] = React.useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  
  // Preferences State
  const [preferences, setPreferences] = React.useState({
    emailNotifications: true,
    analysisAlerts: true,
    weeklyReports: false,
    darkMode: false,
    autoRefresh: true
  })

  // Initialize edit form when user data loads
  React.useEffect(() => {
    if (user) {
      setEditForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        job_title: user.job_title || '',
        department: user.department || ''
      })
    }
  }, [user])

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const handleEditFormChange = (field) => (event) => {
    setEditForm({ ...editForm, [field]: event.target.value })
  }

  const handlePasswordFormChange = (field) => (event) => {
    setPasswordForm({ ...passwordForm, [field]: event.target.value })
  }

  const handlePreferenceChange = (field) => (event) => {
    setPreferences({ ...preferences, [field]: event.target.checked })
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const response = await apiFetch('auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update profile')
      }

      await refreshUser()
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' })
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to update profile', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setSnackbar({ open: true, message: 'Please fill in all password fields', severity: 'error' })
      return
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setSnackbar({ open: true, message: 'New passwords do not match', severity: 'error' })
      return
    }

    if (passwordForm.new_password.length < 8) {
      setSnackbar({ open: true, message: 'Password must be at least 8 characters', severity: 'error' })
      return
    }

    setSaving(true)
    try {
      const response = await apiFetch('auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to change password')
      }

      setSnackbar({ open: true, message: 'Password changed successfully!', severity: 'success' })
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Failed to change password', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleSavePreferences = () => {
    // Save preferences to localStorage or backend
    localStorage.setItem('userPreferences', JSON.stringify(preferences))
    setSnackbar({ open: true, message: 'Preferences saved successfully!', severity: 'success' })
  }

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>My Profile</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }} elevation={2}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<EditIcon />} label="View Profile" iconPosition="start" />
          <Tab icon={<EditIcon />} label="Edit Profile" iconPosition="start" />
          <Tab icon={<LockIcon />} label="Change Password" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="Preferences" iconPosition="start" />
        </Tabs>

        {/* Tab 0: View Profile */}
        {tabValue === 0 && (
          <Box sx={{ p: 4 }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 4 }}>
              <Avatar 
                src={user?.avatar_url} 
                sx={{ width: 120, height: 120, bgcolor: 'primary.main', mb: 2, fontSize: '3rem' }}
              >
                {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
              </Avatar>
              <Typography variant="h3" gutterBottom fontWeight={600}>
                {user?.full_name || 'Loading...'}
              </Typography>
              
              {user?.job_title && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WorkIcon color="primary" fontSize="small" />
                  <Typography variant="h6" color="primary">{user.job_title}</Typography>
                </Box>
              )}
              
              {user?.department && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BusinessIcon color="action" fontSize="small" />
                  <Typography variant="body1" color="text.secondary">{user.department}</Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Biography */}
            {user?.bio && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom fontWeight={600} color="primary">About</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {user.bio}
                </Typography>
              </Box>
            )}

            {user?.bio && <Divider sx={{ my: 3 }} />}

            {/* Contact Information */}
            <Box>
              <Typography variant="h6" gutterBottom fontWeight={600} color="primary">Contact Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <EmailIcon color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography variant="body2">{user?.email}</Typography>
                    </Box>
                  </Box>
                </Grid>
                
                {user?.phone && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PhoneIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Phone</Typography>
                        <Typography variant="body2">{user.phone}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                
                {user?.location && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <LocationOnIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Location</Typography>
                        <Typography variant="body2">{user.location}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Box>
        )}

        {/* Tab 1: Edit Profile */}
        {tabValue === 1 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>Edit Profile Information</Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={editForm.full_name}
                  onChange={handleEditFormChange('full_name')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={user?.email}
                  disabled
                  helperText="Email cannot be changed"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={editForm.phone}
                  onChange={handleEditFormChange('phone')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={editForm.location}
                  onChange={handleEditFormChange('location')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Job Title"
                  value={editForm.job_title}
                  onChange={handleEditFormChange('job_title')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={editForm.department}
                  onChange={handleEditFormChange('department')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Bio"
                  value={editForm.bio}
                  onChange={handleEditFormChange('bio')}
                  helperText="Tell us about yourself"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 2: Change Password */}
        {tabValue === 2 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>Change Password</Typography>
            <Grid container spacing={3} sx={{ mt: 1, maxWidth: 600 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Current Password"
                  value={passwordForm.current_password}
                  onChange={handlePasswordFormChange('current_password')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  value={passwordForm.new_password}
                  onChange={handlePasswordFormChange('new_password')}
                  helperText="Must be at least 8 characters"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  value={passwordForm.confirm_password}
                  onChange={handlePasswordFormChange('confirm_password')}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<LockIcon />}
                  onClick={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 3: Preferences */}
        {tabValue === 3 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.emailNotifications}
                          onChange={handlePreferenceChange('emailNotifications')}
                        />
                      }
                      label="Email Notifications"
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                      Receive email updates for important events
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.analysisAlerts}
                          onChange={handlePreferenceChange('analysisAlerts')}
                        />
                      }
                      label="Analysis Completion Alerts"
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                      Get notified when document analysis completes
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.weeklyReports}
                          onChange={handlePreferenceChange('weeklyReports')}
                        />
                      }
                      label="Weekly Activity Reports"
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                      Receive weekly summaries of your activity
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Display Preferences</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.autoRefresh}
                          onChange={handlePreferenceChange('autoRefresh')}
                        />
                      }
                      label="Auto-refresh Analysis History"
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                      Automatically refresh analysis history every 30 seconds
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSavePreferences}
                >
                  Save Preferences
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  )
}
