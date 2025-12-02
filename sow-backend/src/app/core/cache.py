"""
Redis cache client and utilities for the SOW application.

Provides:
- Redis connection pool
- Cache decorators for functions
- Cache key generators
- Cache invalidation utilities
"""

import os
import json
import logging
from typing import Optional, Any, Callable
from functools import wraps
import redis
from redis.connection import ConnectionPool

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis cache client with connection pooling and utility methods."""
    
    _pool: Optional[ConnectionPool] = None
    _client: Optional[redis.Redis] = None
    
    @classmethod
    def initialize(cls):
        """Initialize Redis connection pool from environment variables."""
        if cls._pool is not None:
            return
        
        try:
            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", "6379"))
            redis_password = os.getenv("REDIS_PASSWORD", "")
            redis_db = int(os.getenv("REDIS_DB", "0"))
            redis_ssl = os.getenv("REDIS_SSL", "false").lower() == "true"
            
            cls._pool = ConnectionPool(
                host=redis_host,
                port=redis_port,
                password=redis_password if redis_password else None,
                db=redis_db,
                ssl=redis_ssl,
                decode_responses=True,  # Automatically decode bytes to strings
                socket_connect_timeout=5,
                socket_timeout=5,
                max_connections=50
            )
            
            cls._client = redis.Redis(connection_pool=cls._pool)
            
            # Test connection
            cls._client.ping()
            logger.info(f"Redis connected successfully to {redis_host}:{redis_port}")
            
        except redis.ConnectionError as e:
            logger.warning(f"Redis connection failed: {e}. Caching will be disabled.")
            cls._pool = None
            cls._client = None
        except Exception as e:
            logger.error(f"Redis initialization error: {e}")
            cls._pool = None
            cls._client = None
    
    @classmethod
    def get_client(cls) -> Optional[redis.Redis]:
        """Get Redis client instance. Returns None if Redis is unavailable."""
        if cls._client is None:
            cls.initialize()
        return cls._client
    
    @classmethod
    def is_available(cls) -> bool:
        """Check if Redis is available and connected."""
        client = cls.get_client()
        if client is None:
            return False
        try:
            client.ping()
            return True
        except:
            return False
    
    @classmethod
    def close(cls):
        """Close Redis connection pool."""
        if cls._pool:
            cls._pool.disconnect()
            cls._pool = None
            cls._client = None
            logger.info("Redis connection closed")


def cache_key(*args, **kwargs) -> str:
    """
    Generate a cache key from function arguments.
    
    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments
    
    Returns:
        str: Cache key string
    """
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    return ":".join(key_parts)


def cached(
    ttl: int = 300,
    key_prefix: Optional[str] = None,
    key_func: Optional[Callable] = None
):
    """
    Decorator to cache function results in Redis.
    
    Args:
        ttl: Time to live in seconds (default: 300 = 5 minutes)
        key_prefix: Optional prefix for cache key (default: function name)
        key_func: Optional function to generate cache key from args/kwargs
    
    Example:
        @cached(ttl=600, key_prefix="user_perms")
        def get_user_permissions(user_id: int):
            # Expensive DB query
            return permissions
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            client = RedisCache.get_client()
            
            # If Redis is unavailable, execute function directly
            if client is None:
                logger.debug(f"Redis unavailable, executing {func.__name__} without cache")
                return func(*args, **kwargs)
            
            # Generate cache key
            prefix = key_prefix or func.__name__
            if key_func:
                key_suffix = key_func(*args, **kwargs)
            else:
                key_suffix = cache_key(*args, **kwargs)
            
            cache_key_str = f"{prefix}:{key_suffix}"
            
            try:
                # Try to get from cache
                cached_value = client.get(cache_key_str)
                if cached_value is not None:
                    logger.debug(f"Cache HIT: {cache_key_str}")
                    return json.loads(cached_value)
                
                # Cache miss - execute function
                logger.debug(f"Cache MISS: {cache_key_str}")
                result = func(*args, **kwargs)
                
                # Store in cache with TTL
                client.setex(cache_key_str, ttl, json.dumps(result))
                
                return result
                
            except json.JSONDecodeError as e:
                logger.error(f"Cache deserialization error for {cache_key_str}: {e}")
                return func(*args, **kwargs)
            except redis.RedisError as e:
                logger.error(f"Redis error for {cache_key_str}: {e}")
                return func(*args, **kwargs)
        
        # Add cache control methods to the wrapper
        wrapper.cache_clear = lambda: invalidate_cache(key_prefix or func.__name__)
        wrapper.cache_info = lambda: {"ttl": ttl, "prefix": key_prefix or func.__name__}
        
        return wrapper
    return decorator


