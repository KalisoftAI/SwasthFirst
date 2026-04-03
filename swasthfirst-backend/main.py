"""
SwasthFirst API - Main Application

Production-ready FastAPI backend for health juice bar order management system.

Features:
- Phone-based customer authentication
- Admin dashboard with analytics
- Order management with status tracking
- Menu catalog with categorization
- Rate limiting and security measures
- Database migrations support (Alembic)

Author: SwasthFirst Team
Version: 1.0.0
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv

from database import engine, init_db
from middleware.rate_limiter import RateLimitMiddleware
from routers import auth, menu, orders, admin
from schemas import HealthResponse, ErrorResponse
from seed_data import seed_database

# Load environment variables
load_dotenv()
ADMIN_SECRET = os.getenv("ADMIN_SECRET")

# Environment configuration
ENV = os.getenv("ENV", "development")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    
    Handles startup and shutdown events:
    - Startup: Initialize database tables (dev only)
    - Shutdown: Close database connections
    """
    # Startup
    print("🚀 Starting SwasthFirst API...")
    print(f"📦 Environment: {ENV}")
    print(f"🔒 CORS Origins: {CORS_ORIGINS}")
    
    # Initialize database tables in development
    if ENV == "development":
        print("🔧 Development mode: Initializing database...")
        await init_db()
    else:
        print("⚠️  Production mode: Use Alembic migrations for database setup")
    
    print("✅ SwasthFirst API is ready!")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down SwasthFirst API...")
    await engine.dispose()
    print("👋 Goodbye!")


# Create FastAPI application
app = FastAPI(
    title="SwasthFirst API",
    description="""
    **SwasthFirst** - Health juice bar order management system.
    
    ## Features
    
    - 📱 **Phone-based auth** - Simple login using phone number
    - 🥤 **Menu management** - Categorized product catalog
    - 📦 **Order tracking** - Real-time order status updates
    - 📊 **Admin dashboard** - Analytics and customer management
    - 🔒 **Security** - Rate limiting, JWT auth, RBAC
    - 📈 **Analytics** - Sales reports and customer insights
    
    ## Authentication
    
    - **Customer**: Use phone number as both username and password
    - **Admin**: Separate credentials with role-based access
    
    All protected endpoints require JWT Bearer token in Authorization header.
    """,
    version="1.0.0",
    contact={
        "name": "SwasthFirst Support",
        "email": "support@swasthfirst.com",
    },
    license_info={
        "name": "Proprietary",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ============================================================================
# MIDDLEWARE
# ============================================================================

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # For CSV downloads
)

# Rate limiting middleware
app.add_middleware(RateLimitMiddleware)


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors with detailed messages.
    
    Returns a 422 status with specific field errors.
    """
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        errors.append(f"{field}: {message}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": errors
        }
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    """
    Handle database integrity errors (unique constraints, foreign keys).
    
    Returns a 409 Conflict status.
    """
    error_message = str(exc.orig)
    
    # Parse common constraint violations
    if "unique constraint" in error_message.lower():
        if "phone" in error_message.lower():
            detail = "Phone number already exists"
        elif "username" in error_message.lower():
            detail = "Username already exists"
        elif "order_code" in error_message.lower():
            detail = "Order code collision (please retry)"
        else:
            detail = "Duplicate entry detected"
    elif "foreign key" in error_message.lower():
        detail = "Referenced record not found"
    else:
        detail = "Database integrity error"
    
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "detail": detail,
            "error_code": "INTEGRITY_ERROR"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler for unexpected errors.
    
    Logs the error and returns a generic 500 response.
    """
    print(f"❌ Unexpected error: {exc}")
    
    # In production, log to monitoring service (Sentry, CloudWatch, etc.)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Please try again later.",
            "error_code": "INTERNAL_ERROR"
        }
    )


# ============================================================================
# ROUTERS
# ============================================================================

# Include all routers with /api/v1 prefix for versioning
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(menu.router, prefix="/api/v1", tags=["Menu"])
app.include_router(orders.router, prefix="/api/v1", tags=["Orders"])
app.include_router(admin.router, prefix="/api/v1", tags=["Admin"])


# ============================================================================
# ROOT ENDPOINTS
# ============================================================================

@app.get(
    "/",
    summary="API Root",
    description="Welcome endpoint with API information",
    tags=["Root"]
)
async def root():
    """
    API root endpoint.
    
    Returns basic information about the API.
    """
    return {
        "message": "Welcome to SwasthFirst API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/health",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Check if the API is running and healthy",
    tags=["Root"]
)
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        Status and timestamp
    """
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc),
        version="1.0.0"
    )


@app.post(
    "/init-db",
    summary="Initialize Database",
    description="Create database tables and seed initial data",
    tags=["Root"]
)
async def initialize_database(secret: str | None = None):
    """
    Initialize database tables and seed with data.
    
    This endpoint:
    1. Creates all database tables
    2. Seeds menu items (15 items)
    3. Creates superadmin account
    4. Creates sample customers (12 customers)
    
    ⚠️  Warning: Use only once during first setup. Safe to run multiple times.
    
    Returns:
        Success message with data summary
    """
    try:
        if ENV == "production":
            if not ADMIN_SECRET or secret != ADMIN_SECRET:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"status": "error", "message": "Not authorized"}
                )

        print("🌱 Starting database initialization...")
        
        # Initialize database tables
        await init_db()
        
        # Seed database with data
        await seed_database()
        
        return {
            "status": "success",
            "message": "Database initialized and seeded successfully!",
            "summary": {
                "tables_created": ["customers", "admins", "menu_items", "orders"],
                "menu_items_seeded": 15,
                "sample_customers": 12,
                "superadmin": {
                    "username": "swasthAdmin",
                    "password": "Admin@1234 (CHANGE THIS IN PRODUCTION)"
                }
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "next_steps": [
                "Test login with superadmin credentials",
                "Verify menu items are available at /api/v1/menu",
                "Try customer login with phone: 7387986785"
            ]
        }
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": f"Database initialization failed: {str(e)}"
            }
        )


# ============================================================================
# APPLICATION STARTUP MESSAGE
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║           🌿 SwasthFirst API v1.0.0 🌿                    ║
    ║                                                           ║
    ║   Health Juice Bar Order Management System                ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Get port from environment variable, default to 8000 for local dev.
    # This is crucial for platforms like Cloud Run that set the PORT dynamically.
    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=ENV == "development",
        log_level="info"
    )


# TODO: Add Prometheus metrics endpoint for monitoring
# TODO: Add Sentry integration for error tracking
# TODO: Add WebSocket support for real-time order updates
# TODO: Add GraphQL endpoint as alternative to REST
# TODO: Add API versioning strategy (v2, v3) for breaking changes
