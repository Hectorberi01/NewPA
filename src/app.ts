import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { specs, swaggerUi } from './swagger/swagger.config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const app = express();

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
    ...specs,
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
app.use(helmet({
  hsts: false,                      // HSTS sera géré par Nginx
  contentSecurityPolicy: false,     // CSP sera définie spécifiquement
  crossOriginOpenerPolicy: false,   // COOP sera géré manuellement
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

app.use(compression());

// Rate limiting
const limiter = rateLimit({
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
// app.use(cors({
//   origin: process.env.NODE_ENV === 'production' 
//     ? [process.env.FRONTEND_URL || 'https://app.student-projects.com']
//     : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200'],
//   credentials: true,
//   optionsSuccessStatus: 200
// }));
app.use (cors({
  origin: '*', // Autoriser toutes les origines (à restreindre en production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// ===== CONFIGURATION SPÉCIFIQUE POUR API-DOCS =====
app.use("/api-docs", helmet({
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== DOCUMENTATION API =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(undefined, {
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
app.use('/api', routes);

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
app.use(notFoundHandler);
app.use(errorHandler);

export default app;