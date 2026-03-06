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

app.use('/companies', companyRoutes);
app.use('/users', userRoutes); // 👈 Ativando a rota de usuários no servidor
app.use('/scraper', scraperRoutes);

app.get('/', (req, res) => {
    res.send({ status: 'online', message: 'API_NFSE SaaS Backend is running' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // Start Scheduler
    require('./services/scheduler').startScheduler();
});