import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'

const Dashboard = lazy(() => import('src/pages/Dashboard'))
const SignIn = lazy(() => import('src/pages/SignIn'))
const Products = lazy(() => import('src/pages/Products'))

const Loading = () => (
  <Box sx={{ width: '100%', mt: 6 }}>
    <LinearProgress />
  </Box>
)

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/products" element={<Products />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
