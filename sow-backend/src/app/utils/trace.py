import logging
import time
import functools
from typing import Callable

logger = logging.getLogger("sow.trace")


def log_time(func: Callable) -> Callable:
    """Decorator that logs entry, exit, duration and exceptions for functions.

    It avoids printing argument values to prevent accidental secrets exposure.
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        name = f"{func.__module__}.{func.__qualname__}"
        logger.info("ENTER %s", name)
        start = time.time()
        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start
            logger.info("EXIT  %s (%.3fs)", name, elapsed)
            return result
        except Exception as e:
            elapsed = time.time() - start
            logger.exception("EXCEPT %s (%.3fs): %s", name, elapsed, e)
            raise

    return wrapper
