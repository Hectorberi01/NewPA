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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promotion_controller_1 = require("../controllers/promotion.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
//import { body } from 'express-validator';
const validator = __importStar(require("express-validator"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
const { body } = validator;
const promotionController = new promotion_controller_1.PromotionController();
const validateCreatePromotion = [
    body('name').notEmpty().withMessage('Promotion name is required'),
    body('year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
    validation_middleware_1.handleValidationErrors
];
router.post('/', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, validateCreatePromotion, promotionController.createPromotion.bind(promotionController));
router.get('/my', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, promotionController.getMyPromotions.bind(promotionController));
router.post('/:promotionId/students', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, promotionController.addStudents.bind(promotionController));
router.put('/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, validateCreatePromotion, promotionController.updatePromotion.bind(promotionController));
router.delete('/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, promotionController.deletePromotion.bind(promotionController));
router.post('/:promotionId/students/import', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, upload_middleware_1.uploadMiddleware.single('file'), // Limite à 10MB par défaut
promotionController.addStudentsFromFile.bind(promotionController));
router.delete('/:id/students/:studentId', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, promotionController.deleteStudent.bind(promotionController));
exports.default = router;
