"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
const setupSwagger = (app) => {
    app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
};
exports.setupSwagger = setupSwagger;
