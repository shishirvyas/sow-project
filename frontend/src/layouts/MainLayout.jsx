import React, { useState, useEffect } from 'react'
import { apiFetch } from '../config/api'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Header from './Header'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Avatar from '@mui/material/Avatar'
import Paper from '@mui/material/Paper'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import CloseIcon from '@mui/icons-material/Close'
import DynamicMenu from '../components/Menu/DynamicMenu'
import { useAuth } from '../contexts/AuthContext'
import { useAnalysisHistory } from '../contexts/AnalysisHistoryContext'

const drawerWidth = 240
const collapsedWidth = 72

// Helper to generate initials from name
function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0].substring(0, 2).toUpperCase()
}

// Helper to check if a date is today
function isToday(dateString) {
  if (!dateString) return false
  
  try {
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) return false
    
    const today = new Date()
    
    // Compare date components (ignoring time)
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  } catch (err) {
    console.error('Error parsing date:', dateString, err)
    return false
  }
}

// Helper to format time ago
function getTimeAgo(dateString) {
  if (!dateString) return 'Recently'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  return 'Today'
}

// Helper to extract document name from blob path
function formatDocName(blobName) {
  if (!blobName || blobName === 'unknown') return 'Unknown Document'
  const parts = blobName.split('/')
  const fileName = parts[parts.length - 1]
  // Truncate if too long
  return fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName
}

export default function MainLayout({ children }) {
  const navigate = useNavigate()
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
  const { user, roles } = useAuth()
  const { fetchHistory, getTodaysAnalyses, loading: historyLoading } = useAnalysisHistory()
  const [profileCardOpen, setProfileCardOpen] = useState(true)
  const [todaysAnalyses, setTodaysAnalyses] = useState([])

  // Fetch today's completed analyses using cache
  const loadTodaysAnalyses = React.useCallback(async () => {
    try {
      // This will use cache if valid (< 30 seconds old)
      await fetchHistory()
      // Get today's analyses from cache
      const analyses = getTodaysAnalyses()
      setTodaysAnalyses(analyses)
      console.log('✅ MainLayout: Loaded', analyses.length, 'today\'s analyses from cache')
    } catch (error) {
      console.error('❌ Error loading today\'s analyses:', error)
      setTodaysAnalyses([])
    }
  }, [fetchHistory, getTodaysAnalyses])

  // Fetch on mount and refresh every 60 seconds
  useEffect(() => {
    loadTodaysAnalyses()
    const interval = setInterval(loadTodaysAnalyses, 60000)
    return () => clearInterval(interval)
  }, [loadTodaysAnalyses])

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
      <DynamicMenu 
        collapsed={collapsed} 
        isMdUp={isMdUp} 
        onItemClick={() => setMobileOpen(false)} 
      />
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
          {profileCardOpen && (
            <Paper sx={{ p: 2, mb: 2, position: 'relative' }} elevation={0}>
              <IconButton
                size="small"
                onClick={() => setProfileCardOpen(false)}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <ListItem>
                <ListItemAvatar>
                  <Avatar src={user?.avatar_url} sx={{ bgcolor: 'primary.main' }}>
                    {user?.full_name ? getInitials(user.full_name) : '?'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={user?.full_name || 'Loading...'} 
                  secondary={user?.job_title || ''}
                />
              </ListItem>
              {roles && roles.length > 0 && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Roles
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {roles.map((role) => (
                      <Chip 
                        key={role.id} 
                        label={role.name} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button size="small" variant="contained" onClick={() => navigate('/profile')} fullWidth>
                  View Profile
                </Button>
              </Box>
            </Paper>
          )}

          <Paper sx={{ p: 1.5 }} elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <NotificationsIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" fontWeight={600}>
                  Today's Completed
                </Typography>
              </Box>
              {todaysAnalyses.length > 0 && (
                <Chip 
                  label={todaysAnalyses.length} 
                  size="small" 
                  color="primary"
                  sx={{ height: 20, minWidth: 20 }}
                />
              )}
            </Box>
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : todaysAnalyses.length === 0 ? (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                  No analyses completed today
                </Typography>
              </Box>
            ) : (
              <List dense sx={{ py: 0 }}>
                {todaysAnalyses.map((analysis) => (
                  <ListItem
                    key={analysis.result_blob_name}
                    button
                    onClick={() => navigate(`/analysis-history/${encodeURIComponent(analysis.result_blob_name)}`)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {analysis.status === 'success' ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <WarningIcon fontSize="small" color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="body2" fontSize="0.85rem" noWrap>
                          {formatDocName(analysis.source_blob)}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <Typography variant="caption" fontSize="0.7rem" color="text.secondary">
                            {getTimeAgo(analysis.processing_completed_at || analysis.created)}
                          </Typography>
                          {analysis.error_count > 0 && (
                            <Chip 
                              label={`${analysis.error_count} err`}
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ height: 16, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
            {todaysAnalyses.length > 0 && (
              <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                <Button 
                  size="small" 
                  fullWidth 
                  onClick={() => navigate('/analysis-history')}
                  sx={{ fontSize: '0.75rem' }}
                >
                  View All History
                </Button>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}
