import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { U } from "@faker-js/faker/dist/airline-CLphikKp";
import { CriterionGrade, Defense, Deliverable, DeliverableRule, DeliverableSubmission, Grade, GradingCriterion, GradingGrid, Group, Project,Report, Promotion, ReportSection, User } from "../entities/Entities";
dotenv.config();
console.log('Connecting to database with config:')

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'projectacademy',
    synchronize: true,
    logging: false,
    entities: [User, Project, Promotion,Group,Deliverable,DeliverableRule,DeliverableSubmission,Report,
      ReportSection, Defense,GradingGrid,GradingCriterion,Grade,CriterionGrade
    ],
    migrations: ["src/migrations/*.ts"],
    subscribers: ["src/subscribers/*.ts"],
});
