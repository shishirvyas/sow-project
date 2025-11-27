import React from 'react'
import { useNavigate } from 'react-router-dom'
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DataTable from 'src/components/DataTable/DataTable'
import MainLayout from '../layouts/MainLayout'

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiFetch('profile')
      .then(res => res.json())
      .then(data => {
        setProfile(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch profile:', err)
        setLoading(false)
      })
  }, [])

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

      <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 3 }}>
          <Avatar sx={{ width: 96, height: 96, bgcolor: 'primary.main', mb: 2 }}>
            {profile?.initials || (profile?.name ? getInitials(profile.name) : '?')}
          </Avatar>
          <Typography variant="h4" gutterBottom>{profile?.name || 'Loading...'}</Typography>
          <Typography variant="body1" color="text.secondary">{profile?.role} — {profile?.department}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {profile?.location} • {profile?.experience_years} years experience
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
            <Button variant="contained" size="medium">
              Edit Profile
            </Button>
            <Button variant="outlined" size="medium">
              Settings
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              About
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {profile?.bio}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Contact Information
            </Typography>
            <Typography variant="body2">Email: {profile?.email}</Typography>
            <Typography variant="body2">Phone: {profile?.contact?.phone}</Typography>
            {profile?.location && <Typography variant="body2">Location: {profile?.location}</Typography>}
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Skills & Expertise
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {profile?.skills?.map((skill) => (
                <Chip key={skill} label={skill} size="small" color="primary" variant="outlined" />
              ))}
            </Box>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Social Links
            </Typography>
            {profile?.social?.linkedin && (
              <Typography variant="body2">LinkedIn: {profile.social.linkedin}</Typography>
            )}
            {profile?.social?.github && (
              <Typography variant="body2">GitHub: {profile.social.github}</Typography>
            )}
          </Grid>
        </Grid>
      </Paper>

      <DataTable title="Recent Projects" />
    </MainLayout>
  )
}
