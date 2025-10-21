"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv = __importStar(require("dotenv"));
const Entities_1 = require("../entities/Entities");
dotenv.config();
console.log('Connecting to database with config:');
exports.AppDataSource = new typeorm_1.DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'projectacademy',
    synchronize: false,
    logging: false,
    entities: [Entities_1.User, Entities_1.Project, Entities_1.Promotion, Entities_1.Group, Entities_1.Deliverable, Entities_1.DeliverableRule, Entities_1.DeliverableSubmission, Entities_1.Report,
        Entities_1.ReportSection, Entities_1.Defense, Entities_1.GradingGrid, Entities_1.GradingCriterion, Entities_1.Grade, Entities_1.CriterionGrade, Entities_1.SubmissionFingerprint, // 👈 ajoute bien celle-ci !
        Entities_1.SimilarityResult,
    ],
    migrations: ["src/migrations/*.ts"],
    subscribers: ["src/subscribers/*.ts"],
});
