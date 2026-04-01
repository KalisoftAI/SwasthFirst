"""
JWT authentication utilities and security dependencies.

Provides functions for:
- Creating and verifying JWT tokens
- Password hashing and verification (bcrypt)
- FastAPI dependencies for protected routes
- Role-based access control (RBAC)
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dotenv import load_dotenv

from database import get_db
from models import Customer, Admin, AdminRole
from schemas import TokenPayload

# Load environment variables
load_dotenv()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-very-long-random-secret-key-here-CHANGE-IN-PRODUCTION")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))
ADMIN_TOKEN_EXPIRE_HOURS = int(os.getenv("ADMIN_TOKEN_EXPIRE_HOURS", "8"))

# Password hashing context (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()


# ============================================================================
# PASSWORD HASHING
# ============================================================================

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Stored bcrypt hash
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


# ============================================================================
# JWT TOKEN CREATION AND VERIFICATION
# ============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary of claims to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
        
    Example:
        token = create_access_token(
            data={"sub": str(user_id), "role": "customer", "name": "John"}
        )
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> TokenPayload:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenPayload with decoded claims
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        name: str = payload.get("name")
        
        if user_id is None or role is None:
            raise credentials_exception
        
        return TokenPayload(sub=user_id, role=role, name=name)
    
    except JWTError:
        raise credentials_exception


# ============================================================================
# AUTHENTICATION DEPENDENCIES
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenPayload:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Authorization header with Bearer token
        
    Returns:
        TokenPayload with user information
        
    Raises:
        HTTPException: If token is missing or invalid
    """
    token = credentials.credentials
    return verify_token(token)


async def get_current_customer(
    token_data: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Customer:
    """
    Dependency to get the current authenticated customer.
    Verifies the token role is "customer" and fetches the customer from database.
    
    Args:
        token_data: Decoded JWT token payload
        db: Database session
        
    Returns:
        Customer ORM object
        
    Raises:
        HTTPException: If not a customer token or customer not found
    """
    if token_data.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Customer access required."
        )
    
    # Fetch customer from database
    result = await db.execute(
        select(Customer).where(Customer.id == token_data.sub)
    )
    customer = result.scalar_one_or_none()
    
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer account not found"
        )
    
    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support."
        )
    
    return customer


async def get_current_admin(
    token_data: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Admin:
    """
    Dependency to get the current authenticated admin.
    Verifies the token role is "admin" and fetches the admin from database.
    
    Args:
        token_data: Decoded JWT token payload
        db: Database session
        
    Returns:
        Admin ORM object
        
    Raises:
        HTTPException: If not an admin token or admin not found
    """
    if token_data.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin access required."
        )
    
    # Fetch admin from database
    result = await db.execute(
        select(Admin).where(Admin.id == token_data.sub)
    )
    admin = result.scalar_one_or_none()
    
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found"
        )
    
    return admin


async def require_superadmin(
    admin: Admin = Depends(get_current_admin)
) -> Admin:
    """
    Dependency to require superadmin role.
    Use this for endpoints that should only be accessible to superadmins.
    
    Args:
        admin: Current authenticated admin
        
    Returns:
        Admin object if superadmin
        
    Raises:
        HTTPException: If not a superadmin
        
    Example:
        @router.post("/admin/create")
        async def create_admin(
            admin: Admin = Depends(require_superadmin)
        ):
            # Only superadmins can reach this
            pass
    """
    if admin.role != AdminRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required for this operation"
        )
    return admin


# ============================================================================
# AUTHENTICATION SERVICE FUNCTIONS
# ============================================================================

async def authenticate_customer(
    db: AsyncSession, 
    name: str, 
    phone: str
) -> Optional[Customer]:
    """
    Authenticate a customer using name and phone number.
    Phone number acts as the password (verified against bcrypt hash).
    
    Args:
        db: Database session
        name: Customer name
        phone: Customer phone number (plain text)
        
    Returns:
        Customer object if authentication successful, None otherwise
    """
    # Find customer by phone
    result = await db.execute(
        select(Customer).where(Customer.phone == phone)
    )
    customer = result.scalar_one_or_none()
    
    if customer is None:
        return None
    
    # Verify name matches (case-insensitive)
    if customer.name.lower() != name.lower():
        return None
    
    # Verify phone as password
    if not verify_password(phone, customer.phone_hash):
        return None
    
    # Check if account is active
    if not customer.is_active:
        return None
    
    return customer


async def authenticate_admin(
    db: AsyncSession,
    username: str,
    password: str
) -> Optional[Admin]:
    """
    Authenticate an admin using username and password.
    
    Args:
        db: Database session
        username: Admin username
        password: Admin password (plain text)
        
    Returns:
        Admin object if authentication successful, None otherwise
    """
    # Find admin by username
    result = await db.execute(
        select(Admin).where(Admin.username == username)
    )
    admin = result.scalar_one_or_none()
    
    if admin is None:
        return None
    
    # Verify password
    if not verify_password(password, admin.password_hash):
        return None
    
    # Update last login timestamp
    admin.last_login = datetime.utcnow()
    await db.commit()
    
    return admin


# TODO: Implement refresh token functionality
# TODO: Add token revocation/blacklist for logout functionality
# TODO: Add rate limiting per user ID (not just IP)
# TODO: Add SMS OTP verification for first-time login
