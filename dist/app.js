"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const routes_1 = __importDefault(require("./routes"));
const swagger_config_1 = require("./swagger/swagger.config");
const error_middleware_1 = require("./middleware/error.middleware");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// ===== MIDDLEWARES DE SÉCURITÉ =====
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"]
        }
    }
}));
app.use((0, compression_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite chaque IP à 100 requêtes par fenêtre
    message: {
        error: 'Trop de requêtes depuis cette IP, réessayez dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
//app.use('/api/auth', index);
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL || 'https://app.student-projects.com']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200'],
    credentials: true,
    optionsSuccessStatus: 200
}));
// ===== MIDDLEWARES GÉNÉRAUX =====
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Servir les fichiers statiques (uploads)
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ===== DOCUMENTATION API =====
app.use('/api-docs', swagger_config_1.swaggerUi.serve, swagger_config_1.swaggerUi.setup(swagger_config_1.specs, {
    explorer: true,
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
  `,
    customSiteTitle: "API Gestionnaire de Projets Étudiants",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        defaultModelRendering: 'model'
    }
}));
// Redirect root to API docs
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});
// ===== ROUTES API =====
app.use('/api', routes_1.default);
// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});
app.get('/api/status', (req, res) => {
    res.json({
        api: 'Student Projects Management API',
        version: '1.0.0',
        status: 'operational',
        features: [
            'User management (teachers/students)',
            'Promotion management',
            'Project management with configurable groups',
            'Deliverable management with automatic validation',
            'Collaborative online reports',
            'Multi-criteria grading system',
            'Defense scheduling',
            'PDF document generation',
            'Automatic plagiarism detection',
            'OAuth authentication (Google/Microsoft)'
        ]
    });
});
// ===== GESTION D'ERREURS =====
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
exports.default = app;
