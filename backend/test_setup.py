"""
Simple test script to verify MongoDB connection and API setup
"""

from app.database import db, requests_collection
from pymongo.errors import ConnectionFailure


def test_mongodb_connection():
    """Test MongoDB connection"""
    print("🔍 Testing MongoDB connection...")
    try:
        # Attempt to connect
        db.client.admin.command('ping')
        print("✅ MongoDB connection successful!")
        return True
    except ConnectionFailure as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False


def test_database_collections():
    """Test database collections"""
    print("\n🔍 Testing database collections...")
    try:
        # List all collections
        collections = db.list_collection_names()
        print(f"📁 Available collections: {collections}")
        
        # Check if requests collection exists
        if "requests" in collections:
            count = requests_collection.count_documents({})
            print(f"✅ Requests collection exists with {count} documents")
        else:
            print("⚠️  Requests collection not found (will be created on first insert)")
        
        return True
    except Exception as e:
        print(f"❌ Error accessing collections: {e}")
        return False


def test_indexes():
    """Test database indexes"""
    print("\n🔍 Testing database indexes...")
    try:
        indexes = list(requests_collection.list_indexes())
        print(f"📊 Indexes found: {len(indexes)}")
        for index in indexes:
            print(f"   - {index['name']}: {index.get('key', {})}")
        return True
    except Exception as e:
        print(f"❌ Error checking indexes: {e}")
        return False


def run_all_tests():
    """Run all tests"""
    print("=" * 50)
    print("🚀 Starting Database Tests")
    print("=" * 50)
    
    results = []
    results.append(("MongoDB Connection", test_mongodb_connection()))
    results.append(("Database Collections", test_database_collections()))
    results.append(("Database Indexes", test_indexes()))
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary")
    print("=" * 50)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n✨ All tests passed! Your database is ready to use.")
        print("\n💡 Next steps:")
        print("   1. Run: python seed_data.py (to add sample data)")
        print("   2. Start backend: uvicorn app.main:app --reload")
        print("   3. Start frontend: cd frontend && npm start")
    else:
        print("\n⚠️  Some tests failed. Please check your MongoDB connection.")
        print("\n💡 Troubleshooting:")
        print("   1. Ensure MongoDB is running")
        print("   2. Check .env file for correct connection string")
        print("   3. Verify MongoDB service is started")


if __name__ == "__main__":
    run_all_tests()
