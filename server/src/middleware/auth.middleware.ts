import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { UserRole } from '@smart-parking/shared';
import { User } from '../models/user.model.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { id: string };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const payload = verifyToken(token);
    
    // Check if user is still active in database
    const userDoc = await User.findById(payload.userId).select('isActive role email name');
    if (!userDoc || !userDoc.isActive) {
      return res.status(401).json({ error: 'Unauthorized: User account is inactive or deleted' });
    }

    req.user = {
      id: userDoc._id.toString(),
      userId: userDoc._id.toString(),
      email: userDoc.email,
      role: userDoc.role as UserRole,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired access token' });
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Access denied. Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};
