import React, { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import MainLayout from '../layouts/MainLayout'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState({})
  const [open, setOpen] = useState(false)

  function validate() {
    const e = {}
    if (!email) e.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    // fake sign-in flow: show success snackbar
    setOpen(true)
  }

  return (
    <MainLayout>
      <Paper sx={{ maxWidth: 480, mx: 'auto', p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Sign in
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          {errors.general && <Alert severity="error">{errors.general}</Alert>}

          <TextField
            label="Email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email}
            autoComplete="email"
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password}
            autoComplete="current-password"
          />

          <FormControlLabel
            control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
            label="Remember me"
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="text" onClick={() => { setEmail(''); setPassword('') }}>
              Reset
            </Button>
            <Button type="submit" variant="contained">
              Sign in
            </Button>
          </Box>
        </Box>

        <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
          <Alert severity="success" sx={{ width: '100%' }} onClose={() => setOpen(false)}>
            Signed in successfully (demo)
          </Alert>
        </Snackbar>
      </Paper>
    </MainLayout>
  )
}
