"""
Rate limiter configuration for protecting login endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter instance - used to protect login endpoints from brute-force attacks
limiter = Limiter(key_func=get_remote_address)
