// =============================================================================
// routes/clubConfigs.js – Express Router for /api/club-configs
// =============================================================================
// Thin routing layer; all logic lives in clubConfigController.js.
// =============================================================================

const { Router } = require('express');
const controller  = require('../controllers/clubConfigController');

const router = Router();

// GET /api/club-configs
// Returns every club + shaft setup in the bag.
router.get('/', controller.getAllConfigs);

// GET /api/club-configs/stats?ids=1,2
// Returns aggregated shot stats and shaft-fit feedback per setup.
// Must be registered before /:id routes so 'stats' isn't treated as an id.
router.get('/stats', controller.getConfigStats);

// POST /api/club-configs
router.post('/', controller.createConfig);

// PUT /api/club-configs/:id
router.put('/:id', controller.updateConfig);

// DELETE /api/club-configs/:id
// Shots logged against the setup are kept with club_config_id set to NULL.
router.delete('/:id', controller.deleteConfig);

module.exports = router;
