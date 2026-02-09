
const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const companyController = require('../controllers/companyController');

// POST /companies - Register new company + Upload Certificate
router.post('/', upload.single('certificate'), companyController.createCompany);

// POST /companies/:id/sync - Trigger Manual Sync
router.post('/:id/sync', companyController.syncCompany);

// GET /companies/:id/nfs - List NFS for a company
router.get('/:id/nfs', companyController.getNfs);

module.exports = router;
