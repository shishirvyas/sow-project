"""
In-process caching system using TTLCache - like Hibernate's session cache.

Features:
- Zero external dependencies (no Redis required)
- Ultra-fast access (1-5ms, in-memory)
- Automatic eviction (LRU + TTL)
- Thread-safe for concurrent requests
- Category-based cache management
- Perfect for single-instance deployments (Azure free tier)

This is similar to:
- Hibernate's Session Cache (L1)
- Django's per-request cache
- Spring Boot's Caffeine cache
"""

import logging
from typing import Optional, Any, Callable
from functools import wraps
from cachetools import TTLCache
import threading

logger = logging.getLogger(__name__)


class InProcessCache:
    """
    Simple in-process cache using TTLCache.
    
    Features:
    - Category-based caches with different TTLs
    - Thread-safe with RLock
    - Automatic LRU eviction
    - No external dependencies
    - Pre-loading of reference data at startup
    """
    
    # In-process caches by category
    _caches = {
        "permissions": TTLCache(maxsize=500, ttl=600),    # 10 min, 500 items
        "menus": TTLCache(maxsize=500, ttl=900),          # 15 min, 500 items
        "roles": TTLCache(maxsize=200, ttl=1800),         # 30 min, 200 items
        "prompts": TTLCache(maxsize=1000, ttl=3600),      # 1 hour, 1000 items
        "general": TTLCache(maxsize=1000, ttl=300),       # 5 min, 1000 items
    }
    
    # Thread locks for cache access
    _locks = {category: threading.RLock() for category in _caches}
    
    # Track if warmup has been done
    _warmed_up = False
    
    @classmethod
    def initialize(cls):
        """Initialize the in-process cache."""
        logger.info("In-process cache initialized (L1 only, no Redis)")
    
    @classmethod
    def warmup(cls):
        """
        Pre-load frequently accessed reference data at startup.
        This reduces initial cache misses and improves first-request performance.
        """
        if cls._warmed_up:
            logger.info("Cache already warmed up, skipping")
            return
        
        try:
            logger.info("🔥 Starting cache warmup...")
            
            # Import services here to avoid circular imports
            from src.app.services.admin_service import get_all_roles, get_all_permissions
            
            # Pre-load all roles (small dataset, rarely changes)
            try:
                roles = get_all_roles()
                cls.set("all_roles", roles, category="roles")
                logger.info(f"✅ Cached {len(roles)} roles")
            except Exception as e:
                logger.warning(f"⚠️ Failed to pre-load roles: {e}")
            
            # Pre-load all permissions (small dataset, rarely changes)
            try:
                permissions = get_all_permissions()
                cls.set("all_permissions", permissions, category="permissions")
                logger.info(f"✅ Cached {len(permissions)} permissions")
            except Exception as e:
                logger.warning(f"⚠️ Failed to pre-load permissions: {e}")
            
            cls._warmed_up = True
            logger.info("🔥 Cache warmup complete!")
            
        except Exception as e:
            logger.error(f"❌ Cache warmup failed: {e}")
            # Don't fail startup if warmup fails
            cls._warmed_up = False
    
    @classmethod
    def get_cache(cls, category: str = "general") -> TTLCache:
        """Get cache for a specific category."""
        return cls._caches.get(category, cls._caches["general"])
    
    @classmethod
    def get_lock(cls, category: str = "general") -> threading.RLock:
        """Get lock for cache category."""
        return cls._locks.get(category, cls._locks["general"])
    
    @classmethod
    def get(cls, key: str, category: str = "general") -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            category: Cache category (permissions, menus, roles, prompts, general)
        
        Returns:
            Cached value or None
        """
        cache = cls.get_cache(category)
        lock = cls.get_lock(category)
        
        with lock:
            if key in cache:
                logger.debug(f"Cache HIT: {category}:{key}")
                return cache[key]
        
        logger.debug(f"Cache MISS: {category}:{key}")
        return None
    
    @classmethod
    def set(cls, key: str, value: Any, category: str = "general", ttl: Optional[int] = None):
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            category: Cache category
            ttl: Optional TTL override (ignored for category-based TTL)
        """
        cache = cls.get_cache(category)
        lock = cls.get_lock(category)
        
        with lock:
            cache[key] = value
        
        logger.debug(f"Cache SET: {category}:{key}")
    
    @classmethod
    def delete(cls, key: str, category: str = "general"):
        """Delete key from cache."""
        cache = cls.get_cache(category)
        lock = cls.get_lock(category)
        
        with lock:
            cache.pop(key, None)
        
        logger.debug(f"Cache DELETE: {category}:{key}")
    
    @classmethod
    def invalidate(cls, pattern: str, category: str = "general"):
        """
        Invalidate cache entries matching pattern.
        
        Args:
            pattern: Key pattern (e.g., "user:123:*" or "*")
            category: Cache category
        """
        cache = cls.get_cache(category)
        lock = cls.get_lock(category)
        
        with lock:
            if pattern == "*":
                cache.clear()
                logger.info(f"Cache cleared: {category}")
            else:
                # Pattern matching
                keys_to_delete = [k for k in list(cache.keys()) if pattern.replace("*", "") in str(k)]
                for k in keys_to_delete:
                    cache.pop(k, None)
                logger.info(f"Cache invalidated {len(keys_to_delete)} keys: {category}:{pattern}")
    
    @classmethod
    def clear_all(cls):
        """Clear all caches."""
        for category, cache in cls._caches.items():
            lock = cls._locks[category]
            with lock:
                cache.clear()
        
        logger.info("All caches cleared")
    
    @classmethod
    def stats(cls) -> dict:
        """Get cache statistics."""
        stats = {}
        
        for category, cache in cls._caches.items():
            lock = cls._locks[category]
            with lock:
                stats[category] = {
                    "size": len(cache),
                    "maxsize": cache.maxsize,
                    "ttl": cache.ttl
                }
        
        return stats
    
    @classmethod
    def close(cls):
        """Close cache (no-op for in-process cache)."""
        logger.info("In-process cache closed")


def cached(
    category: str = "general",
    key_func: Optional[Callable] = None
):
    """
    Decorator to cache function results in-process.
    
    Args:
        category: Cache category (permissions, menus, roles, prompts, general)
        key_func: Optional function to generate cache key from args/kwargs
    
    Example:
        @cached(category="permissions")
        def get_user_permissions(user_id: int):
            return db.query(...)  # Cached for 10 minutes
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                key_suffix = key_func(*args, **kwargs)
            else:
                # Simple key from args
                key_parts = [str(arg) for arg in args]
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                key_suffix = ":".join(key_parts)
            
            cache_key = f"{func.__name__}:{key_suffix}"
            
            # Try to get from cache
            result = InProcessCache.get(cache_key, category=category)
            if result is not None:
                return result
            
            # Cache miss - execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            InProcessCache.set(cache_key, result, category=category)
            
            return result
        
        # Add cache control methods
        wrapper.cache_clear = lambda: InProcessCache.invalidate("*", category=category)
        wrapper.cache_info = lambda: {"category": category}
        
        return wrapper
    return decorator


# Convenience functions
def invalidate_cache(pattern: str, category: str = "general"):
    """Invalidate cache entries matching pattern."""
    InProcessCache.invalidate(pattern, category)


def clear_cache():
    """Clear all caches."""
    InProcessCache.clear_all()


def cache_stats() -> dict:
    """Get cache statistics."""
    return InProcessCache.stats()


# Initialize on module import
InProcessCache.initialize()
