# Hospital Staff Rostering and Overtime Fairness Optimizer
## Using Constraint Programming and MERN Architecture

[![Node.js](https://img.shields.io/badge/Node.js-24.x-green)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green)](https://mongodb.com)
[![OR-Tools](https://img.shields.io/badge/OR--Tools-9.10-orange)](https://developers.google.com/optimization)

A full-stack hospital workforce scheduling application with a genuine mathematical optimization engine using Google OR-Tools CP-SAT.

---

## Architecture

```
React Frontend ↔ Express/Node.js API ↔ MongoDB
                       ↕
              Python FastAPI + OR-Tools CP-SAT Optimizer
```

### Data Flow — Roster Generation
1. Manager initiates roster generation in the React UI.
2. React calls `POST /api/rosters/generate` on the Express backend.
3. Express loads all relevant data (employees, shifts, requirements, leave, rules) from MongoDB.
4. Express calls `POST http://localhost:8000/solve` on the FastAPI optimizer.
5. FastAPI constructs the CP-SAT model with hard constraints and fairness objectives.
6. OR-Tools solver runs; returns OPTIMAL/FEASIBLE/INFEASIBLE/UNKNOWN with assignments.
7. Express persists assignments to MongoDB and updates the Roster document.
8. Result returned to frontend; Socket.IO notifies affected employees.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS, Recharts, React Router 6, Socket.IO client |
| Backend | Node.js 24, Express, MongoDB + Mongoose, JWT, bcrypt, Socket.IO |
| Optimizer | Python 3.10+, FastAPI, Google OR-Tools CP-SAT, Pydantic |
| Database | MongoDB (local or Atlas) |

---

## Prerequisites

| Tool | Required Version | Install |
|------|-----------------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| npm | ≥ 9 | bundled with Node.js |
| Python | ≥ 3.10 | https://python.org/downloads |
| MongoDB | ≥ 6 (local) **OR** MongoDB Atlas account | https://mongodb.com |
| Git | any | https://git-scm.com |

---

## Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd hospital-rostering
```

### 2. Configure environment

```bash
# Backend
cp server/.env.example server/.env
# Edit server/.env — set MONGODB_URI and JWT_SECRET

# Optimizer
cp optimizer/.env.example optimizer/.env
```

### 3. Install server dependencies

```bash
cd server
npm install
cd ..
```

### 4. Install client dependencies

```bash
cd client
npm install
cd ..
```

### 5. Set up Python virtual environment

```bash
cd optimizer
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

### 6. Seed the database

```bash
cd server
node scripts/seed.js
```

---

## Starting the Application

Open **three separate terminals**:

**Terminal 1 — Backend API:**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 — Optimizer Microservice:**
```bash
cd optimizer
venv\Scripts\activate   # Windows
# OR: source venv/bin/activate   # Mac/Linux
uvicorn app.main:app --reload --port 8000
# Optimizer runs on http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

**Terminal 3 — Frontend:**
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

---

## Demo Accounts

> **Development only.** Never use these credentials in production.

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@hospital.com | Hospital@2024 |
| Department Manager (ED) | s.chen@hospital.com | Hospital@2024 |
| Department Manager (ICU) | m.okafor@hospital.com | Hospital@2024 |
| Employee (Doctor) | p.sharma@hospital.com | Hospital@2024 |
| Employee (Nurse) | a.diallo@hospital.com | Hospital@2024 |

---

## Environment Configuration

### `server/.env`

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hospital_rostering
JWT_SECRET=<your_strong_random_secret>
JWT_EXPIRES_IN=7d
OPTIMIZER_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
```

### `optimizer/.env`

```env
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=info
```

---

## Mathematical Optimization Model

### Decision Variables

For each employee $e$ and each shift slot $s = (\text{department}, \text{template}, \text{date})$:

$$x_{e,s} \in \{0, 1\}, \quad x_{e,s} = 1 \iff \text{employee } e \text{ is assigned to slot } s$$

### Hard Constraints (must never be violated)

| ID | Constraint | Implementation |
|----|-----------|----------------|
| H1 | **Staffing coverage** | $\sum_{e \in E_{r,d}} x_{e,s} \geq \text{required}_{r,s}$ for each role $r$ |
| H2 | **Qualification match** | Only employees with required skills included in $E_{r,d}$ |
| H3 | **No overlapping shifts** | $x_{e,s_i} + x_{e,s_j} \leq 1$ when intervals overlap |
| H4 | **Minimum rest** | $x_{e,s_i} + x_{e,s_j} \leq 1$ when gap $< \text{minRest}$ |
| H5 | **Approved leave** | $x_{e,s} = 0$ when date falls within approved leave |
| H6 | **Weekly hour limit** | $\sum_s x_{e,s} \cdot \text{dur}_s \leq \text{maxHours}_e$ per ISO week |
| H7 | **Department eligibility** | Variables only created for eligible departments |
| H8 | **Consecutive days** | Sliding window: $\sum_{d \in W} \text{worked}_{e,d} \leq \text{maxConsecutive}$ |

### Soft Objectives (fairness optimization)

The solver minimizes a weighted sum penalizing unfair distributions:

$$\min \; w_1 \sum_{e} |\Delta N_e| + w_2 \sum_{e} |\Delta W_e| + w_3 \sum_{e} \text{prefPenalty}_e$$

where:
- $\Delta N_e$ = deviation of employee $e$'s night shifts from the group mean (accounting for historical assignments)
- $\Delta W_e$ = deviation of weekend shifts from the group mean
- $w_1 = 150$ (night fairness), $w_2 = 120$ (weekend fairness), $w_3 = 50$ (preference)

The absolute deviations are linearized as CP-SAT integer constraints.

### Solver Status Values

| Status | Meaning |
|--------|---------|
| `OPTIMAL` | Globally optimal solution found within time limit |
| `FEASIBLE` | Valid solution found; may not be globally optimal |
| `INFEASIBLE` | No valid schedule exists under current constraints |
| `UNKNOWN` | Solver ran out of time without any solution |

### Example Solver Input (abbreviated)

```json
{
  "employees": [
    { "id": "E1", "name": "Amara Diallo", "jobCategory": "Nurse",
      "eligibleDepartments": ["D_ED"], "skills": ["triage", "IV_therapy"],
      "contractedHoursPerWeek": 40, "maxHoursPerWeek": 48,
      "minRestHoursBetweenShifts": 11, "historicalNightShifts": 3 }
  ],
  "shiftRequirements": [
    { "department": "D_ED", "shiftTemplate": "T_MORNING", "dayOfWeek": 0,
      "roleRequirements": [{"role": "Nurse", "count": 2, "requiredSkills": ["triage"]}] }
  ],
  "schedulingRules": { "minRestHours": 11, "maxHoursPerWeek": 48, "maxConsecutiveDays": 6 },
  "horizon": { "startDate": "2024-11-04", "endDate": "2024-11-10" }
}
```

---

## API Documentation

FastAPI auto-generates interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Authenticate, receive JWT |
| GET | `/api/auth/me` | Get current user + profile |
| GET | `/api/departments` | List departments |
| GET | `/api/employees` | List employees (admin/manager) |
| POST | `/api/employees` | Create employee (admin) |
| GET | `/api/rosters` | List rosters |
| POST | `/api/rosters/generate` | Generate roster via optimizer |
| PATCH | `/api/rosters/:id/publish` | Publish a draft roster |
| GET | `/api/leave` | List leave requests |
| POST | `/api/leave` | Submit leave request |
| PATCH | `/api/leave/:id/review` | Approve/reject leave |
| GET | `/api/analytics/dashboard` | Dashboard statistics |
| GET | `/api/analytics/workload` | Workload fairness report |

---

## Testing

### Optimizer Tests (Python)

```bash
cd optimizer
venv\Scripts\activate
pytest tests/test_solver.py -v
```

Tests cover:
- Feasible single/multi-employee scenarios
- Hard constraint validation (leave, overlap, rest, skills, hours)
- Infeasibility detection and diagnostics
- Fairness distribution of night shifts

### Server Tests (Node.js)

```bash
cd server
npm test
```

---

## Project Structure

```
hospital-rostering/
├── client/                   # React + Vite frontend
│   └── src/
│       ├── pages/            # Page components
│       ├── components/       # Reusable UI components
│       ├── layouts/          # App shell layout
│       ├── hooks/            # Custom hooks (useSocket, etc.)
│       ├── services/api.js   # Axios API client
│       ├── store/            # Zustand state stores
│       └── utils/            # Formatters, helpers
│
├── server/                   # Node.js + Express
│   └── src/
│       ├── models/           # Mongoose schemas
│       ├── controllers/      # Request handlers
│       ├── routes/           # Express routers
│       ├── middleware/       # Auth, validation, rate-limiting
│       ├── services/         # Business logic
│       └── utils/            # Logger, pagination, responses
│   └── scripts/seed.js       # Database seed script
│
├── optimizer/                # Python FastAPI + OR-Tools
│   └── app/
│       ├── schemas/          # Pydantic request/response models
│       ├── solver/model.py   # CP-SAT model, constraints, objectives
│       └── routers/solve.py  # FastAPI route
│   └── tests/               # pytest unit tests
│
└── README.md
```

---

## Demo Workflow (for University Project Review)

1. **Start all three services** (see above).
2. **Seed the database**: `cd server && node scripts/seed.js`
3. **Open http://localhost:5173**
4. **Log in as Admin**: admin@hospital.com / Hospital@2024
5. **View Dashboard**: See employee counts, departments, upcoming shifts.
6. **Generate a Roster**:
   - Navigate to Generate Roster.
   - Select "Emergency Department" and a 7-day range.
   - Click "Start Generation". Watch the CP-SAT solver run (10-60 seconds).
   - Review the OPTIMAL/FEASIBLE result with fairness metrics.
   - Click "Publish Roster".
7. **Demonstrate Infeasibility**:
   - Select "Laboratory" department (only 1 technician; requirements need 2+).
   - The solver returns INFEASIBLE with shortage diagnostics.
8. **Log in as Employee**: p.sharma@hospital.com / Hospital@2024
9. **View personal schedule**, submit a leave request.
10. **Log in as Manager**, approve/reject the leave.
11. **View Analytics**: Workload chart, night-shift fairness chart.

---

## Limitations and Future Enhancements

### Current Limitations
- Shift-swap validation is schema-defined but the workflow UI is simplified.
- Historical stats updated manually via seed data; auto-update on roster archival is planned.
- The solver scales to ~50 employees × 7 days efficiently; very large instances may need solver time limit tuning.

### Future Enhancements
- Multi-objective Pareto-front optimization.
- Employee availability submission UI (currently admin-configured).
- Mobile native app using React Native.
- Automated historical stat updates on roster publication.
- Integration with hospital HR systems.
- PDF export for published rosters.

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| MongoDB connection refused | Ensure MongoDB is running: `mongod` or start MongoDB service |
| Optimizer connection refused | Start the FastAPI service on port 8000 |
| npm install fails | Ensure you have network access; try `npm install --legacy-peer-deps` |
| Python import errors | Activate the virtual environment before running uvicorn |
| `ortools` install fails | Ensure Python ≥ 3.10 and pip ≥ 21; try `pip install --upgrade pip` |
| JWT errors on API | Check JWT_SECRET in server/.env matches the signing secret |
| CORS errors | Ensure CORS_ORIGIN in server/.env matches the frontend URL |
