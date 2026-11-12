// =============================================================================
// controllers/clubConfigController.js – Club + shaft setups and shaft-fit stats
// =============================================================================
// Follows the same conventions as shotController.js: async/await, try/catch on
// every handler, explicit status codes and parameterised queries.
// =============================================================================

const db = require('../db');
const { analyzeShaftFit } = require('../services/analysisService');

const VALID_FLEX = ['L', 'A', 'R', 'S', 'X'];
const VALID_KICK = ['low', 'mid', 'high'];

/**
 * Parse an optional NUMERIC value. NULL stays null instead of becoming NaN.
 * @param {string|number|null|undefined} value
 * @returns {number|null}
 */
function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Cast NUMERIC columns of a club_configs row to JS numbers.
 * @param {Object} row - Raw row from pg QueryResult
 * @returns {Object}
 */
function normaliseConfig(row) {
  return {
    id:             row.id,
    club:           row.club,
    label:          row.label,
    shaft_flex:     row.shaft_flex,
    shaft_weight_g: toNumberOrNull(row.shaft_weight_g),
    kick_point:     row.kick_point,
    torque:         toNumberOrNull(row.torque),
    length_in:      toNumberOrNull(row.length_in),
    loft:           toNumberOrNull(row.loft),
    created_at:     row.created_at,
  };
}

/**
 * Validate a create/update body and return the values in column order, or an
 * error message string when the body is invalid.
 * @param {Object} body - req.body
 * @returns {{ values: Array } | { error: string }}
 */
function readConfigBody(body) {
  const { club, label, shaft_flex } = body;
  const kick = body.kick_point || null;

  if (!club || !label || !shaft_flex) {
    return { error: 'club, label and shaft_flex are required' };
  }
  if (!VALID_FLEX.includes(shaft_flex)) {
    return { error: `shaft_flex must be one of ${VALID_FLEX.join(', ')}` };
  }
  if (kick !== null && !VALID_KICK.includes(kick)) {
    return { error: `kick_point must be one of ${VALID_KICK.join(', ')}` };
  }

  return {
    values: [
      club,
      label,
      shaft_flex,
      toNumberOrNull(body.shaft_weight_g),
      kick,
      toNumberOrNull(body.torque),
      toNumberOrNull(body.length_in),
      toNumberOrNull(body.loft),
    ],
  };
}

// ---------------------------------------------------------------------------
// GET /api/club-configs
// ---------------------------------------------------------------------------
/** Return every setup, grouped by club then newest first. */
const getAllConfigs = async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM club_configs ORDER BY club, created_at DESC'
    );
    res.json(result.rows.map(normaliseConfig));
  } catch (err) {
    console.error('getAllConfigs error:', err);
    res.status(500).json({ error: 'Failed to retrieve club setups' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/club-configs
// ---------------------------------------------------------------------------
const createConfig = async (req, res) => {
  const parsed = readConfigBody(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const result = await db.query(
      `INSERT INTO club_configs
         (club, label, shaft_flex, shaft_weight_g, kick_point, torque, length_in, loft)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      parsed.values
    );
    res.status(201).json(normaliseConfig(result.rows[0]));
  } catch (err) {
    console.error('createConfig error:', err);
    res.status(500).json({ error: 'Failed to create club setup' });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/club-configs/:id
// ---------------------------------------------------------------------------
const updateConfig = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Setup id must be a number' });
  }

  const parsed = readConfigBody(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const result = await db.query(
      `UPDATE club_configs
       SET club           = $1,
           label          = $2,
           shaft_flex     = $3,
           shaft_weight_g = $4,
           kick_point     = $5,
           torque         = $6,
           length_in      = $7,
           loft           = $8
       WHERE id = $9
       RETURNING *`,
      [...parsed.values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Club setup with id ${id} not found` });
    }

    res.json(normaliseConfig(result.rows[0]));
  } catch (err) {
    console.error('updateConfig error:', err);
    res.status(500).json({ error: 'Failed to update club setup' });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/club-configs/:id
// ---------------------------------------------------------------------------
/** Shots logged against the setup are kept; their club_config_id becomes NULL. */
const deleteConfig = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Setup id must be a number' });
  }

  try {
    const result = await db.query(
      'DELETE FROM club_configs WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Club setup with id ${id} not found` });
    }

    res.json({ message: `Club setup ${id} deleted successfully` });
  } catch (err) {
    console.error('deleteConfig error:', err);
    res.status(500).json({ error: 'Failed to delete club setup' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/club-configs/stats?ids=1,2
// ---------------------------------------------------------------------------
/**
 * Return aggregated shot stats and shaft-fit feedback for each requested setup.
 * Averages and standard deviations are computed in SQL; AVG/STDDEV ignore NULLs,
 * so shots without optional fields simply don't count toward those stats.
 */
const getConfigStats = async (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map((v) => parseInt(v, 10))
    .filter((v) => !isNaN(v));

  if (ids.length === 0) {
    return res.status(400).json({ error: 'ids query parameter is required, e.g. ?ids=1,2' });
  }

  try {
    const result = await db.query(
      `SELECT c.*,
              COUNT(s.id)                                    AS shots,
              AVG(s.club_speed)                              AS club_speed_avg,
              STDDEV_SAMP(s.club_speed)                      AS club_speed_sd,
              AVG(s.ball_speed)                              AS ball_speed_avg,
              AVG(s.ball_speed / NULLIF(s.club_speed, 0))    AS smash_avg,
              AVG(s.launch_angle)                            AS launch_avg,
              STDDEV_SAMP(s.launch_angle)                    AS launch_sd,
              AVG(s.back_spin)                               AS spin_avg,
              STDDEV_SAMP(s.back_spin)                       AS spin_sd,
              AVG(s.carry_distance)                          AS carry_avg,
              STDDEV_SAMP(s.carry_distance)                  AS carry_sd,
              AVG(s.offline_distance)                        AS offline_avg,
              STDDEV_SAMP(s.offline_distance)                AS offline_sd
       FROM club_configs c
       LEFT JOIN shots s ON s.club_config_id = c.id
       WHERE c.id = ANY($1::int[])
       GROUP BY c.id
       ORDER BY array_position($1::int[], c.id)`,
      [ids]
    );

    const statKeys = [
      'club_speed_avg', 'club_speed_sd', 'ball_speed_avg', 'smash_avg',
      'launch_avg', 'launch_sd', 'spin_avg', 'spin_sd',
      'carry_avg', 'carry_sd', 'offline_avg', 'offline_sd',
    ];

    const response = result.rows.map((row) => {
      const config = normaliseConfig(row);
      const stats = { shots: parseInt(row.shots, 10) };
      statKeys.forEach((key) => { stats[key] = toNumberOrNull(row[key]); });
      return { config, stats, feedback: analyzeShaftFit(config, stats) };
    });

    res.json(response);
  } catch (err) {
    console.error('getConfigStats error:', err);
    res.status(500).json({ error: 'Failed to retrieve setup stats' });
  }
};

module.exports = {
  getAllConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  getConfigStats,
};
