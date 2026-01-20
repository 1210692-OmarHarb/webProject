# Citizen Services Tracker (CST) - Management Information System

A professional Municipal Information System for managing citizen-reported service requests with workflow automation, SLA tracking, and real-time analytics.

## 🎯 Project Overview

CST enables municipalities to:

- ✅ Receive citizen service requests with geo-location and evidence
- ✅ Enforce workflow rules with SLA escalation
- ✅ Auto-assign requests to service teams based on zone/skills/workload
- ✅ Track performance with immutable audit logs
- ✅ Visualize open requests on interactive maps
- ✅ Generate compliance reports and analytics

## 🏗️ Architecture

**Backend:** FastAPI (Python) + MongoDB  
**Frontend:** React 19 + Leaflet Maps  
**Database:** MongoDB (5 collections: service_requests, performance_logs, categories, users, geo_feeds)

## 📦 Tech Stack

- **Python 3.13+** with FastAPI 2.0
- **MongoDB** with PyMongo
- **React 19** with React Router
- **Leaflet** for geospatial visualization
- **Pydantic v2** for data validation

## 🚀 Quick Start

**[👉 Full Setup Instructions Here](./SETUP_INSTRUCTIONS.md)**

### 30-Second Quick Setup

```bash
# 1. Clone and navigate
git clone <repo> && cd webProject

# 2. Backend (Terminal 1)
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed_complete.py
uvicorn app.main:app --reload --port 8000

# 3. Frontend (Terminal 2)
cd frontend
npm install
npm start
```

**Browser URLs:**

- 🌐 Frontend: http://localhost:3000
- 📚 API Docs: http://localhost:8000/docs
- 🗄️ MongoDB: Connect to localhost:27017

## 📋 Core Features

### 1. Service Request Management (Module 1) ✅

- Complete CRUD with validation
- **Workflow State Machine:** new → triaged → assigned → in_progress → resolved → closed
- **SLA Policies:** Auto-computed based on category/priority with escalation rules
- **Idempotency:** Prevent duplicate submissions
- **Geospatial:** 2dsphere indexing for location-based queries
- **Evidence Tracking:** Photos/documents with SHA256
- **Audit Trail:** Immutable event logging

**Key Endpoints:**

```
POST   /requests/                           # Create (with idempotency)
GET    /requests/                           # List (filters & pagination)
GET    /requests/{id}                       # Get details
PATCH  /requests/{id}/transition            # Workflow state change
POST   /requests/{id}/escalate              # Manual escalation
```

### 2. Citizen Portal (Module 2) - Ready for Implementation

- Citizen profiles with verification
- Anonymous reporting support
- Request history & comments
- Satisfaction ratings

### 3. Service Agents (Module 3) - Ready for Implementation

- Agent profiles with coverage zones
- Auto-assignment logic
- Shift schedules
- Workload balancing

### 4. Analytics & Visualization (Module 4) - Ready for Implementation

- Real-time heat-maps
- KPI dashboards
- Compliance reports
- Geo-feeds

## 📊 Database Collections

- ✅ Filter requests by status and category
- ✅ Update request status (pending, in progress, resolved)
- ✅ View detailed information about each request
- ✅ Delete requests
- ✅ Geospatial queries (find nearby requests)
- ✅ RESTful API with FastAPI
- ✅ MongoDB for data persistence

## Project Structure

```
webProject/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── database.py          # MongoDB connection
│   │   ├── models.py            # Pydantic models
│   │   └── routers/
│   │       ├── __init__.py
│   │       └── requests.py      # API endpoints
│   ├── .env                     # Environment variables
│   ├── .env.example             # Environment template
│   └── requirements.txt         # Python dependencies
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── pages/
    │   │   ├── HomePage.js
    │   │   ├── CreateRequest.js
    │   │   ├── RequestList.js
    │   │   └── RequestDetails.js
    │   ├── services/
    │   │   └── api.js           # API client
    │   ├── App.js
    │   ├── App.css
    │   └── index.js
    └── package.json
```

## Installation & Setup

### Prerequisites

- Python 3.8+
- Node.js 14+
- MongoDB (local or cloud instance)

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Create a virtual environment (optional but recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Configure environment variables:

```bash
# Create .env file
cp .env.example .env
```

Edit `.env` and set your MongoDB connection string:

```
MONGO_URI=mongodb://localhost:27017/
DATABASE_NAME=cst_db
```

5. Start the backend server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000`

## MongoDB Setup

### Option 1: Local MongoDB

1. Install MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)

2. Start MongoDB service:

```bash
# On Windows
net start MongoDB

# On macOS
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

3. Verify MongoDB is running:

```bash
mongo --eval "db.version()"
```

### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. Create a new cluster

3. Get your connection string from "Connect" → "Connect your application"

4. Update your `.env` file:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=cst_db
```

## API Endpoints

### Service Requests

- `POST /requests/` - Create a new service request
- `GET /requests/` - Get all requests (with optional filters)
- `GET /requests/{id}` - Get a specific request
- `PUT /requests/{id}` - Update a request
- `PATCH /requests/{id}/status` - Update request status only
- `DELETE /requests/{id}` - Delete a request
- `GET /requests/nearby/search` - Find nearby requests

### Query Parameters

- `status`: Filter by status (pending, in_progress, resolved)
- `category`: Filter by category
- `limit`: Maximum number of results (default: 100)

## API Documentation

Once the backend is running, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Data Models

### Service Request

```json
{
  "title": "Pothole on Main Street",
  "description": "Large pothole causing traffic issues",
  "category": "Pothole",
  "location": {
    "type": "Point",
    "coordinates": [35.9106, 31.9539]
  },
  "address": "123 Main Street, Amman",
  "status": "pending"
}
```

## Categories

- Pothole
- Streetlight
- Garbage Collection
- Water Supply
- Traffic Signal
- Park Maintenance
- Other

## Status Values

- `pending` - Request submitted, awaiting action
- `in_progress` - Request being worked on
- `resolved` - Request completed

## Development

### Running Tests

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm test
```

### Code Formatting

Backend (with black):

```bash
black app/
```

Frontend (with prettier):

```bash
npx prettier --write src/
```

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running
- Check your connection string in `.env`
- For MongoDB Atlas, ensure your IP is whitelisted

### CORS Errors

- Verify backend CORS settings in `main.py`
- Ensure frontend is running on `http://localhost:3000`

### Port Already in Use

Backend:

```bash
# Change port in uvicorn command
uvicorn app.main:app --reload --port 8001
```

Frontend:

```bash
# Set PORT environment variable
PORT=3001 npm start
```

## Deployment

### Backend Deployment (Heroku example)

1. Create `Procfile`:

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

2. Deploy:

```bash
git push heroku main
```

### Frontend Deployment (Netlify/Vercel)

1. Build the app:

```bash
npm run build
```

2. Deploy the `build` folder

3. Update API URL in `src/services/api.js`

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Email notifications
- [ ] Image upload for requests
- [ ] Request voting/priority system
- [ ] Admin dashboard
- [ ] Mobile app
- [ ] Real-time updates with WebSockets

## License

This project is for educational purposes.

## Contact

For questions or issues, please open an issue in the repository.
