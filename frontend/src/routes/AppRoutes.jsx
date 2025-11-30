import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import ProtectedRoute from '../components/Auth/ProtectedRoute'

const Dashboard = lazy(() => import('src/pages/Dashboard'))
const Login = lazy(() => import('src/components/Auth/Login'))
const Unauthorized = lazy(() => import('src/pages/Unauthorized'))
const SignIn = lazy(() => import('src/pages/SignIn'))
const Products = lazy(() => import('src/pages/Products'))
const Profile = lazy(() => import('src/pages/Profile'))
const Notifications = lazy(() => import('src/pages/Notifications'))
const Settings = lazy(() => import('src/pages/Settings'))
const AnalyzeDoc = lazy(() => import('src/pages/AnalyzeDoc'))
const AnalysisHistory = lazy(() => import('src/pages/AnalysisHistory'))
const AnalysisDetail = lazy(() => import('src/pages/AnalysisDetail'))
const Users = lazy(() => import('src/pages/admin/Users'))
const Roles = lazy(() => import('src/pages/admin/Roles'))
const AuditLogs = lazy(() => import('src/pages/admin/AuditLogs'))
const PermissionsGraph = lazy(() => import('src/pages/admin/PermissionsGraph'))
const Permissions = lazy(() => import('src/pages/admin/Permissions'))
const Prompts = lazy(() => import('src/pages/Prompts'))
const PromptsDebug = lazy(() => import('src/pages/PromptsDebug'))

const Loading = () => (
  <Box sx={{ width: '100%', mt: 6 }}>
    <LinearProgress />
  </Box>
)

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Protected routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analyze-doc" 
          element={
            <ProtectedRoute requiredPermission="document.upload">
              <AnalyzeDoc />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analysis-history" 
          element={
            <ProtectedRoute requiredPermission="analysis.view">
              <AnalysisHistory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analysis-history/:resultBlobName" 
          element={
            <ProtectedRoute requiredPermission="analysis.view">
              <AnalysisDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sign-in" 
          element={
            <ProtectedRoute>
              <SignIn />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/products" 
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute requiredPermission="system.settings">
              <Settings />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin routes */}
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute requiredPermission="user.view">
              <Users />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/roles" 
          element={
            <ProtectedRoute requiredPermission="role.view">
              <Roles />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/permissions" 
          element={
            <ProtectedRoute requiredPermission="role.view">
              <Permissions />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/audit-logs" 
          element={
            <ProtectedRoute requiredPermission="audit.view">
              <AuditLogs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/permissions-graph" 
          element={
            <ProtectedRoute requiredPermission="role.view">
              <PermissionsGraph />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/prompts" 
          element={
            <ProtectedRoute requiredPermission="prompt.view">
              <Prompts />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/prompts-debug" 
          element={
            <ProtectedRoute requiredPermission="prompt.view">
              <PromptsDebug />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
