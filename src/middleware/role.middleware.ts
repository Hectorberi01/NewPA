import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from "./auth.middleware";

export const requireTeacher = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teacher role required.' });
  }
  next();
};

export const requireStudent = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ error: 'Access denied. Student role required.' });
  }
  next();
};