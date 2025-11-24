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
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import { Link as RouterLink } from 'react-router-dom'

export default function Header({ onToggleDrawer, collapsed, onToggleCollapse }) {
  return (
    <AppBar position="sticky" color="inherit" elevation={1} sx={{ mb: 3 }}>
      <Toolbar sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
        <Avatar
          component={RouterLink}
          to="/"
          sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40, textDecoration: 'none' }}
        >
          SK
        </Avatar>

        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ textDecoration: 'none', color: 'text.primary', fontWeight: 600 }}
        >
          SKOPE
        </Typography>

        <Box sx={{ flex: 1 }} />

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

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          <Button component={RouterLink} to="/dashboard" color="primary" variant="text">
            Dashboard
          </Button>
          <Button component={RouterLink} to="/products" color="primary" variant="text">
            Products
          </Button>
          <Button component={RouterLink} to="/sign-in" color="primary" variant="outlined" sx={{ ml: 1 }}>
            Sign In
          </Button>
        </Box>

        <IconButton edge="end" sx={{ display: { md: 'none' } }} aria-label="menu" onClick={onToggleDrawer}>
          <MenuIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
