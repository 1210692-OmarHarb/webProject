from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "cst_db")

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

requests_collection = db["service_requests"]
categories_collection = db["categories"]
users_collection = db["users"]
citizens_collection = db["citizens"]
performance_logs_collection = db["performance_logs"]
geo_feeds_collection = db["geo_feeds"]
comments_collection = db["comments"]
ratings_collection = db["ratings"]
service_agents_collection = db["service_agents"]

requests_collection.create_index([("location", "2dsphere")])
requests_collection.create_index("status")
requests_collection.create_index("category")
requests_collection.create_index("request_id")
requests_collection.create_index("timestamps.created_at")

categories_collection.create_index("name")
categories_collection.create_index("active")

users_collection.create_index("email", unique=True)
users_collection.create_index("username", unique=True)
users_collection.create_index("role")

performance_logs_collection.create_index("request_id")
performance_logs_collection.create_index("event_stream.at")

citizens_collection.create_index("email", unique=True, sparse=True)
citizens_collection.create_index("phone")
citizens_collection.create_index("city")
citizens_collection.create_index("verification_state")

geo_feeds_collection.create_index("generated_at")

comments_collection.create_index("request_id")
comments_collection.create_index("author_id")
comments_collection.create_index("parent_comment_id")
comments_collection.create_index("created_at")

ratings_collection.create_index("request_id", unique=True)
ratings_collection.create_index("citizen_id")
ratings_collection.create_index("created_at")

service_agents_collection.create_index("name")
service_agents_collection.create_index("skills")
service_agents_collection.create_index("coverage_zones")
