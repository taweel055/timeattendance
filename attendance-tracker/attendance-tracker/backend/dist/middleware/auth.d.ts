import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
declare const authorizeAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
export { authenticateToken, authorizeAdmin };
//# sourceMappingURL=auth.d.ts.map