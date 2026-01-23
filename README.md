# Citizen Services Tracker

A web application for citizens to report and track community service requests.

## What It Does

Citizens can report problems like potholes, water leaks, or broken streetlights. Service agents receive and fix these issues. The system tracks everything from report to resolution.

## Technology

**Frontend:** React  
**Backend:** FastAPI (Python)  
**Database:** MongoDB  
**Maps:** Leaflet

## Setup

### 1. Install Requirements

```bash
cd backend
pip install -r requirements.txt

cd frontend
npm install
```

### 2. Configure Database

Create `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/
DATABASE_NAME=cst_db
STAFF_API_KEY=test_staff_key
```

### 3. Seed Database

```bash
cd backend
python seed_complete.py
```

### 4. Run Application

Terminal 1 - Backend:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Terminal 2 - Frontend:

```bash
cd frontend
npm start
```

Open browser: http://localhost:3000

## Features

### For Citizens

- Submit service requests with location on map
- Add photos and descriptions
- Track request status
- Comment on requests
- Rate completed services

### For Service Agents

- View assigned tickets
- Update ticket status
- See tickets on map
- Track workload

### For Staff

- Create and manage service agents
- Assign requests to agents
- View analytics dashboard
- Monitor all requests

## User Roles

**Citizen** - Report problems  
**Agent** - Fix problems  
**Staff** - Manage agents and assignments

## Key Pages

- **Home** - Submit new request
- **Requests** - View all requests
- **Citizens** - Register and manage citizens
- **Agents** - Manage service teams
- **Analytics** - View statistics
- **Live Map** - See all requests on map

## How It Works

1. Citizen reports issue on map
2. System assigns agent based on location and skills
3. Agent updates status as they work
4. Citizen receives notifications
5. Citizen rates service when complete

## Project Structure

```
backend/
  app/
    routers/         API endpoints
    models.py        Data models
    database.py      MongoDB connection
    main.py          FastAPI app

frontend/
  src/
    pages/           React pages
    services/        API calls
```

## API Endpoints

**Requests:** `/requests/`  
**Citizens:** `/citizens/`  
**Agents:** `/agents/`  
**Analytics:** `/analytics/`  
**Categories:** `/categories/`

## Database Collections

- service_requests
- citizens
- service_agents
- categories
- comments
- ratings
- performance_logs
- users

## Authentication

Staff actions require API key:

```
X-Staff-Key: test_staff_key
```

Agent actions require agent ID:

```
X-Agent-Id: <agent_id>
```

## Default Data

Run `seed_complete.py` to create sample data:

- Request categories
- Sample citizens
- Sample requests
- Service agents
