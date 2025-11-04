import express from "express";
import cors from 'cors';
import { AppDataSource } from "./database/data-source";
import userRoutes from "./routes/users.routes";
import { setupSwagger } from "./config/swagger";
import promotionRoutes from "./routes/promotions.routes";
import projectRoutes from "./routes/projects.routes";



const app  = express()

const PORT = process.env.PROMOTION_PORT || 3000;

const main = async () => {

    try {
        await AppDataSource.initialize();
        console.log('Database connection established');

        // 2. Middleware
        app.use(cors());
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        setupSwagger(app);
        // 3. Routes
        //app.use('/users', userRoutes);
        //app.use('/promotions', promotionRoutes);
        //app.use('/projects', projectRoutes);

        

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