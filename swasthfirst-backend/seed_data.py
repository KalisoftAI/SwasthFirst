"""
Database seed script for SwasthFirst API.

Seeds the database with:
- Menu items (15 health juices, detox waters, and salads)
- Default superadmin account
- Sample customer accounts for testing

Usage:
    python seed_data.py

WARNING: This will drop all existing tables in development mode.
"""

import asyncio
import os
from dotenv import load_dotenv

# Load environment first
load_dotenv()

from database import engine, Base, AsyncSessionLocal, drop_all_tables
from models import MenuItem, Admin, Customer, AdminRole
from auth import hash_password

# Menu data to seed
MENU_DATA = [
    # JUICES
    {"name": "Amla Juice", "category": "JUICES", "price": 25, "tags": ["Vitamin C", "Immunity"]},
    {"name": "Beetroot Juice", "category": "JUICES", "price": 25, "tags": ["Energy", "Blood Flow"]},
    {"name": "Carrot Juice", "category": "JUICES", "price": 25, "tags": ["Skin", "Vitamin A"]},
    {"name": "Karela Juice", "category": "JUICES", "price": 25, "tags": ["Sugar Control", "Detox"]},
    {"name": "Palak Juice", "category": "JUICES", "price": 25, "tags": ["Iron", "Green Power"]},
    {"name": "Ash Gourd Juice", "category": "JUICES", "price": 25, "tags": ["Cooling", "Weight Loss"]},
    
    # MIX JUICES
    {"name": "ABC Juice", "category": "MIX JUICES", "price": 25, "tags": ["Superfood", "Glow"]},
    {"name": "Amla + Karela", "category": "MIX JUICES", "price": 25, "tags": ["Diabetes Friendly"]},
    {"name": "Beet + Carrot", "category": "MIX JUICES", "price": 25, "tags": ["Stamina"]},
    {"name": "Amla + Palak", "category": "MIX JUICES", "price": 25, "tags": ["Hair Health"]},
    
    # DETOX WATERS
    {"name": "Liver Cleanser", "category": "DETOX WATERS", "price": 10, "tags": ["Hydration", "Flush"]},
    {"name": "Beauty Boost", "category": "DETOX WATERS", "price": 15, "tags": ["Collagen", "Refresh"]},
    {"name": "Kanji Water", "category": "DETOX WATERS", "price": 15, "tags": ["Probiotic", "Digestion"]},
    
    # SALADS
    {"name": "Mix Sprouts Salad", "category": "SALADS", "price": 40, "tags": ["Fiber", "Protein"]},
    {"name": "Paneer+Sprout Salad", "category": "SALADS", "price": 85, "tags": ["High Protein", "Filling"]},
]

# Sample customers for testing
SAMPLE_CUSTOMERS = [
    {"name": "Priya Sharma", "phone": "9876543210", "health_goal": "Detox"},
    {"name": "Rohit Mehta", "phone": "9123456789", "health_goal": "Energy"},
    {"name": "Ananya Joshi", "phone": "9988776655", "health_goal": "Weight Loss"},
]


async def seed_database():
    """
    Main seed function.
    
    Steps:
    1. Drop all tables (dev only)
    2. Create all tables
    3. Seed menu items
    4. Create superadmin
    5. Create sample customers
    """
    print("🌱 Starting database seed...")
    
    # Check environment
    env = os.getenv("ENV", "development")
    
    if env == "production":
        confirm = input("⚠️  You are in PRODUCTION mode. This will DROP ALL TABLES. Type 'YES' to confirm: ")
        if confirm != "YES":
            print("❌ Seed cancelled.")
            return
    
    # Drop and recreate tables
    print("🗑️  Dropping existing tables...")
    await drop_all_tables()
    
    print("🏗️  Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with AsyncSessionLocal() as session:
        try:
            # Seed menu items
            print("🥤 Seeding menu items...")
            for item_data in MENU_DATA:
                menu_item = MenuItem(**item_data)
                session.add(menu_item)
            
            await session.commit()
            print(f"✅ Created {len(MENU_DATA)} menu items")
            
            # Create superadmin
            print("👑 Creating superadmin account...")
            admin = Admin(
                username="swasthAdmin",
                password_hash=hash_password("Admin@1234"),
                role=AdminRole.SUPERADMIN
            )
            session.add(admin)
            await session.commit()
            print("✅ Superadmin created: username=swasthAdmin, password=Admin@1234")
            
            # Create sample customers
            print("👥 Creating sample customers...")
            for customer_data in SAMPLE_CUSTOMERS:
                customer = Customer(
                    name=customer_data["name"],
                    phone=customer_data["phone"],
                    phone_hash=hash_password(customer_data["phone"]),  # Phone is the password
                    health_goal=customer_data.get("health_goal"),
                    is_active=True
                )
                session.add(customer)
            
            await session.commit()
            print(f"✅ Created {len(SAMPLE_CUSTOMERS)} sample customers")
            
            # Print summary
            print("\n" + "="*60)
            print("🎉 Database seed completed successfully!")
            print("="*60)
            print("\n📋 Test Accounts:")
            print("\n🔐 Admin Login:")
            print("   Username: swasthAdmin")
            print("   Password: Admin@1234")
            print("\n👤 Customer Logins (phone is password):")
            for customer_data in SAMPLE_CUSTOMERS:
                print(f"   Name: {customer_data['name']}")
                print(f"   Phone: {customer_data['phone']} (use as password)")
                print()
            
            print("🚀 You can now start the API with: uvicorn main:app --reload")
            print("="*60)
            
        except Exception as e:
            print(f"❌ Error during seed: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
    
    # Close engine
    await engine.dispose()


if __name__ == "__main__":
    # Run the seed function
    asyncio.run(seed_database())
