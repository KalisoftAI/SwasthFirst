"""
Rate limiting middleware for authentication endpoints.

Prevents brute force attacks by limiting login attempts per phone number/IP.
Uses in-memory storage (suitable for single-server deployments).

For production multi-server deployments, replace with Redis-based rate limiting.
"""

import time
from typing import Dict, Tuple
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta


class InMemoryRateLimiter:
    """
    Simple in-memory rate limiter.
    
    Stores attempt timestamps per identifier (phone/IP).
    Automatically cleans up old entries to prevent memory leaks.
    """
    
    def __init__(self):
        # Structure: {identifier: [timestamp1, timestamp2, ...]}
        self.attempts: Dict[str, list] = defaultdict(list)
        self.last_cleanup = time.time()
    
    def check_rate_limit(
        self,
        identifier: str,
        max_attempts: int,
        window_seconds: int
    ) -> Tuple[bool, int]:
        """
        Check if identifier has exceeded rate limit.
        
        Args:
            identifier: Unique identifier (phone number or IP)
            max_attempts: Maximum attempts allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        # Cleanup old entries every 5 minutes
        if time.time() - self.last_cleanup > 300:
            self._cleanup()
        
        now = time.time()
        cutoff_time = now - window_seconds
        
        # Get recent attempts for this identifier
        recent_attempts = [
            timestamp for timestamp in self.attempts[identifier]
            if timestamp > cutoff_time
        ]
        
        # Update stored attempts
        self.attempts[identifier] = recent_attempts
        
        # Check if limit exceeded
        if len(recent_attempts) >= max_attempts:
            # Calculate retry-after time (when oldest attempt expires)
            oldest_attempt = min(recent_attempts)
            retry_after = int(oldest_attempt + window_seconds - now)
            return False, max(retry_after, 1)
        
        # Record this attempt
        self.attempts[identifier].append(now)
        return True, 0
    
    def _cleanup(self):
        """Remove identifiers with no recent attempts (older than 1 hour)."""
        now = time.time()
        cutoff = now - 3600  # 1 hour
        
        identifiers_to_remove = [
            identifier for identifier, attempts in self.attempts.items()
            if not attempts or max(attempts) < cutoff
        ]
        
        for identifier in identifiers_to_remove:
            del self.attempts[identifier]
        
        self.last_cleanup = now
        print(f"🧹 Rate limiter cleanup: removed {len(identifiers_to_remove)} identifiers")


# Global rate limiter instance
rate_limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to apply rate limiting to authentication endpoints.
    
    Specifically protects:
    - POST /api/v1/auth/login (5 attempts per phone per 15 minutes)
    - POST /api/v1/admin/login (5 attempts per IP per 15 minutes)
    """
    
    async def dispatch(self, request: Request, call_next):
        """Process request and apply rate limiting if needed."""
        
        # Check if this is a login endpoint
        path = request.url.path
        
        if path == "/api/v1/auth/login" and request.method == "POST":
            # Customer login - rate limit by phone number
            try:
                body = await request.body()
                # Parse phone from body (simple approach)
                import json
                data = json.loads(body)
                phone = data.get("phone", "")
                
                # Restore body for downstream handlers
                request._body = body
                
                if phone:
                    identifier = f"customer_login:{phone}"
                    allowed, retry_after = rate_limiter.check_rate_limit(
                        identifier=identifier,
                        max_attempts=5,
                        window_seconds=900  # 15 minutes
                    )
                    
                    if not allowed:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail=f"Too many login attempts. Try again in {retry_after} seconds.",
                            headers={"Retry-After": str(retry_after)}
                        )
            except json.JSONDecodeError:
                pass  # Invalid JSON, let the endpoint handler deal with it
        
        elif path == "/api/v1/admin/login" and request.method == "POST":
            # Admin login - rate limit by IP address
            client_ip = request.client.host
            identifier = f"admin_login:{client_ip}"
            
            allowed, retry_after = rate_limiter.check_rate_limit(
                identifier=identifier,
                max_attempts=5,
                window_seconds=900  # 15 minutes
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many login attempts from this IP. Try again in {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)}
                )
        
        # Process request
        response = await call_next(request)
        return response


# TODO: Replace with Redis-based rate limiting for multi-server deployments
# TODO: Add different rate limits for different endpoints (e.g., order creation)
# TODO: Add rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
# TODO: Add allowlist for trusted IPs (internal services)
