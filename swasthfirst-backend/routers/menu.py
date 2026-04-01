"""
Menu router for product catalog endpoints.

All endpoints are public (no authentication required) to allow browsing before login.

Endpoints:
- GET /menu - Get all available menu items
- GET /menu/categories - Get items grouped by category
- GET /menu/{item_id} - Get single menu item details
"""

from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from collections import defaultdict

from database import get_db
from models import MenuItem
from schemas import MenuItemResponse, MenuByCategory

router = APIRouter(prefix="/menu", tags=["Menu"])


@router.get(
    "",
    response_model=List[MenuItemResponse],
    summary="Get All Menu Items",
    description="""
    Retrieve all available menu items.
    
    **Public endpoint** - No authentication required.
    
    Only returns items where `is_available=True`.
    Items are returned in order by category, then by ID.
    """,
    responses={
        200: {
            "description": "List of available menu items",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": 1,
                            "name": "Amla Juice",
                            "category": "JUICES",
                            "price": 25,
                            "tags": ["Vitamin C", "Immunity"],
                            "is_available": True
                        }
                    ]
                }
            }
        }
    }
)
async def get_menu(db: AsyncSession = Depends(get_db)):
    """
    Get all available menu items.
    
    Returns only items marked as available for ordering.
    """
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.is_available == True)  # noqa: E712
        .order_by(MenuItem.category, MenuItem.id)
    )
    items = result.scalars().all()
    
    return [MenuItemResponse.model_validate(item) for item in items]


@router.get(
    "/categories",
    response_model=List[MenuByCategory],
    summary="Get Menu Grouped by Category",
    description="""
    Retrieve menu items organized by category.
    
    **Public endpoint** - No authentication required.
    
    Returns a list where each element contains:
    - category: Category name (e.g., "JUICES", "SALADS")
    - items: List of menu items in that category
    
    Useful for frontend display with category sections.
    """,
    responses={
        200: {
            "description": "Menu items grouped by category",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "category": "JUICES",
                            "items": [
                                {
                                    "id": 1,
                                    "name": "Amla Juice",
                                    "category": "JUICES",
                                    "price": 25,
                                    "tags": ["Vitamin C", "Immunity"],
                                    "is_available": True
                                }
                            ]
                        }
                    ]
                }
            }
        }
    }
)
async def get_menu_by_category(db: AsyncSession = Depends(get_db)):
    """
    Get menu items grouped by category.
    
    Organizes items into category groups for easier frontend rendering.
    """
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.is_available == True)  # noqa: E712
        .order_by(MenuItem.category, MenuItem.id)
    )
    items = result.scalars().all()
    
    # Group by category
    grouped: Dict[str, List[MenuItem]] = defaultdict(list)
    for item in items:
        grouped[item.category].append(item)
    
    # Convert to response format
    response = [
        MenuByCategory(
            category=category,
            items=[MenuItemResponse.model_validate(item) for item in items_list]
        )
        for category, items_list in grouped.items()
    ]
    
    return response


@router.get(
    "/{item_id}",
    response_model=MenuItemResponse,
    summary="Get Menu Item by ID",
    description="""
    Retrieve details of a specific menu item.
    
    **Public endpoint** - No authentication required.
    """,
    responses={
        200: {"description": "Menu item details"},
        404: {"description": "Menu item not found"}
    }
)
async def get_menu_item(
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single menu item by ID.
    
    Returns 404 if item doesn't exist or is not available.
    """
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.id == item_id)
        .where(MenuItem.is_available == True)  # noqa: E712
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item with ID {item_id} not found or not available"
        )
    
    return MenuItemResponse.model_validate(item)


# TODO: Add menu item search endpoint with filters (category, tags, price range)
# TODO: Add /menu/featured endpoint for promotional items
# TODO: Add /menu/recommendations endpoint based on customer health goal
# TODO: Add image URLs to menu items (S3/Cloudinary integration)
