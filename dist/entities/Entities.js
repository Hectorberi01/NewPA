"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriterionGrade = exports.Grade = exports.GradingCriterion = exports.GradingGrid = exports.Defense = exports.ReportSection = exports.Report = exports.DeliverableSubmission = exports.DeliverableRule = exports.Deliverable = exports.Group = exports.Project = exports.Promotion = exports.User = void 0;
const typeorm_1 = require("typeorm");
// ===== ENTITÉS PRINCIPALES =====
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "resetToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "resetTokenExpiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['teacher', 'student'] }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "googleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "microsoftId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Promotion, promotion => promotion.teacher),
    __metadata("design:type", Array)
], User.prototype, "teacherPromotions", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Promotion, promotion => promotion.students),
    __metadata("design:type", Array)
], User.prototype, "studentPromotions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Project, project => project.teacher),
    __metadata("design:type", Array)
], User.prototype, "teacherProjects", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Group, group => group.members),
    __metadata("design:type", Array)
], User.prototype, "groups", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)()
], User);
let Promotion = class Promotion {
};
exports.Promotion = Promotion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Promotion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Promotion.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Promotion.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'year' }),
    __metadata("design:type", Number)
], Promotion.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Promotion.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Promotion.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.teacherPromotions),
    __metadata("design:type", User)
], Promotion.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => User, user => user.studentPromotions),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], Promotion.prototype, "students", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Project, project => project.promotion),
    __metadata("design:type", Array)
], Promotion.prototype, "projects", void 0);
exports.Promotion = Promotion = __decorate([
    (0, typeorm_1.Entity)()
], Promotion);
let Project = class Project {
};
exports.Project = Project;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Project.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Project.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Project.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['draft', 'visible'], default: 'draft' }),
    __metadata("design:type", String)
], Project.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Project.prototype, "minGroupSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Project.prototype, "maxGroupSize", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['manual', 'random', 'free'],
        nullable: true
    }),
    __metadata("design:type", String)
], Project.prototype, "groupFormationRule", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Project.prototype, "groupFormationDeadline", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Project.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Project.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Project.prototype, "promotionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, user => user.teacherProjects),
    __metadata("design:type", User)
], Project.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Promotion, promo => promo.projects, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'promotionId' }) // 🔒 force le nom
    ,
    __metadata("design:type", Promotion)
], Project.prototype, "promotion", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Group, group => group.project),
    __metadata("design:type", Array)
], Project.prototype, "groups", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Deliverable, deliverable => deliverable.project),
    __metadata("design:type", Array)
], Project.prototype, "deliverables", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Report, report => report.project),
    __metadata("design:type", Array)
], Project.prototype, "reports", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Defense, defense => defense.project),
    __metadata("design:type", Array)
], Project.prototype, "defenses", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => GradingGrid, gradingGrid => gradingGrid.project),
    __metadata("design:type", Array)
], Project.prototype, "gradingGrids", void 0);
exports.Project = Project = __decorate([
    (0, typeorm_1.Entity)()
], Project);
let Group = class Group {
};
exports.Group = Group;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Group.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Group.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Group.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Group.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project, project => project.groups),
    __metadata("design:type", Project)
], Group.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => User, user => user.groups),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], Group.prototype, "members", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => DeliverableSubmission, submission => submission.group),
    __metadata("design:type", Array)
], Group.prototype, "deliverableSubmissions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Report, report => report.group),
    __metadata("design:type", Array)
], Group.prototype, "reports", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Defense, defense => defense.group),
    __metadata("design:type", Array)
], Group.prototype, "defenses", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Grade, grade => grade.group),
    __metadata("design:type", Array)
], Group.prototype, "grades", void 0);
exports.Group = Group = __decorate([
    (0, typeorm_1.Entity)()
], Group);
// ===== LIVRABLES =====
let Deliverable = class Deliverable {
};
exports.Deliverable = Deliverable;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Deliverable.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Deliverable.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Deliverable.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['archive', 'git_link'] }),
    __metadata("design:type", String)
], Deliverable.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Deliverable.prototype, "deadline", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Deliverable.prototype, "allowLateSubmission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Deliverable.prototype, "penaltyPerHour", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Deliverable.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Deliverable.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project, project => project.deliverables),
    __metadata("design:type", Project)
], Deliverable.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => DeliverableRule, rule => rule.deliverable),
    __metadata("design:type", Array)
], Deliverable.prototype, "validationRules", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => DeliverableSubmission, submission => submission.deliverable),
    __metadata("design:type", Array)
], Deliverable.prototype, "submissions", void 0);
exports.Deliverable = Deliverable = __decorate([
    (0, typeorm_1.Entity)()
], Deliverable);
let DeliverableRule = class DeliverableRule {
};
exports.DeliverableRule = DeliverableRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], DeliverableRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['max_size', 'file_presence', 'folder_structure', 'file_content'] }),
    __metadata("design:type", String)
], DeliverableRule.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], DeliverableRule.prototype, "configuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeliverableRule.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Deliverable, deliverable => deliverable.validationRules),
    __metadata("design:type", Deliverable)
], DeliverableRule.prototype, "deliverable", void 0);
exports.DeliverableRule = DeliverableRule = __decorate([
    (0, typeorm_1.Entity)()
], DeliverableRule);
let DeliverableSubmission = class DeliverableSubmission {
};
exports.DeliverableSubmission = DeliverableSubmission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], DeliverableSubmission.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DeliverableSubmission.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DeliverableSubmission.prototype, "gitUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], DeliverableSubmission.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], DeliverableSubmission.prototype, "isLate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], DeliverableSubmission.prototype, "penalty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], DeliverableSubmission.prototype, "validationResults", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], DeliverableSubmission.prototype, "similarityScore", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Deliverable, deliverable => deliverable.submissions),
    __metadata("design:type", Deliverable)
], DeliverableSubmission.prototype, "deliverable", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Group, group => group.deliverableSubmissions),
    __metadata("design:type", Group)
], DeliverableSubmission.prototype, "group", void 0);
exports.DeliverableSubmission = DeliverableSubmission = __decorate([
    (0, typeorm_1.Entity)()
], DeliverableSubmission);
// ===== RAPPORTS =====
let Report = class Report {
};
exports.Report = Report;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Report.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Report.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Report.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Report.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Report.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project, project => project.reports),
    __metadata("design:type", Project)
], Report.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Group, group => group.reports),
    __metadata("design:type", Group)
], Report.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ReportSection, section => section.report),
    __metadata("design:type", Array)
], Report.prototype, "sections", void 0);
exports.Report = Report = __decorate([
    (0, typeorm_1.Entity)()
], Report);
let ReportSection = class ReportSection {
};
exports.ReportSection = ReportSection;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ReportSection.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ReportSection.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ReportSection.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], ReportSection.prototype, "orderIndex", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReportSection.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ReportSection.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Report, report => report.sections),
    __metadata("design:type", Report)
], ReportSection.prototype, "report", void 0);
exports.ReportSection = ReportSection = __decorate([
    (0, typeorm_1.Entity)()
], ReportSection);
// ===== SOUTENANCES =====
let Defense = class Defense {
};
exports.Defense = Defense;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Defense.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Defense.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Defense.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Defense.prototype, "orderIndex", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Defense.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Defense.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Defense.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project, project => project.defenses),
    __metadata("design:type", Project)
], Defense.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Group, group => group.defenses),
    __metadata("design:type", Group)
], Defense.prototype, "group", void 0);
exports.Defense = Defense = __decorate([
    (0, typeorm_1.Entity)()
], Defense);
// ===== NOTATION =====
let GradingGrid = class GradingGrid {
};
exports.GradingGrid = GradingGrid;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], GradingGrid.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GradingGrid.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['deliverable', 'report', 'defense'] }),
    __metadata("design:type", String)
], GradingGrid.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 1.0 }),
    __metadata("design:type", Number)
], GradingGrid.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], GradingGrid.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], GradingGrid.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], GradingGrid.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Project, project => project.gradingGrids),
    __metadata("design:type", Project)
], GradingGrid.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => GradingCriterion, criterion => criterion.gradingGrid),
    __metadata("design:type", Array)
], GradingGrid.prototype, "criteria", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Grade, grade => grade.gradingGrid),
    __metadata("design:type", Array)
], GradingGrid.prototype, "grades", void 0);
exports.GradingGrid = GradingGrid = __decorate([
    (0, typeorm_1.Entity)()
], GradingGrid);
let GradingCriterion = class GradingCriterion {
};
exports.GradingCriterion = GradingCriterion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], GradingCriterion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GradingCriterion.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], GradingCriterion.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], GradingCriterion.prototype, "maxScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 1.0 }),
    __metadata("design:type", Number)
], GradingCriterion.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['group', 'individual'] }),
    __metadata("design:type", String)
], GradingCriterion.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], GradingCriterion.prototype, "hasComments", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => GradingGrid, gradingGrid => gradingGrid.criteria),
    __metadata("design:type", GradingGrid)
], GradingCriterion.prototype, "gradingGrid", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CriterionGrade, criterionGrade => criterionGrade.criterion),
    __metadata("design:type", Array)
], GradingCriterion.prototype, "criterionGrades", void 0);
exports.GradingCriterion = GradingCriterion = __decorate([
    (0, typeorm_1.Entity)()
], GradingCriterion);
let Grade = class Grade {
};
exports.Grade = Grade;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Grade.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Grade.prototype, "totalScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Grade.prototype, "globalComments", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Grade.prototype, "isValidated", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Grade.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Grade.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => GradingGrid, gradingGrid => gradingGrid.grades),
    __metadata("design:type", GradingGrid)
], Grade.prototype, "gradingGrid", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Group, group => group.grades),
    __metadata("design:type", Group)
], Grade.prototype, "group", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User, { nullable: true }) // Pour les notes individuelles
    ,
    __metadata("design:type", User)
], Grade.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CriterionGrade, criterionGrade => criterionGrade.grade),
    __metadata("design:type", Array)
], Grade.prototype, "criterionGrades", void 0);
exports.Grade = Grade = __decorate([
    (0, typeorm_1.Entity)()
], Grade);
let CriterionGrade = class CriterionGrade {
};
exports.CriterionGrade = CriterionGrade;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CriterionGrade.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], CriterionGrade.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CriterionGrade.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Grade, grade => grade.criterionGrades),
    __metadata("design:type", Grade)
], CriterionGrade.prototype, "grade", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => GradingCriterion, criterion => criterion.criterionGrades),
    __metadata("design:type", GradingCriterion)
], CriterionGrade.prototype, "criterion", void 0);
exports.CriterionGrade = CriterionGrade = __decorate([
    (0, typeorm_1.Entity)()
], CriterionGrade);
