import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Validations pour les projets
export const validateCreateProject = [
  body('name').notEmpty().withMessage('Project name is required'),
  body('description').notEmpty().withMessage('Project description is required'),
  body('promotionId').isInt().withMessage('Promotion ID must be an integer'),
  body('minGroupSize').optional().isInt({ min: 1 }),
  body('maxGroupSize').optional().isInt({ min: 1 }),
  body('groupFormationRule').optional().isIn(['manual', 'random', 'free']),
  handleValidationErrors
];

// Validations pour les livrables
export const validateCreateDeliverable = [
  body('name').notEmpty().withMessage('Deliverable name is required'),
  body('description').notEmpty().withMessage('Deliverable description is required'),
  body('type').isIn(['archive', 'git_link']).withMessage('Invalid deliverable type'),
  body('deadline').isISO8601().withMessage('Invalid deadline format'),
  body('projectId').isInt().withMessage('Project ID must be an integer'),
  body('allowLateSubmission').optional().isBoolean(),
  body('penaltyPerHour').optional().isFloat({ min: 0 }).withMessage('penaltyPerHour must be a number ≥ 0').toFloat(),
  handleValidationErrors
];