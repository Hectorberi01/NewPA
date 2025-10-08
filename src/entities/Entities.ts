import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, JoinColumn, Index, Unique } from 'typeorm';

// ===== ENTITÉS PRINCIPALES =====

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  resetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiry?: Date;

  @Column({ type: 'enum', enum: ['teacher', 'student'] })
  role!: 'teacher' | 'student';

  @Column({ nullable: true })
  googleId?: string;

  @Column({ nullable: true })
  microsoftId?: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Promotion, promotion => promotion.teacher)
  teacherPromotions!: Promotion[];

  @ManyToMany(() => Promotion, promotion => promotion.students)
  studentPromotions!: Promotion[];

  @OneToMany(() => Project, project => project.teacher)
  teacherProjects!: Project[];

  @ManyToMany(() => Group, group => group.members)
  groups!: Group[];
}

@Entity()
export class Promotion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'year' })
  year!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, user => user.teacherPromotions)
  teacher!: User;

  @ManyToMany(() => User, user => user.studentPromotions)
  @JoinTable()
  students!: User[];

  @OneToMany(() => Project, project => project.promotion)
  projects!: Project[];
}

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: ['draft', 'visible'], default: 'draft' })
  status!: 'draft' | 'visible';

  @Column({ type: 'int', nullable: true })
  minGroupSize?: number;

  @Column({ type: 'int', nullable: true })
  maxGroupSize?: number;

  @Column({
    type: 'enum',
    enum: ['manual', 'random', 'free'],
    nullable: true
  })
  groupFormationRule?: 'manual' | 'random' | 'free';

  @Column({ type: 'datetime', nullable: true })
  groupFormationDeadline?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'int', nullable: true })
  promotionId!: number;

  // Relations
  @ManyToOne(() => User, user => user.teacherProjects)
  teacher!: User;

  // @ManyToOne(() => Promotion, promotion => promotion.projects)
  // promotion!: Promotion;
  @ManyToOne(() => Promotion, promo => promo.projects, { nullable: true })
  @JoinColumn({ name: 'promotionId' })   // 🔒 force le nom
  promotion!: Promotion;

  @OneToMany(() => Group, group => group.project)
  groups!: Group[];

  @OneToMany(() => Deliverable, deliverable => deliverable.project)
  deliverables!: Deliverable[];

  @OneToMany(() => Report, report => report.project)
  reports!: Report[];

  @OneToMany(() => Defense, defense => defense.project)
  defenses!: Defense[];

  @OneToMany(() => GradingGrid, gradingGrid => gradingGrid.project)
  gradingGrids!: GradingGrid[];
}

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, project => project.groups)
  project!: Project;

  @ManyToMany(() => User, user => user.groups)
  @JoinTable()
  members!: User[];

  @OneToMany(() => DeliverableSubmission, submission => submission.group)
  deliverableSubmissions!: DeliverableSubmission[];

  @OneToMany(() => Report, report => report.group)
  reports!: Report[];

  @OneToMany(() => Defense, defense => defense.group)
  defenses!: Defense[];

  @OneToMany(() => Grade, grade => grade.group)
  grades!: Grade[];
}

// ===== LIVRABLES =====

@Entity()
export class Deliverable {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: ['archive', 'git_link'] })
  type!: 'archive' | 'git_link';

  @Column({ type: 'datetime' })
  deadline!: Date;

  @Column({ default: false })
  allowLateSubmission!: boolean;

  @Column({ type: 'int', default: 0 })
  penaltyPerHour!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, project => project.deliverables)
  project!: Project;

  @OneToMany(() => DeliverableRule, rule => rule.deliverable)
  validationRules!: DeliverableRule[];

  @OneToMany(() => DeliverableSubmission, submission => submission.deliverable)
  submissions!: DeliverableSubmission[];
}

@Entity()
export class DeliverableRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: ['max_size', 'file_presence', 'folder_structure', 'file_content'] })
  type!: 'max_size' | 'file_presence' | 'folder_structure' | 'file_content';

  @Column({ type: 'text' })
  configuration!: string; // JSON string pour stocker les paramètres spécifiques

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  // Relations
  @ManyToOne(() => Deliverable, deliverable => deliverable.validationRules)
  deliverable!: Deliverable;
}

@Entity()
export class DeliverableSubmission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  filePath?: string;

  @Column({ nullable: true })
  gitUrl?: string;

  @Column({ type: 'datetime' })
  submittedAt!: Date;

  @Column({ default: false })
  isLate!: boolean;

  @Column({ type: 'int', default: 0 })
  penalty!: number;

  @Column({ type: 'json', nullable: true })
  validationResults?: any;

  @Column({ nullable: true })
  fileHash?: string;

  @Column({ type: 'int', nullable: true })
  fileSize?: number;

  @Column({ nullable: true })
  mime?: string;

  @Column({ type: 'float', nullable: true })
  textScore?: number;

  @Column({ type: 'float', nullable: true })
  astScore?: number;

  @Column({ type: 'float', nullable: true })
  similarityScore?: number;

  @Column({ default: 'v1' })
  analysisVersion!: string;

  @Column({ type: 'json', nullable: true })
  analysisErrors?: any;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Deliverable, deliverable => deliverable.submissions)
  deliverable!: Deliverable;

  @ManyToOne(() => Group, group => group.deliverableSubmissions)
  group!: Group;

  @OneToMany(() => SubmissionFingerprint, fp => fp.submission)
  fingerprints!: SubmissionFingerprint[];

  @OneToMany(() => SimilarityResult, r => r.submission1)
  asLeftResults!: SimilarityResult[];

  @OneToMany(() => SimilarityResult, r => r.submission2)
  asRightResults!: SimilarityResult[];
}
@Entity()
@Unique('uniq_fp_per_file_kind', ['submissionId', 'filePath', 'kind', 'version'])
export class SubmissionFingerprint {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => DeliverableSubmission, s => s.fingerprints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission!: DeliverableSubmission;

