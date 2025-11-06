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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireProjectAccess = exports.requireOwnershipOrTeacher = exports.requireStudent = exports.requireTeacher = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_service_1 = require("../services/user.service");
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default_secret');
        const userService = new user_service_1.UserService();
        const user = await userService.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid token or user inactive.' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        next();
    }
    catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};
exports.authMiddleware = authMiddleware;
// Middleware pour vérifier le rôle enseignant
const requireTeacher = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== 'teacher') {
        return res.status(403).json({
            error: 'Access forbidden. Teacher role required.',
            userRole: req.user.role,
            requiredRole: 'teacher'
        });
    }
    next();
};
exports.requireTeacher = requireTeacher;
// Middleware pour vérifier le rôle étudiant
const requireStudent = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== 'student') {
        return res.status(403).json({
            error: 'Access forbidden. Student role required.',
            userRole: req.user.role,
            requiredRole: 'student'
        });
    }
    next();
};
exports.requireStudent = requireStudent;
// Middleware pour vérifier que l'utilisateur peut accéder à une ressource
const requireOwnershipOrTeacher = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    // Si c'est un enseignant, il a accès à tout
    if (req.user.role === 'teacher') {
        return next();
    }
    // Pour les étudiants, vérifier qu'ils accèdent à leurs propres ressources
    const resourceUserId = parseInt(req.params.userId || req.params.id);
    if (resourceUserId && resourceUserId !== req.user.id) {
        return res.status(403).json({
            error: 'Access forbidden. You can only access your own resources.'
        });
    }
    next();
};
exports.requireOwnershipOrTeacher = requireOwnershipOrTeacher;
// Middleware pour vérifier l'appartenance à un groupe/projet
const requireProjectAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        const projectId = parseInt(req.params.projectId || req.params.id);
        // Si c'est un enseignant, vérifier qu'il est propriétaire du projet
        if (req.user.role === 'teacher') {
            const { ProjectService } = await Promise.resolve().then(() => __importStar(require('../services/project.service')));
            const projectService = new ProjectService();
            const project = await projectService.getProjectById(projectId);
            if (!project) {
                return res.status(404).json({ error: 'Project not found.' });
            }
            if (project.teacher.id !== req.user.id) {
                return res.status(403).json({ error: 'Access forbidden. You are not the owner of this project.' });
            }
        }
        else {
            // Si c'est un étudiant, vérifier qu'il fait partie de la promotion du projet
            const { ProjectService } = await Promise.resolve().then(() => __importStar(require('../services/project.service')));
            const projectService = new ProjectService();
            const userProjects = await projectService.getProjectsByStudent(req.user.id);
            if (!userProjects.some(p => p.id === projectId)) {
                return res.status(403).json({ error: 'Access forbidden. You are not part of this project.' });
            }
        }
        next();
    }
    catch (error) {
        res.status(500).json({ error: 'Error checking project access.' });
    }
};
exports.requireProjectAccess = requireProjectAccess;
