// =============================================================================
// server.js – Entry point for the Golf Tracker Express API
// =============================================================================
// Responsibilities:
//   1. Load environment variables from .env before any other module reads them
//   2. Configure Express middleware (JSON body parsing, CORS)
//   3. Mount route modules under their URL prefixes
//   4. Start the HTTP server
// =============================================================================

// Load .env variables into process.env as early as possible so that every
// subsequent require() (including the DB pool) already sees the correct values.
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

// Import the shots router. All /api/shots/* endpoints are defined there.
const shotsRouter = require('./routes/shots');

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();

// Parse incoming requests with JSON payloads (replaces body-parser in Express 4.16+).
app.use(express.json());

// Enable CORS for all origins. In production you would restrict this to the
// specific frontend origin, but keeping it open simplifies local development.
app.use(cors());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Mount the shots router. Every route defined inside routes/shots.js will be
// prefixed with /api/shots automatically.
app.use('/api/shots', shotsRouter);

// Simple health-check endpoint – useful for Docker health checks and uptime monitors.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 404 handler – must come AFTER all valid routes
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Global error handler – must have 4 arguments so Express recognises it
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Golf Tracker API running on http://localhost:${PORT}`);
});