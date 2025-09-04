"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const data_source_1 = require("./database/data-source");
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const swagger_1 = require("./config/swagger");
const promotions_routes_1 = __importDefault(require("./routes/promotions.routes"));
const projects_routes_1 = __importDefault(require("./routes/projects.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PROMOTION_PORT || 3000;
const main = async () => {
    try {
        await data_source_1.AppDataSource.initialize();
        console.log('Database connection established');
        // 2. Middleware
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        app.use(express_1.default.urlencoded({ extended: true }));
        (0, swagger_1.setupSwagger)(app);
        // 3. Routes
        app.use('/users', users_routes_1.default);
        app.use('/promotions', promotions_routes_1.default);
        app.use('/projects', projects_routes_1.default);
        // 5. Lancement serveur
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Error establishing database connection:', error);
    }
};
main()
    .catch((err) => {
    console.error('Error starting the server:', err);
});
