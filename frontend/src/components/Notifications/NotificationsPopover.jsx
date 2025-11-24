import React from 'react'
import { useNavigate } from 'react-router-dom'
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

const STORAGE_KEY = 'skope_notifications'

const sampleNotifications = [
  { id: 1, title: 'New comment on SOW draft', body: 'Alice left a comment', time: '2m ago', avatar: '', read: false },
  { id: 2, title: 'Build succeeded', body: 'CI build completed', time: '1h ago', avatar: '', read: false },
  { id: 3, title: 'New user registered', body: 'John Doe joined', time: '3h ago', avatar: '', read: false },
]

function loadNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return sampleNotifications
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return sampleNotifications
    return parsed
  } catch (err) {
    return sampleNotifications
  }
}

function saveNotifications(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    // ignore
  }
}

export default function NotificationsPopover() {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const [items, setItems] = React.useState(() => loadNotifications())

  const unreadCount = items.filter((i) => !i.read).length

  const navigate = useNavigate()

  const handleOpen = (e) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const handleMarkAllRead = () => {
    const updated = items.map((i) => ({ ...i, read: true }))
    setItems(updated)
    saveNotifications(updated)
    handleClose()
  }

  const handleVisitNotifications = () => {
    handleClose()
    navigate('/notifications')
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
        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={handleMarkAllRead} disabled={items.length === 0}>
              Mark all read
            </Button>
            <Button size="small" onClick={handleVisitNotifications}>
              View all
            </Button>
          </Box>
        </Box>
        <Divider />
        {items.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              You're all caught up
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
            {items.map((n) => (
              <ListItem
                key={n.id}
                id={`notification-${n.id}`}
                alignItems="flex-start"
                button
                onClick={() => {
                  // mark as read, persist, then navigate to notifications page with id
                  const updated = items.map((it) => (it.id === n.id ? { ...it, read: true } : it))
                  setItems(updated)
                  saveNotifications(updated)
                  handleClose()
                  navigate(`/notifications?id=${n.id}`)
                }}
              >
                <ListItemAvatar>
                  <Avatar alt={n.title}>{n.title.charAt(0)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={n.title}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {n.body}
                      </Typography>
                      {' — '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        {n.time}
                      </Typography>
                    </>
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
