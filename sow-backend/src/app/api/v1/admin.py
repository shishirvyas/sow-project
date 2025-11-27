"""
Admin API Endpoints
Provides endpoints for user management, role management, and audit logs.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr

from src.app.api.v1.auth import get_current_user
from src.app.services.auth_service import get_user_permissions
from src.app.services import admin_service
from src.app.core.errors import get_error_response


router = APIRouter()


# ==================== MODELS ====================

class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    is_active: bool = True


class UpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class AssignRolesRequest(BaseModel):
    role_ids: List[int]


class CreateRoleRequest(BaseModel):
    role_name: str
    role_description: str


class UpdateRoleRequest(BaseModel):
    role_name: Optional[str] = None
    role_description: Optional[str] = None


class AssignPermissionsRequest(BaseModel):
    permission_ids: List[int]


# ==================== USER MANAGEMENT ====================

@router.get("/users")
def get_users(
    include_deleted: bool = False,
    user_id: int = Depends(get_current_user)
):
    """
    Get all users with their roles.
    
    Requires: user.view permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'user.view' not in permissions:
        error = get_error_response("USR-111")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error
        )
    
    users = admin_service.get_all_users(include_deleted=include_deleted)
    return {"users": users}


@router.get("/users/{target_user_id}")
def get_user(
    target_user_id: int,
    user_id: int = Depends(get_current_user)
):
    """
    Get user by ID.
    
    Requires: user.view permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'user.view' not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: user.view required"
        )
    
    user = admin_service.get_user_by_id(target_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {target_user_id} not found"
        )
    
    return user


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    request: CreateUserRequest,
    req: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Create a new user.
    
    Requires: user.create permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'user.create' not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: user.create required"
        )
    
    try:
        new_user = admin_service.create_user(
            email=request.email,
            full_name=request.full_name,
            password=request.password,
            is_active=request.is_active
        )
        
        # Create audit log
        admin_service.create_audit_log(
            user_id=user_id,
            action="CREATE",
            resource_type="user",
            resource_id=str(new_user['user_id']),
            changes={
                "email": request.email,
                "full_name": request.full_name,
                "is_active": request.is_active
            },
            ip_address=req.client.host if req.client else None
        )
        
        return new_user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user: {str(e)}"
        )


@router.put("/users/{target_user_id}")
def update_user(
    target_user_id: int,
    request: UpdateUserRequest,
    req: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Update user information.
    
    Requires: user.edit permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'user.edit' not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: user.edit required"
        )
    
    try:
        updated_user = admin_service.update_user(
            user_id=target_user_id,
            email=request.email,
            full_name=request.full_name,
            password=request.password,
            is_active=request.is_active
        )
        
        # Create audit log
        changes = {}
        if request.email is not None:
            changes["email"] = request.email
        if request.full_name is not None:
            changes["full_name"] = request.full_name
        if request.password is not None:
            changes["password"] = "***REDACTED***"
        if request.is_active is not None:
            changes["is_active"] = request.is_active
            
        admin_service.create_audit_log(
            user_id=user_id,
            action="UPDATE",
            resource_type="user",
            resource_id=str(target_user_id),
            changes=changes,
            ip_address=req.client.host if req.client else None
        )
        
        return updated_user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update user: {str(e)}"
        )


@router.delete("/users/{target_user_id}")
def delete_user(
    target_user_id: int,
    req: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Soft delete a user (set is_active = FALSE).
    
    Requires: user.delete permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'user.delete' not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: user.delete required"
        )
    
    # Prevent self-deletion
    if user_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    try:
        admin_service.delete_user(target_user_id)
        
        # Create audit log
        admin_service.create_audit_log(
            user_id=user_id,
            action="DELETE",
            resource_type="user",
            resource_id=str(target_user_id),
            changes={"is_active": False},
            ip_address=req.client.host if req.client else None
        )
        
        return {"message": "User deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete user: {str(e)}"
        )


@router.post("/users/{target_user_id}/roles")
def assign_user_roles(
    target_user_id: int,
    request: AssignRolesRequest,
    req: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Assign roles to a user.
    
    Requires: role.assign permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'role.assign' not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: role.assign required"
        )
    
    try:
        admin_service.assign_user_roles(target_user_id, request.role_ids)
        
        # Create audit log
        admin_service.create_audit_log(
            user_id=user_id,
            action="UPDATE",
            resource_type="user_roles",
            resource_id=str(target_user_id),
            changes={"role_ids": request.role_ids},
            ip_address=req.client.host if req.client else None
        )
        
        return {"message": "Roles assigned successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to assign roles: {str(e)}"
        )


# ==================== ROLE MANAGEMENT ====================

@router.get("/roles")
def get_roles(user_id: int = Depends(get_current_user)):
    """
    Get all roles with permissions.
    
    Requires: role.view permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'role.view' not in permissions:
        error = get_error_response("USR-112")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error
        )
    
    roles = admin_service.get_all_roles()
    return {"roles": roles}