def invalidate_cache(pattern: str):
    """
    Invalidate all cache keys matching the pattern.
    
    Args:
        pattern: Redis key pattern (e.g., "user_perms:*", "get_user_menu:123")
    
    Example:
        invalidate_cache("user_perms:*")  # Clear all user permission caches
        invalidate_cache("get_user_menu:123")  # Clear menu for user 123
    """
    client = RedisCache.get_client()
    if client is None:
        logger.debug("Redis unavailable, skipping cache invalidation")
        return
    
    try:
        # Find all keys matching pattern
        keys = list(client.scan_iter(match=pattern))
        if keys:
            client.delete(*keys)
            logger.info(f"Invalidated {len(keys)} cache keys matching '{pattern}'")
        else:
            logger.debug(f"No cache keys found matching '{pattern}'")
    except redis.RedisError as e:
        logger.error(f"Cache invalidation error for pattern '{pattern}': {e}")


def set_cache(key: str, value: Any, ttl: int = 300):
    """
    Set a value in cache.
    
    Args:
        key: Cache key
        value: Value to cache (will be JSON serialized)
        ttl: Time to live in seconds
    """
    client = RedisCache.get_client()
    if client is None:
        return
    
    try:
        client.setex(key, ttl, json.dumps(value))
        logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
    except (json.JSONEncodeError, redis.RedisError) as e:
        logger.error(f"Cache set error for key '{key}': {e}")


def get_cache(key: str) -> Optional[Any]:
    """
    Get a value from cache.
    
    Args:
        key: Cache key
    
    Returns:
        Cached value or None if not found/error
    """
    client = RedisCache.get_client()
    if client is None:
        return None
    
    try:
        value = client.get(key)
        if value is not None:
            logger.debug(f"Cache GET: {key}")
            return json.loads(value)
        return None
    except (json.JSONDecodeError, redis.RedisError) as e:
        logger.error(f"Cache get error for key '{key}': {e}")
        return None


def delete_cache(key: str):
    """
    Delete a specific cache key.
    
    Args:
        key: Cache key to delete
    """
    client = RedisCache.get_client()
    if client is None:
        return
    
    try:
        client.delete(key)
        logger.debug(f"Cache DELETE: {key}")
    except redis.RedisError as e:
        logger.error(f"Cache delete error for key '{key}': {e}")


# Cache key generators for common patterns
def user_cache_key(user_id: int, suffix: str = "") -> str:
    """Generate cache key for user-related data."""
    return f"user:{user_id}:{suffix}" if suffix else f"user:{user_id}"


def permission_cache_key(user_id: int) -> str:
    """Generate cache key for user permissions."""
    return f"user_perms:{user_id}"


def menu_cache_key(user_id: int) -> str:
    """Generate cache key for user menu."""
    return f"user_menu:{user_id}"


def role_cache_key(role_id: int) -> str:
    """Generate cache key for role data."""
    return f"role:{role_id}"


def prompt_cache_key(clause_id: str) -> str:
    """Generate cache key for prompt template."""
    return f"prompt:{clause_id}"


# Initialize Redis on module import
RedisCache.initialize()
