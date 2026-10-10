import { Request, Response } from 'express';
import { User } from '../models/user.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, UserRole } from '@smart-parking/shared';
import crypto from 'crypto';
import { Vehicle } from '../models/vehicle.model.js';
import { RFIDInventoryService } from '../services/rfidInventory.service.js';
import { VehicleType } from '@smart-parking/shared';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, vehicleRegistrationNumber } = req.body as RegisterInput;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await hashPassword(password);

    // Public registration is intentionally USER-only. Never derive this role
    // from request data; privileged accounts use authenticated admin routes.
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: UserRole.USER,
      isActive: true,
    });

    let vehicle;
    try {
      vehicle = await Vehicle.create({
        userId: user._id,
        licensePlate: vehicleRegistrationNumber,
        vehicleType: VehicleType.CAR,
        isDefault: true,
      });
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
    }
    const assignedCard = await RFIDInventoryService.claimForCustomer(user._id, vehicle._id as any);

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token in database
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken,
      vehicleRegistrationNumber: vehicle.licensePlate,
      rfidAssignment: assignedCard
        ? { status: 'ASSIGNED', uid: assignedCard.uid }
        : { status: 'PENDING' },
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', message: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', message: (error as Error).message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    const payload = verifyToken(token);

    const storedToken = await RefreshToken.findOne({
      token,
      userId: payload.userId,
      isRevoked: false,
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (token) {
      await RefreshToken.updateOne({ token }, { isRevoked: true });
    }

    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as ForgotPasswordInput;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return 200 to prevent email enumeration
      return res.status(200).json({ message: 'If that email is registered, a password reset link has been generated.' });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.emailVerificationToken = resetTokenHash;
    user.emailVerificationExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    // A configured email provider must deliver the raw token. It is never
    // returned to the browser or written to application logs.
    res.status(200).json({
      message: 'If that email is registered, password reset instructions will be sent.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Forgot password request failed' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as ResetPasswordInput;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ emailVerificationToken: tokenHash, emailVerificationExpires: { $gt: new Date() }, isActive: true });
    if (!user) return res.status(400).json({ error: 'Invalid or expired password reset token' });
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    await RefreshToken.updateMany({ userId: user._id, isRevoked: false }, { $set: { isRevoked: true } });
    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};
