"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const data_source_1 = require("./database/data-source");
const app_1 = __importDefault(require("./app"));
dotenv_1.default.config();
// Ensure PORT is a number to match the http.Server.listen overloads
const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DOMAIN = process.env.DOMAIN || 'localhost';
async function startServer() {
    try {
        await data_source_1.AppDataSource.initialize();
        console.log('✅ Database connected successfully');
        const uploadsDir = 'uploads';
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            console.log('📁 Uploads directory created');
        }
        // ✅ Pour Render : un simple serveur HTTP sur process.env.PORT
        const server = http_1.default.createServer(app_1.default);
        server.listen(Number(PORT), '0.0.0.0', () => {
            const baseUrl = NODE_ENV === 'production'
                ? `https://${DOMAIN}`
                : `http://localhost:${PORT}`;
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📚 Swagger docs: ${baseUrl}/api-docs`);
            console.log(`🗄️  DB: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
        });
        process.on('SIGTERM', () => {
            console.log('🛑 SIGTERM - shutting down');
            server.close();
        });
    }
    catch (error) {
        console.error('❌ Error during server start:', error);
        process.exit(1);
    }
}
startServer();
