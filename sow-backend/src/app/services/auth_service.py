"""
Authentication service for JWT token generation and password verification
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from src.app.core.config import settings
from src.app.db.client import execute_query

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # Bcrypt has a 72-byte limit, truncate if necessary
    if isinstance(plain_password, str):
        plain_password_bytes = plain_password.encode('utf-8')[:72]
        plain_password = plain_password_bytes.decode('utf-8', errors='ignore')
    
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        if result:
            logger.info("✅ Password verification successful")
        else:
            logger.warning("❌ Password verification failed - incorrect password")
        return result
    except Exception as e:
        logger.error(f"❌ Password verification error: {str(e)}")
        raise

def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Bcrypt has a 72-byte limit, truncate if necessary
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')[:72]
        password = password_bytes.decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def authenticate_user(email: str, password: str) -> Optional[dict]:
    """
    Authenticate a user by email and password
    Returns user dict if successful, None otherwise
    """
    logger.info(f"🔐 Authentication attempt for: {email}")
    
    query = """
        SELECT id, email, full_name, password_hash, is_active, is_verified, avatar_url
        FROM users
        WHERE email = %s
    """
    
    user = execute_query(query, (email,), fetch_one=True)
    
    if not user:
        logger.warning(f"❌ Authentication failed - user not found: {email}")
        return None
    
    logger.info(f"👤 User found: {user['full_name']} (ID: {user['id']})")
    
    if not verify_password(password, user['password_hash']):
        logger.warning(f"❌ Authentication failed - invalid password for: {email}")
        return None
    
    if not user['is_active']:
        logger.warning(f"❌ Authentication failed - user inactive: {email}")
        return None
    
    # Remove password_hash from response
    user_data = {k: v for k, v in user.items() if k != 'password_hash'}
    logger.info(f"✅ Authentication successful for: {email} (User ID: {user['id']})")
    return user_data

def get_user_permissions(user_id: int) -> list[str]:
    """Get all permission codes for a user"""
    query = """
        SELECT DISTINCT permission_code
        FROM user_permissions_view
        WHERE user_id = %s
        ORDER BY permission_code
    """
    
    results = execute_query(query, (user_id,))
    return [row['permission_code'] for row in results]

def get_user_menu(user_id: int) -> list[dict]:
    """Get menu items accessible to a user based on their permissions"""
    query = """
        SELECT *
        FROM get_user_menu(%s)
        ORDER BY display_order
    """
    
    return execute_query(query, (user_id,))

def get_user_roles(user_id: int) -> list[dict]:
    """Get all roles assigned to a user"""
    query = """
        SELECT r.id, r.name, r.display_name, r.description
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = %s
        ORDER BY r.name
    """
    
    return execute_query(query, (user_id,))

def get_user_by_id(user_id: int) -> Optional[dict]:
    """Get user by ID"""
    query = """
        SELECT id, email, full_name, is_active, is_verified, avatar_url, created_at, updated_at
        FROM users
        WHERE id = %s
    """
    
    return execute_query(query, (user_id,), fetch_one=True)

def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email"""
    query = """
        SELECT id, email, full_name, is_active, is_verified, avatar_url, created_at, updated_at
        FROM users
        WHERE email = %s
    """
    
    return execute_query(query, (email,), fetch_one=True)
