
const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const companyController = require('../controllers/companyController');

// GET /companies - List all companies
router.get('/', companyController.listCompanies);

// GET /companies/local-certificates - List files in V:\Certificado Digital
router.get('/local-certificates', companyController.listLocalCertificates);

// POST /companies/quick - Register company from cert data (no file upload)
router.post('/quick', companyController.createQuickCompany);

// POST /companies - Register new company + Upload Certificate
router.post('/', upload.single('certificate'), companyController.createCompany);

// POST /companies/:id/sync - Trigger Manual Sync
router.post('/:id/sync', companyController.syncCompany);

// GET /companies/all-nfs - List All NFS with Company Info
router.get('/all-nfs', companyController.getAllNfs);

// GET /companies/:id/nfs - List NFS for a company
router.get('/:id/nfs', companyController.getNfs);

// POST /companies/fetch-notes - On-demand fetch from government API
router.post('/fetch-notes', companyController.fetchNotes);

module.exports = router;
