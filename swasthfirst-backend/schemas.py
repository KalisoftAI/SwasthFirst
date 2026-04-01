"""
Pydantic schemas for request validation and response serialization.

All schemas use Pydantic v2 syntax with proper validation, examples, and documentation.
Strictly separates request models (input) from response models (output) for security.
"""

import re
from datetime import datetime
from typing import List, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict
from models import OrderStatus, AdminRole


# ============================================================================
# VALIDATORS
# ============================================================================

class PhoneValidator:
    """Reusable phone number validation logic."""
    
    @staticmethod
    def validate_phone(v: str) -> str:
        """
        Validate and normalize phone number.
        Must be exactly 10 digits after stripping spaces.
        """
        if not v:
            raise ValueError("Phone number is required")
        
        # Strip all spaces and special characters
        cleaned = re.sub(r'\s+', '', v)
        
        # Validate it's exactly 10 digits
        if not re.match(r'^\d{10}$', cleaned):
            raise ValueError("Phone number must be exactly 10 digits")
        
        return cleaned


# ============================================================================
# CUSTOMER SCHEMAS
# ============================================================================

class CustomerLogin(BaseModel):
    """Customer login request (phone-based authentication)."""
    name: str = Field(..., min_length=2, max_length=100, description="Customer full name")
    phone: str = Field(..., description="10-digit phone number (acts as password)")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Strip and validate name is not empty."""
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate phone number format."""
        return PhoneValidator.validate_phone(v)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Priya Sharma",
                "phone": "9876543210"
            }
        }
    )


class CustomerCreate(BaseModel):
    """Create new customer (admin-only operation)."""
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., description="10-digit phone number")
    health_goal: Optional[str] = Field(None, max_length=50)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return PhoneValidator.validate_phone(v)


class CustomerResponse(BaseModel):
    """Customer data for API responses (never includes phone_hash)."""
    id: UUID
    name: str
    phone: str
    health_goal: Optional[str]
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CustomerUpdateGoal(BaseModel):
    """Update customer's health goal."""
    health_goal: str = Field(..., min_length=2, max_length=50)
    
    @field_validator('health_goal')
    @classmethod
    def validate_goal(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Health goal cannot be empty")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"health_goal": "Weight Loss"}
        }
    )


class CustomerStats(BaseModel):
    """Customer with order statistics (admin dashboard)."""
    id: UUID
    name: str
    phone: str
    health_goal: Optional[str]
    order_count: int
    total_spent: int
    last_order_at: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ADMIN SCHEMAS
# ============================================================================

class AdminLogin(BaseModel):
    """Admin login request (username/password authentication)."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    
    @field_validator('username', 'password')
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "swasthAdmin",
                "password": "Admin@1234"
            }
        }
    )


class AdminCreate(BaseModel):
    """Create new admin account (superadmin-only operation)."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100, description="Minimum 8 characters")
    role: AdminRole = Field(default=AdminRole.MANAGER)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Username cannot be empty")
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError("Username can only contain letters, numbers, and underscores")
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class AdminResponse(BaseModel):
    """Admin data for API responses (never includes password_hash)."""
    id: UUID
    username: str
    role: AdminRole
    created_at: datetime
    last_login: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# MENU SCHEMAS
# ============================================================================

class MenuItemResponse(BaseModel):
    """Menu item for API responses."""
    id: int
    name: str
    category: str
    price: int
    tags: List[str]
    is_available: bool
    
    model_config = ConfigDict(from_attributes=True)


class MenuByCategory(BaseModel):
    """Menu items grouped by category."""
    category: str
    items: List[MenuItemResponse]


# ============================================================================
# ORDER SCHEMAS
# ============================================================================

class OrderItemIn(BaseModel):
    """Single item in an order (request)."""
    item_id: int = Field(..., gt=0, description="Menu item ID")
    quantity: int = Field(..., ge=1, le=20, description="Quantity (1-20)")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"item_id": 1, "quantity": 2}
        }
    )


class OrderCreate(BaseModel):
    """Create new order request."""
    items: List[OrderItemIn] = Field(..., min_length=1, max_length=15, description="Order items (max 15)")
    
    @field_validator('items')
    @classmethod
    def validate_unique_items(cls, v: List[OrderItemIn]) -> List[OrderItemIn]:
        """Ensure no duplicate item_ids in the order."""
        item_ids = [item.item_id for item in v]
        if len(item_ids) != len(set(item_ids)):
            raise ValueError("Duplicate items in order. Use quantity field instead.")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {"item_id": 1, "quantity": 2},
                    {"item_id": 5, "quantity": 1}
                ]
            }
        }
    )


class OrderItemOut(BaseModel):
    """Single item in order response (with full details)."""
    item_id: int
    name: str
    quantity: int
    unit_price: int
    subtotal: int


class OrderResponse(BaseModel):
    """Full order details for API responses."""
    id: UUID
    order_code: str
    customer_id: UUID
    customer_name: str
    customer_phone: str
    items: List[OrderItemOut]
    total_amount: int
    status: OrderStatus
    created_at: datetime
    completed_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    """Update order status (admin-only)."""
    status: OrderStatus = Field(..., description="New order status")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"status": "preparing"}
        }
    )


# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================

class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"


class CustomerLoginResponse(Token):
    """Customer login response with token and profile."""
    customer: CustomerResponse


class AdminLoginResponse(Token):
    """Admin login response with token and profile."""
    admin: AdminResponse


class TokenPayload(BaseModel):
    """JWT token payload structure."""
    sub: str  # user_id
    role: str  # "customer" or "admin"
    name: str
    exp: Optional[datetime] = None


# ============================================================================
# ANALYTICS SCHEMAS
# ============================================================================

class TopItem(BaseModel):
    """Top selling item statistics."""
    item_id: int
    name: str
    count: int
    revenue: int


class OrdersByHour(BaseModel):
    """Order count by hour of day."""
    hour: int
    count: int


class AnalyticsResponse(BaseModel):
    """Admin dashboard analytics data."""
    total_orders_today: int
    revenue_today: int
    total_customers: int
    top_items: List[TopItem] = Field(default_factory=list, description="Top 5 items today")
    orders_by_hour: List[OrdersByHour] = Field(default_factory=list, description="Orders by hour today")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_orders_today": 47,
                "revenue_today": 1895,
                "total_customers": 156,
                "top_items": [
                    {"item_id": 1, "name": "Amla Juice", "count": 23, "revenue": 575}
                ],
                "orders_by_hour": [
                    {"hour": 9, "count": 5},
                    {"hour": 10, "count": 12}
                ]
            }
        }
    )


# ============================================================================
# PAGINATION SCHEMAS
# ============================================================================

class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper."""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "page_size": 20,
                "total_pages": 5
            }
        }
    )


# ============================================================================
# ERROR SCHEMAS
# ============================================================================

class ErrorResponse(BaseModel):
    """Standardized error response."""
    detail: str
    error_code: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Account not found. Please contact the outlet.",
                "error_code": "ACCOUNT_NOT_FOUND"
            }
        }
    )


class HealthResponse(BaseModel):
    """Health check endpoint response."""
    status: str
    timestamp: datetime
    version: str = "1.0.0"
