// =============================================================================
// routes/shots.js – Express Router for /api/shots
// =============================================================================
// This file is intentionally thin: it only defines the URL structure and HTTP
// method for each endpoint, then delegates all business logic to the controller.
// Keeping routing and logic separate makes each layer easier to test and change.
// =============================================================================

const { Router } = require('express');
const controller  = require('../controllers/shotController');
// controller now also exports getShotFeedback for the analysis endpoint

const router = Router();

// GET /api/shots
// Returns all shots ordered by most-recent first. Used to populate the shot list view.
router.get('/', controller.getAllShots);

// GET /api/shots/:id/feedback
// Returns the shot record plus an array of swing analysis feedback items.
// Must be registered before /:id so Express matches the literal '/feedback'
// segment rather than treating it as a second parameter.
router.get('/:id/feedback', controller.getShotFeedback);

// GET /api/shots/:id
// Returns a single shot by its primary key. Returns 404 when the id is unknown.
router.get('/:id', controller.getShotById);

// POST /api/shots
// Creates a new shot record from the JSON body. Returns the inserted row with 201.
router.post('/', controller.createShot);

// PUT /api/shots/:id
// Replaces all editable fields of an existing shot. Returns 404 when unknown.
router.put('/:id', controller.updateShot);

// DELETE /api/shots/:id
// Permanently removes a shot record. Returns 404 when unknown.
router.delete('/:id', controller.deleteShot);

module.exports = router;