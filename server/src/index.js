
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const companyRoutes = require('./routes/companies');
app.use('/companies', companyRoutes);

app.get('/', (req, res) => {
    res.send({ status: 'online', message: 'API_NFSE SaaS Backend is running' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // Start Scheduler
    require('./services/scheduler').startScheduler();
});
