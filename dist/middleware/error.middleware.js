"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    // Erreur de validation TypeORM
    if (err.name === 'QueryFailedError') {
        return res.status(400).json({
            error: 'Database query failed',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Invalid data'
        });
    }
    // Erreur de validation JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }
    // Erreur de token expiré
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired'
        });
    }
    // Erreur de fichier trop volumineux
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'File too large',
            maxSize: '50MB'
        });
    }
    // Erreur générale
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
