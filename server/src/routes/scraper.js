const express = require('express');
const router = express.Router();
const nfseScraperService = require('../services/nfseScraperService');

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
