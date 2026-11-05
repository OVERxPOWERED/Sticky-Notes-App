import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import notesRouter from './routes/notes.routes.js';
import healthRouter from './routes/health.routes.js';
import cacheMiddleware from './middleware/cache.js';

export const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json());

app.use('/', healthRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Notes API Documentation'
}));

app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
});

app.use('/api/notes', cacheMiddleware(30000), notesRouter);

app.use((req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ error: message });
});