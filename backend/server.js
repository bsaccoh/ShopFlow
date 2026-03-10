const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sendError } = require('./utils/response');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(cookieParser());

// Raw body parser for webhooks BEFORE express.json()
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// API Version prefix
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// Health check endpoint
app.get(`${API_PREFIX}/health`, (req, res) => {
    res.status(200).json({ success: true, message: 'POS API is running healthy' });
});

// Import Routes
const apiRoutes = require('./routes');
app.use(`${API_PREFIX}`, apiRoutes);

// Setup Swagger API Documentation
const setupSwagger = require('./config/swagger');
setupSwagger(app);

// Start Background Jobs
const { startReconciliationJob } = require('./modules/payments/reconciliation.job');
startReconciliationJob();

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'API Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Error]:', err.stack);
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    sendError(res, message, err.stack, status);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`🚀 POS Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

    // Run Database Sync after server is up to avoid blocking health checks
    try {
        const { syncDatabase } = require('./database/sync');
        await syncDatabase();
    } catch (error) {
        console.error('Failed to initiate database sync:', error);
    }
});

module.exports = app;
