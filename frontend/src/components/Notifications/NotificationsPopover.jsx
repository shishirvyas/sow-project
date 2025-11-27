import React from 'react'
import { useNavigate } from 'react-router-dom'
import * as notificationsService from 'src/services/notifications'
import { apiFetch } from 'src/config/api'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Popover from '@mui/material/Popover'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import Chip from '@mui/material/Chip'

const STORAGE_KEY = 'skope360_notifications_viewed'

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
  return parts[parts.length - 1]
}

// Load viewed notification IDs from localStorage
function loadViewedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch (err) {
    return new Set()
  }
}

// Save viewed notification IDs to localStorage
function saveViewedIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch (err) {
    // ignore
  }
}

export default function NotificationsPopover() {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const [items, setItems] = React.useState([])
  const [viewedIds, setViewedIds] = React.useState(() => loadViewedIds())
  const [loading, setLoading] = React.useState(false)

  const navigate = useNavigate()

  const handleOpen = (e) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  // Fetch today's completed analyses
  const fetchTodaysAnalyses = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiFetch('analysis-history')
      const { history } = response
      
      console.log('📊 Fetching today\'s analyses. Total history items:', history.length)
      
      // Filter for today's completed analyses
      const todaysAnalyses = history.filter(item => {
        const completedDate = item.processing_completed_at || item.created
        const isCompletedToday = isToday(item.processing_completed_at) || isToday(item.created)
        const isCompleted = ['success', 'partial_success'].includes(item.status)
        
        console.log('📅 Checking item:', {
          blob: item.result_blob_name,
          completed_at: item.processing_completed_at,
          created: item.created,
          status: item.status,
          isToday: isCompletedToday,
          isCompleted: isCompleted
        })
        
        return isCompletedToday && isCompleted
      })
      
      console.log('✅ Found today\'s completed analyses:', todaysAnalyses.length)
      
      // Transform to notification format
      const notifications = todaysAnalyses.map(item => ({
        id: item.result_blob_name,
        title: 'SOW Analysis Complete',
        body: formatDocName(item.source_blob),
        time: getTimeAgo(item.processing_completed_at || item.created),
        status: item.status,
        error_count: item.error_count || 0,
        result_blob_name: item.result_blob_name,
        read: viewedIds.has(item.result_blob_name)
      }))
      
      setItems(notifications)
    } catch (error) {
      console.error('Error fetching today\'s analyses:', error)
    } finally {
      setLoading(false)
    }
  }, [viewedIds])

  // Fetch on mount and refresh every 60 seconds (reduced from 30s to minimize server load)
  React.useEffect(() => {
    fetchTodaysAnalyses()
    const interval = setInterval(fetchTodaysAnalyses, 60000)
    return () => clearInterval(interval)
  }, [fetchTodaysAnalyses])

  const unreadCount = items.filter((i) => !i.read).length

  const handleMarkAllRead = () => {
    const allIds = new Set([...viewedIds, ...items.map(i => i.id)])
    setViewedIds(allIds)
    saveViewedIds(allIds)
    
    const updated = items.map((i) => ({ ...i, read: true }))
    setItems(updated)
    handleClose()
  }

  const handleNotificationClick = (notification) => {
    // Mark this notification as viewed
    const newViewedIds = new Set([...viewedIds, notification.id])
    setViewedIds(newViewedIds)
    saveViewedIds(newViewedIds)
    
    // Update the item's read status
    const updated = items.map((it) => (it.id === notification.id ? { ...it, read: true } : it))
    setItems(updated)
    
    handleClose()
    
    // Navigate to analysis detail page
    navigate(`/analysis-history/${encodeURIComponent(notification.result_blob_name)}`)
  }

  const handleVisitNotifications = () => {
    handleClose()
    navigate('/analysis-history')
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <IconButton aria-label="notifications" color="inherit" onClick={handleOpen} size="large">
        <Badge color="error" badgeContent={unreadCount} invisible={unreadCount === 0}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 320, maxWidth: '90vw' } }}
      >
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Today's Completed Analyses
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {items.length > 0 && (
              <Button size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
                Mark all read
              </Button>
            )}
            <Button size="small" onClick={handleVisitNotifications}>
              View all
            </Button>
          </Box>
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No analyses completed today
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 360, overflow: 'auto', py: 0 }}>
            {items.map((n) => (
              <ListItem
                key={n.id}
                id={`notification-${n.id}`}
                alignItems="flex-start"
                button
                onClick={() => handleNotificationClick(n)}
                sx={{
                  bgcolor: n.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    bgcolor: n.read ? 'action.hover' : 'action.selected'
                  },
                  borderLeft: n.read ? 'none' : '3px solid',
                  borderLeftColor: 'primary.main',
                  transition: 'all 0.2s'
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    sx={{ 
                      bgcolor: n.status === 'success' ? 'success.main' : 'warning.main',
                      width: 36,
                      height: 36
                    }}
                  >
                    {n.status === 'success' ? <CheckCircleIcon fontSize="small" /> : <WarningIcon fontSize="small" />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: n.read ? 400 : 600 }}>
                        {n.title}
                      </Typography>
                      {!n.read && (
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: 'primary.main' 
                          }} 
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography component="span" variant="body2" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
                        {n.body}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={n.status === 'success' ? 'Success' : 'Partial Success'}
                          size="small"
                          color={n.status === 'success' ? 'success' : 'warning'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        {n.error_count > 0 && (
                          <Chip 
                            label={`${n.error_count} error${n.error_count > 1 ? 's' : ''}`}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        <Typography component="span" variant="caption" color="text.secondary">
                          {n.time}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </>
  )
}
