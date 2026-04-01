"""
Orders router for customer order management.

All endpoints require customer authentication.

Endpoints:
- POST /orders - Create new order
- GET /orders/my-orders - Get customer's order history
- GET /orders/{order_id} - Get specific order details
"""

import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from database import get_db
from models import Customer, Order, MenuItem, OrderStatus
from schemas import OrderCreate, OrderResponse, OrderItemOut
from auth import get_current_customer

router = APIRouter(prefix="/orders", tags=["Orders"])


def generate_order_code() -> str:
    """
    Generate a unique human-readable order code.
    Format: SF-XXXX where X is a random digit.
    
    Returns:
        Order code string (e.g., "SF-4821")
    """
    number = random.randint(1000, 9999)
    return f"SF-{number}"


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Order",
    description="""
    Create a new order for the authenticated customer.
    
    **Important**: Prices are calculated server-side from the database.
    Never trust prices sent from the frontend.
    
    **Validation**:
    - All item IDs must exist and be available
    - Quantities must be between 1-20
    - No duplicate item IDs (use quantity field instead)
    - Maximum 15 different items per order
    
    **Order Code**: A unique code (e.g., "SF-4821") is generated for customer reference.
    """,
    responses={
        201: {"description": "Order created successfully"},
        400: {"description": "Invalid order data"},
        401: {"description": "Not authenticated"},
        404: {"description": "One or more items not found"}
    }
)
async def create_order(
    order_data: OrderCreate,
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new order.
    
    Steps:
    1. Validate all item IDs exist and are available
    2. Calculate total price from database (security measure)
    3. Generate unique order code
    4. Save order to database
    5. Return order details with items
    """
    # Fetch all requested items from database
    item_ids = [item.item_id for item in order_data.items]
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.id.in_(item_ids))
        .where(MenuItem.is_available == True)  # noqa: E712
    )
    menu_items = {item.id: item for item in result.scalars().all()}
    
    # Validate all items exist and are available
    missing_items = set(item_ids) - set(menu_items.keys())
    if missing_items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Items not found or unavailable: {', '.join(map(str, missing_items))}"
        )
    
    # Build order items with server-side pricing (NEVER trust frontend prices)
    order_items = []
    total_amount = 0
    
    for item_input in order_data.items:
        menu_item = menu_items[item_input.item_id]
        subtotal = menu_item.price * item_input.quantity
        
        order_items.append({
            "item_id": menu_item.id,
            "name": menu_item.name,
            "quantity": item_input.quantity,
            "unit_price": menu_item.price,
            "subtotal": subtotal
        })
        
        total_amount += subtotal
    
    # Generate unique order code
    order_code = generate_order_code()
    
    # Check for code collision (rare but possible)
    existing = await db.execute(
        select(Order).where(Order.order_code == order_code)
    )
    if existing.scalar_one_or_none():
        # Generate new code if collision
        order_code = f"SF-{random.randint(1000, 9999)}"
    
    # Create order record
    new_order = Order(
        order_code=order_code,
        customer_id=current_customer.id,
        items=order_items,  # Stored as JSON
        total_amount=total_amount,
        status=OrderStatus.PENDING,
        created_at=datetime.utcnow()
    )
    
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    
    # Build response with customer info
    return OrderResponse(
        id=new_order.id,
        order_code=new_order.order_code,
        customer_id=new_order.customer_id,
        customer_name=current_customer.name,
        customer_phone=current_customer.phone,
        items=[OrderItemOut(**item) for item in new_order.items],
        total_amount=new_order.total_amount,
        status=new_order.status,
        created_at=new_order.created_at,
        completed_at=new_order.completed_at
    )


@router.get(
    "/my-orders",
    response_model=List[OrderResponse],
    summary="Get My Order History",
    description="""
    Retrieve all orders for the authenticated customer.
    
    Orders are returned in reverse chronological order (newest first).
    
    Includes all order statuses: pending, preparing, ready, completed, cancelled.
    """,
    responses={
        200: {"description": "List of customer orders"},
        401: {"description": "Not authenticated"}
    }
)
async def get_customer_orders(
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """
    Get order history for the current customer.
    
    Returns all orders sorted by creation date (newest first).
    """
    result = await db.execute(
        select(Order)
        .where(Order.customer_id == current_customer.id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    
    # Build response with customer info
    return [
        OrderResponse(
            id=order.id,
            order_code=order.order_code,
            customer_id=order.customer_id,
            customer_name=current_customer.name,
            customer_phone=current_customer.phone,
            items=[OrderItemOut(**item) for item in order.items],
            total_amount=order.total_amount,
            status=order.status,
            created_at=order.created_at,
            completed_at=order.completed_at
        )
        for order in orders
    ]


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Get Order Details",
    description="""
    Retrieve details of a specific order.
    
    **Security**: Customers can only access their own orders.
    Attempting to access another customer's order will return 404.
    """,
    responses={
        200: {"description": "Order details"},
        401: {"description": "Not authenticated"},
        404: {"description": "Order not found or access denied"}
    }
)
async def get_order(
    order_id: str,
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """
    Get details of a specific order.
    
    Security: Verifies the order belongs to the authenticated customer.
    """
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .where(Order.customer_id == current_customer.id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or access denied"
        )
    
    return OrderResponse(
        id=order.id,
        order_code=order.order_code,
        customer_id=order.customer_id,
        customer_name=current_customer.name,
        customer_phone=current_customer.phone,
        items=[OrderItemOut(**item) for item in order.items],
        total_amount=order.total_amount,
        status=order.status,
        created_at=order.created_at,
        completed_at=order.completed_at
    )


# TODO: Add WebSocket endpoint for real-time order status updates
# TODO: Add POST /orders/{order_id}/cancel endpoint for customer cancellation
# TODO: Add rating/review functionality after order completion
# TODO: Add reorder endpoint to quickly repeat a previous order
