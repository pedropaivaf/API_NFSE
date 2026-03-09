const express = require('express');
const cors = require('cors');

// Polyfill global.File para compatibilidade do Supabase/Undici com o Node 18 interno do Electron
if (typeof File === 'undefined') {
    global.File = class File extends Blob {
        constructor(fileBits, fileName, options) {
            super(fileBits, options);
            this.name = fileName;
        }
    };
}

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/users'); // 👈 Nova importação
const scraperRoutes = require('./routes/scraper');
const settingsRoutes = require('./routes/settings');

app.use('/companies', companyRoutes);
app.use('/users', userRoutes);
app.use('/scraper', scraperRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
    res.send({ status: 'online', message: 'API_NFSE SaaS Backend is running' });
});

// SSE endpoint for real-time logs
const { logEmitter } = require('./utils/logger');
app.get('/api/logs', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendLog = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    logEmitter.on('log', sendLog);

    req.on('close', () => {
        logEmitter.off('log', sendLog);
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // Start Scheduler
    require('./services/scheduler').startScheduler();
});