"""
Database configuration and session management for SwasthFirst API.

This module provides the SQLAlchemy async engine, session factory, and base model
for all database operations. Uses asyncpg for PostgreSQL connections.
"""

import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/swasthfirst")

# Parse and clean the database URL
def get_clean_database_url():
    """
    Parse database URL and remove channel_binding parameter.
    Keep sslmode=require for Neon, but remove channel_binding which asyncpg doesn't support.
    """
    url = DATABASE_URL
    
    # Convert postgresql:// to postgresql+asyncpg://
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Remove ONLY channel_binding parameter, keep sslmode
    # Neon URLs have ?sslmode=require&channel_binding=require
    # Keep sslmode, remove channel_binding
    url = url.replace("&channel_binding=require", "")
    url = url.replace("?channel_binding=require&", "?")
    url = url.replace("?channel_binding=require", "")
    
    return url

ASYNC_DATABASE_URL = get_clean_database_url()

# Create async engine with SSL support for Neon
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=os.getenv("ENV") == "development",  # Log SQL queries in development
    future=True,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=10,
    max_overflow=20,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# Base class for all models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for FastAPI endpoints to get database session.
    
    Yields:
        AsyncSession: Database session that automatically closes after use.
        
    Example:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    Initialize database tables. 
    
    WARNING: Only use in development. In production, use Alembic migrations.
    This will create all tables defined in models.py.
    """
    async with engine.begin() as conn:
        # Import models to register them with Base
        from models import Customer, Admin, MenuItem, Order  # noqa: F401
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")


async def drop_all_tables():
    """
    Drop all database tables.
    
    WARNING: DESTRUCTIVE OPERATION. Only use in development for testing.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        print("🗑️  All tables dropped")
