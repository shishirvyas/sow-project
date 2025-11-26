import React from 'react'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import MainLayout from '../layouts/MainLayout'

export default function Dashboard() {
  return (
    <MainLayout>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Card elevation={2} sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
          <Typography variant="h4" gutterBottom color="primary">
            Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            🚧 Work in Progress
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            We're building something amazing here. Check back soon!
          </Typography>
        </Card>
      </Box>


    </MainLayout>
  )
}
