import React from 'react'
import Avatar from '@mui/material/Avatar'
import Popover from '@mui/material/Popover'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// Helper to generate initials from name
function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].substring(0, 2).toUpperCase()
}

export default function AccountPopover() {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const { user } = useAuth()

  const handleOpen = (e) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const navigate = useNavigate()

  const goTo = (path) => {
    handleClose()
    navigate(path)
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <Avatar
        onClick={handleOpen}
        src={user?.avatar_url}
        sx={{ bgcolor: 'primary.main', width: 40, height: 40, cursor: 'pointer' }}
        aria-controls={open ? 'account-popover' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        {user?.full_name ? getInitials(user.full_name) : '?'}
      </Avatar>

      <Popover
        id="account-popover"
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 260, p: 1 } }}
      >
        <Box sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
            <Avatar src={user?.avatar_url} sx={{ bgcolor: 'primary.main' }}>
              {user?.full_name ? getInitials(user.full_name) : '?'}
            </Avatar>
            <Box>
              <Typography variant="subtitle1">{user?.full_name || 'Loading...'}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.job_title || ''}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 1 }}>
            <Button fullWidth variant="contained" size="small" sx={{ mb: 1 }} onClick={() => goTo('/profile')}>
              View Profile
            </Button>
            <Button fullWidth variant="outlined" size="small" onClick={() => {/* sign out placeholder */}}>
              Sign Out
            </Button>
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        <List dense>
          <ListItem button onClick={() => goTo('/settings')}>
            <ListItemText primary="Account settings" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Billing" />
          </ListItem>
        </List>
      </Popover>
    </>
  )
}
