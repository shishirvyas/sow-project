import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'

const Dashboard = lazy(() => import('src/pages/Dashboard'))
const SignIn = lazy(() => import('src/pages/SignIn'))
const Products = lazy(() => import('src/pages/Products'))
const Profile = lazy(() => import('src/pages/Profile'))
const Notifications = lazy(() => import('src/pages/Notifications'))
const Settings = lazy(() => import('src/pages/Settings'))
const AnalyzeDoc = lazy(() => import('src/pages/AnalyzeDoc'))
const AnalysisHistory = lazy(() => import('src/pages/AnalysisHistory'))
const AnalysisDetail = lazy(() => import('src/pages/AnalysisDetail'))

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
        <Route path="/analyze-doc" element={<AnalyzeDoc />} />
        <Route path="/analysis-history" element={<AnalysisHistory />} />
        <Route path="/analysis-history/:resultBlobName" element={<AnalysisDetail />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/products" element={<Products />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