@router.get("/roles/{role_id}")
def get_role(
    role_id: int,
    user_id: int = Depends(get_current_user)
):
    """
    Get role by ID with permissions.
    
    Requires: role.view permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'role.view' not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: role.view required"
        )
    
    role = admin_service.get_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role {role_id} not found"
        )
    
    return role


@router.post("/roles", status_code=status.HTTP_201_CREATED)
def create_role(
    request: CreateRoleRequest,
    req: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Create a new role.
    
    Requires: role.create permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'role.create' not in permissions:
        error = get_error_response("USR-112", "You need role.create permission")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error
        )
    
    try:
        new_role = admin_service.create_role(
            role_name=request.role_name,
            role_description=request.role_description
        )
        
        # Create audit log
        admin_service.create_audit_log(
            user_id=user_id,
            action="CREATE",
            resource_type="role",
            resource_id=str(new_role['role_id']),
            changes={
                "role_name": request.role_name,
                "role_description": request.role_description
            },
            ip_address=req.client.host if req.client else None
        )
        
        return new_role
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create role: {str(e)}"
        )


@router.put("/roles/{role_id}")
def update_role(
    role_id: int,
    request: UpdateRoleRequest,
    req: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Update role information (cannot update system roles).
    
    Requires: role.edit permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'role.edit' not in permissions:
        error = get_error_response("USR-112", "You need role.edit permission")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error
        )
    
    try:
        updated_role = admin_service.update_role(
            role_id=role_id,
            role_name=request.role_name,
            role_description=request.role_description
        )
        
        # Create audit log
        changes = {}
        if request.role_name is not None:
            changes["role_name"] = request.role_name
        if request.role_description is not None:
            changes["role_description"] = request.role_description
            
        admin_service.create_audit_log(
            user_id=user_id,
            action="UPDATE",
            resource_type="role",
            resource_id=str(role_id),
            changes=changes,
            ip_address=req.client.host if req.client else None
        )
        
        return updated_role
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update role: {str(e)}"
        )


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    req: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Delete a role (cannot delete system roles).
    
    Requires: role.delete permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'role.delete' not in permissions:
        error = get_error_response("USR-112", "You need role.delete permission")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error
        )
    
    try:
        admin_service.delete_role(role_id)
        
        # Create audit log
        admin_service.create_audit_log(
            user_id=user_id,
            action="DELETE",
            resource_type="role",
            resource_id=str(role_id),
            changes={},
            ip_address=req.client.host if req.client else None
        )
        
        return {"message": "Role deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete role: {str(e)}"
        )


@router.post("/roles/{role_id}/permissions")
def assign_role_permissions(
    role_id: int,
    request: AssignPermissionsRequest,
    req: Request,
    user_id: int = Depends(get_current_user)
):
    """
    Assign permissions to a role.
    
    Requires: role.edit permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'role.edit' not in permissions:
        error = get_error_response("USR-112", "You need role.edit permission")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error
        )
    
    try:
        admin_service.assign_role_permissions(role_id, request.permission_ids)
        
        # Create audit log
        admin_service.create_audit_log(
            user_id=user_id,
            action="UPDATE",
            resource_type="role_permissions",
            resource_id=str(role_id),
            changes={"permission_ids": request.permission_ids},
            ip_address=req.client.host if req.client else None
        )
        
        return {"message": "Permissions assigned successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to assign permissions: {str(e)}"
        )


@router.get("/permissions")
def get_permissions(user_id: int = Depends(get_current_user)):
    """
    Get all available permissions.
    
    Requires: role.view permission
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'role.view' not in permissions:
        error = get_error_response("USR-112")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error
        )
    
    all_permissions = admin_service.get_all_permissions()
    return {"permissions": all_permissions}


# ==================== AUDIT LOGS ====================

@router.get("/audit-logs")
def get_audit_logs(
    user_filter_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user_id: int = Depends(get_current_user)
):
    """
    Get audit logs with optional filters.
    
    Requires: audit.view permission
    
    Query parameters:
    - user_filter_id: Filter by user ID
    - action: Filter by action (CREATE, UPDATE, DELETE)
    - resource_type: Filter by resource type (user, role, document, etc.)
    - date_from: Filter by date from (ISO format)
    - date_to: Filter by date to (ISO format)
    - limit: Maximum number of results (default 100)
    - offset: Offset for pagination (default 0)
    """
    # Check permission
    permissions = get_user_permissions(user_id)
    if 'audit.view' not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: audit.view required"
        )
    
    # Parse date strings
    date_from_dt = None
    date_to_dt = None
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_from format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
            )
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date_to format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
            )
    
    logs = admin_service.get_audit_logs(
        user_id=user_filter_id,
        action=action,
        resource_type=resource_type,
        date_from=date_from_dt,
        date_to=date_to_dt,
        limit=limit,
        offset=offset
    )
    
    return {
        "logs": logs,
        "limit": limit,
        "offset": offset,
        "count": len(logs)
    }
