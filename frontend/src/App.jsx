import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import ThemeProvider from './theme/ThemeProvider'
import AppRoutes from './routes/AppRoutes'

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  )
}
