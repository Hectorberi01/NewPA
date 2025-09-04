import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { specs, swaggerUi } from './swagger/swagger.config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import path from 'path';

const app = express();

// ===== MIDDLEWARES DE SÉCURITÉ =====
app.use(helmet({
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

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); // si tu veux l’isolation (SharedArrayBuffer…)
  next();
});

app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: true, // attention aux iframes/ressources externes
}));

app.use('/api/', limiter);
//app.use('/api/auth', index);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://app.student-projects.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(cors());

// ===== MIDDLEWARES GÉNÉRAUX =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== DOCUMENTATION API =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
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
app.use('/api', routes);

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
app.use(notFoundHandler);
app.use(errorHandler);

export default app;