"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStudent = exports.requireTeacher = void 0;
const requireTeacher = (req, res, next) => {
    if (req.user?.role !== 'teacher') {
        return res.status(403).json({ error: 'Access denied. Teacher role required.' });
    }
    next();
};
exports.requireTeacher = requireTeacher;
const requireStudent = (req, res, next) => {
    if (req.user?.role !== 'student') {
        return res.status(403).json({ error: 'Access denied. Student role required.' });
    }
    next();
};
exports.requireStudent = requireStudent;
