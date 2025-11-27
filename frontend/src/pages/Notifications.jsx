import React from 'react'
import MainLayout from '../layouts/MainLayout'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import { useLocation } from 'react-router-dom'
import * as notificationsService from 'src/services/notifications'

const STORAGE_KEY = 'skope360_notifications'

function loadNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch (err) {
    return []
  }
}

function saveNotifications(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    // ignore
  }
}

export default function Notifications() {
  const location = useLocation()
  const [items, setItems] = React.useState([])
  const [focusedId, setFocusedId] = React.useState(null)

  // initial load: try server, fallback to local storage
  React.useEffect(() => {
    let mounted = true
    notificationsService
      .fetchNotifications()
      .then((data) => {
        if (!mounted) return
        // ensure items have read property
        const normalized = data.map((it) => ({ read: false, ...it }))
        setItems(normalized)
        saveNotifications(normalized)
      })
      .catch(() => {
        const local = loadNotifications()
        setItems(local)
      })
    return () => {
      mounted = false
    }
  }, [])

  React.useEffect(() => {
    // parse ?id= or hash #id-<n>
    const sp = new URLSearchParams(location.search)
    const qid = sp.get('id')
    let id = null
    if (qid) id = parseInt(qid, 10)
    else if (location.hash && location.hash.startsWith('#id-')) id = parseInt(location.hash.replace('#id-', ''), 10)

    if (id) {
      setFocusedId(id)
      // try server-side mark-as-read, fallback to local
      notificationsService
        .markAsRead(id)
        .then(() => {
          const updated = items.map((it) => (it.id === id ? { ...it, read: true } : it))
          setItems(updated)
          saveNotifications(updated)
        })
        .catch(() => {
          const updated = items.map((it) => (it.id === id ? { ...it, read: true } : it))
          setItems(updated)
          saveNotifications(updated)
        })

      // scroll to element after render
      setTimeout(() => {
        const el = document.getElementById(`notification-${id}`)
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 120)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, location.hash])

  const handleMarkAll = () => {
    const updated = items.map((i) => ({ ...i, read: true }))
    setItems(updated)
    saveNotifications(updated)
  }

  return (
    <MainLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Notifications</Typography>
        <Button onClick={handleMarkAll} size="small" disabled={items.length === 0}>
          Mark all read
        </Button>
      </Box>

      <Card elevation={1}>
        <CardContent>
          {items.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No notifications. You're all caught up!
            </Typography>
          ) : (
            <List>
              {items.map((n) => (
                <React.Fragment key={n.id}>
                  <ListItem
                    id={`notification-${n.id}`}
                    alignItems="flex-start"
                    sx={
                      focusedId === n.id
                        ? { bgcolor: (theme) => theme.palette.action.selected }
                        : n.read
                        ? { opacity: 0.85 }
                        : {}
                    }
                  >
                    <ListItemAvatar>
                      <Avatar>{n.title.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={n.title} secondary={`${n.body} — ${n.time}`} />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  )
}
