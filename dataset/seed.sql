-- Dataset minimal pour tester l'anti-cheat
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE group_members_user;
TRUNCATE TABLE promotion_students_user;
TRUNCATE TABLE similarity_result;
TRUNCATE TABLE submission_fingerprint;
TRUNCATE TABLE deliverable_submission;
TRUNCATE TABLE deliverable_rule;
TRUNCATE TABLE deliverable;
TRUNCATE TABLE `group`;
TRUNCATE TABLE project;
TRUNCATE TABLE promotion;
TRUNCATE TABLE `user`;
SET FOREIGN_KEY_CHECKS=1;

-- Utilisateurs
INSERT INTO `user` (id,email,firstName,lastName,`password`,role,isActive)
VALUES
(1001,'teacher@demo.local','Alice','Prof','plain-do-not-login','teacher',1),
(2001,'s1@demo.local','Bob','Student','plain-do-not-login','student',1),
(2002,'s2@demo.local','Chloé','Student','plain-do-not-login','student',1);

-- Promotion (attachée au prof)
INSERT INTO promotion (id,`name`,description,`year`,teacherId)
VALUES (3001,'Promo 2024-2025','Promo de test',2025,1001);

-- Projet (visible) rattaché à la promo + prof
INSERT INTO project (
  id,`name`,description,`status`,
  minGroupSize,maxGroupSize,groupFormationRule,groupFormationDeadline,
  promotionId,teacherId
) VALUES (
  4001,'Demo AntiCheat','Projet de démo anti-cheat','visible',
  1,3,'manual',NULL,
  3001,1001
);

-- Groupes
INSERT INTO `group` (id,`name`,projectId) VALUES
(5001,'G1',4001),
(5002,'G2',4001);

-- Membre de groupe (un étudiant par groupe)
INSERT INTO group_members_user (groupId,userId) VALUES
(5001,2001),
(5002,2002);

-- Livrable (type archive) pour le projet
INSERT INTO deliverable (
  id,`name`,description,`type`,deadline,allowLateSubmission,penaltyPerHour,projectId
) VALUES (
  6001,'TP1','Zip attendu (TS/JS)','archive',
  DATE_ADD(NOW(), INTERVAL 1 DAY), 0, 0, 4001
);

-- Règles de validation (facultatif, mais utile)
INSERT INTO deliverable_rule (id,`type`,configuration,deliverableId) VALUES
(7001,'max_size', JSON_OBJECT('maxSizeMB', 20), 6001),
(7002,'file_presence', JSON_OBJECT('requiredFiles', JSON_ARRAY('*.ts','*.js')), 6001);

