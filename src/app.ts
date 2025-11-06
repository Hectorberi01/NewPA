import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { specs, swaggerUi } from './swagger/swagger.config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import path from 'path';
import passport from 'passport';
import session from 'express-session';
import "./config/passport";
import reportRoutes from './routes/reports.routes';


dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(helmet({
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

const isHttps = (req: express.Request) => {
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
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
app.use(passport.initialize());
app.use(passport.session());

// ===== FICHIERS STATIQUES =====
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== SWAGGER JSON DYNAMIQUE =====
app.get('/api-docs/swagger.json', (req, res) => {
  const protocol = isHttps(req) ? 'https' : req.protocol;
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
  
  res.setHeader('Content-Type', 'application/json');
  res.json(dynamicSpecs);
});

// ===== DOCUMENTATION SWAGGER =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(undefined, {
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
app.use('/api', routes);
app.use('/api/reports', reportRoutes); // Pour s'assurer que les routes des rapports fonctionnent

// ===== ERROR HANDLERS =====
app.use(notFoundHandler);
app.use(errorHandler);

export default app;