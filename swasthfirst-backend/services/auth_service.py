"""
Authentication service with business logic for user management.

This module contains reusable authentication logic that can be called
from multiple routers or background tasks.
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import Customer, Admin
from auth import hash_password, verify_password


async def create_customer_account(
    db: AsyncSession,
    name: str,
    phone: str,
    health_goal: Optional[str] = None
) -> Customer:
    """
    Create a new customer account.
    
    Args:
        db: Database session
        name: Customer full name
        phone: 10-digit phone number
        health_goal: Optional health goal preference
        
    Returns:
        Created Customer object
        
    Raises:
        ValueError: If phone number already exists
    """
    # Check if phone exists
    result = await db.execute(
        select(Customer).where(Customer.phone == phone)
    )
    if result.scalar_one_or_none():
        raise ValueError(f"Customer with phone {phone} already exists")
    
    # Create customer with hashed phone
    customer = Customer(
        name=name,
        phone=phone,
        phone_hash=hash_password(phone),
        health_goal=health_goal,
        is_active=True
    )
    
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    
    return customer


async def update_customer_password(
    db: AsyncSession,
    customer: Customer,
    new_phone: str
) -> Customer:
    """
    Update customer's phone number (which acts as their password).
    
    This is useful if a customer changes their phone number.
    
    Args:
        db: Database session
        customer: Customer object to update
        new_phone: New phone number
        
    Returns:
        Updated Customer object
        
    Raises:
        ValueError: If new phone already exists for another customer
    """
    # Check if new phone is already taken
    result = await db.execute(
        select(Customer)
        .where(Customer.phone == new_phone)
        .where(Customer.id != customer.id)
    )
    if result.scalar_one_or_none():
        raise ValueError(f"Phone number {new_phone} is already in use")
    
    # Update phone and hash
    customer.phone = new_phone
    customer.phone_hash = hash_password(new_phone)
    
    await db.commit()
    await db.refresh(customer)
    
    return customer


async def deactivate_customer(
    db: AsyncSession,
    customer: Customer
) -> Customer:
    """
    Deactivate a customer account.
    
    Deactivated customers cannot log in or place orders.
    Their order history is preserved.
    
    Args:
        db: Database session
        customer: Customer to deactivate
        
    Returns:
        Updated Customer object
    """
    customer.is_active = False
    await db.commit()
    await db.refresh(customer)
    return customer


async def reactivate_customer(
    db: AsyncSession,
    customer: Customer
) -> Customer:
    """
    Reactivate a deactivated customer account.
    
    Args:
        db: Database session
        customer: Customer to reactivate
        
    Returns:
        Updated Customer object
    """
    customer.is_active = True
    await db.commit()
    await db.refresh(customer)
    return customer


# TODO: Add email/SMS notification service integration
# TODO: Add OTP generation and verification functions
# TODO: Add password reset functionality (if implementing traditional passwords)
