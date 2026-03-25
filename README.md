# Golf Shot Tracker

A full-stack application for recording and reviewing golf shot data from a launch monitor. Built with **Angular 17** (frontend), **Express** (backend), and **PostgreSQL** (database).

---

## Project structure

```
Golf_data/
├── database/
│   └── schema.sql            # PostgreSQL DDL – run once to create the shots table
├── backend/                  # Node.js / Express REST API
│   ├── package.json
│   ├── .env.example          # Copy to .env and fill in your DB credentials
│   ├── server.js             # Express application entry point
│   ├── db/
│   │   └── index.js          # pg Pool wrapper
│   ├── routes/
│   │   └── shots.js          # Route definitions (delegates to controller)
│   └── controllers/
│       └── shotController.js # CRUD business logic
└── frontend/                 # Angular 17 SPA
    ├── package.json
    ├── angular.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    └── src/
        ├── main.ts
        ├── index.html
        ├── styles.css
        ├── environments/
        │   ├── environment.ts
        │   └── environment.prod.ts
        └── app/
            ├── app.module.ts
            ├── app-routing.module.ts
            ├── app.component.*
            ├── models/
            │   └── shot.model.ts
            ├── services/
            │   └── shot.service.ts
            └── components/
                ├── shot-form/     # Add / Edit form
                └── shot-list/     # Table view with edit & delete
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 LTS or later |
| npm | 9+ |
| PostgreSQL | 14+ |
| Angular CLI | 17 (`npm install -g @angular/cli@17`) |

---

## Database setup

```bash
# Create the database (adjust user/host as needed)
createdb -U postgres golf_tracker

# Apply the schema
psql -U postgres -d golf_tracker -f database/schema.sql
```

---

## Backend setup

```bash
cd backend

# Install dependencies
npm install

# Copy the example env file and edit it with your credentials
cp .env.example .env

# Start in development mode (auto-restarts on file changes)
npm run dev

# Or start in production mode
npm start
```

The API will be available at `http://localhost:3000`.

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/shots` | List all shots (newest first) |
| GET | `/api/shots/:id` | Get a single shot |
| POST | `/api/shots` | Create a new shot |
| PUT | `/api/shots/:id` | Update an existing shot |
| DELETE | `/api/shots/:id` | Delete a shot |
| GET | `/health` | Health check |

---

## Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (proxies to the backend automatically via ng serve defaults)
npm start
```

Open `http://localhost:4200` in your browser.

### Build for production

```bash
npm run build
# Output lands in frontend/dist/golf-tracker-frontend/
```

---

## Data fields

| Field | Type | Units | Notes |
|-------|------|-------|-------|
| `club` | string | – | Dropdown selection |
| `ball_speed` | number | mph | 0–250 |
| `launch_angle` | number | degrees | -10–60 |
| `back_spin` | number | rpm | -10,000–10,000 |
| `side_spin` | number | rpm | -5,000–5,000 (negative = draw) |
| `club_path` | number | degrees | -20–20 (negative = out-to-in) |
| `carry_distance` | number | yards | 0–500 |
| `total_distance` | number | yards | 0–600 |
| `created_at` | timestamp | – | Set automatically by the database |

---

## Development notes

- The backend uses `nodemon` for hot-reloading during development.
- All database queries are parameterised to prevent SQL injection.
- The Angular form validates all ranges client-side; the database schema enforces them server-side via CHECK constraints.
- CORS is fully open in development; restrict `cors()` options before deploying to production.