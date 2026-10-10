import { z } from 'zod';
import mongoose from 'mongoose';
import { UserRole } from '@smart-parking/shared';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';
import { AuditLog } from '../models/auditLog.model.js';
import { hashPassword } from '../utils/password.js';

const input = z.object({
  ADMIN_BOOTSTRAP_CONFIRM: z.literal('CREATE_FIRST_ADMIN'),
  ADMIN_BOOTSTRAP_NAME: z.string().trim().min(2).max(100),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).max(128),
}).parse(process.env);

try {
  if (!(await connectDatabase())) throw new Error('Database connection failed');
  if (await User.exists({ role: UserRole.ADMIN })) throw new Error('Bootstrap refused: an Admin account already exists');
  const normalizedEmail = input.ADMIN_BOOTSTRAP_EMAIL.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) throw new Error('Bootstrap refused: the email is already registered');
  const admin = await User.create({ name: input.ADMIN_BOOTSTRAP_NAME, email: normalizedEmail, passwordHash: await hashPassword(input.ADMIN_BOOTSTRAP_PASSWORD), role: UserRole.ADMIN, isActive: true, emailVerified: true });
  await AuditLog.create({ userId: admin._id, role: UserRole.ADMIN, action: 'INITIAL_ADMIN_BOOTSTRAPPED', resource: 'User', resourceId: admin._id.toString(), metadata: { method: 'protected-environment-command' } });
  console.log(`Initial Admin created for ${normalizedEmail}. No password was logged.`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
