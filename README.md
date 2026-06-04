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

---

## UI previews

### Shot list — reviewing previous shots

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Golf Shot Tracker                                          [+ Add New Shot]         │
├──────────┬────────────┬──────────────┬───────────┬──────────┬──────────┬────────────┤
│  Club    │ Ball Speed │ Launch Angle │ Back Spin │Side Spin │Club Path │ Carry Total│
│          │   (mph)    │     (°)      │   (rpm)   │  (rpm)   │   (°)    │  (yds)(yds)│
├──────────┼────────────┼──────────────┼───────────┼──────────┼──────────┼────────────┤
│ Driver   │    158.3   │    10.8      │   2,450   │   -180   │    2.5   │  248  272  │
│ 7 Iron   │    120.1   │    16.2      │   5,800   │    230   │   -1.2   │  168  178  │
│ Pitching │     98.4   │    21.5      │   8,100   │     90   │    0.8   │  130  135  │
│ Driver   │    162.0   │    11.4      │   2,200   │   -350   │    3.1   │  255  280  │
├──────────┴────────────┴──────────────┴───────────┴──────────┴──────────┴────────────┤
│  4 shots recorded                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
  Side spin: blue = draw (−), red = fade (+)   Club path: blue = in-to-out, red = out-to-in
```

---

### Add shot — logging a new shot

```
┌─────────────────────────────────┐
│  Add Shot                       │   ← header turns "Edit Shot" when editing
├─────────────────────────────────┤
│  Club                           │
│  [ Select a club…          ▼ ]  │   Driver / 3 Wood / 5 Iron / … / Putter
│                                 │
│  Ball Speed  (mph)              │
│  [ 158.3                     ]  │
│                                 │
│  Launch Angle  (degrees)        │
│  [ 10.8                      ]  │
│                                 │
│  Back Spin  (rpm)               │
│  [ 2450                      ]  │
│                                 │
│  Side Spin  (rpm · − draw, + fade)│
│  [ -180                      ]  │
│                                 │
│  Club Path  (° · + in-to-out)   │
│  [ 2.5                       ]  │
│                                 │
│  Carry Distance  (yards)        │
│  [ 248                       ]  │
│                                 │
│  Total Distance  (yards)        │
│  [ 272                       ]  │
│                                 │
│  [    Save Shot    ] [ Cancel ] │
└─────────────────────────────────┘

  After saving, a feedback panel replaces the form:

┌─────────────────────────────────┐
│ ✓  Shot Saved!                  │
│    Driver — 248 yds carry / 272 yds total
├─────────────────────────────────┤
│  Swing Feedback                 │
│                                 │
│  ✅ Good ball speed             │
│     158 mph is in the right     │
│     range for your Driver.      │
│                                 │
│  ⚠️  Slight fade bias           │
│     +180 rpm side spin suggests │
│     a small open face at impact.│
│                                 │
│  [  Log Another Shot  ] [View All Shots]
└─────────────────────────────────┘
```

---

### Swing analysis

```
┌─────────────────────────────────────────────────────┐
│  Swing Analysis                 [Coming Soon]        │
│  Upload a video and let the engine identify flaws.   │
├─────────────────────────────────────────────────────┤
│  🎥 Upload Your Swing Video                         │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│      💾                                             │
│      Drag & drop your swing video here              │
│      or click to browse                             │
│      MP4, MOV, AVI up to 500 MB                     │
│      [ Browse Files (disabled) ]                    │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│  [      Analyze Swing — Coming Soon (disabled)    ] │
├─────────────────────────────────────────────────────┤
│  What Will Be Analyzed                              │
│                                                     │
│  ┌──────────────┐ ┌──────────────┐                 │
│  │   ⏱ Tempo   │ │  🧘 Hip &   │                 │
│  │   & Rhythm  │ │   Body Rot.  │                 │
│  │             │ │              │                 │
│  │ ▓░░░░░░░░░ │ │ ▓░░░░░░░░░  │                 │
│  │ — pending — │ │ — pending —  │                 │
│  └──────────────┘ └──────────────┘                 │
│  ┌──────────────┐ ┌──────────────┐                 │
│  │ → Club Plane │ │ ✔ Follow-   │                 │
│  │   & Path    │ │   Through   │                 │
│  │             │ │              │                 │
│  │ ▓░░░░░░░░░ │ │ ▓░░░░░░░░░  │                 │
│  │ — pending — │ │ — pending —  │                 │
│  └──────────────┘ └──────────────┘                 │
│                                                     │
│  🚧 This feature is under development.              │
│     Use Add Shot to log launch monitor data now.    │
└─────────────────────────────────────────────────────┘
```

---

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