import express from "express";
import cors from 'cors';
import { AppDataSource } from "./database/data-source";
import userRoutes from "./routes/users.routes";
import { setupSwagger } from "./config/swagger";
import promotionRoutes from "./routes/promotions.routes";
import projectRoutes from "./routes/projects.routes";
import { r } from "@faker-js/faker/dist/airline-CLphikKp";
import { configurePassport } from "./config/passport";
import * as dotenv from 'dotenv';
dotenv.config();


const app  = express()

const PORT = process.env.PROMOTION_PORT || 3000;

const main = async () => {

    try {
        
        await AppDataSource.initialize();
        console.log('Database connection established');
        console.log('🔍 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Défini' : '❌ Manquant');
        console.log('🔍 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Défini' : '❌ Manquant');
        console.log('🔍 GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
        configurePassport();
        // 2. Middleware
        app.use(cors());
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        setupSwagger(app);
 
        // 5. Lancement serveur
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`)
        })
    }
    catch (error) {
        console.error('Error establishing database connection:', error);
    }  
}

main()
.catch((err) => {
    console.error('Error starting the server:', err);
}
)