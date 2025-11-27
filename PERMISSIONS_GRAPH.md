# Permissions Visualization Graph

## Overview
Interactive visualization dashboard showing the relationship between roles, permissions, and features in the system.

## Features

### 1. **Overview Mode**
- **Permissions Count per Role** - Bar chart showing how many permissions each role has
- **Permission Distribution by Category** - Pie chart showing the breakdown of permissions across categories (Admin, Analysis, Document, Profile, Prompt, System)
- **Roles Overview Panel** - Summary cards showing role details and permission counts

### 2. **Categories Mode**
- **Permission Coverage Radar Chart** - Spider/radar chart showing each role's coverage across different permission categories
- **Roles by Category Stacked Bar Chart** - Stacked bars showing how permissions are distributed across categories for each role

### 3. **Matrix Mode**
- **Permission Matrix Table** - Comprehensive table showing:
  - Rows: Individual permissions (grouped by category)
  - Columns: Roles
  - Cells: ✓ (has permission) or − (no permission)
  - Easy to see which roles have access to which specific features

## Summary Cards
- Total Roles count
- Total Permissions count
- Number of Categories
- Number of System Roles

## Access Control
- Requires `role.view` permission
- Shows friendly error message if user lacks permission
- Integrated with MainLayout for consistent UI

## Technical Implementation

### Frontend
- **Component**: `frontend/src/pages/admin/PermissionsGraph.jsx`
- **Route**: `/admin/permissions-graph`
- **Library**: Recharts for data visualization
- **Charts Used**:
  - Bar Chart (horizontal/vertical)
  - Pie Chart
  - Radar Chart
  - Custom HTML table for matrix view

### Backend
- **Endpoints**:
  - `GET /api/v1/admin/roles` - Fetches all roles with their permissions
  - `GET /api/v1/admin/permissions` - Fetches all available permissions
- **Permission Required**: `role.view`

### Menu Integration
- Menu item added to database: "Permissions Graph"
- Icon: BarChart
- Display order: After Audit Logs
- Visible to users with `role.view` permission

## Current Permission Structure

### Categories:
1. **admin** - User, role, and audit management
2. **analysis** - Document analysis operations
3. **document** - Document upload/download/view
4. **profile** - User profile management
5. **prompt** - AI prompt template management
6. **system** - Dashboard, settings, audit logs

### Roles:
- **Administrator** (admin) - Full system access
- **Manager** (manager) - User and analysis management
- **Analyst** (analyst) - Analysis and document operations
- **Viewer** (viewer) - Read-only access

## Usage

1. Navigate to **Admin → Permissions Graph** in the menu
2. Use the toggle buttons to switch between views:
   - Overview - High-level summary
   - Categories - Category-focused analysis
   - Matrix - Detailed permission mapping
3. Hover over charts for detailed tooltips
4. Use the matrix view to audit role permissions

## Benefits

- **Visual Understanding** - Quickly see permission distribution
- **Role Comparison** - Compare capabilities across roles
- **Gap Analysis** - Identify roles with too many/few permissions
- **Audit Trail** - Document current permission assignments
- **Decision Support** - Help determine appropriate role for users

## Future Enhancements

- Export visualizations as images
- Permission coverage heatmap
- Historical permission changes tracking
- Role similarity analysis
- Permission usage statistics
