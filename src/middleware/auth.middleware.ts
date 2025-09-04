import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/user.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'teacher' | 'student';
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;
    const userService = new UserService();
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
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Middleware pour vérifier le rôle enseignant
export const requireTeacher = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

// Middleware pour vérifier le rôle étudiant
export const requireStudent = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

// Middleware pour vérifier que l'utilisateur peut accéder à une ressource
export const requireOwnershipOrTeacher = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

// Middleware pour vérifier l'appartenance à un groupe/projet
export const requireProjectAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const projectId = parseInt(req.params.projectId || req.params.id);
    
    // Si c'est un enseignant, vérifier qu'il est propriétaire du projet
    if (req.user.role === 'teacher') {
      const { ProjectService } = await import('../services/project.service');
      const projectService = new ProjectService();
      const project = await projectService.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      
      if (project.teacher.id !== req.user.id) {
        return res.status(403).json({ error: 'Access forbidden. You are not the owner of this project.' });
      }
    } else {
      // Si c'est un étudiant, vérifier qu'il fait partie de la promotion du projet
      const { ProjectService } = await import('../services/project.service');
      const projectService = new ProjectService();
      const userProjects = await projectService.getProjectsByStudent(req.user.id);
      
      if (!userProjects.some(p => p.id === projectId)) {
        return res.status(403).json({ error: 'Access forbidden. You are not part of this project.' });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking project access.' });
  }
};