"""
Admin Service
Handles user management, role management, and audit log operations.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from src.app.db.client import get_db_connection, get_db_connection_dict, execute_query, execute_update
from src.app.services.auth_service import get_password_hash


# ==================== USER MANAGEMENT ====================

def get_all_users(include_deleted: bool = False) -> List[Dict[str, Any]]:
    """
    Get all users with their roles.
    
    Args:
        include_deleted: Include soft-deleted users
        
    Returns:
        List of user dictionaries with roles
    """
    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                u.id as user_id,
                u.email,
                u.full_name,
                u.is_active,
                u.created_at,
                u.last_login_at as last_login,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'role_id', r.id,
                            'role_name', r.name,
                            'role_description', r.description
                        )
                    ) FILTER (WHERE r.id IS NOT NULL),
                    '[]'::json
                ) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
        """
        
        if not include_deleted:
            query += " WHERE u.is_active = TRUE"
            
        query += """
            GROUP BY u.id, u.email, u.full_name, u.is_active, u.created_at, u.last_login_at
            ORDER BY u.created_at DESC
        """
        
        cursor.execute(query)
        users = cursor.fetchall()
        return users
        
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID with roles."""
    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                u.id as user_id,
                u.email,
                u.full_name,
                u.is_active,
                u.created_at,
                u.last_login_at as last_login,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'role_id', r.id,
                            'role_name', r.name,
                            'role_description', r.description
                        )
                    ) FILTER (WHERE r.id IS NOT NULL),
                    '[]'::json
                ) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = %s
            GROUP BY u.id
        """
        
        cursor.execute(query, (user_id,))
        user = cursor.fetchone()
        return user
        
    finally:
        conn.close()


def create_user(email: str, full_name: str, password: str, is_active: bool = True) -> Dict[str, Any]:
    """
    Create a new user.
    
    Args:
        email: User email
        full_name: User full name
        password: Plain text password (will be hashed)
        is_active: Whether user is active
        
    Returns:
        Created user dictionary
    """
    hashed_password = get_password_hash(password)
    
    query = """
        INSERT INTO users (email, full_name, password_hash, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING user_id, email, full_name, is_active, created_at
    """
    
    result = execute_update(
        query,
        (email, full_name, hashed_password, is_active, datetime.utcnow()),
        return_dict=True
    )
    
    return result


def update_user(
    user_id: int,
    email: Optional[str] = None,
    full_name: Optional[str] = None,
    password: Optional[str] = None,
    is_active: Optional[bool] = None
) -> Dict[str, Any]:
    """
    Update user information.
    
    Args:
        user_id: User ID to update
        email: New email (optional)
        full_name: New full name (optional)
        password: New password (optional, will be hashed)
        is_active: New active status (optional)
        
    Returns:
        Updated user dictionary
    """
    updates = []
    params = []
    
    if email is not None:
        updates.append("email = %s")
        params.append(email)
    
    if full_name is not None:
        updates.append("full_name = %s")
        params.append(full_name)
    
    if password is not None:
        updates.append("password_hash = %s")
        params.append(get_password_hash(password))
    
    if is_active is not None:
        updates.append("is_active = %s")
        params.append(is_active)
    
    if not updates:
        # No updates provided, just return current user
        return get_user_by_id(user_id)
    
    params.append(user_id)
    
    query = f"""
        UPDATE users
        SET {', '.join(updates)}
        WHERE user_id = %s
        RETURNING user_id, email, full_name, is_active, created_at, last_login
    """
    
    result = execute_update(query, tuple(params), return_dict=True)
    return result


def delete_user(user_id: int) -> bool:
    """
    Soft delete a user (set is_active = FALSE).
    
    Args:
        user_id: User ID to delete
        
    Returns:
        True if successful
    """
    query = "UPDATE users SET is_active = FALSE WHERE user_id = %s"
    execute_update(query, (user_id,))
    return True


def assign_user_roles(user_id: int, role_ids: List[int]) -> bool:
    """
    Assign roles to a user (replaces existing roles).
    
    Args:
        user_id: User ID
        role_ids: List of role IDs to assign
        
    Returns:
        True if successful
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Remove existing roles
        cursor.execute("DELETE FROM user_roles WHERE user_id = %s", (user_id,))
        
        # Add new roles
        if role_ids:
            for role_id in role_ids:
                cursor.execute(
                    "INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES (%s, %s, %s)",
                    (user_id, role_id, datetime.utcnow())
                )
        
        conn.commit()
        return True
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


# ==================== ROLE MANAGEMENT ====================

def get_all_roles() -> List[Dict[str, Any]]:
    """Get all roles with their permissions."""
    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                r.id as role_id,
                r.name as role_name,
                r.description as role_description,
                r.is_system_role,
                r.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'permission_id', p.id,
                            'permission_code', p.code,
                            'permission_name', p.name,
                            'permission_category', p.category
                        )
                    ) FILTER (WHERE p.id IS NOT NULL),
                    '[]'::json
                ) as permissions
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            GROUP BY r.id, r.name, r.description, r.is_system_role, r.created_at
            ORDER BY r.name
        """
        
        cursor.execute(query)
        roles = cursor.fetchall()
        return roles
        
    finally:
        conn.close()


