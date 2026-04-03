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
load_dotenv(dotenv_path='.env.production')

from database import engine, Base, AsyncSessionLocal, drop_all_tables
from models import MenuItem, Admin, Customer, AdminRole
from sqlalchemy import select
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
    {"name": "Jagroop Kaur", "phone": "7387986785", "health_goal": "Detox"},
    {"name": "Srinivas P", "phone": "9860403050", "health_goal": "Energy"},
    {"name": "Bhavesh patil", "phone": "8208004685", "health_goal": "Weight Loss"},
    {"name": "Goutam", "phone": "9764998239", "health_goal": "Energy"},
    {"name": "Snehal Patil", "phone": "9922080986", "health_goal": "Weight Loss"},
    {"name": "Ankita Jain", "phone": "9561328899", "health_goal": "Health"},
    {"name": "Sandhya Pardeshi", "phone": "8550910949", "health_goal": "Fitness"},
    {"name": "Sarika Ranjan", "phone": "7875000168", "health_goal": "Energy"},
    {"name": "Amit Pardeshi", "phone": "7774098478", "health_goal": "Stamina"},
    {"name": "Protika", "phone": "7798933354", "health_goal": "Health"},
    {"name": "Satish", "phone": "9096029994", "health_goal": "Energy"},
    {"name": "Pooja Agrawal", "phone": "9356541963", "health_goal": "Weight Loss"},
    {"name": "Kishori Patil", "phone": "9130399485", "health_goal": "Weight Loss"},
    {"name": "Mayur Sonar", "phone": "9175120610", "health_goal": "Weight Loss"},
    {"name": "Prachee Deshpande", "phone": "8425848529", "health_goal": "Weight Loss"},
    {"name": "Shruti Gandhi", "phone": "9510590135", "health_goal": "Weight Loss"},
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
    allow_destructive_seed = os.getenv("ALLOW_DESTRUCTIVE_SEED", "false").lower() == "true"
    
    if env == "production":
        if allow_destructive_seed:
            print("🗑️  Dropping existing tables in PRODUCTION as ALLOW_DESTRUCTIVE_SEED is true...")
            await drop_all_tables()
        else:
            print("⚠️  Skipping table drop in PRODUCTION. Set ALLOW_DESTRUCTIVE_SEED=true to override.")
    else:
        # In development, we can be more lenient and drop tables.
        print("🗑️  Dropping existing tables in development mode...")
        await drop_all_tables()
    
    print("🏗️  Creating tables...")
    # This is safe to run multiple times. It only creates tables that don't exist.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with AsyncSessionLocal() as session:
        try:
            # Seed menu items
            print("🥤 Seeding menu items...")
            existing_items_q = await session.execute(select(MenuItem.name))
            existing_items = set(existing_items_q.scalars().all())
            new_items = [MenuItem(**item_data) for item_data in MENU_DATA if item_data["name"] not in existing_items]
            
            if new_items:
                session.add_all(new_items)
                await session.commit()
                print(f"✅ Created {len(new_items)} new menu items")
            else:
                print("✅ Menu items are already up to date.")
            
            # Create superadmin
            print("👑 Creating superadmin account...")
            result = await session.execute(select(Admin).where(Admin.username == "swasthAdmin"))
            superadmin = result.scalar_one_or_none()
            if not superadmin:
                admin = Admin(
                    username="swasthAdmin",
                    password_hash=hash_password("Admin@1234"),
                    role=AdminRole.SUPERADMIN
                )
                session.add(admin)
                await session.commit()
                print("✅ Superadmin created: username=swasthAdmin, password=Admin@1234")
            else:
                print("✅ Superadmin 'swasthAdmin' already exists.")
            
            # Create sample customers
            print("👥 Creating sample customers...")
            existing_customers_q = await session.execute(select(Customer.phone))
            existing_customers = set(existing_customers_q.scalars().all())
            new_customers = []
            for cust_data in SAMPLE_CUSTOMERS:
                if cust_data["phone"] not in existing_customers:
                    new_customers.append(Customer(
                        name=cust_data["name"],
                        phone=cust_data["phone"],
                        phone_hash=hash_password(cust_data["phone"]),
                        health_goal=cust_data.get("health_goal"),
                        is_active=True
                    ))
            if new_customers:
                session.add_all(new_customers)
                await session.commit()
                print(f"✅ Created {len(new_customers)} new sample customers")
            else:
                print("✅ Sample customers are already up to date.")
            
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