  @Index()
  @Column()
  submissionId!: number;

  @Index()
  @Column()
  filePath!: string; // chemin relatif dans l’archive

  @Column({ type: 'enum', enum: ['text', 'ast'] })
  kind!: 'text' | 'ast';

  @Column({ type: 'json' })
  hashes!: number[]; // k-grams / subtree hashes

  @Column({ type: 'json', nullable: true })
  stats?: any; // nTokens, k, etc.

  @Index()
  @Column({ nullable: true })
  language?: string; // js, ts, java…

  @Column({ default: 'v1' })
  version!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
@Entity()
@Unique('uniq_pair_filepaths', ['submissionId1', 'submissionId2', 'filePath1', 'filePath2'])
export class SimilarityResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => DeliverableSubmission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId1' })
  submission1!: DeliverableSubmission;

  @ManyToOne(() => DeliverableSubmission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId2' })
  submission2!: DeliverableSubmission;

  @Index() @Column() submissionId1!: number;
  @Index() @Column() submissionId2!: number;

  @Column() filePath1!: string;
  @Column() filePath2!: string;

  @Column('float') textScore!: number;
  @Column('float') astScore!: number;
  @Index() @Column('float') finalScore!: number;

  @Column({ type: 'json', nullable: true })
  details?: any; // ex: fonctions matchées, offsets

  @CreateDateColumn()
  createdAt!: Date;
}


// ===== RAPPORTS =====

@Entity()
export class Report {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, project => project.reports)
  project!: Project;

  @ManyToOne(() => Group, group => group.reports)
  group!: Group;

  @OneToMany(() => ReportSection, section => section.report)
  sections!: ReportSection[];
}

@Entity()
export class ReportSection {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  content!: string; // Contenu en markdown/html

  @Column({ type: 'int' })
  orderIndex!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Report, report => report.sections)
  report!: Report;
}

// ===== SOUTENANCES =====

@Entity()
export class Defense {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'datetime' })
  startTime!: Date;

  @Column({ type: 'datetime' })
  endTime!: Date;

  @Column({ type: 'int' })
  orderIndex!: number;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, project => project.defenses)
  project!: Project;

  @ManyToOne(() => Group, group => group.defenses)
  group!: Group;
}

// ===== NOTATION =====

@Entity()
export class GradingGrid {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: ['deliverable', 'report', 'defense'] })
  type!: 'deliverable' | 'report' | 'defense';

  @Column({ type: 'float', default: 1.0 })
  weight!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Project, project => project.gradingGrids)
  project!: Project;

  @OneToMany(() => GradingCriterion, criterion => criterion.gradingGrid)
  criteria!: GradingCriterion[];

  @OneToMany(() => Grade, grade => grade.gradingGrid)
  grades!: Grade[];
}

@Entity()
export class GradingCriterion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'float' })
  maxScore!: number;

  @Column({ type: 'float', default: 1.0 })
  weight!: number;

  @Column({ type: 'enum', enum: ['group', 'individual'] })
  type!: 'group' | 'individual';

  @Column({ default: false })
  hasComments!: boolean;

  // Relations
  @ManyToOne(() => GradingGrid, gradingGrid => gradingGrid.criteria)
  gradingGrid!: GradingGrid;

  @OneToMany(() => CriterionGrade, criterionGrade => criterionGrade.criterion)
  criterionGrades!: CriterionGrade[];
}

@Entity()
export class Grade {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'float', nullable: true })
  totalScore?: number;

  @Column({ type: 'text', nullable: true })
  globalComments?: string;

  @Column({ default: false })
  isValidated!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => GradingGrid, gradingGrid => gradingGrid.grades)
  gradingGrid!: GradingGrid;

  @ManyToOne(() => Group, group => group.grades)
  group!: Group;

  @ManyToOne(() => User, { nullable: true }) // Pour les notes individuelles
  student?: User;

  @OneToMany(() => CriterionGrade, criterionGrade => criterionGrade.grade)
  criterionGrades!: CriterionGrade[];
}

@Entity()
export class CriterionGrade {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'float' })
  score!: number;

  @Column({ type: 'text', nullable: true })
  comments?: string;

  // Relations
  @ManyToOne(() => Grade, grade => grade.criterionGrades)
  grade!: Grade;

  @ManyToOne(() => GradingCriterion, criterion => criterion.criterionGrades)
  criterion!: GradingCriterion;
}