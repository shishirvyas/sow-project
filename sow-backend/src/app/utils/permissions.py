"""
Permission checking utilities and decorators for API endpoints
"""
from functools import wraps
from fastapi import HTTPException, status, Depends
from src.app.api.v1.auth import get_current_user
from src.app.services.auth_service import get_user_permissions

def require_permission(permission_code: str):
    """
    Decorator to require a specific permission for an endpoint
    
    Usage:
        @router.get("/protected")
        @require_permission("document.upload")
        async def protected_endpoint(user_id: int = Depends(get_current_user)):
            return {"message": "Access granted"}
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user_id: int = Depends(get_current_user), **kwargs):
            permissions = get_user_permissions(user_id)
            
            if permission_code not in permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission required: {permission_code}"
                )
            
            return await func(*args, user_id=user_id, **kwargs)
        return wrapper
    return decorator

def require_any_permission(*permission_codes: str):
    """
    Decorator to require ANY of the specified permissions
    
    Usage:
        @router.get("/protected")
        @require_any_permission("document.upload", "document.view")
        async def protected_endpoint(user_id: int = Depends(get_current_user)):
            return {"message": "Access granted"}
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user_id: int = Depends(get_current_user), **kwargs):
            permissions = get_user_permissions(user_id)
            
            if not any(perm in permissions for perm in permission_codes):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"One of these permissions required: {', '.join(permission_codes)}"
                )
            
            return await func(*args, user_id=user_id, **kwargs)
        return wrapper
    return decorator

def require_all_permissions(*permission_codes: str):
    """
    Decorator to require ALL of the specified permissions
    
    Usage:
        @router.get("/protected")
        @require_all_permissions("document.upload", "document.export")
        async def protected_endpoint(user_id: int = Depends(get_current_user)):
            return {"message": "Access granted"}
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user_id: int = Depends(get_current_user), **kwargs):
            permissions = get_user_permissions(user_id)
            
            if not all(perm in permissions for perm in permission_codes):
                missing = [p for p in permission_codes if p not in permissions]
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permissions: {', '.join(missing)}"
                )
            
            return await func(*args, user_id=user_id, **kwargs)
        return wrapper
    return decorator

def user_has_permission(user_id: int, permission_code: str) -> bool:
    """
    Check if a user has a specific permission
    
    Usage:
        if user_has_permission(user_id, "document.delete"):
            # perform action
    """
    permissions = get_user_permissions(user_id)
    return permission_code in permissions

def user_has_any_permission(user_id: int, *permission_codes: str) -> bool:
    """Check if user has any of the specified permissions"""
    permissions = get_user_permissions(user_id)
    return any(perm in permissions for perm in permission_codes)

def user_has_all_permissions(user_id: int, *permission_codes: str) -> bool:
    """Check if user has all of the specified permissions"""
    permissions = get_user_permissions(user_id)
    return all(perm in permissions for perm in permission_codes)
