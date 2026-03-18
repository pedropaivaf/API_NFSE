const express = require('express');
const router = express.Router();
const nfseScraperService = require('../services/nfseScraperService');
const certificateService = require('../services/certificateService');

// POST /scraper/validate-cert
router.post('/validate-cert', async (req, res) => {
    const { method = 'pfx', certificateFilename, password, loginCnpj, loginPassword } = req.body;
    try {
        if (method === 'pfx') {
            const result = certificateService.validateCertificate(certificateFilename, password);
            return res.json({ success: true, ...result });
        } else {
            const result = await nfseScraperService.validateLogin({ method, loginCnpj, loginPassword });
            return res.json({ success: true, ...result });
        }
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// POST /scraper/fetch-gov
router.post('/fetch-gov', async (req, res) => {
    try {
        const config = req.body;

        // Chamada assíncrona ao RPA Híbrido (Puppeteer + Axios)
        const result = await nfseScraperService.runExtractionJob(config);

        res.json(result);
    } catch (error) {
        console.error('Scraper Route Error:', error);

        let errorMsg = error.message;
        if (error.code === 'ERR_OSSL_PKCS12_MAC_VERIFY_FAILURE') {
            errorMsg = 'Senha do certificado digital está incorreta.';
        }

        res.status(500).json({ error: errorMsg });
    }
});

// POST /scraper/bulk-sync — sincroniza todas as empresas de uma vez para o mês informado
router.post('/bulk-sync', async (req, res) => {
    try {
        const { month, type = 'tomadas' } = req.body;
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: 'Parâmetro "month" obrigatório no formato YYYY-MM.' });
        }
        const result = await nfseScraperService.bulkSyncAllCompanies({ month, type });
        res.json(result);
    } catch (error) {
        console.error('Bulk Sync Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
