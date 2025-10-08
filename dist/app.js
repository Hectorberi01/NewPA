"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const PORT = Number(process.env.PORT) || 3000;
const app = (0, express_1.default)();
// ===== MIDDLEWARE POUR DÉTECTER HTTPS =====
const isHttps = (req) => {
    return req.secure ||
        req.headers['x-forwarded-proto'] === 'https' ||
        req.headers['x-forwarded-ssl'] === 'on';
};
app.get('/api-docs/swagger.json', (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const dynamicSpecs = {
        ...swagger_config_1.specs,
        servers: [
            {
                url: baseUrl,
                description: 'Current server'
            }
        ]
    };
    res.json(dynamicSpecs);
});
// ===== MIDDLEWARES DE SÉCURITÉ =====
// Configuration Helmet globale (sans COOP)
app.use((0, helmet_1.default)({
    hsts: false, // HSTS sera géré par Nginx
    contentSecurityPolicy: false, // CSP sera définie spécifiquement
    crossOriginOpenerPolicy: false, // COOP sera géré manuellement
    originAgentCluster: false,
}));
// ===== MIDDLEWARE COOP CONDITIONNEL =====
app.use((req, res, next) => {
    if (isHttps(req)) {
        // Appliquer COOP seulement en HTTPS
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    }
    next();
});
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
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL || 'https://app.student-projects.com']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200'],
    credentials: true,
    optionsSuccessStatus: 200
}));
// ===== CONFIGURATION SPÉCIFIQUE POUR API-DOCS =====
app.use("/api-docs", (0, helmet_1.default)({
    hsts: false,
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:", "https:"],
            "font-src": ["'self'", "data:"],
            "object-src": ["'none'"],
            "connect-src": ["'self'"]
        }
    },
    // COOP déjà géré par le middleware global
    crossOriginOpenerPolicy: false,
    originAgentCluster: false
}));
// ===== MIDDLEWARES GÉNÉRAUX =====
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Servir les fichiers statiques (uploads)
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ===== DOCUMENTATION API =====
app.use('/api-docs', swagger_config_1.swaggerUi.serve, swagger_config_1.swaggerUi.setup(undefined, {
    explorer: true,
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .swagger-ui .opblock-summary {
      cursor: pointer !important;
    }
    .swagger-ui .opblock {
      border: 1px solid #d1d5db;
      margin-bottom: 10px;
    }
  `,
    customSiteTitle: "API Gestionnaire de Projets Étudiants",
    swaggerOptions: {
        url: '/api-docs/swagger.json', // URL vers votre spec dynamique
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        validatorUrl: null,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        defaultModelRendering: 'model',
        syntaxHighlight: {
            activate: true,
            theme: "agate"
        }
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
        version: process.env.npm_package_version || '1.0.0',
        https: isHttps(req) // Indiquer si la requête est en HTTPS
    });
});
app.get('/api/status', (req, res) => {
    res.json({
        api: 'Student Projects Management API',
        version: '1.0.0',
        status: 'operational',
        https: isHttps(req),
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
