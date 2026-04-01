"""
Order service with business logic for order management.

Contains reusable order processing logic, validations, and calculations.
"""

from typing import List, Dict, Optional
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from models import Order, MenuItem, Customer, OrderStatus
from schemas import OrderItemIn


async def validate_order_items(
    db: AsyncSession,
    items: List[OrderItemIn]
) -> Dict[int, MenuItem]:
    """
    Validate that all order items exist and are available.
    
    Args:
        db: Database session
        items: List of order items to validate
        
    Returns:
        Dictionary mapping item_id to MenuItem object
        
    Raises:
        ValueError: If any items are not found or unavailable
    """
    item_ids = [item.item_id for item in items]
    
    # Fetch items from database
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.id.in_(item_ids))
        .where(MenuItem.is_available == True)  # noqa: E712
    )
    menu_items = {item.id: item for item in result.scalars().all()}
    
    # Check if all items were found
    missing = set(item_ids) - set(menu_items.keys())
    if missing:
        raise ValueError(f"Items not found or unavailable: {', '.join(map(str, missing))}")
    
    return menu_items


def calculate_order_total(
    items: List[OrderItemIn],
    menu_items: Dict[int, MenuItem]
) -> int:
    """
    Calculate total price for an order.
    
    CRITICAL: Always calculates from database prices, never trusts frontend.
    
    Args:
        items: List of order items with quantities
        menu_items: Dictionary of MenuItem objects from database
        
    Returns:
        Total price in rupees
    """
    total = 0
    for item in items:
        menu_item = menu_items[item.item_id]
        total += menu_item.price * item.quantity
    return total


async def get_customer_order_stats(
    db: AsyncSession,
    customer_id: str
) -> Dict[str, any]:
    """
    Get order statistics for a customer.
    
    Args:
        db: Database session
        customer_id: Customer UUID
        
    Returns:
        Dictionary with order_count, total_spent, last_order_at
    """
    result = await db.execute(
        select(
            func.count(Order.id).label('order_count'),
            func.coalesce(func.sum(Order.total_amount), 0).label('total_spent'),
            func.max(Order.created_at).label('last_order_at')
        ).where(Order.customer_id == customer_id)
    )
    stats = result.first()
    
    return {
        'order_count': stats.order_count,
        'total_spent': stats.total_spent,
        'last_order_at': stats.last_order_at
    }


async def get_orders_by_date_range(
    db: AsyncSession,
    start_date: date,
    end_date: date,
    customer_id: Optional[str] = None,
    status: Optional[OrderStatus] = None
) -> List[Order]:
    """
    Get orders within a date range with optional filters.
    
    Args:
        db: Database session
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        customer_id: Optional customer filter
        status: Optional status filter
        
    Returns:
        List of Order objects
    """
    query = select(Order).where(
        and_(
            func.date(Order.created_at) >= start_date,
            func.date(Order.created_at) <= end_date
        )
    )
    
    if customer_id:
        query = query.where(Order.customer_id == customer_id)
    
    if status:
        query = query.where(Order.status == status)
    
    query = query.order_by(Order.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


async def cancel_order(
    db: AsyncSession,
    order: Order,
    reason: Optional[str] = None
) -> Order:
    """
    Cancel an order.
    
    Args:
        db: Database session
        order: Order to cancel
        reason: Optional cancellation reason
        
    Returns:
        Updated Order object
        
    Raises:
        ValueError: If order is already completed or cancelled
    """
    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise ValueError(f"Cannot cancel order with status {order.status.value}")
    
    order.status = OrderStatus.CANCELLED
    
    # TODO: Store cancellation reason in order metadata
    
    await db.commit()
    await db.refresh(order)
    
    return order


# TODO: Add order time estimation based on queue length
# TODO: Add reorder function to duplicate a previous order
# TODO: Add order rating/review functionality
# TODO: Add scheduled orders (order for later pickup/delivery)
