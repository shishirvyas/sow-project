# Hybrid Cache Implementation - Like Hibernate's Multi-Level Cache

## ✅ Installation Complete

You now have a **two-level hybrid cache** similar to Hibernate:

- **L1 Cache**: In-process TTLCache (fast, per-instance, zero cost)
- **L2 Cache**: Redis (optional, shared across instances)

## Architecture:

```
Request → L1 In-Process Cache (1-5ms) → L2 Redis Cache (10-50ms) → PostgreSQL (50-500ms)
          ↑ Fast, local                  ↑ Optional                  ↑ Source of truth
```

## Key Features:

### ✅ Like Hibernate's Cache:
1. **Session Cache (L1)** - Per-instance, automatic eviction, thread-safe
2. **2nd Level Cache (L2)** - Shared across instances (Redis)
3. **Query Cache** - Function result caching with TTL
4. **Graceful Degradation** - Works without Redis

### ✅ Zero External Dependencies:
- Works perfectly with **Azure free tier** (no Redis cost)
- Falls back to L1 in-process cache automatically
- Optional Redis for multi-instance deployments

### ✅ Category-Based Caching:
- `permissions`: 10 min TTL, 500 items
- `menus`: 15 min TTL, 500 items
- `roles`: 30 min TTL, 200 items
- `prompts`: 1 hour TTL, 1000 items
- `general`: 5 min TTL, 1000 items

## Usage Examples:

### 1. Cache User Permissions:
```python
from app.core.hybrid_cache import cached

@cached(category="permissions")
def get_user_permissions(user_id: int):
    # Expensive DB query
    result = db.query(...)
    return result

# First call: DB query (slow)
perms = get_user_permissions(123)

# Subsequent calls: L1 cache (1-5ms, ultra-fast!)
perms = get_user_permissions(123)
```

### 2. Cache User Menu:
```python
@cached(category="menus")
def get_user_menu(user_id: int):
    result = db.execute(...)
    return result

# Cached for 15 minutes in L1
menu = get_user_menu(123)
```

### 3. Cache with Custom TTL (L2 Redis only):
```python
@cached(category="prompts", ttl=7200)  # 2 hours in Redis
def get_prompt_template(clause_id: str):
    return db.query(...)
```

### 4. Invalidate Cache When Data Changes:
```python
from app.core.hybrid_cache import invalidate_cache

# After updating user permissions
invalidate_cache("get_user_permissions:123", category="permissions")

# Clear all permissions cache
invalidate_cache("*", category="permissions")

# Clear all menus cache
invalidate_cache("*", category="menus")
```

### 5. Manual Cache Operations:
```python
from app.core.hybrid_cache import HybridCache

# Get from cache
value = HybridCache.get("my_key", category="general")

# Set in cache
HybridCache.set("my_key", {"data": "value"}, category="general", ttl=300)

# Delete from cache
HybridCache.delete("my_key", category="general")
```

### 6. Get Cache Statistics:
```python
from app.core.hybrid_cache import cache_stats

stats = cache_stats()
# Returns:
# {
#   "l1_caches": {
#     "permissions": {"size": 45, "maxsize": 500, "ttl": 600},
#     "menus": {"size": 32, "maxsize": 500, "ttl": 900},
#     ...
#   },
#   "l2_enabled": False  # or True if Redis connected
# }
```

## Health Check:

Visit `/health` endpoint:
```json
{
  "status": "ok",
  "env": "development",
  "cache": {
    "l1_enabled": true,
    "l2_redis_enabled": false,
    "l1_stats": {
      "permissions": {"size": 45, "maxsize": 500, "ttl": 600},
      "menus": {"size": 32, "maxsize": 500, "ttl": 900},
      "roles": {"size": 12, "maxsize": 200, "ttl": 1800},
      "prompts": {"size": 156, "maxsize": 1000, "ttl": 3600},
      "general": {"size": 8, "maxsize": 1000, "ttl": 300}
    }
  }
}
```

## Deployment Scenarios:

### Single Instance (Azure Free Tier):
- ✅ L1 in-process cache only
- ✅ Zero cost
- ✅ 1-5ms latency
- ✅ Perfect for development and low-traffic apps

### Multiple Instances (Production):
- ✅ L1 + L2 (Redis) for cache coherence
- ✅ Each instance has fast L1 cache
- ✅ Redis provides shared state
- ✅ Graceful fallback if Redis unavailable

### Configuration:

**.env for L1 only (free):**
```env
# No Redis configuration needed!
# L1 in-process cache works automatically
```

**.env for L1 + L2 (optional Redis):**
```env
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
REDIS_SSL=false
```

## Performance Comparison:

| Scenario | Latency | Cost |
|----------|---------|------|
| **PostgreSQL query** | 50-500ms | DB load |
| **L2 Redis (external)** | 10-50ms | $15+/month |
| **L1 In-Process** | **1-5ms** ✅ | **$0** ✅ |

## Thread Safety:

- ✅ L1 cache uses `threading.RLock()` for thread-safe access
- ✅ Safe for Gunicorn/Uvicorn workers
- ✅ Each worker has its own L1 cache instance

## Cache Invalidation Patterns:

```python
from app.core.hybrid_cache import invalidate_cache

# After role assignment changes
invalidate_cache("*", category="permissions")
invalidate_cache("*", category="menus")

# After updating specific user
invalidate_cache(f"get_user_permissions:{user_id}", category="permissions")
invalidate_cache(f"get_user_menu:{user_id}", category="menus")

# After updating role definitions
invalidate_cache("*", category="roles")
```

## Ready to Use! 🚀

The hybrid cache is now active and will automatically:
1. ✅ Use L1 in-process cache (always available)
2. ✅ Use L2 Redis if configured (optional)
3. ✅ Fall back gracefully if Redis unavailable
4. ✅ Work perfectly in Azure free tier

**No external dependencies required for basic caching!**

Tell me which functions you want to cache:
- User permissions
- User menus
- Roles
- Prompt templates
- Other?

I'll add the `@cached()` decorator to them!
