import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import ThemeProvider from './theme/ThemeProvider'
import { AuthProvider } from './contexts/AuthContext'
import AppRoutes from './routes/AppRoutes'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}
