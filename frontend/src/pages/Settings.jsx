import React from 'react'
import MainLayout from '../layouts/MainLayout'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'

export default function Settings() {
  return (
    <MainLayout>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Settings</Typography>
      </Box>

      <Card elevation={1}>
        <CardContent>
          <Typography variant="h6">Profile</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This page is a placeholder for user settings. You can add forms to edit profile, change password, and manage preferences.
          </Typography>
        </CardContent>
      </Card>
    </MainLayout>
  )
}
