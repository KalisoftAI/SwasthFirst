"""
Authentication router for customer login and profile management.

Endpoints:
- POST /auth/login - Customer login with phone-based authentication
- GET /auth/me - Get current customer profile
- POST /auth/update-goal - Update health goal preference
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Customer
from schemas import (
    CustomerLogin, CustomerLoginResponse, CustomerResponse,
    CustomerUpdateGoal, Token
)
from auth import (
    authenticate_customer, create_access_token,
    get_current_customer, ACCESS_TOKEN_EXPIRE_HOURS
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=CustomerLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Customer Login",
    description="""
    Authenticate customer using name and phone number.
    
    **Phone-based authentication**: The phone number acts as both username and password.
    This simplifies access for customers who may not remember complex passwords.
    
    **Security**: Phone numbers are hashed with bcrypt on the server side.
    
    **Note**: Self-registration is disabled. Customers must be added by admin staff.
    If login fails, advise the customer to contact the outlet.
    """,
    responses={
        200: {"description": "Login successful"},
        401: {
            "description": "Authentication failed",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Account not found. Please contact the outlet.",
                        "error_code": "AUTH_FAILED"
                    }
                }
            }
        }
    }
)
async def customer_login(
    credentials: CustomerLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Customer login endpoint.
    
    Validates:
    1. Customer exists with the given phone number
    2. Name matches the stored name (case-insensitive)
    3. Phone number matches the bcrypt hash (phone acts as password)
    4. Account is active
    """
    # Authenticate customer
    customer = await authenticate_customer(
        db=db,
        name=credentials.name,
        phone=credentials.phone
    )
    
    if not customer:
        # Generic error message for security (don't reveal if account exists)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. Please contact the outlet.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": str(customer.id),
            "role": "customer",
            "name": customer.name
        },
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "customer": CustomerResponse.model_validate(customer)
    }


@router.get(
    "/me",
    response_model=CustomerResponse,
    summary="Get Current Customer Profile",
    description="Fetch the profile of the currently authenticated customer.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Not a customer account"}
    }
)
async def get_customer_profile(
    current_customer: Customer = Depends(get_current_customer)
):
    """
    Get current customer's profile information.
    
    Requires valid customer JWT token in Authorization header.
    """
    return CustomerResponse.model_validate(current_customer)


@router.post(
    "/update-goal",
    response_model=CustomerResponse,
    summary="Update Health Goal",
    description="""
    Update the customer's health goal preference.
    
    Health goals help personalize menu recommendations.
    Examples: "Detox", "Energy", "Weight Loss", "Immunity"
    """,
    responses={
        401: {"description": "Not authenticated"}
    }
)
async def update_health_goal(
    goal_update: CustomerUpdateGoal,
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """
    Update customer's health goal.
    
    This allows customers to change their preference without recreating their account.
    """
    # Update health goal
    current_customer.health_goal = goal_update.health_goal
    
    # Commit to database
    await db.commit()
    await db.refresh(current_customer)
    
    return CustomerResponse.model_validate(current_customer)


# TODO: Add POST /auth/refresh endpoint for token refresh without re-login
# TODO: Add POST /auth/logout endpoint with token blacklist
# TODO: Add POST /auth/request-otp for SMS verification (first login only)
# TODO: Add POST /auth/verify-otp to complete OTP-based authentication
