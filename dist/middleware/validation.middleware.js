"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateDeliverable = exports.validateCreateProject = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const express_validator_2 = require("express-validator");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_2.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
// Validations pour les projets
exports.validateCreateProject = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Project name is required'),
    (0, express_validator_1.body)('description').notEmpty().withMessage('Project description is required'),
    (0, express_validator_1.body)('promotionId').isInt().withMessage('Promotion ID must be an integer'),
    (0, express_validator_1.body)('minGroupSize').optional().isInt({ min: 1 }),
    (0, express_validator_1.body)('maxGroupSize').optional().isInt({ min: 1 }),
    (0, express_validator_1.body)('groupFormationRule').optional().isIn(['manual', 'random', 'free']),
    exports.handleValidationErrors
];
// Validations pour les livrables
exports.validateCreateDeliverable = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Deliverable name is required'),
    (0, express_validator_1.body)('description').notEmpty().withMessage('Deliverable description is required'),
    (0, express_validator_1.body)('type').isIn(['archive', 'git_link']).withMessage('Invalid deliverable type'),
    (0, express_validator_1.body)('deadline').isISO8601().withMessage('Invalid deadline format'),
    (0, express_validator_1.body)('projectId').isInt().withMessage('Project ID must be an integer'),
    (0, express_validator_1.body)('allowLateSubmission').optional().isBoolean(),
    (0, express_validator_1.body)('penaltyPerHour').optional().isInt({ min: 0 }),
    exports.handleValidationErrors
];
