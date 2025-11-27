import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import WorkIcon from '@mui/icons-material/Work'
import BusinessIcon from '@mui/icons-material/Business'
import TimelineIcon from '@mui/icons-material/Timeline'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import MainLayout from '../layouts/MainLayout'

export default function Profile() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  
  const profile = user

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
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Profile</Typography>
      </Box>

      <Paper sx={{ p: 4, mb: 3 }} elevation={2}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 4 }}>
          <Avatar 
            src={profile?.avatar_url} 
            sx={{ width: 120, height: 120, bgcolor: 'primary.main', mb: 2, fontSize: '3rem' }}
          >
            {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
          </Avatar>
          <Typography variant="h3" gutterBottom fontWeight={600}>
            {profile?.full_name || 'Loading...'}
          </Typography>
          
          {/* Job Title & Department */}
          {profile?.job_title && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WorkIcon color="primary" fontSize="small" />
              <Typography variant="h6" color="primary">
                {profile.job_title}
              </Typography>
            </Box>
          )}
          
          {profile?.department && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BusinessIcon color="action" fontSize="small" />
              <Typography variant="body1" color="text.secondary">
                {profile.department}
              </Typography>
            </Box>
          )}
          
          {profile?.years_of_experience && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon color="action" fontSize="small" />
              <Typography variant="body1" color="text.secondary">
                {profile.years_of_experience}+ years of experience
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Biography Section */}
        {profile?.bio && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom fontWeight={600} color="primary">
              About
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              {profile.bio}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Contact Information */}
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600} color="primary">
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <EmailIcon color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{profile?.email}</Typography>
                </Box>
              </Box>
            </Grid>
            
            {profile?.phone && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <PhoneIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body2">{profile.phone}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            
            {profile?.location && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <LocationOnIcon color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography variant="body2">{profile.location}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Admin Badge */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Chip 
            label="Administrator" 
            color="primary" 
            size="medium"
            sx={{ fontWeight: 600, px: 2 }}
          />
        </Box>
      </Paper>
    </MainLayout>
  )
}
