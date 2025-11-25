import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import DataTable from 'src/components/DataTable/DataTable'

export default function Profile() {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} elevation={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main' }}>JD</Avatar>
          <Box>
            <Typography variant="h5">Shishir Vyas</Typography>
            <Typography variant="body2" color="text.secondary">Product Manager — SKOPE</Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" size="small" sx={{ mr: 1 }}>
                Edit Profile
              </Button>
              <Button variant="outlined" size="small">
                Settings
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      <DataTable title="Recent Projects" />
    </Box>
  )
}
