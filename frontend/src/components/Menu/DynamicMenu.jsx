import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
  Divider,
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  ViewList as PromptsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  AccountCircle as ProfileIcon,
  AdminPanelSettings as RolesIcon,
  Article as AuditIcon,
  BarChart as ChartIcon,
  EditNote as EditNoteIcon,
  Public as CountryIcon,
  Category as CategoryIcon,
  AccountTree as SubCategoryIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// Icon mapping for menu items
const iconMap = {
  DashboardIcon,
  DescriptionIcon,
  HistoryIcon,
  PromptsIcon,
  EditNoteIcon,
  PeopleIcon,
  SettingsIcon,
  ProfileIcon,
  RolesIcon,
  AuditIcon,
  ChartIcon,
  CountryIcon,
  CategoryIcon,
  SubCategoryIcon,
  // Legacy mappings for backward compatibility
  dashboard: DashboardIcon,
  'analyze-doc': DescriptionIcon,
  'analysis-history': HistoryIcon,
  prompts: EditNoteIcon,
  countries: CountryIcon,
  categories: CategoryIcon,
  'sub-categories': SubCategoryIcon,
  users: PeopleIcon,
  'user-management': PeopleIcon,
  roles: RolesIcon,
  'admin-roles': RolesIcon,
  'audit-logs': AuditIcon,
  'admin-audit': AuditIcon,
  'permissions-graph': ChartIcon,
  'chart-bar': ChartIcon,
  settings: SettingsIcon,
  profile: ProfileIcon,
};

const DynamicMenu = ({ collapsed, isMdUp, onItemClick }) => {
  const { menu } = useAuth();

  const getIcon = (iconName) => {
    if (!iconName) return <DashboardIcon />;
    const IconComponent = iconMap[iconName] || DashboardIcon;
    return <IconComponent />;
  };

  const renderMenuItem = (item, isGrouped = false) => (
    <ListItem key={item.id || item.key} disablePadding>
      <Tooltip
        title={item.label}
        placement="right"
        disableHoverListener={!isMdUp || !collapsed}
        enterDelay={100}
        leaveDelay={200}
        enterNextDelay={100}
      >
        <span style={{ width: '100%' }}>
          <ListItemButton
            component={RouterLink}
            to={item.path}
            onClick={onItemClick}
            sx={{
              justifyContent: isMdUp && collapsed ? 'center' : 'flex-start',
              px: 2,
              pl: isGrouped && !(isMdUp && collapsed) ? 4 : 2,
              '&:hover': {
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(45,128,254,0.12)'
                    : 'rgba(32,101,209,0.08)',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: isMdUp && collapsed ? 0 : 2,
                justifyContent: 'center',
                color: 'primary.main',
              }}
            >
              {getIcon(item.icon)}
            </ListItemIcon>
            <ListItemText
              sx={{
                opacity: isMdUp && collapsed ? 0 : 1,
                transition: 'opacity 160ms ease, width 160ms ease',
                width: isMdUp && collapsed ? 0 : 'auto',
                overflow: 'hidden',
              }}
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: isGrouped ? 500 : 600,
                fontSize: isGrouped ? '0.9rem' : '0.95rem',
                color: 'primary.main',
              }}
            />
          </ListItemButton>
        </span>
      </Tooltip>
    </ListItem>
  );

  const renderGroup = (group, index) => {
    // Only show group if it has items
    if (!group.items || group.items.length === 0) {
      return null;
    }

    return (
      <Box key={`group-${group.group_name}-${index}`}>
        {index > 0 && <Divider sx={{ my: 1 }} />}
        
        {!(isMdUp && collapsed) && (
          <ListSubheader
            sx={{
              bgcolor: 'transparent',
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.75rem',
              lineHeight: '2.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              px: 2,
            }}
          >
            {group.group_name}
          </ListSubheader>
        )}
        
        {group.items.map((item) => renderMenuItem(item, true))}
      </Box>
    );
  };

  return (
    <List
      sx={{
        '& .MuiListSubheader-root': {
          lineHeight: '2.5rem',
        },
      }}
    >
      {menu.map((item, index) => {
        // Check if item is a group (has group_name and items)
        if (item.group_name && item.items) {
          return renderGroup(item, index);
        }
        // Render ungrouped item
        return renderMenuItem(item, false);
      })}
    </List>
  );
};

export default DynamicMenu;
