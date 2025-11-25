import React, { useState, useEffect } from 'react'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Header from './Header'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import Tooltip from '@mui/material/Tooltip'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import AccountCircle from '@mui/icons-material/AccountCircle'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import DescriptionIcon from '@mui/icons-material/Description'
import { Link as RouterLink } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Avatar from '@mui/material/Avatar'
import Paper from '@mui/material/Paper'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Button from '@mui/material/Button'
import NotificationsIcon from '@mui/icons-material/Notifications'

const drawerWidth = 240
const collapsedWidth = 72

export default function MainLayout({ children }) {
  const theme = useTheme()
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved === 'true'
    } catch (e) {
      return false
    }
  })

  // Persist collapsed state and reset on small screens
  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', collapsed ? 'true' : 'false')
    } catch (e) {
      // ignore write errors
    }
  }, [collapsed])

  useEffect(() => {
    if (!isMdUp && collapsed) {
      setCollapsed(false)
    }
  }, [isMdUp])

  const drawerContent = (
    <>
      <List>
        <ListItem disablePadding>
          <Tooltip
            title="Dashboard"
            placement="right"
            disableHoverListener={!isMdUp || !collapsed}
            enterDelay={100}
            leaveDelay={200}
            enterNextDelay={100}
          >
            <span>
              <ListItemButton
                component={RouterLink}
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                sx={{ justifyContent: isMdUp && collapsed ? 'center' : 'flex-start', px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: isMdUp && collapsed ? 0 : 2, justifyContent: 'center' }}>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText
                  sx={{
                    opacity: isMdUp && collapsed ? 0 : 1,
                    transition: 'opacity 200ms cubic-bezier(0.4,0,0.2,1), width 180ms cubic-bezier(0.4,0,0.2,1)',
                    width: isMdUp && collapsed ? 0 : 'auto',
                    overflow: 'hidden',
                  }}
                  primary="Dashboard"
                />
              </ListItemButton>
            </span>
          </Tooltip>
        </ListItem>
        <ListItem disablePadding>
          <Tooltip title="Products" placement="right" disableHoverListener={!isMdUp || !collapsed}>
            <span>
              <ListItemButton
                component={RouterLink}
                to="/products"
                onClick={() => setMobileOpen(false)}
                sx={{ justifyContent: isMdUp && collapsed ? 'center' : 'flex-start', px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: isMdUp && collapsed ? 0 : 2, justifyContent: 'center' }}>
                  <ShoppingCartIcon />
                </ListItemIcon>
                <ListItemText
                  sx={{
                    opacity: isMdUp && collapsed ? 0 : 1,
                    transition: 'opacity 160ms ease, width 160ms ease',
                    width: isMdUp && collapsed ? 0 : 'auto',
                    overflow: 'hidden',
                  }}
                  primary="Products"
                />
              </ListItemButton>
            </span>
          </Tooltip>
        </ListItem>
      </List>
      <Divider />
      
      {/* Core Feature Section */}
      <List sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(45,128,254,0.08)' : 'rgba(32,101,209,0.04)', py: 1 }}>
        <ListItem disablePadding>
          <Tooltip title="Analyze Doc" placement="right" disableHoverListener={!isMdUp || !collapsed}>
            <span>
              <ListItemButton
                component={RouterLink}
                to="/analyze-doc"
                onClick={() => setMobileOpen(false)}
                sx={{ 
                  justifyContent: isMdUp && collapsed ? 'center' : 'flex-start', 
                  px: 2,
                  '&:hover': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(45,128,254,0.12)' : 'rgba(32,101,209,0.08)',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: isMdUp && collapsed ? 0 : 2, justifyContent: 'center', color: 'primary.main' }}>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText
                  sx={{
                    opacity: isMdUp && collapsed ? 0 : 1,
                    transition: 'opacity 160ms ease, width 160ms ease',
                    width: isMdUp && collapsed ? 0 : 'auto',
                    overflow: 'hidden',
                  }}
                  primary="Analyze Doc"
                  primaryTypographyProps={{ fontWeight: 600, color: 'primary.main' }}
                />
              </ListItemButton>
            </span>
          </Tooltip>
        </ListItem>
      </List>
      
      <Divider />
      <List>
        <ListItem disablePadding>
          <Tooltip title="Account" placement="right" disableHoverListener={!isMdUp || !collapsed}>
            <span>
              <ListItemButton
                component={RouterLink}
                to="/sign-in"
                onClick={() => setMobileOpen(false)}
                sx={{ justifyContent: isMdUp && collapsed ? 'center' : 'flex-start', px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: isMdUp && collapsed ? 0 : 2, justifyContent: 'center' }}>
                  <AccountCircle />
                </ListItemIcon>
                <ListItemText
                  sx={{
                    opacity: isMdUp && collapsed ? 0 : 1,
                    transition: 'opacity 160ms ease, width 160ms ease',
                    width: isMdUp && collapsed ? 0 : 'auto',
                    overflow: 'hidden',
                  }}
                  primary="Account"
                />
              </ListItemButton>
            </span>
          </Tooltip>
        </ListItem>
      </List>
    </>
  )

  const currentWidth = isMdUp ? (collapsed ? collapsedWidth : drawerWidth) : drawerWidth

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header onToggleDrawer={() => setMobileOpen((s) => !s)} collapsed={collapsed} onToggleCollapse={() => setCollapsed((s) => !s)} />

      <Box sx={{ display: 'flex', flex: 1 }}>
        <Drawer
          variant={isMdUp ? 'permanent' : 'temporary'}
          open={isMdUp ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            width: currentWidth,
            transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
            '& .MuiDrawer-paper': {
              width: currentWidth,
              boxSizing: 'border-box',
              top: '64px',
              overflowX: 'hidden',
              transition: 'width 200ms cubic-bezier(0.4,0,0.2,1)',
            },
            display: { xs: isMdUp ? 'none' : 'block', md: 'block' },
          }}
        >
          {drawerContent}
        </Drawer>

        <Container disableGutters sx={{ py: 4, flex: 1, overflow: 'auto' }}>
          <Box sx={{ px: 3 }}>{children}</Box>
        </Container>

        {/* Right user panel */}
        <Box
          component="aside"
          sx={{
            width: 280,
            borderLeft: '1px solid',
            borderColor: 'divider',
            display: { xs: 'none', md: 'block' },
            p: 2,
            pt: 10,
          }}
        >
          <Paper sx={{ p: 2, mb: 2 }} elevation={0}>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>JD</Avatar>
              </ListItemAvatar>
              <ListItemText primary="Jane Doe" secondary="Product Manager" />
            </ListItem>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button size="small" variant="contained">
                View Profile
              </Button>
              <Button size="small">Settings</Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 1 }} elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <NotificationsIcon color="action" sx={{ mr: 1 }} />
              <ListItemText primary="Notifications" />
            </Box>
            <List dense>
              <ListItem>
                <ListItemText primary="New comment on report" secondary="2h ago" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Order #1234 shipped" secondary="1d ago" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Password changed" secondary="3d ago" />
              </ListItem>
            </List>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}
