import 'reflect-metadata';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { AppDataSource } from './database/data-source';
import app from './app';
import { ensureDatabase } from './database/ensure-database';

// Charger les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 4000;
const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DOMAIN = process.env.DOMAIN || 'test-projet.com';

// Fonction pour vérifier si les certificats SSL existent
const certificatesExist = (): boolean => {
  try {
    const certPath = `/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`;
    const keyPath = `/etc/letsencrypt/live/${DOMAIN}/privkey.pem`;
    return fs.existsSync(certPath) && fs.existsSync(keyPath);
  } catch (error) {
    return false;
  }
};

async function startServer() {
  try {
    // Initialiser la base de données
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = 'uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Uploads directory created');
    }

    let server: http.Server | https.Server;
    let httpRedirectServer: http.Server | null = null;

    // Configuration HTTPS pour la production avec certificats SSL
    if (NODE_ENV === 'production' && certificatesExist()) {
      console.log('🔐 Starting HTTPS server with SSL certificates...');
      
      const httpsOptions = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${DOMAIN}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`)
      };

      // Serveur HTTPS principal
      server = https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS Server running on https://${DOMAIN}:${HTTPS_PORT}`);
        console.log(`📚 API Documentation: https://${DOMAIN}:${HTTPS_PORT}/api-docs`);
        console.log(`🔍 Health Check: https://${DOMAIN}:${HTTPS_PORT}/health`);
        console.log(`📊 API Status: https://${DOMAIN}:${HTTPS_PORT}/api/status`);
        console.log(`🔧 Environment: ${NODE_ENV}`);
        console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
      });

      // Serveur HTTP qui redirige vers HTTPS
      httpRedirectServer = http.createServer((req, res) => {
        const host = req.headers.host?.split(':')[0] || DOMAIN;
        const httpsUrl = `https://${host}:${HTTPS_PORT}${req.url}`;
        
        console.log(`🔄 HTTP -> HTTPS redirect: ${req.url} -> ${httpsUrl}`);
        
        res.writeHead(301, { 
          'Location': httpsUrl,
          'Cache-Control': 'no-cache'
        });
        res.end();
      }).listen(PORT, '0.0.0.0', () => {
        console.log(`🔄 HTTP Redirect server running on port ${PORT}`);
        console.log(`   Redirecting http://${DOMAIN}:${PORT} -> https://${DOMAIN}:${HTTPS_PORT}`);
      });

    } else {
      // Mode développement ou pas de certificats - HTTP seulement
      console.log('🌍 Starting HTTP server...');
      
      server = http.createServer(app).listen(PORT, '0.0.0.0', () => {
        const baseUrl = NODE_ENV === 'development' 
          ? `http://localhost:${PORT}` 
          : `http://${DOMAIN}:${PORT}`;
        
        console.log(`🚀 HTTP Server running on ${baseUrl}`);
        console.log(`📚 API Documentation: ${baseUrl}/api-docs`);
        console.log(`🔍 Health Check: ${baseUrl}/health`);
        console.log(`📊 API Status: ${baseUrl}/api/status`);
        console.log(`🔧 Environment: ${NODE_ENV}`);
        console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
        
        if (!certificatesExist() && NODE_ENV === 'production') {

          console.log(`   /etc/letsencrypt/live/${DOMAIN}/`);
        }
      });
    }

    // Gestion gracieuse de l'arrêt
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
      // Fermer le serveur HTTP de redirection s'il existe
      if (httpRedirectServer) {
        httpRedirectServer.close(() => {
          console.log('🔌 HTTP redirect server closed');
        });
      }
      
      server.close(async () => {
        console.log('🔌 Main server closed');
        
        try {
          await AppDataSource.destroy();
          console.log('🗄️  Database connection closed');
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown après 30 secondes
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Gestion des erreurs non capturées
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    console.error('❌ Error during server initialization:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();