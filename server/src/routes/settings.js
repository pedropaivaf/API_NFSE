const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// GET /api/settings - Get all settings
router.get('/', settingsController.getSettings);

// POST /api/settings - Update settings
router.post('/', settingsController.updateSettings);

// DELETE /api/settings/clear-nfs - Clear all notes
router.delete('/clear-nfs', settingsController.clearNfs);

module.exports = router;
