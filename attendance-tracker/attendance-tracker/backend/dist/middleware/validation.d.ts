import { Request, Response, NextFunction } from 'express';
declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => void;
declare const validateAuth: {
    register: any[];
    login: any[];
};
declare const validateEmployee: {
    create: any[];
    update: any[];
    getById: any[];
    delete: any[];
};
declare const validateAttendance: {
    create: any[];
    query: any[];
    bulkCalculate: any[];
};
declare const validateReports: {
    daily: any[];
    weekly: any[];
    monthly: any[];
    export: any[];
};
export { handleValidationErrors, validateAuth, validateEmployee, validateAttendance, validateReports };
//# sourceMappingURL=validation.d.ts.map