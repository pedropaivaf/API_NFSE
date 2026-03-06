const express = require('express');
const router = express.Router();
const nfseScraperService = require('../services/nfseScraperService');
const certificateService = require('../services/certificateService');

// POST /scraper/validate-cert
router.post('/validate-cert', (req, res) => {
    const { certificateFilename, password } = req.body;
    try {
        const result = certificateService.validateCertificate(certificateFilename, password);
        res.json({ success: true, ...result });
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

module.exports = router;
