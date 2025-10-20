"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const data_source_1 = require("./database/data-source");
const app_1 = __importDefault(require("./app"));
// Charger les variables d'environnement
dotenv_1.default.config();
const PORT = process.env.PORT || 4000;
//const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DOMAIN = process.env.DOMAIN || 'test-projet.com';
// Fonction pour vérifier si les certificats SSL existent
const certificatesExist = () => {
    try {
        const certPath = `/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`;
        const keyPath = `/etc/letsencrypt/live/${DOMAIN}/privkey.pem`;
        return fs_1.default.existsSync(certPath) && fs_1.default.existsSync(keyPath);
    }
    catch (error) {
        return false;
    }
};
async function startServer() {
    try {
        // Initialiser la base de données
        await data_source_1.AppDataSource.initialize();
        console.log('✅ Database connected successfully');
        // Créer le dossier uploads s'il n'existe pas
        const uploadsDir = 'uploads';
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            console.log('📁 Uploads directory created');
        }
        let server;
        let httpRedirectServer = null;
        // Configuration HTTPS pour la production avec certificats SSL
        if (NODE_ENV === 'production' && certificatesExist()) {
            console.log('🔐 Starting HTTPS server with SSL certificates...');
            const httpsOptions = {
                key: fs_1.default.readFileSync(`/etc/letsencrypt/live/${DOMAIN}/privkey.pem`),
                cert: fs_1.default.readFileSync(`/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`)
            };
            // Serveur HTTPS principal
            server = https_1.default.createServer(httpsOptions, app_1.default).listen(HTTPS_PORT, () => {
                console.log(`🔒 HTTPS Server running on https://${DOMAIN}:${HTTPS_PORT}`);
                console.log(`📚 API Documentation: https://${DOMAIN}:${HTTPS_PORT}/api-docs`);
                console.log(`🔍 Health Check: https://${DOMAIN}:${HTTPS_PORT}/health`);
                console.log(`📊 API Status: https://${DOMAIN}:${HTTPS_PORT}/api/status`);
                console.log(`🔧 Environment: ${NODE_ENV}`);
                console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
            });
            // Serveur HTTP qui redirige vers HTTPS
            httpRedirectServer = http_1.default.createServer((req, res) => {
                const host = req.headers.host?.split(':')[0] || DOMAIN;
                const httpsUrl = `https://${host}:${HTTPS_PORT}${req.url}`;
                console.log(`🔄 HTTP -> HTTPS redirect: ${req.url} -> ${httpsUrl}`);
                res.writeHead(301, {
                    'Location': httpsUrl,
                    'Cache-Control': 'no-cache'
                });
                res.end();
            }).listen(Number(PORT), '0.0.0.0', () => {
                console.log(`🔄 HTTP Redirect server running on port ${PORT}`);
                console.log(`   Redirecting http://${DOMAIN}:${PORT} -> https://${DOMAIN}:${HTTPS_PORT}`);
            });
        }
        else {
            // Mode développement ou pas de certificats - HTTP seulement
            console.log('🌍 Starting HTTP server...');
            server = http_1.default.createServer(app_1.default).listen(Number(PORT), '0.0.0.0', () => {
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
        const gracefulShutdown = (signal) => {
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
                    await data_source_1.AppDataSource.destroy();
                    console.log('🗄️  Database connection closed');
                    console.log('✅ Graceful shutdown completed');
                    process.exit(0);
                }
                catch (error) {
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
    }
    catch (error) {
        console.error('❌ Error during server initialization:', error);
        process.exit(1);
    }
}
// Démarrer le serveur
startServer();
