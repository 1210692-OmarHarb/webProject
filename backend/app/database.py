from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "cst_db")

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

# Collections
requests_collection = db["service_requests"]  # Main collection per spec
categories_collection = db["categories"]
users_collection = db["users"]
citizens_collection = db["citizens"]  # Module 2: Citizen profiles
performance_logs_collection = db["performance_logs"]
geo_feeds_collection = db["geo_feeds"]
comments_collection = db["comments"]  # Module 2: Threaded comments
ratings_collection = db["ratings"]  # Module 2: Citizen ratings
service_agents_collection = db["service_agents"]  # Module 3: Agents & Teams

# Create indexes for service_requests
requests_collection.create_index([("location", "2dsphere")])
requests_collection.create_index("status")
requests_collection.create_index("category")
requests_collection.create_index("request_id")
requests_collection.create_index("timestamps.created_at")

# Create indexes for categories
categories_collection.create_index("name")
categories_collection.create_index("active")

# Create indexes for users
users_collection.create_index("email", unique=True)
users_collection.create_index("username", unique=True)
users_collection.create_index("role")

# Create indexes for performance logs
performance_logs_collection.create_index("request_id")
performance_logs_collection.create_index("event_stream.at")

# Create indexes for citizens
citizens_collection.create_index("email", unique=True, sparse=True)
citizens_collection.create_index("phone")
citizens_collection.create_index("city")
citizens_collection.create_index("verification_state")

# Create indexes for geo_feeds
geo_feeds_collection.create_index("generated_at")

# Create indexes for comments
comments_collection.create_index("request_id")
comments_collection.create_index("author_id")
comments_collection.create_index("parent_comment_id")
comments_collection.create_index("created_at")

# Create indexes for ratings
ratings_collection.create_index("request_id", unique=True)
ratings_collection.create_index("citizen_id")
ratings_collection.create_index("created_at")

# Create indexes for service agents
service_agents_collection.create_index("name")
service_agents_collection.create_index("skills")
service_agents_collection.create_index("coverage_zones")
