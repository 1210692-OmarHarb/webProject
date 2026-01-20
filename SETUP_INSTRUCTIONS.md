# Citizen Services Tracker (CST) - Setup Instructions

**Complete setup guide for running the CST Management Information System on your machine.**

---

## 📋 Prerequisites

Make sure you have these installed on your system:

1. **Python 3.13+** - [Download](https://www.python.org/downloads/)
2. **Node.js & npm** - [Download](https://nodejs.org/)
3. **MongoDB** - [Download Community Edition](https://www.mongodb.com/try/download/community)
4. **Git** - [Download](https://git-scm.com/)

### Verify Installation

```bash
python --version          # Should show 3.13+
node --version            # Should show v18+
npm --version             # Should show 8+
mongod --version          # Should show 5+
```

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd webProject
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy template)
copy .env.example .env
# OR on macOS/Linux:
cp .env.example .env
```

### Step 3: MongoDB Setup

```bash
# Start MongoDB (keep this terminal open)
# On Windows:
mongod --dbpath "C:\data\db"
# On macOS:
mongod --dbpath /usr/local/var/mongodb
# On Linux:
sudo systemctl start mongod
```

### Step 4: Populate Database

```bash
# In backend directory (with venv activated)
python seed_complete.py
```

You should see:

```
✅ Complete database seeding finished!
📊 Summary:
   Categories: 4
   Service Requests: 3
   Performance Logs: 3
```

### Step 5: Start Backend Server

```bash
# In backend directory (with venv activated)
uvicorn app.main:app --reload --port 8000
```

Wait for:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Step 6: Frontend Setup (New Terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start React app
npm start
```

Wait for the browser to open automatically at `http://localhost:3000`

---

## ✅ Verification

### Backend API

1. Open browser: **http://localhost:8000/docs**
2. You should see Swagger UI with all endpoints
3. Try `GET /requests/` - should return 3 requests

### Frontend

1. Browser should auto-open: **http://localhost:3000**
2. You should see:
   - "Create Request" page with category dropdown
   - Categories loading from API
   - "View Requests" showing 3 requests
   - Interactive map

### Database

Check MongoDB has data:

```bash
# In a new terminal
mongosh
use cst_db
db.service_requests.count()      # Should show 3
db.categories.count()             # Should show 4
db.performance_logs.count()       # Should show 3
```

---

## 📁 Project Structure

```
webProject/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── database.py             # MongoDB connection & indexes
│   │   ├── models.py               # Pydantic data models
│   │   └── routers/
│   │       ├── requests.py         # Service request endpoints
│   │       ├── categories.py       # Category endpoints
│   │       ├── users.py            # User endpoints
│   │       └── performance_logs.py # Performance log endpoints
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment template
│   └── seed_complete.py            # Database seeding script
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js                  # Main React component
│   │   ├── pages/
│   │   │   ├── CreateRequest.js    # Create request form
│   │   │   ├── RequestList.js      # View requests
│   │   │   └── RequestDetail.js    # Request details
│   │   └── services/
│   │       └── api.js              # API client
│   ├── package.json                # Node dependencies
│   └── .gitignore
│
├── README.md                       # Main documentation
├── .gitignore                      # Git ignore rules
└── SETUP_INSTRUCTIONS.md           # This file
```

---

## 🔌 API Endpoints Reference

### Service Requests

```
POST   /requests/                           # Create request (with idempotency)
GET    /requests/                           # List requests (with filters & pagination)
GET    /requests/{request_id}               # Get request details
PUT    /requests/{request_id}               # Update request
PATCH  /requests/{request_id}/transition    # Workflow state transition
POST   /requests/{request_id}/escalate      # Escalate request
DELETE /requests/{request_id}               # Delete request
GET    /requests/nearby/search              # Geospatial search
```

### Categories

```
GET    /categories/                  # List categories
GET    /categories/{category_id}     # Get category
POST   /categories/                  # Create category
PATCH  /categories/{category_id}     # Update category
DELETE /categories/{category_id}     # Delete category
```

### Users

```
GET    /users/                       # List users
GET    /users/{user_id}              # Get user
POST   /users/                       # Create user
PATCH  /users/{user_id}              # Update user
DELETE /users/{user_id}              # Delete user
```

### Performance Logs

```
GET    /performance-logs/            # List logs
GET    /performance-logs/{log_id}    # Get log
GET    /performance-logs/request/{request_id}  # Get log by request
POST   /performance-logs/            # Create log
PATCH  /performance-logs/{log_id}    # Update log
POST   /performance-logs/{request_id}/add-event  # Add event
```

---

## 🧪 Testing with Swagger UI

1. Go to **http://localhost:8000/docs**
2. Try creating a request:
   - Click `POST /requests/`
   - Click "Try it out"
   - Fill in the JSON body with sample data
   - Click "Execute"

Example request body:

```json
{
  "title": "Pothole on Main Street",
  "description": "Large pothole causing traffic hazard on main street near downtown",
  "category": "pothole",
  "location": {
    "type": "Point",
    "coordinates": [35.205, 31.9038],
    "zone_id": "ZONE-DT-01"
  },
  "citizen_ref": {
    "citizen_id": "507f1f77bcf86cd799439011",
    "anonymous": false
  }
}
```

---

## 📊 Database Collections

After seeding, you have:

### service_requests

```
{
  "request_id": "CST-2026-0001",
  "status": "triaged",
  "workflow": { "current_state": "triaged", ... },
  "sla_policy": { "policy_id": "SLA-ROAD-P1", ... },
  "timestamps": { "created_at", "triaged_at", ... },
  "location": { "type": "Point", "coordinates": [...] },
  "evidence": [...],
  "internal_notes": [...]
}
```

### categories

```
{
  "name": "pothole",
  "description": "Road damage and asphalt issues",
  "icon": "🚧",
  "department": "Public Works",
  "active": true
}
```

### performance_logs

```
{
  "request_id": ObjectId,
  "event_stream": [
    { "type": "created", "by": {...}, "at": ... },
    { "type": "triaged", "by": {...}, "at": ... }
  ],
  "computed_kpis": { "sla_state": "on_track", ... }
}
```

---

## 🔧 Troubleshooting

### "MongoDB connection refused"

- Ensure MongoDB is running: `mongod`
- Check MONGO_URI in `.env` matches your MongoDB setup

### "Module not found: bson"

```bash
pip install pymongo
```

### "npm ERR! 404 Not Found"

```bash
cd frontend
npm cache clean --force
npm install
```

### "Port 3000 already in use"

```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
# macOS/Linux:
lsof -ti :3000 | xargs kill -9
```

### "Cannot find module 'React'"

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 👥 For Your Team

### Module 2 - Citizen Portal & Profiles

Your friend should:

1. Follow steps 1-6 of this guide
2. Create citizens collection & API routes
3. Implement citizen profile endpoints
4. Add citizen portal UI components

### Module 3 - Service Agents & Assignment

Will need:

1. service_agents collection
2. Auto-assignment logic
3. Agent dashboard UI

---

## 📝 Next Steps

1. **Run the project** using the steps above
2. **Test all endpoints** via Swagger UI at http://localhost:8000/docs
3. **Explore the frontend** at http://localhost:3000
4. **Review the code**:
   - Backend: `backend/app/routers/requests.py`
   - Frontend: `frontend/src/pages/CreateRequest.js`
5. **Push to GitHub** and share the link

---

## 📚 Documentation

- [Backend API Documentation](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [Project Overview](./README.md)
- [Quick Start](./QUICKSTART.md)

---

**Questions?** Check the error messages or run:

```bash
# Verify MongoDB is running
mongo --eval "db.adminCommand('ping')"

# Check backend is running
curl http://localhost:8000/health

# Check frontend is accessible
curl http://localhost:3000
```

Good luck! 🚀
