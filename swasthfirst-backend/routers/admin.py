"""
Admin router for management dashboard endpoints.

All endpoints require admin authentication with role-based access control (RBAC).

Endpoints:
- POST /admin/login - Admin authentication
- GET /admin/customers - List customers with pagination and search
- POST /admin/customers - Create new customer (superadmin only)
- GET /admin/orders - List orders with filters
- PATCH /admin/orders/{order_id}/status - Update order status
- GET /admin/analytics - Dashboard analytics data
- GET /admin/export-orders - Export orders to CSV
"""

from datetime import datetime, timedelta, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract, desc
from sqlalchemy.orm import selectinload
import math
import io

from database import get_db
from models import Customer, Admin, Order, MenuItem, OrderStatus
from schemas import (
    AdminLogin, AdminLoginResponse, AdminResponse,
    CustomerCreate, CustomerStats, OrderResponse, OrderItemOut,
    OrderStatusUpdate, AnalyticsResponse, TopItem, OrdersByHour,
    PaginatedResponse
)
from auth import (
    authenticate_admin, create_access_token, get_current_admin,
    require_superadmin, hash_password, ADMIN_TOKEN_EXPIRE_HOURS
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post(
    "/login",
    response_model=AdminLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin Login",
    description="""
    Authenticate admin user with username and password.
    
    **Separate from customer authentication** - uses different credentials and JWT role.
    
    Returns a JWT token with shorter expiration (8 hours by default).
    """,
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Invalid credentials"}
    }
)
async def admin_login(
    credentials: AdminLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Admin login endpoint.
    
    Validates username and password against the admins table.
    Updates last_login timestamp on successful authentication.
    """
    # Authenticate admin
    admin = await authenticate_admin(
        db=db,
        username=credentials.username,
        password=credentials.password
    )
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token with admin role
    access_token = create_access_token(
        data={
            "sub": str(admin.id),
            "role": admin.role.value,  # "manager" or "superadmin"
            "name": admin.username
        },
        expires_delta=timedelta(hours=ADMIN_TOKEN_EXPIRE_HOURS)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": AdminResponse.model_validate(admin)
    }


@router.get(
    "/customers",
    summary="List Customers",
    description="""
    Get paginated list of customers with order statistics.
    
    **Requires**: Admin authentication
    
    **Query Parameters**:
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    - search: Search by name or phone (optional)
    
    Returns customer details along with:
    - order_count: Total number of orders
    - total_spent: Lifetime spending amount
    - last_order_at: Date of most recent order
    """,
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Not an admin account"}
    }
)
async def list_customers(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or phone"),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all customers with order statistics and pagination.
    
    Includes search functionality for name and phone number.
    """
    # Build base query
    query = select(Customer)
    
    # Apply search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Customer.name.ilike(search_pattern)) |
            (Customer.phone.ilike(search_pattern))
        )
    
    # Count total customers
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar()
    
    # Get paginated customers
    query = query.order_by(Customer.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    customers = result.scalars().all()
    
    # Get order statistics for each customer
    customer_stats = []
    for customer in customers:
        # Get order count and total spent
        stats_result = await db.execute(
            select(
                func.count(Order.id).label('order_count'),
                func.coalesce(func.sum(Order.total_amount), 0).label('total_spent'),
                func.max(Order.created_at).label('last_order_at')
            ).where(Order.customer_id == customer.id)
        )
        stats = stats_result.first()
        
        customer_stats.append(CustomerStats(
            id=customer.id,
            name=customer.name,
            phone=customer.phone,
            health_goal=customer.health_goal,
            order_count=stats.order_count,
            total_spent=stats.total_spent,
            last_order_at=stats.last_order_at,
            created_at=customer.created_at
        ))
    
    # Calculate pagination info
    total_pages = math.ceil(total / limit)
    
    return PaginatedResponse(
        items=customer_stats,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.post(
    "/customers",
    response_model=CustomerStats,
    status_code=status.HTTP_201_CREATED,
    summary="Create Customer",
    description="""
    Create a new customer account.
    
    **Requires**: Superadmin role
    
    **Note**: This is the ONLY way to register a new customer.
    Self-registration is disabled for security.
    
    Phone number will be hashed and used as the customer's password.
    """,
    responses={
        201: {"description": "Customer created"},
        403: {"description": "Superadmin access required"},
        409: {"description": "Phone number already exists"}
    }
)
async def create_customer(
    customer_data: CustomerCreate,
    admin: Admin = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new customer account (superadmin only).
    
    The phone number is hashed with bcrypt and stored as the password.
    """
    # Check if phone already exists
    existing = await db.execute(
        select(Customer).where(Customer.phone == customer_data.phone)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Customer with phone {customer_data.phone} already exists"
        )
    
    # Create new customer with hashed phone as password
    new_customer = Customer(
        name=customer_data.name,
        phone=customer_data.phone,
        phone_hash=hash_password(customer_data.phone),
        health_goal=customer_data.health_goal,
        is_active=True
    )
    
    db.add(new_customer)
    await db.commit()
    await db.refresh(new_customer)
    
    # Return with initial stats (0 orders)
    return CustomerStats(
        id=new_customer.id,
        name=new_customer.name,
        phone=new_customer.phone,
        health_goal=new_customer.health_goal,
        order_count=0,
        total_spent=0,
        last_order_at=None,
        created_at=new_customer.created_at
    )


@router.get(
    "/orders",
    summary="List Orders",
    description="""
    Get paginated list of orders with filters.
    
    **Requires**: Admin authentication
    
    **Query Parameters**:
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    - date: Filter by date (YYYY-MM-DD format, optional)
    - status: Filter by status (optional)
    
    Returns orders with full customer and item details.
    """,
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Not an admin account"}
    }
)
async def list_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    date_filter: Optional[str] = Query(None, alias="date", description="Filter by date (YYYY-MM-DD)"),
    status_filter: Optional[OrderStatus] = Query(None, alias="status", description="Filter by status"),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all orders with pagination and filters.
    
    Admins can filter by date and status to find specific orders.
    """
    # Build base query with customer join
    query = select(Order).options(selectinload(Order.customer))
    
    # Apply date filter
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.where(
                func.date(Order.created_at) == filter_date
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    # Apply status filter
    if status_filter:
        query = query.where(Order.status == status_filter)
    
    # Count total orders
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar()
    
    # Get paginated orders
    query = query.order_by(Order.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    orders = result.scalars().all()
    
    # Build response with customer info
    order_responses = [
        OrderResponse(
            id=order.id,
            order_code=order.order_code,
            customer_id=order.customer_id,
            customer_name=order.customer.name,
            customer_phone=order.customer.phone,
            items=[OrderItemOut(**item) for item in order.items],
            total_amount=order.total_amount,
            status=order.status,
            created_at=order.created_at,
            completed_at=order.completed_at
        )
        for order in orders
    ]
    
    # Calculate pagination info
    total_pages = math.ceil(total / limit)
    
    return PaginatedResponse(
        items=order_responses,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.patch(
    "/orders/{order_id}/status",
    response_model=OrderResponse,
    summary="Update Order Status",
    description="""
    Update the status of an order.
    
    **Requires**: Admin authentication
    
    **Order Lifecycle**:
    - pending → preparing → ready → completed
    - Any status → cancelled
    
    When status is set to "completed", the completed_at timestamp is automatically set.
    """,
    responses={
        200: {"description": "Status updated"},
        404: {"description": "Order not found"}
    }
)
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update order status (admin only).
    
    Automatically sets completed_at timestamp when status is "completed".
    """
    # Fetch order with customer
    result = await db.execute(
        select(Order).options(selectinload(Order.customer))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found"
        )
    
    # Update status
    order.status = status_update.status
    
    # Set completed_at if status is completed
    if status_update.status == OrderStatus.COMPLETED and not order.completed_at:
        order.completed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(order)
    
    # TODO: Send WebSocket notification to customer about status change
    
    return OrderResponse(
        id=order.id,
        order_code=order.order_code,
        customer_id=order.customer_id,
        customer_name=order.customer.name,
        customer_phone=order.customer.phone,
        items=[OrderItemOut(**item) for item in order.items],
        total_amount=order.total_amount,
        status=order.status,
        created_at=order.created_at,
        completed_at=order.completed_at
    )


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    summary="Dashboard Analytics",
    description="""
    Get analytics data for the admin dashboard.
    
    **Requires**: Admin authentication
    
    Returns:
    - Total orders today
    - Revenue today
    - Total customer count
    - Top 5 selling items today (by count and revenue)
    - Orders by hour for today (0-23)
    
    All date-based metrics use the current server date.
    """,
    responses={
        401: {"description": "Not authenticated"}
    }
)
async def get_analytics(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dashboard analytics for today.
    
    Provides key metrics for the admin dashboard overview.
    """
    today = date.today()
    
    # Total orders today
    orders_today_result = await db.execute(
        select(func.count(Order.id))
        .where(func.date(Order.created_at) == today)
    )
    total_orders_today = orders_today_result.scalar()
    
    # Revenue today
    revenue_today_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0))
        .where(func.date(Order.created_at) == today)
    )
    revenue_today = revenue_today_result.scalar()
    
    # Total customers (all time)
    customers_result = await db.execute(
        select(func.count(Customer.id))
    )
    total_customers = customers_result.scalar()
    
    # Top 5 items today
    # Get all orders from today
    orders_today_result = await db.execute(
        select(Order)
        .where(func.date(Order.created_at) == today)
    )
    orders_today = orders_today_result.scalars().all()
    
    # Aggregate items
    item_stats = {}
    for order in orders_today:
        for item in order.items:
            item_id = item['item_id']
            if item_id not in item_stats:
                item_stats[item_id] = {
                    'name': item['name'],
                    'count': 0,
                    'revenue': 0
                }
            item_stats[item_id]['count'] += item['quantity']
            item_stats[item_id]['revenue'] += item['subtotal']
    
    # Sort by count and get top 5
    top_items = sorted(
        [
            TopItem(
                item_id=item_id,
                name=stats['name'],
                count=stats['count'],
                revenue=stats['revenue']
            )
            for item_id, stats in item_stats.items()
        ],
        key=lambda x: x.count,
        reverse=True
    )[:5]
    
    # Orders by hour today
    orders_by_hour_result = await db.execute(
        select(
            extract('hour', Order.created_at).label('hour'),
            func.count(Order.id).label('count')
        )
        .where(func.date(Order.created_at) == today)
        .group_by('hour')
        .order_by('hour')
    )
    
    orders_by_hour = [
        OrdersByHour(hour=int(row.hour), count=row.count)
        for row in orders_by_hour_result.all()
    ]
    
    return AnalyticsResponse(
        total_orders_today=total_orders_today,
        revenue_today=revenue_today,
        total_customers=total_customers,
        top_items=top_items,
        orders_by_hour=orders_by_hour
    )


@router.get(
    "/export-orders",
    summary="Export Orders to CSV",
    description="""
    Download orders as a CSV file.
    
    **Requires**: Admin authentication
    
    **Query Parameters**:
    - date: Export date (YYYY-MM-DD, defaults to today)
    
    CSV columns: Order ID, Customer Name, Phone, Items, Total (₹), Status, Timestamp
    """,
    responses={
        200: {
            "description": "CSV file download",
            "content": {"text/csv": {}}
        }
    }
)
async def export_orders_csv(
    date_filter: Optional[str] = Query(None, alias="date", description="Date to export (YYYY-MM-DD)"),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Export orders to CSV file.
    
    Generates a CSV file with order details for the specified date.
    """
    # Default to today if no date provided
    if date_filter:
        try:
            export_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    else:
        export_date = date.today()
    
    # Fetch orders for the date
    result = await db.execute(
        select(Order).options(selectinload(Order.customer))
        .where(func.date(Order.created_at) == export_date)
        .order_by(Order.created_at.asc())
    )
    orders = result.scalars().all()
    
    # Generate CSV content
    csv_content = io.StringIO()
    
    # Write header
    csv_content.write("Order ID,Customer Name,Phone,Items,Total (₹),Status,Timestamp\n")
    
    # Write data rows
    for order in orders:
        # Format items as "2x Amla Juice, 1x Karela Juice"
        items_str = ", ".join([
            f"{item['quantity']}x {item['name']}"
            for item in order.items
        ])
        
        # Escape quotes in strings
        items_str = items_str.replace('"', '""')
        customer_name = order.customer.name.replace('"', '""')
        
        csv_content.write(
            f'"{order.order_code}","{customer_name}",{order.customer.phone},'
            f'"{items_str}",{order.total_amount},{order.status.value},'
            f'{order.created_at.strftime("%Y-%m-%d %H:%M:%S")}\n'
        )
    
    # Prepare filename
    filename = f"swasthfirst_orders_{export_date.strftime('%Y-%m-%d')}.csv"
    
    # Return as streaming response
    csv_content.seek(0)
    return StreamingResponse(
        iter([csv_content.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# TODO: Add audit log table to track all admin actions
# TODO: Add DELETE /admin/orders/{order_id} for superadmin
# TODO: Add PATCH /admin/customers/{customer_id} to update customer details
# TODO: Add multi-outlet support with outlet_id filter
# TODO: Add more detailed analytics (weekly/monthly reports, customer retention)
