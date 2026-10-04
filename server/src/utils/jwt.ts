import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { UserRole } from '@smart-parking/shared';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_SECRET, {
    expiresIn: '15m',
  });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
