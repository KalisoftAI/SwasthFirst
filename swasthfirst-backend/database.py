"""
Database configuration and session management for SwasthFirst API.

This module provides the SQLAlchemy async engine, session factory, and base model
for all database operations. Uses asyncpg for PostgreSQL connections.
"""

import os
from typing import AsyncGenerator
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = None
connect_args = {}

if DATABASE_URL:
    url = make_url(DATABASE_URL)

    # Ensure the driver is explicitly set to asyncpg for asyncio support.
    if url.drivername == "postgresql":
        url = url.set(drivername="postgresql+asyncpg")

    # The 'sslmode' parameter is not supported by the asyncpg driver.
    # We need to remove it from the URL and add a corresponding 'ssl'
    # argument to connect_args for asyncpg.
    if url.drivername.startswith("postgresql") and "sslmode" in url.query:
        if url.query['sslmode'] in ('require', 'verify-ca', 'verify-full'):
            connect_args["ssl"] = True
        
        # Create a new URL object without the 'sslmode' parameter
        url = url.set(query={k: v for k, v in url.query.items() if k != 'sslmode'})

    engine = create_async_engine(
        url,
        connect_args=connect_args,
        echo=os.getenv("ENV") == "development",  # Log SQL queries in development
        future=True,
        pool_pre_ping=True,  # Verify connections before using them
    )
else:
    print("DATABASE_URL is not set. Database engine not created.")

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
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
        except Exception as e:
            await session.rollback()
            raise e


async def init_db():
    """
    Initialize database tables. 
    
    WARNING: Only use in development. In production, use Alembic migrations.
    This will create all tables defined in models.py.
    """
    if not engine:
        print("ERROR: Database engine is not initialized. Cannot create tables.")
        return
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
    if not engine:
        print("ERROR: Database engine is not initialized. Cannot drop tables.")
        return
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        print("🗑️  All tables dropped")
