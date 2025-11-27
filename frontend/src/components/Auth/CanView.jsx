import { useAuth } from '../../contexts/AuthContext';

/**
 * Component to conditionally render children based on permissions
 * 
 * Usage:
 * <CanView permission="document.upload">
 *   <Button>Upload Document</Button>
 * </CanView>
 * 
 * <CanView anyPermissions={["document.upload", "document.edit"]}>
 *   <Button>Edit</Button>
 * </CanView>
 * 
 * <CanView allPermissions={["document.export", "analysis.export"]}>
 *   <Button>Export All</Button>
 * </CanView>
 */
const CanView = ({ 
  children, 
  permission, 
  anyPermissions, 
  allPermissions,
  fallback = null 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermissions) {
    hasAccess = hasAnyPermission(...anyPermissions);
  } else if (allPermissions) {
    hasAccess = hasAllPermissions(...allPermissions);
  }

  return hasAccess ? children : fallback;
};

export default CanView;
