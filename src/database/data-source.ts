import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { U } from "@faker-js/faker/dist/airline-CLphikKp";
import { CriterionGrade, Defense, Deliverable, DeliverableRule, DeliverableSubmission, Grade, GradingCriterion, GradingGrid, Group, Project, Report, Promotion, ReportSection, User, SubmissionFingerprint, SimilarityResult, ReportConfig, ReportSectionConfig } from "../entities/Entities";
dotenv.config();
console.log('Connecting to database with config:')

const DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT ?? '3306');
const DB_USERNAME = process.env.DB_USERNAME ?? process.env.DB_USER ?? 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '';
  const DB_DATABASE = process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'student_projects';

  export const AppDataSource = new DataSource({
    type: 'mysql',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    synchronize: true,
    logging: true,
    entities: [User, Project, Promotion, Group, Deliverable, DeliverableRule, DeliverableSubmission, Report,
      ReportSection, Defense, GradingGrid, GradingCriterion, Grade, CriterionGrade, SubmissionFingerprint, SimilarityResult,
      ReportConfig , ReportSectionConfig
  ],
  migrations: ["src/migrations/*.ts"],
  subscribers: ["src/subscribers/*.ts"],
});
