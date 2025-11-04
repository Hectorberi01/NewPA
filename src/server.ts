import 'reflect-metadata';
import dotenv from 'dotenv';
import http from 'http';
import fs from 'fs';
import { AppDataSource } from './database/data-source';
import app from './app';

dotenv.config();

// Ensure PORT is a number to match the http.Server.listen overloads
const PORT = process.env.PORT!
const NODE_ENV = process.env.NODE_ENV || 'development';
const DOMAIN = process.env.DOMAIN || 'localhost';

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    const uploadsDir = 'uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Uploads directory created');
    }

    // ✅ Pour Render : un simple serveur HTTP sur process.env.PORT
    const server = http.createServer(app);

    server.listen(Number(PORT), '0.0.0.0', () => {
      const baseUrl =
        NODE_ENV === 'production'
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
  } catch (error) {
    console.error('❌ Error during server start:', error);
    process.exit(1);
  }
}

startServer();
