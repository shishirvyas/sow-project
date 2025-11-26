const API_BASE = '/api/v1/notifications'

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function fetchNotifications() {
  try {
    const data = await fetchJson(API_BASE)
    return data.notifications || []
  } catch (err) {
    throw err
  }
}

export async function createNotification(title, body) {
  try {
    const data = await fetchJson(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    })
    return data.notification
  } catch (err) {
    throw err
  }
}

export async function markAsRead(id) {
  try {
    const url = `${API_BASE}/${id}/read`
    const data = await fetchJson(url, { method: 'PUT' })
    return data
  } catch (err) {
    throw err
  }
}

export async function markAllRead() {
  try {
    const url = `${API_BASE}/mark_all_read`
    return await fetchJson(url, { method: 'PUT' })
  } catch (err) {
    throw err
  }
}

export default {
  fetchNotifications,
  createNotification,
  markAsRead,
  markAllRead,
}
