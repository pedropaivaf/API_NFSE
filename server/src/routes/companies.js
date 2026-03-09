
const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const companyController = require('../controllers/companyController');
const nfsController = require('../controllers/nfsController');

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

// POST /companies/:id/credentials - Update certificate credentials
router.post('/:id/credentials', companyController.updateCompanyCredentials);

// GET /companies/all-nfs - List All NFS with Company Info
router.get('/all-nfs', companyController.getAllNfs);

// GET /companies/:id/nfs - List NFS for a company
router.get('/:id/nfs', companyController.getNfs);

// GET /companies/grouped-nfs - List Grouped NFS
router.get('/grouped-nfs', nfsController.getGroupedNfs);

// GET /companies/stats - Dashboard stats
router.get('/stats', nfsController.getDashboardStats);

// GET /companies/:id/download-zip - Download All XMLs as ZIP
router.get('/:id/download-zip', nfsController.downloadZippedNfse);

// DELETE /companies/:id/nfs - Reset all notes for a company
router.delete('/:id/nfs', nfsController.resetCompanyNfs);

module.exports = router;
