"""
Admin service with business logic for admin operations and analytics.

Contains helper functions for dashboard metrics, reports, and data exports.
"""

from datetime import date, datetime, timedelta
from typing import List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract

from models import Order, Customer, MenuItem, OrderStatus


async def get_daily_revenue(
    db: AsyncSession,
    target_date: date
) -> int:
    """
    Calculate total revenue for a specific date.
    
    Args:
        db: Database session
        target_date: Date to calculate revenue for
        
    Returns:
        Total revenue in rupees
    """
    result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0))
        .where(func.date(Order.created_at) == target_date)
        .where(Order.status != OrderStatus.CANCELLED)
    )
    return result.scalar()


async def get_daily_order_count(
    db: AsyncSession,
    target_date: date
) -> int:
    """
    Count orders for a specific date.
    
    Args:
        db: Database session
        target_date: Date to count orders for
        
    Returns:
        Number of orders
    """
    result = await db.execute(
        select(func.count(Order.id))
        .where(func.date(Order.created_at) == target_date)
    )
    return result.scalar()


async def get_top_customers_by_spending(
    db: AsyncSession,
    limit: int = 10
) -> List[Tuple[Customer, int, int]]:
    """
    Get top customers by total spending.
    
    Args:
        db: Database session
        limit: Number of customers to return
        
    Returns:
        List of (Customer, order_count, total_spent) tuples
    """
    result = await db.execute(
        select(
            Customer,
            func.count(Order.id).label('order_count'),
            func.sum(Order.total_amount).label('total_spent')
        )
        .join(Order, Order.customer_id == Customer.id)
        .group_by(Customer.id)
        .order_by(func.sum(Order.total_amount).desc())
        .limit(limit)
    )
    
    return [(row.Customer, row.order_count, row.total_spent) for row in result.all()]


async def get_top_items_by_date(
    db: AsyncSession,
    target_date: date,
    limit: int = 10
) -> List[Dict[str, any]]:
    """
    Get top selling items for a specific date.
    
    Args:
        db: Database session
        target_date: Date to analyze
        limit: Number of items to return
        
    Returns:
        List of dicts with item_id, name, quantity_sold, revenue
    """
    # Fetch all orders for the date
    result = await db.execute(
        select(Order)
        .where(func.date(Order.created_at) == target_date)
        .where(Order.status != OrderStatus.CANCELLED)
    )
    orders = result.scalars().all()
    
    # Aggregate item statistics
    item_stats: Dict[int, Dict] = {}
    
    for order in orders:
        for item in order.items:
            item_id = item['item_id']
            if item_id not in item_stats:
                item_stats[item_id] = {
                    'item_id': item_id,
                    'name': item['name'],
                    'quantity_sold': 0,
                    'revenue': 0
                }
            
            item_stats[item_id]['quantity_sold'] += item['quantity']
            item_stats[item_id]['revenue'] += item['subtotal']
    
    # Sort by quantity and return top N
    sorted_items = sorted(
        item_stats.values(),
        key=lambda x: x['quantity_sold'],
        reverse=True
    )
    
    return sorted_items[:limit]


async def get_orders_by_hour_distribution(
    db: AsyncSession,
    target_date: date
) -> Dict[int, int]:
    """
    Get distribution of orders by hour of day.
    
    Args:
        db: Database session
        target_date: Date to analyze
        
    Returns:
        Dictionary mapping hour (0-23) to order count
    """
    result = await db.execute(
        select(
            extract('hour', Order.created_at).label('hour'),
            func.count(Order.id).label('count')
        )
        .where(func.date(Order.created_at) == target_date)
        .group_by('hour')
    )
    
    distribution = {int(row.hour): row.count for row in result.all()}
    
    # Fill in missing hours with 0
    for hour in range(24):
        if hour not in distribution:
            distribution[hour] = 0
    
    return distribution


async def get_weekly_summary(
    db: AsyncSession,
    start_date: date,
    end_date: date
) -> Dict[str, any]:
    """
    Get summary statistics for a week or date range.
    
    Args:
        db: Database session
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        
    Returns:
        Dictionary with total_orders, total_revenue, avg_order_value, etc.
    """
    result = await db.execute(
        select(
            func.count(Order.id).label('total_orders'),
            func.sum(Order.total_amount).label('total_revenue'),
            func.avg(Order.total_amount).label('avg_order_value')
        )
        .where(
            and_(
                func.date(Order.created_at) >= start_date,
                func.date(Order.created_at) <= end_date
            )
        )
        .where(Order.status != OrderStatus.CANCELLED)
    )
    
    stats = result.first()
    
    return {
        'total_orders': stats.total_orders or 0,
        'total_revenue': int(stats.total_revenue or 0),
        'avg_order_value': int(stats.avg_order_value or 0),
        'date_range': f"{start_date} to {end_date}"
    }


async def get_customer_retention_rate(
    db: AsyncSession,
    days: int = 30
) -> Dict[str, any]:
    """
    Calculate customer retention metrics.
    
    Args:
        db: Database session
        days: Number of days to look back
        
    Returns:
        Dictionary with retention statistics
    """
    cutoff_date = date.today() - timedelta(days=days)
    
    # Customers who ordered in the period
    result = await db.execute(
        select(func.count(func.distinct(Order.customer_id)))
        .where(func.date(Order.created_at) >= cutoff_date)
    )
    active_customers = result.scalar()
    
    # Customers with more than one order in the period
    result = await db.execute(
        select(
            Order.customer_id,
            func.count(Order.id).label('order_count')
        )
        .where(func.date(Order.created_at) >= cutoff_date)
        .group_by(Order.customer_id)
        .having(func.count(Order.id) > 1)
    )
    repeat_customers = len(result.all())
    
    retention_rate = (repeat_customers / active_customers * 100) if active_customers > 0 else 0
    
    return {
        'active_customers': active_customers,
        'repeat_customers': repeat_customers,
        'retention_rate': round(retention_rate, 2),
        'period_days': days
    }


# TODO: Add predictive analytics for inventory management
# TODO: Add customer lifetime value (CLV) calculation
# TODO: Add peak hours detection for staff scheduling
# TODO: Add A/B testing metrics for menu changes
