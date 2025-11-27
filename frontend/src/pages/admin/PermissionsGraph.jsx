import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Divider
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap
} from 'recharts';
import {
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { apiFetch } from '../../config/api';
import MainLayout from '../../layouts/MainLayout';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

export default function PermissionsGraph() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load roles with permissions
      const rolesResponse = await apiFetch('/admin/roles', { method: 'GET' });
      if (!rolesResponse.ok) {
        const errorData = await rolesResponse.json();
        setError(errorData.detail?.user_message || 'Failed to load data');
        return;
      }
      const rolesData = await rolesResponse.json();
      setRoles(rolesData.roles);
      
      // Load all permissions
      const permsResponse = await apiFetch('/admin/permissions', { method: 'GET' });
      if (!permsResponse.ok) {
        const errorData = await permsResponse.json();
        setError(errorData.detail?.user_message || 'Failed to load permissions');
        return;
      }
      const permsData = await permsResponse.json();
      setPermissions(permsData.permissions);
      
      setError('');
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for visualizations
  const getRolePermissionCounts = () => {
    return roles.map(role => ({
      name: role.role_name,
      permissions: role.permissions.length,
      isSystem: role.is_system_role
    }));
  };

  const getCategoryDistribution = () => {
    const categoryCount = {};
    permissions.forEach(perm => {
      const category = perm.permission_category || 'Other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    return Object.entries(categoryCount).map(([name, value]) => ({
      name,
      value
    }));
  };

  const getRolesByCategoryData = () => {
    const categories = {};
    
    roles.forEach(role => {
      role.permissions.forEach(perm => {
        const category = perm.permission_category || 'Other';
        if (!categories[category]) {
          categories[category] = {};
        }
        categories[category][role.role_name] = (categories[category][role.role_name] || 0) + 1;
      });
    });

    return Object.entries(categories).map(([category, roleCounts]) => ({
      category,
      ...roleCounts
    }));
  };

  const getRadarChartData = () => {
    const categories = {};
    
    // Initialize categories
    permissions.forEach(perm => {
      const category = perm.permission_category || 'Other';
      if (!categories[category]) {
        categories[category] = { category, fullMark: 0 };
        roles.forEach(role => {
          categories[category][role.role_name] = 0;
        });
      }
    });

    // Count permissions per category per role
    roles.forEach(role => {
      role.permissions.forEach(perm => {
        const category = perm.permission_category || 'Other';
        categories[category][role.role_name]++;
        categories[category].fullMark = Math.max(
          categories[category].fullMark,
          categories[category][role.role_name]
        );
      });
    });

    return Object.values(categories);
  };

  const getTreemapData = () => {
    const categoryData = {};
    
    roles.forEach(role => {
      role.permissions.forEach(perm => {
        const category = perm.permission_category || 'Other';
        if (!categoryData[category]) {
          categoryData[category] = { name: category, children: [] };
        }
        
        const existing = categoryData[category].children.find(c => c.name === role.role_name);
        if (existing) {
          existing.size++;
        } else {
          categoryData[category].children.push({
            name: role.role_name,
            size: 1
          });
        }
      });
    });

    return Object.values(categoryData);
  };

  const getPermissionMatrix = () => {
    const matrix = {};
    
    permissions.forEach(perm => {
      const category = perm.permission_category || 'Other';
      if (!matrix[category]) {
        matrix[category] = [];
      }
      
      const permData = {
        code: perm.permission_code,
        name: perm.permission_name,
        roles: []
      };
      
      roles.forEach(role => {
        const hasPermission = role.permissions.some(p => p.permission_id === perm.permission_id);
        permData.roles.push({
          role: role.role_name,
          hasPermission
        });
      });
      
      matrix[category].push(permData);
    });
    
    return matrix;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box p={3}>
          <Typography variant="h4" mb={3}>Permissions Visualization</Typography>
          <Alert severity="error">{error}</Alert>
          <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Access Restricted
            </Typography>
            <Typography color="text.secondary">
              You don't have permission to view this data.
            </Typography>
          </Paper>
        </Box>
      </MainLayout>
    );
  }

  const rolePermissionCounts = getRolePermissionCounts();
  const categoryDistribution = getCategoryDistribution();
  const rolesByCategoryData = getRolesByCategoryData();
  const radarData = getRadarChartData();
  const treemapData = getTreemapData();
  const permissionMatrix = getPermissionMatrix();

  return (
    <MainLayout>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4">Permissions Visualization</Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Interactive visualization of roles, permissions, and their relationships
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="overview">Overview</ToggleButton>
            <ToggleButton value="categories">Categories</ToggleButton>
            <ToggleButton value="matrix">Matrix</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AdminIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{roles.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Roles
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <SecurityIcon color="success" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{permissions.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Permissions
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <PeopleIcon color="info" fontSize="large" />
                  <Box>
                    <Typography variant="h4">{categoryDistribution.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Categories
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AssignmentIcon color="warning" fontSize="large" />
                  <Box>
                    <Typography variant="h4">
                      {roles.filter(r => r.is_system_role).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      System Roles
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {viewMode === 'overview' && (
          <>
            {/* Permissions per Role - Bar Chart */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Permissions Count per Role
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rolePermissionCounts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="permissions" fill="#8884d8" name="Number of Permissions" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Grid container spacing={3}>
              {/* Category Distribution - Pie Chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Permission Distribution by Category
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Roles Summary */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Roles Overview
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {roles.map(role => (
                      <Box key={role.role_id} sx={{ mb: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">
                            {role.role_name}
                            {role.is_system_role && (
                              <Chip label="System" size="small" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Chip 
                            label={`${role.permissions.length} perms`} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {role.role_description}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}

        {viewMode === 'categories' && (
          <>
            {/* Radar Chart */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Permission Coverage by Category (Radar View)
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis />
                  {roles.map((role, index) => (
                    <Radar
                      key={role.role_id}
                      name={role.role_name}
                      dataKey={role.role_name}
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.6}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>

            {/* Stacked Bar Chart by Category */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Roles by Permission Category
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={rolesByCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {roles.map((role, index) => (
                    <Bar
                      key={role.role_id}
                      dataKey={role.role_name}
                      stackId="a"
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </>
        )}

        {viewMode === 'matrix' && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Permission Matrix (Feature → Role Mapping)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Shows which roles have access to which permissions
            </Typography>
            
            {Object.entries(permissionMatrix).map(([category, perms]) => (
              <Box key={category} mb={4}>
                <Typography variant="h6" color="primary" gutterBottom>
                  {category}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #ddd' }}>
                          Permission
                        </th>
                        {roles.map(role => (
                          <th
                            key={role.role_id}
                            style={{
                              textAlign: 'center',
                              padding: '12px',
                              borderBottom: '2px solid #ddd',
                              fontSize: '0.875rem'
                            }}
                          >
                            {role.role_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((perm, index) => (
                        <tr key={perm.code} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                          <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                            <Typography variant="body2" fontWeight="bold">
                              {perm.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {perm.code}
                            </Typography>
                          </td>
                          {perm.roles.map((roleData, idx) => (
                            <td
                              key={idx}
                              style={{
                                textAlign: 'center',
                                padding: '12px',
                                borderBottom: '1px solid #eee'
                              }}
                            >
                              {roleData.hasPermission ? (
                                <Chip label="✓" size="small" color="success" />
                              ) : (
                                <Chip label="−" size="small" color="default" variant="outlined" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Box>
            ))}
          </Paper>
        )}
      </Box>
    </MainLayout>
  );
}
