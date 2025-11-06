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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const routes_1 = __importDefault(require("./routes"));
const swagger_config_1 = require("./swagger/swagger.config");
const error_middleware_1 = require("./middleware/error.middleware");
const path_1 = __importDefault(require("path"));
const passport_1 = __importDefault(require("passport"));
const express_session_1 = __importDefault(require("express-session"));
require("./config/passport");
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
dotenv.config();
const PORT = Number(process.env.PORT) || 3000;
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
const isHttps = (req) => {
    return req.secure ||
        req.headers['x-forwarded-proto'] === 'https' ||
        req.headers['x-forwarded-ssl'] === 'on';
};
app.use((req, res, next) => {
    if (isHttps(req)) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    }
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));
// ===== PASSPORT =====
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// ===== FICHIERS STATIQUES =====
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ===== SWAGGER JSON DYNAMIQUE =====
app.get('/api-docs/swagger.json', (req, res) => {
    const protocol = isHttps(req) ? 'https' : req.protocol;
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
    res.setHeader('Content-Type', 'application/json');
    res.json(dynamicSpecs);
});
// ===== DOCUMENTATION SWAGGER =====
app.use('/api-docs', swagger_config_1.swaggerUi.serve, swagger_config_1.swaggerUi.setup(undefined, {
    explorer: true,
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
    .swagger-ui .scheme-container { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
    }
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
        url: '/api-docs/swagger.json',
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
// ===== REDIRECT ROOT =====
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});
// ===== ROUTES API =====
app.use('/api', routes_1.default);
app.use('/api/reports', reports_routes_1.default); // Pour s'assurer que les routes des rapports fonctionnent
// ===== ERROR HANDLERS =====
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
exports.default = app;