def get_role_by_id(role_id: int) -> Optional[Dict[str, Any]]:
    """Get role by ID with permissions."""
    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                r.id as role_id,
                r.name as role_name,
                r.description as role_description,
                r.is_system_role,
                r.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'permission_id', p.id,
                            'permission_code', p.code,
                            'permission_name', p.name,
                            'permission_category', p.category
                        )
                    ) FILTER (WHERE p.id IS NOT NULL),
                    '[]'::json
                ) as permissions
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            WHERE r.id = %s
            GROUP BY r.id, r.name, r.description, r.is_system_role, r.created_at
        """
        
        cursor.execute(query, (role_id,))
        role = cursor.fetchone()
        return role
        
    finally:
        conn.close()


def create_role(role_name: str, role_description: str) -> Dict[str, Any]:
    """
    Create a new role.
    
    Args:
        role_name: Role name
        role_description: Role description
        
    Returns:
        Created role dictionary
    """
    query = """
        INSERT INTO roles (name, display_name, description, is_system_role, created_at)
        VALUES (%s, %s, %s, FALSE, %s)
        RETURNING id as role_id, name as role_name, description as role_description, is_system_role, created_at
    """
    
    result = execute_update(
        query,
        (role_name, role_name, role_description, datetime.utcnow()),
        return_dict=True
    )
    
    return result


def update_role(role_id: int, role_name: Optional[str] = None, role_description: Optional[str] = None) -> Dict[str, Any]:
    """
    Update role information (cannot update system roles).
    
    Args:
        role_id: Role ID to update
        role_name: New role name (optional)
        role_description: New role description (optional)
        
    Returns:
        Updated role dictionary
    """
    updates = []
    params = []
    
    if role_name is not None:
        updates.append("name = %s")
        updates.append("display_name = %s")
        params.append(role_name)
        params.append(role_name)
    
    if role_description is not None:
        updates.append("description = %s")
        params.append(role_description)
    
    if not updates:
        return get_role_by_id(role_id)
    
    params.append(role_id)
    
    query = f"""
        UPDATE roles
        SET {', '.join(updates)}
        WHERE id = %s AND is_system_role = FALSE
        RETURNING id as role_id, name as role_name, description as role_description, is_system_role, created_at
    """
    
    result = execute_update(query, tuple(params), return_dict=True)
    return result


def delete_role(role_id: int) -> bool:
    """
    Delete a role (cannot delete system roles).
    
    Args:
        role_id: Role ID to delete
        
    Returns:
        True if successful
    """
    query = "DELETE FROM roles WHERE id = %s AND is_system_role = FALSE"
    execute_update(query, (role_id,))
    return True


def assign_role_permissions(role_id: int, permission_ids: List[int]) -> bool:
    """
    Assign permissions to a role (replaces existing permissions).
    
    Args:
        role_id: Role ID
        permission_ids: List of permission IDs to assign
        
    Returns:
        True if successful
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Remove existing permissions
        cursor.execute("DELETE FROM role_permissions WHERE role_id = %s", (role_id,))
        
        # Add new permissions
        if permission_ids:
            for permission_id in permission_ids:
                cursor.execute(
                    "INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES (%s, %s, %s)",
                    (role_id, permission_id, datetime.utcnow())
                )
        
        conn.commit()
        return True
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def get_all_permissions() -> List[Dict[str, Any]]:
    """Get all available permissions."""
    query = """
        SELECT 
            id as permission_id,
            code as permission_code,
            name as permission_name,
            description as permission_description,
            category as permission_category,
            created_at
        FROM permissions
        ORDER BY category, code
    """
    
    return execute_query(query, fetch_all=True)


# ==================== AUDIT LOG ====================

def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get audit logs with optional filters.
    
    Args:
        user_id: Filter by user ID
        action: Filter by action (e.g., 'CREATE', 'UPDATE', 'DELETE')
        resource_type: Filter by resource type (e.g., 'user', 'role', 'document')
        date_from: Filter by date from
        date_to: Filter by date to
        limit: Maximum number of results
        offset: Offset for pagination
        
    Returns:
        List of audit log dictionaries
    """
    conn = get_db_connection_dict()
    try:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                al.log_id,
                al.user_id,
                u.email as user_email,
                u.full_name as user_name,
                al.action,
                al.resource_type,
                al.resource_id,
                al.changes,
                al.ip_address,
                al.created_at
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        """
        
        params = []
        
        if user_id is not None:
            query += " AND al.user_id = %s"
            params.append(user_id)
        
        if action is not None:
            query += " AND al.action = %s"
            params.append(action)
        
        if resource_type is not None:
            query += " AND al.resource_type = %s"
            params.append(resource_type)
        
        if date_from is not None:
            query += " AND al.created_at >= %s"
            params.append(date_from)
        
        if date_to is not None:
            query += " AND al.created_at <= %s"
            params.append(date_to)
        
        query += " ORDER BY al.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, tuple(params))
        logs = cursor.fetchall()
        return logs
        
    finally:
        conn.close()


def create_audit_log(
    user_id: int,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create an audit log entry.
    
    Args:
        user_id: User who performed the action
        action: Action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
        resource_type: Type of resource (e.g., 'user', 'role', 'document')
        resource_id: ID of the resource
        changes: Dictionary of changes made
        ip_address: IP address of the user
        
    Returns:
        Created audit log dictionary
    """
    import json
    
    query = """
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, changes, ip_address, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING log_id, user_id, action, resource_type, resource_id, changes, ip_address, created_at
    """
    
    changes_json = json.dumps(changes) if changes else None
    
    result = execute_update(
        query,
        (user_id, action, resource_type, resource_id, changes_json, ip_address, datetime.utcnow()),
        return_dict=True
    )
    
    return result
