import React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import AccountPopover from 'src/components/AccountPopover/AccountPopover'
import NotificationsPopover from 'src/components/Notifications/NotificationsPopover'
import { ThemeContext } from 'src/theme/ThemeProvider'
import { useAuth } from '../contexts/AuthContext'

export default function Header({ onToggleDrawer, collapsed, onToggleCollapse }) {
  const { mode, toggleTheme } = React.useContext(ThemeContext)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = React.useState(null)

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseMenu = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    handleCloseMenu()
    navigate('/login')
  }

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (
    <AppBar position="sticky" color="inherit" elevation={1} sx={{ mb: 3 }}>
      <Toolbar sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
        {/* Mobile menu icon - left side */}
        <IconButton 
          edge="start" 
          sx={{ display: { md: 'none' }, mr: 2 }} 
          aria-label="menu" 
          onClick={onToggleDrawer}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '8px',
              bgcolor: 'primary.main',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '1.2rem',
              transition: 'all 200ms ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 2,
              },
            }}
          >
            S
          </Box>

          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ 
              textDecoration: 'none', 
              color: 'text.primary', 
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}
          >
            SKOPE360
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* User Avatar and Menu */}
        {isAuthenticated && user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user.full_name}
            </Typography>
            <Tooltip title="Account">
              <IconButton onClick={handleOpenMenu} size="small">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {getInitials(user.full_name)}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2">{user.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem component={RouterLink} to="/profile" onClick={handleCloseMenu}>
                <PersonIcon sx={{ mr: 1 }} fontSize="small" />
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}

        {/* Desktop collapse toggle */}
        <Tooltip
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          disableHoverListener={false}
          disableFocusListener={false}
          placement="bottom"
        >
          <IconButton
            aria-label={collapsed ? 'expand sidebar' : 'collapse sidebar'}
            aria-pressed={collapsed}
            onClick={onToggleCollapse}
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              mr: 1,
              transition: 'transform 220ms cubic-bezier(0.2,0.8,0.2,1), opacity 150ms ease',
              transform: collapsed ? 'rotate(180deg) scale(0.95)' : 'rotate(0deg) scale(1)',
              '&:active': { transform: collapsed ? 'rotate(180deg) scale(0.92)' : 'rotate(0deg) scale(0.96)' },
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <NotificationsPopover />
          
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          {!isAuthenticated && (
            <Button component={RouterLink} to="/login" color="primary" variant="outlined" sx={{ ml: 1 }}>
              Sign In
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
