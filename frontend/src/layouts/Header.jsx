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
import { Link as RouterLink } from 'react-router-dom'
import AccountPopover from 'src/components/AccountPopover/AccountPopover'
import NotificationsPopover from 'src/components/Notifications/NotificationsPopover'
import { ThemeContext } from 'src/theme/ThemeProvider'

export default function Header({ onToggleDrawer, collapsed, onToggleCollapse }) {
  const { mode, toggleTheme } = React.useContext(ThemeContext)
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
            SKOPE
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Desktop account popover */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, mr: 2 }}>
          <AccountPopover />
        </Box>

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

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
          <Button component={RouterLink} to="/dashboard" color="primary" variant="text">
            Dashboard
          </Button>
          <Button component={RouterLink} to="/products" color="primary" variant="text">
            Products
          </Button>
          <NotificationsPopover />
          
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleTheme} color="inherit" sx={{ ml: 1 }}>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          <Button component={RouterLink} to="/sign-in" color="primary" variant="outlined" sx={{ ml: 1 }}>
            Sign In
          </Button>
        </Box>

        {/* Mobile account popover - right side */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <AccountPopover />
        </Box>
      </Toolbar>
    </AppBar>
  )
}
