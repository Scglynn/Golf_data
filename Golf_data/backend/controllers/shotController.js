// =============================================================================
// controllers/shotController.js – Business logic for shot CRUD operations
// =============================================================================
// Each exported function is an Express request handler.
// Conventions used throughout:
//   - async/await for all database calls (cleaner than callback chains)
//   - try/catch on every handler so unhandled promise rejections never crash the process
//   - Explicit HTTP status codes on every response path
//   - Parameterised queries everywhere to prevent SQL injection
// =============================================================================

const db = require('../db');

// ---------------------------------------------------------------------------
// Helper – normalise a row returned from the DB so numeric strings become JS
// numbers. node-postgres returns NUMERIC columns as strings to avoid floating-
// point precision loss; the frontend expects actual numbers.
// ---------------------------------------------------------------------------
/**
 * Cast numeric fields from the postgres NUMERIC type (returned as string) to
 * JavaScript numbers so JSON serialisation sends numeric values, not strings.
 * @param {Object} row - Raw row from pg QueryResult
 * @returns {Object}   - Row with numeric fields converted
 */
function normaliseRow(row) {
  return {
    ...row,
    ball_speed:     parseFloat(row.ball_speed),
    launch_angle:   parseFloat(row.launch_angle),
    back_spin:      parseFloat(row.back_spin),
    side_spin:      parseFloat(row.side_spin),
    club_path:      parseFloat(row.club_path),
    carry_distance: parseFloat(row.carry_distance),
    total_distance: parseFloat(row.total_distance),
  };
}

// ---------------------------------------------------------------------------
// GET /api/shots
// ---------------------------------------------------------------------------
/**
 * Return all shot records ordered by creation time descending (newest first).
 * An empty array is a valid and expected response when no shots have been saved.
 */
const getAllShots = async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM shots ORDER BY created_at DESC'
    );

    // Map every row through normaliseRow so numeric columns are proper numbers.
    res.json(result.rows.map(normaliseRow));
  } catch (err) {
    console.error('getAllShots error:', err);
    res.status(500).json({ error: 'Failed to retrieve shots' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/shots/:id
// ---------------------------------------------------------------------------
/**
 * Return a single shot by its primary key.
 * Responds with 404 when the id does not match any row – this is important so
 * the client can distinguish "not found" from a server error.
 */
const getShotById = async (req, res) => {
  // parseInt guards against non-numeric id strings reaching the query
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Shot id must be a number' });
  }

  try {
    const result = await db.query('SELECT * FROM shots WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Shot with id ${id} not found` });
    }

    res.json(normaliseRow(result.rows[0]));
  } catch (err) {
    console.error('getShotById error:', err);
    res.status(500).json({ error: 'Failed to retrieve shot' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/shots
// ---------------------------------------------------------------------------
/**
 * Insert a new shot record.
 * Validates that all required fields are present before touching the database
 * so the client gets a meaningful 400 instead of a cryptic DB constraint error.
 * Returns 201 Created with the newly inserted row (including the generated id
 * and created_at timestamp).
 */
const createShot = async (req, res) => {
  const {
    club,
    ball_speed,
    launch_angle,
    back_spin,
    side_spin,
    club_path,
    carry_distance,
    total_distance,
  } = req.body;

  // Validate that every required field was supplied in the request body.
  const requiredFields = [
    'club', 'ball_speed', 'launch_angle', 'back_spin',
    'side_spin', 'club_path', 'carry_distance', 'total_distance',
  ];

  const missing = requiredFields.filter(
    (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
  );

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`,
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO shots
         (club, ball_speed, launch_angle, back_spin, side_spin, club_path, carry_distance, total_distance)
       VALUES
         ($1,   $2,         $3,           $4,        $5,        $6,        $7,             $8)
       RETURNING *`,
      [club, ball_speed, launch_angle, back_spin, side_spin, club_path, carry_distance, total_distance]
    );

    // 201 Created is the semantically correct status for a successful INSERT.
    res.status(201).json(normaliseRow(result.rows[0]));
  } catch (err) {
    console.error('createShot error:', err);
    res.status(500).json({ error: 'Failed to create shot' });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/shots/:id
// ---------------------------------------------------------------------------
/**
 * Update every editable field of an existing shot.
 * Uses RETURNING * so we can send the client the current state of the row
 * after the update, without a second SELECT round-trip.
 */
const updateShot = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Shot id must be a number' });
  }

  const {
    club,
    ball_speed,
    launch_angle,
    back_spin,
    side_spin,
    club_path,
    carry_distance,
    total_distance,
  } = req.body;

  // Validate required fields the same way as createShot.
  const requiredFields = [
    'club', 'ball_speed', 'launch_angle', 'back_spin',
    'side_spin', 'club_path', 'carry_distance', 'total_distance',
  ];

  const missing = requiredFields.filter(
    (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
  );

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missing.join(', ')}`,
    });
  }

  try {
    const result = await db.query(
      `UPDATE shots
       SET club            = $1,
           ball_speed      = $2,
           launch_angle    = $3,
           back_spin       = $4,
           side_spin       = $5,
           club_path       = $6,
           carry_distance  = $7,
           total_distance  = $8
       WHERE id = $9
       RETURNING *`,
      [club, ball_speed, launch_angle, back_spin, side_spin, club_path, carry_distance, total_distance, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Shot with id ${id} not found` });
    }

    res.json(normaliseRow(result.rows[0]));
  } catch (err) {
    console.error('updateShot error:', err);
    res.status(500).json({ error: 'Failed to update shot' });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/shots/:id
// ---------------------------------------------------------------------------
/**
 * Delete a shot by id.
 * Returns a descriptive success message rather than an empty 204 so the client
 * has confirmation text it can display without additional requests.
 */
const deleteShot = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Shot id must be a number' });
  }

  try {
    const result = await db.query(
      'DELETE FROM shots WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Shot with id ${id} not found` });
    }

    res.json({ message: `Shot ${id} deleted successfully` });
  } catch (err) {
    console.error('deleteShot error:', err);
    res.status(500).json({ error: 'Failed to delete shot' });
  }
};

module.exports = {
  getAllShots,
  getShotById,
  createShot,
  updateShot,
  deleteShot,
};