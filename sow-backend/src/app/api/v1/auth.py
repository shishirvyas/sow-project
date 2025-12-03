"""
Authentication endpoints for login, logout, token refresh, and user profile
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import timedelta

from src.app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_user_permissions,
    get_user_menu,
    get_user_roles,
    get_user_by_id
)
from src.app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Pydantic models for request/response
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class RefreshRequest(BaseModel):
    refresh_token: str

class UserProfileResponse(BaseModel):
    user: dict
    permissions: list[str]
    menu: list[dict]
    roles: list[dict]

# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to extract and verify JWT token from Authorization header
    Returns user_id if valid, raises HTTPException otherwise
    """
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return int(user_id)

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return access + refresh tokens
    
    Test credentials (password: password123):
    - admin@skope.ai - Full admin access
    - manager@skope.ai - Management features
    - analyst@skope.ai - Analysis only
    - viewer@skope.ai - Read-only access
    """
    logger.info(f"🔐 LOGIN REQUEST received for: {request.email}")
    
    try:
        user = authenticate_user(request.email, request.password)
        
        if not user:
            logger.warning(f"❌ LOGIN FAILED - Authentication failed for: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create tokens
        logger.info(f"🎫 Generating tokens for user: {request.email} (ID: {user['id']})")
        access_token = create_access_token(data={"sub": str(user['id']), "email": user['email']})
        refresh_token = create_refresh_token(data={"sub": str(user['id']), "email": user['email']})
        
        logger.info(f"✅ LOGIN SUCCESS for: {request.email} (User ID: {user['id']}, Name: {user['full_name']})")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user
        }
    except HTTPException:
        # Re-raise HTTPException as-is
        raise
    except Exception as e:
        logger.error(f"❌ LOGIN ERROR - Unexpected error for {request.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@router.post("/refresh")
async def refresh_token(request: RefreshRequest):
    """
    Refresh access token using a valid refresh token
    """
    payload = decode_token(request.refresh_token)
    
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    email = payload.get("email")
    
    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create new access token
    access_token = create_access_token(data={"sub": user_id, "email": email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(user_id: int = Depends(get_current_user)):
    """
    Logout user (client should discard tokens)
    In a production system, you might want to blacklist tokens here
    """
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(user_id: int = Depends(get_current_user)):
    """
    Get current user profile with permissions, menu, and roles
    This is the main endpoint for frontend to fetch user context
    """
    user = get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get user's permissions, menu, and roles
    permissions = get_user_permissions(user_id)
    menu = get_user_menu(user_id)
    roles = get_user_roles(user_id)
    
    return {
        "user": user,
        "permissions": permissions,
        "menu": menu,
        "roles": roles
    }

@router.get("/permissions")
async def get_my_permissions(user_id: int = Depends(get_current_user)):
    """
    Get list of permission codes for current user
    """
    permissions = get_user_permissions(user_id)
    return {"permissions": permissions}

@router.get("/menu")
async def get_my_menu(user_id: int = Depends(get_current_user)):
    """
    Get menu items accessible to current user
    """
    menu = get_user_menu(user_id)
    return {"menu": menu}

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

@router.put("/profile")
async def update_profile(
    profile: UpdateProfileRequest,
    user_id: int = Depends(get_current_user)
):
    """
    Update current user's profile information
    """
    import psycopg2
    from src.app.db.client import get_db_connection_dict
    
    try:
        conn = get_db_connection_dict()
        cursor = conn.cursor()
        
        # Build update query dynamically based on provided fields
        updates = []
        params = []
        
        if profile.full_name is not None:
            updates.append("full_name = %s")
            params.append(profile.full_name)
        
        if profile.phone is not None:
            updates.append("phone = %s")
            params.append(profile.phone)
        
        if profile.location is not None:
            updates.append("location = %s")
            params.append(profile.location)
        
        if profile.bio is not None:
            updates.append("bio = %s")
            params.append(profile.bio)
        
        if profile.job_title is not None:
            updates.append("job_title = %s")
            params.append(profile.job_title)
        
        if profile.department is not None:
            updates.append("department = %s")
            params.append(profile.department)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        params.append(user_id)
        
        query = f"""
            UPDATE users 
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id, email, full_name, phone, location, bio, job_title, department
        """
        
        cursor.execute(query, params)
        updated_user = cursor.fetchone()
        conn.commit()
        
        cursor.close()
        conn.close()
        
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Profile updated for user {user_id}")
        
        return {
            "message": "Profile updated successfully",
            "user": dict(updated_user)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    user_id: int = Depends(get_current_user)
):
    """
    Change current user's password
    """
    import psycopg2
    import bcrypt
    from src.app.db.client import get_db_connection_dict
    
    try:
        # Validate new password
        if request.new_password != request.confirm_password:
            raise HTTPException(status_code=400, detail="New passwords do not match")
        
        if len(request.new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
        conn = get_db_connection_dict()
        cursor = conn.cursor()
        
        # Verify current password
        cursor.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        current_hash = result['password_hash']
        
        # Check current password
        if not bcrypt.checkpw(request.current_password.encode('utf-8'), current_hash.encode('utf-8')):
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Hash new password
        new_hash = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        cursor.execute(
            "UPDATE users SET password_hash = %s, updated_at = NOW() WHERE id = %s",
            (new_hash, user_id)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        logger.info(f"Password changed for user {user_id}")
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(status_code=500, detail=str(e))
