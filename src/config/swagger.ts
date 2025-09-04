import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Student Project Manager API",
            version: "1.0.0",
            description: "Documentation de l'API Student Project Manager",
        },
        servers: [
            {
                url: "http://localhost:3000",
            },
        ],
    },
    apis: ["./src/routes/*.ts",
            "./src/config/components/*.ts", // Chemins où Swagger va chercher les annotations
            "./src/controllers/*.ts", // Chemins où Swagger va chercher les annotations
            "./src/entities/*.ts" // Chemins où Swagger va chercher les annotations
    ], // Chemins où Swagger va chercher les annotations
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
