"""
SQLAlchemy ORM models for SwasthFirst application.

Defines all database tables:
- Customer: User accounts (phone-based authentication)
- Admin: Staff/manager accounts
- MenuItem: Product catalog
- Order: Customer orders with items and status tracking
"""

import uuid
from datetime import datetime
from typing import List
from sqlalchemy import (
    String, Boolean, DateTime, Integer, Enum as SQLEnum, 
    ForeignKey, Text, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from database import Base


class OrderStatus(str, enum.Enum):
    """Order lifecycle states."""
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AdminRole(str, enum.Enum):
    """Admin permission levels."""
    MANAGER = "manager"
    SUPERADMIN = "superadmin"


class Customer(Base):
    """
    Customer account model.
    
    Phone number serves as both username and password (hashed with bcrypt).
    This allows simple authentication for customers who may not remember complex passwords.
    """
    __tablename__ = "customers"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    phone_hash: Mapped[str] = mapped_column(String(255), nullable=False)  # bcrypt hash of phone
    health_goal: Mapped[str] = mapped_column(String(50), nullable=True)  # e.g., "Detox", "Energy"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow, 
        nullable=False
    )
    
    # Relationships
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Customer(id={self.id}, name={self.name}, phone={self.phone})>"


class Admin(Base):
    """
    Admin/staff account model.
    
    Separate authentication system from customers with role-based permissions.
    """
    __tablename__ = "admins"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        index=True
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[AdminRole] = mapped_column(
        SQLEnum(AdminRole, name="admin_role_enum"), 
        default=AdminRole.MANAGER, 
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # TODO: Add multi-outlet support - outlet_id foreign key to restrict data visibility
    
    def __repr__(self):
        return f"<Admin(id={self.id}, username={self.username}, role={self.role.value})>"


class MenuItem(Base):
    """
    Menu catalog model.
    
    Stores all available products with pricing, categorization, and availability status.
    """
    __tablename__ = "menu_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # "JUICES", "SALADS", etc.
    price: Mapped[int] = mapped_column(Integer, nullable=False)  # Store in rupees (or paise if needed)
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)  # ["Vitamin C", "Immunity"]
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Index for common query patterns
    __table_args__ = (
        Index('idx_category_available', 'category', 'is_available'),
    )
    
    # TODO: Add image_url field for product photos (S3/Cloudinary integration)
    # TODO: Add nutrition_info JSON field for detailed health data
    
    def __repr__(self):
        return f"<MenuItem(id={self.id}, name={self.name}, price=₹{self.price})>"


class Order(Base):
    """
    Customer order model.
    
    Stores complete order details including items (as JSON), status tracking, and timestamps.
    """
    __tablename__ = "orders"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        index=True
    )
    order_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)  # "SF-4821"
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    # Order items stored as JSON array: [{"item_id": 1, "name": "Amla Juice", "quantity": 2, "unit_price": 25}]
    items: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)  # Total price in rupees
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, name="order_status_enum"), 
        default=OrderStatus.PENDING, 
        nullable=False,
        index=True
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="orders")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_customer_created', 'customer_id', 'created_at'),
        Index('idx_status_created', 'status', 'created_at'),
    )
    
    # TODO: Add payment_status field for payment gateway integration
    # TODO: Add delivery_address and delivery_time for delivery orders
    # TODO: Add outlet_id for multi-location support
    
    def __repr__(self):
        return f"<Order(id={self.id}, code={self.order_code}, status={self.status.value}, total=₹{self.total_amount})>"
