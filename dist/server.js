"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
const data_source_1 = require("./database/data-source");
const app_1 = __importDefault(require("./app"));
// Charger les variables d'environnement
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        //await ensureDatabase();
        // Initialiser la base de données
        await data_source_1.AppDataSource.initialize();
        console.log('✅ Database connected successfully');
        // Créer le dossier uploads s'il n'existe pas
        const fs = require('fs');
        const uploadsDir = 'uploads';
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('📁 Uploads directory created');
        }
        // Démarrer le serveur
        const server = app_1.default.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
            console.log(`📊 API Status: http://localhost:${PORT}/api/status`);
            if (process.env.NODE_ENV === 'development') {
                console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
                console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
            }
        });
        // Gestion gracieuse de l'arrêt
        const gracefulShutdown = (signal) => {
            console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
            server.close(async () => {
                console.log('🔌 HTTP server closed');
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
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        console.error('❌ Error during server initialization:', error);
        process.exit(1);
    }
}
// Démarrer le serveur
startServer();
