import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  ViewList as PromptsIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  AccountCircle as ProfileIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// Icon mapping for menu items
const iconMap = {
  dashboard: DashboardIcon,
  'analyze-doc': DescriptionIcon,
  'analysis-history': HistoryIcon,
  prompts: PromptsIcon,
  users: PeopleIcon,
  settings: SettingsIcon,
  profile: ProfileIcon,
};

const DynamicMenu = ({ collapsed, isMdUp, onItemClick }) => {
  const { menu } = useAuth();

  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName] || DashboardIcon;
    return <IconComponent />;
  };

  return (
    <List>
      {menu.map((item) => (
        <ListItem key={item.id} disablePadding>
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
                    transition:
                      'opacity 160ms ease, width 160ms ease',
                    width: isMdUp && collapsed ? 0 : 'auto',
                    overflow: 'hidden',
                  }}
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: 600,
                    color: 'primary.main',
                  }}
                />
              </ListItemButton>
            </span>
          </Tooltip>
        </ListItem>
      ))}
    </List>
  );
};

export default DynamicMenu;
